"""
TaskRepository

Responsável por operações relacionadas às tabelas:

    - tbTask
    - tbTaskType

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
- Colunas dinâmicas são validadas por whitelist antes de entrar na query.
- Fechamento de cursor/conexão é protegido no bloco finally.
- A criação de atividades padrão passou a participar da mesma transação
  do insert/reuso da tarefa, preservando atomicidade lógica do processo.
"""

from typing import Optional, Union, List, Dict, Any, Iterable, Set
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository
from src.utils.date_parser import format_date_for_mariadb


class TaskRepository:
    """
    Repository responsável pela tabela tbTask.
    """

    # ==========================================================
    # COLUNAS PERMITIDAS
    # ==========================================================
    _TASK_COLUMNS: Set[str] = {
        "task_id",
        "task_customer_id",
        "task_owner_id",
        "task_tasktype_id",
        "task_ws",
        "task_deal_id",
        "task_track",
        "task_subtrack",
        "task_start",
        "task_end",
        "task_start_performed",
        "task_end_performed",
        "task_status_id",
        "task_for_team",
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
        """
        for col in columns:
            if col not in allowed_columns:
                raise ValueError(f"Coluna não permitida em {context}: {col}")

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

        Regras:
            - converte os valores com format_date_for_mariadb
            - atualiza somente os campos com valores válidos
            - retorna False se não houver dados válidos para atualizar

        Parâmetros:
            task_id:
                ID da tarefa.

            planned_field:
                Nome da coluna de data planejada.

            planned_value:
                Valor da data planejada.

            performed_field:
                Nome da coluna de data realizada.

            performed_value:
                Valor da data realizada.

            error_function:
                Nome da função para registro de log.

        Retorno:
            True  -> atualização realizada
            False -> nada atualizado ou erro
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

        Regras:
            - Reutiliza VAGO (activity_task_id = 0)
            - Caso não exista VAGO, insere novo registro
            - Cria todas as atividades do template
            - Não faz commit aqui; o commit fica com o chamador

        Retorno:
            True  -> sucesso
            False -> erro ou task sem tasktype
        """
        try:
            # --------------------------------------------------
            # 1) Buscar dados da tarefa
            # --------------------------------------------------
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

            # --------------------------------------------------
            # 2) Buscar templates do tipo
            # --------------------------------------------------
            cursor.execute("""
                SELECT *
                FROM tbTaskActivityTemplate
                WHERE activitytemplate_tasktype_id = %s
                ORDER BY activitytemplate_seq
            """, (tasktype_id,))

            templates = cursor.fetchall()

            if not templates:
                return True

            # --------------------------------------------------
            # 3) Buscar todos os VAGOS disponíveis uma única vez
            # --------------------------------------------------
            cursor.execute("""
                SELECT activity_id
                FROM tbTaskActivity
                WHERE activity_task_id = 0
                ORDER BY activity_id
            """)

            vago_rows = cursor.fetchall()
            vago_ids = [row["activity_id"] for row in vago_rows]
            vago_index = 0

            # --------------------------------------------------
            # 4) Criar atividades
            # --------------------------------------------------
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

                # ----------------------------------------------
                # Reutilizar VAGO, se houver
                # ----------------------------------------------
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

    # ==========================================================
    # BUSCAR IDS POR WHERE DINÂMICO
    # ==========================================================
    def find_ids_by(self, where: Dict[str, Any]) -> List[int]:
        """
        Retorna lista de task_id baseado em filtros dinâmicos.

        Exemplo:
            repo.find_ids_by({"task_customer_id": 10})

        Segurança:
            - WHERE obrigatório
            - Query parametrizada
            - Colunas validadas por whitelist
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        self._validate_columns(
            columns=where.keys(),
            allowed_columns=self._TASK_COLUMNS,
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
        da tabela tbAccountTeam baseado em:

            - accountteam_allocated <> 0
            - accountteam_company_id = company_id
            - accountteam_user_type = user_type

        Ordenação:
            accountteam_id DESC

        Retorno:
            int  -> task_owner_id encontrado
            None -> se não existir registro ou ocorrer erro
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
        Verifica se o tipo da tarefa possui atividades padrão
        (tbTaskActivityTemplate) e cria as atividades na tbTaskActivity.

        Regras:
            - Reutiliza VAGO (activity_task_id = 0)
            - Caso não exista VAGO, insere novo registro
            - Cria todas as atividades do template
            - Executa em transação única

        Retorno:
            True  -> sucesso
            False -> erro
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
        Fluxo de inserção inteligente:

        1) Verifica se já existe tarefa com mesmos campos → retorna task_id
        2) Procura registro VAGO (campos zerados)
        3) Se existir → reutiliza com UPDATE
        4) Caso contrário → faz INSERT novo
        5) Após criar/reutilizar → cria atividades padrão (se houver)

        Retorno:
            task_id da tarefa criada ou reaproveitada
        """

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        self._validate_columns(
            columns=data.keys(),
            allowed_columns=self._TASK_COLUMNS,
            context="insert"
        )

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # --------------------------------------------------
            # 1) Verificar existência
            # --------------------------------------------------
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

            # --------------------------------------------------
            # 2) Procurar VAGO
            # --------------------------------------------------
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

            # --------------------------------------------------
            # 3) Reutilizar VAGO
            # --------------------------------------------------
            if vago_id:
                set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
                values_update = tuple(data.values()) + (vago_id,)

                query_update = f"""
                    UPDATE tbTask
                    SET {set_clause}
                    WHERE task_id = %s
                """

                cursor.execute(query_update, values_update)

                # Criar atividades padrão na mesma transação
                activities_ok = self._create_default_activities_in_transaction(cursor, vago_id)
                if not activities_ok:
                    raise RuntimeError("Falha ao criar atividades padrão para tarefa reutilizada.")

                conn.commit()
                return vago_id

            # --------------------------------------------------
            # 4) Inserir novo
            # --------------------------------------------------
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values_insert = tuple(data.values())

            query_insert = f"""
                INSERT INTO tbTask ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query_insert, values_insert)
            new_task_id = cursor.lastrowid

            # Criar atividades padrão na mesma transação
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
        Atualiza registros dinamicamente.

        Segurança:
            - WHERE obrigatório
            - Evita UPDATE global acidental
            - Colunas validadas por whitelist

        Retorna:
            Número de linhas afetadas
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        self._validate_columns(
            columns=data.keys(),
            allowed_columns=self._TASK_COLUMNS,
            context="update(data)"
        )

        self._validate_columns(
            columns=where.keys(),
            allowed_columns=self._TASK_COLUMNS,
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

        Regras:
            - task_end recebe end_val convertido
            - task_end_performed recebe end_performed_val convertido
            - só atualiza campos com valores válidos
            - se não houver nada para atualizar, retorna False

        Parâmetros:
            task_id:
                ID da tarefa.

            end_val:
                Data de término planejada.

            end_performed_val:
                Data de término realizada.

        Retorno:
            True  -> atualização realizada
            False -> nada atualizado ou erro
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

        Regras:
            - task_start recebe start_val convertido
            - task_start_performed recebe start_performed_val convertido
            - só atualiza campos com valores válidos
            - se não houver nada para atualizar, retorna False

        Parâmetros:
            task_id:
                ID da tarefa.

            start_val:
                Data de início planejada.

            start_performed_val:
                Data de início realizada.

        Retorno:
            True  -> atualização realizada
            False -> nada atualizado ou erro
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

        Parâmetros:
        ----------
        type_ids:
            - int → 5
            - lista → [1, 2]
            - string CSV → "1,2"
            - None → retorna todos

        as_df:
            - True → retorna DataFrame
            - False → retorna List[Dict]

        Segurança:
            - Filtra apenas IDs numéricos
            - Protegido contra SQL Injection
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
        Retorna os limites mínimos e máximos de mês e ano
        para as colunas task_start e task_end da view vwTaskIncentive.

        Campos retornados:
            - min_month_task_start
            - max_month_task_start
            - min_year_task_start
            - max_year_task_start
            - min_month_task_end
            - max_month_task_end
            - min_year_task_end
            - max_year_task_end

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
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

        Ordenação:
            - task_start ASC

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            Lista de dicionários ou DataFrame.
            Em caso de erro, retorna lista vazia ou DataFrame vazio.
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

        Permite filtros opcionais por:
            - task_owner_squad_id
            - task_owner_id

        Os filtros aceitam:
            - int (ex: 5)
            - lista de int (ex: [1,2,3])
            - string CSV (ex: "1,2,3")
            - None (sem filtro)

        Se ambos forem informados, aplica AND entre eles.

        Parâmetros:
            squad_ids  : int | list[int] | str | None
            owner_ids  : int | list[int] | str | None
            as_df      : bool → True retorna DataFrame

        Retorno:
            List[Dict] ou DataFrame

        Segurança:
            - SQL totalmente parametrizado
            - Proteção contra SQL Injection
            - IDs inválidos são ignorados
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
        Retorna colunas específicas da tabela tbTask
        baseado no task_id informado.

        Parâmetros:
        -----------
        task_id : int
            ID da tarefa.

        columns : List[str]
            Lista de colunas que deseja retornar.
            Exemplo:
                ["task_ws", "task_status", "task_owner_id"]

        as_df : bool
            Se True → retorna DataFrame
            Se False → retorna Dict

        Retorno:
        --------
        Dict com colunas solicitadas
        ou DataFrame (1 linha)
        ou None se não existir
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
                allowed_columns=self._TASK_COLUMNS,
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

        Filtros opcionais:
            - owner_id  → filtra por task_owner_id
            - for_team  → filtra por task_for_team

        Se ambos forem informados, aplica AND.

        Parâmetros:
            owner_id : int | None
            for_team : str | None
            as_df    : bool → True retorna pandas.DataFrame

        Retorno:
            List[Dict] ou DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra log no ErrorRepository
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

        Filtros opcionais:
            - owner_id → filtra por task_owner_id
            - for_team → filtra por task_for_team

        Se ambos forem informados, aplica AND.

        Parâmetros:
            owner_id : int | None
            for_team : str | None
            as_df    : bool → True retorna pandas.DataFrame

        Retorno:
            List[Dict] ou DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro via ErrorRepository
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

        Parâmetros:
            task_id : int | List[int] | None
                - Se int → filtra por igualdade
                - Se lista → usa IN (...)
                - Se None → retorna todos

            as_df : bool
                Se True → retorna pandas.DataFrame

        Retorno:
            List[Dict] ou DataFrame
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
    # SELECT TASK FOR FILTERING (vwFilterTask)
    # ==========================================================
    def load_for_filtering(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna dados da view vwFilterTask.

        Parâmetro:
            as_df : bool
                Se True → retorna pandas.DataFrame

        Retorno:
            List[Dict] ou DataFrame
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

        Parâmetros:
            task_id : int | None
                ID da tarefa.

        Retorno:
            tuple:
                (
                    total_activities: int,
                    avg_completed: float
                )

        Regras:
            - Se task_id for None ou 0 → retorna (0, 0)
            - Se não houver atividades → retorna (0, 0)
            - Em caso de erro → retorna (0, 0) e registra no ErrorRepository
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

        Parâmetros:
            where:
                Dicionário com filtros opcionais.

                Exemplo:
                    {
                        "task_owner_id": [1, 2],
                        "task_customer_id": 10,
                        "task_type_id": 3,
                        "task_ws": "WS001",
                        "task_deal_id": ["D100", "D200"],
                        "task_status_id": 1,
                    }

            as_df:
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Regras:
            - aceita apenas colunas previamente permitidas
            - valor escalar gera '='
            - lista gera 'IN (...)'
            - valores None, string vazia e listas vazias são ignorados
            - ordenação final:
                task_customer_name, task_deal_id

        Retorno:
            List[Dict] ou DataFrame
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

        Finalidade:
            - popular opções de filtro de owner
            - apoiar telas com multiselect/selectbox de responsáveis

        Ordenação:
            - task_owner_name

        Parâmetros:
            as_df:
                True  -> retorna pandas.DataFrame
                False -> retorna List[Dict]

        Retorno:
            List[Dict] ou DataFrame

        Em caso de erro:
            - retorna lista vazia ou DataFrame vazio
            - registra erro no ErrorRepository
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
