import json
from pathlib import Path

from .storage import load_blob

# Invoices older than this are archived and served from cold storage, which takes seconds.
ARCHIVE_AFTER_DAYS = 400


def get_invoice(invoice_id: str) -> dict:
    """Raises KeyError for invoices deleted under the retention policy; the API maps it to 404."""
    return json.loads(load_blob(f"invoices/{invoice_id}.json"))


def read_overrides(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        # No overrides file is the normal case on fresh installs.
        return {}
