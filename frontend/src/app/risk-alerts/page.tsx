"use client";

import React, { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";
import { analyzeImageWithProgress } from "@/lib/api";
import { DEFAULT_THRESHOLDS, useAnalysisStore } from "@/lib/analysis-store";

type ConcentrationLevel = "Low" | "Moderate" | "High";

function classifyLevel(value: number, moderate: number, high: number): ConcentrationLevel {
  if (value >= high) return "High";
  if (value >= moderate) return "Moderate";
  return "Low";
}

function levelBadgeClasses(level: ConcentrationLevel): string {
  if (level === "High") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (level === "Moderate") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
}

export default function RiskAlertsPage() {
  const {
    latestImageAnalysis,
    latestVideoAnalysis,
    setImageAnalysis,
    thresholds,
    setThresholds,
  } = useAnalysisStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const reader = new FileReader();
      const previewUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const res = await analyzeImageWithProgress(file);
      setImageAnalysis(res, previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run crowd analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const overallLevel: ConcentrationLevel | null = latestImageAnalysis
    ? classifyLevel(
        latestImageAnalysis.estimated_count,
        thresholds.overallModerate,
        thresholds.overallHigh
      )
    : null;

  const regionalLevel: ConcentrationLevel | null = latestImageAnalysis
    ? classifyLevel(
        latestImageAnalysis.top_region.estimated_count,
        thresholds.regionalModerate,
        thresholds.regionalHigh
      )
    : null;

  const alertTriggered =
    (overallLevel && overallLevel !== "Low") ||
    (regionalLevel && regionalLevel !== "Low");

  const videoBreaches = latestVideoAnalysis
    ? latestVideoAnalysis.frames.filter(
        (f) => f.estimated_count >= thresholds.overallModerate
      )
    : [];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Configurable Density Thresholds</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Risk &amp; Concentration Alerts
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Configure transparent count thresholds for overall and 3 × 3 regional
            crowd concentration. Alerts trigger solely when real CNN predictions cross
            your configured limits.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            <span>Evaluate New Image</span>
          </button>
        </div>
      </div>

      {/* Explicit Ethical & Scientific Disclaimer */}
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
        <strong>Important Scientific Limitation:</strong> These levels (Low, Moderate,
        High concentration) are <strong>configurable crowd-concentration indicators</strong>{" "}
        derived from predicted density-map sums. They are <strong>not</strong> medically
        or scientifically validated danger predictions, do <strong>not</strong> predict
        stampedes or crowd crush events, and <code className="font-mono">CrowdPulseCNN</code>{" "}
        was <strong>not</strong> trained to classify hazardous situations.
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Threshold Configuration */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              Threshold Settings
            </h2>
            <button
              type="button"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <p className="font-semibold text-slate-200">
                Overall Frame Estimated Count
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-amber-300">Moderate (≥)</span>
                  <input
                    type="number"
                    min={1}
                    value={thresholds.overallModerate}
                    onChange={(e) =>
                      setThresholds((t) => ({
                        ...t,
                        overallModerate: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-rose-300">High (≥)</span>
                  <input
                    type="number"
                    min={thresholds.overallModerate + 1}
                    value={thresholds.overallHigh}
                    onChange={(e) =>
                      setThresholds((t) => ({
                        ...t,
                        overallHigh: Math.max(
                          t.overallModerate + 1,
                          Number(e.target.value)
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <p className="font-semibold text-slate-200">
                Peak 3 × 3 Region Estimated Count
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-amber-300">Moderate (≥)</span>
                  <input
                    type="number"
                    min={1}
                    value={thresholds.regionalModerate}
                    onChange={(e) =>
                      setThresholds((t) => ({
                        ...t,
                        regionalModerate: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-rose-300">High (≥)</span>
                  <input
                    type="number"
                    min={thresholds.regionalModerate + 1}
                    value={thresholds.regionalHigh}
                    onChange={(e) =>
                      setThresholds((t) => ({
                        ...t,
                        regionalHigh: Math.max(
                          t.regionalModerate + 1,
                          Number(e.target.value)
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-300">
                Low Concentration
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-300">
                Moderate Concentration
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                High Concentration
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Status */}
        <div className="lg:col-span-7 space-y-5">
          {!latestImageAnalysis ? (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
              <ShieldAlert className="mx-auto h-10 w-10 text-slate-500" />
              <h2 className="text-base font-semibold text-white">
                No Active Image Prediction to Evaluate
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Run an image in <strong>Model Testing Lab</strong> or click{" "}
                <strong>Evaluate New Image</strong> to check predictions against your
                configured concentration thresholds.
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Image Concentration Evaluation
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    {latestImageAnalysis.filename}
                  </p>
                </div>
                {alertTriggered ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Threshold Crossed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Within Low Band
                  </span>
                )}
              </div>

              {/* Alert banner ONLY when threshold is actually crossed */}
              {alertTriggered && (
                <div
                  className={`rounded-xl border p-4 text-xs leading-relaxed flex items-start gap-3 ${
                    overallLevel === "High" || regionalLevel === "High"
                      ? "border-rose-500/40 bg-rose-950/40 text-rose-100"
                      : "border-amber-500/40 bg-amber-950/35 text-amber-100"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Concentration Alert Triggered:</strong> Actual CNN prediction
                    crossed the configured threshold (Overall:{" "}
                    <strong>{latestImageAnalysis.estimated_count.toFixed(1)}</strong>{" "}
                    [{overallLevel}], Peak Zone{" "}
                    <strong>{latestImageAnalysis.top_region.label}</strong>:{" "}
                    <strong>
                      {latestImageAnalysis.top_region.estimated_count.toFixed(1)}
                    </strong>{" "}
                    [{regionalLevel}]).
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Overall Density</span>
                    {overallLevel && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${levelBadgeClasses(
                          overallLevel
                        )}`}
                      >
                        {overallLevel} Concentration
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {latestImageAnalysis.estimated_count.toFixed(1)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Moderate ≥ {thresholds.overallModerate} · High ≥{" "}
                    {thresholds.overallHigh}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Peak Zone ({latestImageAnalysis.top_region.label})
                    </span>
                    {regionalLevel && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${levelBadgeClasses(
                          regionalLevel
                        )}`}
                      >
                        {regionalLevel} Concentration
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {latestImageAnalysis.top_region.estimated_count.toFixed(1)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Moderate ≥ {thresholds.regionalModerate} · High ≥{" "}
                    {thresholds.regionalHigh}
                  </p>
                </div>
              </div>
            </div>
          )}

          {latestVideoAnalysis && (
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Latest Video Threshold Scan ({latestVideoAnalysis.filename})
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  {videoBreaches.length} / {latestVideoAnalysis.sampled_frame_count}{" "}
                  frames ≥ {thresholds.overallModerate}
                </span>
              </div>
              {videoBreaches.length === 0 ? (
                <p className="text-xs text-emerald-300">
                  No sampled video frames crossed the Moderate ({thresholds.overallModerate})
                  overall threshold.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/80 text-xs">
                  {videoBreaches.map((f) => {
                    const lvl = classifyLevel(
                      f.estimated_count,
                      thresholds.overallModerate,
                      thresholds.overallHigh
                    );
                    return (
                      <div
                        key={f.frame_index}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="font-mono text-slate-300">
                          t = {f.timestamp_sec.toFixed(2)}s (frame {f.frame_index})
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-white">
                            {f.estimated_count.toFixed(1)}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelBadgeClasses(
                              lvl
                            )}`}
                          >
                            {lvl}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
