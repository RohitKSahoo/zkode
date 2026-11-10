# zkode: Backend Schema & API Specification (`backendschema.md`)

## 1. Overview
The `zkode` backend is built on **FastAPI (Python 3.11)** with **SQLite** for atomic state persistence and **LangGraph / ChatGroq** for dynamic policy compilation. It enforces strict server-authoritative public signal reconstruction: the server **never trusts client-supplied public signals** for Groth16 verification.

---

## 2. Database Schema (SQLite)

Database file: `zkode_registry.db`

### 2.1 Table: `nullifier_registry`
Stores spent nullifiers to prevent Sybil attacks and double-dipping across campaigns.

```sql
CREATE TABLE IF NOT EXISTS nullifier_registry (
    nullifier_hash TEXT NOT NULL,
    service_scope_id TEXT NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_nonce_used TEXT NOT NULL,
    PRIMARY KEY (nullifier_hash, service_scope_id)
);

CREATE INDEX IF NOT EXISTS idx_nullifier_lookup 
ON nullifier_registry (nullifier_hash, service_scope_id);
```

### 2.2 Table: `challenge_sessions`
Tracks ephemeral 60-second challenge nonces issued to clients for replay prevention.

```sql
CREATE TABLE IF NOT EXISTS challenge_sessions (
    session_id TEXT PRIMARY KEY,
    session_nonce TEXT NOT NULL UNIQUE,
    service_scope_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,  -- Unix timestamp in milliseconds
    expires_at INTEGER NOT NULL,  -- Unix timestamp in milliseconds
    is_consumed INTEGER DEFAULT 0 -- 0 = active, 1 = consumed
);

CREATE INDEX IF NOT EXISTS idx_challenge_nonce 
ON challenge_sessions (session_nonce);
```

### 2.3 Table: `compiled_policies`
Caches compiled policy specifications with their statutory receipts.

```sql
CREATE TABLE IF NOT EXISTS compiled_policies (
    policy_id TEXT PRIMARY KEY,
    raw_prompt TEXT NOT NULL,
    service_scope_id TEXT NOT NULL,
    max_birth_timestamp TEXT NOT NULL,
    min_balance_required INTEGER NOT NULL,
    max_income_allowed INTEGER NOT NULL,
    min_score_required INTEGER NOT NULL,
    symbolic_receipt TEXT NOT NULL, -- JSON-serialized array of strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Pydantic Models & Data Contracts

### 3.1 Policy Schemas (`app/schemas/policy.py`)

```python
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional

QUANTIZATION_BUCKET = 25000

class CompilePolicyRequest(BaseModel):
    prompt: str = Field(
        ..., 
        example="Applicant must be at least 18 years old, have balance >= ₹50,000, and annual income <= ₹8,00,000"
    )
    service_scope_id: str = Field(..., example="901")

class QuantizedPolicySchema(BaseModel):
    min_age: int = Field(default=0, ge=0, le=120)
    min_balance: int = Field(default=0, ge=0)
    max_income: int = Field(default=999999999, ge=0)
    min_cgpa_x100: int = Field(default=0, ge=0, le=1000)
    service_scope_id: str = Field(default="1")

    @field_validator("min_balance", "max_income")
    @classmethod
    def enforce_25k_buckets(cls, val: int) -> int:
        if val == 999999999:
            return val
        if val % QUANTIZATION_BUCKET != 0:
            return (val // QUANTIZATION_BUCKET) * QUANTIZATION_BUCKET
        return val

class CompiledPolicyResponse(BaseModel):
    success: bool
    policy_id: str
    serviceScopeId: str
    currentTimestamp: str           # YYYYMMDD
    maxBirthTimestamp: str          # YYYYMMDD
    minBalanceRequired: str         # Quantized string
    maxIncomeAllowed: str           # Quantized string
    minScoreRequired: str           # Scaled CGPA string
    symbolicReceipt: List[str]      # Plain English audit lines
```

### 3.2 Ephemeral Challenge Schemas

```python
class ChallengeResponse(BaseModel):
    sessionId: str
    sessionNonce: str               # 254-bit field friendly decimal string
    expiresAt: int                  # Unix epoch ms
    ttlSeconds: int = 60
```

### 3.3 Proof & Verification Schemas

```python
class Groth16Proof(BaseModel):
    pi_a: List[str]                 # [X, Y, 1]
    pi_b: List[List[str]]           # [[X0, X1], [Y0, Y1], [1, 0]]
    pi_c: List[str]                 # [X, Y, 1]
    protocol: str = "groth16"
    curve: str = "bn128"

class VerifyProofRequest(BaseModel):
    proof: Groth16Proof
    clientNullifier: str            # Output signal 2
    serviceScopeId: str
    sessionNonce: str

class VerifyProofResponse(BaseModel):
    verified: bool
    nullifierHash: Optional[str] = None
    serviceScopeId: Optional[str] = None
    message: str
    error: Optional[str] = None
    sybilBlocked: bool = False
    telemetry: Dict[str, Any]       # Verification latency, pairing result, bytes checked
```

### 3.4 Mock Credential Minting Schemas

```python
class MintCredentialRequest(BaseModel):
    userSecretId: str               # Citizen master secret
    birthTimestamp: str             # YYYYMMDD
    actualBalance: str              # INR
    actualIncome: str               # INR
    creditOrCgpaScore: str          # Scaled score (e.g. 860)
    expirationTimestamp: str        # YYYYMMDD

class BabyJubJubSignature(BaseModel):
    sigR8x: str
    sigR8y: str
    sigS: str

class IssuerPubKey(BaseModel):
    Ax: str
    Ay: str

class MintCredentialResponse(BaseModel):
    success: bool
    issuerPubKey: IssuerPubKey
    credential: Dict[str, str]
    error: Optional[str] = None
```

---

## 4. Complete REST API Endpoints Specification

### 4.1 `GET /api/health`
Verifies backend status and cryptographic artifacts readiness.
* **Method:** `GET`
* **Response (200 OK):**
```json
{
  "status": "healthy",
  "verificationKeyLoaded": true,
  "databaseConnected": true,
  "groqAgentReady": true,
  "serverTime": "2026-11-10T09:05:00Z"
}
```

---

### 4.2 `GET /api/challenge`
Generates a cryptographically strong, 60-second single-use challenge nonce bound to BN254 scalar field.
* **Method:** `GET`
* **Query Params:** `scope_id` (optional, default `"901"`)
* **Logic:**
  1. Generate 240 bits of cryptographically secure random entropy: `secrets.randbits(240)`.
  2. Format as decimal string.
  3. Store in `challenge_sessions` with `expires_at = now + 60000`.
* **Response (200 OK):**
```json
{
  "sessionId": "4a7f93b2-601e-4cb8-8c10-0d7e41528b12",
  "sessionNonce": "14839201948572019485720194857201948572019485720",
  "expiresAt": 1794283860000,
  "ttlSeconds": 60
}
```

---

### 4.3 `POST /api/policy/compile`
Uses LangGraph + Llama-3.3-70B via Groq to extract and quantize policy constraints from natural language.
* **Method:** `POST`
* **Request Body:**
```json
{
  "prompt": "Scholarship applicant must be at least 18 years old, maintain a bank balance of at least ₹50,000, family annual income under ₹8,00,000, and academic score >= 8.2 CGPA.",
  "service_scope_id": "901"
}
```
* **Processing:**
  1. LLM extracts: `min_age: 18`, `min_balance: 50000`, `max_income: 800000`, `min_cgpa_x100: 820`.
  2. Quantizer applies step modulo 25,000.
  3. Computes `maxBirthTimestamp` using server date: `YYYY - 18` -> `20081110`.
  4. Stores record in `compiled_policies`.
* **Response (200 OK):**
```json
{
  "success": true,
  "policy_id": "pol_901_20261110",
  "serviceScopeId": "901",
  "currentTimestamp": "20261110",
  "maxBirthTimestamp": "20081110",
  "minBalanceRequired": "50000",
  "maxIncomeAllowed": "800000",
  "minScoreRequired": "820",
  "symbolicReceipt": [
    "Statutory Age: >= 18 years (Born on or before 2008-11-10)",
    "Asset Minimum: >= ₹50,000 (Quantized step ₹25k)",
    "Income Ceiling: <= ₹8,00,000 (Quantized step ₹25k)",
    "Merit Threshold: >= 8.20 CGPA (Scaled x100)"
  ]
}
```

---

### 4.4 `POST /api/verify`
The core Zero-Knowledge verification endpoint.
* **Method:** `POST`
* **Request Body:**
```json
{
  "proof": {
    "pi_a": ["0x12a...", "0x09b...", "1"],
    "pi_b": [["0x111...", "0x222..."], ["0x333...", "0x444..."], ["1", "0"]],
    "pi_c": ["0x88f...", "0x77e...", "1"],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "clientNullifier": "19482938472910384729104857291048572910485729",
  "serviceScopeId": "901",
  "sessionNonce": "14839201948572019485720194857201948572019485720"
}
```
* **Server Verification Pipeline:**
  1. **Nonce Validation:** Checks that `sessionNonce` exists in `challenge_sessions`, is not consumed, and `now < expires_at`. Immediately marks as consumed.
  2. **Authoritative Public Signal Reconstruction:** Server fetches the active policy for `serviceScopeId`. Reconstructs the exact signal vector matching the Circom main component:
     ```python
     authoritative_signals = [
         "1",                         # [0] output: isEligible
         req.clientNullifier,         # [1] output: nullifierHash
         ISSUER_PUBKEY_AX,            # [2] input: issuerPubKeyAx
         ISSUER_PUBKEY_AY,            # [3] input: issuerPubKeyAy
         server_policy["currentTimestamp"],     # [4]
         server_policy["maxBirthTimestamp"],    # [5]
         server_policy["minBalanceRequired"],   # [6]
         server_policy["maxIncomeAllowed"],     # [7]
         server_policy["minScoreRequired"],     # [8]
         req.serviceScopeId,          # [9]
         req.sessionNonce             # [10]
     ]
     ```
  3. **Cryptographic Pairing Verification:** Calls `snarkjs groth16 verify app/core/verification_key.json public.json proof.json`.
  4. **Sybil Atomic Registry:** Performs atomic SQL insert into `nullifier_registry`. If primary key duplicate, raises Sybil double-dipping alert.
* **Response (200 OK - Success):**
```json
{
  "verified": true,
  "nullifierHash": "19482938472910384729104857291048572910485729",
  "serviceScopeId": "901",
  "message": "Zero-Knowledge eligibility verified. Nullifier registered anonymously.",
  "sybilBlocked": false,
  "telemetry": {
    "pairingResult": "OK",
    "verificationTimeMs": 28,
    "piiTransmittedBytes": 0
  }
}
```
* **Response (400 Bad Request - Sybil Double Dip):**
```json
{
  "verified": false,
  "error": "Sybil double-dip violation: Nullifier already claimed for this service scope.",
  "sybilBlocked": true
}
```
* **Response (400 Bad Request - Invalid Proof / Nonce):**
```json
{
  "verified": false,
  "error": "Cryptographic Groth16 pairing check failed. Proof signature invalid.",
  "sybilBlocked": false
}
```

---

### 4.5 `POST /api/crypto/mint` (Mock Issuer)
Implements BabyJubJub EdDSA signing of composite citizen credentials. Runs in backend or Next.js route handler.
* **Method:** `POST`
* **Request Body:**
```json
{
  "userSecretId": "981273918237192837129837192837",
  "birthTimestamp": "20030416",
  "actualBalance": "84500",
  "actualIncome": "350000",
  "creditOrCgpaScore": "860",
  "expirationTimestamp": "20261115"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "issuerPubKey": {
    "Ax": "1846294719203948571920394857192039485719203948571920394857",
    "Ay": "928374910293847561029384756102938475610293847561029384756"
  },
  "credential": {
    "userSecretId": "981273918237192837129837192837",
    "birthTimestamp": "20030416",
    "actualBalance": "84500",
    "actualIncome": "350000",
    "creditOrCgpaScore": "860",
    "expirationTimestamp": "20261115",
    "sigR8x": "1029384756102938475610293847561029384756",
    "sigR8y": "9847291038472910384729103847291038472910",
    "sigS": "4829103847291038472910485729104857291048"
  }
}
```

