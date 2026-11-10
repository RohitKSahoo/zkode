# zkode: Engineering Implementation Guide (`implementation.md`)

## 1. Overview & Monorepo Setup
This document serves as the tactical implementation blueprint for building `zkode`. It details the exact sequence of commands, file creations, and configurations necessary to bring the system from zero to a fully functional hackathon demo.

---

## 2. Environment Prerequisites

### 2.1 Required Toolchains
1. **Node.js:** v18.18+ or v20+ with `npm` or `pnpm`
2. **Python:** v3.11 with `pip` and `venv`
3. **Rust & Cargo:** Required to compile `circom` if not already installed
4. **Circom 2.1.6+:**
   ```bash
   # If circom is not installed:
   git clone https://github.com/iden3/circom.git
   cd circom
   cargo build --release
   cargo install --path circom
   ```
5. **SnarkJS CLI:**
   ```bash
   npm install -g snarkjs
   ```

---

## 3. Phase 1: Cryptographic Circuits (`circuits/`)

### Step 1.1: Initialize Circuits Directory & Dependencies
```bash
mkdir -p circuits
cd circuits
npm init -y
npm install circomlib@^2.0.5 circomlibjs@^0.1.7 snarkjs@^0.7.4
```

### Step 1.2: Implement `universal_eligibility_v2.circom`
Create `circuits/universal_eligibility_v2.circom` using the complete code provided in `plan.md` Section 3. Key invariants to maintain:
* Must use `Poseidon(1)` for `userSecretId` holder commitment.
* Must verify `EdDSAPoseidonVerifier()` with `sigR8x, sigR8y, sigS` as private signals.
* Public signals list must match the main component public definition:
  ```javascript
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

### Step 1.3: Circuit Compilation & Trusted Setup Script (`compile.sh`)
Create `circuits/compile.sh` and make executable:
```bash
chmod +x compile.sh
./compile.sh
```
*Note for Windows users:* Run in Git Bash or WSL:
```bash
bash compile.sh
```

**Verification Check:** After running, verify that:
* `frontend/public/zk/circuit.wasm` exists (~1.5 MB).
* `frontend/public/zk/circuit_final.zkey` exists (~2-3 MB).
* `frontend/public/zk/verification_key.json` exists (~3 KB).
* `backend/app/core/verification_key.json` exists.

---

## 4. Phase 2: Backend Core & Multi-Agent Compiler (`backend/`)

### Step 2.1: Python Environment & Dependencies
```bash
cd backend
python -m venv venv

# Windows activate:
venv\Scripts\activate
# Linux/macOS activate:
# source venv/bin/activate

pip install -r requirements.txt
```

`backend/requirements.txt`:
```text
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
langchain-core>=0.1.30
langchain-groq>=0.0.1
langgraph>=0.0.26
python-dotenv>=1.0.1
pytest>=8.0.0
httpx>=0.27.0
```

### Step 2.2: Environment Configuration (`backend/.env`)
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Step 2.3: SQLite Database Layer (`app/core/database.py`)
Implement the database module to initialize tables (`nullifier_registry`, `challenge_sessions`, `compiled_policies`) and provide atomic registration functions as specified in `backendschema.md`.

### Step 2.4: Agent 1: Natural Language Policy Compiler (`app/agents/policy_compiler.py`)
Uses LangChain with `ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.0)` and `with_structured_output(QuantizedPolicySchema)` to enforce ₹25,000 buckets and calculate statutory birthdate cutoffs.

### Step 2.5: Agent 3: Groth16 Proof Auditor (`app/agents/proof_auditor.py`)
Reconstructs authoritative public signals, writes temporary files to `tempfile` / `/tmp`, and invokes `snarkjs groth16 verify app/core/verification_key.json public.json proof.json`.

### Step 2.6: FastAPI Application (`app/main.py`)
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.schemas.policy import (
    CompilePolicyRequest, 
    VerifyProofRequest, 
    ChallengeResponse
)
from app.agents.policy_compiler import compile_policy
from app.agents.proof_auditor import verify_and_audit
import secrets
import time

app = FastAPI(title="zkode Backend", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "zkode-backend"}

@app.get("/api/challenge", response_model=ChallengeResponse)
def get_challenge(scope_id: str = "901"):
    nonce = str(secrets.randbits(240))
    session_id = secrets.token_hex(16)
    expires_at = int(time.time() * 1000) + 60000
    # Store in challenge_sessions table
    return ChallengeResponse(
        sessionId=session_id,
        sessionNonce=nonce,
        expiresAt=expires_at,
        ttlSeconds=60
    )

@app.post("/api/policy/compile")
def post_compile_policy(req: CompilePolicyRequest):
    try:
        compiled = compile_policy(req.prompt, int(req.service_scope_id))
        return {"success": True, **compiled}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify")
def post_verify(req: VerifyProofRequest):
    result = verify_and_audit(
        proof=req.proof.dict(),
        client_nullifier=req.clientNullifier,
        policy_id=req.serviceScopeId,
        session_nonce=req.sessionNonce
    )
    if not result.get("verified"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result
```

---

## 5. Phase 3: Frontend Sandbox & Web Worker Prover (`frontend/`)

### Step 3.1: Next.js 14 Initialization
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install circomlibjs@^0.1.7 snarkjs@^0.7.4 lucide-react clsx tailwind-merge framer-motion zustand
```

### Step 3.2: Webpack Shims for SnarkJS (`next.config.mjs`)
SnarkJS references Node `fs`, `path`, and `readline`. Update `next.config.mjs`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        readline: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
```

### Step 3.3: Mock Issuer Route (`src/app/api/crypto/mint/route.ts`)
Implement the BabyJubJub EdDSA credential signer as specified in `plan.md` Section 5 using `circomlibjs`.

### Step 3.4: Prover Web Worker (`public/workers/zkProver.worker.ts`)
Copy the Web Worker script from `plan.md` Section 6.2 into `public/workers/zkProver.worker.ts`.

### Step 3.5: Prover Client Wrapper & Entropy Guard
* Implement `src/lib/entropyGuard.ts` for ₹25k bucket assertion and 4s rate-limiting.
* Implement `src/lib/witnessBuilder.ts` to merge citizen private signals with server public signals.
* Implement `src/lib/zkProver.ts` to trigger and manage worker threads.

---

## 6. Phase 4: 3-Column Glass-Box UI Assembly

### Step 4.1: Component Layout
Create the main interface components in `src/components/`:
* `PrivateVault.tsx`: Visual cards for Aadhaar, Bank Statement, University CGPA. Pre-flight check and "Generate Proof (WASM)" trigger.
* `NetworkInspector.tsx`: "0 Bytes PII" banner, hex dump of wire packet, active challenge timer bar, download audit JSON.
* `VerifierPortal.tsx`: Natural language policy input with presets, AI compilation status, quantized receipt breakdown, anonymous nullifier ledger.
* `RedTeamAttackBar.tsx`: Sticky bottom bar with 4 exploit buttons.

### Step 4.2: Page Shell (`src/app/page.tsx`)
Render the 3 columns in a responsive 12-column grid (`grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 pb-24`) with `RedTeamAttackBar` fixed at the bottom.

---

## 7. Phase 5: Verification & Attack Testing

### Step 7.1: Automated Backend Test Suite
Run the automated test runner in `backend/`:
```bash
pytest tests/test_attacks.py -v
```
Ensure:
1. `test_tampered_balance_fails_signature`: Passes (pairing fails).
2. `test_replay_attack_blocked_by_nullifier`: Passes (Sybil double-dip blocked).

### Step 7.2: End-to-End Live Verification Checklist
1. Load demo credentials in Private Vault.
2. Click "Compile Policy (Agent)" -> Verify quantized receipt appears.
3. Click "Generate Proof (WASM)" -> Verify compute time is $< 1.2\text{s}$ and proof appears in Center Column.
4. Verify PII gauge shows `0 Bytes`.
5. Click "Submit Proof" -> Verify green "ELIGIBLE (ANONYMOUS)" state.
6. Click "Replay Old Proof" -> Verify amber "Sybil Attack Blocked" error.
7. Click "Inject Fake ₹10L" -> Verify red "In-circuit signature failed" error.
8. Click "Probe ₹63,412" -> Verify shield "Quantization violation" error.

