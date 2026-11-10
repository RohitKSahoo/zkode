"use client";

import React from "react";
import { ShieldCheck, Cpu, ExternalLink } from "lucide-react";

interface HeaderProps {
  serverHealthy: boolean;
  proverReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ serverHealthy, proverReady }) => {
  return (
    <header className="sticky top-3 z-50 px-4 mb-4">
      <div className="max-w-[1600px] mx-auto rounded-xl bg-[#181818]/90 backdrop-blur-md border border-[#313131] px-5 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#272727] border border-[#313131] flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-white">
              zkode
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-[#272727] border border-[#313131] text-zinc-300 font-mono">
              Groth16 v2.1
            </span>
            <span className="text-xs text-zinc-400 hidden md:inline ml-2 pl-2 border-l border-[#313131]">
              Zero knowledge selective disclosure engine
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-md bg-[#1F1F1F] border border-[#313131] text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>8,493 constraints</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-[#1F1F1F] border border-[#313131]">
            <span
              className={`w-2 h-2 rounded-full ${
                serverHealthy ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-zinc-300">
              {serverHealthy ? "Verifier active" : "Local fallback"}
            </span>
          </div>

          <a
            href="https://github.com/RohitKSahoo/zkode"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-[#1F1F1F] hover:bg-[#272727] border border-[#313131] text-zinc-300 transition-colors"
          >
            <span>Repository</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        </div>
      </div>
    </header>
  );
};
