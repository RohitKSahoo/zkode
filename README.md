# ZKode: Privacy-Preserving Eligibility Verification Platform

Zero-Knowledge Selective Disclosure Engine and Dynamic Statutory Policy Compiler.

---

## 1. Executive Summary

Digital services frequently require users to prove eligibility (such as being of legal age, possessing sufficient account balances, or meeting income ceilings) by uploading unredacted identity documents, physical cards, or bank statements. This practice leads to:

- Over-disclosure of Personal Identifiable Information (PII) including legal names, dates of birth, home addresses, and government ID numbers.
- Centralized data honey-pots that expose massive repositories of sensitive citizen data to security breaches.
- Cross-service tracking and linkability when digital signatures or identity tokens are shared across multiple verifiers.

ZKode replaces raw data transmission with zero-knowledge mathematical verification. By executing zk-SNARK (Groth16) proofs locally inside the user's browser using WebAssembly and Web Workers, ZKode proves compliance with arbitrary threshold criteria while ensuring zero bytes of underlying personal data leave client memory.

---

## 2. Key Architecture Invariants

- Zero PII Transmission: The verifier receives only 256 bytes of elliptic curve coordinates (`pi_a`, `pi_b`, `pi_c`), a scoped nullifier, and a session nonce.
- Client-Side Proving: Witness generation and Groth16 proof synthesis run entirely in client browser memory via WebAssembly and Web Workers, preventing UI thread freezing.
- In-Circuit Signature Verification: Accredited issuer credentials signed with BabyJubjub EdDSA are verified inside the circuit as private inputs. The verifier never sees or logs the issuer signatures.
- Holder Binding: All credentials issued to a citizen bind cryptographically to a single root `holderCommitment = Poseidon(userSecretId)`, preventing users from combining credentials belonging to different people.
- Sybil Defense with Scoped Nullifiers: Deterministic nullifiers `Poseidon(userSecretId, serviceScopeId)` prevent double-claiming within a campaign while preventing cross-service correlation.
- Server-Authoritative Public Signal Reconstruction: The backend verifier never trusts client-submitted public signals. The expected signal vector is reconstructed independently using database state and the active session challenge nonce.
- Entropy Guarding: Financial rules are quantized to increments of 25,000 INR, preventing predatory verifiers from binary-searching user balances through micro-thresholds.

---

## 3. Technology Stack

### Cryptography and Circuits
- Circom 2.1.6+: Domain-specific arithmetic circuit compiler.
- SnarkJS: Groth16 proving, verification, and trusted setup toolchain.
- Elliptic Curves: `alt_bn128` (BN254) for pairing-friendly zk-SNARKs; `BabyJubjub` for SNARK-friendly twisted Edwards curve signatures.
- Hashing and Signatures: Poseidon hash function (algebraic SNARK-optimized) and EdDSAPoseidon.

### Frontend
- Framework: Next.js 14 (App Router) with React and TypeScript.
- Concurrency: Background Web Workers (`zkProver.worker.ts`) for non-blocking WebAssembly cryptographic operations.
- Styling: Tailwind CSS with industrial design language, monospace metrics, and sharp borders.
- Navigation: Barba.js transition manager for client-side state preservation across views.

### Backend
- Framework: Python 3.11+ with FastAPI and Uvicorn.
- Persistence: SQLite with atomic transaction constraints (`UNIQUE(nullifier_hash, service_scope_id)`).
- Agentic Policy Compiler: LangGraph with Groq API (`llama-3.3-70b-versatile`) and deterministic regular expression fallback.
- Cryptographic Verification: Node SnarkJS runner with Python fallback.

### Infrastructure and Automation
- Orchestration: Docker and Docker Compose.
- Automation Scripts: Self-healing launcher (`launch.ps1`, `launch.bat`) with port clearing and auto-fallback between Docker and native runtimes.

---

## 4. End-to-End System Architecture

```text
+--------------------------------------------------------------------------------+
|                          CLIENT BROWSER (Next.js 14)                           |
|                                                                                |
|  +-----------------------+                  +-------------------------------+  |
|  |     Private Vault     |                  |       Network Inspector       |  |
|  |     (Client RAM)      |                  |     (0 Bytes Wire Payload)    |  |
|  |                       |                  |                               |  |
|  | - Date of Birth       |                  | - Groth16 Proof (pi_a, b, c)  |  |
|  | - Liquid Balance      |                  | - Scoped Nullifier Hash       |  |
|  | - Annual Income       |                  | - 60s Session Challenge Nonce |  |
|  | - BabyJubjub EdDSA Sig|                  +-------------------------------+  |
|  +-----------+-----------+                                  ^                  |
|              |                                              |                  |
|              v                                              |                  |
|  +----------------------------------------------------------+---------------+  |
|  |                    Web Worker (snarkjs + WASM)                           |  |
|  |  Generates Groth16 zk-Proof over alt_bn128 curve in ~400-800ms           |  |
|  +--------------------------------------------------------------------------+  |
+---------------------------------------+----------------------------------------+
                                        | POST /api/verify
                                        v (256-byte proof packet)
+--------------------------------------------------------------------------------+
|                       BACKEND VERIFIER SERVICE (FastAPI)                       |
|                                                                                |
|  +--------------------------------------------------------------------------+  |
|  | 1. Nonce Lock: Validate challenge is unexpired (<60s) and single-use     |  |
|  | 2. Sybil Check: Fast lookup in SQLite nullifier ledger for duplicate claim|  |
|  | 3. Authoritative Signal Reconstruction: Server rebuilds public input array|  |
|  | 4. Pairing Equation: Verify e(A, B) = e(alpha, beta) * e(x, gamma) * e.. |  |
|  | 5. Atomic Commit: Lock (nullifier_hash, service_scope_id) in database   |  |
|  +--------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------+
```

---

## 5. Circuit Implementation Details

The core circuit is defined in `circuits/universal_eligibility_v2.circom` and compiles to **8,493 R1CS constraints**.

### Circuit Inputs and Outputs

```text
PRIVATE INPUTS (Stored only in client memory):
  - userSecretId            Master citizen identity seed
  - birthTimestamp          YYYYMMDD format
  - actualBalance           Financial asset balance in INR
  - actualIncome            Annual income in INR
  - creditOrCgpaScore       Score scaled by 100 (e.g., 860 for 8.60 CGPA)
  - expirationTimestamp     Credential validity cutoff date
  - sigR8x, sigR8y, sigS    Issuer BabyJubjub EdDSA signature components

PUBLIC INPUTS (Supplied by server authority):
  - issuerPubKeyAx, Ay      Accredited authority public key coordinates
  - currentTimestamp        Authoritative server date
  - maxBirthTimestamp       Statutory minimum age cutoff date
  - minBalanceRequired      Minimum required balance (quantized)
  - maxIncomeAllowed        Statutory income ceiling (quantized)
  - minScoreRequired        Minimum merit or credit score
  - serviceScopeId          Campaign identifier (e.g., 901)
  - sessionChallengeNonce   60-second anti-replay nonce

PUBLIC OUTPUTS:
  - isEligible              Must be constrained to 1
  - nullifierHash           Poseidon(userSecretId, serviceScopeId)
```

### Circuit Verification Pipeline
1. Holder Commitment: `holderHasher = Poseidon(userSecretId)`.
2. Credential Hash: `credHasher = Poseidon(holderCommitment, birthTimestamp, actualBalance, actualIncome, creditOrCgpaScore, expirationTimestamp)`.
3. In-Circuit EdDSA Verification: Asserts that the credential hash was signed by the issuer public key (`Ax`, `Ay`).
4. Temporal Validity: Asserts `expirationTimestamp >= currentTimestamp`.
5. Statutory Thresholds:
   - `birthTimestamp <= maxBirthTimestamp` (Age check)
   - `actualBalance >= minBalanceRequired` (Asset floor check)
   - `actualIncome <= maxIncomeAllowed` (Income ceiling check)
   - `creditOrCgpaScore >= minScoreRequired` (Merit check)
6. Quadratic Accumulation: All condition outputs are multiplied via R1CS quadratic accumulators and asserted to equal 1: `isEligible === 1`.
7. Scoped Nullifier: Computes `Poseidon(userSecretId, serviceScopeId)` to uniquely flag double-claiming.
8. Nonce Lock: Multiplies `sessionChallengeNonce * sessionChallengeNonce` to prevent compiler optimizations from stripping unused public inputs.

---

## 6. Threat Model and Mitigations

| Attack Vector | Threat Description | Architectural Mitigation |
| :--- | :--- | :--- |
| Frankenstein Collusion | Combining an age credential from Alice with a bank credential from Bob | Holder binding anchors all credentials to a shared `Poseidon(userSecretId)` root |
| Cross-Site Tracking | Digital signatures logged across portals to profile user activity | In-circuit EdDSA verification treats issuer signatures as private inputs |
| Proof Replay Attack | Intercepting a valid proof and submitting it to claim benefits | Ephemeral 60-second challenge nonces consumed immediately upon verification |
| Double Claim / Sybil | An anonymous user claiming a one-time grant repeatedly | Atomic database lock on `(nullifier_hash, service_scope_id)` |
| Binary-Search Probing | Sequential queries (e.g. `>=50k`, `>=75k`) to deduce exact balances | Quantization to 25,000 INR increments enforced by Policy Compiler and Client Entropy Guard |
| Signal Manipulation | Client modifying public inputs (e.g., `minBalanceRequired = 0`) | Server-authoritative signal reconstruction from database state |
| Proof Tampering | Altering cryptographic curve coordinates in transit | Bilinear pairing equation check `e(A, B) = ...` fails immediately |

---

## 7. Repository Layout

```text
zkode/
├── circuits/
│   ├── universal_eligibility_v2.circom  # Core Circom verification circuit
│   ├── compile.sh                       # Trusted setup and compilation script
│   ├── input_mock.json                  # Sample witness data
│   └── build/
│       ├── circuit_final.zkey           # Groth16 proving and evaluation key
│       ├── verification_key.json        # Verification parameters
│       └── universal_eligibility_v2.wasm# Compiled WebAssembly circuit
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                      # FastAPI application entrypoint
│   │   ├── agents/
│   │   │   ├── policy_compiler.py       # LangGraph policy compilation agent
│   │   │   └── proof_auditor.py         # Autonomous verification auditor
│   │   ├── core/
│   │   │   ├── config.py                # System settings and issuer keys
│   │   │   ├── database.py              # SQLite schemas and atomic locks
│   │   │   └── verifier.py              # Authoritative signals and pairing logic
│   │   ├── routes/                      # API endpoints (verify, policy, challenge)
│   │   └── schemas/                     # Pydantic v2 data models
│   └── tests/                           # Pytest unit and integration test suite
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── zk/                          # Static WASM and zkey artifacts
│   │   └── workers/
│   │       └── zkProver.worker.ts       # SnarkJS background proving thread
│   └── src/
│       ├── app/
│       │   ├── page.tsx                 # 3-view application root
│       │   └── api/crypto/mint/route.ts # Mock credential issuance endpoint
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── PrivateVault.tsx         # View 01: Client credentials and proving
│       │   ├── NetworkInspector.tsx     # View 02: 0-byte wire inspection
│       │   ├── VerifierPortal.tsx       # View 03: Policy compiler and verifier
│       │   └── RedTeamAttackBar.tsx     # Interactive exploit simulator
│       └── lib/
│           ├── entropyGuard.ts          # Bucket and rate-limiting guard
│           ├── witnessBuilder.ts        # Witness formatter
│           └── zkProver.ts              # Worker execution wrapper
├── docs/                                # Technical design documents
├── study_docs/                          # Verification phase tracking
├── docker-compose.yml                   # Container orchestration
├── launch.bat                           # Windows batch entrypoint
└── launch.ps1                           # Automated self-healing launcher
```

---

## 8. Installation and Execution

### Automated Launch (Recommended)

Run the root launcher on Windows:

```cmd
launch.bat
```

The script performs the following:
1. Clears existing processes on ports 3000 and 8000.
2. Detects Docker daemon status; starts Docker Desktop if needed and runs `docker compose up --build -d`.
3. If Docker is unavailable, automatically creates Python virtual environments, installs requirements, installs npm packages, and starts both services natively.
4. Polls backend health at `http://localhost:8000/api/health` and opens `http://localhost:3000` in the default browser.

### Manual Setup

#### 1. Circuit Artifact Compilation
```bash
cd circuits
npm install
bash compile.sh
```

#### 2. Backend Service
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Service
```bash
cd frontend
npm install
npm run dev
```

---

## 9. Verification and Test Suites

### Backend Unit and Integration Tests
```bash
cd backend
pytest -v
```
The test suite validates:
- Challenge nonce generation, expiry TTL, and single-use consumption.
- Nullifier deduplication and Sybil conflict handling.
- Public signal reconstruction order.
- LangGraph policy compilation and fallback parsing.

### Frontend Unit and Pipeline Tests
```bash
cd frontend
npm test
```
The test suite validates:
- Client entropy guard bucket checks.
- Witness data alignment and BabyJubjub parameter formatting.
- End-to-end simulated proof generation and verification handshake.

---

## 10. API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and database connectivity |
| `GET` | `/api/challenge` | Issues single-use 60-second challenge nonces |
| `POST` | `/api/policy/compile` | Compiles natural language rules into quantized constraints |
| `POST` | `/api/verify` | Validates Groth16 proofs, checks nonces, and registers nullifiers |
| `POST` | `/api/crypto/mint` | Mints mock credentials signed with BabyJubjub EdDSA |
| `GET` | `/api/ledger` | Returns active anonymous nullifier records for auditing |
| `GET` | `/api/stats` | Telemetry on proofs verified, rejected, and blocked attacks |

---

## 11. License

MIT License.
