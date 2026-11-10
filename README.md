# zkode: Privacy-Preserving Eligibility Verification Platform

> Zero-Knowledge Selective Disclosure Engine & Agentic Statutory Policy Compiler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Circom 2.1](https://img.shields.io/badge/Circom-2.1.6-purple.svg)](https://docs.circom.io/)
[![SnarkJS](https://img.shields.io/badge/SnarkJS-Groth16-blue.svg)](https://github.com/iden3/snarkjs)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688.svg)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Llama_3.3_70B-orange.svg)](https://www.langchain.com/)

---

## 🚀 Overview
**`zkode`** allows citizens to prove eligibility (age, liquid asset minimums, income ceilings, and merit scores) using **client-side zk-SNARKs (Groth16)** running in browser WebAssembly without exposing raw Personal Identifiable Information (PII) such as exact birthdates, bank account balances, or Aadhaar identity salts.

### Key Architectural Invariants
1. **0 Bytes PII Transmitted:** The verifier receives only 256 bytes of elliptic curve coordinates ($\pi_A, \pi_B, \pi_C$) and an anonymous nullifier hash.
2. **Holder Binding:** In-circuit assertion that all multi-domain credentials belong to the same hidden `Poseidon(userSecretId)` citizen anchor.
3. **In-Circuit Signature Verification:** Issuer BabyJubJub EdDSA signatures remain 100% private to prevent cross-service tracking.
4. **Agentic Dynamic Policy Compiler:** Natural language statutory rules compiled in real time to quantized mathematical bounds without circuit recompilation.
5. **Anti-Replay & Sybil Defense:** 60-second single-use challenge nonces with atomic SQLite nullifier deduplication.

---

## 📁 Repository Structure
```text
zkode/
├── circuits/           # Circom 2.1 circuits & Groth16 trusted setup scripts
├── backend/            # FastAPI, SQLite nullifier store & LangGraph compiler
├── frontend/           # Next.js 14 App Router, Web Worker WASM prover & 3-column UI
├── docs/               # System architecture, schemas, app flows, and design
│   ├── architecture.md
│   ├── backendschema.md
│   ├── appflow.md
│   ├── frontenddesign.md
│   └── implementation.md
└── study_docs/         # Phase tracking & audit records
```

---

## 🛠️ Quick Start

### 1. Cryptographic Circuits
```bash
cd circuits
npm install
bash compile.sh
```

### 2. Backend & Agentic Compiler
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend & Prover Sandbox
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Threat Model & Red-Team Defense
| Attack Vector | Vulnerability Description | Mitigation |
| :--- | :--- | :--- |
| **Frankenstein Collusion** | Mixing Alice's age with Bob's bank balance | Holder commitment: `Poseidon(userSecretId)` |
| **Cross-Site Tracking** | Public signatures leaking user identity | In-circuit EdDSA verification as private signals |
| **Proof Replay Attack** | Reusing intercepted `proof.json` | 60s Ephemeral Challenge Nonce lock |
| **Binary-Search Probing**| Micro-queries to isolate user balance | Client-side Entropy Guard (₹25k buckets) |
| **Signal Tampering** | Setting `minBalance = 0` in transit | Server-authoritative signal reconstruction |

---

## 📜 Documentation
Full technical documentation is available in [`docs/`](docs/):
* [Architecture Specification](docs/architecture.md)
* [Backend Schema & API Contracts](docs/backendschema.md)
* [Application Flow & Sequence Diagrams](docs/appflow.md)
* [Frontend 3-Column Design](docs/frontenddesign.md)
* [Implementation Roadmap](docs/implementation.md)

---

## ⚖️ License
MIT License.

