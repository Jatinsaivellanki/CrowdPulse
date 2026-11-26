"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { BackendOfflineCard } from "@/components/BackendOfflineCard";
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  fetchEvaluationData,
  fetchModelMetrics,
  getEvaluationPlotUrl,
} from "@/lib/api";
import type { EvaluationDataResponse, ModelMetricsResponse } from "@/lib/types";

export default function ModelPerformancePage() {
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [evalData, setEvalData] = useState<EvaluationDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOfficialPlots, setShowOfficialPlots] = useState(false);

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, ed] = await Promise.all([
        fetchModelMetrics(),
        fetchEvaluationData(),
      ]);
      setMetrics(m);
      setEvalData(ed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load evaluation artifacts from backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  const partAPoints =
    evalData?.scatter_points.filter((p) => p.subset === "A") || [];
  const partBPoints =
    evalData?.scatter_points.filter((p) => p.subset === "B") || [];

  const maxAxisVal = Math.max(
    2300,
    ...(evalData?.scatter_points.map((p) =>
      Math.max(p.actual_count, p.predicted_count)
    ) || [0])
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Official Training &amp; Test Evaluation Artifacts</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Model Performance
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-3xl">
            Empirical performance loaded directly from{" "}
            <code className="font-mono text-cyan-300">evaluation.json</code>,{" "}
            <code className="font-mono text-cyan-300">training_history.csv</code>, and{" "}
            <code className="font-mono text-cyan-300">test_predictions.csv</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPerformance}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Reload Artifacts</span>
        </button>
      </div>

      {error && <BackendOfflineCard error={error} onRetry={loadPerformance} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="glass-panel h-36 animate-pulse rounded-2xl bg-slate-900/40"
            />
          ))}
        </div>
      ) : (
        metrics &&
        evalData && (
          <>
            {/* Plain-language MAE / RMSE Explainer + Part A vs B Warning */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-2 text-xs leading-relaxed text-slate-300">
                <h2 className="text-sm font-semibold text-white">
                  Understanding MAE and RMSE
                </h2>
                <p>
                  <strong className="text-cyan-300">
                    MAE (Mean Absolute Error):
                  </strong>{" "}
                  Average absolute difference between predicted crowd count and true
                  annotated head count across all test images. An MAE of{" "}
                  <span className="font-mono text-white">
                    {metrics.evaluation.Overall.MAE.toFixed(3)}
                  </span>{" "}
                  means predictions differ from ground truth by ~66 people on average.
                </p>
                <p>
                  <strong className="text-sky-300">
                    RMSE (Root Mean Squared Error):
                  </strong>{" "}
                  Square root of the average squared error. Because errors are squared
                  before averaging, large misses on dense crowds strongly increase RMSE (
                  <span className="font-mono text-white">
                    {metrics.evaluation.Overall.RMSE.toFixed(3)}
                  </span>
                  ).
                </p>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-xs leading-relaxed text-amber-100 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">
                    Part A Performance is Substantially Weaker Than Part B
                  </p>
                  <p>
                    ShanghaiTech Part A (MAE{" "}
                    <strong className="font-mono">
                      {metrics.evaluation["Part A"].MAE.toFixed(3)}
                    </strong>
                    , RMSE{" "}
                    <strong className="font-mono">
                      {metrics.evaluation["Part A"].RMSE.toFixed(3)}
                    </strong>
                    ) contains heavily congested, highly varied scenes, whereas Part B
                    (MAE{" "}
                    <strong className="font-mono">
                      {metrics.evaluation["Part B"].MAE.toFixed(3)}
                    </strong>
                    , RMSE{" "}
                    <strong className="font-mono">
                      {metrics.evaluation["Part B"].RMSE.toFixed(3)}
                    </strong>
                    ) features sparser street-level viewpoints.
                  </p>
                </div>
              </div>
            </div>

            {/* Subset Metric Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(["Overall", "Part A", "Part B"] as const).map((key) => {
                const m = metrics.evaluation[key];
                const extra = evalData.subset_summary[key];
                return (
                  <div key={key} className="glass-panel rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">{key}</h3>
                      <span className="font-mono text-xs text-slate-400">
                        {m.Images.toLocaleString()} test images
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
                        <p className="text-slate-400">MAE</p>
                        <p className="mt-1 font-mono text-base font-bold text-cyan-300">
                          {m.MAE.toFixed(3)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
                        <p className="text-slate-400">RMSE</p>
                        <p className="mt-1 font-mono text-base font-bold text-sky-300">
                          {m.RMSE.toFixed(3)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
                        <p className="text-slate-400">Mean Bias</p>
                        <p className="mt-1 font-mono text-base font-bold text-white">
                          {m["Mean Bias"] >= 0 ? "+" : ""}
                          {m["Mean Bias"].toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {extra && (
                      <p className="text-[11px] font-mono text-slate-400">
                        Median |Error|: {extra.median_abs_error} · 90th pct:{" "}
                        {extra.p90_abs_error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Training & Validation Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div className="flex items-center">
                  <h3 className="text-base font-semibold text-white">
                    Training &amp; Validation Loss (20 Epochs)
                  </h3>
                  <InfoTooltip text="Loss values recorded at each epoch in training_history.csv." />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evalData.training_history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#091022",
                          borderColor: "rgba(34, 211, 238, 0.3)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="train_loss"
                        name="Training Loss"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="val_loss"
                        name="Validation Loss"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div className="flex items-center">
                  <h3 className="text-base font-semibold text-white">
                    Validation MAE Curve (Best: 88.089 at Epoch 20)
                  </h3>
                  <InfoTooltip text="Validation Mean Absolute Error per epoch from training_history.csv." />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evalData.training_history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#091022",
                          borderColor: "rgba(34, 211, 238, 0.3)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="val_mae"
                        name="Validation MAE (people)"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ r: 3.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Scatter Plot & Error Distribution */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Actual vs Predicted Crowd Counts
                  </h3>
                  <p className="text-xs text-slate-400">
                    Stratified sample from {evalData.total_test_rows.toLocaleString()}{" "}
                    official test predictions (dashed diagonal = ideal prediction)
                  </p>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, bottom: 16, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        type="number"
                        dataKey="actual_count"
                        name="Actual Count"
                        domain={[0, Math.ceil(maxAxisVal / 100) * 100]}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis
                        type="number"
                        dataKey="predicted_count"
                        name="Predicted Count"
                        domain={[0, Math.ceil(maxAxisVal / 100) * 100]}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <ZAxis range={[28, 28]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        contentStyle={{
                          backgroundColor: "#091022",
                          borderColor: "rgba(34, 211, 238, 0.3)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <ReferenceLine
                        segment={[
                          { x: 0, y: 0 },
                          { x: 2200, y: 2200 },
                        ]}
                        stroke="#f43f5e"
                        strokeDasharray="5 5"
                      />
                      <Scatter
                        name="Part A"
                        data={partAPoints}
                        fill="#f59e0b"
                        fillOpacity={0.75}
                      />
                      <Scatter
                        name="Part B"
                        data={partBPoints}
                        fill="#22d3ee"
                        fillOpacity={0.75}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Prediction Absolute Error Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histogram across all {evalData.total_test_rows.toLocaleString()} test
                    images grouped by error range (people)
                  </p>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={evalData.error_distribution}
                      margin={{ top: 10, right: 12, bottom: 24, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="range"
                        stroke="#94a3b8"
                        fontSize={11}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#091022",
                          borderColor: "rgba(34, 211, 238, 0.3)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        dataKey="part_b"
                        stackId="err"
                        name="Part B Images"
                        fill="#22d3ee"
                      />
                      <Bar
                        dataKey="part_a"
                        stackId="err"
                        name="Part A Images"
                        fill="#f59e0b"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Official PNG Artifact Toggle + Training History Table */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Training History &amp; Artifact Plots
                  </h3>
                  <p className="text-xs text-slate-400">
                    Epoch-wise log from training_history.csv and original matplotlib plots
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfficialPlots((v) => !v)}
                  className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                >
                  {showOfficialPlots
                    ? "Hide Official Artifact PNGs"
                    : "View Official Artifact PNGs"}
                </button>
              </div>

              {showOfficialPlots && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-slate-800 bg-white/95 p-2">
                    <img
                      src={getEvaluationPlotUrl("training_history.png")}
                      alt="Official training history plot"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-white/95 p-2">
                    <img
                      src={getEvaluationPlotUrl("test_evaluation.png")}
                      alt="Official test evaluation plot"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Epoch</th>
                      <th className="px-4 py-2.5">Train Loss</th>
                      <th className="px-4 py-2.5">Val Loss</th>
                      <th className="px-4 py-2.5">Val MAE</th>
                      <th className="px-4 py-2.5">Val RMSE</th>
                      <th className="px-4 py-2.5">Learning Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono text-slate-200">
                    {evalData.training_history.map((row) => (
                      <tr key={row.epoch} className="hover:bg-slate-900/50">
                        <td className="px-4 py-2">{row.epoch}</td>
                        <td className="px-4 py-2">{row.train_loss.toFixed(4)}</td>
                        <td className="px-4 py-2">{row.val_loss.toFixed(4)}</td>
                        <td className="px-4 py-2 text-cyan-300">
                          {row.val_mae.toFixed(3)}
                        </td>
                        <td className="px-4 py-2">{row.val_rmse.toFixed(3)}</td>
                        <td className="px-4 py-2 text-slate-400">
                          {row.learning_rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
