"use client";

import React, { useState } from "react";
import { Radio, Shield, Download, Clock, CheckCircle2, Copy, Check } from "lucide-react";
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
    a.download = `zkode_audit_packet_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col h-full border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
              Network Inspector
              <span className="text-[10px] lowercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                public wire
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Cryptographic audit of data transmitted across the wire</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveTab("json")}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              activeTab === "json" ? "bg-zinc-800 text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab("hex")}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              activeTab === "hex" ? "bg-zinc-800 text-cyan-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            HEX
          </button>
        </div>
      </div>

      {/* Hero 0 Bytes PII Shield Badge */}
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-emerald-400">
                0 BYTES
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                PII Transmitted
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Zero names, birthdates, or balances leave device
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-zinc-400 hidden sm:block">
          <div>Payload: <span className="text-zinc-200 font-bold">256 Bytes</span></div>
          <div>Curve: <span className="text-zinc-200">alt_bn128</span></div>
        </div>
      </div>

      {/* Wire Packet Inspector Panel */}
      <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-900 p-3 flex flex-col font-mono text-[11px] overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-900 text-zinc-500 text-[10px]">
          <span>PACKET DISSECTION</span>
          <div className="flex items-center space-x-2">
            {proofData && (
              <>
                <button
                  onClick={handleCopy}
                  className="hover:text-zinc-300 flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="hover:text-zinc-300 flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Audit JSON</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-2 space-y-2 text-zinc-300">
          {proofData ? (
            activeTab === "json" ? (
              <div className="space-y-2">
                <div>
                  <span className="text-cyan-400 block font-bold">// Groth16 π_A (Point on G1)</span>
                  <div className="text-zinc-400 pl-2">
                    [ "{proofData.proof.pi_a[0].slice(0, 20)}...", "{proofData.proof.pi_a[1].slice(0, 20)}..." ]
                  </div>
                </div>
                <div>
                  <span className="text-cyan-400 block font-bold">// Groth16 π_B (Point on G2)</span>
                  <div className="text-zinc-400 pl-2">
                    [ [ "{proofData.proof.pi_b[0][0].slice(0, 16)}...", "{proofData.proof.pi_b[0][1].slice(0, 16)}..." ], ... ]
                  </div>
                </div>
                <div>
                  <span className="text-cyan-400 block font-bold">// Groth16 π_C (Point on G1)</span>
                  <div className="text-zinc-400 pl-2">
                    [ "{proofData.proof.pi_c[0].slice(0, 20)}...", "{proofData.proof.pi_c[1].slice(0, 20)}..." ]
                  </div>
                </div>
                {nullifierHash && (
                  <div className="pt-2 border-t border-zinc-900">
                    <span className="text-emerald-400 block font-bold">// Sybil Nullifier Hash</span>
                    <span className="text-zinc-300 pl-2 break-all text-[10px]">
                      {nullifierHash}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-400 text-[10px] break-all leading-relaxed">
                0x{proofData.proof.pi_a[0].slice(0, 32)}0041a7bc89d2e...
                0x{proofData.proof.pi_b[0][0].slice(0, 32)}891048f72a...
                0x{proofData.proof.pi_c[0].slice(0, 32)}77ef910283...
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center py-10">
              <Shield className="w-8 h-8 mb-2 opacity-30" />
              <p>Awaiting proof generation in Private Vault...</p>
              <p className="text-[10px] text-zinc-700 mt-1">No network traffic will be generated until proved</p>
            </div>
          )}
        </div>
      </div>

      {/* Nonce Guard & Submission */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Anti-Replay Nonce:</span>
          </div>
          <span className="text-zinc-200 font-bold truncate max-w-[120px]">
            {sessionNonce ? `${sessionNonce.slice(0, 10)}...` : "None"}
          </span>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            TTL: {nonceTtl}s
          </span>
        </div>

        <button
          onClick={onSubmitProof}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg ${
            !canSubmit || isSubmitting
              ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-500/20 hover:shadow-cyan-500/30"
          }`}
        >
          {isSubmitting ? (
            <>
              <Radio className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Verifying Cryptographic Pairing...</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              <span>Submit Proof to Verifier</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
