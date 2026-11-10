"use client";

import React, { useState } from "react";
import { Radio, Shield, Download, Clock, Copy, Check } from "lucide-react";
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
    a.download = `zkode_packet_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl p-6 flex flex-col h-full bg-[#181818] border border-[#313131] transition-weighted">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#313131] mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#272727] border border-[#313131] flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="title-card text-white flex items-center gap-2">
              Network inspector
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#272727] text-zinc-300 font-mono">
                public wire
              </span>
            </h2>
            <p className="caption-meta text-zinc-400 mt-0.5">
              Live audit of bytes traversing the network connection
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-[#1F1F1F] p-1 rounded-lg border border-[#313131]">
          <button
            onClick={() => setActiveTab("json")}
            className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
              activeTab === "json"
                ? "bg-[#272727] text-cyan-300 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab("hex")}
            className={`text-xs font-mono px-2.5 py-1 rounded-md transition-colors ${
              activeTab === "hex"
                ? "bg-[#272727] text-cyan-300 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            HEX
          </button>
        </div>
      </div>

      {/* 0 Bytes PII Indicator Banner (Flat Surface, No Gradient) */}
      <div className="mb-4 p-4 rounded-xl bg-[#1F1F1F] border border-[#313131] flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#272727] border border-[#313131] flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-emerald-400">
                0 bytes
              </span>
              <span className="text-sm font-semibold text-white">
                Personal identity exposure
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Names, birthdates, and real account balances never cross the wire
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-zinc-400 hidden sm:block">
          <div>Payload: <span className="text-zinc-200 font-medium">256 bytes</span></div>
          <div>Curve: <span className="text-zinc-400">alt bn128</span></div>
        </div>
      </div>

      {/* Wire Packet Inspector Panel */}
      <div className="flex-1 bg-[#131209] rounded-xl border border-[#313131] p-4 flex flex-col font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#272727] text-zinc-500 text-xs">
          <span>Packet audit stream</span>
          <div className="flex items-center space-x-3">
            {proofData && (
              <>
                <button
                  onClick={handleCopy}
                  className="hover:text-zinc-300 flex items-center space-x-1 text-zinc-400"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="hover:text-zinc-300 flex items-center space-x-1 text-zinc-400"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download json</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-3 space-y-2 text-zinc-300">
          {proofData ? (
            activeTab === "json" ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-cyan-400 block font-medium">// Groth16 curve point pi a</span>
                  <div className="text-zinc-400 pl-2">
                    [ "{proofData.proof.pi_a[0].slice(0, 24)}...", "{proofData.proof.pi_a[1].slice(0, 24)}..." ]
                  </div>
                </div>
                <div>
                  <span className="text-cyan-400 block font-medium">// Groth16 curve point pi b</span>
                  <div className="text-zinc-400 pl-2">
                    [ [ "{proofData.proof.pi_b[0][0].slice(0, 18)}...", "{proofData.proof.pi_b[0][1].slice(0, 18)}..." ], ... ]
                  </div>
                </div>
                <div>
                  <span className="text-cyan-400 block font-medium">// Groth16 curve point pi c</span>
                  <div className="text-zinc-400 pl-2">
                    [ "{proofData.proof.pi_c[0].slice(0, 24)}...", "{proofData.proof.pi_c[1].slice(0, 24)}..." ]
                  </div>
                </div>
                {nullifierHash && (
                  <div className="pt-2 border-t border-[#272727]">
                    <span className="text-emerald-400 block font-medium">// Anonymous nullifier hash</span>
                    <span className="text-zinc-300 pl-2 break-all text-xs">
                      {nullifierHash}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-400 text-xs break-all leading-relaxed">
                0x{proofData.proof.pi_a[0].slice(0, 32)}0041a7bc89d2e...
                0x{proofData.proof.pi_b[0][0].slice(0, 32)}891048f72a...
                0x{proofData.proof.pi_c[0].slice(0, 32)}77ef910283...
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center py-12">
              <Shield className="w-8 h-8 mb-2 opacity-25" />
              <p className="text-sm">Awaiting proof synthesis in private vault</p>
              <p className="text-xs text-zinc-600 mt-1">Network remains idle until local verification finishes</p>
            </div>
          )}
        </div>
      </div>

      {/* Nonce Guard & Submission */}
      <div className="mt-5 pt-4 border-t border-[#313131] space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Challenge nonce</span>
          </div>
          <span className="text-zinc-200 font-medium truncate max-w-[140px]">
            {sessionNonce ? `${sessionNonce.slice(0, 12)}...` : "None"}
          </span>
          <span className="text-xs text-amber-400 bg-[#272727] px-2 py-0.5 rounded border border-[#313131]">
            TTL {nonceTtl}s
          </span>
        </div>

        <button
          onClick={onSubmitProof}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-weighted flex items-center justify-center space-x-2 border ${
            !canSubmit || isSubmitting
              ? "bg-[#272727] text-zinc-500 border-[#313131] cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <>
              <Radio className="w-4 h-4 animate-spin text-black" />
              <span>Verifying pairing on server</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              <span>Submit proof to verifier</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
