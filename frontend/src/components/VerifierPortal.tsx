"use client";

import React from "react";
import { Scale, Sparkles, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";

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
      title: "Scholarship grant",
      prompt: "Applicant must be at least 18 years old, maintain bank balance above 50000, annual income under 800000, and academic score above 8.2 CGPA.",
    },
    {
      title: "Housing subsidy",
      prompt: "Citizen must be at least 21 years old, family annual income under 350000, and liquid savings above 25000.",
    },
    {
      title: "Founder permit",
      prompt: "Founder must be at least 21 years old, liquid assets above 250000, and academic score above 7.5 CGPA.",
    },
  ];

  return (
    <div className="rounded-2xl p-6 flex flex-col h-full bg-[#181818] border border-[#313131] transition-weighted">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#313131] mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#272727] border border-[#313131] flex items-center justify-center text-violet-400">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="title-card text-white flex items-center gap-2">
              Policy studio
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#272727] text-zinc-300 font-mono">
                verifier portal
              </span>
            </h2>
            <p className="caption-meta text-zinc-400 mt-0.5">
              Rule compilation and zero knowledge compliance registry
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-md bg-[#1F1F1F] border border-[#313131]">
          Scope 901
        </span>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 text-xs">
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onPolicyChange(p.prompt)}
            className="px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] text-zinc-300 whitespace-nowrap transition-colors"
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
            placeholder="Type statutory eligibility rule in plain English..."
            className="w-full bg-[#131209] border border-[#313131] rounded-xl p-3.5 text-xs text-zinc-200 placeholder-zinc-500 font-sans focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
          />
          <button
            onClick={onCompilePolicy}
            disabled={isCompiling}
            className="absolute right-2.5 bottom-2.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isCompiling ? "Compiling" : "Compile policy"}</span>
          </button>
        </div>
      </div>

      {/* Quantized Mathematical Receipt */}
      {symbolicReceipt.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#1F1F1F] border border-[#313131]">
          <div className="flex items-center justify-between mb-2 text-xs font-mono text-zinc-400">
            <span>Quantized rule receipt</span>
            <span className="text-emerald-400">Quantized step 25000</span>
          </div>
          <div className="space-y-1.5 text-xs font-mono text-zinc-300">
            {symbolicReceipt.map((line, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="text-violet-400">•</span>
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
            <div className="p-4 rounded-xl bg-[#1F1F1F] border border-emerald-500/70 text-emerald-300 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-sm block text-emerald-400">
                  Compliance confirmed: Eligible
                </span>
                <p className="text-xs text-zinc-300 mt-0.5">
                  The cryptographic zero knowledge proof validates age, financial, and merit constraints.
                </p>
                <div className="mt-2 text-xs font-mono text-emerald-400/90 break-all bg-[#131209] p-2 rounded-lg border border-[#313131]">
                  Nullifier: {verificationResult.nullifierHash}
                </div>
              </div>
            </div>
          ) : verificationResult.sybilBlocked ? (
            <div className="p-4 rounded-xl bg-[#1F1F1F] border border-amber-500/70 text-amber-300 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-sm block text-amber-400">
                  Sybil duplicate claim blocked
                </span>
                <p className="text-xs text-zinc-300 mt-0.5">
                  This citizen identity already claimed benefits under campaign scope 901. Database primary key lock blocked double claim.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#1F1F1F] border border-rose-500/70 text-rose-300 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-sm block text-rose-400">
                  Verification rejected: Invalid proof
                </span>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {verificationResult.error || "Cryptographic Groth16 pairing check failed. Proof signature invalid."}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="p-4 rounded-xl bg-[#1F1F1F] border border-[#313131] text-zinc-500 text-xs flex items-center space-x-2 justify-center">
            <ShieldCheck className="w-4 h-4 opacity-40" />
            <span>Awaiting proof submission from network inspector</span>
          </div>
        )}
      </div>

      {/* Anonymous Nullifier Ledger */}
      <div className="flex-1 bg-[#131209] rounded-xl border border-[#313131] p-4 flex flex-col font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#272727] text-zinc-500 text-xs">
          <span>Committed nullifier registry</span>
          <span>{nullifierLedger.length} registered</span>
        </div>
        <div className="flex-1 overflow-y-auto pt-2.5 space-y-1.5">
          {nullifierLedger.length > 0 ? (
            nullifierLedger.map((row, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-[#1F1F1F] border border-[#313131] flex items-center justify-between text-xs"
              >
                <span className="text-zinc-300 truncate max-w-[200px]">{row.nullifier}</span>
                <span className="text-emerald-400 font-medium">Committed</span>
              </div>
            ))
          ) : (
            <div className="text-center text-zinc-600 py-8 text-xs">
              No nullifiers committed yet in current session
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
