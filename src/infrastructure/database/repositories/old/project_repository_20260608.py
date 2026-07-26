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

Tratamento de erro:
--------------------
- Registra erro via ErrorRepository
- Evita quebrar frontend com retorno seguro

Exemplos de uso:
----------------
a) Buscar projetos de um cliente
    repo = ProjectRepository()
    rows = repo.get_project(customer_id=10)

b) Buscar projetos por status
    repo = ProjectRepository()
    rows = repo.get_project(project_status="ACTIVE")

c) Buscar projetos por múltiplos status
    repo = ProjectRepository()
    rows = repo.get_project(project_status=["ACTIVE", "ON HOLD"])

d) Buscar projetos como DataFrame
    repo = ProjectRepository()
    df = repo.get_project(customer_id=10, project_status="ACTIVE,ON HOLD", as_df=True)

e) Buscar equipe de projetos
    repo = ProjectRepository()
    rows = repo.get_project_team(customer_id=[10, 20], project_status="ACTIVE")
"""

from typing import Optional, Union, List, Dict, Any
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class ProjectRepository:
    """
    Repository responsável pelas views relacionadas a projetos.
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

        Aceita:
            - int
            - list[int]
            - string CSV, ex: "1,2,3"
            - None

        Exemplos:
            _parse_int_ids(5) -> [5]
            _parse_int_ids([1, "2", "x"]) -> [1, 2]
            _parse_int_ids("1, 2, abc") -> [1, 2]
            _parse_int_ids(None) -> []
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

        Aceita:
            - str
            - list[str]
            - string CSV, ex: "ACTIVE,ON HOLD,CLOSED"
            - None

        Regras:
            - remove espaços nas extremidades
            - ignora valores vazios
            - preserva o conteúdo textual original

        Exemplos:
            _parse_str_values("ACTIVE") -> ["ACTIVE"]
            _parse_str_values("ACTIVE, ON HOLD") -> ["ACTIVE", "ON HOLD"]
            _parse_str_values(["ACTIVE", " CLOSED "]) -> ["ACTIVE", "CLOSED"]
            _parse_str_values(None) -> []
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

        Filtros opcionais:
            - customer_id    → filtra por project_customer_id
            - project_status → filtra por project_status (varchar)

        Parâmetros:
            customer_id:
                int | list[int] | str | None

            project_status:
                str | list[str] | None

                Exemplos aceitos:
                - "ACTIVE"
                - "ACTIVE,ON HOLD"
                - ["ACTIVE", "ON HOLD"]

            as_df:
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Exemplos:
            repo = ProjectRepository()

            repo.get_project(customer_id=10)

            repo.get_project(project_status="ACTIVE")

            repo.get_project(project_status=["ACTIVE", "ON HOLD"])

            repo.get_project(customer_id="10,20", project_status="ACTIVE,ON HOLD")

            repo.get_project(customer_id=10, as_df=True)
        """

        query = """
            SELECT *
            FROM vwProject
        """

        conditions = []
        params: List[Any] = []

        # ------------------------------------------------------
        # FILTRO POR CUSTOMER_ID
        # ------------------------------------------------------
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

        # ------------------------------------------------------
        # FILTRO POR PROJECT_STATUS (VARCHAR)
        # ------------------------------------------------------
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

        # ------------------------------------------------------
        # MONTAGEM DO WHERE
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY project_customer_name, project_id"

        # ------------------------------------------------------
        # EXECUÇÃO
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

        Filtros opcionais:
            - customer_id    → filtra por projteam_project_customer_id
            - project_status → filtra por projteam_project_status (varchar)

        Parâmetros:
            customer_id:
                int | list[int] | str | None

            project_status:
                str | list[str] | None

                Exemplos aceitos:
                - "ACTIVE"
                - "ACTIVE,ON HOLD"
                - ["ACTIVE", "ON HOLD"]

            as_df:
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Exemplos:
            repo = ProjectRepository()

            repo.get_project_team(customer_id=10)

            repo.get_project_team(project_status="ACTIVE")

            repo.get_project_team(project_status=["ACTIVE", "ON HOLD"])

            repo.get_project_team(customer_id="10,20", project_status="ACTIVE,ON HOLD")

            repo.get_project_team(customer_id=10, as_df=True)
        """

        query = """
            SELECT *
            FROM vwProjectTeam
        """

        conditions = []
        params: List[Any] = []

        # ------------------------------------------------------
        # FILTRO POR CUSTOMER_ID
        # ------------------------------------------------------
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

        # ------------------------------------------------------
        # FILTRO POR PROJECT_STATUS (VARCHAR)
        # ------------------------------------------------------
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

        # ------------------------------------------------------
        # MONTAGEM DO WHERE
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY projteam_project_customer_name, projteam_project_id"

        # ------------------------------------------------------
        # EXECUÇÃO
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

        Filtros opcionais:
            - customer_id → filtra por project_customer_id

        Parâmetros:
            customer_id:
                int | list[int] | str | None

            as_df:
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame

        Exemplos:
            repo = ProjectRepository()

            repo.get_project_in_progress(customer_id=10)
        """

        query = """
            SELECT *
            FROM vwProject
            WHERE project_status NOT IN ('Closed', 'Canceled')
        """

        conditions = []
        params: List[Any] = []

        # ------------------------------------------------------
        # FILTRO POR CUSTOMER_ID
        # ------------------------------------------------------
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
                # Se foi informado customer_id, mas nada válido foi parseado,
                # força resultado vazio para evitar retorno indevido.
                conditions.append("1=0")

        # ------------------------------------------------------
        # MONTAGEM DO WHERE
        # ------------------------------------------------------
        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += " ORDER BY project_customer_name, project_ov"

        # ------------------------------------------------------
        # EXECUÇÃO
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

