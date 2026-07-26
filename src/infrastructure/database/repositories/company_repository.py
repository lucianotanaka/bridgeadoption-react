"""
CompanyRepository

Responsável por operações nas tabelas:
- tbCompany
- tbCompanyListName

Objetivos principais:

1) Centralizar todo acesso às entidades Company.
2) Permitir consultas dinâmicas (SELECT por dicionário).
3) Permitir WHERE livre com AND, OR, LIKE.
4) Garantir padronização de dados (strings sempre em UPPERCASE).
5) Reaproveitar registros "VAGO" antes de criar novos.
6) Manter sincronização automática com tbCompanyListName.
7) Registrar erros estruturados via ErrorRepository.

Este repository deve ser a única camada que manipula diretamente
tbCompany e tbCompanyListName.
"""

from typing import Any, Dict, List, Optional, Union
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CompanyRepository:
    """
    Camada de acesso a dados para empresas.

    Esta classe encapsula toda lógica de:
    - Consulta
    - Inserção
    - Atualização
    - Busca por similaridade simples
    - Controle de ambiguidade por nome

    Exemplo de uso básico:

        repo = CompanyRepository()

        company_id = repo.insert({
            "company_name": "XP Investimentos",
            "company_is_vendor": "NO"
        })

        empresa = repo.find_by_id(company_id)
    """

    def __init__(self):
        self.error_repo = ErrorRepository()

    # ==========================================================
    # PRIVATE: sync tbCompanyListName
    # ==========================================================
    def _upsert_company_list_name(
        self,
        cursor,
        company_id: int,
        company_name: str
    ) -> None:
        """
        Garante que o nome da empresa exista na tbCompanyListName.

        Regras:
        1) Se já existir registro com company_id + name → não faz nada.
        2) Busca slot VAGO (companylistname_name LIKE 'VAGO %') → UPDATE.
        3) Se não houver VAGO → INSERT.
        """
        # 1) Verifica se já existe
        cursor.execute(
            """
            SELECT companylistname_id
            FROM tbCompanyListName
            WHERE companylistname_company_id = %s
              AND companylistname_name = %s
            LIMIT 1
            """,
            (company_id, company_name),
        )
        if cursor.fetchone():
            return

        # 2) Busca VAGO
        cursor.execute(
            """
            SELECT MIN(companylistname_id) AS id
            FROM tbCompanyListName
            WHERE companylistname_name LIKE 'VAGO %'
            """
        )
        row = cursor.fetchone()
        vago_id = row[0] if row and row[0] else None

        if vago_id:
            cursor.execute(
                """
                UPDATE tbCompanyListName
                SET companylistname_company_id = %s,
                    companylistname_name = %s
                WHERE companylistname_id = %s
                """,
                (company_id, company_name, vago_id),
            )
        else:
            cursor.execute(
                """
                INSERT INTO tbCompanyListName
                    (companylistname_company_id, companylistname_name)
                VALUES (%s, %s)
                """,
                (company_id, company_name),
            )

    # ==========================================================
    # SELECT company_id baseado em dicionário
    # ==========================================================
    def find_ids_by(
        self,
        where: Dict[str, Any],
        as_df: bool = False
    ) -> Union[List[int], pd.DataFrame]:
        """
        Retorna company_id(s) baseado em um dicionário simples.

        A lógica aplica AND automático entre as chaves.

        Exemplo:

            repo.find_ids_by({
                "company_is_vendor": "YES",
                "company_vertical": "FINANCE"
            })

        Gera:
            WHERE company_is_vendor = %s
              AND company_vertical = %s
        """

        if not where:
            raise ValueError("WHERE é obrigatório.")

        where_clause = " AND ".join([f"{col} = %s" for col in where])
        values = tuple(where.values())

        query = f"""
            SELECT company_id
            FROM tbCompany
            WHERE {where_clause}
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=values)

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(query, values)
            return [row[0] for row in cursor.fetchall()]

        except Exception as e:
            self.error_repo.log_error(
                "CompanyRepository.find_ids_by",
                query,
                str(e),
                traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT completo por ID
    # ==========================================================
    def find_by_id(
        self,
        company_id: int,
        as_df: bool = False
    ) -> Union[Dict, pd.DataFrame, None]:
        """
        Retorna todos os campos de uma empresa pelo ID.

        Exemplo:

            empresa = repo.find_by_id(100)

        Retorno:
            dict ou DataFrame
        """

        query = """
            SELECT *
            FROM tbCompany
            WHERE company_id = %s
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=(company_id,))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (company_id,))
            return cursor.fetchone()

        except Exception as e:
            self.error_repo.log_error(
                "CompanyRepository.find_by_id",
                query,
                str(e),
                traceback.format_exc()
            )
            return None if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # SELECT com WHERE livre
    # ==========================================================
    def find_by_custom_where(
        self,
        where_clause: str,
        params: Optional[tuple] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Permite WHERE totalmente customizado.

        Suporta:
        - AND
        - OR
        - LIKE
        - IN
        - Subqueries

        Exemplo:

            repo.find_by_custom_where(
                "company_name LIKE %s OR company_vertical = %s",
                params=("%ITAU%", "FINANCE")
            )
        """

        if not where_clause:
            raise ValueError("WHERE clause é obrigatória.")

        query = f"""
            SELECT *
            FROM tbCompany
            WHERE {where_clause}
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=params)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "CompanyRepository.find_by_custom_where",
                query,
                str(e),
                traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # LISTAR VENDOR OU CLIENT
    # ==========================================================
    
    def list_companies_by_role(
        self,
        role: str,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:

        role = role.lower()

        if role not in ("vendor", "client"):
            raise ValueError("role deve ser 'vendor' ou 'client'.")

        if role == "vendor":
            query = """
                SELECT 
                    company_id AS vendor_id,
                    company_name AS vendor_name
                FROM tbCompany
                WHERE company_is_vendor = 'YES'
                ORDER BY company_name
            """
        else:
            query = """
                SELECT 
                    company_id AS client_id,
                    company_name AS client_name
                FROM tbCompany
                WHERE 
                    company_is_vendor = 'NO'
                    AND company_type <> 'PF'
                    AND company_name IS NOT NULL
                    AND company_name <> '-'
                    AND company_name <> ''
                    AND company_name NOT LIKE 'VAGO %'
                ORDER BY company_name
            """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="CompanyRepository.list_companies_by_role",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass


    # ==========================================================
    # INSERT com reaproveitamento de VAGO
    # ==========================================================
    def insert(self, data: Dict[str, Any]) -> int:
        """
        Insere nova empresa.

        Regras:
        1) Todos os campos string são convertidos para UPPERCASE.
        2) Antes de inserir, verifica se existe registro VAGO.
        3) Se existir VAGO → faz UPDATE nesse registro.
        4) Se não existir → faz INSERT.
        5) Sempre sincroniza tbCompanyListName.

        Exemplo:

            repo.insert({
                "company_name": "Itau SA",
                "company_is_vendor": "NO"
            })
        """

        if not data or "company_name" not in data:
            raise ValueError("company_name é obrigatório.")

        normalized_data = {
            k: (v.upper().strip() if isinstance(v, str) else v)
            for k, v in data.items()
        }

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            query_vago = """
                SELECT MIN(company_id)
                FROM tbCompany
                WHERE company_name LIKE 'VAGO %'
            """
            cursor.execute(query_vago)
            result = cursor.fetchone()
            vago_id = result[0] if result and result[0] else None

            if vago_id:
                set_clause = ", ".join([f"{col}=%s" for col in normalized_data])
                values = tuple(normalized_data.values())

                query_update = f"""
                    UPDATE tbCompany
                    SET {set_clause}
                    WHERE company_id=%s
                """

                cursor.execute(query_update, values + (vago_id,))
                company_id = vago_id

            else:
                columns = ", ".join(normalized_data.keys())
                placeholders = ", ".join(["%s"] * len(normalized_data))
                values = tuple(normalized_data.values())

                query_insert = f"""
                    INSERT INTO tbCompany ({columns})
                    VALUES ({placeholders})
                """

                cursor.execute(query_insert, values)
                company_id = cursor.lastrowid

            self._upsert_company_list_name(
                cursor,
                company_id,
                normalized_data["company_name"]
            )

            conn.commit()
            return company_id

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CompanyRepository.insert",
                "INSERT/UPDATE tbCompany + tbCompanyListName",
                str(e),
                traceback.format_exc()
            )
            raise

        finally:
            conn.close()

    # ==========================================================
    # UPDATE com WHERE livre
    # ==========================================================
    def update_with_custom_where(
        self,
        data: Dict[str, Any],
        where_clause: str,
        params: Optional[tuple] = None
    ) -> int:
        """
        Atualiza registros usando WHERE livre.

        Exemplo:

            repo.update_with_custom_where(
                {"company_vertical": "FINANCE"},
                "company_name LIKE %s",
                ("%ITAU%",)
            )
        """

        if not data or not where_clause:
            raise ValueError("Dados e WHERE são obrigatórios.")

        set_clause = ", ".join([f"{col}=%s" for col in data])
        values = tuple(data.values())

        query = f"""
            UPDATE tbCompany
            SET {set_clause}
            WHERE {where_clause}
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values + (params or ()))
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CompanyRepository.update_with_custom_where",
                query,
                str(e),
                traceback.format_exc()
            )
            raise

        finally:
            conn.close()

    # ==========================================================
    # Busca por parte do nome
    # ==========================================================
    def search_by_name(
        self,
        name_part: str,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Busca empresas na tbCompanyListName por substring.

        Exemplo:

            repo.search_by_name("ITAU")
        """

        query = """
            SELECT
                companylistname_company_id AS company_id,
                companylistname_name AS company_name
            FROM tbCompanyListName
            WHERE companylistname_name LIKE %s
        """

        param = (f"%{name_part}%",)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=param)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, param)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "CompanyRepository.search_by_name",
                query,
                str(e),
                traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and 'conn' in locals():
                cursor.close()
                conn.close()

    # ==========================================================
    # Busca company_id único por parte do nome
    # ==========================================================
    def find_unique_company_id_by_name(
        self,
        name_part: str
    ) -> int:
        """
        Retorna um único company_id se todas as variações
        encontradas apontarem para o mesmo ID.

        Se houver ambiguidade, retorna 0.

        Exemplo:

            repo.find_unique_company_id_by_name("ITAU")
        """

        query = """
            SELECT DISTINCT
                companylistname_company_id AS company_id
            FROM tbCompanyListName
            WHERE companylistname_name LIKE %s
        """

        param = (f"%{name_part}%",)

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, param)
            results = cursor.fetchall()

            if not results:
                return 0

            company_ids = {row[0] for row in results if row[0] is not None}

            if len(company_ids) == 1:
                return company_ids.pop()

            return 0

        except Exception as e:
            self.error_repo.log_error(
                "CompanyRepository.find_unique_company_id_by_name",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            cursor.close()
            conn.close()


    # ==========================================================
    # LISTA GERAL DE EMPRESAS PARA SELECT
    # ==========================================================
    def list_available_companies(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Retorna a lista geral de empresas válidas para componentes de seleção.

        Regras aplicadas:
        - company_name não pode ser nulo
        - company_name não pode ser vazio, '-'
        - company_name não pode ser 'UNIDENTIFIED'
        - company_name não pode começar com 'VAGO '
        - company_type não pode ser 'PF'

        Retorno:
        - as_df=False -> lista de dicionários com:
            [{"company_id": 1, "company_name": "EMPRESA X"}, ...]
        - as_df=True -> DataFrame com colunas:
            company_id, company_name

        Exemplo:
            repo = CompanyRepository()
            companies = repo.list_companies_for_select()
        """

        query = """
            SELECT
                company_id,
                company_name
            FROM tbCompany
            WHERE
                company_name IS NOT NULL
                AND company_name <> ''
                AND company_name <> ' '
                AND company_name <> '-'
                AND company_name <> 'UNIDENTIFIED'
                AND company_name NOT LIKE 'VAGO %'
                AND (company_type <> 'PF' OR company_type IS NULL)
            ORDER BY company_name
        """

        try:
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall() or []

        except Exception as e:
            self.error_repo.log_error(
                error_function="CompanyRepository.list_companies_for_select",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return pd.DataFrame() if as_df else []

        finally:
            if not as_df:
                try:
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
