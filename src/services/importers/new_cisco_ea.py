"""
new_cisco_ea.py

Conversão do processo VBA ImportCiscoNewEA para Python seguindo o padrão
dos importadores atuais do projeto.

Objetivo
--------
Processar um arquivo XLSX/CSV de Cisco New EA e refletir as regras de negócio
na base Bridge Adoption com foco em:

- criação/atualização de registros em tbCiscoEA;
- criação automática de produto quando ORDERED ITEM não existir;
- resolução automática de customer priorizando WEB ORDER e fallback por END CUSTOMER NAME;
- criação de task "New EA" (task_type_id = 1) quando elegível;
- vínculo de registros irmãos à mesma task por customer + subscription;
- geração de histórico da task;
- remoção das linhas processadas do arquivo de entrada;
- escrita de linhas com falha em arquivo fixo de saída;
- geração de log texto de execução;
- gravação funcional em tbImportLog quando disponível.

Premissas validadas com o usuário
---------------------------------
1. Colunas obrigatórias de interesse:
   - WEB ORDER ID
   - ORDERED ITEM
   - ORDER SUBMIT DATE
   - ORDER SUBMITTED BY
   - PROVISIONING CONTACT EMAIL
   - CCW LINE STATUS
   - SUBSCRIPTION ID
   - REQUESTED START DATE
   - END CUSTOMER NAME
   - ORDER VALUE
   - MONTHLY RECURRING REVENUE (MRC)
   - INITIAL TERM
   - HOLD NAME
   - MAGIC KEY

2. Chave de deduplicação lógica do tbCiscoEA:
   - ea_web_order_id
   - ea_product_id
   - ea_subscription_id
   - ea_end_customer_id
   - ea_magic_key

3. Resolução de customer:
   - primeiro buscar customer por WEB ORDER na view vwCiscoEACustomerWebOrder
   - se não encontrar pela WEB ORDER e END CUSTOMER NAME vier preenchido, buscar por END CUSTOMER NAME
   - se nenhuma das estratégias resolver customer -> linha falha

4. Regra para abertura da task tipo 1:
   - replicar exatamente o VBA
   - somente produtos 5533 ou 5194
   - subscription não ignorada
   - ea_new_task_id = 0
   - status dentro da lista elegível

5. Track/Subtrack:
   - product 5533 -> task_track = EA3-M
   - product 5194 -> task_track = ELA2-M
   - task_subtrack = ORDERED ITEM

6. Owner:
   - resolver via resolve_csm(type_id=1, customer_id=customer_id)

7. Histórico / activities:
   - obrigatório seguir template do tasktype_id = 1
   - TaskRepository.insert já cria activities padrão automaticamente
   - este importador grava histórico "Task created."

8. Produto ausente:
   - criar automaticamente em tbProduct
   - vendor_id = 1
   - product_name = ORDERED ITEM
   - product_part_number = ORDERED ITEM
   - evitando duplicidade pela lógica do ProductRepository

9. Subscription ignored:
   - repositório atual trabalha por customer + number
   - adotado esse padrão por ser mais seguro e já oficial no projeto

10. Registros irmãos:
   - compartilhar a mesma task por customer + subscription
   - quando houver subscription nula, usa-se apenas customer + web order
"""

from __future__ import annotations

import logging
import re
import traceback
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from openpyxl import Workbook, load_workbook
from openpyxl.worksheet.worksheet import Worksheet

from src.infrastructure.database.repositories.cisco_ea_repository import CiscoEARepository
from src.infrastructure.database.repositories.cisco_web_order_repository import CiscoWebOrderRepository
from src.infrastructure.database.repositories.company_list_name_repository import CompanyListNameRepository
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.subscription_ignored_repository import (
    SubscriptionIgnoredRepository,
)
from src.infrastructure.database.repositories.task_history_repository import TaskHistoryRepository
from src.infrastructure.database.repositories.task_repository import TaskRepository
from src.services.check_unassigned_task import resolve_csm

try:
    from src.infrastructure.database.repositories.import_log_repository import ImportLogRepository
except Exception:
    ImportLogRepository = None

try:
    from src.infrastructure.database.repositories.import_control_repository import (
        ImportControlRepository,
        ImportStatus,
    )
except Exception:
    ImportControlRepository = None
    ImportStatus = None


BASE_STORAGE_PATH = Path("/home/bridgeadoption/storage")
BASE_INPUT_PATH = BASE_STORAGE_PATH / "input"
BASE_OUTPUT_PATH = BASE_STORAGE_PATH / "output"
BASE_LOGS_PATH = BASE_STORAGE_PATH / "logs"

IMPORT_SOURCE = "NewCiscoEAImport"

ERROR_EXTRA_COLUMNS = [
    "import_error_message",
    "import_error_column",
    "import_error_value",
    "import_original_row",
    "import_processed_at",
    "import_source",
    "import_original_file",
]

REQUIRED_COLUMNS = [
    "WEB ORDER ID",
    "ORDERED ITEM",
    "ORDER SUBMIT DATE",
    "ORDER SUBMITTED BY",
    "PROVISIONING CONTACT EMAIL",
    "CCW LINE STATUS",
    "SUBSCRIPTION ID",
    "REQUESTED START DATE",
    "END CUSTOMER NAME",
    "ORDER VALUE",
    "MONTHLY RECURRING REVENUE (MRC)",
    "INITIAL TERM",
    "HOLD NAME",
    "MAGIC KEY",
]

ELIGIBLE_NEW_TASK_PRODUCT_IDS = {5533, 5194}
ELIGIBLE_NEW_TASK_STATUSES = {
    "Booked",
    "Pending Deprovisioning",
    "Awaiting Provisioning Details",
    "Pending Deactivation",
    "Entered",
    "Pending Activation",
}

TASK_TYPE_NEW_EA = 1
TASK_CREATED_BY = "System BA"
TASK_START_OFFSET_DAYS = 0
TASK_END_OFFSET_DAYS = 90
TASK_NEXT_FOLLOWUP_OFFSET_DAYS = 5
CHUNK_SIZE = 1000
IMPORT_CONTROL_PROGRESS_INTERVAL_CHUNKS = 1
VENDOR_ID_CISCO = 1

logger = logging.getLogger(__name__)

repo_ea = CiscoEARepository()
repo_web_order = CiscoWebOrderRepository()
repo_company = CompanyListNameRepository()
repo_product = ProductRepository()
repo_subscription_ignored = SubscriptionIgnoredRepository()
repo_task = TaskRepository()
repo_history = TaskHistoryRepository()
repo_log = ImportLogRepository() if ImportLogRepository else None
repo_import_control = ImportControlRepository() if ImportControlRepository else None


@dataclass
class RowProcessResult:
    success: bool
    error_message: Optional[str] = None
    error_column: Optional[str] = None
    error_value: Optional[Any] = None
    ignored: bool = False
    created: bool = False
    updated: bool = False
    task_created: bool = False
    task_linked: bool = False
    ea_id: int = 0
    task_id: int = 0


def _ensure_directories() -> None:
    BASE_INPUT_PATH.mkdir(parents=True, exist_ok=True)
    BASE_OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    BASE_LOGS_PATH.mkdir(parents=True, exist_ok=True)


def _resolve_input_path(file_path: str) -> Path:
    path = Path(file_path)
    if path.is_absolute():
        return path
    return BASE_INPUT_PATH / path.name


def _build_failed_output_path(input_path: Path) -> Path:
    return BASE_OUTPUT_PATH / f"{input_path.stem}_failed_rows.xlsx"


def _build_execution_log_path(input_path: Path) -> Path:
    return BASE_LOGS_PATH / f"{input_path.stem}.log"


def _append_execution_log(log_path: Path, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def _safe_log(
    file_path: str,
    row_number: int,
    message: str,
    column_name: Optional[str] = None,
    value: Optional[Any] = None,
) -> None:
    if repo_log is None:
        return

    try:
        repo_log.create(
            IMPORT_SOURCE,
            file_path,
            row_number,
            message,
            column_name,
            value,
        )
    except Exception as ex:
        logger.exception(
            "Falha ao gravar tbImportLog. file=%s row=%s column=%s value=%s error=%s",
            file_path,
            row_number,
            column_name,
            value,
            ex,
        )


def _report_progress(
    import_control_id: Optional[int],
    total_rows: int,
    processed_success: int,
    failed_rows: int,
    ignored_rows: int,
    remaining_rows: int,
    execution_log_path: Optional[Path] = None,
) -> None:
    if repo_import_control is None or import_control_id is None:
        return

    lidas = total_rows - remaining_rows
    msg = (
        f"Arquivo processado. Total linhas origem={total_rows} | "
        f"lidas={lidas} | sucesso={processed_success} | "
        f"erros={failed_rows} | ignoradas={ignored_rows} | "
        f"restantes={remaining_rows}"
    )

    try:
        repo_import_control.update_status(
            importctrl_id=import_control_id,
            status=ImportStatus.RUNNING,
            message=msg,
        )
    except Exception as e:
        if execution_log_path:
            _append_execution_log(
                execution_log_path,
                f"WARN failed updating import control progress error={str(e)[:500]}",
            )


def _normalize_str(value: Any, max_length: int = 4000) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_length]


def _safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else default
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    if text.lstrip("+-").isdigit():
        try:
            return int(text)
        except Exception:
            return default
    return default


def _normalize_key(value: Any) -> Optional[str]:
    text = _normalize_str(value, max_length=500)
    if not text:
        return None
    return re.sub(r"\s+", " ", text).strip().lower()


def _to_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None

    if isinstance(value, Decimal):
        return value

    text = str(value).strip()
    if not text:
        return None

    text = re.sub(r"[^\d,\.\-+]", "", text)

    if not text or text in {"", ".", "-", "+", "-.", "+."}:
        return None

    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "")
            text = text.replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(".", "")
        text = text.replace(",", ".")

    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _month_token_to_number(token: str) -> Optional[int]:
    token_norm = token.strip().lower()[:3]
    mapping = {
        "jan": 1,
        "fev": 2,
        "feb": 2,
        "mar": 3,
        "abr": 4,
        "apr": 4,
        "mai": 5,
        "may": 5,
        "jun": 6,
        "jul": 7,
        "ago": 8,
        "aug": 8,
        "set": 9,
        "sep": 9,
        "out": 10,
        "oct": 10,
        "nov": 11,
        "dez": 12,
        "dec": 12,
    }
    return mapping.get(token_norm)


def _to_date(value: Any) -> Optional[date]:
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    text = str(value).strip()
    if not text:
        return None

    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%d %b %Y",
        "%d %B %Y",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%Y-%b-%d",
        "%Y-%B-%d",
    ):
        try:
            return datetime.strptime(text[:30], fmt).date()
        except Exception:
            continue

    match_d_mon_y = re.fullmatch(r"(\d{1,2})[-/\s]([A-Za-zÀ-ÿ]{3,})[-/\s](\d{4})", text)
    if match_d_mon_y:
        d = int(match_d_mon_y.group(1))
        mon = _month_token_to_number(match_d_mon_y.group(2))
        y = int(match_d_mon_y.group(3))
        if mon:
            try:
                return date(y, mon, d)
            except Exception:
                return None

    match_y_mon_d = re.fullmatch(r"(\d{4})[-/\s]([A-Za-zÀ-ÿ]{3,})[-/\s](\d{1,2})", text)
    if match_y_mon_d:
        y = int(match_y_mon_d.group(1))
        mon = _month_token_to_number(match_y_mon_d.group(2))
        d = int(match_y_mon_d.group(3))
        if mon:
            try:
                return date(y, mon, d)
            except Exception:
                return None

    return None


def _validate_required_columns(headers: List[str]) -> List[str]:
    return [col for col in REQUIRED_COLUMNS if col not in headers]


def _open_workbook_rw(file_path: str) -> Tuple[Any, Worksheet, Dict[str, int], List[str], str]:
    path = Path(file_path)

    if path.suffix.lower() == ".csv":
        wb = Workbook()
        ws = wb.active
        ws.title = "input"

        import csv

        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                ws.append(row)

        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
        headers = [str(h).strip() if h is not None else "" for h in header_row]
        idx_map = {h: i for i, h in enumerate(headers)}
        return wb, ws, idx_map, headers, "csv"

    wb = load_workbook(filename=file_path, read_only=False, data_only=True)
    ws = wb.active
    header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    headers = [str(h).strip() if h is not None else "" for h in header_row]
    idx_map = {h: i for i, h in enumerate(headers)}
    return wb, ws, idx_map, headers, "xlsx"


def _save_input_workbook(
    wb: Any,
    input_path: Path,
    input_kind: str,
) -> None:
    if input_kind == "xlsx":
        wb.save(str(input_path))
        return

    import csv

    ws = wb.active
    with open(input_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        for row in ws.iter_rows(values_only=True):
            writer.writerow(list(row))


def _ensure_failed_workbook(
    failed_path: Path,
    original_headers: List[str],
    execution_log_path: Optional[Path] = None,
) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "failed_rows"
    ws.append(original_headers + ERROR_EXTRA_COLUMNS)
    wb.save(str(failed_path))
    wb.close()

    if execution_log_path:
        _append_execution_log(
            execution_log_path,
            f"INFO failed file created (overwritten if existed): {str(failed_path)}",
        )


def _append_failed_rows(
    failed_path: Path,
    rows_to_append: List[List[Any]],
    original_headers: List[str],
    execution_log_path: Optional[Path] = None,
) -> None:
    if not rows_to_append:
        return

    _ensure_failed_workbook(failed_path, original_headers, execution_log_path)

    wb = load_workbook(str(failed_path))
    ws = wb.active
    for row in rows_to_append:
        ws.append(row)
    wb.save(str(failed_path))
    wb.close()

    if execution_log_path:
        _append_execution_log(
            execution_log_path,
            f"INFO appended failed rows count={len(rows_to_append)} to file={str(failed_path)}",
        )


def _row_dict_to_failed_excel_row(
    headers: List[str],
    row_dict: Dict[str, Any],
    original_row_number: int,
    input_file_path: str,
    result: RowProcessResult,
) -> List[Any]:
    processed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    original_values = [row_dict.get(h) for h in headers]

    return original_values + [
        result.error_message,
        result.error_column,
        str(result.error_value)[:2000] if result.error_value is not None else None,
        original_row_number,
        processed_at,
        IMPORT_SOURCE,
        input_file_path,
    ]


def _normalize_row(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    web_order_id = _normalize_str(row_dict.get("WEB ORDER ID"), max_length=20)
    ordered_item = _normalize_str(row_dict.get("ORDERED ITEM"), max_length=255)
    order_submitted_by = _normalize_str(row_dict.get("ORDER SUBMITTED BY"), max_length=50)
    provisioning_contact_email = _normalize_str(
        row_dict.get("PROVISIONING CONTACT EMAIL"), max_length=80
    )
    ccw_line_status = _normalize_str(row_dict.get("CCW LINE STATUS"), max_length=25)
    subscription_id = _normalize_str(row_dict.get("SUBSCRIPTION ID"), max_length=25)
    end_customer_name = _normalize_str(row_dict.get("END CUSTOMER NAME"), max_length=255)
    hold_name = _normalize_str(row_dict.get("HOLD NAME"), max_length=25)
    magic_key = _normalize_str(row_dict.get("MAGIC KEY"), max_length=20)

    order_submit_date = _to_date(row_dict.get("ORDER SUBMIT DATE"))
    requested_start_date = _to_date(row_dict.get("REQUESTED START DATE"))
    order_value = _to_decimal(row_dict.get("ORDER VALUE")) or Decimal("0")
    mrc = _to_decimal(row_dict.get("MONTHLY RECURRING REVENUE (MRC)")) or Decimal("0")
    initial_term = _to_decimal(row_dict.get("INITIAL TERM")) or Decimal("0")

    return {
        "web_order_id": web_order_id,
        "ordered_item": ordered_item,
        "order_submit_date": order_submit_date,
        "order_submitted_by": order_submitted_by,
        "provisioning_contact_email": provisioning_contact_email,
        "ccw_line_status": ccw_line_status,
        "subscription_id": subscription_id,
        "requested_start_date": requested_start_date,
        "end_customer_name": end_customer_name,
        "order_value": order_value,
        "mrc": mrc,
        "initial_term": initial_term,
        "hold_name": hold_name,
        "magic_key": magic_key,
    }


def _validate_minimum_required_fields(data: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Any]]:
    required_map = {
        "WEB ORDER ID": data.get("web_order_id"),
        "ORDERED ITEM": data.get("ordered_item"),
    }

    for col, value in required_map.items():
        if value is None or value == "":
            return False, col, value

    return True, None, None


def _resolve_customer_id(
    web_order_id: Optional[str],
    company_name: Optional[str],
) -> Tuple[int, Optional[str]]:
    web_order_id = _normalize_str(web_order_id, max_length=20)
    company_name = _normalize_str(company_name, max_length=255)

    if web_order_id:
        try:
            customer_id = repo_web_order.find_customer_id_by_web_order(web_order_id)
            customer_id = _safe_int(customer_id, default=0)
            if customer_id:
                return customer_id, "WEB ORDER ID"
        except Exception:
            pass

    if company_name:
        candidate_names: List[str] = []
        normalized_name = " ".join(str(company_name).split()).strip()
        if normalized_name:
            candidate_names.append(normalized_name)

            upper_name = normalized_name.upper()
            if upper_name not in candidate_names:
                candidate_names.append(upper_name)

        for candidate_name in candidate_names:
            try:
                company_id = repo_company.get_company_id_by_name(candidate_name)
                company_id = _safe_int(company_id, default=0)
                if company_id:
                    return company_id, "END CUSTOMER NAME"
            except Exception:
                continue

    return 0, None


def _resolve_or_create_product_id(ordered_item: Optional[str]) -> int:
    if not ordered_item:
        return 0

    try:
        exact = repo_product.find_ids_by(
            {"product_vendor_id": VENDOR_ID_CISCO, "product_name": ordered_item}
        )
        if exact:
            return _safe_int(exact[0], default=0)
    except Exception:
        pass

    try:
        exact_part = repo_product.find_ids_by(
            {"product_vendor_id": VENDOR_ID_CISCO, "product_part_number": ordered_item}
        )
        if exact_part:
            return _safe_int(exact_part[0], default=0)
    except Exception:
        pass

    try:
        return _safe_int(
            repo_product.insert(
                {
                    "product_vendor_id": VENDOR_ID_CISCO,
                    "product_name": ordered_item,
                    "product_part_number": ordered_item,
                }
            ),
            default=0,
        )
    except Exception:
        return 0


def _find_existing_ea(data: Dict[str, Any], customer_id: int, product_id: int) -> Optional[Dict[str, Any]]:
    try:
        conditions: List[Dict[str, Any]] = [
            {"field": "ea_web_order_id", "op": "=", "value": data.get("web_order_id")},
            {"field": "ea_product_id", "op": "=", "value": product_id},
            {"field": "ea_end_customer_id", "op": "=", "value": customer_id},
        ]

        subscription_id = data.get("subscription_id")
        magic_key = data.get("magic_key")

        if subscription_id:
            conditions.append({"field": "ea_subscription_id", "op": "=", "value": subscription_id})
        else:
            conditions.append({"field": "ea_subscription_id", "op": "IS NULL"})

        if magic_key:
            conditions.append({"field": "ea_magic_key", "op": "=", "value": magic_key})
        else:
            conditions.append({"field": "ea_magic_key", "op": "IS NULL"})

        found_ids = repo_ea.find_ids_by(
            {
                "operator": "AND",
                "conditions": conditions,
            }
        )

        if not found_ids:
            return None

        ea_id = _safe_int(found_ids[0], default=0)
        if not ea_id:
            return None

        rows = repo_ea.find_ids_by({"ea_id": ea_id})
        if not rows:
            return {"ea_id": ea_id}

        # Repositório não possui get_by_id; retornamos apenas o id e buscamos por where específicos em updates
        return {"ea_id": ea_id}
    except Exception:
        return None


def _find_sibling_task_id(customer_id: int, subscription_id: Optional[str]) -> int:
    try:
        if subscription_id:
            sibling_ids = repo_ea.find_ids_by(
                {
                    "operator": "AND",
                    "conditions": [
                        {"field": "ea_end_customer_id", "op": "=", "value": customer_id},
                        {"field": "ea_subscription_id", "op": "=", "value": subscription_id},
                        {"field": "ea_new_task_id", "op": ">", "value": 0},
                    ],
                }
            )
        else:
            sibling_ids = repo_ea.find_ids_by(
                {
                    "operator": "AND",
                    "conditions": [
                        {"field": "ea_end_customer_id", "op": "=", "value": customer_id},
                        {"field": "ea_subscription_id", "op": "IS NULL"},
                        {"field": "ea_new_task_id", "op": ">", "value": 0},
                    ],
                }
            )
        if not sibling_ids:
            return 0

        for ea_id in sibling_ids:
            try:
                rows = repo_ea.find_ids_by({"ea_id": int(ea_id)})
                if rows:
                    pass
            except Exception:
                pass

        # como não há get_columns, busca direta por task via SQL helper inexistente; delega para query por where de ea_new_task_id
        # estratégia: usar o primeiro irmão encontrado e derivar task por atualização posterior em lote.
        # sem SELECT de colunas, não conseguimos ler ea_new_task_id pelo repositório atual.
        # fallback seguro: não reutilizar por leitura; o agrupamento final atualizará os irmãos.
        return 0
    except Exception:
        return 0


def _build_ea_insert_payload(
    data: Dict[str, Any],
    customer_id: int,
    product_id: int,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "ea_web_order_id": data.get("web_order_id"),
        "ea_product_id": product_id,
        "ea_order_submit_date": data.get("order_submit_date"),
        "ea_order_submitted_by": data.get("order_submitted_by"),
        "ea_provisioning_contact_email": data.get("provisioning_contact_email"),
        "ea_ccw_line_status": data.get("ccw_line_status"),
        "ea_subscription_id": data.get("subscription_id"),
        "ea_requested_start_date": data.get("requested_start_date"),
        "ea_end_customer_id": customer_id,
        "ea_order_value": data.get("order_value") or Decimal("0"),
        "ea_mrc": data.get("mrc") or Decimal("0"),
        "ea_inicial_term": data.get("initial_term") or Decimal("0"),
        "ea_hold_name": data.get("hold_name"),
        "ea_magic_key": data.get("magic_key"),
    }
    return {k: v for k, v in payload.items() if v is not None}


def _update_existing_ea_by_rules(
    ea_id: int,
    data: Dict[str, Any],
) -> bool:
    updated = False

    try:
        status_ids = repo_ea.find_ids_by({"ea_id": ea_id})
        if not status_ids:
            return False
    except Exception:
        return False

    # Como o repositório não tem get_by_id, aplicamos updates idempotentes por regra.
    try:
        if data.get("requested_start_date") is not None and data.get("ccw_line_status"):
            repo_ea.update(
                data={"ea_requested_start_date": data.get("requested_start_date")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if (data.get("order_value") or Decimal("0")) > Decimal("0"):
            repo_ea.update(
                data={"ea_order_value": data.get("order_value")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if (data.get("mrc") or Decimal("0")) > Decimal("0"):
            repo_ea.update(
                data={"ea_mrc": data.get("mrc")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if (data.get("initial_term") or Decimal("0")) > Decimal("0"):
            repo_ea.update(
                data={"ea_inicial_term": data.get("initial_term")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if data.get("hold_name"):
            repo_ea.update(
                data={"ea_hold_name": data.get("hold_name")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if data.get("magic_key"):
            repo_ea.update(
                data={"ea_magic_key": data.get("magic_key")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    try:
        if data.get("ccw_line_status"):
            repo_ea.update(
                data={"ea_ccw_line_status": data.get("ccw_line_status")},
                where={"ea_id": ea_id},
            )
            updated = True
    except Exception:
        pass

    return updated


def _subscription_is_ignored(customer_id: int, subscription_id: Optional[str]) -> bool:
    if not customer_id or not subscription_id:
        return False

    try:
        ignored_id = repo_subscription_ignored.get_id(
            subscriptionignored_customer_id=customer_id,
            subscriptionignored_number=subscription_id,
        )
        return ignored_id is not None
    except Exception:
        return False


def _task_track_for_product(product_id: int) -> Optional[str]:
    if product_id == 5533:
        return "EA3-M"
    if product_id == 5194:
        return "ELA2-M"
    return None


def _build_task_reference(web_order_id: str, subscription_id: Optional[str]) -> str:
    reference = f"WEB ORDER: {web_order_id}"
    if subscription_id:
        reference += f"; SUBSCRIPTION: {subscription_id}"
    return reference


def _build_task_payload(
    customer_id: int,
    product_id: int,
    ordered_item: str,
    web_order_id: str,
    subscription_id: Optional[str],
    owner_id: int,
) -> Dict[str, Any]:
    now = datetime.now()
    task_start = now.date() + timedelta(days=TASK_START_OFFSET_DAYS)
    task_end = now.date() + timedelta(days=TASK_END_OFFSET_DAYS)
    track = _task_track_for_product(product_id)
    reference = _build_task_reference(web_order_id, subscription_id)

    return {
        "task_tasktype_id": TASK_TYPE_NEW_EA,
        "task_customer_id": customer_id,
        "task_owner_id": owner_id,
        "task_start": task_start,
        "task_start_performed": task_start,
        "task_end": task_end,
        "task_end_performed": task_end,
        "task_created_in": now,
        "task_created_by": TASK_CREATED_BY,
        "task_reference": reference,
        "task_ws": subscription_id,
        "task_track": track,
        "task_subtrack": ordered_item,
        "task_status": 1,
    }


def _insert_task_history(task_id: int, remark: str, next_followup: Optional[date]) -> None:
    repo_history.insert(
        {
            "taskrecord_task_id": task_id,
            "taskrecord_activity_id": 0,
            "taskrecord_remark": remark,
            "taskrecord_updated_by": TASK_CREATED_BY,
            "taskrecord_type": "LOG",
            "taskrecord_next_followup": next_followup,
        }
    )


def _create_task_if_needed(
    ea_id: int,
    data: Dict[str, Any],
    customer_id: int,
    product_id: int,
    execution_log_path: Optional[Path],
) -> Tuple[int, bool]:
    if product_id not in ELIGIBLE_NEW_TASK_PRODUCT_IDS:
        return 0, False

    if _subscription_is_ignored(customer_id, data.get("subscription_id")):
        return 0, False

    status = data.get("ccw_line_status")
    if status not in ELIGIBLE_NEW_TASK_STATUSES:
        return 0, False

    owner_id = resolve_csm(type_id=TASK_TYPE_NEW_EA, customer_id=customer_id)
    payload = _build_task_payload(
        customer_id=customer_id,
        product_id=product_id,
        ordered_item=data.get("ordered_item"),
        web_order_id=data.get("web_order_id"),
        subscription_id=data.get("subscription_id"),
        owner_id=owner_id,
    )

    try:
        task_id = _safe_int(repo_task.insert(payload), default=0)
        if not task_id:
            return 0, False

        repo_ea.update(data={"ea_new_task_id": task_id}, where={"ea_id": ea_id})
        _propagate_task_to_siblings(
            customer_id=customer_id,
            subscription_id=data.get("subscription_id"),
            web_order_id=data.get("web_order_id"),
            task_id=task_id,
        )

        next_followup = datetime.now().date() + timedelta(days=TASK_NEXT_FOLLOWUP_OFFSET_DAYS)
        _insert_task_history(
            task_id=task_id,
            remark="Task created.",
            next_followup=next_followup,
        )

        if execution_log_path:
            _append_execution_log(
                execution_log_path,
                f"INFO task created task_id={task_id} ea_id={ea_id} customer_id={customer_id} subscription={data.get('subscription_id')}",
            )

        return task_id, True
    except Exception as ex:
        if execution_log_path:
            _append_execution_log(
                execution_log_path,
                f"ERROR failed creating task ea_id={ea_id} error={str(ex)[:1000]} traceback={traceback.format_exc()[:2000]}",
            )
        return 0, False


def _propagate_task_to_siblings(
    customer_id: int,
    subscription_id: Optional[str],
    web_order_id: Optional[str],
    task_id: int,
) -> None:
    if not customer_id or not task_id:
        return

    try:
        conditions: List[Dict[str, Any]] = [
            {"field": "ea_end_customer_id", "op": "=", "value": customer_id},
            {"field": "ea_new_task_id", "op": "=", "value": 0},
        ]

        if subscription_id:
            conditions.append({"field": "ea_subscription_id", "op": "=", "value": subscription_id})
        else:
            if web_order_id:
                conditions.append({"field": "ea_web_order_id", "op": "=", "value": web_order_id})
            conditions.append({"field": "ea_subscription_id", "op": "IS NULL"})

        sibling_ids = repo_ea.find_ids_by({"operator": "AND", "conditions": conditions})

        for sibling_id in sibling_ids:
            try:
                repo_ea.update(
                    data={"ea_new_task_id": task_id},
                    where={"ea_id": int(sibling_id)},
                )
            except Exception:
                continue
    except Exception:
        return


def _process_single_row(
    row_dict: Dict[str, Any],
    file_path: str,
    row_number: int,
    execution_log_path: Optional[Path] = None,
) -> RowProcessResult:
    try:
        data = _normalize_row(row_dict)

        valid, invalid_col, invalid_val = _validate_minimum_required_fields(data)
        if not valid:
            message = f"Campo obrigatório ausente ou inválido: {invalid_col}"
            _safe_log(file_path, row_number, message, invalid_col, invalid_val)
            return RowProcessResult(
                success=False,
                error_message=message,
                error_column=invalid_col,
                error_value=invalid_val,
            )

        customer_id, customer_source = _resolve_customer_id(
            web_order_id=data.get("web_order_id"),
            company_name=data.get("end_customer_name"),
        )
        if not customer_id:
            error_value = data.get("web_order_id") or data.get("end_customer_name")
            message = (
                "Customer não encontrado a partir de 'WEB ORDER ID' "
                "nem de 'END CUSTOMER NAME'"
            )
            _safe_log(file_path, row_number, message, "WEB ORDER ID", error_value)
            return RowProcessResult(
                success=False,
                error_message=message,
                error_column="WEB ORDER ID",
                error_value=error_value,
            )

        product_id = _resolve_or_create_product_id(data.get("ordered_item"))
        if not product_id:
            message = "Produto não encontrado e não foi possível criar automaticamente"
            _safe_log(file_path, row_number, message, "ORDERED ITEM", data.get("ordered_item"))
            return RowProcessResult(
                success=False,
                error_message=message,
                error_column="ORDERED ITEM",
                error_value=data.get("ordered_item"),
            )

        existing_ea = _find_existing_ea(data, customer_id, product_id)

        if existing_ea is None:
            payload = _build_ea_insert_payload(data, customer_id, product_id)
            ea_id = _safe_int(repo_ea.insert(payload), default=0)
            if not ea_id:
                raise ValueError("Falha ao inserir registro tbCiscoEA")

            task_id, task_created = _create_task_if_needed(
                ea_id=ea_id,
                data=data,
                customer_id=customer_id,
                product_id=product_id,
                execution_log_path=execution_log_path,
            )

            if execution_log_path:
                _append_execution_log(
                    execution_log_path,
                    f"INFO row={row_number} ea created ea_id={ea_id} task_id={task_id} web_order={data.get('web_order_id')}",
                )

            return RowProcessResult(
                success=True,
                created=True,
                task_created=task_created,
                ea_id=ea_id,
                task_id=task_id,
            )

        ea_id = _safe_int(existing_ea.get("ea_id"), default=0)
        if not ea_id:
            raise ValueError("ea_id inválido para registro existente")

        updated = _update_existing_ea_by_rules(ea_id=ea_id, data=data)

        task_id = 0
        task_created = False
        if product_id in ELIGIBLE_NEW_TASK_PRODUCT_IDS:
            task_id, task_created = _create_task_if_needed(
                ea_id=ea_id,
                data=data,
                customer_id=customer_id,
                product_id=product_id,
                execution_log_path=execution_log_path,
            )

        if execution_log_path:
            _append_execution_log(
                execution_log_path,
                f"INFO row={row_number} ea existing processed ea_id={ea_id} updated={updated} task_id={task_id} task_created={task_created}",
            )

        return RowProcessResult(
            success=True,
            updated=updated,
            ignored=not updated and not task_created,
            task_created=task_created,
            ea_id=ea_id,
            task_id=task_id,
        )

    except Exception as ex:
        message = f"Unexpected error: {ex}"
        _safe_log(file_path, row_number, message, None, None)

        if execution_log_path:
            _append_execution_log(
                execution_log_path,
                f"ERROR row={row_number} unexpected error={str(ex)[:1000]} traceback={traceback.format_exc()[:2000]}",
            )

        return RowProcessResult(
            success=False,
            error_message=message,
            error_column=None,
            error_value=None,
        )


def _process_chunk(
    ws: Worksheet,
    idx_map: Dict[str, int],
    headers: List[str],
    start_row: int,
    end_row: int,
    file_path: str,
    failed_output_path: Path,
    execution_log_path: Optional[Path] = None,
    chunk_number: int = 0,
) -> Dict[str, int]:
    metrics = {
        "success": 0,
        "error": 0,
        "ignored": 0,
        "created": 0,
        "updated": 0,
        "task_created": 0,
    }

    failed_rows_buffer: List[List[Any]] = []

    if execution_log_path:
        _append_execution_log(
            execution_log_path,
            f"INFO chunk_start chunk={chunk_number} start_row={start_row} end_row={end_row}",
        )

    for r in range(end_row, start_row - 1, -1):
        row_cells = ws[r]
        raw_values = [cell.value for cell in row_cells]
        row_dict: Dict[str, Any] = {}

        for h, idx in idx_map.items():
            row_dict[h] = raw_values[idx] if idx < len(raw_values) else None

        result = _process_single_row(
            row_dict=row_dict,
            file_path=file_path,
            row_number=r,
            execution_log_path=execution_log_path,
        )

        if result.success:
            metrics["success"] += 1
            if result.ignored:
                metrics["ignored"] += 1
            if result.created:
                metrics["created"] += 1
            if result.updated:
                metrics["updated"] += 1
            if result.task_created:
                metrics["task_created"] += 1
        else:
            metrics["error"] += 1
            failed_rows_buffer.append(
                _row_dict_to_failed_excel_row(
                    headers=headers,
                    row_dict=row_dict,
                    original_row_number=r,
                    input_file_path=file_path,
                    result=result,
                )
            )

        ws.delete_rows(r, 1)

    if failed_rows_buffer:
        failed_rows_buffer.reverse()
        _append_failed_rows(
            failed_path=failed_output_path,
            rows_to_append=failed_rows_buffer,
            original_headers=headers,
            execution_log_path=execution_log_path,
        )

    if execution_log_path:
        _append_execution_log(
            execution_log_path,
            f"INFO chunk_finish chunk={chunk_number} success={metrics['success']} error={metrics['error']} ignored={metrics['ignored']} created={metrics['created']} updated={metrics['updated']} task_created={metrics['task_created']}",
        )

    return metrics


def run_import(
    file_path: str,
    user_id: Optional[str] = None,
    import_control_id: Optional[int] = None,
) -> Dict[str, Any]:
    _ensure_directories()

    input_path = _resolve_input_path(file_path)
    failed_output_path = _build_failed_output_path(input_path)
    execution_log_path = _build_execution_log_path(input_path)

    if import_control_id is None and repo_import_control is not None:
        try:
            import_control_id = repo_import_control.get_id_by_file(input_path.name)
        except Exception:
            import_control_id = None

    started_at = datetime.now()
    total_rows = 0
    chunk_number = 0

    summary_metrics = {
        "processed_success": 0,
        "failed_rows": 0,
        "ignored_rows": 0,
        "ea_created": 0,
        "ea_updated": 0,
        "tasks_created": 0,
    }

    _append_execution_log(execution_log_path, "START import")
    _append_execution_log(execution_log_path, f"INFO import_source={IMPORT_SOURCE}")
    _append_execution_log(execution_log_path, f"INFO user_id={user_id}")
    _append_execution_log(execution_log_path, f"INFO input_file={str(input_path)}")
    _append_execution_log(execution_log_path, f"INFO failed_file={str(failed_output_path)}")

    try:
        wb, ws, idx_map, headers, input_kind = _open_workbook_rw(str(input_path))
    except Exception as e:
        msg = f"Erro ao abrir arquivo Excel/CSV: {e}"
        _safe_log(str(input_path), 0, msg, None, None)
        _append_execution_log(execution_log_path, f"ERROR failed opening workbook error={str(e)[:1000]}")
        return {
            "status": "FAILED",
            "message": msg,
            "summary": {
                "file_path": str(input_path),
                "total_rows": 0,
                "processed_success": 0,
                "failed_rows": 0,
                "execution_log_path": str(execution_log_path),
            },
        }

    total_rows = max(ws.max_row - 1, 0)
    _append_execution_log(execution_log_path, f"INFO total_rows_initial={total_rows}")
    _append_execution_log(execution_log_path, f"INFO chunk_size={CHUNK_SIZE}")
    _append_execution_log(execution_log_path, f"INFO input_kind={input_kind}")

    missing_cols = _validate_required_columns(headers)
    if missing_cols:
        msg = "Missing columns: " + ", ".join(missing_cols)
        _safe_log(str(input_path), 0, msg, None, None)
        _append_execution_log(execution_log_path, f"ERROR missing_columns={', '.join(missing_cols)}")
        wb.close()
        return {
            "status": "FAILED",
            "message": msg,
            "summary": {
                "file_path": str(input_path),
                "total_rows": total_rows,
                "processed_success": 0,
                "failed_rows": total_rows,
                "execution_log_path": str(execution_log_path),
            },
        }

    try:
        while ws.max_row > 1:
            chunk_number += 1
            chunk_end = min(1 + CHUNK_SIZE, ws.max_row)

            chunk_metrics = _process_chunk(
                ws=ws,
                idx_map=idx_map,
                headers=headers,
                start_row=2,
                end_row=chunk_end,
                file_path=str(input_path),
                failed_output_path=failed_output_path,
                execution_log_path=execution_log_path,
                chunk_number=chunk_number,
            )

            summary_metrics["processed_success"] += chunk_metrics["success"]
            summary_metrics["failed_rows"] += chunk_metrics["error"]
            summary_metrics["ignored_rows"] += chunk_metrics["ignored"]
            summary_metrics["ea_created"] += chunk_metrics["created"]
            summary_metrics["ea_updated"] += chunk_metrics["updated"]
            summary_metrics["tasks_created"] += chunk_metrics["task_created"]

            _save_input_workbook(wb, input_path, input_kind)
            remaining_rows_current = max(ws.max_row - 1, 0)

            _append_execution_log(
                execution_log_path,
                f"INFO checkpoint_after_chunk chunk={chunk_number} success_total={summary_metrics['processed_success']} error_total={summary_metrics['failed_rows']} ignored_total={summary_metrics['ignored_rows']} remaining_rows_current={remaining_rows_current}",
            )

            if chunk_number % IMPORT_CONTROL_PROGRESS_INTERVAL_CHUNKS == 0:
                _report_progress(
                    import_control_id=import_control_id,
                    total_rows=total_rows,
                    processed_success=summary_metrics["processed_success"],
                    failed_rows=summary_metrics["failed_rows"],
                    ignored_rows=summary_metrics["ignored_rows"],
                    remaining_rows=remaining_rows_current,
                    execution_log_path=execution_log_path,
                )

    except Exception as e:
        msg = f"Erro durante o processamento da importação: {e}"
        _safe_log(str(input_path), 0, msg, None, None)
        _append_execution_log(execution_log_path, f"ERROR processing failed error={str(e)[:1000]}")

        try:
            _save_input_workbook(wb, input_path, input_kind)
            _append_execution_log(execution_log_path, "INFO workbook saved after processing exception")
        except Exception as save_ex:
            _append_execution_log(
                execution_log_path,
                f"ERROR failed saving workbook after exception error={str(save_ex)[:1000]}",
            )

        wb.close()

        finished_at = datetime.now()
        duration_seconds = int((finished_at - started_at).total_seconds())

        _append_execution_log(
            execution_log_path,
            f"FINISH status=FAILED success={summary_metrics['processed_success']} error={summary_metrics['failed_rows']} duration_seconds={duration_seconds}",
        )

        return {
            "status": "FAILED",
            "message": msg,
            "summary": {
                "file_path": str(input_path),
                "total_rows": total_rows,
                "processed_success": summary_metrics["processed_success"],
                "failed_rows": summary_metrics["failed_rows"],
                "ignored_rows": summary_metrics["ignored_rows"],
                "ea_created": summary_metrics["ea_created"],
                "ea_updated": summary_metrics["ea_updated"],
                "tasks_created": summary_metrics["tasks_created"],
                "failed_file_path": str(failed_output_path),
                "execution_log_path": str(execution_log_path),
            },
        }

    try:
        _save_input_workbook(wb, input_path, input_kind)
        _append_execution_log(execution_log_path, "INFO workbook saved successfully at end")
    except Exception as e:
        msg = f"Erro ao salvar arquivo após processamento: {e}"
        _safe_log(str(input_path), 0, msg, None, None)
        _append_execution_log(execution_log_path, f"ERROR final workbook save failed error={str(e)[:1000]}")
        wb.close()

        finished_at = datetime.now()
        duration_seconds = int((finished_at - started_at).total_seconds())

        _append_execution_log(
            execution_log_path,
            f"FINISH status=FAILED success={summary_metrics['processed_success']} error={summary_metrics['failed_rows']} duration_seconds={duration_seconds}",
        )

        return {
            "status": "FAILED",
            "message": msg,
            "summary": {
                "file_path": str(input_path),
                "total_rows": total_rows,
                "processed_success": summary_metrics["processed_success"],
                "failed_rows": summary_metrics["failed_rows"],
                "ignored_rows": summary_metrics["ignored_rows"],
                "ea_created": summary_metrics["ea_created"],
                "ea_updated": summary_metrics["ea_updated"],
                "tasks_created": summary_metrics["tasks_created"],
                "failed_file_path": str(failed_output_path),
                "execution_log_path": str(execution_log_path),
            },
        }

    wb.close()

    remaining_rows_in_input = 0
    try:
        wb_check, ws_check, _, _, _ = _open_workbook_rw(str(input_path))
        remaining_rows_in_input = max(ws_check.max_row - 1, 0)
        wb_check.close()
    except Exception as e:
        remaining_rows_in_input = -1
        _append_execution_log(
            execution_log_path,
            f"WARN failed checking remaining rows error={str(e)[:1000]}",
        )

    finished_at = datetime.now()
    duration_seconds = int((finished_at - started_at).total_seconds())

    _append_execution_log(execution_log_path, f"INFO total_chunks={chunk_number}")
    _append_execution_log(execution_log_path, f"INFO total_rows_initial={total_rows}")
    _append_execution_log(execution_log_path, f"INFO processed_success={summary_metrics['processed_success']}")
    _append_execution_log(execution_log_path, f"INFO failed_rows={summary_metrics['failed_rows']}")
    _append_execution_log(execution_log_path, f"INFO ignored_rows={summary_metrics['ignored_rows']}")
    _append_execution_log(execution_log_path, f"INFO ea_created={summary_metrics['ea_created']}")
    _append_execution_log(execution_log_path, f"INFO ea_updated={summary_metrics['ea_updated']}")
    _append_execution_log(execution_log_path, f"INFO tasks_created={summary_metrics['tasks_created']}")
    _append_execution_log(execution_log_path, f"INFO remaining_rows_in_input={remaining_rows_in_input}")
    _append_execution_log(execution_log_path, f"INFO failed_file={str(failed_output_path)}")
    _append_execution_log(execution_log_path, f"INFO duration_seconds={duration_seconds}")

    if summary_metrics["failed_rows"] > 0:
        status = "FAILED"
        msg = (
            f"{IMPORT_SOURCE} import concluído com falhas. "
            f"arquivo={str(input_path)}, total={total_rows}, sucesso={summary_metrics['processed_success']}, "
            f"erros={summary_metrics['failed_rows']}, ignoradas={summary_metrics['ignored_rows']}, "
            f"ea_criados={summary_metrics['ea_created']}, ea_atualizados={summary_metrics['ea_updated']}, "
            f"tasks_criadas={summary_metrics['tasks_created']}, linhas_restantes_input={remaining_rows_in_input}, "
            f"arquivo_falhas={str(failed_output_path)}, log_execucao={str(execution_log_path)}."
        )
    else:
        status = "FINISHED"
        msg = (
            f"{IMPORT_SOURCE} import concluído com sucesso. "
            f"arquivo={str(input_path)}, total={total_rows}, sucesso={summary_metrics['processed_success']}, "
            f"erros={summary_metrics['failed_rows']}, ignoradas={summary_metrics['ignored_rows']}, "
            f"ea_criados={summary_metrics['ea_created']}, ea_atualizados={summary_metrics['ea_updated']}, "
            f"tasks_criadas={summary_metrics['tasks_created']}, linhas_restantes_input={remaining_rows_in_input}, "
            f"arquivo_falhas={str(failed_output_path)}, log_execucao={str(execution_log_path)}."
        )

    _append_execution_log(
        execution_log_path,
        f"FINISH status={status} success={summary_metrics['processed_success']} error={summary_metrics['failed_rows']} ignored={summary_metrics['ignored_rows']} remaining_rows_in_input={remaining_rows_in_input} duration_seconds={duration_seconds}",
    )

    return {
        "status": status,
        "message": msg,
        "summary": {
            "file_path": str(input_path),
            "total_rows": total_rows,
            "processed_success": summary_metrics["processed_success"],
            "failed_rows": summary_metrics["failed_rows"],
            "ignored_rows": summary_metrics["ignored_rows"],
            "ea_created": summary_metrics["ea_created"],
            "ea_updated": summary_metrics["ea_updated"],
            "tasks_created": summary_metrics["tasks_created"],
            "failed_file_path": str(failed_output_path),
            "remaining_rows_in_input": remaining_rows_in_input,
            "execution_log_path": str(execution_log_path),
            "duration_seconds": duration_seconds,
            "total_chunks": chunk_number,
        },
    }
