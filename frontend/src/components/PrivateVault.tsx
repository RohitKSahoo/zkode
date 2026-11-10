"use client";

import React from "react";
import { Lock, ShieldAlert, Cpu, Sparkles, CheckCircle2, User, Building, GraduationCap } from "lucide-react";
import { PrivateCredentials } from "../lib/witnessBuilder";

interface PrivateVaultProps {
  credentials: PrivateCredentials;
  isProving: boolean;
  proverTimeMs: number;
  onGenerateProof: () => void;
  onMintNewDemo: () => void;
  signatureTampered: boolean;
}

export const PrivateVault: React.FC<PrivateVaultProps> = ({
  credentials,
  isProving,
  proverTimeMs,
  onGenerateProof,
  onMintNewDemo,
  signatureTampered,
}) => {
  return (
    <div className={`glass-panel rounded-xl p-5 flex flex-col h-full border transition-all duration-300 ${
      signatureTampered ? "glass-panel-glow-rose border-rose-500/50" : "border-zinc-800"
    }`}>
      {/* Column Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
              Private Vault
              <span className="text-[10px] lowercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                client ram
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Raw PII stored 100% locally in device memory</p>
          </div>
        </div>

        <button
          onClick={onMintNewDemo}
          className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors flex items-center space-x-1"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Mint Sample</span>
        </button>
      </div>

      {signatureTampered && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">IN-CIRCUIT EDDSA SIGNATURE FORGERY:</span>
            <p className="text-[11px] text-rose-300/80 mt-0.5">
              The local balance was tampered. The BabyJubJub signature no longer matches Poseidon hash. Groth16 proof generation will fail.
            </p>
          </div>
        </div>
      )}

      {/* Credential Cards Container */}
      <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
        {/* 1. National Identity Card */}
        <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">Aadhaar / National ID</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 block">Date of Birth</span>
              <span className="text-zinc-200">{credentials.birthTimestamp} (Age 23)</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Master Secret ID</span>
              <span className="text-zinc-400 truncate block">0x{credentials.userSecretId.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* 2. Bank Financial Statement */}
        <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">State Bank of India</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              EdDSA Signed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 block">Liquid Savings Balance</span>
              <span className={`text-base font-bold ${signatureTampered ? "text-rose-400 line-through" : "text-emerald-400"}`}>
                ₹{parseInt(credentials.actualBalance || "0", 10).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Annual Income</span>
              <span className="text-zinc-200">
                ₹{parseInt(credentials.actualIncome || "0", 10).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Valid Until: {credentials.expirationTimestamp}</span>
            <span className="text-zinc-400 truncate max-w-[140px]">
              SigS: {credentials.sigS.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* 3. University Academic Merit */}
        <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">National Institute of Tech</span>
            </div>
            <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
              Academic Seal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 block">Cumulative GPA</span>
              <span className="text-zinc-200 font-bold">
                {(parseInt(credentials.creditOrCgpaScore || "0", 10) / 100).toFixed(2)} / 10.00
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Scaled Circuit Score</span>
              <span className="text-zinc-300">{credentials.creditOrCgpaScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prover Action Trigger */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80">
        <button
          onClick={onGenerateProof}
          disabled={isProving}
          className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg ${
            isProving
              ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20 hover:shadow-emerald-500/30"
          }`}
        >
          {isProving ? (
            <>
              <Cpu className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Generating Groth16 Proof (WASM)...</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              <span>Generate Proof (WASM Prover)</span>
            </>
          )}
        </button>

        {proverTimeMs > 0 && (
          <div className="mt-2 text-center text-[11px] font-mono text-zinc-400 flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Witness synthesized & proved in</span>
            <span className="text-emerald-400 font-bold">{proverTimeMs} ms</span>
          </div>
        )}
      </div>
    </div>
  );
};
