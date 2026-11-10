import json
import os
import subprocess
import tempfile
import time
from typing import Dict, Any
from app.core.config import ISSUER_PUBKEY_AX, ISSUER_PUBKEY_AY
from app.core.database import register_nullifier_atomic

VK_PATH = os.path.join(os.path.dirname(__file__), "..", "core", "verification_key.json")

def verify_and_audit(
    proof: Dict[str, Any],
    client_nullifier: str,
    policy_id: str,
    server_policy: Dict[str, str],
    session_nonce: str
) -> Dict[str, Any]:
    start_time = time.time()

    # 1. Authoritative public signal reconstruction (Server-Enforced Order)
    authoritative_signals = [
        "1",                                       # isEligible output
        str(client_nullifier),                     # nullifierHash output
        str(ISSUER_PUBKEY_AX),
        str(ISSUER_PUBKEY_AY),
        str(server_policy.get("currentTimestamp", "20261110")),
        str(server_policy.get("maxBirthTimestamp", "20081110")),
        str(server_policy.get("minBalanceRequired", "50000")),
        str(server_policy.get("maxIncomeAllowed", "800000")),
        str(server_policy.get("minScoreRequired", "800")),
        str(policy_id),
        str(session_nonce)
    ]

    # 2. Write temp verification files
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f_proof:
        json.dump(proof, f_proof)
        proof_file = f_proof.name

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f_public:
        json.dump(authoritative_signals, f_public)
        public_file = f_public.name

    try:
        # 3. Cryptographic Groth16 pairing check via snarkjs
        cmd = ["npx", "snarkjs", "groth16", "verify", VK_PATH, public_file, proof_file]
        proc = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        
        verify_time_ms = int((time.time() - start_time) * 1000)

        if proc.returncode != 0 or "OK" not in proc.stdout:
            return {
                "verified": False,
                "error": "Cryptographic Groth16 pairing check failed. Proof signature invalid.",
                "sybilBlocked": False,
                "telemetry": {
                    "verificationTimeMs": verify_time_ms,
                    "rawOutput": proc.stdout or proc.stderr
                }
            }

        # 4. Sybil defense: atomic nullifier insertion
        success, msg = register_nullifier_atomic(client_nullifier, str(policy_id), session_nonce)
        if not success:
            return {
                "verified": False,
                "error": msg,
                "sybilBlocked": True,
                "telemetry": {"verificationTimeMs": verify_time_ms}
            }

        return {
            "verified": True,
            "nullifierHash": client_nullifier,
            "serviceScopeId": str(policy_id),
            "message": "Zero-Knowledge eligibility verified. Nullifier registered anonymously.",
            "sybilBlocked": False,
            "telemetry": {
                "pairingResult": "OK",
                "verificationTimeMs": verify_time_ms,
                "piiTransmittedBytes": 0
            }
        }
    finally:
        if os.path.exists(proof_file):
            try: os.unlink(proof_file)
            except Exception: pass
        if os.path.exists(public_file):
            try: os.unlink(public_file)
            except Exception: pass

