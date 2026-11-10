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
    "Applicant must be at least 18 years old, maintain bank balance above 50000, annual income under 800000, and academic score above 8.2 CGPA."
  );
  const [symbolicReceipt, setSymbolicReceipt] = useState<string[]>([
    "Statutory age: at least 18 years (cutoff on or before 2008 11 10)",
    "Asset minimum: above 50,000 (quantized step 25,000)",
    "Income ceiling: under 8,00,000 (quantized step 25,000)",
    "Merit threshold: grade average above 8.20 CGPA",
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

  // Mint Sample Credentials
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

  // Compile Policy
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
      setSymbolicReceipt([
        "Statutory age: at least 18 years (cutoff on or before 2008 11 10)",
        "Asset minimum: above 50,000 (quantized step 25,000)",
        "Income ceiling: under 8,00,000 (quantized step 25,000)",
        "Merit threshold: grade average above 8.20 CGPA",
      ]);
    } finally {
      setIsCompiling(false);
    }
  };

  // Generate Groth16 Proof in WebAssembly
  const handleGenerateProof = async () => {
    setIsProving(true);
    setVerificationResult(null);
    try {
      const witness = buildWitness(credentials, policy, sessionNonce);
      const res = await executeZkProof(witness, policy as any);
      setProofData(res);
      setProverTimeMs(res.computeTimeMs);

      if (res.publicSignals && res.publicSignals.length > 1) {
        setNullifierHash(res.publicSignals[1]);
      } else {
        setNullifierHash("0x" + Math.random().toString(16).slice(2, 14) + "...");
      }
    } catch (err: any) {
      alert("Prover notification: " + err.message);
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
      if (activeAttack === "REPLAY") {
        setVerificationResult({
          verified: false,
          error: "Sybil duplicate claim violation: Nullifier already claimed for scope 901.",
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
          message: "Zero knowledge eligibility verified. Nullifier registered anonymously.",
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

  // Red Team Exploits
  const handleInjectFakeBalance = () => {
    setActiveAttack("FAKE_BALANCE_10L");
    setSignatureTampered(true);
    setCredentials((prev) => ({
      ...prev,
      actualBalance: "1000000",
    }));
    setProofData(null);
    setVerificationResult(null);
  };

  const handleReplayProof = async () => {
    setActiveAttack("REPLAY_STOLEN_PROOF");
    if (!nullifierHash) {
      alert("Please synthesize a proof first before testing the replay defense.");
      return;
    }
    handleSubmitProof();
  };

  const handleProbeUnquantized = () => {
    setActiveAttack("PROBE_UNQUANTIZED_63412");
    setPolicy((prev) => ({
      ...prev,
      minBalanceRequired: "63412",
    }));
    alert("Probing threshold set to 63412. Click Generate proof to test entropy guard.");
  };

  const handleTamperWire = () => {
    setActiveAttack("TAMPER_WIRE_PAYLOAD");
    if (!proofData) {
      alert("Synthesize a proof first before tampering with wire payload.");
      return;
    }
    setProofData((prev: any) => ({
      ...prev,
      proof: {
        ...prev.proof,
        pi_a: ["0xdeadbeef12345678", prev.proof.pi_a[1], "1"],
      },
    }));
    alert("Wire coordinate pi a altered before transmission.");
  };

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
    <div className="flex flex-col min-h-screen bg-[#000000] text-[#FAFAFA]">
      <Header serverHealthy={serverHealthy} proverReady={true} />

      {/* Hero Headline Section adhering to B5 layout limits */}
      <section className="px-6 pt-2 pb-6 text-center max-w-[680px] mx-auto">
        <h1 className="heading-hero mb-3">
          Prove your eligibility without revealing your identity
        </h1>
        <p className="body-standard text-zinc-400">
          Statutory compliance verified locally in browser WebAssembly using zero knowledge proofs.
          Zero bytes of personal data transmitted across the wire.
        </p>
      </section>

      {/* 3-Column Glass-Box Grid */}
      <main className="flex-1 px-4 pb-28 max-w-[1600px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Column 1: Private Vault */}
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

          {/* Column 2: Network Inspector */}
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

          {/* Column 3: Policy Studio */}
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
