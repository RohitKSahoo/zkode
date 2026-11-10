# zkode: Application Flow & User Journeys (`appflow.md`)

## 1. Overview
`zkode` demonstrates a real-time, interactive Zero-Knowledge eligibility handshake. The user interface is a unified 3-Column "Glass-Box" dashboard where the citizen's private storage, the public wire transport, and the verifier's authority are displayed side-by-side.

---

## 2. End-to-End Happy Path Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as Citizen (Browser Vault)
    participant UI as Glass-Box Interface
    participant Worker as Web Worker (SnarkJS WASM)
    participant Server as FastAPI Backend
    participant Agent as LangGraph Policy Compiler
    participant DB as SQLite Nullifier Registry

    Note over User,UI: 1. Setup & Credential Initialization
    User->>UI: Load / Mint Mock Verified Credentials
    UI->>UI: Store Credentials in Memory (RAM Only)
    UI->>UI: Holder Commitment = Poseidon(userSecretId)

    Note over Server,Agent: 2. Verifier Policy Compilation
    UI->>Server: POST /api/policy/compile { prompt: "Age >= 18, Balance >= ₹50k..." }
    Server->>Agent: Extract Numeric Rules & Quantize (₹25k Steps)
    Agent-->>Server: Return Quantized Boundaries & Receipt
    Server-->>UI: 200 OK: Compiled Policy + Statutory Receipt

    Note over UI,Server: 3. Ephemeral Challenge Handshake
    UI->>Server: GET /api/challenge?scope_id=901
    Server->>Server: Generate 240-bit Ephemeral Nonce (TTL: 60s)
    Server-->>UI: 200 OK: { sessionNonce, expiresAt: 60s }

    Note over UI,Worker: 4. Offline Client-Side Proving
    UI->>UI: EntropyGuard.validatePolicyEntropy(policy)
    UI->>UI: Construct Merged Witness (Private Claims + Server Signals + Nonce)
    UI->>Worker: postMessage({ witness: mergedWitness })
    Worker->>Worker: snarkjs.groth16.fullProve(circuit.wasm, circuit_final.zkey)
    Worker-->>UI: { proof: (pi_a, pi_b, pi_c), publicSignals, computeTimeMs: ~940ms }

    Note over UI,Server: 5. Wire Inspection & Zero-PII Transmission
    UI->>UI: Render Wire Packet in Center Column (256 Bytes Proof)
    UI->>UI: Display Telemetry: "PII Exposed: 0 Bytes"
    UI->>Server: POST /api/verify { proof, clientNullifier, serviceScopeId, sessionNonce }

    Note over Server,DB: 6. Server-Side Audit & Sybil Check
    Server->>Server: Validate & Consume sessionNonce
    Server->>Server: Reconstruct Public Signal Vector Authoritatively
    Server->>Server: Execute Groth16 Pairing Check (verification_key.json)
    Server->>DB: Atomic Insert: (clientNullifier, serviceScopeId)
    DB-->>Server: Insert Success (Primary Key OK)
    Server-->>UI: 200 OK: { verified: true, nullifierHash, status: "ELIGIBLE" }
    UI->>UI: Highlight Green "ELIGIBLE & ANONYMOUS" State
```

---

## 3. Red-Team Exploit Simulation Flows

### 3.1 Exploit 1: Tampered Balance (Client Memory Injection)
* **Goal:** A dishonest citizen modifies their browser memory from ₹40,000 to ₹10,00,000 to satisfy a high-balance requirement.
* **Flow:**
  1. User clicks **"Inject Fake ₹10L Balance"** in the Red-Team Attack Bar.
  2. UI updates the in-memory `actualBalance = 1000000`.
  3. The citizen clicks **"Generate Proof (WASM)"**.
  4. The Web Worker executes the Circom constraint system:
     * Constraint 1: `holderHasher` computes commitment.
     * Constraint 2: `credHasher` computes `Poseidon(holder, birth, 1000000, ...)`.
     * Constraint 3: `sigVerifier` (`EdDSAPoseidonVerifier`) verifies the Issuer's signature against the new hash.
  5. **FAILURE:** The digital signature was computed by the bank over ₹40,000, not ₹10,00,000.
  6. The Web Worker immediately throws an error: `Error: Assert Failed. In-circuit EdDSA signature verification failed`.
  7. **UI Feedback:** Left Column flashes red: *"Cryptographic Forgery Detected: Credential hash does not match Issuer signature."* Wire packet transmission is aborted.

```mermaid
sequenceDiagram
    actor Attacker as Dishonest User
    participant Vault as Browser Vault
    participant Prover as Circom WASM Engine
    
    Attacker->>Vault: Set actualBalance = 1000000
    Vault->>Prover: Send Witness with Fake Balance
    Prover->>Prover: Compute credHash = Poseidon(..., 1000000, ...)
    Prover->>Prover: Verify EdDSA(issuerPubKey, credHash, sig)
    Note over Prover: Signature was minted for ₹40,000!<br/>Constraint Assertion Fails
    Prover-->>Vault: THROW: Assert Failed (EdDSA check)
    Vault-->>Attacker: Red Alert: Forgery Blocked in Browser RAM
```

---

### 3.2 Exploit 2: Proof Replay & Sybil Double-Dipping
* **Goal:** An attacker intercepts a valid proof over the network and attempts to reuse it to claim the benefit a second time.
* **Flow:**
  1. User clicks **"Replay Old Proof"** in the Attack Bar.
  2. The UI submits the exact same proof and `clientNullifier` that was already registered for `serviceScopeId = 901`.
  3. FastAPI receives `POST /api/verify`.
  4. Nonce validation fails if using an old nonce (expired), OR if attacker generates a new nonce, the Groth16 proof pairing fails because `sessionChallengeNonce` is locked in the proof.
  5. Even if an attacker replays within the 60-second window:
     * Groth16 pairing succeeds.
     * Database step executes:
       ```sql
       INSERT INTO nullifier_registry (nullifier_hash, service_scope_id) VALUES (?, ?);
       ```
     * SQLite raises `sqlite3.IntegrityError: UNIQUE constraint failed: nullifier_registry.nullifier_hash, nullifier_registry.service_scope_id`.
  6. Server returns HTTP 400:
     ```json
     {
       "verified": false,
       "error": "Sybil double-dip violation: Nullifier already claimed for this service scope.",
       "sybilBlocked": true
     }
     ```
  7. **UI Feedback:** Center/Right columns flash amber: *"Sybil Attack Blocked: Duplicate Nullifier Rejected."*

---

### 3.3 Exploit 3: Binary-Search Probing Attack
* **Goal:** A predatory service attempts sequential fine-grained queries (`>= ₹50,000`, `>= ₹75,000`, `>= ₹62,500`) to deduce the user's exact net worth.
* **Flow:**
  1. Attacker verifier sends a policy with `minBalanceRequired = 63412`.
  2. The client-side **Entropy Guard** intercepts the query before passing it to the Web Worker:
     ```typescript
     if (balance % 25000 !== 0) {
       throw new Error("SECURITY EXCEPTION: Asset threshold is not quantized to ₹25,000 increments.");
     }
     ```
  3. Prover execution is instantly aborted locally.
  4. In addition, if queries occur at intervals $< 4$ seconds, the client rate limiter locks the query engine.
  5. **UI Feedback:** Center Column displays shield alert: *"Probing Attack Blocked: Policy query violates ₹25,000 quantization boundary."*

---

### 3.4 Exploit 4: Expired Credential Exploitation
* **Goal:** User attempts to present an expired income certificate from 2024.
* **Flow:**
  1. Credential `expirationTimestamp = 20240101`.
  2. Server provides authoritative `currentTimestamp = 20261110`.
  3. Circom circuit evaluates:
     ```javascript
     component expiryCheck = GreaterEqThan(64);
     expiryCheck.in[0] <== expirationTimestamp; // 20240101
     expiryCheck.in[1] <== currentTimestamp;    // 20261110
     ```
  4. `expiryCheck.out === 0`.
  5. The quadratic accumulator `isEligible <== c3 * scoreCheck.out` evaluates to `0`.
  6. In-circuit assertion `isEligible === 1` fails.
  7. WASM prover throws constraint generation error. Proof cannot be constructed.

---

### 3.5 Offline "Airplane Mode" Demonstration
* **Goal:** Prove to hackathon judges that Zero-Knowledge proof generation occurs 100% locally on the device without pinging any external server.
* **Flow:**
  1. Credentials already loaded into React state.
  2. Presenter disconnects laptop Wi-Fi or opens Chrome DevTools -> Network -> **Offline**.
  3. Presenter clicks **"Generate Proof (WASM)"**.
  4. The background Web Worker runs `snarkjs.groth16.fullProve` entirely in browser memory.
  5. Elapsed timer reaches ~940ms; the 256-byte proof appears in the UI.
  6. Presenter reconnects Wi-Fi and clicks **"Submit Proof to Verifier"**.
  7. Verification succeeds on the server.

---

## 4. Client State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> CredentialsLoaded : Load / Mint Credential
    CredentialsLoaded --> PolicyCompiled : Compile Policy (Agent)
    PolicyCompiled --> NonceAcquired : Fetch Nonce (/api/challenge)
    
    NonceAcquired --> PreFlightChecked : Validate EntropyGuard
    PreFlightChecked --> ProvingWasm : Launch Web Worker
    PreFlightChecked --> ProbingBlocked : Non-Quantized / Rate Limit Exceeded
    
    ProvingWasm --> ProofReady : Groth16 Proved (~940ms)
    ProvingWasm --> ForgeryRejected : In-Circuit EdDSA Fail
    
    ProofReady --> SubmittingToVerifier : POST /api/verify
    SubmittingToVerifier --> VerifiedEligible : Server 200 OK
    SubmittingToVerifier --> SybilRejected : Nullifier Replay 400
    SubmittingToVerifier --> PairingRejected : Signature Invalid 400

    VerifiedEligible --> Idle : Reset
    ProbingBlocked --> Idle : Reset
    ForgeryRejected --> Idle : Reset
    SybilRejected --> Idle : Reset
    PairingRejected --> Idle : Reset
```

---

## 5. Summary Table: User Action to System Reaction

| User Action | Frontend Reaction | Backend Reaction | Security Check |
| :--- | :--- | :--- | :--- |
| **Load Mock ID** | Populate Vault with dummy Aadhaar & Bank data. | None (Client RAM only). | Holder commitment generated: `Poseidon(secret)`. |
| **Type Rule & Compile** | Show streaming typing effect in Policy Studio. | LangGraph / Llama-3.3-70B quantizes rules. | Enforce ₹25k buckets on min/max figures. |
| **Request Nonce** | Store nonce in state; start 60s countdown bar. | Generate 240-bit random nonce in DB. | Expire after 60 seconds; single-use lock. |
| **Click "Generate Proof"** | Spin loader, track elapsed ms in worker. | None (Offline client execution). | In-circuit EdDSA signature & threshold checks. |
| **Click "Submit Proof"** | Animate wire packet from Col 1 -> Col 2 -> Col 3. | Reconstruct signals, run SnarkJS Groth16 verify. | Atomic SQL insertion on `nullifier_registry`. |
| **Trigger Red-Team Exploit** | Highlight compromised variable in red/amber. | Reject proof with explicit error code. | Immediate visual explanation for judges. |

