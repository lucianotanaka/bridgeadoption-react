"""
Database connection module for Bridge Adoption API.
Uses MySQLConnectionPool (singleton) to reuse TCP connections instead of
creating/destroying a new connection on every query.
"""
import logging
import mysql.connector
from mysql.connector import Error, pooling

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Pool singleton — created once on first use
_connection_pool: "pooling.MySQLConnectionPool | None" = None


def _get_pool() -> pooling.MySQLConnectionPool:
    global _connection_pool
    if _connection_pool is None:
        settings = get_settings()
        try:
            _connection_pool = pooling.MySQLConnectionPool(
                pool_name="bridge_api_pool",
                pool_size=10,
                pool_reset_session=True,
                host=settings.db_host,
                port=settings.db_port,
                user=settings.db_user,
                password=settings.db_password,
                database=settings.db_name,
                charset="utf8mb4",
                use_unicode=True,
            )
            logger.info("MySQL connection pool criado (api, pool_size=10)")
        except Error as e:
            logger.error(f"Erro ao criar pool MySQL: {e}")
            raise
    return _connection_pool


def get_db_connection():
    """
    Returns a connection from the MySQL pool.
    Use for SELECT, INSERT, UPDATE, DELETE.
    Calling connection.close() returns it to the pool (does NOT close TCP socket).
    """
    try:
        return _get_pool().get_connection()
    except Error as e:
        logger.error(f"Database connection error: {e}")
        raise


def test_connection() -> bool:
    """Tests database connectivity. Used in health check."""
    try:
        conn = get_db_connection()
        conn.close()
        return True
    except Exception:
        return False
