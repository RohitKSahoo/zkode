"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md border-b border-[#262626]">
      <div className="w-full px-6 sm:px-10 h-16 flex items-center justify-between">
        {/* ZKode SVG Logo */}
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 2172 724"
            className="h-8 sm:h-9 w-auto"
            role="img"
            aria-labelledby="header-zkode-title header-zkode-desc"
          >
            <title id="header-zkode-title">ZKode logo</title>
            <desc id="header-zkode-desc">
              Deep red ZK monogram with a subtle bright red gradient toward the bottom, followed by white ode lettering.
            </desc>
            <defs>
              <linearGradient id="header-zk-red" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="#880808" />
                <stop offset="62%" stopColor="#a10a0a" />
                <stop offset="100%" stopColor="#f20b0b" />
              </linearGradient>
            </defs>

            {/* Z: custom path */}
            <path
              fill="url(#header-zk-red)"
              d="M360 195 H689
                C713 195 730 205 736 222
                C745 246 727 268 707 286
                L514 472 H671 L760 568 H321
                C301 568 287 558 292 537
                C295 523 306 513 320 500
                L553 282 H293 Z"
            />

            {/* K: custom angular arms */}
            <path
              fill="url(#header-zk-red)"
              d="M864 195 H1002 L803 391 L980 568 H819 L653 400 Z"
            />

            {/* ode: rendered in white for high contrast on black Nothing OS background */}
            <text
              x="1005"
              y="568"
              fill="#FFFFFF"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="380"
              fontWeight="700"
              letterSpacing="-13"
            >
              ode
            </text>
          </svg>
        </div>

        {/* GitHub Redirection */}
        <a
          href="https://github.com/RohitKSahoo/zkode"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 font-mono text-xs text-zinc-300 hover:text-white border border-[#262626] hover:border-white bg-[#0A0A0A] transition-colors rounded-none uppercase"
        >
          <span>GitHub</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </div>
    </header>
  );
};
