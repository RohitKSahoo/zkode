from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.core.database import get_nullifier_ledger

router = APIRouter(tags=["Ledger"])

@router.get("/api/ledger")
def get_ledger(limit: int = Query(default=20, ge=1, le=100)):
    """
    Returns recent anonymous nullifier registrations for the public audit ledger.
    No citizen PII is exposed - only (nullifier_hash, service_scope_id, claimed_at).
    """
    records = get_nullifier_ledger(limit=limit)
    return {
        "success": True,
        "count": len(records),
        "ledger": records
    }

