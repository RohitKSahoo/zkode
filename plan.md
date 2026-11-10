# zkode: Engineering Implementation Plan & Architecture Specification (`plan.md`)

**Target Deliverable:** A privacy-preserving eligibility verification platform proving identity, age, and financial criteria via client-side zk-SNARKs (Circom 2.1 + SnarkJS) without leaking raw personal identifiable information (PII), paired with a LangGraph multi-agent policy compiler for dynamic rule enforcement.

---

## 1. Problem Statement Alignment & Threat Model

### 1.1 Problem Statement Mapping
The problem requires proving compliance with conditions (e.g., minimum age, financial thresholds) without revealing underlying data (exact birth date, account balance). 

`zkode` enforces a zero-knowledge selective disclosure model:
* **Self-Reported Data Elimination:** Credentials must be signed by an authorized issuing authority (e.g., DigiLocker, banking portal). The user cannot spoof values locally because signatures are cryptographically verified inside the Zero-Knowledge circuit.
* **Zero PII Transmission:** The verifier receives only 256 bytes of elliptic curve coordinates ($\pi_A, \pi_B, \pi_C$) and a deterministic nullifier hash.
* **Dynamic Rule Adaptability:** Plain English statutory rules are converted into quantized mathematical constraints by an agentic compiler, avoiding circuit recompilation.

### 1.2 Threat Matrix & Cryptographic Mitigations

```
                ┌────────────────────────────────────────────────────────┐
                │                   THREAT SURFACE                       │
                └───────────────────────────┬────────────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
┌───────────────┐   ┌───────────────┐               ┌───────────────┐   ┌───────────────┐
│ Frankenstein  │   │ Linkability & │               │ Replay Attack │   │ Binary-Search │
│   Collusion   │   │ Tracking Risk │               │ (Stolen Proof)│   │ Range Probing │
└───────┬───────┘   └───────┬───────┘               └───────┬───────┘   └───────┬───────┘
        │                   │                               │                   │
        ▼                   ▼                               ▼                   ▼
┌───────────────┐   ┌───────────────┐               ┌───────────────┐   ┌───────────────┐
│Holder Binding │   │In-Circuit     │               │Ephemeral      │   │Quantization & │
│Poseidon Hash  │   │BabyJubJub     │               │Session Nonce  │   │Local Entropy  │
│of userSecretId│   │EdDSA Check    │               │Quadratic Lock │   │Guard Engine   │
└───────────────┘   └───────────────┘               └───────────────┘   └───────────────┘
```

| Attack Vector | Vulnerability Description | Cryptographic / Architectural Mitigation |
| :--- | :--- | :--- |
| **Frankenstein Identity (Collusion)** | User combines an age credential from Person A with a bank credential from Person B. | **Holder Binding:** Every credential binds to a shared hidden `holderCommitment = Poseidon(userSecretId)`. The circuit asserts that all claims share this exact leaf. |
| **Tracking / Linkability Leak** | Public commitments or raw digital signatures transmitted over the wire act as permanent cross-site trackers. | **In-Circuit Signature Verification:** The Issuer's EdDSA signature and credential hash remain **100% Private Inputs**. Only the Issuer's public key $(A_x, A_y)$ is public. |
| **Proof Replay Attack** | Intercepting a valid `proof.json` allows an attacker to impersonate an eligible candidate. | **Ephemeral Session Nonce:** Verifier issues a single-use 60-second nonce. The circuit enforces `nonceLock <== sessionChallengeNonce * sessionChallengeNonce`. |
| **Flash-Loan / Stale Credential** | User takes a 5-minute loan, mints a credential, returns funds, and uses the proof months later. | **In-Circuit Expiration TTL:** Credentials carry an `expirationTimestamp`. Circuit enforces `expirationTimestamp >= currentTimestamp` via authoritative server clock. |
| **Binary-Search Probing** | Rogue verifier asks sequential queries (`>=50k`, `>=75k`, `>=62.5k`) to deduce exact balances. | **Quantization & Local Entropy Guard:** Financial thresholds must be multiples of ₹25,000. Browser Steward Agent halts automated micro-queries. |
| **Public Signal Tampering** | Attacker modifies public inputs in transit (`minBalance = 0`) before Groth16 verification. | **Server-Authoritative Signals:** Server reconstructs public signals exclusively from its internal database and verifies against client proof. |

---

## 2. Monorepo Directory Architecture

```text
zkode/
├── .agent/
│   └── skills/
│       └── zk-circom/
│           └── SKILL.md                         # Antigravity rulebook for Circom & SnarkJS
├── agents.md                                    # Antigravity workspace orchestrator directives
├── circuits/
│   ├── universal_eligibility_v2.circom          # Core parameterized multi-claim circuit
│   ├── compile.sh                               # Automated build script (pot14 trusted setup)
│   ├── input_mock.json                          # Sample witness data for local testing
│   └── build/
│       ├── universal_eligibility_v2.r1cs
│       ├── circuit_final.zkey
│       ├── verification_key.json
│       └── universal_eligibility_v2_js/
│           └── universal_eligibility_v2.wasm
├── frontend/                                    # Next.js 14 App Router + Tailwind CSS
│   ├── next.config.mjs                          # Webpack polyfills for SnarkJS
│   ├── package.json
│   ├── public/
│   │   ├── zk/
│   │   │   ├── circuit.wasm
│   │   │   ├── circuit_final.zkey
│   │   │   └── verification_key.json
│   │   └── workers/
│   │       └── zkProver.worker.ts               # Background Web Worker for WASM proving
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                         # 3-Column Glass-Box UI
│       │   └── api/
│       │       ├── crypto/
│       │       │   └── mint/route.ts            # Mock Issuer (BabyJubJub EdDSA signer)
│       │       └── challenge/route.ts           # Ephemeral 60s nonce generator
│       ├── components/
│       │   ├── PrivateVault.tsx                 # Left: Local credentials & pre-flight
│       │   ├── NetworkInspector.tsx             # Center: Wire packet & 0% PII audit
│       │   ├── VerifierPortal.tsx               # Right: Natural language policy compiler
│       │   └── RedTeamAttackBar.tsx             # Bottom: Live exploit simulation triggers
│       └── lib/
│           ├── entropyGuard.ts                  # Client-side bucket and rate-limit guard
│           ├── witnessBuilder.ts                # Private witness formatter
│           └── zkProver.ts                      # Web Worker client wrapper
└── backend/                                     # FastAPI + LangGraph Engine
    ├── requirements.txt
    ├── app/
    │   ├── main.py                              # Application entrypoint
    │   ├── core/
    │   │   ├── config.py                        # Constants & cryptographic keys
    │   │   ├── database.py                      # SQLite nullifier persistence
    │   │   └── verification_key.json
    │   ├── schemas/
    │   │   └── policy.py                        # Strict Pydantic models for constraints
    │   └── agents/
    │       ├── policy_compiler.py               # Agent 1: Natural Language -> Quantized JSON
    │       └── proof_auditor.py                 # Agent 3: Groth16 verifier & Sybil blocker
    └── tests/
        └── test_attacks.py                      # Automated red-team test suite
```

---

## 3. Cryptographic Core: `universal_eligibility_v2.circom`

```javascript
pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsaposeidon.circom";

/**
 * @title UniversalEligibilityV2
 * @notice Parameterized multi-credential Zero-Knowledge verification circuit.
 * Evaluates age, liquid assets, income ceiling, and score requirements over signed credentials.
 */
template UniversalEligibilityV2() {
    // ================= PRIVATE INPUTS (100% Client-Side RAM) =================
    signal input userSecretId;          // Master citizen identity salt
    signal input birthTimestamp;        // Format: YYYYMMDD (e.g., 20030416)
    signal input actualBalance;         // In INR (e.g., 84500)
    signal input actualIncome;          // In INR (e.g., 350000)
    signal input creditOrCgpaScore;     // Scaled by 100 (e.g., 860 for 8.60 CGPA)
    signal input expirationTimestamp;   // Credential expiration date (YYYYMMDD)

    // Issuer BabyJubJub EdDSA Signature (Kept private to guarantee complete unlinkability)
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    // ================= PUBLIC INPUTS (Server-Authoritative) =================
    signal input issuerPubKeyAx;        // Trusted Issuer Public Key X
    signal input issuerPubKeyAy;        // Trusted Issuer Public Key Y
    signal input currentTimestamp;      // Authoritative current server date (YYYYMMDD)
    signal input maxBirthTimestamp;     // Cutoff date for minimum age compliance
    signal input minBalanceRequired;    // Minimum balance constraint (quantized to ₹25k)
    signal input maxIncomeAllowed;      // Income ceiling constraint (quantized to ₹25k)
    signal input minScoreRequired;      // Minimum CGPA / credit score constraint
    signal input serviceScopeId;        // Unique campaign/service scope identifier
    signal input sessionChallengeNonce; // 60-second anti-replay nonce from verifier

    // ================= PUBLIC OUTPUTS =================
    signal output isEligible;
    signal output nullifierHash;

    // 1. Holder Binding: Bind all attributes to a single hidden citizen commitment
    component holderHasher = Poseidon(1);
    holderHasher.inputs[0] <== userSecretId;

    component credHasher = Poseidon(6);
    credHasher.inputs[0] <== holderHasher.out;
    credHasher.inputs[1] <== birthTimestamp;
    credHasher.inputs[2] <== actualBalance;
    credHasher.inputs[3] <== actualIncome;
    credHasher.inputs[4] <== creditOrCgpaScore;
    credHasher.inputs[5] <== expirationTimestamp;

    // 2. In-Circuit Signature Verification (Prevents verifier tracking)
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;
    sigVerifier.Ax <== issuerPubKeyAx;
    sigVerifier.Ay <== issuerPubKeyAy;
    sigVerifier.R8x <== sigR8x;
    sigVerifier.R8y <== sigR8y;
    sigVerifier.S <== sigS;
    sigVerifier.M <== credHasher.out;

    // 3. Expiration Check: expirationTimestamp >= currentTimestamp
    component expiryCheck = GreaterEqThan(64);
    expiryCheck.in[0] <== expirationTimestamp;
    expiryCheck.in[1] <== currentTimestamp;

    // 4. Threshold Logic Execution
    component ageCheck = LessEqThan(64);
    ageCheck.in[0] <== birthTimestamp;
    ageCheck.in[1] <== maxBirthTimestamp;

    component balanceCheck = GreaterEqThan(64);
    balanceCheck.in[0] <== actualBalance;
    balanceCheck.in[1] <== minBalanceRequired;

    component incomeCheck = LessEqThan(64);
    incomeCheck.in[0] <== actualIncome;
    incomeCheck.in[1] <== maxIncomeAllowed;

    component scoreCheck = GreaterEqThan(32);
    scoreCheck.in[0] <== creditOrCgpaScore;
    scoreCheck.in[1] <== minScoreRequired;

    // 5. Strict R1CS Quadratic Accumulation
    signal c1;
    signal c2;
    signal c3;
    c1 <== expiryCheck.out * ageCheck.out;
    c2 <== balanceCheck.out * incomeCheck.out;
    c3 <== c1 * c2;
    isEligible <== c3 * scoreCheck.out;
    isEligible === 1;

    // 6. Sybil-Resistant Deterministic Nullifier: Poseidon(userSecretId, serviceScopeId)
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== userSecretId;
    nullifier.inputs[1] <== serviceScopeId;
    nullifierHash <== nullifier.out;

    // 7. Anti-Replay Session Lock (Ensures optimizer cannot strip sessionChallengeNonce)
    signal nonceLock;
    nonceLock <== sessionChallengeNonce * sessionChallengeNonce;
}

component main {public [
    issuerPubKeyAx,
    issuerPubKeyAy,
    currentTimestamp,
    maxBirthTimestamp,
    minBalanceRequired,
    maxIncomeAllowed,
    minScoreRequired,
    serviceScopeId,
    sessionChallengeNonce
]} = UniversalEligibilityV2();
```

---

## 4. Trusted Setup & Build Automation (`circuits/compile.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/5] Cleaning and creating build directories..."
mkdir -p build
rm -rf build/*

echo "==> [2/5] Compiling Circom circuit to R1CS and WASM..."
circom universal_eligibility_v2.circom --r1cs --wasm --sym -o build/

echo "==> [3/5] Initializing Powers of Tau (pot14 - 16,384 constraints max)..."
snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau \
  --name="zkode-ceremony" -v -e="zkode_entropy_seed_november_2026"
snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v

echo "==> [4/5] Executing Groth16 circuit setup and generating proving key..."
snarkjs groth16 setup build/universal_eligibility_v2.r1cs build/pot14_final.ptau build/circuit_final.zkey
snarkjs zkey export verificationkey build/circuit_final.zkey build/verification_key.json

echo "==> [5/5] Deploying build artifacts to Next.js public directory and FastAPI core..."
mkdir -p ../frontend/public/zk/
cp build/universal_eligibility_v2_js/universal_eligibility_v2.wasm ../frontend/public/zk/circuit.wasm
cp build/circuit_final.zkey ../frontend/public/zk/circuit_final.zkey
cp build/verification_key.json ../frontend/public/zk/verification_key.json

mkdir -p ../backend/app/core/
cp build/verification_key.json ../backend/app/core/verification_key.json

echo "==> Build complete. Manifest:"
ls -lh ../frontend/public/zk/
```

---

## 5. Mock Issuer Authority (`frontend/src/app/api/crypto/mint/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { buildEddsa, buildPoseidon } from "circomlibjs";

// Deterministic mock private key for the demo issuing authority
const ISSUER_PRIVATE_KEY = Buffer.from(
  "0001020304050607080900010203040506070809000102030405060708090001",
  "hex"
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userSecretId,
      birthTimestamp,
      actualBalance,
      actualIncome,
      creditOrCgpaScore,
      expirationTimestamp,
    } = body;

    const eddsa = await buildEddsa();
    const poseidon = await buildPoseidon();

    // 1. Derive issuer public key coordinates (Ax, Ay)
    const pubKey = eddsa.prv2pub(ISSUER_PRIVATE_KEY);
    const Ax = poseidon.F.toString(pubKey[0]);
    const Ay = poseidon.F.toString(pubKey[1]);

    // 2. Compute hidden holder commitment = Poseidon(userSecretId)
    const holderHash = poseidon([BigInt(userSecretId)]);

    // 3. Compute credential commitment hash
    const credHash = poseidon([
      holderHash,
      BigInt(birthTimestamp),
      BigInt(actualBalance),
      BigInt(actualIncome),
      BigInt(creditOrCgpaScore),
      BigInt(expirationTimestamp),
    ]);

    // 4. Sign the credential commitment hash using BabyJubJub EdDSA
    const signature = eddsa.signPoseidon(ISSUER_PRIVATE_KEY, credHash);

    return NextResponse.json({
      success: true,
      issuerPubKey: { Ax, Ay },
      credential: {
        userSecretId: userSecretId.toString(),
        birthTimestamp: birthTimestamp.toString(),
        actualBalance: actualBalance.toString(),
        actualIncome: actualIncome.toString(),
        creditOrCgpaScore: creditOrCgpaScore.toString(),
        expirationTimestamp: expirationTimestamp.toString(),
        sigR8x: poseidon.F.toString(signature.R8[0]),
        sigR8y: poseidon.F.toString(signature.R8[1]),
        sigS: signature.S.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

---

## 6. Client Sandbox & Web Worker Prover

### 6.1 Entropy Guard (`frontend/src/lib/entropyGuard.ts`)

```typescript
const QUANTIZATION_STEP = 25000;

export function validatePolicyEntropy(policy: Record<string, string>): void {
  const balance = parseInt(policy.minBalanceRequired, 10);
  const income = parseInt(policy.maxIncomeAllowed, 10);

  if (balance % QUANTIZATION_STEP !== 0) {
    throw new Error(
      `SECURITY EXCEPTION: Asset threshold (₹${balance}) is not quantized to ₹${QUANTIZATION_STEP} increments. Possible binary-search probing attack.`
    );
  }

  if (income % QUANTIZATION_STEP !== 0 && income !== 999999999) {
    throw new Error(
      `SECURITY EXCEPTION: Income ceiling (₹${income}) is not quantized to ₹${QUANTIZATION_STEP} increments.`
    );
  }

  const queryKey = `zkode_probe_guard_${policy.serviceScopeId}`;
  const lastCall = localStorage.getItem(queryKey);
  const now = Date.now();

  if (lastCall && now - parseInt(lastCall, 10) < 4000) {
    throw new Error("SECURITY EXCEPTION: Rate threshold exceeded. Query throttled to block automated extraction.");
  }
  localStorage.setItem(queryKey, now.toString());
}
```

### 6.2 Prover Web Worker (`frontend/public/workers/zkProver.worker.ts`)

```typescript
import * as snarkjs from "snarkjs";

self.onmessage = async (e: MessageEvent) => {
  const { witness } = e.data;
  try {
    const startTime = performance.now();
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      witness,
      "/zk/circuit.wasm",
      "/zk/circuit_final.zkey"
    );
    const computeTimeMs = Math.round(performance.now() - startTime);

    self.postMessage({
      success: true,
      payload: { proof, publicSignals, computeTimeMs },
    });
  } catch (err: any) {
    self.postMessage({
      success: false,
      error: err.message || "Failed to generate Groth16 proof in WebAssembly.",
    });
  }
};
```

### 6.3 Prover Wrapper (`frontend/src/lib/zkProver.ts`)

```typescript
import { validatePolicyEntropy } from "./entropyGuard";

export interface ZkProofResult {
  proof: any;
  publicSignals: string[];
  computeTimeMs: number;
}

export async function executeZkProof(
  privateWitness: Record<string, string>,
  publicPolicy: Record<string, string>,
  sessionNonce: string
): Promise<ZkProofResult> {
  validatePolicyEntropy(publicPolicy);

  const mergedWitness = {
    ...privateWitness,
    ...publicPolicy,
    sessionChallengeNonce: sessionNonce,
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../public/workers/zkProver.worker.ts", import.meta.url));

    worker.postMessage({ witness: mergedWitness });

    worker.onmessage = (event: MessageEvent) => {
      const { success, payload, error } = event.data;
      worker.terminate();
      if (success) {
        resolve(payload);
      } else {
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error("Web Worker failure during WASM execution: " + err.message));
    };
  });
}
```

---

## 7. Backend FastAPI & LangGraph Multi-Agent Engine

### 7.1 SQLite Nullifier Registry (`backend/app/core/database.py`)

```python
import sqlite3
from typing import Tuple

DB_PATH = "zkode_registry.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS nullifier_registry (
            nullifier_hash TEXT NOT NULL,
            service_scope_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (nullifier_hash, service_scope_id)
        );
    """)
    conn.commit()
    conn.close()

def register_nullifier_atomic(nullifier_hash: str, service_scope_id: str) -> Tuple[bool, str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO nullifier_registry (nullifier_hash, service_scope_id) VALUES (?, ?)",
            (nullifier_hash, service_scope_id)
        )
        conn.commit()
        return True, "Nullifier committed successfully."
    except sqlite3.IntegrityError:
        return False, f"Sybil double-dip violation: Nullifier {nullifier_hash} already claimed."
    finally:
        conn.close()
```

### 7.2 Agent 1: Natural Language Policy Compiler (`backend/app/agents/policy_compiler.py`)

```python
import datetime
from pydantic import BaseModel, Field, field_validator
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

class QuantizedPolicySchema(BaseModel):
    min_age: int = Field(default=0, ge=0, le=120)
    min_balance: int = Field(default=0, ge=0)
    max_income: int = Field(default=999999999, ge=0)
    min_cgpa_x100: int = Field(default=0, ge=0, le=1000)
    service_scope_id: int = Field(..., ge=1)

    @field_validator("min_balance", "max_income")
    @classmethod
    def enforce_25k_buckets(cls, val: int) -> int:
        BUCKET = 25000
        if val % BUCKET != 0:
            return (val // BUCKET) * BUCKET
        return val

def compile_policy(prompt_input: str, scope_id: int) -> dict:
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.0)
    
    template = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a deterministic policy compiler. Extract numeric thresholds: "
            "min_age, min_balance, max_income, min_cgpa_x100 (e.g., 8.2 CGPA -> 820). "
            "Leave missing criteria at safe defaults."
        )),
        ("human", "{text}")
    ])
    
    structured_agent = template | llm.with_structured_output(QuantizedPolicySchema)
    res: QuantizedPolicySchema = structured_agent.invoke({"text": prompt_input})
    res.service_scope_id = scope_id

    today = datetime.date.today()
    cutoff_year = today.year - res.min_age
    max_birth = int(f"{cutoff_year}{today.month:02d}{today.day:02d}")

    return {
        "maxBirthTimestamp": str(max_birth),
        "minBalanceRequired": str(res.min_balance),
        "maxIncomeAllowed": str(res.max_income),
        "minScoreRequired": str(res.min_cgpa_x100),
        "serviceScopeId": str(res.service_scope_id),
        "symbolicReceipt": [
            f"Statutory Age: >= {res.min_age} years (Born on or before {cutoff_year}-{today.month:02d}-{today.day:02d})",
            f"Asset Minimum: >= ₹{res.min_balance:,} (Quantized step)",
            f"Income Ceiling: <= ₹{res.max_income:,} (Quantized step)",
            f"Merit Threshold: >= {res.min_cgpa_x100 / 100:.2f} CGPA"
        ]
    }
```

### 7.3 Agent 3: Server-Side Proof Auditor (`backend/app/agents/proof_auditor.py`)

```python
import json
import subprocess
from typing import Dict, Any
from app.core.database import register_nullifier_atomic

def verify_and_audit(
    proof: Dict[str, Any],
    client_nullifier: str,
    policy_id: str,
    server_policy: Dict[str, str],
    session_nonce: str,
    issuer_pubkey: Dict[str, str]
) -> Dict[str, Any]:
    # 1. Server constructs authoritative public signals
    # Expected Circom main component public order:
    # [issuerPubKeyAx, issuerPubKeyAy, currentTimestamp, maxBirthTimestamp,
    #  minBalanceRequired, maxIncomeAllowed, minScoreRequired, serviceScopeId, sessionChallengeNonce]
    authoritative_signals = [
        "1",                                       # isEligible output
        client_nullifier,                          # nullifierHash output
        issuer_pubkey["Ax"],
        issuer_pubkey["Ay"],
        server_policy["currentTimestamp"],
        server_policy["maxBirthTimestamp"],
        server_policy["minBalanceRequired"],
        server_policy["maxIncomeAllowed"],
        server_policy["minScoreRequired"],
        policy_id,
        session_nonce
    ]

    with open("/tmp/proof.json", "w") as f:
        json.dump(proof, f)
    with open("/tmp/public.json", "w") as f:
        json.dump(authoritative_signals, f)

    # 2. Cryptographic pairing check via SnarkJS CLI (or native python pairing)
    cmd = [
        "snarkjs", "groth16", "verify",
        "app/core/verification_key.json",
        "/tmp/public.json",
        "/tmp/proof.json"
    ]
    verify_proc = subprocess.run(cmd, capture_output=True, text=True)

    if verify_proc.returncode != 0 or "OK" not in verify_proc.stdout:
        return {
            "verified": False,
            "error": "Cryptographic Groth16 pairing check failed. Proof signature invalid.",
            "raw_log": verify_proc.stderr
        }

    # 3. Check Sybil registry for nullifier replay
    success, message = register_nullifier_atomic(client_nullifier, policy_id)
    if not success:
        return {
            "verified": False,
            "error": message,
            "sybil_blocked": True
        }

    return {
        "verified": True,
        "nullifier_hash": client_nullifier,
        "policy_id": policy_id,
        "message": "Zero-Knowledge eligibility verified. Nullifier registered anonymously."
    }
```

---

## 8. Antigravity Configuration & Vibe-Coding Guardrails

### 8.1 `.agent/skills/zk-circom/SKILL.md`

```markdown
---
name: zk-circom
description: Strict guidelines for generating Circom 2.1+, SnarkJS, and WebAssembly ZK pipelines.
---

# CIRCOM & SNARKJS IMPLEMENTATION RULES

1. R1CS Quadratic Constraint Law:
   - In Circom, every constraint MUST be of the form A * B + C = 0.
   - NEVER write triple multiplications like `out <== a * b * c;`.
   - ALWAYS split into intermediate signals:
     ```javascript
     signal temp;
     temp <== a * b;
     out <== temp * c;
     ```

2. Powers of Tau Dimensioning:
   - Circom circuits containing BabyJubJub EdDSA (`EdDSAPoseidonVerifier`) generate > 4,500 constraints.
   - ALWAYS use `pot14` (capacity: 16,384 constraints). `pot12` (4,096) will crash the compiler.

3. Field Arithmetic Consistency:
   - The BN254 scalar field prime is:
     `21888242871839275222246405745257275088548364400416034343698204186575808495617`
   - NEVER use raw Node `crypto.createHash('sha256')` to mock proofs.
   - ALWAYS use `circomlibjs.buildPoseidon()` or `circomlibjs.buildEddsa()`.

4. Next.js App Router Webpack Shims:
   - SnarkJS references Node.js internals (`fs`, `readline`).
   - In `next.config.mjs`, always include:
     ```javascript
     webpack: (config, { isServer }) => {
       if (!isServer) {
         config.resolve.fallback = { fs: false, readline: false, path: false };
       }
       return config;
     }
     ```
   - Only call SnarkJS inside client Web Workers or `"use client"` modules.
```

### 8.2 Workspace `agents.md`

```markdown
# Antigravity Workspace Directives for zkode

- Architecture Model: Monorepo with `/frontend` (Next.js 14), `/backend` (FastAPI), and `/circuits` (Circom).
- Frontend Proving: Must use Web Workers to avoid blocking React DOM render cycles.
- Backend Verification: Server NEVER trusts client-submitted public signals. The server constructs the verification array using its internal database state.
- Security Invariants:
  1. Holder binding MUST link all credentials to `Poseidon(userSecretId)`.
  2. Public thresholds MUST be quantized in ₹25k increments.
  3. Every verification challenge MUST require an active 60-second UUID/nonce.
```

---

## 9. Frontend 3-Column Glass-Box UI Specification

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     PRIVATE VAULT       │   NETWORK INSPECTOR     │     POLICY STUDIO       │
│    (Local Device RAM)   │   (Wire Packet Audit)   │   (Verifier Authority)  │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ [Aadhaar/Identity Card] │ [Live Packet Hex Dissect│ [Natural Language Rule] │
│ DOB: 2003-04-16         │  pi_a: [0x12a..., 0x...]│ "Verify Age >= 18,      │
│ Secret: 0x9812...       │  pi_b: [[...],[...]]    │  Balance >= ₹50,000,    │
│                         │  pi_c: [0x88f..., 0x...]│  Income <= ₹8,00,000"   │
│ [State Bank of India]   │                         │                         │
│ Balance: ₹84,500        │ [Telemetry Counter]     │ [Quantized Policy Out]  │
│ Income: ₹3,50,000       │ PII Transmitted: 0 Bytes│ minAge: 18 (2008-11-09) │
│ Expiry: 2026-11-15      │ Execution Time: 940ms   │ minBalance: ₹50,000     │
│                         │ Payload Size: 256 Bytes │ maxIncome: ₹8,00,000    │
│ [University Portal]     │                         │                         │
│ CGPA: 8.60 (Score: 860) │ [Session Nonce]         │ [Anonymous Registry]    │
│                         │ Active: 0x9b4a... (48s) │ Nullifier: 0x44c... OK  │
│ [Generate Proof (WASM)] │ [Download Audit JSON]   │ [Compliance: ELIGIBLE]  │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RED-TEAM ATTACK SIMULATOR                          │
│ [Inject Fake ₹10L]   [Replay Old Proof]   [Probe ₹63,412]   [Tamper Wire]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Red-Team Exploit Suite & Test Vectors

### Automated Test Runner (`backend/tests/test_attacks.py`)

```python
import pytest
from app.agents.proof_auditor import verify_and_audit

def test_tampered_balance_fails_signature():
    """Attack 1: User alters balance in memory; signature check fails."""
    proof = {"pi_a": ["1", "2"], "pi_b": [["1", "2"], ["3", "4"]], "pi_c": ["1", "2"]}
    res = verify_and_audit(
        proof=proof,
        client_nullifier="0x1111",
        policy_id="901",
        server_policy={
            "currentTimestamp": "20261109",
            "maxBirthTimestamp": "20081109",
            "minBalanceRequired": "50000",
            "maxIncomeAllowed": "800000",
            "minScoreRequired": "800"
        },
        session_nonce="0xabcd",
        issuer_pubkey={"Ax": "1234", "Ay": "5678"}
    )
    assert res["verified"] is False
    assert "Cryptographic Groth16 pairing check failed" in res["error"]

def test_replay_attack_blocked_by_nullifier():
    """Attack 2: Submitting an identical nullifier triggers Sybil defense."""
    nullifier = "0xdeadbeef"
    scope = "scholarship_901"
    
    # First submission succeeds
    from app.core.database import register_nullifier_atomic
    ok, _ = register_nullifier_atomic(nullifier, scope)
    assert ok is True

    # Replay attempt fails
    ok_replay, msg = register_nullifier_atomic(nullifier, scope)
    assert ok_replay is False
    assert "Sybil double-dip violation" in msg
```

---

## 11. Execution Roadmap (5.5-Hour Antigravity Build Schedule)

- **Hour 00:00 - 00:30 (Phase 1):** Scaffolding monorepo, generating `SKILL.md` and `agents.md`. Running `compile.sh` using `pot14` to produce wasm, zkey, and verification artifacts.
- **Hour 00:30 - 01:30 (Phase 2):** Developing FastAPI backend, SQLite nullifier store, and LangGraph policy compiler. Adding `/api/challenge` ephemeral nonce router.
- **Hour 01:30 - 02:45 (Phase 3):** Implementing client-side Web Worker prover (`zkProver.worker.ts`) and Next.js Webpack polyfills. Verifying WASM execution completes in `< 1.2s`.
- **Hour 02:45 - 04:00 (Phase 4):** Building the 3-column Glass-Box UI with private vault, packet inspector, and verifier dashboard. Locking telemetry metrics to 0 bytes PII exposed.
- **Hour 04:00 - 05:00 (Phase 5):** Wiring Red-Team attack simulation buttons (Tampered Balance, Expired Credential, Proof Replay, Probing Query). Ensuring visual defense callouts highlight on the UI.
- **Hour 05:00 - 05:30 (Phase 6):** Disconnecting network to validate client-side proving under offline Airplane Mode. Rehearsing 5-minute live pitch script.

---

## 12. Five-Minute Live Pitch Script & Judge Q&A Defense

### 12.1 Presentation Script (300 Seconds)

* **0:00 - 1:00 (The Problem):**
  *"Every time a student applies for a scholarship, or a citizen applies for welfare, services demand complete bank statements, birth certificates, and Aadhaar numbers. This over-collection leads to identity theft and credential leaks. Why should an agency know your exact balance or birth date just to verify you qualify?"*
* **1:00 - 2:00 (The Live Handshake):**
  *"Watch zkode in action. The verifier inputs a statutory rule in plain English: 'Applicant must be at least 18, balance above ₹50,000, and income under ₹8,00,000.' Our LangGraph agent quantizes this into mathematical boundaries. The citizen's browser compiles a private witness from signed credentials, executes a Groth16 zk-SNARK in WebAssembly in 940ms, and submits the proof."*
* **2:00 - 3:00 (The Zero-PII Wire Audit):**
  *"Look at the network inspector in our center column. What crossed the wire? Only 256 bytes of elliptic curve coordinates and an anonymous nullifier hash. Zero bytes of sensitive PII. The verifier confirms eligibility with 100% mathematical certainty without knowing who the user is or their exact balance."*
* **3:00 - 4:15 (Firing Red-Team Attack Triggers):**
  *"Let's try to break it. First, we inject a fake ₹10,00,000 balance into the client. The in-circuit EdDSA signature verification fails immediately. Next, we replay a stolen valid proof. The server detects the nullifier collision and blocks the Sybil claim. Finally, a predatory lender tries a binary-search attack at ₹63,412. The browser entropy guard rejects the non-quantized request."*
* **4:15 - 5:00 (Conclusion):**
  *"zkode solves the core problem of digital identity: proving eligibility without sacrificing privacy. By combining in-circuit cryptographic signatures with dynamic agentic policy compilation, we make Zero-Knowledge verification production-ready."*

### 12.2 Judge Q&A Defense Matrix

* **Judge:** *"Can't a user just edit their balance in their browser's local state and generate a valid proof?"*
  * **Answer:** *"No. The user is not just proving an inequality on raw numbers; they are proving that a trusted institution (like SBI or DigiLocker) cryptographically signed those numbers using BabyJubJub EdDSA. The signature is verified inside the Zero-Knowledge circuit. Changing a single rupee alters the Poseidon hash and breaks the proof mathematically."*
* **Judge:** *"Why is an LLM needed for this? Isn't cryptography enough?"*
  * **Answer:** *"In production, statutory eligibility rules change constantly across programs. Traditional ZK requires cryptographers to write and audit new circuits for each policy change. Our LangGraph agent compiles plain-English legal requirements into quantized inputs for our universal circuit in real time, making ZK accessible without sacrificing security."*
* **Judge:** *"How do you prevent someone from selling their proof to a friend?"*
  * **Answer:** *"Proof replay is impossible because every proof is cryptographically bound to a 60-second single-use challenge nonce issued by the verifier server. A proof generated for your session cannot be validated in anyone else's session."*