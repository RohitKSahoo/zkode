from fastapi import APIRouter, HTTPException, status
from app.schemas.proof import VerifyProofRequest, VerifyProofResponse
from app.core.verifier import verify_proof_and_register

router = APIRouter(tags=["Verification"])

@router.post("/api/verify", response_model=VerifyProofResponse)
def post_verify_proof(req: VerifyProofRequest):
    """
    Zero-Knowledge Groth16 Proof Verification Endpoint.
    1. Enforces 60-second single-use challenge nonce lock (anti-replay).
    2. Reconstructs public signals server-side (never trusts client signals).
    3. Verifies BN128 pairing check.
    4. Commits nullifier atomically into SQLite registry to block Sybil claims.
    """
    result = verify_proof_and_register(
        proof=req.proof.model_dump(),
        client_nullifier=req.clientNullifier,
        service_scope_id=req.serviceScopeId,
        session_nonce=req.sessionNonce
    )

    if not result.get("verified"):
        status_code = status.HTTP_400_BAD_REQUEST
        return VerifyProofResponse(
            verified=False,
            nullifierHash=None,
            serviceScopeId=req.serviceScopeId,
            message="Verification rejected.",
            error=result.get("error", "Verification failed."),
            sybilBlocked=result.get("sybilBlocked", False),
            telemetry=result.get("telemetry", {})
        )

    return VerifyProofResponse(
        verified=True,
        nullifierHash=result.get("nullifierHash"),
        serviceScopeId=result.get("serviceScopeId"),
        message=result.get("message", "Proof verified."),
        sybilBlocked=False,
        telemetry=result.get("telemetry", {})
    )
