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

"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class TaskRepository:
    """
    Repository responsável pela tabela tbTask.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

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
        """

        if not where:
            raise ValueError("WHERE não pode ser vazio.")

        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(where.values())

        query = f"""
            SELECT task_id
            FROM tbTask
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
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
            cursor.close()
            conn.close()

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

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(query, (company_id, user_type))
            result = cursor.fetchone()

            if result:
                return result["task_owner_id"]

            return 0

        except Exception as e:
            self.error_repo.log_error(
                error_function="TaskRepository.get_last_task_owner_by_company",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()


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

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

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
                return True  # não há atividades padrão

            # --------------------------------------------------
            # 3) Criar atividades
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
                # Verificar VAGO
                # ----------------------------------------------
                cursor.execute("""
                    SELECT MIN(activity_id) AS activity_id
                    FROM tbTaskActivity
                    WHERE activity_task_id = 0
                """)

                result = cursor.fetchone()
                vago_id = result["activity_id"] if result and result["activity_id"] else None

                if vago_id:
                    # UPDATE reutilizando VAGO
                    set_clause = ", ".join([f"{k} = %s" for k in activity_data.keys()])
                    values = tuple(activity_data.values()) + (vago_id,)

                    cursor.execute(f"""
                        UPDATE tbTaskActivity
                        SET {set_clause}
                        WHERE activity_id = %s
                    """, values)

                else:
                    # INSERT novo
                    columns = ", ".join(activity_data.keys())
                    placeholders = ", ".join(["%s"] * len(activity_data))
                    values = tuple(activity_data.values())

                    cursor.execute(f"""
                        INSERT INTO tbTaskActivity ({columns})
                        VALUES ({placeholders})
                    """, values)

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="TaskRepository.create_default_activities",
                error_command="create_default_activities",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return False

        finally:
            if "conn" in locals():
                cursor.close()
                conn.close()

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

        conn = get_db_connection()

        try:
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
                conn.commit()

                # Criar atividades padrão
                self.create_default_activities(vago_id)

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
            conn.commit()

            new_task_id = cursor.lastrowid

            # Criar atividades padrão
            self.create_default_activities(new_task_id)

            return new_task_id

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="TaskRepository.insert",
                error_command="INSERT/UPDATE tbTask + create_default_activities",
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            raise

        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # UPDATE DINÂMICO
    # ==========================================================
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Atualiza registros dinamicamente.

        Segurança:
            - WHERE obrigatório
            - Evita UPDATE global acidental

        Retorna:
            Número de linhas afetadas
        """

        if not data:
            raise ValueError("Dicionário de atualização não pode ser vazio.")

        if not where:
            raise ValueError("WHERE é obrigatório.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        values = tuple(data.values()) + tuple(where.values())

        query = f"""
            UPDATE tbTask
            SET {set_clause}
            WHERE {where_clause}
        """
        
        conn = get_db_connection()

        try:
            cursor = conn.cursor()            
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                error_function="TaskRepository.update",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            cursor.close()
            conn.close()


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

        # ------------------------------------------------------
        # Construção segura do WHERE
        # ------------------------------------------------------
        if type_ids is not None:

            parsed_ids: List[int] = []

            if isinstance(type_ids, int):
                parsed_ids = [type_ids]

            elif isinstance(type_ids, list):
                parsed_ids = [
                    int(x) for x in type_ids
                    if isinstance(x, int) or (isinstance(x, str) and str(x).isdigit())
                ]

            elif isinstance(type_ids, str):
                for id_str in type_ids.split(","):
                    stripped = id_str.strip()
                    if stripped.isdigit():
                        parsed_ids.append(int(stripped))

            if not parsed_ids:
                query += " WHERE 1=0"
            else:
                placeholders = ", ".join(["%s"] * len(parsed_ids))
                query += f" WHERE tasktype_id IN ({placeholders})"
                params = parsed_ids

        query += " ORDER BY tasktype_name"

        # ------------------------------------------------------
        # Execução
        # ------------------------------------------------------
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
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()


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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

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

        # ------------------------------------------------------
        # Função interna para normalizar entrada (int/list/CSV)
        # ------------------------------------------------------
        def parse_ids(value) -> List[int]:
            parsed = []

            if isinstance(value, int):
                parsed = [value]

            elif isinstance(value, list):
                parsed = [
                    int(v) for v in value
                    if isinstance(v, int) or (isinstance(v, str) and str(v).isdigit())
                ]

            elif isinstance(value, str):
                for part in value.split(","):
                    stripped = part.strip()
                    if stripped.isdigit():
                        parsed.append(int(stripped))

            return parsed

        # ------------------------------------------------------
        # Filtro por squad_ids
        # ------------------------------------------------------
        if squad_ids is not None:
            parsed_squads = parse_ids(squad_ids)

            if parsed_squads:
                placeholders = ", ".join(["%s"] * len(parsed_squads))
                filters.append(f"task_owner_squad_id IN ({placeholders})")
                params.extend(parsed_squads)
            else:
                # Nenhum ID válido → força retorno vazio
                filters.append("1=0")

        # ------------------------------------------------------
        # Filtro por owner_ids
        # ------------------------------------------------------
        if owner_ids is not None:
            parsed_owners = parse_ids(owner_ids)

            if parsed_owners:
                placeholders = ", ".join(["%s"] * len(parsed_owners))
                filters.append(f"task_owner_id IN ({placeholders})")
                params.extend(parsed_owners)
            else:
                filters.append("1=0")

        # ------------------------------------------------------
        # Montagem final da query
        # ------------------------------------------------------
        if filters:
            base_query += " WHERE " + " AND ".join(filters)

        base_query += " ORDER BY task_start"

        # ------------------------------------------------------
        # Execução segura
        # ------------------------------------------------------
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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


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

        try:
            # --------------------------------------------------
            # Validação de segurança das colunas
            # Apenas permite letras, números e underscore
            # --------------------------------------------------
            safe_columns = []
            for col in columns:
                if not col.replace("_", "").isalnum():
                    raise ValueError(f"Coluna inválida: {col}")
                safe_columns.append(col)

            column_clause = ", ".join(safe_columns)

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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()



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

        # ------------------------------------------------------
        # Filtro por owner_id
        # ------------------------------------------------------
        if owner_id is not None:
            conditions.append("task_owner_id = %s")
            params.append(int(owner_id))

        # ------------------------------------------------------
        # Filtro por for_team
        # ------------------------------------------------------
        if for_team is not None:
            conditions.append("task_for_team = %s")
            params.append(str(for_team))

        # ------------------------------------------------------
        # Montagem dinâmica do WHERE
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        # ------------------------------------------------------
        # Execução
        # ------------------------------------------------------
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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


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

        # ------------------------------------------------------
        # Filtro por owner_id
        # ------------------------------------------------------
        if owner_id is not None:
            conditions.append("task_owner_id = %s")
            params.append(int(owner_id))

        # ------------------------------------------------------
        # Filtro por for_team
        # ------------------------------------------------------
        if for_team is not None:
            conditions.append("task_for_team = %s")
            params.append(str(for_team))

        # ------------------------------------------------------
        # Montagem dinâmica do WHERE
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        # ------------------------------------------------------
        # Execução
        # ------------------------------------------------------
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
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


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

        # ------------------------------------------------------
        # Filtro por task_id (int ou lista)
        # ------------------------------------------------------
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

        # ------------------------------------------------------
        # WHERE dinâmico
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        # Ordenação original mantida
        query += " ORDER BY task_customer_name, task_deal_id"

        # ------------------------------------------------------
        # Execução
        # ------------------------------------------------------
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
                error_function="TaskRepository.select_task",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()


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

        # ------------------------------------------------------
        # Execução
        # ------------------------------------------------------
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
            if not as_df and "conn" in locals() and conn is not None:
                if "cursor" in locals() and cursor is not None:
                    cursor.close()
                conn.close()


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
            if "conn" in locals() and conn is not None:
                if "cursor" in locals() and cursor is not None:
                    cursor.close()
                conn.close()

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

        allowed_columns = {
            "task_owner_id",
            "task_customer_id",
            "task_type_id",
            "task_ws",
            "task_deal_id",
            "task_status_id",
        }

        conditions = []
        params: List[Any] = []

        if where is None:
            where = {}

        if not isinstance(where, dict):
            raise ValueError("O parâmetro 'where' deve ser um dicionário.")

        for column, value in where.items():
            if column not in allowed_columns:
                raise ValueError(f"Coluna de filtro não permitida: {column}")

            if value is None:
                continue

            # Lista / tupla / conjunto -> IN
            if isinstance(value, (list, tuple, set)):
                values = [v for v in value if v is not None and str(v).strip() != ""]
                if not values:
                    continue

                placeholders = ", ".join(["%s"] * len(values))
                conditions.append(f"{column} IN ({placeholders})")
                params.extend(values)
                continue

            # String CSV opcional -> IN
            if isinstance(value, str) and "," in value:
                values = [v.strip() for v in value.split(",") if v.strip() != ""]
                if not values:
                    continue

                placeholders = ", ".join(["%s"] * len(values))
                conditions.append(f"{column} IN ({placeholders})")
                params.extend(values)
                continue

            # Valor único -> =
            if str(value).strip() == "":
                continue

            conditions.append(f"{column} = %s")
            params.append(value)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY task_customer_name, task_deal_id"

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
            if "conn" in locals() and conn is not None:
                if "cursor" in locals() and cursor is not None:
                    cursor.close()
                conn.close()


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
            if "conn" in locals() and conn is not None:
                if "cursor" in locals() and cursor is not None:
                    cursor.close()
                conn.close()
