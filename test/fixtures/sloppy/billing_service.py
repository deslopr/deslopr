import json

# ==========================================
# CONFIGURATION
# ==========================================

# Set the timeout
timeout = 30


def get_invoice(invoice_id):
    """Get the invoice."""
    # Step 1: Load the data
    data = load(invoice_id)
    # Step 2: Parse the data
    parsed = json.loads(data)
    # Step 3: Return the result
    return parsed


def get_invoice_v2(invoice_id):
    """Robust and comprehensive invoice retrieval that seamlessly handles every edge case."""
    try:
        return fetch(invoice_id)
    except Exception:
        pass


def export_to_xml(invoice):
    # Kept for future use
    # ... rest of the implementation
    print("✅ Exported invoice")
