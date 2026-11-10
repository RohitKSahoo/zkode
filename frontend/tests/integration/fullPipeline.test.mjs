import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import * as snarkjs from "snarkjs";
import { buildEddsa, buildPoseidon } from "circomlibjs";

const BACKEND_URL = "http://127.0.0.1:8000";
const SCOPE_ID = "901";
const ISSUER_PRIVATE_KEY = Buffer.from(
  "0001020304050607080900010203040506070809000102030405060708090001",
  "hex"
);

let backendProcess = null;

async function waitForBackend(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

describe("Frontend to Backend End-to-End Integration Tests", () => {
  before(async () => {
    // Check if backend is already running, if not spawn it
    const isRunning = await waitForBackend(2);
    if (!isRunning) {
      const candidates = [
        path.resolve("../backend/venv/Scripts/python.exe"),
        path.resolve("../../backend/venv/Scripts/python.exe"),
        "python"
      ];
      const pythonExe = candidates.find((p) => p === "python" || fs.existsSync(p)) || "python";
      const backendDir = path.resolve("../backend");
      backendProcess = spawn(
        pythonExe,
        ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        { cwd: backendDir, stdio: "ignore" }
      );
      const ready = await waitForBackend();
      assert.ok(ready, "Backend must start successfully on port 8000");
    }
  });

  after(() => {
    if (backendProcess) {
      backendProcess.kill();
    }
  });

  test("1. Health Endpoint Handshake", async () => {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "healthy");
    assert.equal(data.databaseConnected, true);
    assert.equal(data.verificationKeyLoaded, true);
  });

  test("2. Challenge Nonce Generation (60s Replay Protection)", async () => {
    const res = await fetch(`${BACKEND_URL}/api/challenge?scope_id=${SCOPE_ID}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.sessionNonce);
    assert.ok(data.sessionId);
    assert.equal(data.ttlSeconds, 60);
    assert.ok(data.expiresAt > Date.now());
  });

  test("3. Policy Compilation with ₹25k Quantization", async () => {
    const res = await fetch(`${BACKEND_URL}/api/policy/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Scholarship applicant must be at least 18 years old, balance >= ₹50,000, income <= ₹8,00,000, score >= 8.2 CGPA",
        service_scope_id: SCOPE_ID
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.serviceScopeId, SCOPE_ID);
    assert.equal(parseInt(data.minBalanceRequired) % 25000, 0);
    assert.equal(parseInt(data.maxIncomeAllowed) % 25000, 0);
    assert.ok(data.symbolicReceipt.length > 0);
  });

  test("4. Full Zero-Knowledge Proving and Verification Pipeline", async () => {
    // Step A: Fetch Challenge Nonce
    const nonceRes = await fetch(`${BACKEND_URL}/api/challenge?scope_id=${SCOPE_ID}`);
    const { sessionNonce } = await nonceRes.json();

    // Step B: Fetch Compiled Policy
    const policyRes = await fetch(`${BACKEND_URL}/api/policy/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Age >= 18, balance >= ₹50,000, income <= ₹8,00,000, CGPA >= 8.2",
        service_scope_id: SCOPE_ID
      })
    });
    const policyData = await policyRes.json();

    // Step C: Mint BabyJubJub EdDSA Credential with fresh holder secret ID
    const eddsa = await buildEddsa();
    const poseidon = await buildPoseidon();
    const userSecretId = (BigInt(Date.now()) * 1000000n + BigInt(Math.floor(Math.random() * 1000000))).toString();
    const birthTimestamp = "20030416";
    const actualBalance = "84500";
    const actualIncome = "350000";
    const creditOrCgpaScore = "860";
    const expirationTimestamp = "20261115";

    const pubKey = eddsa.prv2pub(ISSUER_PRIVATE_KEY);
    const Ax = poseidon.F.toString(pubKey[0]);
    const Ay = poseidon.F.toString(pubKey[1]);
    const holderHash = poseidon([BigInt(userSecretId)]);
    const credHash = poseidon([
      holderHash,
      BigInt(birthTimestamp),
      BigInt(actualBalance),
      BigInt(actualIncome),
      BigInt(creditOrCgpaScore),
      BigInt(expirationTimestamp)
    ]);
    const sig = eddsa.signPoseidon(ISSUER_PRIVATE_KEY, credHash);

    // Step D: Construct Full Witness
    const witness = {
      userSecretId: userSecretId,
      birthTimestamp: birthTimestamp,
      actualBalance: actualBalance,
      actualIncome: actualIncome,
      creditOrCgpaScore: creditOrCgpaScore,
      expirationTimestamp: expirationTimestamp,
      sigR8x: poseidon.F.toString(sig.R8[0]),
      sigR8y: poseidon.F.toString(sig.R8[1]),
      sigS: sig.S.toString(),
      issuerPubKeyAx: Ax,
      issuerPubKeyAy: Ay,
      currentTimestamp: policyData.currentTimestamp,
      maxBirthTimestamp: policyData.maxBirthTimestamp,
      minBalanceRequired: policyData.minBalanceRequired,
      maxIncomeAllowed: policyData.maxIncomeAllowed,
      minScoreRequired: policyData.minScoreRequired,
      serviceScopeId: SCOPE_ID,
      sessionChallengeNonce: sessionNonce
    };

    // Step E: Generate Real Groth16 Proof via SnarkJS using deployed WASM & zkey
    const wasmPath = path.resolve("public/zk/circuit.wasm");
    const zkeyPath = path.resolve("public/zk/circuit_final.zkey");

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      witness,
      wasmPath,
      zkeyPath
    );

    const clientNullifier = publicSignals[1];
    assert.ok(proof.pi_a);
    assert.ok(proof.pi_b);
    assert.ok(proof.pi_c);
    assert.ok(clientNullifier);

    // Step F: Submit Proof to Backend Verifier
    const verifyRes = await fetch(`${BACKEND_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof,
        clientNullifier,
        serviceScopeId: SCOPE_ID,
        sessionNonce
      })
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    if (!verifyData.verified) {
      console.error("VERIFY FAILED ERROR:", verifyData);
    }
    assert.equal(verifyData.verified, true);
    assert.equal(verifyData.nullifierHash, clientNullifier);
    assert.equal(verifyData.telemetry.piiTransmittedBytes, 0);

    // Step G: Verify Nullifier Ledger Updated
    const ledgerRes = await fetch(`${BACKEND_URL}/api/ledger`);
    const ledgerData = await ledgerRes.json();
    assert.equal(ledgerData.success, true);
    const inLedger = ledgerData.ledger.some(
      (item) => item.nullifier_hash === clientNullifier && item.service_scope_id === SCOPE_ID
    );
    assert.ok(inLedger, "The registered nullifier must appear in the anonymous ledger");

    // Step H: Sybil Double-Dip Defense Check
    const newNonceRes = await fetch(`${BACKEND_URL}/api/challenge?scope_id=${SCOPE_ID}`);
    const { sessionNonce: freshNonce } = await newNonceRes.json();

    const duplicateRes = await fetch(`${BACKEND_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof,
        clientNullifier,
        serviceScopeId: SCOPE_ID,
        sessionNonce: freshNonce
      })
    });
    const dupData = await duplicateRes.json();
    assert.equal(dupData.verified, false);
    assert.equal(dupData.sybilBlocked, true);
  });
});
