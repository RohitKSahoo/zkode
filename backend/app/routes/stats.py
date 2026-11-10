from fastapi import APIRouter
from app.core.database import get_system_stats

router = APIRouter(tags=["Stats & Telemetry"])

@router.get("/api/stats")
def get_stats():
    """
    Returns real-time cryptographic and security telemetry:
    - Total verified proofs
    - Total attacks blocked (Sybil, replay, tampering)
    - Active challenge sessions
    - Zero PII bytes exposed indicator
    """
    stats = get_system_stats()
    return {
        "success": True,
        "telemetry": stats
    }

