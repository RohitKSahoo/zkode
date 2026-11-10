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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#181818]/95 border-t border-[#313131] backdrop-blur-xl px-4 py-3 shadow-2xl">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-semibold text-rose-300 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Live security exploit test suite
          </span>
          {activeAttack !== "NONE" && (
            <span className="text-xs bg-[#272727] text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded font-mono">
              Active test: {activeAttack}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onInjectFakeBalance}
            className="px-3.5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] hover:border-rose-500/60 text-zinc-200 text-xs font-medium transition-weighted flex items-center space-x-1.5 active:scale-[0.98]"
            title="Alters balance in local memory to test in circuit signature verification"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>Inject fake balance</span>
          </button>

          <button
            onClick={onReplayProof}
            className="px-3.5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] hover:border-amber-500/60 text-zinc-200 text-xs font-medium transition-weighted flex items-center space-x-1.5 active:scale-[0.98]"
            title="Submits a previously committed nullifier to test duplicate prevention"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Replay stolen proof</span>
          </button>

          <button
            onClick={onProbeUnquantized}
            className="px-3.5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] hover:border-cyan-500/60 text-zinc-200 text-xs font-medium transition-weighted flex items-center space-x-1.5 active:scale-[0.98]"
            title="Requests fine threshold to test client entropy guard"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Probe fine balance</span>
          </button>

          <button
            onClick={onTamperWire}
            className="px-3.5 py-2 rounded-lg bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] hover:border-violet-500/60 text-zinc-200 text-xs font-medium transition-weighted flex items-center space-x-1.5 active:scale-[0.98]"
            title="Corrupts public signals on wire to test authoritative reconstruction"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>Tamper wire payload</span>
          </button>

          <button
            onClick={onReset}
            className="px-3.5 py-2 rounded-lg bg-[#272727] hover:bg-[#313131] border border-[#313131] text-zinc-300 text-xs font-medium transition-weighted flex items-center space-x-1.5 ml-1 active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset state</span>
          </button>
        </div>
      </div>
    </div>
  );
};
