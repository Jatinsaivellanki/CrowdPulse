import React from "react";

export function CrowdPulseLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-sky-500/15 to-indigo-500/20 border border-cyan-400/35 shadow-inner shadow-cyan-400/10">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-cyan-300"
        >
          <circle cx="12" cy="7" r="2.2" fill="currentColor" />
          <circle cx="6.5" cy="11.5" r="1.8" fill="#38bdf8" opacity="0.85" />
          <circle cx="17.5" cy="11.5" r="1.8" fill="#38bdf8" opacity="0.85" />
          <path
            d="M4 17.5C5.6 15.1 8.5 14 12 14C15.5 14 18.4 15.1 20 17.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M3 12H6L8 9.5L10.5 14.5L12.5 11L14.5 13L16.5 12H21"
            stroke="#22d3ee"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <span className="text-lg font-semibold tracking-tight text-white">
            Crowd<span className="text-cyan-400">Pulse</span>
          </span>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
            CNN Density Analytics
          </p>
        </div>
      )}
    </div>
  );
}
