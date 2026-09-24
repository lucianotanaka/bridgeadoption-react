"""
TaskRepository

Responsável por operações relacionadas às tabelas e views:

    - tbTask
    - tbTaskType
    - tbAccountTeam
    - tbTaskActivityTemplate
    - tbTaskActivity
    - vwTask
    - vwFilterTask
    - vwFilterTaskOwner
    - vwTaskIncentive
    - vwTaskSIPNewOpportunity
    - vwTaskDashboard
    - vwTaskValueRollup

Objetivos:
-----------
- Centralizar acesso a dados de tarefas
- Evitar SQL espalhado pelo sistema
- Garantir segurança contra SQL Injection
- Padronizar tratamento de erro via ErrorRepository
- Manter consistência arquitetural

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou DataFrame
- Métodos INSERT → retornam ID inserido
- Métodos UPDATE → retornam número de linhas afetadas

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Faz rollback automático quando necessário
- Evita quebrar frontend (retorno seguro)

Observações de implementação:
-----------------------------
- Colunas dinâmicas são validadas antes de entrar na query.
- Para objetos dinâmicos (ex.: vwTask), as colunas válidas são obtidas
  diretamente do banco via INFORMATION_SCHEMA e armazenadas em cache.
- O nome do objeto de banco NÃO é recebido do usuário livremente.
  Ele é validado contra uma whitelist de objetos oficialmente usados
  neste repositório.
- Fechamento de cursor/conexão é protegido no bloco finally.
- A criação de atividades padrão passou a participar da mesma transação
  do insert/reuso da tarefa, preservando atomicidade lógica do processo.
- A nova função get_task_by_query permite:
    - escolher colunas do retorno;
    - aplicar filtro textual simples com AND / OR / IN;
    - retornar List[Dict] ou DataFrame.

Exemplo de uso da nova função:
------------------------------
    repo = TaskRepository()

    # Exemplo 1: selecionar colunas específicas
    rows = repo.get_task_by_query(
        columns=["task_id", "task_owner_id", "task_status_id"],
        where_raw="task_owner_id = 10 AND task_status_id IN (5,6,10)"
    )

    # Exemplo 2: retorno como DataFrame
    df = repo.get_task_by_query(
        columns=["task_id", "task_ws", "task_deal_id"],
        where_raw="task_ws = 'WS001' OR task_deal_id = 'D100'",
        as_df=True
    )

    # Exemplo 3: sem filtro
    all_tasks = repo.get_task_by_query()
"""

from typing import Optional, Union, List, Dict, Any, Iterable, Set, Tuple
import pandas as pd
import traceback
import re

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository
from src.utils.date_parser import format_date_for_mariadb


class TaskRepository:
    """
    Repository responsável por operações relacionadas a tarefas.

    Observação:
    -----------
    Este repositório trabalha com tabelas e views específicas.
    Quando há necessidade de validação dinâmica de colunas,
    as colunas são obtidas diretamente do banco, mas somente
    para objetos previamente autorizados por este repositório.
    """

    # ==========================================================
    # OBJETOS DE BANCO OFICIALMENTE UTILIZADOS NO REPOSITÓRIO
    # ==========================================================
    _ALLOWED_DB_OBJECTS: Set[str] = {
        "tbTask",
        "tbTaskType",
        "tbAccountTeam",
        "tbTaskActivityTemplate",
        "tbTaskActivity",
        "vwTaskIncentive",
        "vwTaskSIPNewOpportunity",
        "vwTaskDashboard",
        "vwTaskValueRollup",
        "vwTask",
        "vwFilterTask",
        "vwFilterTaskOwner",
    }

    _FILTER_TASK_COLUMNS: Set[str] = {
        "task_owner_id",
        "task_customer_id",
        "task_type_id",
        "task_ws",
        "task_deal_id",
        "task_status_id",
    }

    def __init__(self):
        self.error_repo = ErrorRepository()

        # Cache simples de colunas por objeto de banco.
        # Finalidade:
        # - evitar consultar INFORMATION_SCHEMA repetidamente
        # - reduzir overhead nas validações dinâmicas
        #
        # Estrutura:
        # {
        #   "vwTask": {"task_id", "task_owner_id", ...},
        #   "vwFilterTask": {...}
        # }
        self._db_object_columns_cache: Dict[str, Set[str]] = {}

    # ==========================================================
    # HELPERS INTERNOS
    # ==========================================================
    def _close_resources(self, conn=None, cursor=None) -> None:
        """
        Fecha cursor e conexão com segurança.
        """
        try:
            if cursor is not None:
                cursor.close()
        except Exception:
            pass

        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass

    def _validate_columns(
        self,
        columns: Iterable[str],
        allowed_columns: Set[str],
        context: str
    ) -> None:
        """
        Valida se todas as colunas informadas pertencem à whitelist.

        Parâmetros:
            columns:
                Lista/iterável de colunas recebidas.

            allowed_columns:
                Conjunto de colunas autorizadas.

            context:
                Nome do contexto/método para facilitar diagnóstico.
        """
        for col in columns:
            if col not in allowed_columns:
                raise ValueError(f"Coluna não permitida em {context}: {col}")

    def _get_db_object_columns(
        self,
        object_name: str,
        refresh: bool = False
    ) -> Set[str]:
        """
        Retorna as colunas reais de uma tabela ou view diretamente do banco.

        Segurança:
            - O objeto só pode ser consultado se estiver em _ALLOWED_DB_OBJECTS.
            - O nome do objeto não é usado livremente sem validação.

        Cache:
            - Por padrão utiliza cache em memória.
            - Se refresh=True, força recarga do metadata.
        """

        if object_name not in self._ALLOWED_DB_OBJECTS:
            raise ValueError(f"Objeto de banco não permitido: {object_name}")

        if not refresh and object_name in self._db_object_columns_cache:
            return self._db_object_columns_cache[object_name]

        query = """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
            ORDER BY ORDINAL_POSITION
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (object_name,))
            rows = cursor.fetchall()

            columns = {row["COLUMN_NAME"] for row in rows}

            if not columns:
                raise ValueError(
                    f"Nenhuma coluna encontrada para o objeto '{object_name}'. "
                    "Verifique se a tabela/view existe no schema atual."
                )

            self._db_object_columns_cache[object_name] = columns
            return columns

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository._get_db_object_columns",
                error_command=query,
                error_description=f"{str(e)} | object_name={object_name}",
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            self._close_resources(conn, cursor)

    def _get_task_columns(self, refresh: bool = False) -> Set[str]:
        """
        Retorna as colunas reais da tabela tbTask.

        Usa o mesmo mecanismo seguro de metadata via INFORMATION_SCHEMA
        e aproveita o cache em memória já existente no repositório.
        """
        return self._get_db_object_columns(
            object_name="tbTask",
            refresh=refresh
        )

    def _parse_int_ids(
        self,
        value: Optional[Union[int, List[int], str]]
    ) -> List[int]:
        """
        Normaliza IDs recebidos como:
        - int
        - list[int]
        - string CSV

        Retorna:
            List[int] com apenas valores numéricos válidos.
        """
        parsed: List[int] = []

        if value is None:
            return parsed

        if isinstance(value, int):
            return [value]

        if isinstance(value, list):
            return [
                int(v) for v in value
                if isinstance(v, int) or (isinstance(v, str) and str(v).isdigit())
            ]

        if isinstance(value, str):
            for part in value.split(","):
                stripped = part.strip()
                if stripped.isdigit():
                    parsed.append(int(stripped))

        return parsed

    def _adjust_task_dates(
        self,
        task_id: int,
        planned_field: str,
        planned_value,
        performed_field: str,
        performed_value,
        error_function: str
    ) -> bool:
        """
        Ajusta datas planejada e realizada de uma tarefa.
        """
        if not task_id:
            return False

        data: Dict[str, Any] = {}

        try:
            dt_planned = format_date_for_mariadb(planned_value)
            if dt_planned is not None:
                data[planned_field] = dt_planned

            dt_performed = format_date_for_mariadb(performed_value)
            if dt_performed is not None:
                data[performed_field] = dt_performed

            if not data:
                return False

            rows_affected = self.update(
                data=data,
                where={"task_id": int(task_id)}
            )

            return rows_affected > 0

        except Exception as e:
            self.error_repo.log_error(
                error_function=error_function,
                error_command=f"task_id={task_id}",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return False

    def _create_default_activities_in_transaction(self, cursor, task_id: int) -> bool:
        """
        Cria atividades padrão para uma tarefa usando o mesmo cursor/transação
        já aberta pelo chamador.
        """
        try:
            cursor.execute("""
                SELECT task_tasktype_id,
                       task_ws,
                       task_deal_id,
                       task_track,
                       task_subtrack,
                       task_start,
                       task_end
                FROM tbTask
                WHERE task_id = %s
            """, (task_id,))

            task = cursor.fetchone()

            if not task or not task["task_tasktype_id"]:
                return False

            tasktype_id = task["task_tasktype_id"]

            cursor.execute("""
                SELECT *
                FROM tbTaskActivityTemplate
                WHERE activitytemplate_tasktype_id = %s
                ORDER BY activitytemplate_seq
            """, (tasktype_id,))

            templates = cursor.fetchall()

            if not templates:
                return True

            cursor.execute("""
                SELECT activity_id
                FROM tbTaskActivity
                WHERE activity_task_id = 0
                ORDER BY activity_id
            """)

            vago_rows = cursor.fetchall()
            vago_ids = [row["activity_id"] for row in vago_rows]
            vago_index = 0

            for tpl in templates:
                activity_data = {
                    "activity_task_id": task_id,
                    "activity_seq": tpl["activitytemplate_seq"],
                    "activity_name": tpl["activitytemplate_name"],
                    "activity_objective": tpl["activitytemplate_objective"] or None,
                    "activity_scope": tpl["activitytemplate_scope"] or None,
                    "activity_expected_results": tpl["activitytemplate_expected_results"] or None,
                    "activity_effort": tpl["activitytemplate_efford"] or 0,
                    "activity_status": 1,
                    "activity_ws": task["task_ws"] or None,
                    "activity_deal_id": task["task_deal_id"] or None,
                    "activity_track": task["task_track"] or None,
                    "activity_sub_track": task["task_subtrack"] or None,
                    "activity_value": None,
                    "activity_currency": "USD",
                    "activity_start": task["task_start"],
                    "activity_end": task["task_end"],
                    "activity_start_performed": task["task_start"],
                    "activity_end_performed": task["task_end"],
                    "activity_effort_performed": tpl["activitytemplate_efford"] or 0,
                    "activity_completed": 0,
                    "activity_approved": None,
                    "activity_approved_value": None,
                    "activity_approved_currency": None,
                    "activity_approval_date": None,
                    "activity_approval_request_date": None,
                    "activity_approval_fy": None,
                    "activity_end_fy": None,
                    "activity_backlog_value": 0,
                }

                if vago_index < len(vago_ids):
                    vago_id = vago_ids[vago_index]
                    vago_index += 1

                    set_clause = ", ".join([f"{k} = %s" for k in activity_data.keys()])
                    values = tuple(activity_data.values()) + (vago_id,)

                    cursor.execute(f"""
                        UPDATE tbTaskActivity
                        SET {set_clause}
                        WHERE activity_id = %s
                    """, values)

                else:
                    columns = ", ".join(activity_data.keys())
                    placeholders = ", ".join(["%s"] * len(activity_data))
                    values = tuple(activity_data.values())

                    cursor.execute(f"""
                        INSERT INTO tbTaskActivity ({columns})
                        VALUES ({placeholders})
                    """, values)

            return True

        except Exception:
            return False

    def _split_logical_expression(self, expression: str) -> List[str]:
        """
        Divide uma expressão simples em tokens lógicos preservando
        conteúdos entre aspas simples/duplas e parênteses de IN (...).
        """

        tokens: List[str] = []
        current: List[str] = []

        in_single_quote = False
        in_double_quote = False
        paren_level = 0
        i = 0
        text = expression.strip()
        length = len(text)

        while i < length:
            char = text[i]

            if char == "'" and not in_double_quote:
                in_single_quote = not in_single_quote
                current.append(char)
                i += 1
                continue

            if char == '"' and not in_single_quote:
                in_double_quote = not in_double_quote
                current.append(char)
                i += 1
                continue

            if not in_single_quote and not in_double_quote:
                if char == "(":
                    paren_level += 1
                    current.append(char)
                    i += 1
                    continue

                if char == ")":
                    paren_level = max(0, paren_level - 1)
                    current.append(char)
                    i += 1
                    continue

                if paren_level == 0:
                    and_match = text[i:i + 3].upper() == "AND"
                    or_match = text[i:i + 2].upper() == "OR"

                    if and_match:
                        before_ok = i == 0 or text[i - 1].isspace()
                        after_ok = i + 3 == length or text[i + 3].isspace()
                        if before_ok and after_ok:
                            chunk = "".join(current).strip()
                            if chunk:
                                tokens.append(chunk)
                            tokens.append("AND")
                            current = []
                            i += 3
                            continue

                    if or_match:
                        before_ok = i == 0 or text[i - 1].isspace()
                        after_ok = i + 2 == length or text[i + 2].isspace()
                        if before_ok and after_ok:
                            chunk = "".join(current).strip()
                            if chunk:
                                tokens.append(chunk)
                            tokens.append("OR")
                            current = []
                            i += 2
                            continue

            current.append(char)
            i += 1

        chunk = "".join(current).strip()
        if chunk:
            tokens.append(chunk)

        return tokens

    def _parse_literal_value(self, raw_value: str) -> Any:
        """
        Converte valor textual simples para tipo Python apropriado.
        """

        value = raw_value.strip()

        if (
            len(value) >= 2 and
            ((value.startswith("'") and value.endswith("'")) or
             (value.startswith('"') and value.endswith('"')))
        ):
            return value[1:-1]

        upper_value = value.upper()

        if upper_value == "NULL":
            return None

        if upper_value == "TRUE":
            return True

        if upper_value == "FALSE":
            return False

        if re.fullmatch(r"-?\d+", value):
            return int(value)

        if re.fullmatch(r"-?\d+\.\d+", value):
            return float(value)

        return value

    def _parse_simple_where(
        self,
        where_raw: str,
        allowed_columns: Set[str],
        context: str
    ) -> Tuple[str, List[Any]]:
        """
        Converte uma expressão textual simples em SQL parametrizado.
        """

        if not where_raw or not str(where_raw).strip():
            return "", []

        parts = self._split_logical_expression(str(where_raw).strip())

        if not parts:
            return "", []

        conditions_sql: List[str] = []
        params: List[Any] = []

        simple_pattern = re.compile(
            r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$",
            re.IGNORECASE
        )

        in_pattern = re.compile(
            r"^([a-zA-Z_][a-zA-Z0-9_]*)\s+IN\s*\((.*)\)$",
            re.IGNORECASE
        )

        expecting_condition = True

        for part in parts:
            token = part.strip()

            if token.upper() in {"AND", "OR"}:
                if expecting_condition:
                    raise ValueError(
                        f"Expressão WHERE inválida em {context}: operador lógico inesperado '{token}'."
                    )
                conditions_sql.append(token.upper())
                expecting_condition = True
                continue

            if not expecting_condition:
                raise ValueError(
                    f"Expressão WHERE inválida em {context}: condição inesperada '{token}'."
                )

            in_match = in_pattern.match(token)
            if in_match:
                column = in_match.group(1).strip()
                raw_values = in_match.group(2).strip()

                self._validate_columns(
                    columns=[column],
                    allowed_columns=allowed_columns,
                    context=context
                )

                items = self._split_csv_preserving_quotes(raw_values)
                values = [self._parse_literal_value(item) for item in items if item.strip() != ""]

                if not values:
                    conditions_sql.append("1=0")
                else:
                    placeholders = ", ".join(["%s"] * len(values))
                    conditions_sql.append(f"{column} IN ({placeholders})")
                    params.extend(values)

                expecting_condition = False
                continue

            simple_match = simple_pattern.match(token)
            if simple_match:
                column = simple_match.group(1).strip()
                operator = simple_match.group(2).strip().upper()
                raw_value = simple_match.group(3).strip()

                self._validate_columns(
                    columns=[column],
                    allowed_columns=allowed_columns,
                    context=context
                )

                value = self._parse_literal_value(raw_value)

                if value is None:
                    raise ValueError(
                        f"Valor NULL não suportado nesse formato em {context}. "
                        "Use outro método caso precise tratar NULL."
                    )

                conditions_sql.append(f"{column} {operator} %s")
                params.append(value)
                expecting_condition = False
                continue

            raise ValueError(f"Filtro inválido em {context}: {token}")

        if expecting_condition and conditions_sql:
            raise ValueError(
                f"Expressão WHERE inválida em {context}: expressão termina com operador lógico."
            )

        return " ".join(conditions_sql), params

    def _split_csv_preserving_quotes(self, raw_values: str) -> List[str]:
        """
        Divide uma lista CSV simples preservando valores entre aspas.
        """

        items: List[str] = []
        current: List[str] = []
        in_single_quote = False
        in_double_quote = False

        for char in raw_values:
            if char == "'" and not in_double_quote:
                in_single_quote = not in_single_quote
                current.append(char)
                continue

            if char == '"' and not in_single_quote:
                in_double_quote = not in_double_quote
                current.append(char)
                continue

            if char == "," and not in_single_quote and not in_double_quote:
                item = "".join(current).strip()
                if item:
                    items.append(item)
                current = []
                continue

            current.append(char)

        last_item = "".join(current).strip()
        if last_item:
            items.append(last_item)

        return items

    # ==========================================================
    # BUSCAR IDS POR WHERE DINÂMICO
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de task_id baseado em filtros dinâmicos.
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        self._validate_columns(
            columns=where.keys(),
            allowed_columns=self._get_task_columns(),
            context="find_ids_by"
        )

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT task_id
            FROM tbTask
            WHERE {where_clause}
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, values)
            results = cursor.fetchall()
            return [row["task_id"] for row in results]

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.find_ids_by",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return []

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # OBTER ÚLTIMO TASK_OWNER_ID ALOCADO POR EMPRESA E TIPO
    # ==========================================================
    def get_last_task_owner_by_company(
        self,
        company_id: int,
        user_type: str
    ) -> Optional[int]:
        """
        Retorna o último accountteam_user_id (como task_owner_id)
        da tabela tbAccountTeam.
        """

        query = """
            SELECT accountteam_user_id AS task_owner_id
            FROM tbAccountTeam
            WHERE accountteam_allocated <> 0
              AND accountteam_company_id = %s
              AND accountteam_user_type = %s
            ORDER BY accountteam_id DESC
            LIMIT 1
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(query, (company_id, user_type))
            result = cursor.fetchone()

            if result:
                return result["task_owner_id"]

            return None

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_last_task_owner_by_company",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return None

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # CRIAR ATIVIDADES PADRÃO BASEADO NO TIPO DA TAREFA
    # ==========================================================
    def create_default_activities(self, task_id: int) -> bool:
        """
        Cria atividades padrão para a tarefa.
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            success = self._create_default_activities_in_transaction(cursor, task_id)

            if not success:
                conn.rollback()
                return False

            conn.commit()
            return True

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskRepository.create_default_activities",
                error_command="create_default_activities",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return False

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # INSERT COM VERIFICAÇÃO + REAPROVEITAMENTO DE VAGO
    # + CRIAÇÃO AUTOMÁTICA DE ATIVIDADES PADRÃO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Fluxo de inserção inteligente em tbTask.
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        self._validate_columns(
            columns=data.keys(),
            allowed_columns=self._get_task_columns(),
            context="insert"
        )

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            where_clause = " AND ".join([f"{col} = %s" for col in data.keys()])
            values = tuple(data.values())

            query_check = f"""
                SELECT task_id
                FROM tbTask
                WHERE {where_clause}
                LIMIT 1
            """

            cursor.execute(query_check, values)
            existing = cursor.fetchone()

            if existing:
                return existing["task_id"]

            query_vago = """
                SELECT MIN(task_id) AS task_id
                FROM tbTask
                WHERE task_customer_id = 0
                  AND task_owner_id = 0
                  AND task_tasktype_id = 0
            """

            cursor.execute(query_vago)
            result = cursor.fetchone()
            vago_id = result["task_id"] if result and result["task_id"] else None

            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values_update = tuple(data.values()) + (vago_id,)

                query_update = f"""
                    UPDATE tbTask
                    SET {set_clause}
                    WHERE task_id = %s
                """

                cursor.execute(query_update, values_update)

                activities_ok = self._create_default_activities_in_transaction(cursor, vago_id)
                if not activities_ok:
                    raise RuntimeError("Falha ao criar atividades padrão para tarefa reutilizada.")

                conn.commit()
                return vago_id

            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values_insert = tuple(data.values())

            query_insert = f"""
                INSERT INTO tbTask ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query_insert, values_insert)
            new_task_id = cursor.lastrowid

            activities_ok = self._create_default_activities_in_transaction(cursor, new_task_id)
            if not activities_ok:
                raise RuntimeError("Falha ao criar atividades padrão para nova tarefa.")

            conn.commit()
            return new_task_id

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskRepository.insert",
                error_command="INSERT/UPDATE tbTask + create_default_activities",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # UPDATE DINÂMICO
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros dinamicamente em tbTask.
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        task_columns = self._get_task_columns()

        self._validate_columns(
            columns=data.keys(),
            allowed_columns=task_columns,
            context="update(data)"
        )

        self._validate_columns(
            columns=where.keys(),
            allowed_columns=task_columns,
            context="update(where)"
        )

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbTask
            SET {set_clause}
            WHERE {where_clause}
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            if conn is not None:
                conn.rollback()

            self.error_repo.log_error(
                error_function="TaskRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # AJUSTAR DATAS DE TÉRMINO DA TAREFA
    # ==========================================================
    def adjust_task_end_dates(
        self,
        task_id: int,
        end_val,
        end_performed_val
    ) -> bool:
        """
        Ajusta as datas de término da tarefa.
        """
        return self._adjust_task_dates(
            task_id=task_id,
            planned_field="task_end",
            planned_value=end_val,
            performed_field="task_end_performed",
            performed_value=end_performed_val,
            error_function="TaskRepository.adjust_task_end_dates"
        )

    # ==========================================================
    # AJUSTAR DATAS DE INÍCIO DA TAREFA
    # ==========================================================
    def adjust_task_start_dates(
        self,
        task_id: int,
        start_val,
        start_performed_val
    ) -> bool:
        """
        Ajusta as datas de início da tarefa.
        """
        return self._adjust_task_dates(
            task_id=task_id,
            planned_field="task_start",
            planned_value=start_val,
            performed_field="task_start_performed",
            performed_value=start_performed_val,
            error_function="TaskRepository.adjust_task_start_dates"
        )

    # ==========================================================
    # BUSCAR TASK TYPES
    # ==========================================================
    def get_task_type_by_ids(
        self,
        type_ids: Optional[Union[int, List[int], str]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da tabela tbTaskType.
        """

        query = """
            SELECT
                tasktype_id,
                tasktype_name
            FROM tbTaskType
        """

        params: List[Any] = []

        if type_ids is not None:
            parsed_ids = self._parse_int_ids(type_ids)

            if not parsed_ids:
                query += " WHERE 1=0"
            else:
                placeholders = ", ".join(["%s"] * len(parsed_ids))
                query += f" WHERE tasktype_id IN ({placeholders})"
                params = parsed_ids

        query += " ORDER BY tasktype_name"

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_type_by_ids",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # CARREGAR INTERVALO DE MÊS E ANO DA VIEW vwTaskIncentive
    # ==========================================================
    def load_month_year_of_task_incentive(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna os limites mínimos e máximos de mês e ano da view vwTaskIncentive.
        """

        query = """
            SELECT 
                MIN(MONTH(task_start)) AS min_month_task_start,
                MAX(MONTH(task_start)) AS max_month_task_start,
                MIN(YEAR(task_start)) AS min_year_task_start,
                MAX(YEAR(task_start)) AS max_year_task_start,
                MIN(MONTH(task_end)) AS min_month_task_end,
                MAX(MONTH(task_end)) AS max_month_task_end,
                MIN(YEAR(task_end)) AS min_year_task_end,
                MAX(YEAR(task_end)) AS max_year_task_end
            FROM vwTaskIncentive
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.load_month_year_of_task_incentive",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # CARREGAR DADOS DA VIEW vwTaskIncentive
    # ==========================================================
    def load_task_incentive(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna todos os registros da view vwTaskIncentive.
        """

        query = """
            SELECT *
            FROM vwTaskIncentive
            ORDER BY task_start
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.load_task_incentive",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # CARREGAR TASK SIP - NEW OPPORTUNITY
    # ==========================================================
    def get_task_sip_new_opportunity(
        self,
        squad_ids: Optional[Union[int, List[int], str]] = None,
        owner_ids: Optional[Union[int, List[int], str]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwTaskSIPNewOpportunity.
        """

        base_query = """
            SELECT *
            FROM vwTaskSIPNewOpportunity
        """

        filters = []
        params: List[Any] = []

        if squad_ids is not None:
            parsed_squads = self._parse_int_ids(squad_ids)

            if parsed_squads:
                placeholders = ", ".join(["%s"] * len(parsed_squads))
                filters.append(f"task_owner_squad_id IN ({placeholders})")
                params.extend(parsed_squads)
            else:
                filters.append("1=0")

        if owner_ids is not None:
            parsed_owners = self._parse_int_ids(owner_ids)

            if parsed_owners:
                placeholders = ", ".join(["%s"] * len(parsed_owners))
                filters.append(f"task_owner_id IN ({placeholders})")
                params.extend(parsed_owners)
            else:
                filters.append("1=0")

        if filters:
            base_query += " WHERE " + " AND ".join(filters)

        base_query += " ORDER BY task_start"

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(base_query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(base_query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_sip_new_opportunity",
                error_command=base_query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # BUSCAR COLUNAS ESPECÍFICAS DA TBTASK POR TASK_ID
    # ==========================================================
    def get_columns_by_task_id(
        self,
        task_id: int,
        columns: List[str],
        as_df: bool = False
    ) -> Optional[Union[Dict[str, Any], pd.DataFrame]]:
        """
        Retorna colunas específicas da tabela tbTask baseado no task_id informado.
        """

        if not task_id:
            raise ValueError("task_id é obrigatório.")

        if not columns:
            raise ValueError("Lista de colunas não pode ser vazia.")

        conn = None
        cursor = None

        try:
            self._validate_columns(
                columns=columns,
                allowed_columns=self._get_task_columns(),
                context="get_columns_by_task_id"
            )

            column_clause = ", ".join(columns)

            query = f"""
                SELECT {column_clause}
                FROM tbTask
                WHERE task_id = %s
                LIMIT 1
            """

            if as_df:
                engine = get_sqlalchemy_engine()
                df = pd.read_sql(query, engine, params=(task_id,))
                return df if not df.empty else None

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (task_id,))
            result = cursor.fetchone()

            return result if result else None

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_columns_by_task_id",
                error_command="SELECT dynamic columns FROM tbTask",
                error_description=str(e),
                error_traceback=traceback.format_exc(),
            )
            return None

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # TASK DASHBOARD
    # ==========================================================
    def get_task_dashboard(
        self,
        owner_id: Optional[int] = None,
        for_team: Optional[str] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwTaskDashboard.
        """

        query = """
            SELECT *
            FROM vwTaskDashboard
        """

        conditions = []
        params: List[Any] = []

        if owner_id is not None:
            conditions.append("task_owner_id = %s")
            params.append(int(owner_id))

        if for_team is not None:
            conditions.append("task_for_team = %s")
            params.append(str(for_team))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_dashboard",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # TASK VALUE ROLLUP
    # ==========================================================
    def get_task_value_rollup(
        self,
        owner_id: Optional[int] = None,
        for_team: Optional[str] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwTaskValueRollup.
        """

        query = """
            SELECT *
            FROM vwTaskValueRollup
        """

        conditions = []
        params: List[Any] = []

        if owner_id is not None:
            conditions.append("task_owner_id = %s")
            params.append(int(owner_id))

        if for_team is not None:
            conditions.append("task_for_team = %s")
            params.append(str(for_team))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_value_rollup",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # SELECT TASK (vwTask)
    # ==========================================================
    def get_task(
        self,
        task_id: Optional[Union[int, List[int]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwTask.
        """

        query = """
            SELECT *
            FROM vwTask
        """

        conditions = []
        params: List[Any] = []

        if task_id is not None:
            if isinstance(task_id, list):
                if not task_id:
                    return [] if not as_df else pd.DataFrame()

                placeholders = ", ".join(["%s"] * len(task_id))
                conditions.append(f"task_id IN ({placeholders})")
                params.extend([int(x) for x in task_id])

            else:
                conditions.append("task_id = %s")
                params.append(int(task_id))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY task_customer_name, task_deal_id"

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # SELECT TASKS FROM vwTask WITH DYNAMIC COLUMNS + SIMPLE WHERE
    # ==========================================================
    def get_task_by_query(
        self,
        columns: Optional[List[str]] = None,
        where_raw: Optional[str] = None,
        as_df: bool = False,
        refresh_columns_cache: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwTask com seleção dinâmica de colunas
        e filtro textual simples parametrizado.
        """

        conn = None
        cursor = None

        try:
            allowed_columns = self._get_db_object_columns(
                object_name="vwTask",
                refresh=refresh_columns_cache
            )

            select_clause = "*"

            if columns:
                self._validate_columns(
                    columns=columns,
                    allowed_columns=allowed_columns,
                    context="get_task_by_query(columns)"
                )
                select_clause = ", ".join(columns)

            query = f"""
                SELECT {select_clause}
                FROM vwTask
            """

            params: List[Any] = []

            if where_raw and str(where_raw).strip():
                where_clause, where_params = self._parse_simple_where(
                    where_raw=where_raw,
                    allowed_columns=allowed_columns,
                    context="get_task_by_query(where_raw)"
                )

                if where_clause:
                    query += f" WHERE {where_clause}"
                    params.extend(where_params)

            query += " ORDER BY task_customer_name, task_deal_id"

            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_by_query",
                error_command="SELECT dynamic columns FROM vwTask with parsed where",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # SELECT TASK FOR FILTERING (vwFilterTask)
    # ==========================================================
    def load_for_filtering(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwFilterTask.
        """

        query = """
            SELECT *
            FROM vwFilterTask
            ORDER BY task_customer_name, task_deal_id
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.load_for_filtering",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # TASK COMPLETION SUMMARY
    # ==========================================================
    def get_task_completion_summary(self, task_id: Optional[int] = None) -> tuple[int, float]:
        """
        Retorna o total de atividades e a média de conclusão da tarefa.
        """

        if not task_id:
            return 0, 0

        query = """
            SELECT
                COUNT(activity_id) AS total_activities,
                ROUND(COALESCE(SUM(activity_completed), 0) / COUNT(activity_id), 2) AS avg_completed
            FROM tbTaskActivity
            WHERE activity_task_id = %s
            GROUP BY activity_task_id
        """

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (int(task_id),))
            result = cursor.fetchone()

            if not result:
                return 0, 0

            total_activities = result["total_activities"] or 0
            avg_completed = result["avg_completed"] or 0

            return int(total_activities), float(avg_completed)

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_completion_summary",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0, 0

        finally:
            self._close_resources(conn, cursor)

    # ==========================================================
    # FILTER TASKS FROM vwFilterTask
    # ==========================================================
    def get_filtered_tasks(
        self,
        where: Optional[Dict[str, Any]] = None,
        as_df: bool = False,
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwFilterTask com filtros dinâmicos.
        """

        query = """
            SELECT *
            FROM vwFilterTask
        """

        conditions = []
        params: List[Any] = []

        if where is None:
            where = {}

        if not isinstance(where, dict):
            raise ValueError("O parâmetro 'where' deve ser um dicionário.")

        self._validate_columns(
            columns=where.keys(),
            allowed_columns=self._FILTER_TASK_COLUMNS,
            context="get_filtered_tasks"
        )

        for column, value in where.items():
            if value is None:
                continue

            if isinstance(value, (list, tuple, set)):
                values = [v for v in value if v is not None and str(v).strip() != ""]
                if not values:
                    continue

                placeholders = ", ".join(["%s"] * len(values))
                conditions.append(f"{column} IN ({placeholders})")
                params.extend(values)
                continue

            if isinstance(value, str) and "," in value:
                values = [v.strip() for v in value.split(",") if v.strip() != ""]
                if not values:
                    continue

                placeholders = ", ".join(["%s"] * len(values))
                conditions.append(f"{column} IN ({placeholders})")
                params.extend(values)
                continue

            if str(value).strip() == "":
                continue

            conditions.append(f"{column} = %s")
            params.append(value)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY task_customer_name, task_deal_id"

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine, params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_filtered_tasks",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)

    # ==========================================================
    # LOAD TASK OWNER FILTER OPTIONS
    # ==========================================================
    def get_task_owner_filter_options(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwFilterTaskOwner.
        """

        query = """
            SELECT *
            FROM vwFilterTaskOwner
            ORDER BY task_owner_name
        """

        conn = None
        cursor = None

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_task_owner_filter_options",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                self._close_resources(conn, cursor)
