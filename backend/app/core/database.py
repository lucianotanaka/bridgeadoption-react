"""
Database connection module for Bridge Adoption API.
Mirrors the pattern from Z:/bridgeadoption/src/infrastructure/database/connection.py
using mysql-connector-python.
"""
import logging
import mysql.connector
from mysql.connector import Error

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_db_connection():
    """
    Returns a mysql.connector connection.
    Use for SELECT, INSERT, UPDATE, DELETE.
    """
    settings = get_settings()

    try:
        conn = mysql.connector.connect(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name,
            charset="utf8mb4",
            use_unicode=True,
        )
        return conn
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
