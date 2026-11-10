import pytest
from app.core.database import init_db, register_nullifier_atomic
from app.agents.policy_compiler import compile_policy
from app.agents.proof_auditor import verify_and_audit

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_tampered_proof_fails_verification():
    """Attack 1: Maliciously crafted proof coordinate fails SnarkJS Groth16 pairing."""
    fake_proof = {
        "pi_a": ["123", "456", "1"],
        "pi_b": [["11", "22"], ["33", "44"], ["1", "0"]],
        "pi_c": ["789", "101", "1"],
        "protocol": "groth16",
        "curve": "bn128"
    }
    res = verify_and_audit(
        proof=fake_proof,
        client_nullifier="0x1111222233334444",
        policy_id="901",
        server_policy={
            "currentTimestamp": "20261110",
            "maxBirthTimestamp": "20081110",
            "minBalanceRequired": "50000",
            "maxIncomeAllowed": "800000",
            "minScoreRequired": "800"
        },
        session_nonce="999988887777"
    )
    assert res["verified"] is False
    assert "Cryptographic Groth16 pairing check failed" in res["error"]

def test_replay_attack_blocked_by_nullifier():
    """Attack 2: Replaying a nullifier triggers Sybil double-dipping rejection."""
    test_nullifier = "0xdeadbeef_test_nullifier_001"
    scope = "scholarship_901"

    # First claim succeeds
    ok1, _ = register_nullifier_atomic(test_nullifier, scope, "nonce_1")
    assert ok1 is True

    # Replay claim with identical nullifier fails
    ok2, msg = register_nullifier_atomic(test_nullifier, scope, "nonce_2")
    assert ok2 is False
    assert "Sybil double-dip violation" in msg

def test_policy_quantization_enforces_25k_steps():
    """Attack 3: Probing fine values (e.g. ₹63,412) is quantized to ₹25k buckets."""
    compiled = compile_policy("Verify balance >= 63412 and income <= 738000", scope_id="901")
    
    # 63,412 should floor to 50,000
    assert int(compiled["minBalanceRequired"]) % 25000 == 0
    # 738,000 should floor to 725,000
    assert int(compiled["maxIncomeAllowed"]) % 25000 == 0

