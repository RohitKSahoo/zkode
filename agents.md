# Antigravity Workspace Directives for zkode

- Architecture Model: Monorepo with `/frontend` (Next.js 14), `/backend` (FastAPI), and `/circuits` (Circom).
- Frontend Proving: Must use Web Workers to avoid blocking React DOM render cycles.
- Backend Verification: Server NEVER trusts client-submitted public signals. The server constructs the verification array using its internal database state.
- Security Invariants:
  1. Holder binding MUST link all credentials to `Poseidon(userSecretId)`.
  2. Public thresholds MUST be quantized in ₹25k increments.
  3. Every verification challenge MUST require an active 60-second UUID/nonce.

## Mandatory Skill Execution Rules
- **Phase Tracker (`phase-tracker`)**: ALWAYS active. Enforce strict 1:1 synchronization between code implementation progress, test suite verification, and master phase study documentation in `study_docs/`. Never mark a phase as completed until verified. Master index and phase-n docs must stay updated.
- **Ponytail (`ponytail`)**: ALWAYS active. Enforce the simplest, shortest, minimal working solution (YAGNI, stdlib first, zero unrequested abstraction/boilerplate). Output code first, shortest diff wins.
- **AI Design Skills (`landing-page-design` & `figma-designer`)**: ALWAYS active for frontend development. Enforce strict visual hierarchy, clean typography, deliberate spacing, contrast, motion realism, and glassmorphic UI patterns.
