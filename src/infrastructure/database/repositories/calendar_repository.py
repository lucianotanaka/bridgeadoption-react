from datetime import date
from typing import Optional
from src.infrastructure.database.connection import get_db_connection


class CalendarRepository:
    """
    Repository responsável por operações na tabela tbCalendar.
    """

    def insert(self, calendar_date: date) -> None:
        query = """
            INSERT INTO tbCalendar (calendar_date)
            VALUES (%s)
        """

        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Erro ao conectar ao banco de dados.")

        try:
            cursor = conn.cursor()
            cursor.execute(query, (calendar_date,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    def exists(self, calendar_date: date) -> bool:
        query = """
            SELECT COUNT(calendar_date) AS total
            FROM tbCalendar
            WHERE calendar_date = %s
        """

        conn = get_db_connection()
        if not conn:
            return False

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (calendar_date,))
            result = cursor.fetchone()
            return result["total"] > 0 if result else False
        finally:
            cursor.close()
            conn.close()

    def get_by_date(self, calendar_date: date) -> Optional[date]:
        query = """
            SELECT calendar_date
            FROM tbCalendar
            WHERE calendar_date = %s
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (calendar_date,))
            result = cursor.fetchone()
            return result["calendar_date"] if result else None
        finally:
            cursor.close()
            conn.close()

    def get_last_date(self) -> Optional[date]:
        query = """
            SELECT calendar_date
            FROM tbCalendar
            ORDER BY calendar_date DESC
            LIMIT 1
        """

        conn = get_db_connection()
        if not conn:
            return None

        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            result = cursor.fetchone()
            return result["calendar_date"] if result else None
        finally:
            cursor.close()
            conn.close()
