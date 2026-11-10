import os
import datetime
from fastapi import APIRouter
from app.core.database import get_connection
from app.core.verifier import resolve_verification_key_path
from app.core.config import GROQ_API_KEY

router = APIRouter(tags=["Health"])

@router.get("/api/health")
def get_health():
    db_ok = False
    try:
        conn = get_connection()
        conn.execute("SELECT 1")
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    vkey_found = resolve_verification_key_path() is not None
    groq_ready = bool(GROQ_API_KEY and not GROQ_API_KEY.startswith("gsk_your"))

    return {
        "status": "healthy" if db_ok else "degraded",
        "verificationKeyLoaded": vkey_found,
        "databaseConnected": db_ok,
        "groqAgentReady": groq_ready,
        "serverTime": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

