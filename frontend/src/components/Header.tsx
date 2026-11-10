"use client";

import React from "react";
import { ShieldCheck, Cpu, Terminal, ExternalLink } from "lucide-react";

interface HeaderProps {
  serverHealthy: boolean;
  proverReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ serverHealthy, proverReady }) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-3 sticky top-0 z-50">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                zkode
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold tracking-wider">
                v2.1 Groth16
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Client-Side Zero-Knowledge Selective Disclosure Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Circuit: 8,493 Constraints</span>
          </div>

          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            <span
              className={`w-2 h-2 rounded-full ${
                serverHealthy ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-zinc-300">
              {serverHealthy ? "Backend Synced" : "Local Fallback"}
            </span>
          </div>

          <a
            href="https://github.com/RohitKSahoo/zkode"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
