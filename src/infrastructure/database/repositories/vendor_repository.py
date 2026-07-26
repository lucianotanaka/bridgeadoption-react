"""
    Exemplo de uso
        repo = VendorRepository()
        vendors = repo.find_all()
    
    Retorno
        [
            {"vendor_id": 1, "vendor_name": "Cisco"},
            ...
        ]
"""

from typing import Optional
from src.infrastructure.database.repositories.base_repository import BaseRepository


class VendorRepository(BaseRepository):

    # -----------------------------------------
    # RAW
    # -----------------------------------------
    def find_all(self):
        query = """
            SELECT vendor_id, vendor_name
            FROM vwFilterVendor
        """
        result = self._execute_raw(query)
        print("DEBUG:", result)
        return result

    # -----------------------------------------
    # DATAFRAME
    # -----------------------------------------
    def find_all_df(self):
        query = """
            SELECT vendor_id, vendor_name
            FROM vwFilterVendor
        """
        return self._execute_df(query)

    # -----------------------------------------
    # LIKE automático (%name%)
    # -----------------------------------------
    def find_id_by_name_like(self, vendor_name: str) -> Optional[int]:

        if not vendor_name or not vendor_name.strip():
            return None

        pattern = f"%{vendor_name.strip()}%"

        query = """
            SELECT vendor_id
            FROM vwFilterVendor
            WHERE vendor_name LIKE %s
            LIMIT 1
        """

        result = self._execute_raw(query, (pattern,))
        return result[0]["vendor_id"] if result else None
