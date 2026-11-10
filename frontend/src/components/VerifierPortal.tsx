"use client";

import React, { useState } from "react";
import { Scale, Sparkles, CheckCircle2, AlertTriangle, XCircle, ListFilter, ShieldCheck } from "lucide-react";

interface VerifierPortalProps {
  policyPrompt: string;
  onPolicyChange: (text: string) => void;
  onCompilePolicy: () => void;
  isCompiling: boolean;
  compiledPolicy: Record<string, string> | null;
  symbolicReceipt: string[];
  verificationResult: {
    verified: boolean;
    nullifierHash?: string;
    message?: string;
    sybilBlocked?: boolean;
    error?: string;
  } | null;
  nullifierLedger: Array<{ nullifier: string; scope: string; timestamp: string }>;
}

export const VerifierPortal: React.FC<VerifierPortalProps> = ({
  policyPrompt,
  onPolicyChange,
  onCompilePolicy,
  isCompiling,
  compiledPolicy,
  symbolicReceipt,
  verificationResult,
  nullifierLedger,
}) => {
  const PRESETS = [
    {
      title: "🎓 Merit Scholarship",
      prompt: "Applicant must be at least 18 years old, maintain bank balance >= ₹50,000, annual income <= ₹8,00,000, and academic score >= 8.2 CGPA.",
    },
    {
      title: "🏠 Low-Income Aid",
      prompt: "Citizen must be at least 21 years old, family annual income <= ₹3,50,000, and savings >= ₹25,000.",
    },
    {
      title: "🚀 Elite Founder Visa",
      prompt: "Founder must be at least 21 years old, liquid assets >= ₹2,50,000, and academic CGPA >= 7.5.",
    },
  ];

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
              Policy Studio
              <span className="text-[10px] lowercase px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 font-mono">
                verifier authority
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Dynamic rule compilation & zero-knowledge compliance audit</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
          Scope #901
        </span>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[11px]">
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onPolicyChange(p.prompt)}
            className="px-2.5 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono whitespace-nowrap transition-colors"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Natural Language Policy Input */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <textarea
            value={policyPrompt}
            onChange={(e) => onPolicyChange(e.target.value)}
            rows={3}
            placeholder="Enter statutory eligibility policy in plain English..."
            className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-500 font-sans focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
          />
          <button
            onClick={onCompilePolicy}
            disabled={isCompiling}
            className="absolute right-2.5 bottom-2.5 px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-zinc-100 text-[11px] font-mono font-semibold flex items-center space-x-1 shadow transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{isCompiling ? "Compiling..." : "Compile Policy"}</span>
          </button>
        </div>
      </div>

      {/* Quantized Mathematical Receipt */}
      {symbolicReceipt.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between mb-2 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            <span>Agentic Quantized Receipt</span>
            <span className="text-emerald-400">₹25k step enforced</span>
          </div>
          <div className="space-y-1 text-xs font-mono text-zinc-300">
            {symbolicReceipt.map((line, idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <span className="text-violet-400 font-bold">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Status Alert Banner */}
      <div className="mb-4">
        {verificationResult ? (
          verificationResult.verified ? (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 flex items-start space-x-2.5 shadow-[0_0_20px_rgba(52,211,153,0.15)] animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-sm tracking-tight block text-emerald-400">
                  COMPLIANCE VERIFIED: ELIGIBLE (ANONYMOUS)
                </span>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  The Groth16 zk-SNARK proof cryptographically confirms all age, financial, and merit constraints.
                </p>
                <div className="mt-1.5 text-[10px] font-mono text-emerald-400/90 break-all">
                  Nullifier Registered: {verificationResult.nullifierHash}
                </div>
              </div>
            </div>
          ) : verificationResult.sybilBlocked ? (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-start space-x-2.5 shadow-[0_0_20px_rgba(251,191,36,0.15)] animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-sm tracking-tight block text-amber-400">
                  SYBIL ATTACK BLOCKED: DUPLICATE CLAIM
                </span>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  This citizen has already claimed benefits under campaign scope #901. SQLite primary key lock prevented double-dipping.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 flex items-start space-x-2.5 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-in fade-in">
              <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-sm tracking-tight block text-rose-400">
                  VERIFICATION REJECTED: INVALID PROOF
                </span>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  {verificationResult.error || "Cryptographic Groth16 pairing check failed. Proof signature invalid."}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs flex items-center space-x-2 text-center justify-center">
            <ShieldCheck className="w-4 h-4 opacity-40" />
            <span>Awaiting Groth16 proof submission from Network Inspector...</span>
          </div>
        )}
      </div>

      {/* Anonymous Nullifier Ledger */}
      <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-900 p-3 flex flex-col font-mono text-[11px] overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900 text-zinc-500 text-[10px]">
          <span>ANONYMOUS NULLIFIER REGISTRY (SQLite)</span>
          <span>{nullifierLedger.length} Claims</span>
        </div>
        <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
          {nullifierLedger.length > 0 ? (
            nullifierLedger.map((row, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded bg-zinc-900/40 border border-zinc-900 flex items-center justify-between text-[10px]"
              >
                <span className="text-zinc-300 truncate max-w-[200px]">{row.nullifier}</span>
                <span className="text-emerald-400">✓ Committed</span>
              </div>
            ))
          ) : (
            <div className="text-center text-zinc-600 py-6 text-[10px]">
              No nullifiers committed yet in current session
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
