"""
	Exemplos de uso
	1) Inserir Use Case
		repo = UseCaseRepository()

		uc_id = repo.insert_use_case({
			"uc_vendor_id": 10,
			"uc_use_case": "Zero Trust Implementation",
			"uc_updated_by": "admin"
		})
	
	2) Inserir Exit Criteria
		repo.insert_exit_criteria({
			"ucec_uc_id": uc_id,
			"ucec_name": "Security Baseline Configured",
			"ucec_seq": 1,
			"ucec_updated_by": "admin"
		})
	
	3) Buscar Use Cases
		use_cases = repo.select_use_case(company_id=10)
	
	4) Buscar Exit Criteria
		criteria = repo.select_exit_criteria([1, 2, 3])
		
	5) Atualizar Use Case
		repo = UseCaseRepository()

		repo.update_use_case(
			uc_id=10,
			data={
				"uc_use_case": "Zero Trust Architecture",
				"uc_updated_by": "admin"
			}
		)
	6) Atualizar Exit Criteria
		repo.update_exit_criteria(
			ucec_id=5,
			data={
				"ucec_name": "Baseline Security Applied",
				"ucec_updated_by": "admin"
			}
		)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

import pandas as pd

from src.infrastructure.database.repositories.base_repository import BaseRepository
from src.infrastructure.database.connection import get_db_connection


class UseCaseRepository(BaseRepository):

    # ==========================================================
    # INSERT tbUseCase
    # ==========================================================
    def insert_use_case(self, data: Dict[str, Any]) -> int:

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbUseCase ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # INSERT tbUseCaseExitCriteria
    # ==========================================================
    def insert_exit_criteria(self, data: Dict[str, Any]) -> int:

        if not data:
            raise ValueError("Dicionário de inserção não pode ser vazio.")

        if not data.get("ucec_uc_id"):
            raise ValueError("ucec_uc_id é obrigatório.")

        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = tuple(data.values())

        query = f"""
            INSERT INTO tbUseCaseExitCriteria ({columns})
            VALUES ({placeholders})
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # SELECT vwUseCase (baseado na função antiga)
    # ==========================================================
    def select_use_case(
        self,
        company_id: Optional[int] = None,
        use_case_id: Optional[int] = None,
        product_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:

        conditions = []
        params = []

        if use_case_id and use_case_id != 0:
            conditions.append("uc_id = %s")
            params.append(int(use_case_id))
        else:
            if company_id and company_id != 0:
                conditions.append("uc_vendor_id = %s")
                params.append(int(company_id))
            elif product_id and product_id != 0:
                conditions.append("uc_primary_product_id = %s")
                params.append(int(product_id))

        if not conditions:
            raise ValueError("Pelo menos um filtro deve ser informado.")

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT *
            FROM vwUseCase
            WHERE {where_clause}
            ORDER BY uc_use_case
        """

        return self._execute_raw(query, tuple(params))

    def select_use_case_df(
        self,
        company_id: Optional[int] = None,
        use_case_id: Optional[int] = None,
        product_id: Optional[int] = None
    ):
        conditions = []
        params = []

        if use_case_id and use_case_id != 0:
            conditions.append("uc_id = %s")
            params.append(int(use_case_id))
        else:
            if company_id and company_id != 0:
                conditions.append("uc_vendor_id = %s")
                params.append(int(company_id))
            elif product_id and product_id != 0:
                conditions.append("uc_primary_product_id = %s")
                params.append(int(product_id))

        if not conditions:
            raise ValueError("Pelo menos um filtro deve ser informado.")

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT *
            FROM vwUseCase
            WHERE {where_clause}
            ORDER BY uc_use_case
        """

        return self._execute_df(query, tuple(params))

    # ==========================================================
    # SELECT vwUseCaseExitCriteria
    # ==========================================================
    def select_exit_criteria(
        self,
        uc_id_list: List[int]
    ) -> List[Dict[str, Any]]:

        if not uc_id_list:
            return []

        placeholders = ", ".join(["%s"] * len(uc_id_list))

        query = f"""
            SELECT *
            FROM vwUseCaseExitCriteria
            WHERE ucec_uc_id IN ({placeholders})
            ORDER BY ucec_seq
        """

        return self._execute_raw(query, tuple(uc_id_list))

    def select_exit_criteria_df(
        self,
        uc_id_list: List[int]
    ):
        if not uc_id_list:
            import pandas as pd
            return pd.DataFrame()

        placeholders = ", ".join(["%s"] * len(uc_id_list))

        query = f"""
            SELECT *
            FROM vwUseCaseExitCriteria
            WHERE ucec_uc_id IN ({placeholders})
            ORDER BY ucec_seq
        """

        return self._execute_df(query, tuple(uc_id_list))

    # ==========================================================
    # UPDATE tbUseCase
    # ==========================================================
    def update_use_case(
        self,
        uc_id: int,
        data: Dict[str, Any]
    ) -> bool:

        if not uc_id:
            raise ValueError("uc_id é obrigatório.")

        if not data:
            raise ValueError("Nenhum campo informado para atualização.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        values = list(data.values())
        values.append(uc_id)

        query = f"""
            UPDATE tbUseCase
            SET {set_clause}
            WHERE uc_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, tuple(values))
            conn.commit()
            return cursor.rowcount > 0
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # UPDATE tbUseCaseExitCriteria
    # ==========================================================
    def update_exit_criteria(
        self,
        ucec_id: int,
        data: Dict[str, Any]
    ) -> bool:

        if not ucec_id:
            raise ValueError("ucec_id é obrigatório.")

        if not data:
            raise ValueError("Nenhum campo informado para atualização.")

        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        values = list(data.values())
        values.append(ucec_id)

        query = f"""
            UPDATE tbUseCaseExitCriteria
            SET {set_clause}
            WHERE ucec_id = %s
        """

        conn = get_db_connection()

        try:
            cursor = conn.cursor()
            cursor.execute(query, tuple(values))
            conn.commit()
            return cursor.rowcount > 0
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
            conn.close()

    # ==========================================================
    # Localizar Use Case Ids
    # ==========================================================
    def get_use_case_ids(
        self,
        vendor_id: Optional[int] = None,
        track: Optional[str] = None,
        subtrack: Optional[str] = None
    ) -> List[int]:
        """
        Retorna os IDs dos Use Cases associados ao vendor, track e,
        opcionalmente, subtrack informados.
        
        Quando vendor_id não for informado, utiliza o vendor padrão (ID 1).
        """
        
        if not track:
            return []

        conditions = []
        params = []

        if vendor_id is not None and vendor_id != 0:
            conditions.append("uc_vendor_id = %s")
            params.append(int(vendor_id))
        else:
            conditions.append("uc_vendor_id = 1")

        conditions.append("uc_track = %s")
        params.append(str(track))

        if subtrack:
            conditions.append("uc_use_case = %s")
            params.append(str(subtrack))

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT uc_id
            FROM tbUseCase
            WHERE {where_clause}
            ORDER BY uc_id
        """

        result = self._execute_raw(query, tuple(params))

        return [row["uc_id"] for row in result]
        
    # ==========================================================
    # Localizar Critério de Saída Ids
    # ==========================================================
    def get_use_case_exit_criteria_ids(
        self,
        vendor_id: Optional[int] = None,
        track: Optional[str] = None,
        subtrack: Optional[str] = None,
        name: Optional[str] = None,
    ) -> List[int]:
        """
        Retorna os IDs dos Critérios de Saída dos Casos de Uso associados ao vendor, 
        track, subtrack e nome informados.
        
        Quando vendor_id não for informado, utiliza o vendor padrão Cisco (ID 1).
        """
        
        if not track:
            return []

        conditions = []
        params = []

        if vendor_id is not None and vendor_id != 0:
            conditions.append("tb1.uc_vendor_id = %s")
            params.append(int(vendor_id))
        else:
            conditions.append("tb1.uc_vendor_id = 1")

        conditions.append("tb1.uc_track = %s")
        params.append(str(track))

        if subtrack:
            conditions.append("tb1.uc_use_case = %s")
            params.append(str(subtrack))
            
        if name:
            conditions.append("tb2.ucec_name = %s")
            params.append(str(name))

        where_clause = " AND ".join(conditions)

        query = f"""
            SELECT
                tb2.ucec_id AS ucec_id
            FROM tbUseCase tb1
            JOIN tbUseCaseExitCriteria tb2 ON
                tb2.ucec_uc_id = tb1.uc_id
            WHERE {where_clause}
            ORDER BY tb2.ucec_id
        """

        result = self._execute_raw(query, tuple(params))

        return [row["ucec_id"] for row in result]



    def get_use_case_exit_criteria_update_date(
        self,
        ucec_id: Optional[int] = None,
    ) -> Optional[datetime]:
        """
        Retorna a data de atualização do Critério de Saída informado.

        Retorna None quando o critério não for informado, não existir
        ou não possuir data de atualização.
        """

        if not ucec_id:
            return None

        query = """
            SELECT ucec_update_date
            FROM tbUseCaseExitCriteria
            WHERE ucec_id = %s
        """

        result = self._execute_df(query, (int(ucec_id),))

        if result.empty:
            return None

        update_date = result.iloc[0]["ucec_update_date"]

        if pd.isna(update_date):
            return None

        return pd.to_datetime(update_date).to_pydatetime()
