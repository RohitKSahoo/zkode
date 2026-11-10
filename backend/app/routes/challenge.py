import time
import secrets
from fastapi import APIRouter, Query, HTTPException
from app.schemas.challenge import ChallengeResponse
from app.core.database import create_challenge_session

router = APIRouter(tags=["Challenge"])

@router.get("/api/challenge", response_model=ChallengeResponse)
def get_challenge(scope_id: str = Query(default="901", description="Campaign / Service Scope ID")):
    """
    Issues a single-use, 60-second challenge nonce bound to BN254 scalar field.
    Prevents proof replay attacks on the wire.
    """
    # 240-bit random entropy fits well within the 254-bit BN254 scalar field
    nonce = str(secrets.randbits(240))
    session_id = secrets.token_hex(16)
    expires_at = int(time.time() * 1000) + 60000  # 60s TTL

    success = create_challenge_session(
        session_id=session_id,
        session_nonce=nonce,
        service_scope_id=scope_id,
        expires_at_ms=expires_at
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to persist challenge session.")

    return ChallengeResponse(
        sessionId=session_id,
        sessionNonce=nonce,
        expiresAt=expires_at,
        ttlSeconds=60
    )
