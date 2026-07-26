from dotenv import load_dotenv
import os
import mysql.connector
from mysql.connector import Error
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

# ---------------------------------------------------------
# CONEXÃO MYSQL (CRUD direto)
# ---------------------------------------------------------
def get_db_connection():
    """
    Retorna conexão mysql.connector
    Usar para INSERT, UPDATE, DELETE.
    """
    try:
        return mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
        )
    except Error as e:
        logging.error(f"erro_conexao_banco: {e}")
        raise


# ---------------------------------------------------------
# SQLALCHEMY ENGINE (usar com pandas)
# ---------------------------------------------------------
def get_sqlalchemy_engine():
    """
    Retorna engine SQLAlchemy.
    Seguro para senhas com caracteres especiais (@, #, :, /).
    """

    try:
        url = URL.create(
            drivername="mysql+mysqlconnector",
            username=DB_USER,
            password=DB_PASSWORD,  # pode conter @ sem problema
            host=DB_HOST,
            port=int(DB_PORT),
            database=DB_NAME,
        )

        engine = create_engine(
            url,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        return engine

    except Exception as e:
        logging.error(f"erro_engine_sqlalchemy: {e}")
        raise


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
            connection.close()
        except Exception:
            pass
