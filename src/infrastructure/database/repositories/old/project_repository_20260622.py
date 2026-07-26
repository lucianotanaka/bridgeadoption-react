"""
ProjectRepository

Responsável por operações relacionadas às views de projetos:

    - vwProject
    - vwProjectTeam

Objetivos:
-----------
- Centralizar acesso a dados de projetos
- Evitar SQL espalhado pelo sistema
- Garantir segurança contra SQL Injection
- Padronizar tratamento de erro via ErrorRepository
- Manter consistência arquitetural com os demais repositories

Padrão de retorno:
-------------------
- Métodos SELECT → retornam List[Dict] ou pandas.DataFrame
- Métodos INSERT/UPDATE → retornam int

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Evita quebrar frontend com retorno seguro
"""

from typing import Optional, Union, List, Dict, Any, Tuple
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ProjectRepository:
    """
    Repository responsável pelas views e tabelas relacionadas a projetos.
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # FUNÇÃO INTERNA PARA NORMALIZAR IDS INTEIROS
    # ==========================================================
    def _parse_int_ids(
        self,
        value: Optional[Union[int, List[int], str]]
    ) -> List[int]:
        """
        Normaliza entradas numéricas para uma lista de inteiros válidos.
        """

        parsed_ids: List[int] = []

        if value is None:
            return parsed_ids

        if isinstance(value, int):
            return [value]

        if isinstance(value, list):
            for item in value:
                if isinstance(item, int):
                    parsed_ids.append(item)
                elif isinstance(item, str) and item.strip().isdigit():
                    parsed_ids.append(int(item.strip()))
            return parsed_ids

        if isinstance(value, str):
            for part in value.split(","):
                part = part.strip()
                if part.isdigit():
                    parsed_ids.append(int(part))

        return parsed_ids

    # ==========================================================
    # FUNÇÃO INTERNA PARA NORMALIZAR LISTA DE TEXTOS
    # ==========================================================
    def _parse_str_values(
        self,
        value: Optional[Union[str, List[str]]]
    ) -> List[str]:
        """
        Normaliza entradas textuais para uma lista de strings válidas.
        """

        parsed_values: List[str] = []

        if value is None:
            return parsed_values

        if isinstance(value, str):
            for part in value.split(","):
                part = part.strip()
                if part:
                    parsed_values.append(part)
            return parsed_values

        if isinstance(value, list):
            for item in value:
                if item is None:
                    continue
                item_str = str(item).strip()
                if item_str:
                    parsed_values.append(item_str)

        return parsed_values

    # ==========================================================
    # FUNÇÃO INTERNA PARA NORMALIZAR VALOR DE PROJECT_OV
    # ==========================================================
    def _normalize_project_ov(self, value: Any) -> str:
        """
        Remove espaços do valor informado e normaliza POC/PSR em maiúsculo.
        Mantém o restante do formato exatamente como informado, exceto espaços.
        """

        if value is None:
            return ""

        ov = str(value).replace(" ", "").strip()

        if ov.upper() in ("POC", "PSR"):
            return ov.upper()

        return ov

    # ==========================================================
    # FUNÇÃO INTERNA PARA EXTRAIR OVS INDIVIDUAIS
    # ==========================================================
    def _extract_individual_ovs(self, project_ov: str) -> List[str]:
        """
        Quebra project_ov composta em OVs individuais normalizadas para tbProjectOV.

        Regras:
            - separador: "_"
            - remove "#"
            - remove espaços
            - POC/PSR são mantidos como POC/PSR
            - ignora itens vazios
            - remove duplicados preservando ordem
        """

        normalized_ov = self._normalize_project_ov(project_ov)

        if not normalized_ov:
            return []

        if normalized_ov in ("POC", "PSR"):
            return [normalized_ov]

        items: List[str] = []
        seen = set()

        for part in normalized_ov.split("_"):
            item = part.replace("#", "").replace(" ", "").strip()
            if not item:
                continue
            if item not in seen:
                seen.add(item)
                items.append(item)

        return items

    # ==========================================================
    # FUNÇÃO INTERNA PARA OBTER COLUNAS DA TBPROJECT
    # ==========================================================
    def _get_tbproject_columns(self, cursor) -> List[str]:
        """
        Obtém dinamicamente as colunas atuais da tabela tbProject.
        """

        query = """
            SHOW COLUMNS FROM tbProject
        """
        cursor.execute(query)
        rows = cursor.fetchall()

        columns: List[str] = []
        for row in rows:
            if isinstance(row, dict):
                field_name = row.get("Field")
            else:
                field_name = row[0]
            if field_name:
                columns.append(field_name)

        return columns

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR CLIENTE NA TBCOMPANY
    # ==========================================================
    def _get_company_name(self, cursor, company_id: int) -> Optional[str]:
        """
        Retorna o nome do cliente na tbCompany.
        """

        query = """
            SELECT company_name
            FROM tbCompany
            WHERE company_id = %s
            LIMIT 1
        """
        cursor.execute(query, (company_id,))
        row = cursor.fetchone()

        if not row:
            return None

        if isinstance(row, dict):
            return row.get("company_name")

        return row[0]

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR PROJETO POC/PSR
    # ==========================================================
    def _find_poc_psr_project_id(
        self,
        cursor,
        project_ov: str,
        project_customer_id: int,
        project_owner: str,
        project_name: Optional[str]
    ) -> int:
        """
        Busca projeto POC/PSR na tbProject usando os parâmetros mínimos.
        """

        if project_name is None:
            query = """
                SELECT project_id
                FROM tbProject
                WHERE project_ov = %s
                  AND project_customer_id = %s
                  AND project_owner = %s
                  AND project_name IS NULL
                ORDER BY project_id
                LIMIT 1
            """
            params = (project_ov, project_customer_id, project_owner)
        else:
            query = """
                SELECT project_id
                FROM tbProject
                WHERE project_ov = %s
                  AND project_customer_id = %s
                  AND project_owner = %s
                  AND project_name = %s
                ORDER BY project_id
                LIMIT 1
            """
            params = (project_ov, project_customer_id, project_owner, project_name)

        cursor.execute(query, params)
        row = cursor.fetchone()

        if not row:
            return 0

        if isinstance(row, dict):
            return int(row.get("project_id", 0) or 0)

        return int(row[0] or 0)

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR PROJETO POR OVS
    # ==========================================================
    def _find_project_by_ovs(
        self,
        cursor,
        project_ov: str
    ) -> int:
        """
        Busca projeto existente a partir das OVs individualizadas.

        Estratégia:
            - procura da esquerda para direita em tbProjectOV
            - se encontrar um project_id, valida o registro em tbProject
            - se tbProject.project_ov for igual ao informado, retorna
            - se for diferente, também retorna o mesmo project_id
              para permitir atualização por nova internalização
        """

        normalized_project_ov = self._normalize_project_ov(project_ov)
        ov_items = self._extract_individual_ovs(normalized_project_ov)

        for ov in ov_items:
            query = """
                SELECT ov_project_id
                FROM tbProjectOV
                WHERE ov_project_ov = %s
                  AND ov_project_id > 0
                ORDER BY ov_project_id
                LIMIT 1
            """
            cursor.execute(query, (ov,))
            row = cursor.fetchone()

            if not row:
                continue

            if isinstance(row, dict):
                project_id = int(row.get("ov_project_id", 0) or 0)
            else:
                project_id = int(row[0] or 0)

            if project_id > 0:
                return project_id

        return 0

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR PROJECT_OV ATUAL
    # ==========================================================
    def _get_project_current_ov(self, cursor, project_id: int) -> Optional[str]:
        """
        Retorna o valor atual de tbProject.project_ov.
        """

        query = """
            SELECT project_ov
            FROM tbProject
            WHERE project_id = %s
            LIMIT 1
        """
        cursor.execute(query, (project_id,))
        row = cursor.fetchone()

        if not row:
            return None

        if isinstance(row, dict):
            return row.get("project_ov")

        return row[0]

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR MENOR PROJECT_ID VAGO
    # ==========================================================
    def _get_vacant_project_id(self, cursor) -> int:
        """
        Busca o menor project_id vago na tbProject.
        """

        query = """
            SELECT MIN(project_id) AS project_id
            FROM tbProject
            WHERE project_ov LIKE 'VAGO%%'
               OR project_ov IS NULL
        """
        cursor.execute(query)
        row = cursor.fetchone()

        if not row:
            return 0

        if isinstance(row, dict):
            return int(row.get("project_id", 0) or 0)

        return int(row[0] or 0)

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR MENOR OV_ID VAGO
    # ==========================================================
    def _get_vacant_tbprojectov_row_id(self, cursor) -> int:
        """
        Busca o menor ov_id vago na tbProjectOV.
        """

        query = """
            SELECT MIN(ov_id) AS ov_id
            FROM tbProjectOV
            WHERE ov_project_id = 0
        """
        cursor.execute(query)
        row = cursor.fetchone()

        if not row:
            return 0

        if isinstance(row, dict):
            return int(row.get("ov_id", 0) or 0)

        return int(row[0] or 0)

    # ==========================================================
    # FUNÇÃO INTERNA PARA BUSCAR OVS JÁ GRAVADAS DO PROJETO
    # ==========================================================
    def _get_existing_project_ovs(self, cursor, project_id: int) -> List[str]:
        """
        Retorna as OVs individuais já registradas na tbProjectOV para um projeto.
        """

        query = """
            SELECT ov_project_ov
            FROM tbProjectOV
            WHERE ov_project_id = %s
        """
        cursor.execute(query, (project_id,))
        rows = cursor.fetchall()

        values: List[str] = []
        for row in rows:
            if isinstance(row, dict):
                ov = row.get("ov_project_ov")
            else:
                ov = row[0]

            if ov is not None:
                values.append(str(ov))

        return values

    # ==========================================================
    # FUNÇÃO INTERNA PARA INSERIR/ATUALIZAR OVS INDIVIDUAIS
    # ==========================================================
    def _sync_tbprojectov(
        self,
        cursor,
        project_id: int,
        project_ov: str
    ) -> None:
        """
        Sincroniza as OVs individuais do projeto na tbProjectOV.
        Insere somente as que ainda não existirem.
        Reaproveita linhas vagas (ov_project_id = 0) quando possível.
        """

        desired_ovs = self._extract_individual_ovs(project_ov)
        existing_ovs = set(self._get_existing_project_ovs(cursor, project_id))

        for ov in desired_ovs:
            if ov in existing_ovs:
                continue

            vacant_ov_id = self._get_vacant_tbprojectov_row_id(cursor)

            if vacant_ov_id > 0:
                update_query = """
                    UPDATE tbProjectOV
                    SET ov_project_id = %s,
                        ov_project_ov = %s
                    WHERE ov_id = %s
                """
                cursor.execute(update_query, (project_id, ov, vacant_ov_id))
            else:
                insert_query = """
                    INSERT INTO tbProjectOV (
                        ov_project_id,
                        ov_project_ov
                    ) VALUES (%s, %s)
                """
                cursor.execute(insert_query, (project_id, ov))

    # ==========================================================
    # FUNÇÃO INTERNA PARA MONTAR DADOS FILTRADOS DA TBPROJECT
    # ==========================================================
    def _build_tbproject_payload(
        self,
        input_data: Dict[str, Any],
        tbproject_columns: List[str]
    ) -> Dict[str, Any]:
        """
        Filtra o payload de entrada de acordo com as colunas válidas da tbProject.
        """

        payload: Dict[str, Any] = {}

        for key, value in input_data.items():
            if key in tbproject_columns and key != "project_id":
                payload[key] = value

        return payload

    # ==========================================================
    # FUNÇÃO INTERNA PARA NORMALIZAR PAYLOAD DO PROJETO
    # ==========================================================
    def _prepare_project_payload(
        self,
        cursor,
        project_data: Dict[str, Any],
        tbproject_columns: List[str]
    ) -> Tuple[Dict[str, Any], int]:
        """
        Prepara e valida os dados do projeto antes do insert/update.

        Retorna:
            payload_final, project_customer_id
        """

        payload = self._build_tbproject_payload(project_data, tbproject_columns)

        if "project_ov" not in payload or payload.get("project_ov") in (None, ""):
            raise ValueError("O campo 'project_ov' é obrigatório.")

        if "project_customer_id" not in payload or payload.get("project_customer_id") in (None, ""):
            raise ValueError("O campo 'project_customer_id' é obrigatório.")

        project_customer_id = int(payload["project_customer_id"])
        project_ov = self._normalize_project_ov(payload["project_ov"])

        if not project_ov:
            raise ValueError("O campo 'project_ov' é obrigatório.")

        payload["project_ov"] = project_ov

        if payload["project_ov"].upper() in ("POC", "PSR"):
            payload["project_ov"] = payload["project_ov"].upper()

        if "project_owner" not in payload or payload.get("project_owner") in (None, ""):
            payload["project_owner"] = "PMO"

        company_name = payload.get("project_customer_name")
        if company_name in (None, ""):
            company_name = self._get_company_name(cursor, project_customer_id)
            if not company_name:
                raise ValueError(
                    f"Cliente não encontrado na tbCompany para company_id={project_customer_id}."
                )
            payload["project_customer_name"] = company_name

        return payload, project_customer_id

    # ==========================================================
    # FUNÇÃO INTERNA PARA ATUALIZAR TBPROJECT
    # ==========================================================
    def _update_tbproject_if_needed(
        self,
        cursor,
        project_id: int,
        payload: Dict[str, Any]
    ) -> None:
        """
        Atualiza apenas os campos de tbProject que estiverem diferentes do payload recebido.
        """

        select_query = """
            SELECT *
            FROM tbProject
            WHERE project_id = %s
            LIMIT 1
        """
        cursor.execute(select_query, (project_id,))
        current_row = cursor.fetchone()

        if not current_row:
            raise ValueError(f"Projeto não encontrado para project_id={project_id}.")

        updates = []
        params: List[Any] = []

        for key, new_value in payload.items():
            if key == "project_id":
                continue

            current_value = current_row.get(key) if isinstance(current_row, dict) else None

            if current_value != new_value:
                updates.append(f"{key} = %s")
                params.append(new_value)

        if updates:
            update_query = f"""
                UPDATE tbProject
                SET {", ".join(updates)}
                WHERE project_id = %s
            """
            params.append(project_id)
            cursor.execute(update_query, tuple(params))

    # ==========================================================
    # FUNÇÃO INTERNA PARA INSERIR NOVO PROJETO
    # ==========================================================
    def _insert_new_tbproject(
        self,
        cursor,
        payload: Dict[str, Any]
    ) -> int:
        """
        Insere novo projeto em tbProject ou reaproveita um registro vago.
        """

        vacant_project_id = self._get_vacant_project_id(cursor)

        if vacant_project_id > 0:
            set_clauses = []
            params: List[Any] = []

            for key, value in payload.items():
                if key == "project_id":
                    continue
                set_clauses.append(f"{key} = %s")
                params.append(value)

            update_query = f"""
                UPDATE tbProject
                SET {", ".join(set_clauses)}
                WHERE project_id = %s
            """
            params.append(vacant_project_id)
            cursor.execute(update_query, tuple(params))
            return vacant_project_id

        columns = []
        placeholders = []
        params = []

        for key, value in payload.items():
            if key == "project_id":
                continue
            columns.append(key)
            placeholders.append("%s")
            params.append(value)

        insert_query = f"""
            INSERT INTO tbProject (
                {", ".join(columns)}
            ) VALUES (
                {", ".join(placeholders)}
            )
        """
        cursor.execute(insert_query, tuple(params))
        return int(cursor.lastrowid)

    # ==========================================================
    # INSERT / UPSERT DE PROJETO
    # ==========================================================
    def insert(
        self,
        project_data: Dict[str, Any]
    ) -> int:
        """
        Insere ou atualiza um projeto nas tabelas tbProject e tbProjectOV.

        Regras:
            - project_ov e project_customer_id são obrigatórios
            - project_owner default = 'PMO'
            - project_customer_name é buscado na tbCompany caso não informado
            - project_ov pode ser simples, composta, conter '#' ou ser POC/PSR
            - busca projeto existente antes de inserir
            - reaproveita registros vagos em tbProject e tbProjectOV
            - atualiza dados recebidos quando o projeto já existir
            - sincroniza tbProjectOV com as OVs individuais

        Retorno:
            project_id em caso de sucesso
            0 em caso de erro
        """

        conn = None
        cursor = None
        query_context = "ProjectRepository.insert"

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            tbproject_columns = self._get_tbproject_columns(cursor)
            payload, project_customer_id = self._prepare_project_payload(
                cursor=cursor,
                project_data=project_data,
                tbproject_columns=tbproject_columns
            )

            normalized_project_ov = payload["project_ov"]
            project_owner = payload.get("project_owner", "PMO")
            project_name = payload.get("project_name")

            project_id = 0

            # --------------------------------------------------
            # BUSCA PROJETO EXISTENTE
            # --------------------------------------------------
            if normalized_project_ov in ("POC", "PSR"):
                project_id = self._find_poc_psr_project_id(
                    cursor=cursor,
                    project_ov=normalized_project_ov,
                    project_customer_id=project_customer_id,
                    project_owner=project_owner,
                    project_name=project_name
                )
            else:
                project_id = self._find_project_by_ovs(
                    cursor=cursor,
                    project_ov=normalized_project_ov
                )

            # --------------------------------------------------
            # INSERT OU UPDATE EM TBPROJECT
            # --------------------------------------------------
            if project_id > 0:
                self._update_tbproject_if_needed(
                    cursor=cursor,
                    project_id=project_id,
                    payload=payload
                )
            else:
                project_id = self._insert_new_tbproject(
                    cursor=cursor,
                    payload=payload
                )

            # --------------------------------------------------
            # SINCRONIZA TBPROJECTOV
            # --------------------------------------------------
            self._sync_tbprojectov(
                cursor=cursor,
                project_id=project_id,
                project_ov=normalized_project_ov
            )

            conn.commit()
            return project_id

        except Exception as e:
            if conn:
                conn.rollback()

            self.error_repo.log_error(
                error_function="ProjectRepository.insert",
                error_command=query_context,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return 0

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # ==========================================================
    # BUSCAR PROJETOS (vwProject)
    # ==========================================================
    def get_project(
        self,
        customer_id: Optional[Union[int, List[int], str]] = None,
        project_status: Optional[Union[str, List[str]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwProject.
        """

        query = """
            SELECT *
            FROM vwProject
        """

        conditions = []
        params: List[Any] = []

        if customer_id is not None:
            parsed_customer_ids = self._parse_int_ids(customer_id)

            if parsed_customer_ids:
                if len(parsed_customer_ids) == 1:
                    conditions.append("project_customer_id = %s")
                    params.append(parsed_customer_ids[0])
                else:
                    placeholders = ", ".join(["%s"] * len(parsed_customer_ids))
                    conditions.append(f"project_customer_id IN ({placeholders})")
                    params.extend(parsed_customer_ids)
            else:
                conditions.append("1=0")

        if project_status is not None:
            parsed_status_values = self._parse_str_values(project_status)

            if parsed_status_values:
                if len(parsed_status_values) == 1:
                    conditions.append("project_status = %s")
                    params.append(parsed_status_values[0])
                else:
                    placeholders = ", ".join(["%s"] * len(parsed_status_values))
                    conditions.append(f"project_status IN ({placeholders})")
                    params.extend(parsed_status_values)
            else:
                conditions.append("1=0")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY project_customer_name, project_id"

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
                error_function="ProjectRepository.get_project",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # BUSCAR EQUIPE DE PROJETOS (vwProjectTeam)
    # ==========================================================
    def get_project_team(
        self,
        customer_id: Optional[Union[int, List[int], str]] = None,
        project_status: Optional[Union[str, List[str]]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwProjectTeam.
        """

        query = """
            SELECT *
            FROM vwProjectTeam
        """

        conditions = []
        params: List[Any] = []

        if customer_id is not None:
            parsed_customer_ids = self._parse_int_ids(customer_id)

            if parsed_customer_ids:
                if len(parsed_customer_ids) == 1:
                    conditions.append("projteam_project_customer_id = %s")
                    params.append(parsed_customer_ids[0])
                else:
                    placeholders = ", ".join(["%s"] * len(parsed_customer_ids))
                    conditions.append(f"projteam_project_customer_id IN ({placeholders})")
                    params.extend(parsed_customer_ids)
            else:
                conditions.append("1=0")

        if project_status is not None:
            parsed_status_values = self._parse_str_values(project_status)

            if parsed_status_values:
                if len(parsed_status_values) == 1:
                    conditions.append("projteam_project_status = %s")
                    params.append(parsed_status_values[0])
                else:
                    placeholders = ", ".join(["%s"] * len(parsed_status_values))
                    conditions.append(f"projteam_project_status IN ({placeholders})")
                    params.extend(parsed_status_values)
            else:
                conditions.append("1=0")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY projteam_project_customer_name, projteam_project_id"

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
                error_function="ProjectRepository.get_project_team",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # BUSCAR PROJETOS EM ANDAMENTO (vwProject)
    # ==========================================================
    def get_project_in_progress(
        self,
        customer_id: Optional[Union[int, List[int], str]] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwProject.
        """

        query = """
            SELECT *
            FROM vwProject
            WHERE project_status NOT IN ('Closed', 'Canceled')
        """

        conditions = []
        params: List[Any] = []

        if customer_id is not None:
            parsed_customer_ids = self._parse_int_ids(customer_id)

            if parsed_customer_ids:
                if len(parsed_customer_ids) == 1:
                    conditions.append("project_customer_id = %s")
                    params.append(parsed_customer_ids[0])
                else:
                    placeholders = ", ".join(["%s"] * len(parsed_customer_ids))
                    conditions.append(f"project_customer_id IN ({placeholders})")
                    params.extend(parsed_customer_ids)
            else:
                conditions.append("1=0")

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += " ORDER BY project_customer_name, project_ov"

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
                error_function="ProjectRepository.get_project_in_progress",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()
