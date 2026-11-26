"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={label || "Technical explanation"}
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-cyan-300 focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-lg border border-cyan-400/25 bg-slate-950/95 px-3 py-2 text-xs font-normal leading-relaxed text-slate-200 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
