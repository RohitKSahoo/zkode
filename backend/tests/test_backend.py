import pytest
import time
import secrets
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import (
    init_db,
    register_nullifier_atomic,
    create_challenge_session,
    validate_and_consume_nonce,
)
from app.agents.policy_compiler import compile_statutory_policy

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "serverTime" in data

def test_challenge_nonce_generation_and_expiry():
    res = client.get("/api/challenge?scope_id=901")
    assert res.status_code == 200
    data = res.json()
    assert "sessionId" in data
    assert "sessionNonce" in data
    assert data["ttlSeconds"] == 60
    assert data["expiresAt"] > int(time.time() * 1000)

    # Validate nonce consumption
    valid, msg = validate_and_consume_nonce(data["sessionNonce"])
    assert valid is True

    # Replay attempt: second consumption must fail
    replay_valid, replay_msg = validate_and_consume_nonce(data["sessionNonce"])
    assert replay_valid is False
    assert "already been consumed" in replay_msg

def test_sybil_atomic_nullifier_registry():
    test_nullifier = f"test_nullifier_{secrets.token_hex(8)}"
    scope_id = "test_scope_100"

    # First claim must succeed
    ok1, msg1 = register_nullifier_atomic(test_nullifier, scope_id, "nonce_1")
    assert ok1 is True

    # Duplicate claim within the same scope must trigger Sybil rejection
    ok2, msg2 = register_nullifier_atomic(test_nullifier, scope_id, "nonce_2")
    assert ok2 is False
    assert "Sybil double-dip violation" in msg2

    # Different scope with same nullifier should succeed (scope isolation)
    ok3, msg3 = register_nullifier_atomic(test_nullifier, "different_scope_200", "nonce_3")
    assert ok3 is True

def test_policy_compiler_agent_and_quantization():
    prompt = "Applicant must be at least 18 years old, have bank balance >= ₹50,000, and annual income <= ₹8,00,000"
    res = client.post("/api/policy/compile", json={"prompt": prompt, "service_scope_id": "901"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["serviceScopeId"] == "901"
    assert int(data["minBalanceRequired"]) % 25000 == 0
    assert int(data["maxIncomeAllowed"]) % 25000 == 0
    assert len(data["symbolicReceipt"]) >= 2

def test_mock_credential_minting():
    payload = {
        "userSecretId": "12345678901234567890",
        "birthTimestamp": "20030416",
        "actualBalance": "75000",
        "actualIncome": "450000",
        "creditOrCgpaScore": "820",
        "expirationTimestamp": "20261231"
    }
    res = client.post("/api/crypto/mint", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Ax" in data["issuerPubKey"]
    assert "Ay" in data["issuerPubKey"]
    assert "sigR8x" in data["credential"]
    assert "sigR8y" in data["credential"]
    assert "sigS" in data["credential"]
