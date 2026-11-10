import os
import json
import subprocess
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, get_connection
from app.core.crypto import mint_babyjubjub_credential

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    conn = get_connection()
    conn.execute("DELETE FROM nullifier_registry WHERE service_scope_id = '901'")
    conn.execute("DELETE FROM challenge_sessions WHERE service_scope_id = '901'")
    conn.commit()
    conn.close()

def test_health_with_vkey_loaded():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["verificationKeyLoaded"] is True
    assert data["databaseConnected"] is True

def test_full_groth16_proving_and_verification_pipeline():
    """
    REAL MATHEMATICAL END-TO-END TEST:
    1. Compile policy: Age >= 18, Balance >= 50,000, Income <= 800,000, Score >= 820.
    2. Obtain 60s ephemeral challenge nonce.
    3. Mint BabyJubJub EdDSA credential for eligible citizen.
    4. Generate real Groth16 proof via snarkjs.fullProve with circuit.wasm and circuit_final.zkey.
    5. Submit proof to backend /api/verify.
    6. Verify pairing check succeeds.
    7. Verify Sybil attack defense on second submission.
    """
    scope_id = "901"

    # Step 1: Compile Policy
    policy_res = client.post("/api/policy/compile", json={
        "prompt": "Candidate must be at least 18 years old, maintain bank balance >= ₹50,000, annual income <= ₹8,00,000, and academic CGPA >= 8.2",
        "service_scope_id": scope_id
    })
    assert policy_res.status_code == 200
    policy_data = policy_res.json()

    # Step 2: Challenge Nonce
    challenge_res = client.get(f"/api/challenge?scope_id={scope_id}")
    assert challenge_res.status_code == 200
    challenge_data = challenge_res.json()
    nonce = challenge_data["sessionNonce"]

    # Step 3: Mint Credential
    user_secret_id = "987654321098765432109876543210"
    cred_data = mint_babyjubjub_credential(
        user_secret_id=user_secret_id,
        birth_timestamp="20020515",        # Born May 15, 2002 (age ~24 > 18)
        actual_balance="75000",             # 75k >= 50k
        actual_income="450000",             # 4.5L <= 8L
        credit_or_cgpa_score="860",         # 8.6 CGPA >= 8.2
        expiration_timestamp="20281231"     # Not expired
    )
    cred = cred_data["credential"]
    issuer_pub = cred_data["issuerPubKey"]

    # Step 4: Generate Real Groth16 Proof via SnarkJS in Node
    circuits_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "circuits"))
    circomlib_path = os.path.join(circuits_dir, "node_modules", "circomlibjs")
    wasm_path = os.path.join(circuits_dir, "build", "universal_eligibility_v2_js", "universal_eligibility_v2.wasm")
    zkey_path = os.path.join(circuits_dir, "build", "circuit_final.zkey")

    node_prove_script = f"""
    const snarkjs = require('snarkjs');
    const {{ buildPoseidon }} = require('{circomlib_path.replace(os.sep, "/")}');

    async function prove() {{
      const poseidon = await buildPoseidon();
      
      const witness = {{
        // Private inputs
        userSecretId: '{cred["userSecretId"]}',
        birthTimestamp: '{cred["birthTimestamp"]}',
        actualBalance: '{cred["actualBalance"]}',
        actualIncome: '{cred["actualIncome"]}',
        creditOrCgpaScore: '{cred["creditOrCgpaScore"]}',
        expirationTimestamp: '{cred["expirationTimestamp"]}',
        sigR8x: '{cred["sigR8x"]}',
        sigR8y: '{cred["sigR8y"]}',
        sigS: '{cred["sigS"]}',
        // Public inputs
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

      const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
        witness,
        '{wasm_path.replace(os.sep, "/")}',
        '{zkey_path.replace(os.sep, "/")}'
      );

      console.log(JSON.stringify({{ proof, publicSignals }}));
      process.exit(0);
    }}

    prove().catch(e => {{
      console.error(e);
      process.exit(1);
    }});
    """

    prove_run = subprocess.run(
        ["node", "-e", node_prove_script],
        cwd=circuits_dir,
        capture_output=True,
        text=True,
        check=True
    )
    proof_packet = json.loads(prove_run.stdout.strip())
    proof = proof_packet["proof"]
    public_signals = proof_packet["publicSignals"]

    client_nullifier = public_signals[1]  # Output signal [1] is nullifierHash

    # Step 5: Submit to backend verification
    verify_res = client.post("/api/verify", json={
        "proof": proof,
        "clientNullifier": client_nullifier,
        "serviceScopeId": scope_id,
        "sessionNonce": nonce
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verified"] is True, f"Verify failed with: {verify_data}"
    assert verify_data["nullifierHash"] == client_nullifier
    assert verify_data["telemetry"]["piiTransmittedBytes"] == 0

    # Step 6: Sybil Double-Dip Defense
    # Attempting to verify the exact same claim again under a new nonce must be blocked by SQLite atomic lock
    new_challenge_res = client.get(f"/api/challenge?scope_id={scope_id}")
    new_nonce = new_challenge_res.json()["sessionNonce"]

    duplicate_res = client.post("/api/verify", json={
        "proof": proof,
        "clientNullifier": client_nullifier,
        "serviceScopeId": scope_id,
        "sessionNonce": new_nonce
    })
    dup_data = duplicate_res.json()
    assert dup_data["verified"] is False
    assert dup_data["sybilBlocked"] is True
