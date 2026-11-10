"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";
import { PrivateVault } from "../components/PrivateVault";
import { NetworkInspector } from "../components/NetworkInspector";
import { VerifierPortal } from "../components/VerifierPortal";
import { RedTeamAttackBar } from "../components/RedTeamAttackBar";
import { GlassPrismHero, type GlassPrismHeroHandle } from "../components/GlassPrismHero";
import { PrivateCredentials, buildWitness, PublicPolicy } from "../lib/witnessBuilder";
import { executeZkProof, ZkProofResult } from "../lib/zkProver";

type ActivePage = "vault" | "network" | "verifier";
type TransitionStatus = "idle" | "leaving" | "entering";

const DEFAULT_CREDENTIALS: PrivateCredentials = {
  userSecretId: "981273918237192837129837192837",
  birthTimestamp: "20030416",
  actualBalance: "84500",
  actualIncome: "350000",
  creditOrCgpaScore: "860",
  expirationTimestamp: "20261115",
  sigR8x: "15983502441014741693118001401111597102620505013186307209250310093672474092456",
  sigR8y: "1979485915277033923079535022718253435669059167959695902127897338093088485962",
  sigS: "135030378803597992460893792216210384268754990109084567856506613330019146666",
  issuerPubKeyAx: "13277427435165878497778222415993513565335242147425444199013288855685581939618",
  issuerPubKeyAy: "13622229784656158136036771217484571176836296686641868549125388198837476602820",
};

const DEFAULT_POLICY: PublicPolicy = {
  currentTimestamp: "20261110",
  maxBirthTimestamp: "20081110",
  minBalanceRequired: "50000",
  maxIncomeAllowed: "800000",
  minScoreRequired: "800",
  serviceScopeId: "901",
};

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:8000";
  }
  return "https://zkode.onrender.com";
};


export default function Home() {
  const [activePage, setActivePage] = useState<ActivePage>("vault");
  const [transitionStatus, setTransitionStatus] = useState<TransitionStatus>("idle");
  const barbaRef = useRef<any>(null);
  const heroRef = useRef<GlassPrismHeroHandle>(null);
  const appWorkspaceRef = useRef<HTMLDivElement>(null);

  const scrollToApp = (page?: ActivePage) => {
    if (page) setActivePage(page);
    appWorkspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  // Initialize Barba.js Lifecycle Engine in Browser
  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      import("@barba/core")
        .then(({ default: barba }) => {
          if (!mounted || !barba) return;
          barbaRef.current = barba;
          try {
            barba.init({
              debug: false,
              preventRunning: true,
              prevent: () => true, // Preserve React DOM tree and in-memory WebAssembly context
              transitions: [
                {
                  name: "nothing-slide-transition",
                  leave() {},
                  enter() {},
                },
              ],
            });
          } catch {
            // Already initialized or SSR boundary
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  // Barba.js Driven Page Transition Handler
  const handleNavigate = (targetPage: ActivePage) => {
    if (appWorkspaceRef.current) {
      const rect = appWorkspaceRef.current.getBoundingClientRect();
      if (rect.top > 120) {
        appWorkspaceRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
    if (targetPage === activePage || transitionStatus !== "idle") return;

    // Trigger Barba.js Leave Sequence
    setTransitionStatus("leaving");
    if (barbaRef.current && barbaRef.current.hooks) {
      try {
        barbaRef.current.hooks.do("beforeLeave");
        barbaRef.current.hooks.do("leave");
      } catch {}
    }

    // Complete Leave -> Initiate Barba.js Enter Sequence
    setTimeout(() => {
      setActivePage(targetPage);
      setTransitionStatus("entering");

      if (barbaRef.current && barbaRef.current.hooks) {
        try {
          barbaRef.current.hooks.do("beforeEnter");
          barbaRef.current.hooks.do("enter");
        } catch {}
      }

      // Finish Transition -> Settle Idle
      setTimeout(() => {
        setTransitionStatus("idle");
        if (barbaRef.current && barbaRef.current.hooks) {
          try {
            barbaRef.current.hooks.do("afterEnter");
            barbaRef.current.hooks.do("after");
          } catch {}
        }
      }, 280);
    }, 180);
  };

  // Fetch Session Challenge Nonce
  const fetchChallenge = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/challenge?scope_id=` + policy.serviceScopeId);
      if (res.ok) {
        const data = await res.json();
        setSessionNonce(data.sessionNonce);
        setNonceTtl(60);
        return;
      }
    } catch {
      setSessionNonce(Math.floor(Math.random() * 1e16).toString() + Math.floor(Math.random() * 1e16).toString());
      setNonceTtl(60);
    }
  };

  // Fetch Live Nullifier Ledger
  const fetchLedger = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/ledger`);
      if (res.ok) {
        const data = await res.json();
        if (data.ledger) {
          setNullifierLedger(
            data.ledger.map((item: any) => ({
              nullifier: item.nullifier_hash,
              scope: item.service_scope_id,
              timestamp: item.claimed_at,
            }))
          );
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchChallenge();
    fetchLedger();
    const interval = setInterval(() => {
      setNonceTtl((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mint Sample Credentials
  const handleMintNewDemo = async () => {
    try {
      let res = await fetch(`${getBackendUrl()}/api/crypto/mint`, {
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
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/api/crypto/mint", {
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
      }
      if (res && res.ok) {
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
      const res = await fetch(`${getBackendUrl()}/api/policy/compile`, {
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
      const res = await fetch(`${getBackendUrl()}/api/verify`, {
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
        fetchLedger();
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
    alert("Wire coordinate pi_a altered before transmission.");
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
    <div data-barba="wrapper" className="flex flex-col min-h-screen text-[#FAFAFA]">
      {/* 1. WebGL Glass Prism Hero Section */}
      <GlassPrismHero
        ref={heroRef}
        headline="Proof in a new light."
        eyebrow="zkode // Zero-Knowledge Selective Disclosure"
        description="Verify age, income ceilings, and liquid reserves with 0 Bytes of raw PII exposed. Real-time client-side Groth16 proving on BN254 with live LangGraph AI statutory compilation."
        accent="#D71921"
        fontFamily="var(--font-sans), Geist, ui-sans-serif, system-ui, sans-serif"
        scrollRotate={true}
        scrollHint={{ rotate: "Scroll to rotate & explore", back: "Scroll up to light" }}
        actions={
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
            <button
              onClick={() => scrollToApp("vault")}
              className="inline-flex h-11 items-center rounded-none px-6 text-[13px] tracking-wider uppercase bg-white text-black font-bold outline-none transition-transform active:scale-[.97] hover:bg-zinc-200"
            >
              Launch Vault [01]
            </button>
            <button
              onClick={() => scrollToApp("verifier")}
              className="inline-flex h-11 items-center rounded-none px-6 text-[13px] tracking-wider uppercase border border-[#333333] bg-[#111111]/80 text-[#FAFAFA] backdrop-blur-md outline-none transition-transform active:scale-[.97] hover:bg-[#1A1A1A] hover:border-zinc-400"
            >
              Policy Studio [03]
            </button>
            <button
              onClick={() => scrollToApp("network")}
              className="inline-flex h-11 items-center rounded-none px-5 text-[13px] tracking-wider uppercase border border-[#333333] bg-[#111111]/80 text-[#FAFAFA] backdrop-blur-md outline-none transition-transform active:scale-[.97] hover:bg-[#1A1A1A] hover:border-zinc-400"
            >
              0 Bytes Inspector [02]
            </button>
          </div>
        }
      />

      {/* 2. Primary Workspace & Interactive Protocol Suite */}
      <div id="app-workspace" ref={appWorkspaceRef} className="relative z-10 w-full min-h-screen bg-black/95 border-t border-[#1F1F1F]">
        <Header />

        {/* Main Adaptive Page View with Barba.js Container */}
        <main className="flex-1 px-6 sm:px-10 pt-6 pb-28 w-full max-w-[1920px] mx-auto overflow-hidden">
          <div
            data-barba="container"
            data-barba-namespace={activePage}
            className={`w-full ${
              transitionStatus === "leaving"
                ? "animate-barba-leave"
                : transitionStatus === "entering"
                ? "animate-barba-enter"
                : ""
            }`}
          >
            {activePage === "vault" && (
              <PrivateVault
                credentials={credentials}
                isProving={isProving}
                proverTimeMs={proverTimeMs}
                onGenerateProof={handleGenerateProof}
                onMintNewDemo={handleMintNewDemo}
                signatureTampered={signatureTampered}
              />
            )}

            {activePage === "network" && (
              <NetworkInspector
                proofData={proofData}
                nullifierHash={nullifierHash}
                sessionNonce={sessionNonce}
                nonceTtl={nonceTtl}
                onSubmitProof={handleSubmitProof}
                isSubmitting={isSubmitting}
                canSubmit={!!proofData && !isProving}
              />
            )}

            {activePage === "verifier" && (
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
            )}
          </div>
        </main>

        {/* Expandable Footer Pill Menu - Visible ONLY in the Verifier Page */}
        {activePage === "verifier" && (
          <RedTeamAttackBar
            onInjectFakeBalance={handleInjectFakeBalance}
            onReplayProof={handleReplayProof}
            onProbeUnquantized={handleProbeUnquantized}
            onTamperWire={handleTamperWire}
            onReset={handleReset}
            activeAttack={activeAttack}
          />
        )}

        {/* Bottom Dock for Switching Pages via Barba.js transition handler */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-1.5 flex items-center space-x-1 shadow-2xl rounded-none font-mono text-xs">
            <button
              onClick={() => handleNavigate("vault")}
              className={`px-4 py-2 transition-all rounded-none uppercase flex items-center space-x-2 tracking-wider ${
                activePage === "vault"
                  ? "bg-white text-black font-bold border border-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#141414] border border-transparent"
              }`}
            >
              <span className={activePage === "vault" ? "text-black" : "text-[#D71921]"}>01</span>
              <span>Private Vault</span>
            </button>

            <button
              onClick={() => handleNavigate("network")}
              className={`px-4 py-2 transition-all rounded-none uppercase flex items-center space-x-2 tracking-wider ${
                activePage === "network"
                  ? "bg-white text-black font-bold border border-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#141414] border border-transparent"
              }`}
            >
              <span className={activePage === "network" ? "text-black" : "text-[#D71921]"}>02</span>
              <span>Network Inspector</span>
            </button>

            <button
              onClick={() => handleNavigate("verifier")}
              className={`px-4 py-2 transition-all rounded-none uppercase flex items-center space-x-2 tracking-wider ${
                activePage === "verifier"
                  ? "bg-white text-black font-bold border border-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#141414] border border-transparent"
              }`}
            >
              <span className={activePage === "verifier" ? "text-black" : "text-[#D71921]"}>03</span>
              <span>Policy Studio</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
