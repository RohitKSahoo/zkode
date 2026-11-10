"use client";

import React from "react";
import { Scale, Sparkles, Check, AlertTriangle, X, ShieldCheck } from "lucide-react";

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
      title: "Scholarship Grant",
      prompt:
        "Applicant must be at least 18 years old, maintain bank balance above 50000, annual income under 800000, and academic score above 8.2 CGPA.",
    },
    {
      title: "Housing Subsidy",
      prompt:
        "Citizen must be at least 21 years old, family annual income under 350000, and liquid savings above 25000.",
    },
    {
      title: "Founder Permit",
      prompt:
        "Founder must be at least 21 years old, liquid assets above 250000, and academic score above 7.5 CGPA.",
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 bg-[#111111] border border-[#262626] flex items-center justify-center text-white shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight text-white uppercase font-sans">
                Policy Studio & Verifier
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#171717] border border-[#262626] text-zinc-400 uppercase">
                Scope 901
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Compile statutory rules into quantized mathematical constraints and verify client proofs.
            </p>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onPolicyChange(p.prompt)}
              className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-zinc-400 text-[11px] font-mono text-zinc-300 uppercase tracking-wider transition-colors rounded-none"
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Policy Input */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
            // Natural Language Eligibility Rule
          </label>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Quantized Granularity: ₹25,000 Step
          </span>
        </div>

        <div className="relative">
          <textarea
            value={policyPrompt}
            onChange={(e) => onPolicyChange(e.target.value)}
            rows={3}
            placeholder="Type statutory eligibility rule in plain English..."
            className="w-full bg-black border border-[#262626] focus:border-white p-4 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors resize-none rounded-none leading-relaxed"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={onCompilePolicy}
              disabled={isCompiling}
              className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black border border-white font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all rounded-none disabled:opacity-50 active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isCompiling ? "Compiling Rule..." : "Compile Policy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quantized Mathematical Receipt */}
      {symbolicReceipt.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F] text-zinc-400 mb-4">
            <span className="uppercase tracking-wider text-[11px]">// Quantized Rule Receipt</span>
            <span className="text-emerald-400 text-[10px] uppercase">Enforcing Rounding Guard</span>
          </div>

          <div className="space-y-2.5">
            {symbolicReceipt.map((line, idx) => (
              <div key={idx} className="flex items-start space-x-3 text-zinc-300">
                <span className="text-zinc-600 select-none font-mono">[0{idx + 1}]</span>
                <span className="leading-relaxed text-xs">{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Status Alert Banner */}
      <div>
        {verificationResult ? (
          verificationResult.verified ? (
            <div className="bg-[#0A0A0A] border-l-2 border-emerald-400 border-y border-r border-[#262626] p-6 rounded-none text-xs font-mono space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="font-bold uppercase tracking-wider text-sm">
                  [PASS] Compliance Verified: Eligible
                </span>
              </div>
              <p className="text-zinc-300 font-sans text-xs">
                Zero knowledge proof cryptographically satisfies all statutory criteria. Personal data was neither revealed nor transmitted.
              </p>
              {verificationResult.nullifierHash && (
                <div className="mt-2 p-3 bg-black border border-[#262626] text-zinc-300 break-all text-xs">
                  Nullifier Lock: {verificationResult.nullifierHash}
                </div>
              )}
            </div>
          ) : verificationResult.sybilBlocked ? (
            <div className="bg-[#0A0A0A] border-l-2 border-amber-400 border-y border-r border-[#262626] p-6 rounded-none text-xs font-mono space-y-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-bold uppercase tracking-wider text-sm">
                  [BLOCKED] Sybil Duplicate Claim Detected
                </span>
              </div>
              <p className="text-zinc-300 font-sans text-xs">
                This citizen identity was already committed under campaign Scope 901. Database primary key lock blocked duplicate redemption.
              </p>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] border-l-2 border-[#D71921] border-y border-r border-[#262626] p-6 rounded-none text-xs font-mono space-y-2">
              <div className="flex items-center space-x-2 text-[#D71921]">
                <X className="w-4 h-4 text-[#D71921]" />
                <span className="font-bold uppercase tracking-wider text-sm">
                  [FAILED] Verification Rejected: Invalid Proof
                </span>
              </div>
              <p className="text-zinc-300 font-sans text-xs">
                {verificationResult.error || "Cryptographic Groth16 pairing check failed. Proof witness or signature invalid."}
              </p>
            </div>
          )
        ) : (
          <div className="bg-[#0A0A0A] border border-[#262626] p-5 rounded-none text-zinc-500 font-mono text-xs flex items-center justify-center space-x-2">
            <ShieldCheck className="w-4 h-4 opacity-40" />
            <span className="uppercase text-[11px]">Awaiting Proof Submission From [ 02 Network Inspector ]</span>
          </div>
        )}
      </div>

      {/* Anonymous Nullifier Ledger */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none font-mono text-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F] text-zinc-400">
          <span className="uppercase text-[11px] tracking-wider">// Committed Nullifier Ledger</span>
          <span className="text-zinc-500">{nullifierLedger.length} registered</span>
        </div>

        <div className="bg-black border border-[#1A1A1A] p-4 max-h-[220px] overflow-y-auto space-y-2">
          {nullifierLedger.length > 0 ? (
            nullifierLedger.map((row, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#0D0D0D] border border-[#222222] flex items-center justify-between text-xs"
              >
                <span className="text-zinc-300 truncate max-w-[360px] font-mono">
                  {row.nullifier}
                </span>
                <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">
                  Committed ({row.timestamp})
                </span>
              </div>
            ))
          ) : (
            <div className="text-center text-zinc-600 py-8 text-[11px] uppercase tracking-wider">
              No Nullifiers Committed in Current Session
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
