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
    <div
      className={`rounded-2xl p-6 flex flex-col h-full bg-[#181818] border transition-weighted ${
        signatureTampered
          ? "border-rose-500/80 bg-[#1F1F1F]"
          : "border-[#313131]"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#313131] mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#272727] border border-[#313131] flex items-center justify-center text-indigo-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="title-card text-white flex items-center gap-2">
              Private vault
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#272727] text-zinc-300 font-mono">
                client memory
              </span>
            </h2>
            <p className="caption-meta text-zinc-400 mt-0.5">
              Raw personal data stored strictly in local browser memory
            </p>
          </div>
        </div>

        <button
          onClick={onMintNewDemo}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#272727] hover:bg-[#313131] border border-[#313131] text-zinc-200 transition-colors flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Mint sample</span>
        </button>
      </div>

      {signatureTampered && (
        <div className="mb-4 p-4 rounded-xl bg-[#272727] border border-rose-500/60 text-rose-300 text-xs flex items-start space-x-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold block text-rose-200">Digital signature mismatch</span>
            <p className="text-zinc-400 mt-0.5 text-xs">
              Local balance modified without issuer signature. In circuit assertion will reject proof synthesis.
            </p>
          </div>
        </div>
      )}

      {/* Credential Cards Container */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {/* 1. National Identity Card */}
        <div className="p-4 rounded-xl bg-[#1F1F1F] border border-[#313131] hover:border-[#454545] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-white">Identity record</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded-md bg-[#272727] border border-[#313131]">
              Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Date of birth</span>
              <span className="text-zinc-200 font-medium">{credentials.birthTimestamp} (Age 23)</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Holder secret salt</span>
              <span className="text-zinc-400 truncate block">0x{credentials.userSecretId.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* 2. Bank Financial Statement */}
        <div className="p-4 rounded-xl bg-[#1F1F1F] border border-[#313131] hover:border-[#454545] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-white">Banking credential</span>
            </div>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded-md bg-[#272727] border border-[#313131]">
              EdDSA signed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Liquid balance</span>
              <span className={`text-base font-semibold ${signatureTampered ? "text-rose-400 line-through" : "text-emerald-400"}`}>
                ₹{parseInt(credentials.actualBalance || "0", 10).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Annual income</span>
              <span className="text-zinc-200 font-medium">
                ₹{parseInt(credentials.actualIncome || "0", 10).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#313131] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Expiry: {credentials.expirationTimestamp}</span>
            <span className="truncate max-w-[140px] text-zinc-500">
              Sig: {credentials.sigS.slice(0, 10)}...
            </span>
          </div>
        </div>

        {/* 3. University Academic Merit */}
        <div className="p-4 rounded-xl bg-[#1F1F1F] border border-[#313131] hover:border-[#454545] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-medium text-white">Academic portal</span>
            </div>
            <span className="text-xs font-mono text-violet-400 px-2 py-0.5 rounded-md bg-[#272727] border border-[#313131]">
              Accredited
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Grade average</span>
              <span className="text-zinc-200 font-medium">
                {(parseInt(credentials.creditOrCgpaScore || "0", 10) / 100).toFixed(2)} / 10.00
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px] mb-0.5">Circuit score</span>
              <span className="text-zinc-300 font-medium">{credentials.creditOrCgpaScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prover Action Trigger */}
      <div className="mt-5 pt-4 border-t border-[#313131]">
        <button
          onClick={onGenerateProof}
          disabled={isProving}
          className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-weighted flex items-center justify-center space-x-2 border ${
            isProving
              ? "bg-[#272727] text-zinc-500 border-[#313131] cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 active:scale-[0.98]"
          }`}
        >
          {isProving ? (
            <>
              <Cpu className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Synthesizing proof in WebAssembly</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              <span>Generate proof (WASM)</span>
            </>
          )}
        </button>

        {proverTimeMs > 0 && (
          <div className="mt-2.5 text-center text-xs font-mono text-zinc-400 flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Proof synthesized locally in</span>
            <span className="text-emerald-400 font-semibold">{proverTimeMs} ms</span>
          </div>
        )}
      </div>
    </div>
  );
};
