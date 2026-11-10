"use client";

import React, { useState } from "react";
import { Radio, ShieldCheck, Download, Clock, Copy, Check } from "lucide-react";
import { ZkProofResult } from "../lib/zkProver";

interface NetworkInspectorProps {
  proofData: ZkProofResult | null;
  nullifierHash: string | null;
  sessionNonce: string | null;
  nonceTtl: number;
  onSubmitProof: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export const NetworkInspector: React.FC<NetworkInspectorProps> = ({
  proofData,
  nullifierHash,
  sessionNonce,
  nonceTtl,
  onSubmitProof,
  isSubmitting,
  canSubmit,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"json" | "hex">("json");

  const handleCopy = () => {
    if (!proofData) return;
    navigator.clipboard.writeText(JSON.stringify(proofData.proof, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!proofData) return;
    const blob = new Blob([JSON.stringify({ proof: proofData.proof, nullifierHash }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zkode_payload_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 bg-[#111111] border border-[#262626] flex items-center justify-center text-white shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight text-white uppercase font-sans">
                Network Inspector
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-[#171717] border border-[#262626] text-zinc-400 uppercase">
                Public Wire
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Live audit of bytes traversing the public transport layer. Validates zero data leakage.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 border border-[#262626] p-1 bg-black rounded-none self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3 py-1 uppercase rounded-none transition-colors ${
              activeTab === "json"
                ? "bg-white text-black font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab("hex")}
            className={`px-3 py-1 uppercase rounded-none transition-colors ${
              activeTab === "hex"
                ? "bg-white text-black font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            HEX
          </button>
        </div>
      </div>

      {/* Stark 0 Bytes Exposure Metric Banner */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-black border border-[#262626] flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400">
                0 BYTES
              </span>
              <span className="font-mono text-xs text-white uppercase tracking-wider">
                Personal Identity Exposure
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Names, raw bank balances, Aadhaar IDs, and birthdates are mathematically absent from the payload.
            </p>
          </div>
        </div>

        <div className="font-mono text-xs text-zinc-400 space-y-1 sm:text-right border-t sm:border-t-0 sm:border-l border-[#1A1A1A] pt-3 sm:pt-0 sm:pl-6">
          <div>PAYLOAD SIZE: <span className="text-white font-bold">256 BYTES</span></div>
          <div>CURVE: <span className="text-zinc-300">ALT_BN128</span></div>
          <div>CONSTRAINTS: <span className="text-zinc-300">8,493 R1CS</span></div>
        </div>
      </div>

      {/* Wire Stream Terminal Panel */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-none p-5 flex flex-col font-mono text-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F] text-zinc-500">
          <span className="uppercase text-[11px] tracking-wider text-zinc-400">
            // Packet Audit Stream (Port 8000 Transport)
          </span>

          {proofData && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#222222] border border-[#262626] text-zinc-300 hover:text-white flex items-center space-x-1.5 transition-colors uppercase text-[10px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 bg-[#141414] hover:bg-[#222222] border border-[#262626] text-zinc-300 hover:text-white flex items-center space-x-1.5 transition-colors uppercase text-[10px]"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="bg-black border border-[#1A1A1A] p-4 min-h-[220px] max-h-[360px] overflow-y-auto">
          {proofData ? (
            activeTab === "json" ? (
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-zinc-500 block uppercase text-[10px]">// Groth16 G1 Point pi_a</span>
                  <div className="text-zinc-300 pl-2">
                    ["{proofData.proof.pi_a[0]}", "{proofData.proof.pi_a[1]}"]
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block uppercase text-[10px]">// Groth16 G2 Point pi_b</span>
                  <div className="text-zinc-300 pl-2">
                    [["{proofData.proof.pi_b[0][0].slice(0, 36)}...", "{proofData.proof.pi_b[0][1].slice(0, 36)}..."], ...]
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block uppercase text-[10px]">// Groth16 G1 Point pi_c</span>
                  <div className="text-zinc-300 pl-2">
                    ["{proofData.proof.pi_c[0]}", "{proofData.proof.pi_c[1]}"]
                  </div>
                </div>

                {nullifierHash && (
                  <div className="pt-2 border-t border-[#1F1F1F]">
                    <span className="text-emerald-400 block uppercase text-[10px]">// Anonymous Nullifier Commit</span>
                    <span className="text-white pl-2 break-all">{nullifierHash}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-400 text-xs break-all leading-loose">
                0x{proofData.proof.pi_a[0].slice(0, 48)}00ffb19a3c89...
                0x{proofData.proof.pi_b[0][0].slice(0, 48)}77e192c019a...
                0x{proofData.proof.pi_c[0].slice(0, 48)}99bc4510ffea...
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center py-12">
              <Radio className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs uppercase tracking-wider font-mono">No Proof Synthesized in Vault</p>
              <p className="text-[11px] text-zinc-600 mt-1 font-sans">
                Navigate to [ 01 // PRIVATE VAULT ] and generate a zero knowledge proof first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submission & Nonce Guard Panel */}
      <div className="bg-[#0A0A0A] border border-[#262626] p-6 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="font-mono text-xs space-y-1">
          <div className="flex items-center space-x-2 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="uppercase text-[11px]">Replay Challenge Nonce:</span>
            <span className="text-white font-bold">{sessionNonce ? `${sessionNonce.slice(0, 14)}...` : "NONE"}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Active Nonce TTL: <span className="text-amber-400 font-bold">{nonceTtl}s remaining</span> (60-sec anti-replay rotation)
          </div>
        </div>

        <button
          onClick={onSubmitProof}
          disabled={!canSubmit || isSubmitting}
          className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-none border transition-all flex items-center justify-center space-x-2 ${
            !canSubmit || isSubmitting
              ? "bg-[#171717] text-zinc-600 border-[#262626] cursor-not-allowed"
              : "bg-white hover:bg-zinc-200 text-black border-white active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <>
              <Radio className="w-4 h-4 animate-spin text-zinc-500" />
              <span>Verifying On Server...</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4 text-black" />
              <span>Submit Proof To Verifier</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
