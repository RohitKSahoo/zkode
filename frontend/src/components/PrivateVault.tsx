"use client";

import React from "react";
import { Lock, AlertTriangle, Cpu, Sparkles, Check, User, Building2, GraduationCap } from "lucide-react";
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
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 bg-[#111111] border border-[#262626] flex items-center justify-center text-white shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight text-white uppercase font-sans">
                Private Vault
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#171717] border border-[#262626] text-zinc-400 uppercase">
                Client Memory
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Raw personal data stored strictly in local browser memory. Zero plaintext transmission.
            </p>
          </div>
        </div>

        <button
          onClick={onMintNewDemo}
          className="px-4 py-2 bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-zinc-400 text-xs font-mono text-zinc-200 uppercase tracking-wider flex items-center justify-center space-x-2 transition-all rounded-none self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span>Mint Sample</span>
        </button>
      </div>

      {/* Signature Tamper Alert */}
      {signatureTampered && (
        <div className="p-4 bg-[#0A0A0A] border-l-2 border-[#D71921] border-y border-r border-[#262626] text-xs font-mono flex items-start space-x-3 rounded-none">
          <AlertTriangle className="w-4 h-4 text-[#D71921] mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-white uppercase block tracking-wider">
              [CRITICAL] Digital Signature Mismatch
            </span>
            <p className="text-zinc-400 mt-1 text-xs">
              Local financial balance was manipulated without issuer EdDSA re-signing. In-circuit assertion verification will fail.
            </p>
          </div>
        </div>
      )}

      {/* Credentials Grid - Spread across screen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. National Identity Card */}
        <div className="bg-[#0A0A0A] border border-[#262626] hover:border-[#404040] p-6 rounded-none flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A] mb-5">
              <div className="flex items-center space-x-2 text-zinc-300">
                <User className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs uppercase font-medium">01 // Identity</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[#141414] border border-[#262626] text-emerald-400">
                Verified
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Date of Birth</span>
                <span className="text-white font-medium text-base">{credentials.birthTimestamp}</span>
                <span className="text-zinc-500 text-xs ml-2">(Age 23)</span>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Holder Secret ID</span>
                <span className="text-zinc-400 text-xs truncate block font-mono">
                  0x{credentials.userSecretId.slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1A1A1A] text-[10px] font-mono text-zinc-500 uppercase">
            Format: ISO-8601 YYYYMMDD
          </div>
        </div>

        {/* 2. Banking Financial Statement */}
        <div className="bg-[#0A0A0A] border border-[#262626] hover:border-[#404040] p-6 rounded-none flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A] mb-5">
              <div className="flex items-center space-x-2 text-zinc-300">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs uppercase font-medium">02 // Banking</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[#141414] border border-[#262626] text-cyan-400">
                EdDSA Signed
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Liquid Balance</span>
                <span className={`text-lg font-bold ${signatureTampered ? "text-[#D71921] line-through" : "text-white"}`}>
                  ₹{parseInt(credentials.actualBalance || "0", 10).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Annual Income</span>
                <span className="text-zinc-300 font-medium text-sm">
                  ₹{parseInt(credentials.actualIncome || "0", 10).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>EXP: {credentials.expirationTimestamp}</span>
            <span className="truncate max-w-[120px]">SIG: {credentials.sigS.slice(0, 10)}...</span>
          </div>
        </div>

        {/* 3. Academic Portal Credential */}
        <div className="bg-[#0A0A0A] border border-[#262626] hover:border-[#404040] p-6 rounded-none flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A] mb-5">
              <div className="flex items-center space-x-2 text-zinc-300">
                <GraduationCap className="w-4 h-4 text-zinc-400" />
                <span className="font-mono text-xs uppercase font-medium">03 // Academic</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[#141414] border border-[#262626] text-zinc-300">
                Accredited
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Grade Average</span>
                <span className="text-white font-bold text-lg">
                  {(parseInt(credentials.creditOrCgpaScore || "0", 10) / 100).toFixed(2)}
                  <span className="text-zinc-500 text-xs font-normal"> / 10.00</span>
                </span>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">Quantized Score</span>
                <span className="text-zinc-300 font-medium text-sm">{credentials.creditOrCgpaScore} PTS</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#1A1A1A] text-[10px] font-mono text-zinc-500 uppercase">
            Proof Scale: 100x Multiplier
          </div>
        </div>
      </div>

      {/* Proof Action Panel */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-mono uppercase font-bold text-white tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#D71921]" />
            Local Proving Engine (Browser WebAssembly)
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-sans max-w-xl">
            Groth16 SNARK proof synthesis over alt_bn128 curve inside dedicated Web Worker. Zero DOM blocking.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <button
            onClick={onGenerateProof}
            disabled={isProving}
            className={`px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-none border transition-all flex items-center justify-center space-x-2 ${
              isProving
                ? "bg-[#171717] text-zinc-500 border-[#262626] cursor-wait"
                : "bg-white hover:bg-zinc-200 text-black border-white active:scale-[0.98]"
            }`}
          >
            {isProving ? (
              <>
                <Cpu className="w-4 h-4 animate-spin text-zinc-500" />
                <span>Computing Witness & Proof...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 text-black" />
                <span>Generate Proof (WASM)</span>
              </>
            )}
          </button>

          {proverTimeMs > 0 && (
            <div className="font-mono text-[11px] text-zinc-400 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Synthesized in:</span>
              <span className="text-emerald-400 font-bold">{proverTimeMs} ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
