"use client";

import React from "react";
import { AlertOctagon, RotateCcw, Zap, Copy, Search, ShieldCheck } from "lucide-react";

interface RedTeamAttackBarProps {
  onInjectFakeBalance: () => void;
  onReplayProof: () => void;
  onProbeUnquantized: () => void;
  onTamperWire: () => void;
  onReset: () => void;
  activeAttack: string;
}

export const RedTeamAttackBar: React.FC<RedTeamAttackBarProps> = ({
  onInjectFakeBalance,
  onReplayProof,
  onProbeUnquantized,
  onTamperWire,
  onReset,
  activeAttack,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-rose-500/30 backdrop-blur-xl px-4 py-3 shadow-[0_-5px_25px_rgba(244,63,94,0.1)]">
      <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Live Red-Team Exploit Suite:
          </span>
          {activeAttack !== "NONE" && (
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold">
              ACTIVE: {activeAttack}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onInjectFakeBalance}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/50 text-zinc-300 hover:text-rose-200 text-xs font-mono transition-all flex items-center space-x-1.5"
            title="Alters balance in local RAM to test in-circuit EdDSA verification"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>💉 Inject Fake ₹10L</span>
          </button>

          <button
            onClick={onReplayProof}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 hover:text-amber-200 text-xs font-mono transition-all flex items-center space-x-1.5"
            title="Submits a previously committed nullifier to test Sybil defense"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>🔄 Replay Stolen Proof</span>
          </button>

          <button
            onClick={onProbeUnquantized}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-cyan-950/40 border border-zinc-800 hover:border-cyan-500/50 text-zinc-300 hover:text-cyan-200 text-xs font-mono transition-all flex items-center space-x-1.5"
            title="Sends non-quantized policy (₹63,412) to test client entropy guard"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>🔍 Probe ₹63,412</span>
          </button>

          <button
            onClick={onTamperWire}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-violet-950/40 border border-zinc-800 hover:border-violet-500/50 text-zinc-300 hover:text-violet-200 text-xs font-mono transition-all flex items-center space-x-1.5"
            title="Modifies public signals on wire to test server-authoritative reconstruction"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>⚡ Tamper Wire</span>
          </button>

          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-mono transition-all flex items-center space-x-1.5 ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>↺ Reset Clean</span>
          </button>
        </div>
      </div>
    </div>
  );
};
