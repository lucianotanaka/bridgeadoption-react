"""
    Exemplo de uso
    1) Criar usuário
    from src.infrastructure.database.repositories.user_repository import UserRepository

    repo = UserRepository()

    new_user_id = repo.insert({
        "user_name": "jdoe",
        "user_full_name": "John Doe",
        "user_email": "jdoe@email.com",
        "user_password": "SenhaForte123",
        "user_admin": 0,
        "user_manager": 0,
        "user_language": "en-US"
    })

    print("Novo usuário ID:", new_user_id)

    2) Atualizar usuário pelo ID
    repo.update(
    user_id=10,
    data={
        "user_full_name": "John A. Doe",
        "user_language": "pt-BR"
        }
    )

    3) Atualizar usuário pelo user_name
    repo.update(
        user_name="jdoe",
        data={
            "user_manager": 1
        }
    )

    4) Listar usuários (para selectbox)
    users = repo.list_users()

    # Exemplo para Streamlit
    import streamlit as st

    user_options = {u["user_name"]: u["user_id"] for u in users}

    selected_user = st.selectbox(
        "Selecione o usuário",
        options=list(user_options.keys())
    )

    selected_user_id = user_options[selected_user]

    5) Buscar usuário por ID
    user = repo.get_by_id(10)

    if user:
        print(user["user_email"])

    6) Login (bcrypt + migração automática)
    user_id, user_admin, user_type, user_language, user_change_passwd, user_manager = \
        repo.login("jdoe@email.com", "SenhaForte123")

    if user_id == 0:
        print("Login inválido")
    else:
        print("Login realizado com sucesso!")
        print("Admin:", user_admin)

    7) Alterar senha
    success = repo.change_passwd(10, "NovaSenhaSuperForte456")

    if success:
        print("Senha alterada com sucesso.")
    else:
        print("Erro ao alterar senha.")

    8) Criar usuário sem acesso ao sistema (senha NULL)
    repo.insert({
        "user_name": "externo",
        "user_full_name": "Usuário Externo",
        "user_email": "externo@email.com"
    })

    9) Fluxo real de login em aplicação
    def authenticate(email, password):
        repo = UserRepository()

        result = repo.login(email, password)

        if result[0] == 0:
            return False

        return True


"""

from typing import Any, Dict, List, Optional, Tuple, Union

import bcrypt
import hashlib
import traceback

import pandas as pd

from src.infrastructure.database.connection import (
    get_db_connection,
    get_sqlalchemy_engine,
)
from src.infrastructure.database.repositories.error_repository import ErrorRepository

class UserRepository:

    def __init__(self):
        self.error_repo = ErrorRepository()

    # =========================================================
    # INSERT (user_company_id sempre = 0)
    # =========================================================
    def insert(self, data: Dict[str, Any]) -> int:

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            data["user_company_id"] = 0

            # Se vier senha no dicionário → criptografa com bcrypt
            if "user_password" in data and data["user_password"]:
                data["user_password"] = self._hash_password(data["user_password"])

            columns = ", ".join(data.keys())
            placeholders = ", ".join(["%s"] * len(data))
            values = tuple(data.values())

            query = f"""
                INSERT INTO tbUser ({columns})
                VALUES ({placeholders})
            """

            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "UserRepository.insert",
                "INSERT tbUser",
                str(e),
                traceback.format_exc()
            )
            raise

        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # UPDATE
    # =========================================================
    def update(
        self,
        data: Dict[str, Any],
        user_id: Optional[int] = None,
        user_name: Optional[str] = None
    ) -> int:

        if not data:
            raise ValueError("Dicionário de atualização vazio.")

        if not user_id and not user_name:
            raise ValueError("Informe user_id ou user_name.")

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            if "user_password" in data and data["user_password"]:
                data["user_password"] = self._hash_password(data["user_password"])

            set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
            values = list(data.values())

            if user_id:
                where_clause = "user_id = %s"
                values.append(user_id)
            else:
                where_clause = "user_name = %s"
                values.append(user_name)

            query = f"""
                UPDATE tbUser
                SET {set_clause}
                WHERE {where_clause}
            """

            cursor.execute(query, tuple(values))
            conn.commit()
            return cursor.rowcount

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "UserRepository.update",
                "UPDATE tbUser",
                str(e),
                traceback.format_exc()
            )
            raise

        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # LIST USERS (para selectbox)
    # =========================================================
    def list_users(self) -> List[Dict[str, Any]]:

        query = """
            SELECT user_id, user_name
            FROM tbUser
            ORDER BY user_name
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # GET BY ID
    # =========================================================
    def get_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:

        query = "SELECT * FROM tbUser WHERE user_id = %s"

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (user_id,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # LOGIN (bcrypt + migração automática)
    # =========================================================
    def login(
        self, email: str, password: str
    ) -> Tuple[int, int, Optional[str], Optional[str], int, int]:

        query = """
            SELECT
                user_id,
                user_name,
                user_email,
                user_language,
                user_change_passwd,
                user_password
            FROM tbUser
            WHERE user_email = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, (email,))
            result = cursor.fetchone()

            if not result:
                return 0, 0, None, None, 0, 0

            (
                user_id,
                user_name,
                user_email,
                user_language,
                user_change_passwd,
                stored_password,
            ) = result

            # Bloqueia usuário sem senha
            if not stored_password:
                return 0, 0, None, None, 0, 0

            # Se já for bcrypt
            if stored_password.startswith("$2"):
                if not bcrypt.checkpw(password.encode(), stored_password.encode()):
                    return 0, 0, None, None, 0, 0

            # Se for SHA256 antigo (64 hex chars)
            elif len(stored_password) == 64:
                sha256_input = hashlib.sha256(password.encode()).hexdigest()

                if sha256_input != stored_password:
                    return 0, 0, None, None, 0, 0

                # Migração automática para bcrypt
                new_hash = self._hash_password(password)
                self._update_password_hash(user_id, new_hash)

            else:
                return 0, 0, None, None, 0, 0

            return (
                user_id,
                user_name,
                user_email,
                user_language,
                user_change_passwd,
            )

        except Exception as e:
            self.error_repo.log_error(
                "UserRepository.login",
                query,
                str(e),
                traceback.format_exc()
            )
            return 0, 0, None, None, 0, 0

        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # CHANGE PASSWORD
    # =========================================================
    def change_passwd(self, user_id: int, new_passwd: str) -> bool:

        conn = get_db_connection()

        try:
            cursor = conn.cursor()

            new_hash = self._hash_password(new_passwd)

            query = """
                UPDATE tbUser
                SET user_password = %s,
                    user_change_passwd = 0
                WHERE user_id = %s
            """

            cursor.execute(query, (new_hash, user_id))
            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            self.error_repo.log_error(
                "UserRepository.change_passwd",
                "UPDATE tbUser password",
                str(e),
                traceback.format_exc()
            )
            return False

        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # SEARCH USERS
    # =========================================================

    def search_users(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None
    ):
        """
        Busca usuários com user_company_id = 0
        Pode filtrar por parte do nome ou email.
        """

        query = """
            SELECT user_id, user_name, user_email
            FROM tbUser
            WHERE user_company_id = 0
        """

        params = []

        if name:
            query += " AND user_name LIKE %s"
            params.append(f"%{name}%")

        if email:
            query += " AND user_email LIKE %s"
            params.append(f"%{email}%")

        query += " ORDER BY user_name"

        conn = get_db_connection()

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    # =========================================================
    # GET USERS
    # =========================================================

    def get_users_by_company(
        self,
        company_id: Optional[int] = None,
        company_name: Optional[str] = None,
        as_df: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        Busca usuários por empresa.

        Parâmetros:
            company_id: ID da empresa
            company_name: Nome parcial da empresa
            as_df: Se True retorna DataFrame, senão retorna List[Dict]
            
        Retornar lista de dicionários (padrão):
        users = repo.get_users_by_company(company_id=10)
        
        Retornar DataFrame
        df = repo.get_users_by_company(company_id=10, as_df=True)
        
        """

        query = "SELECT * FROM vwUser"
        params = []
        conditions = []

        if company_id is not None:
            conditions.append("user_company_id = %s")
            params.append(int(company_id))

        elif company_name:
            conditions.append("user_company_name LIKE %s")
            params.append(f"%{company_name}%")

        else:
            return pd.DataFrame() if as_df else []

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY user_name"

        conn = get_db_connection()

        try:
            if as_df:
                return pd.read_sql(query, conn, params=params)
            else:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, tuple(params))
                return cursor.fetchall()
        finally:
            conn.close()
            

    def get_users_by_squad(
        self,
        department_id: Optional[int] = None,
        user_id_str: Optional[str] = None,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:

        query = "SELECT * FROM vwSquad"
        conditions = []
        params: List[Any] = []

        # ------------------------------------------------------
        # Filtro por departamento
        # ------------------------------------------------------
        if department_id is not None and department_id != 0:
            conditions.append("squad_department_id = %s")
            params.append(int(department_id))

        # ------------------------------------------------------
        # Filtro por lista de usuários (CSV)
        # ------------------------------------------------------
        if user_id_str:

            user_ids: List[int] = []

            for id_str in user_id_str.split(","):
                stripped = id_str.strip()
                if stripped.isdigit():
                    user_ids.append(int(stripped))

            # Só adiciona filtro se houver IDs válidos
            if user_ids:
                placeholders = ", ".join(["%s"] * len(user_ids))
                conditions.append(f"squad_user_id IN ({placeholders})")
                params.extend(user_ids)

        # ------------------------------------------------------
        # Montar WHERE
        # ------------------------------------------------------
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY squad_user_name"

        # ------------------------------------------------------
        # Execução segura
        # ------------------------------------------------------
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()

            if as_df:
                return pd.DataFrame(rows)

            return rows

        except Exception as e:
            self.error_repo.log_error(
                error_function="UserRepository.get_users_by_squad",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if 'conn' in locals():
                cursor.close()
                conn.close()


    
    # =========================================================
    # MÉTODOS INTERNOS
    # =========================================================
    def _hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _update_password_hash(self, user_id: int, new_hash: str):

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE tbUser SET user_password = %s WHERE user_id = %s",
                (new_hash, user_id)
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()


    # ==========================================================
    # CSM ACCOUNT (VIEW vwAccountTeamCSM)
    # ==========================================================
    def load_csm_account(
        self,
        as_df: bool = False
    ) -> Union[List[Dict[str, Any]], pd.DataFrame]:
        """
        Retorna registros da view vwAccountTeamCSM.

        Uso típico:
            - Relacionamento entre CSM e contas
            - Dashboards de carteira
            - Distribuição de contas por responsável

        Parâmetros:
            as_df (bool):
                True  → retorna pandas.DataFrame
                False → retorna List[Dict]

        Retorno:
            List[Dict[str, Any]] ou pandas.DataFrame.

        Tratamento de erro:
            - Registra erro via ErrorRepository
            - Retorna lista vazia ou DataFrame vazio
        """

        query = """
            SELECT *
            FROM vwAccountTeamCSM
        """

        try:
            # Retorno como DataFrame (ideal para análises)
            if as_df:
                engine = get_sqlalchemy_engine()
                return pd.read_sql(query, engine)

            # Retorno como lista de dicionários
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            return cursor.fetchall()

        except Exception as e:
            self.error_repo.log_error(
                error_function="UserRepository.load_csm_account",
                error_command=query,
                error_description=str(e),
                error_traceback=traceback.format_exc()
            )
            return [] if not as_df else pd.DataFrame()

        finally:
            if not as_df and "conn" in locals():
                cursor.close()
                conn.close()