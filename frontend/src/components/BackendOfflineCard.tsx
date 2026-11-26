import React from "react";
import { AlertTriangle, Terminal } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";

export function BackendOfflineCard({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  const apiUrl = getApiBaseUrl() || "(NEXT_PUBLIC_API_URL unset)";

  return (
    <div className="glass-panel rounded-2xl border-rose-500/30 bg-rose-950/20 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-rose-200">
              Inference Backend Unavailable
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
            <p className="text-xs font-mono text-slate-400">
              Configured endpoint: <span className="text-cyan-300">{apiUrl}</span>
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
          >
            Retry Connection
          </button>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span>Backend Setup Checklist</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-400">
          <li>
            Start the Python FastAPI server:{" "}
            <code className="text-cyan-300">uvicorn app.main:app --host 0.0.0.0 --port 8000</code>
          </li>
          <li>
            Verify <code className="text-cyan-300">NEXT_PUBLIC_API_URL</code> points to the
            running backend without a trailing slash.
          </li>
          <li>
            Confirm <code className="text-cyan-300">CORS_ORIGINS</code> on the backend permits
            this frontend origin.
          </li>
        </ol>
      </div>
    </div>
  );
}
