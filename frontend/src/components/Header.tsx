"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md border-b border-[#262626]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Project Name Only */}
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-[#D71921]" />
          <span className="font-mono text-sm tracking-wider uppercase font-bold text-white">
            zkode
          </span>
        </div>

        {/* GitHub Redirection Only */}
        <a
          href="https://github.com/RohitKSahoo/zkode"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1 font-mono text-xs text-zinc-300 hover:text-white border border-[#262626] hover:border-white bg-[#0A0A0A] transition-colors rounded-none uppercase"
        >
          <span>GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </div>
    </header>
  );
};
