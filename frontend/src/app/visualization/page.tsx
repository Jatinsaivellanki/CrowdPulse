"use client";

import React, { useRef, useState } from "react";
import { Grid3X3, Info, Loader2, UploadCloud } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeImageWithProgress } from "@/lib/api";
import { useAnalysisStore } from "@/lib/analysis-store";

export default function CrowdVisualizationPage() {
  const { latestImageAnalysis, latestImagePreviewUrl, setImageAnalysis } =
    useAnalysisStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickUpload = async (file: File) => {
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
      setError(err instanceof Error ? err.message : "Failed to analyze image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = latestImageAnalysis;
  const maxRegionCount = analysis
    ? Math.max(...analysis.regional_breakdown.map((r) => r.estimated_count), 0.001)
    : 1;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>3 × 3 Spatial Density Breakdown</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Crowd Visualization
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Inspect how predicted crowd density distributes spatially across a 3 × 3
            partition of the <code className="font-mono text-cyan-300">48 × 64</code>{" "}
            output map.
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
              if (f) handleQuickUpload(f);
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
            <span>{analysis ? "Analyze Another Image" : "Upload Image to Visualize"}</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Regional Method Note:</strong> Regional count contributions are
          computed directly by summing the predicted 48 × 64 density-map pixel values
          within each 3 × 3 spatial zone. CrowdPulse does not run independent object or
          person bounding-box detection.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!analysis ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <Grid3X3 className="mx-auto h-10 w-10 text-slate-500" />
          <h2 className="text-base font-semibold text-white">
            No Image Density Map Loaded
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Run an image in the <strong>Model Testing Lab</strong> or click{" "}
            <strong>Upload Image to Visualize</strong> above to view its 3 × 3 spatial
            concentration breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top / Lowest KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-slate-400">Total Estimated Count</p>
              <p className="mt-2 text-3xl font-bold font-mono text-white">
                {analysis.estimated_count.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-slate-400 truncate">
                Source: {analysis.filename}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5 border-amber-400/25">
              <p className="text-xs text-amber-300/90 uppercase tracking-wider font-medium">
                Top Concentration Region
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {analysis.top_region.label}
              </p>
              <p className="mt-1 text-xs font-mono text-amber-300">
                {analysis.top_region.estimated_count.toFixed(2)} est. count (
                {analysis.top_region.share_percent.toFixed(1)}%)
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5 border-emerald-400/25">
              <p className="text-xs text-emerald-300/90 uppercase tracking-wider font-medium">
                Lowest Concentration Region
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {analysis.lowest_region.label}
              </p>
              <p className="mt-1 text-xs font-mono text-emerald-300">
                {analysis.lowest_region.estimated_count.toFixed(2)} est. count (
                {analysis.lowest_region.share_percent.toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* Original, Density, Overlay */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="glass-panel rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Original Image
              </h3>
              {latestImagePreviewUrl && (
                <img
                  src={latestImagePreviewUrl}
                  alt="Original"
                  className="w-full rounded-xl border border-slate-800 aspect-[4/3] object-contain bg-slate-950"
                />
              )}
            </div>
            <div className="glass-panel rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Predicted Density Map (48 × 64)
              </h3>
              <img
                src={analysis.density_map_image}
                alt="Density map"
                className="w-full rounded-xl border border-slate-800 aspect-[4/3] object-contain bg-slate-950"
              />
            </div>
            <div className="glass-panel rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Spatial Heatmap Overlay
              </h3>
              <img
                src={analysis.overlay_image}
                alt="Heatmap overlay"
                className="w-full rounded-xl border border-slate-800 aspect-[4/3] object-contain bg-slate-950"
              />
            </div>
          </div>

          {/* 3x3 Grid + Regional Bar Chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  3 × 3 Regional Concentration Matrix
                </h2>
                <p className="text-xs text-slate-400">
                  Estimated crowd count &amp; percentage share per spatial cell
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {analysis.regional_breakdown.map((cell) => {
                  const intensity = cell.estimated_count / maxRegionCount;
                  const isTop = cell.label === analysis.top_region.label;
                  return (
                    <div
                      key={cell.label}
                      className={`rounded-xl border p-3 transition-all ${
                        isTop
                          ? "border-cyan-400/60 shadow-md shadow-cyan-500/15"
                          : "border-slate-800"
                      }`}
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${(
                          0.05 +
                          intensity * 0.28
                        ).toFixed(3)})`,
                      }}
                    >
                      <p className="text-[11px] font-medium text-slate-300">
                        {cell.label}
                      </p>
                      <p className="mt-1 text-lg font-bold font-mono text-white">
                        {cell.estimated_count.toFixed(1)}
                      </p>
                      <p className="text-[11px] font-mono text-cyan-300">
                        {cell.share_percent.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Regional Estimated Count Contributions
                </h2>
                <p className="text-xs text-slate-400">
                  Comparison across all nine spatial zones
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analysis.regional_breakdown}
                    margin={{ top: 10, right: 12, left: 0, bottom: 28 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="label"
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
                        color: "#e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="estimated_count" name="Estimated Count" radius={[6, 6, 0, 0]}>
                      {analysis.regional_breakdown.map((entry) => (
                        <Cell
                          key={entry.label}
                          fill={
                            entry.label === analysis.top_region.label
                              ? "#22d3ee"
                              : "#3b82f6"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
