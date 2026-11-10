import secrets
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db, get_connection
from app.schemas.policy import (
    CompilePolicyRequest,
    CompiledPolicyResponse,
    ChallengeResponse,
    VerifyProofRequest,
    VerifyProofResponse
)
from app.agents.policy_compiler import compile_policy
from app.agents.proof_auditor import verify_and_audit

app = FastAPI(title="zkode Backend", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory active policy cache (initialized with default scholarship criteria)
ACTIVE_POLICIES = {
    "901": {
        "currentTimestamp": "20261110",
        "maxBirthTimestamp": "20081110",
        "minBalanceRequired": "50000",
        "maxIncomeAllowed": "800000",
        "minScoreRequired": "800",
    }
}

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "healthy", "service": "zkode-backend", "engine": "Groth16/BN254"}

@app.get("/api/challenge", response_model=ChallengeResponse)
def get_challenge(scope_id: str = "901"):
    # Generate 240-bit finite field friendly decimal nonce
    nonce = str(secrets.randbits(240))
    session_id = secrets.token_hex(16)
    expires_at = int(time.time() * 1000) + 60000

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO challenge_sessions (session_id, session_nonce, service_scope_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, nonce, scope_id, int(time.time() * 1000), expires_at)
    )
    conn.commit()
    conn.close()

    return ChallengeResponse(
        sessionId=session_id,
        sessionNonce=nonce,
        expiresAt=expires_at,
        ttlSeconds=60
    )

@app.post("/api/policy/compile", response_model=CompiledPolicyResponse)
def post_compile_policy(req: CompilePolicyRequest):
    try:
        compiled = compile_policy(req.prompt, req.service_scope_id)
        # Cache active policy for verification
        ACTIVE_POLICIES[str(req.service_scope_id)] = {
            "currentTimestamp": compiled["currentTimestamp"],
            "maxBirthTimestamp": compiled["maxBirthTimestamp"],
            "minBalanceRequired": compiled["minBalanceRequired"],
            "maxIncomeAllowed": compiled["maxIncomeAllowed"],
            "minScoreRequired": compiled["minScoreRequired"]
        }
        return CompiledPolicyResponse(success=True, **compiled)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify", response_model=VerifyProofResponse)
def post_verify(req: VerifyProofRequest):
    # 1. Nonce validation
    now_ms = int(time.time() * 1000)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT session_id, expires_at, is_consumed FROM challenge_sessions WHERE session_nonce = ?",
        (req.sessionNonce,)
    )
    session = cursor.fetchone()

    if not session:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid session challenge nonce.")
    
    session_id, expires_at, is_consumed = session
    if is_consumed:
        conn.close()
        raise HTTPException(status_code=400, detail="Replay error: Challenge nonce already consumed.")
    if now_ms > expires_at:
        conn.close()
        raise HTTPException(status_code=400, detail="Expired challenge nonce. TTL 60 seconds exceeded.")

    # Mark nonce consumed
    cursor.execute("UPDATE challenge_sessions SET is_consumed = 1 WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

    # 2. Retrieve authoritative policy
    server_policy = ACTIVE_POLICIES.get(str(req.serviceScopeId), ACTIVE_POLICIES["901"])

    # 3. Perform cryptographic audit
    result = verify_and_audit(
        proof=req.proof.dict(),
        client_nullifier=req.clientNullifier,
        policy_id=req.serviceScopeId,
        server_policy=server_policy,
        session_nonce=req.sessionNonce
    )

    if not result.get("verified"):
        raise HTTPException(
            status_code=400, 
            detail=result.get("error", "Verification failed")
        )

    return VerifyProofResponse(**result)

