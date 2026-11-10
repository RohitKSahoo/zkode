import os
import time
import json
import subprocess
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import init_db, get_connection, create_challenge_session
from app.core.crypto import mint_babyjubjub_credential

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_test_state():
    init_db()
    conn = get_connection()
    conn.execute("DELETE FROM nullifier_registry WHERE service_scope_id IN ('901', '999')")
    conn.execute("DELETE FROM challenge_sessions WHERE service_scope_id IN ('901', '999')")
    conn.commit()
    conn.close()

def test_attack_expired_challenge_nonce():
    """
    ATTACK VECTOR 1: Expired Challenge Nonce (Replay Window Violation)
    An attacker intercepts or re-submits a proof after the 60-second TTL expires.
    The backend MUST reject with an expiration error.
    """
    scope_id = "999"
    past_timestamp = int(time.time() * 1000) - 65000  # 65 seconds ago (expired)
    session_id = "test_expired_session"
    expired_nonce = "999888777666555444333222111"

    create_challenge_session(
        session_id=session_id,
        session_nonce=expired_nonce,
        service_scope_id=scope_id,
        expires_at_ms=past_timestamp
    )

    fake_proof = {
        "pi_a": ["1", "2", "1"],
        "pi_b": [["1", "2"], ["3", "4"], ["1", "0"]],
        "pi_c": ["1", "2", "1"],
        "protocol": "groth16",
        "curve": "bn128"
    }

    res = client.post("/api/verify", json={
        "proof": fake_proof,
        "clientNullifier": "123456789",
        "serviceScopeId": scope_id,
        "sessionNonce": expired_nonce
    })

    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is False
    assert "Challenge expired" in data["error"] or "expired" in data["error"].lower()

def test_attack_sybil_double_dip_same_scope():
    """
    ATTACK VECTOR 2: Sybil Double-Dipping Attack
    An eligible citizen attempts to claim benefits multiple times across the same campaign scope.
    The SQLite atomic registry MUST immediately block the second attempt without leaking identity.
    """
    scope_id = "901"
    nullifier = "777778888899999000001111122222"

    # Seed the nullifier registry as already claimed
    conn = get_connection()
    conn.execute(
        "INSERT INTO nullifier_registry (nullifier_hash, service_scope_id, session_nonce_used) VALUES (?, ?, ?)",
        (nullifier, scope_id, "prev_nonce_123")
    )
    conn.commit()
    conn.close()

    # Attacker obtains a fresh 60s nonce
    challenge_res = client.get(f"/api/challenge?scope_id={scope_id}")
    nonce = challenge_res.json()["sessionNonce"]

    fake_proof = {
        "pi_a": ["1", "2", "1"],
        "pi_b": [["1", "2"], ["3", "4"], ["1", "0"]],
        "pi_c": ["1", "2", "1"],
        "protocol": "groth16",
        "curve": "bn128"
    }

    res = client.post("/api/verify", json={
        "proof": fake_proof,
        "clientNullifier": nullifier,
        "serviceScopeId": scope_id,
        "sessionNonce": nonce
    })

    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is False
    assert data["sybilBlocked"] is True
    assert "Sybil double-dip violation" in data["error"]

def test_attack_stolen_proof_replay_under_fresh_nonce():
    """
    ATTACK VECTOR 3: Stolen Proof Wire Replay (Authoritative Signal Mismatch)
    An attacker sniffs a valid proof from the network and attempts to replay it under their own fresh nonce.
    Because the server constructs signals authoritatively with the new nonce,
    the BN128 pairing check MUST fail.
    """
    scope_id = "901"

    # Step A: Generate a legitimate proof under nonce A
    policy_res = client.post("/api/policy/compile", json={
        "prompt": "Applicant must be >= 18 years old, balance >= ₹50,000, income <= ₹8,00,000, CGPA >= 8.2",
        "service_scope_id": scope_id
    })
    policy_data = policy_res.json()

    nonce_a_res = client.get(f"/api/challenge?scope_id={scope_id}")
    nonce_a = nonce_a_res.json()["sessionNonce"]

    cred_data = mint_babyjubjub_credential(
        user_secret_id="11223344556677889900112233",
        birth_timestamp="20020101",
        actual_balance="80000",
        actual_income="400000",
        credit_or_cgpa_score="850",
        expiration_timestamp="20281231"
    )
    cred = cred_data["credential"]
    issuer_pub = cred_data["issuerPubKey"]

    circuits_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "circuits"))
    circomlib_path = os.path.join(circuits_dir, "node_modules", "circomlibjs")
    wasm_path = os.path.join(circuits_dir, "build", "universal_eligibility_v2_js", "universal_eligibility_v2.wasm")
    zkey_path = os.path.join(circuits_dir, "build", "circuit_final.zkey")

    node_script = f"""
    const snarkjs = require('snarkjs');
    async function prove() {{
      const witness = {{
        userSecretId: '{cred["userSecretId"]}',
        birthTimestamp: '{cred["birthTimestamp"]}',
        actualBalance: '{cred["actualBalance"]}',
        actualIncome: '{cred["actualIncome"]}',
        creditOrCgpaScore: '{cred["creditOrCgpaScore"]}',
        expirationTimestamp: '{cred["expirationTimestamp"]}',
        sigR8x: '{cred["sigR8x"]}',
        sigR8y: '{cred["sigR8y"]}',
        sigS: '{cred["sigS"]}',
        issuerPubKeyAx: '{issuer_pub["Ax"]}',
        issuerPubKeyAy: '{issuer_pub["Ay"]}',
        currentTimestamp: '{policy_data["currentTimestamp"]}',
        maxBirthTimestamp: '{policy_data["maxBirthTimestamp"]}',
        minBalanceRequired: '{policy_data["minBalanceRequired"]}',
        maxIncomeAllowed: '{policy_data["maxIncomeAllowed"]}',
        minScoreRequired: '{policy_data["minScoreRequired"]}',
        serviceScopeId: '{scope_id}',
        sessionChallengeNonce: '{nonce_a}'
      }};
      const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
        witness,
        '{wasm_path.replace(os.sep, "/")}',
        '{zkey_path.replace(os.sep, "/")}'
      );
      console.log(JSON.stringify({{ proof, publicSignals }}));
      process.exit(0);
    }}
    prove().catch(e => {{ console.error(e); process.exit(1); }});
    """

    prove_run = subprocess.run(
        ["node", "-e", node_script],
        cwd=circuits_dir,
        capture_output=True,
        text=True,
        check=True
    )
    proof_packet = json.loads(prove_run.stdout.strip())
    stolen_proof = proof_packet["proof"]
    client_nullifier = proof_packet["publicSignals"][1]

    # Step B: Attacker obtains fresh nonce B and tries to submit stolen proof
    nonce_b_res = client.get(f"/api/challenge?scope_id={scope_id}")
    nonce_b = nonce_b_res.json()["sessionNonce"]

    replay_res = client.post("/api/verify", json={
        "proof": stolen_proof,
        "clientNullifier": client_nullifier,
        "serviceScopeId": scope_id,
        "sessionNonce": nonce_b
    })

    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["verified"] is False
    assert "Cryptographic Groth16 pairing check failed" in replay_data["error"]

def test_attack_fake_balance_injection_fails_incircuit_signature():
    """
    ATTACK VECTOR 4: Fake Balance Injection
    An attacker attempts to inject a balance of ₹10,00,000 into witness calculations,
    but retains their original issuer EdDSA signature.
    The in-circuit EdDSAPoseidonVerifier MUST reject the witness or produce an invalid proof.
    """
    scope_id = "901"
    policy_res = client.post("/api/policy/compile", json={
        "prompt": "Balance >= ₹50,000",
        "service_scope_id": scope_id
    })
    policy_data = policy_res.json()

    nonce_res = client.get(f"/api/challenge?scope_id={scope_id}")
    nonce = nonce_res.json()["sessionNonce"]

    # Legit credential for balance 10,000 (ineligible)
    cred_data = mint_babyjubjub_credential(
        user_secret_id="33445566778899001122334455",
        birth_timestamp="20000101",
        actual_balance="10000",  # Legit signed balance is only 10k
        actual_income="200000",
        credit_or_cgpa_score="800",
        expiration_timestamp="20281231"
    )
    cred = cred_data["credential"]
    issuer_pub = cred_data["issuerPubKey"]

    circuits_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "circuits"))
    wasm_path = os.path.join(circuits_dir, "build", "universal_eligibility_v2_js", "universal_eligibility_v2.wasm")
    zkey_path = os.path.join(circuits_dir, "build", "circuit_final.zkey")

    # Attacker injects fake balance: 1,000,000 (10 Lakhs)
    fake_witness_script = f"""
    const snarkjs = require('snarkjs');
    async function prove() {{
      const witness = {{
        userSecretId: '{cred["userSecretId"]}',
        birthTimestamp: '{cred["birthTimestamp"]}',
        actualBalance: '1000000', // INJECTED FAKE BALANCE
        actualIncome: '{cred["actualIncome"]}',
        creditOrCgpaScore: '{cred["creditOrCgpaScore"]}',
        expirationTimestamp: '{cred["expirationTimestamp"]}',
        sigR8x: '{cred["sigR8x"]}',
        sigR8y: '{cred["sigR8y"]}',
        sigS: '{cred["sigS"]}',
        issuerPubKeyAx: '{issuer_pub["Ax"]}',
        issuerPubKeyAy: '{issuer_pub["Ay"]}',
        currentTimestamp: '{policy_data["currentTimestamp"]}',
        maxBirthTimestamp: '{policy_data["maxBirthTimestamp"]}',
        minBalanceRequired: '{policy_data["minBalanceRequired"]}',
        maxIncomeAllowed: '{policy_data["maxIncomeAllowed"]}',
        minScoreRequired: '{policy_data["minScoreRequired"]}',
        serviceScopeId: '{scope_id}',
        sessionChallengeNonce: '{nonce}'
      }};
      try {{
        const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
          witness,
          '{wasm_path.replace(os.sep, "/")}',
          '{zkey_path.replace(os.sep, "/")}'
        );
        console.log("UNEXPECTED_SUCCESS");
        process.exit(0);
      }} catch (err) {{
        console.log("CIRCUIT_ASSERTION_FAILED: " + err.message);
        process.exit(0);
      }}
    }}
    prove();
    """

    prove_run = subprocess.run(
        ["node", "-e", fake_witness_script],
        cwd=circuits_dir,
        capture_output=True,
        text=True,
        check=True
    )

    output = prove_run.stdout.strip()
    assert "CIRCUIT_ASSERTION_FAILED" in output or "Error" in output
    assert "UNEXPECTED_SUCCESS" not in output

def test_attack_quantization_violation_guard():
    """
    ATTACK VECTOR 5: Micro-Targeting Quantization Probe
    An adversary submits a non-quantized balance probe (e.g. ₹63,412) to trace individual bank accounts.
    The policy compiler's quantization guard MUST round to ₹25k intervals.
    """
    res = client.post("/api/policy/compile", json={
        "prompt": "Applicant must have bank balance >= ₹63,412 and income <= ₹8,37,890",
        "service_scope_id": "901"
    })
    assert res.status_code == 200
    data = res.json()
    # The quantization guard must enforce multiples of 25,000
    assert int(data["minBalanceRequired"]) % 25000 == 0
    assert int(data["maxIncomeAllowed"]) % 25000 == 0

