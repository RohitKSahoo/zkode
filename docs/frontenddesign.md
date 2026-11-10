# zkode: Frontend Architecture & UI Design Specification (`frontenddesign.md`)

## 1. Design Philosophy: The "Glass-Box" Paradigm
In traditional Zero-Knowledge demos, the user clicks a button, a spinner runs, and a green checkmark appears. Judges and users have no visceral intuition of what actually happened.

`zkode` employs a **"Glass-Box"** UI paradigm:
* The user's screen is split into three simultaneous, transparent columns exposing the entire cryptographic lifecycle in real-time.
* Judges visually observe:
  1. What is inside client device RAM (**Private Vault**).
  2. What actually crosses the public Wi-Fi network (**Network Inspector**).
  3. What the external authority receives and evaluates (**Verifier Portal**).
* An unmissable **0 Bytes PII Transmitted** metric cements the privacy proposition.
* A live **Red-Team Attack Bar** at the bottom turns abstract cryptographic security into an interactive, visual game.

---

## 2. Visual Theme & Design Tokens

### 2.1 Color Palette (Cyberpunk / Modern Dark Fintech)
* **Background Canvas:** `zinc-950` (`#09090b`) to `slate-950` (`#020617`) with subtle dot-matrix background grid.
* **Surface Containers:** Semi-transparent glassmorphic panels `bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80`.
* **Primary / Success (Cryptographic Trust):** `emerald-400` (`#34d399`) & `emerald-500` glow.
* **Network Wire / Data Signals:** `cyan-400` (`#22d3ee`) & `sky-500`.
* **Private Vault / Citizen Data:** `violet-400` (`#a78bfa`) & `indigo-500`.
* **Threat / Attack / Red-Team:** `rose-500` (`#f43f5e`) & `amber-400` (`#fbbf24`).
* **Typography:** 
  * UI Text: `Inter` or `Geist Sans`
  * Cryptographic Hashes & Code: `JetBrains Mono` or `Fira Code`

---

## 3. Screen Layout Specification

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ✦ zkode  [Zero-Knowledge Eligibility Verification Platform]         [● Server Online] [V2.1] │
├─────────────────────────┬─────────────────────────┬─────────────────────────────────────────┤
│     PRIVATE VAULT       │   NETWORK INSPECTOR     │             POLICY STUDIO               │
│   (Client Device RAM)   │   (Wire Packet Audit)   │          (Verifier Authority)           │
├─────────────────────────┼─────────────────────────┼─────────────────────────────────────────┤
│ [Aadhaar/Identity Card] │ [Live Packet Hex Dissect│ [Natural Language Statutory Rule]       │
│ DOB: 2003-04-16         │  pi_a: [0x12a..., 0x...]│ ┌─────────────────────────────────────┐ │
│ Secret: 0x9812... [LOCK]│  pi_b: [[...],[...]]    │ │ "Applicant must be >= 18, balance   │ │
│ Holder: Poseidon(secret)│  pi_c: [0x88f..., 0x...]│ │  >= ₹50,000, income <= ₹8,00,000"   │ │
│                         │                         │ └─────────────────────────────────────┘ │
│ [State Bank of India]   │ ┌─────────────────────┐ │ [Compile Policy with AI] ➔             │
│ Balance: ₹84,500        │ │ PII EXPOSED: 0 BYTES│ │                                         │
│ Income: ₹3,50,000       │ └─────────────────────┘ │ [Quantized Mathematical Receipt]        │
│ Expiry: 2026-11-15      │ • Payload: 256 Bytes    │ • Cutoff Birthdate: <= 2008-11-10       │
│ Sig: EdDSA (BabyJubJub) │ • Proof Time: 940 ms    │ • Min Liquid Assets: >= ₹50,000         │
│                         │ • Protocol: Groth16     │ • Income Ceiling: <= ₹8,00,000          │
│ [University Portal]     │                         │                                         │
│ CGPA: 8.60 (Score: 860) │ [Session Nonce Guard]   │ [Anonymous Verifier Registry]           │
│                         │ Active: 0x9b4a... (48s) │ • Scope: #901 (Govt Merit Grant)        │
│ ┌─────────────────────┐ │                         │ • Nullifier: 0x44cf... [VERIFIED ✓]     │
│ │ GENERATE PROOF(WASM)│ │ [Download Audit JSON]   │                                         │
│ └─────────────────────┘ │                         │ [ STATUS: ELIGIBLE (ANONYMOUS) ]        │
├─────────────────────────┴─────────────────────────┴─────────────────────────────────────────┤
│                             ⚡ LIVE RED-TEAM ATTACK SIMULATOR                                │
│ [ 💉 Inject Fake ₹10L ]  [ 🔄 Replay Old Proof ]  [ 🔍 Probe Non-Quantized ]  [ ↺ Reset All ] │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Hierarchy & Detailed Specifications

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                             # Main 3-Column Glass-Box layout
│   └── globals.css
├── components/
│   ├── Header.tsx                           # Status pills (WASM ready, Backend health)
│   ├── PrivateVault.tsx                     # Column 1: Client credentials & local prover
│   │   ├── CredentialCard.tsx               # Aadhaar, Bank, University visual cards
│   │   └── ProverActionPanel.tsx            # WASM Prover trigger + live progress bar
│   ├── NetworkInspector.tsx                 # Column 2: Wire packet & 0% PII telemetry
│   │   ├── PiiZeroGauge.tsx                 # Prominent 0-Bytes PII shield badge
│   │   ├── PacketHexViewer.tsx              # Collapsible hex & JSON tree of pi_a, b, c
│   │   └── ChallengeTimer.tsx               # 60s countdown progress bar for session nonce
│   ├── VerifierPortal.tsx                   # Column 3: Natural language compiler & ledger
│   │   ├── PolicyPromptInput.tsx            # NLP prompt area + quick template buttons
│   │   ├── QuantizedReceiptCard.tsx         # Mathematical constraint breakdown
│   │   └── VerificationStatusBanner.tsx     # ELIGIBLE / REJECTED animated alert
│   └── RedTeamAttackBar.tsx                 # Sticky bottom interactive exploit buttons
└── lib/
    ├── zkStore.ts                           # Global client state (Zustand or React Context)
    ├── entropyGuard.ts                      # Client-side bucket and rate-limit guard
    ├── witnessBuilder.ts                    # Formats Circom witness signals
    └── zkProver.ts                          # Web Worker client wrapper
```

---

## 5. Column Specifications

### 5.1 Column 1: Private Vault (`PrivateVault.tsx`)
* **Heading:** `PRIVATE VAULT (Client Device RAM)` with a green glowing badge: `Offline Safe`.
* **Components:**
  1. **Aadhaar / National ID Card:**
     * Visual avatar silhouette, masked citizen ID (`••••-••••-4921`).
     * `userSecretId` displayed in masked monospace (`0x7f2a••••9b10`).
     * DOB: `2003-04-16` (Age: 23).
  2. **Bank Statement Card (State Bank of India):**
     * Account: `SBI-Privy-••••9012`.
     * Actual Balance: `₹84,500` (Editable or injectable during attacks).
     * Actual Income: `₹3,50,000 / yr`.
     * Valid Until: `2026-11-15`.
     * Cryptographic Seal: `BabyJubJub EdDSA Signed`.
  3. **University Academic Card:**
     * Institution: `National Institute of Technology`.
     * Degree: `B.Tech Computer Science`.
     * CGPA: `8.60 / 10.00`.
  4. **Prover Action Button:**
     * Button: `⚡ Generate Proof (WASM)`.
     * Shows CPU thread activity, elapsed milliseconds (`940 ms`), and memory status (`In-Memory Only`).

### 5.2 Column 2: Network Inspector (`NetworkInspector.tsx`)
* **Heading:** `NETWORK INSPECTOR (Wire Packet Audit)` with a cyan scanner icon.
* **Components:**
  1. **PII Zero Gauge:**
     * Giant visual shield badge with neon emerald text:
       ```
       🛡️ 0 BYTES PII TRANSMITTED
       Raw Names, Dates & Balances Never Leave Device
       ```
  2. **Live Packet Dissector:**
     * Interactive tabs: `Formatted JSON` | `Raw Hex Stream`.
     * Displays `pi_a` (2 curve points), `pi_b` (4 curve points), `pi_c` (2 curve points).
     * Total wire payload size: **256 Bytes**.
  3. **Session Nonce Bar:**
     * Displays active `sessionChallengeNonce` decimal value.
     * Visual countdown ring / bar showing remaining TTL out of 60 seconds.
  4. **Audit Export:**
     * `[⬇ Download Wire Packet .json]` button for judges to inspect in terminal.

### 5.3 Column 3: Verifier Portal (`VerifierPortal.tsx`)
* **Heading:** `POLICY STUDIO (Verifier Authority)` with an indigo authority icon.
* **Components:**
  1. **Natural Language Policy Input:**
     * Textarea with preset chips:
       * `[🎓 National Merit Scholarship]`
       * `[🏠 Low-Income Housing Aid]`
       * `[🚀 Elite Startup Founder Visa]`
     * User can type custom English text:
       *"Citizen must be 18+ years old, holding over ₹50k in savings, annual income under ₹8L, and CGPA >= 8.0."*
     * `[✨ Compile Policy (Agent)]` button with loading animation.
  2. **Quantized Policy Output:**
     * Card displaying the parsed mathematical constraints:
       * Cutoff Birth Date: `<= 2008-11-10`
       * Balance Floor: `>= ₹50,000` (Quantized step)
       * Income Cap: `<= ₹8,00,000` (Quantized step)
       * Merit Score: `>= 800` (8.00 CGPA)
  3. **Verification Status Banner:**
     * State 1: `Awaiting Proof Submission` (Neutral slate).
     * State 2: `VERIFYING CRYPTOGRAPHIC PAIRING...` (Pulsing cyan).
     * State 3: `✓ COMPLIANT & ELIGIBLE` (Vibrant emerald glow).
     * State 4: `✕ SYBIL DUPLICATE BLOCKED` (Pulsing amber).
     * State 5: `✕ PROOF INVALID / TAMPERED` (Pulsing crimson).
  4. **Anonymous Nullifier Registry:**
     * Real-time mini ledger showing nullifier hashes committed to SQLite:
       * `0x44cf...a901 | Scope #901 | Claimed at 09:05:12`

---

## 6. Bottom Sticky Panel: Red-Team Attack Simulator (`RedTeamAttackBar.tsx`)
Fixed at the bottom of the viewport with a red glowing hazard border:

```tsx
<div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 border-t border-rose-500/40 p-4 backdrop-blur-xl">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <div className="flex items-center space-x-2 text-rose-400 font-mono text-sm">
      <AlertTriangle className="w-5 h-5 animate-pulse" />
      <span>LIVE RED-TEAM ATTACK SUITE:</span>
    </div>
    <div className="flex space-x-3">
      <button onClick={injectFakeBalance}>💉 Inject Fake ₹10L</button>
      <button onClick={replayProof}>🔄 Replay Stolen Proof</button>
      <button onClick={probeUnquantized}>🔍 Probe ₹63,412</button>
      <button onClick={tamperPublicSignals}>⚡ Tamper Wire Signal</button>
      <button onClick={resetDemo}>↺ Reset Clean State</button>
    </div>
  </div>
</div>
```

---

## 7. Client State Store (`zkStore.ts`)

```typescript
export interface ZkAppState {
  // Vault state
  credentials: {
    userSecretId: string;
    birthTimestamp: string;
    actualBalance: string;
    actualIncome: string;
    creditOrCgpaScore: string;
    expirationTimestamp: string;
    signature: { sigR8x: string; sigR8y: string; sigS: string };
    issuerPubKey: { Ax: string; Ay: string };
  };

  // Policy & Session state
  policyText: string;
  compiledPolicy: Record<string, string> | null;
  symbolicReceipt: string[];
  sessionChallenge: { nonce: string; expiresAt: number; ttl: number } | null;

  // Prover state
  isProving: boolean;
  proverTimeMs: number;
  proofData: { proof: any; publicSignals: string[] } | null;

  // Verification state
  isVerifying: boolean;
  verificationResult: {
    verified: boolean;
    nullifierHash?: string;
    message?: string;
    sybilBlocked?: boolean;
    error?: string;
  } | null;

  // Attack simulator active state
  activeAttack: "NONE" | "FAKE_BALANCE" | "REPLAY" | "PROBE" | "TAMPER";

  // Actions
  setPolicyText: (text: string) => void;
  loadDemoCredentials: () => Promise<void>;
  compilePolicy: () => Promise<void>;
  fetchSessionChallenge: () => Promise<void>;
  generateProof: () => Promise<void>;
  submitProof: () => Promise<void>;
  triggerAttack: (attackType: string) => Promise<void>;
  resetAll: () => void;
}
```

---

## 8. Frontend Engineering Invariants
1. **Never import SnarkJS directly in server components:** SnarkJS references Node.js internals (`fs`, `readline`). It must be executed either inside a Web Worker (`zkProver.worker.ts`) or inside a dynamically imported client module with `next.config.mjs` webpack polyfill fallbacks.
2. **Never freeze the UI thread:** WASM proof generation takes ~940ms. Running it on the main JavaScript thread causes noticeable UI stutter. The Web Worker keeps the 60fps animations, timers, and hex viewer perfectly fluid.
3. **BigInt Serialization:** Circom outputs large numeric strings representing BN254 finite field elements. Always serialize as decimal strings in JSON (`1928471...`) and never parse as standard JavaScript 64-bit numbers to prevent precision truncation.

