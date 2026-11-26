"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Database,
  FlaskConical,
  Layers,
  RefreshCw,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BackendOfflineCard } from "@/components/BackendOfflineCard";
import { InfoTooltip } from "@/components/InfoTooltip";
import { fetchHealth, fetchModelConfig, fetchModelMetrics } from "@/lib/api";
import type {
  HealthResponse,
  ModelConfigResponse,
  ModelMetricsResponse,
} from "@/lib/types";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [config, setConfig] = useState<ModelConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, m, c] = await Promise.all([
        fetchHealth(),
        fetchModelMetrics(),
        fetchModelConfig(),
      ]);
      setHealth(h);
      setMetrics(m);
      setConfig(c);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load CrowdPulse backend metadata."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overall = metrics?.evaluation.Overall;
  const partA = metrics?.evaluation["Part A"];
  const partB = metrics?.evaluation["Part B"];
  const modelCfg = config?.model_config_data;

  const comparisonData =
    overall && partA && partB
      ? [
          { subset: "Overall (2,988)", MAE: Number(overall.MAE.toFixed(3)), RMSE: Number(overall.RMSE.toFixed(3)) },
          { subset: "Part A (1,092)", MAE: Number(partA.MAE.toFixed(3)), RMSE: Number(partA.RMSE.toFixed(3)) },
          { subset: "Part B (1,896)", MAE: Number(partB.MAE.toFixed(3)), RMSE: Number(partB.RMSE.toFixed(3)) },
        ]
      : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Database className="h-3.5 w-3.5" />
            <span>Offline Test-Set Benchmark · ShanghaiTech Part A &amp; Part B</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CrowdPulse Intelligence Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 leading-relaxed">
            Supervised convolutional neural network (CNN) platform for spatial crowd
            density-map regression and crowd count estimation. All benchmark figures
            below reflect official offline test-set evaluations, not live camera feeds.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {error && <BackendOfflineCard error={error} onRetry={loadDashboard} />}

      {/* Primary KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="glass-panel h-32 animate-pulse rounded-2xl bg-slate-900/40"
            />
          ))}
        </div>
      ) : (
        overall &&
        partA &&
        partB && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Official Test Images
                  </span>
                  <span className="rounded-lg bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                    Offline Benchmark
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono text-white">
                  {overall.Images.toLocaleString()}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Part A: {partA.Images.toLocaleString()} · Part B:{" "}
                  {partB.Images.toLocaleString()}
                </p>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center text-xs font-medium uppercase tracking-wider text-slate-400">
                  <span>Overall MAE</span>
                  <InfoTooltip text="Mean Absolute Error across all 2,988 official test images. Lower means closer average count predictions." />
                </div>
                <p className="mt-3 text-3xl font-bold font-mono text-cyan-300">
                  {overall.MAE.toFixed(3)}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Mean Bias: +{overall["Mean Bias"].toFixed(3)} people
                </p>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center text-xs font-medium uppercase tracking-wider text-slate-400">
                  <span>Overall RMSE</span>
                  <InfoTooltip text="Root Mean Squared Error penalizes large counting errors on extreme-density scenes more heavily than MAE." />
                </div>
                <p className="mt-3 text-3xl font-bold font-mono text-sky-300">
                  {overall.RMSE.toFixed(3)}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Sensitive to high-density outliers in Part A
                </p>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Part A MAE
                  </span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Dense Crowds
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono text-amber-300">
                  {partA.MAE.toFixed(3)}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  RMSE: {partA.RMSE.toFixed(3)} across {partA.Images.toLocaleString()} images
                </p>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Part B MAE
                  </span>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    Street Scenes
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono text-emerald-300">
                  {partB.MAE.toFixed(3)}
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  RMSE: {partB.RMSE.toFixed(3)} across {partB.Images.toLocaleString()} images
                </p>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Model Architecture &amp; Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      health?.model_loaded
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {health?.model_loaded ? "Weights Loaded" : "Unavailable"}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-white">
                  {modelCfg?.model_name || "CrowdPulseCNN"}
                </p>
                <p className="mt-1.5 text-xs font-mono text-slate-400">
                  {modelCfg
                    ? `${modelCfg.trainable_parameters.toLocaleString()} params · ${modelCfg.input_width}×${modelCfg.input_height} → ${modelCfg.output_height}×${modelCfg.output_width} (${modelCfg.activation})`
                    : "PyTorch Density Regressor"}
                </p>
              </div>
            </div>

            {/* Quick Navigation & Subset Comparison */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 flex flex-col gap-4">
                <Link
                  href="/testing-lab"
                  className="glass-panel glass-panel-hover group rounded-2xl p-6 flex items-center justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300 border border-cyan-400/30">
                      <FlaskConical className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        Model Testing Lab
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        Upload JPG/PNG images for live CNN inference, inspect the
                        48×64 density map, heatmap overlay, and verification checks.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/video-analysis"
                  className="glass-panel glass-panel-hover group rounded-2xl p-6 flex items-center justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-sky-500/15 p-3 text-sky-300 border border-sky-400/30">
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white group-hover:text-sky-300 transition-colors">
                        Video Analysis Pipeline
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        Sample frames with OpenCV, run independent CNN density
                        regression per frame, and inspect the temporal count timeline.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    <span>Inference Pipeline Contract</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-slate-400">Input Tensor</p>
                      <p className="mt-1 font-mono font-semibold text-white">
                        RGB · {config?.preprocessing.input_resize.join("×")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-slate-400">Density Output</p>
                      <p className="mt-1 font-mono font-semibold text-cyan-300">
                        {modelCfg?.output_height}×{modelCfg?.output_width} Map
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-slate-400">Best Epoch</p>
                      <p className="mt-1 font-mono font-semibold text-white">
                        Epoch {modelCfg?.best_epoch}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                      <p className="text-slate-400">Compute Device</p>
                      <p className="mt-1 font-mono font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5" />
                        {health?.device.toUpperCase() || "CPU"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Official Test-Set Error Comparison (Part A vs Part B)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Lower values indicate closer agreement with ground-truth crowd counts
                    </p>
                  </div>
                  <Link
                    href="/performance"
                    className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    Full Evaluation →
                  </Link>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="subset" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#091022",
                          borderColor: "rgba(34, 211, 238, 0.3)",
                          borderRadius: "12px",
                          color: "#e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="MAE" name="MAE (people)" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="RMSE" name="RMSE (people)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
