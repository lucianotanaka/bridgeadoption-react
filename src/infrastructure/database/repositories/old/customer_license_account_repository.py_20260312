"""
CustomerLicenseAccountRepository

Responsável por operações relacionadas a:

- tbCustomerLicenseAccount
- tbCustomerLicenseAccountAdmin

Objetivos:

1) Centralizar acesso às contas de licenciamento dos clientes.
2) Permitir listagens consolidadas com nome de vendor e customer.
3) Permitir inserção e atualização dinâmica baseada em dicionários.
4) Registrar erros estruturados via ErrorRepository.

Este repository não contém regra de negócio.
Ele apenas encapsula acesso e persistência de dados.
"""

from typing import Any, Dict, List, Optional, Union
import pandas as pd
import traceback

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository


class CustomerLicenseAccountRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()


    # ==========================================================
    # LISTAR CUSTOMER E VENDOR AGRUPADOS
    # ==========================================================
    def list_customer_vendor_summary(
        self,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Lista combinações distintas de Vendor e Customer
        existentes na tbCustomerLicenseAccount.

        A consulta retorna:

            - vendor_id
            - vendor_name
            - customer_id
            - customer_name

        Agrupado por vendor_id e customer_id.

        Uso típico:
            - Popular filtros (selectbox)
            - Construir relatórios consolidados
            - Identificar relacionamentos ativos

        Exemplo:

            repo = CustomerLicenseAccountRepository()

            dados = repo.list_customer_vendor_summary()

            df = repo.list_customer_vendor_summary(as_df=True)

        Retorno:
            Lista de dicionários ou DataFrame.
        """

        query = """
            SELECT
                a.vendor_id,
                v.company_name AS vendor_name,
                a.customer_id,
                c.company_name AS customer_name
            FROM tbCustomerLicenseAccount a
            JOIN tbCompany v ON
                v.company_id = a.vendor_id
            JOIN tbCompany c ON
                c.company_id = a.customer_id
            GROUP BY
                a.vendor_id,
                a.customer_id
            ORDER BY
                c.company_name
        """

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine())

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.list_customer_vendor_summary",
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
    # 1) LISTAR CONTAS (tbCustomerLicenseAccount)
    # ==========================================================
    def list_accounts(
        self,
        customer_id: int,
        vendor_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Lista contas de licenciamento de um cliente.

        Filtro obrigatório:
            customer_id

        Filtro opcional:
            vendor_id

        Exemplo:

            repo.list_accounts(customer_id=100)

            repo.list_accounts(customer_id=100, vendor_id=5)

        Retorno:
            Lista de dicionários ou DataFrame.
        """

        query = """
            SELECT
                a.vendor_id,
                v.company_name AS vendor_name,
                a.customer_id,
                c.company_name AS customer_name,
                a.account_name,
                a.account_domain,
                a.ntt_role,
                a.ntt_logs_in_by AS logs_in_by,
                a.remark
            FROM tbCustomerLicenseAccount a
            JOIN tbCompany v ON
                v.company_id = a.vendor_id
            JOIN tbCompany c ON
                c.company_id = a.customer_id
            WHERE a.customer_id = %s
        """

        params = [customer_id]

        if vendor_id is not None:
            query += " AND a.vendor_id = %s"
            params.append(vendor_id)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.list_accounts",
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
    # 2) LISTAR ADMINISTRADORES DAS CONTAS
    # ==========================================================
    def list_account_admins(
        self,
        customer_id: int,
        vendor_id: Optional[int] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Lista administradores das contas de licenciamento.

        Filtro obrigatório:
            customer_id

        Filtro opcional:
            vendor_id

        Exemplo:

            repo.list_account_admins(customer_id=100)

            repo.list_account_admins(customer_id=100, vendor_id=5)
        """

        query = """
            SELECT
                a.vendor_id,
                v.company_name AS vendor_name,
                a.customer_id,
                c.company_name AS customer_name,
                a.account_name,
                a.account_domain,
                ua.admin_user_id,
                ua.admin_role,
                ua.remark
            FROM tbCustomerLicenseAccountAdmin ua
            JOIN tbCustomerLicenseAccount a ON
                a.account_id = ua.admin_account_id
            JOIN tbCompany v ON
                v.company_id = a.vendor_id
            JOIN tbCompany c ON
                c.company_id = a.customer_id
            WHERE a.customer_id = %s
        """

        params = [customer_id]

        if vendor_id is not None:
            query += " AND a.vendor_id = %s"
            params.append(vendor_id)

        try:
            if as_df:
                return pd.read_sql(query, get_sqlalchemy_engine(), params=tuple(params))

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.list_account_admins",
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
    # 3) INSERT tbCustomerLicenseAccount
    # ==========================================================
    def insert_account(self, data: Dict[str, Any]) -> int:
        """
        Insere nova conta de licenciamento.

        Exemplo:

            repo.insert_account({
                "vendor_id": 5,
                "customer_id": 100,
                "account_domain": "customer.onmicrosoft.com",
                "account_enabled": 1
            })

        Retorna:
            account_id ou 0 em caso de erro.
        """

        if not data:
            raise ValueError("Dados são obrigatórios.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCustomerLicenseAccount ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.insert_account",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()

    # ==========================================================
    # 4) INSERT tbCustomerLicenseAccountAdmin
    # ==========================================================
    def insert_account_admin(self, data: Dict[str, Any]) -> int:
        """
        Insere novo administrador para conta.

        Exemplo:

            repo.insert_account_admin({
                "admin_account_id": 10,
                "admin_user_id": 50,
                "admin_role": "GLOBAL_ADMIN",
                "admin_enabled": 1
            })

        Retorna:
            admin_id ou 0 em caso de erro.
        """

        if not data:
            raise ValueError("Dados são obrigatórios.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbCustomerLicenseAccountAdmin ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.insert_account_admin",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()

    # ==========================================================
    # 5) UPDATE tbCustomerLicenseAccount
    # ==========================================================
    def update_account(
        self,
        account_id: int,
        data: Dict[str, Any]
    ) -> int:
        """
        Atualiza conta com base no account_id.

        Exemplo:

            repo.update_account(
                account_id=10,
                data={"account_enabled": 0}
            )

        Retorna:
            Número de linhas afetadas.
        """

        if not data:
            raise ValueError("Dados são obrigatórios.")

        set_clause = ", ".join([f"{col}=%s" for col in data])
        values = tuple(data.values())

        query = f"""
            UPDATE tbCustomerLicenseAccount
            SET {set_clause}
            WHERE account_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values + (account_id,))
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.update_account",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()

    # ==========================================================
    # 6) UPDATE tbCustomerLicenseAccountAdmin
    # ==========================================================
    def update_account_admin(
        self,
        admin_id: int,
        data: Dict[str, Any]
    ) -> int:
        """
        Atualiza administrador com base no admin_id.

        Exemplo:

            repo.update_account_admin(
                admin_id=20,
                data={"admin_enabled": 0}
            )
        """

        if not data:
            raise ValueError("Dados são obrigatórios.")

        set_clause = ", ".join([f"{col}=%s" for col in data])
        values = tuple(data.values())

        query = f"""
            UPDATE tbCustomerLicenseAccountAdmin
            SET {set_clause}
            WHERE admin_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values + (admin_id,))
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "CustomerLicenseAccountRepository.update_account_admin",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0

        finally:
            conn.close()
