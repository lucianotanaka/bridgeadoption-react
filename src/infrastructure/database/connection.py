try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False

import os
import mysql.connector
from mysql.connector import Error, pooling
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
import hashlib
import logging

# ---------------------------------------------------------
# Carregar variáveis de ambiente
# ---------------------------------------------------------
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# CONNECTION POOL (singleton) — reutiliza conexões TCP ao invés de criar/destruir
# pool_size=10 cobre bem cenários com múltiplos usuários simultâneos
# ---------------------------------------------------------
_connection_pool: "pooling.MySQLConnectionPool | None" = None


def _get_pool() -> pooling.MySQLConnectionPool:
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = pooling.MySQLConnectionPool(
                pool_name="bridge_streamlit_pool",
                pool_size=10,
                pool_reset_session=True,
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                charset="utf8mb4",
                use_unicode=True,
            )
            logging.info("MySQL connection pool criado (streamlit, pool_size=10)")
        except Error as e:
            logging.error(f"Erro ao criar pool MySQL: {e}")
            raise
    return _connection_pool


# ---------------------------------------------------------
# CONEXÃO MYSQL — usa pool (CRUD direto)
# ---------------------------------------------------------
def get_db_connection():
    """
    Retorna conexão do pool MySQL.
    Usar para SELECT, INSERT, UPDATE, DELETE.
    connection.close() devolve ao pool (não fecha fisicamente).
    """
    try:
        return _get_pool().get_connection()
    except Error as e:
        logging.error(f"erro_conexao_banco: {e}")
        raise


# ---------------------------------------------------------
# SQLALCHEMY ENGINE — singleton com pool (usar com pandas)
# ---------------------------------------------------------
_sqlalchemy_engine = None


def get_sqlalchemy_engine():
    """
    Retorna engine SQLAlchemy singleton.
    Seguro para senhas com caracteres especiais (@, #, :, /).
    """
    global _sqlalchemy_engine
    if _sqlalchemy_engine is None:
        try:
            url = URL.create(
                drivername="mysql+mysqlconnector",
                username=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=int(DB_PORT),
                database=DB_NAME,
            )
            _sqlalchemy_engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=1800,
                pool_size=5,
                max_overflow=10,
            )
            logging.info("SQLAlchemy engine singleton criado")
        except Exception as e:
            logging.error(f"erro_engine_sqlalchemy: {e}")
            raise
    return _sqlalchemy_engine


# ---------------------------------------------------------
# VERIFICAR CREDENCIAL
# ---------------------------------------------------------
def verify_credential(email: str, senha: str) -> bool:
    """
    Verifica credenciais do usuário.
    """
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        query = "SELECT user_password FROM tbUser WHERE user_email = %s"
        cursor.execute(query, (email,))
        result = cursor.fetchone()

        if result:
            hashed_senha_db = result[0]
            hashed_senha_digitada = hashlib.sha256(senha.encode()).hexdigest()
            return hashed_senha_digitada == hashed_senha_db

        return False

    except Error as e:
        logging.error(f"erro_query_usuario: {e}")
        return False

    finally:
        try:
            cursor.close()
            connection.close()  # devolve ao pool
        except Exception:
            pass
