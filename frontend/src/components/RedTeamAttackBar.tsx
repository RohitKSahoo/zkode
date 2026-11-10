"use client";

import React, { useState } from "react";
import { AlertOctagon, RotateCcw, Zap, Copy, Search, ShieldAlert, ChevronUp, ChevronDown } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-6 z-40 font-mono">
      {/* Expanded Modal/Drawer */}
      {isOpen ? (
        <div className="bg-[#0A0A0A] border border-[#262626] shadow-2xl p-5 mb-2 w-[340px] sm:w-[420px] rounded-none space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 bg-[#D71921] animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                Security Exploit Suite
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white uppercase border border-[#262626] bg-[#141414] rounded-none flex items-center space-x-1"
            >
              <span>Close</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 font-sans">
            Fire adversarial exploits to verify circuit constraints, EdDSA signatures, and Sybil nullifier locks.
          </p>

          {activeAttack !== "NONE" && (
            <div className="p-2 bg-[#141414] border-l border-[#D71921] text-[10px] text-zinc-300 flex items-center justify-between">
              <span className="text-[#D71921] uppercase font-bold">Active: {activeAttack}</span>
              <button
                onClick={onReset}
                className="underline text-zinc-400 hover:text-white uppercase ml-2"
              >
                Reset
              </button>
            </div>
          )}

          {/* Exploit Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onInjectFakeBalance();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] hover:border-zinc-400 text-xs text-zinc-200 transition-colors rounded-none flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-[#D71921]" />
                <span className="uppercase text-[11px] font-bold">01 // Inject Fake Balance (₹10L)</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase">Tamper State</span>
            </button>

            <button
              onClick={() => {
                onReplayProof();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] hover:border-zinc-400 text-xs text-zinc-200 transition-colors rounded-none flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span className="uppercase text-[11px] font-bold">02 // Replay Stolen Proof</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase">Sybil Attack</span>
            </button>

            <button
              onClick={() => {
                onProbeUnquantized();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] hover:border-zinc-400 text-xs text-zinc-200 transition-colors rounded-none flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span className="uppercase text-[11px] font-bold">03 // Probe Fine Balance</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase">Entropy Probe</span>
            </button>

            <button
              onClick={() => {
                onTamperWire();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#262626] hover:border-zinc-400 text-xs text-zinc-200 transition-colors rounded-none flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
                <span className="uppercase text-[11px] font-bold">04 // Tamper Wire Payload</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase">Corrupt Point</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#1F1F1F] flex justify-between items-center text-[11px]">
            <span className="text-zinc-500">Reset all test states:</span>
            <button
              onClick={onReset}
              className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333333] text-zinc-300 hover:text-white uppercase flex items-center space-x-1.5 transition-colors rounded-none"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Pill Button */
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center space-x-2 px-4 py-2.5 bg-[#0A0A0A] hover:bg-[#141414] border border-[#262626] hover:border-white shadow-xl text-xs uppercase tracking-wider text-zinc-200 transition-all rounded-none active:scale-95"
        >
          <span className="w-2 h-2 bg-[#D71921] animate-pulse" />
          <span className="font-bold">Exploit Suite (4)</span>
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
        </button>
      )}
    </div>
  );
};
