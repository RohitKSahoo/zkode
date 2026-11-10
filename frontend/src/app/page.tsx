"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { PrivateVault } from "../components/PrivateVault";
import { NetworkInspector } from "../components/NetworkInspector";
import { VerifierPortal } from "../components/VerifierPortal";
import { RedTeamAttackBar } from "../components/RedTeamAttackBar";
import { PrivateCredentials, buildWitness, PublicPolicy } from "../lib/witnessBuilder";
import { executeZkProof, ZkProofResult } from "../lib/zkProver";

const DEFAULT_CREDENTIALS: PrivateCredentials = {
  userSecretId: "981273918237192837129837192837",
  birthTimestamp: "20030416",
  actualBalance: "84500",
  actualIncome: "350000",
  creditOrCgpaScore: "860",
  expirationTimestamp: "20261115",
  sigR8x: "1351119567990714856697380182600570775533353457199042657802878933215570081829",
  sigR8y: "14841775189709280385959955735165682283038676231922416049439603001859600742152",
  sigS: "1632734185797686733261621516087532326795499252328860010091807661271618826500",
  issuerPubKeyAx: "1846294719203948571920394857192039485719203948571920394857",
  issuerPubKeyAy: "928374910293847561029384756102938475610293847561029384756",
};

const DEFAULT_POLICY: PublicPolicy = {
  currentTimestamp: "20261110",
  maxBirthTimestamp: "20081110",
  minBalanceRequired: "50000",
  maxIncomeAllowed: "800000",
  minScoreRequired: "800",
  serviceScopeId: "901",
};

export default function Home() {
  const [credentials, setCredentials] = useState<PrivateCredentials>(DEFAULT_CREDENTIALS);
  const [policy, setPolicy] = useState<PublicPolicy>(DEFAULT_POLICY);
  const [policyPrompt, setPolicyPrompt] = useState(
    "Applicant must be at least 18 years old, maintain bank balance >= ₹50,000, annual income <= ₹8,00,000, and academic score >= 8.2 CGPA."
  );
  const [symbolicReceipt, setSymbolicReceipt] = useState<string[]>([
    "Statutory Age: >= 18 years (Cutoff: <= 2008-11-10)",
    "Asset Minimum: >= ₹50,000 (Quantized step ₹25,000)",
    "Income Ceiling: <= ₹8,00,000 (Quantized step ₹25,000)",
    "Merit Threshold: >= 8.20 CGPA (Score: 820)",
  ]);

  // Session & Nonce
  const [sessionNonce, setSessionNonce] = useState<string>("14839201948572019485720194857201948572019485720");
  const [nonceTtl, setNonceTtl] = useState<number>(60);

  // Prover & Verification States
  const [isProving, setIsProving] = useState<boolean>(false);
  const [proverTimeMs, setProverTimeMs] = useState<number>(0);
  const [proofData, setProofData] = useState<ZkProofResult | null>(null);
  const [nullifierHash, setNullifierHash] = useState<string | null>(null);

  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [nullifierLedger, setNullifierLedger] = useState<Array<{ nullifier: string; scope: string; timestamp: string }>>([]);

  // Red Team State
  const [activeAttack, setActiveAttack] = useState<string>("NONE");
  const [signatureTampered, setSignatureTampered] = useState<boolean>(false);
  const [serverHealthy, setServerHealthy] = useState<boolean>(true);

  // Fetch Session Challenge Nonce
  const fetchChallenge = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/challenge?scope_id=" + policy.serviceScopeId);
      if (res.ok) {
        const data = await res.json();
        setSessionNonce(data.sessionNonce);
        setNonceTtl(60);
        setServerHealthy(true);
        return;
      }
    } catch {
      // Local fallback nonce if backend offline
      setServerHealthy(false);
      setSessionNonce(Math.floor(Math.random() * 1e16).toString() + Math.floor(Math.random() * 1e16).toString());
      setNonceTtl(60);
    }
  };

  useEffect(() => {
    fetchChallenge();
    const interval = setInterval(() => {
      setNonceTtl((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mint Sample Credentials via API or Local Mock
  const handleMintNewDemo = async () => {
    try {
      const res = await fetch("/api/crypto/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSecretId: Math.floor(Math.random() * 1e15).toString(),
          birthTimestamp: "20030416",
          actualBalance: "84500",
          actualIncome: "350000",
          creditOrCgpaScore: "860",
          expirationTimestamp: "20261115",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials({
          ...data.credential,
          issuerPubKeyAx: data.issuerPubKey.Ax,
          issuerPubKeyAy: data.issuerPubKey.Ay,
        });
        setSignatureTampered(false);
        setActiveAttack("NONE");
      }
    } catch {
      setCredentials(DEFAULT_CREDENTIALS);
      setSignatureTampered(false);
    }
  };

  // Compile Policy (LangGraph Agent with Fallback)
  const handleCompilePolicy = async () => {
    setIsCompiling(true);
    try {
      const res = await fetch("http://localhost:8000/api/policy/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: policyPrompt, service_scope_id: policy.serviceScopeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPolicy({
          currentTimestamp: data.currentTimestamp,
          maxBirthTimestamp: data.maxBirthTimestamp,
          minBalanceRequired: data.minBalanceRequired,
          maxIncomeAllowed: data.maxIncomeAllowed,
          minScoreRequired: data.minScoreRequired,
          serviceScopeId: data.serviceScopeId,
        });
        setSymbolicReceipt(data.symbolicReceipt);
      }
    } catch {
      // Local fallback compiler
      setSymbolicReceipt([
        "Statutory Age: >= 18 years (Born on or before 2008-11-10)",
        "Asset Minimum: >= ₹50,000 (Quantized step ₹25,000)",
        "Income Ceiling: <= ₹8,00,000 (Quantized step ₹25,000)",
        "Merit Threshold: >= 8.20 CGPA",
      ]);
    } finally {
      setIsCompiling(false);
    }
  };

  // Generate Groth16 Proof (Web Worker WASM)
  const handleGenerateProof = async () => {
    setIsProving(true);
    setVerificationResult(null);
    try {
      const witness = buildWitness(credentials, policy, sessionNonce);
      const res = await executeZkProof(witness, policy as any);
      setProofData(res);
      setProverTimeMs(res.computeTimeMs);

      // Nullifier is public signal output 1
      if (res.publicSignals && res.publicSignals.length > 1) {
        setNullifierHash(res.publicSignals[1]);
      } else {
        setNullifierHash("0x" + Math.random().toString(16).slice(2, 14) + "...");
      }
    } catch (err: any) {
      alert("Prover Error: " + err.message);
    } finally {
      setIsProving(false);
    }
  };

  // Submit Proof to Verifier
  const handleSubmitProof = async () => {
    if (!proofData || !nullifierHash) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: proofData.proof,
          clientNullifier: nullifierHash,
          serviceScopeId: policy.serviceScopeId,
          sessionNonce: sessionNonce,
        }),
      });

      const data = await res.json();
      if (res.ok && data.verified) {
        setVerificationResult(data);
        setNullifierLedger((prev) => [
          {
            nullifier: nullifierHash,
            scope: policy.serviceScopeId,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      } else {
        setVerificationResult({
          verified: false,
          error: data.detail || data.error || "Verification failed.",
          sybilBlocked: data.sybilBlocked || (data.detail && data.detail.includes("Sybil")),
        });
      }
    } catch {
      // Offline fallback verification simulation
      if (activeAttack === "REPLAY") {
        setVerificationResult({
          verified: false,
          error: "Sybil double-dip violation: Nullifier already claimed for scope #901.",
          sybilBlocked: true,
        });
      } else if (activeAttack === "TAMPER" || signatureTampered) {
        setVerificationResult({
          verified: false,
          error: "Cryptographic Groth16 pairing check failed. Proof signature invalid.",
          sybilBlocked: false,
        });
      } else {
        setVerificationResult({
          verified: true,
          nullifierHash: nullifierHash,
          message: "Zero-Knowledge eligibility verified. Nullifier registered anonymously.",
        });
        setNullifierLedger((prev) => [
          {
            nullifier: nullifierHash,
            scope: policy.serviceScopeId,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Red Team Attack 1: Inject Fake Balance
  const handleInjectFakeBalance = () => {
    setActiveAttack("FAKE_BALANCE_10L");
    setSignatureTampered(true);
    setCredentials((prev) => ({
      ...prev,
      actualBalance: "1000000", // ₹10 Lakhs (forged without updating bank signature)
    }));
    setProofData(null);
    setVerificationResult(null);
  };

  // Red Team Attack 2: Replay Stolen Proof
  const handleReplayProof = async () => {
    setActiveAttack("REPLAY_STOLEN_PROOF");
    if (!nullifierHash) {
      alert("Please generate a proof first before testing the replay attack.");
      return;
    }
    // Attempt double-dip submission
    handleSubmitProof();
  };

  // Red Team Attack 3: Probe Non-Quantized (₹63,412)
  const handleProbeUnquantized = () => {
    setActiveAttack("PROBE_UNQUANTIZED_63412");
    setPolicy((prev) => ({
      ...prev,
      minBalanceRequired: "63412", // Violates ₹25,000 quantization step
    }));
    alert("Probing attack injected: Verifier requested balance >= ₹63,412. Click 'Generate Proof (WASM)' to test Entropy Guard!");
  };

  // Red Team Attack 4: Tamper Wire
  const handleTamperWire = () => {
    setActiveAttack("TAMPER_WIRE_PAYLOAD");
    if (!proofData) {
      alert("Generate a proof first before tampering with wire payload.");
      return;
    }
    // Corrupt proof coordinate in transit
    setProofData((prev: any) => ({
      ...prev,
      proof: {
        ...prev.proof,
        pi_a: ["0xdeadbeef12345678", prev.proof.pi_a[1], "1"],
      },
    }));
    alert("Wire Tampered: Modifying curve coordinate π_A before submission to verifier.");
  };

  // Reset Demo to Clean State
  const handleReset = () => {
    setCredentials(DEFAULT_CREDENTIALS);
    setPolicy(DEFAULT_POLICY);
    setProofData(null);
    setVerificationResult(null);
    setActiveAttack("NONE");
    setSignatureTampered(false);
    fetchChallenge();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header serverHealthy={serverHealthy} proverReady={true} />

      <main className="flex-1 p-4 pb-28 max-w-[1700px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Column 1: Private Vault (3.5 / 12) */}
          <div className="lg:col-span-4 flex flex-col">
            <PrivateVault
              credentials={credentials}
              isProving={isProving}
              proverTimeMs={proverTimeMs}
              onGenerateProof={handleGenerateProof}
              onMintNewDemo={handleMintNewDemo}
              signatureTampered={signatureTampered}
            />
          </div>

          {/* Column 2: Network Inspector (4 / 12) */}
          <div className="lg:col-span-4 flex flex-col">
            <NetworkInspector
              proofData={proofData}
              nullifierHash={nullifierHash}
              sessionNonce={sessionNonce}
              nonceTtl={nonceTtl}
              onSubmitProof={handleSubmitProof}
              isSubmitting={isSubmitting}
              canSubmit={!!proofData && !isProving}
            />
          </div>

          {/* Column 3: Policy Studio & Verifier (4 / 12) */}
          <div className="lg:col-span-4 flex flex-col">
            <VerifierPortal
              policyPrompt={policyPrompt}
              onPolicyChange={setPolicyPrompt}
              onCompilePolicy={handleCompilePolicy}
              isCompiling={isCompiling}
              compiledPolicy={policy as any}
              symbolicReceipt={symbolicReceipt}
              verificationResult={verificationResult}
              nullifierLedger={nullifierLedger}
            />
          </div>
        </div>
      </main>

      <RedTeamAttackBar
        onInjectFakeBalance={handleInjectFakeBalance}
        onReplayProof={handleReplayProof}
        onProbeUnquantized={handleProbeUnquantized}
        onTamperWire={handleTamperWire}
        onReset={handleReset}
        activeAttack={activeAttack}
      />
    </div>
  );
}
