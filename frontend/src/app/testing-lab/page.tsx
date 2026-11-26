"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { BackendOfflineCard } from "@/components/BackendOfflineCard";
import { InfoTooltip } from "@/components/InfoTooltip";
import { analyzeImageWithProgress, fetchHealth } from "@/lib/api";
import { useAnalysisStore } from "@/lib/analysis-store";
import type { HealthResponse, ImageAnalysisResponse } from "@/lib/types";

export default function TestingLabPage() {
  const { setImageAnalysis, latestImageAnalysis, latestImagePreviewUrl } =
    useAnalysisStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(latestImagePreviewUrl);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(
    latestImageAnalysis?.original_dimensions ?? null
  );
  const [isDragging, setIsDragging] = useState(false);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResponse | null>(
    latestImageAnalysis
  );

  const checkBackend = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const h = await fetchHealth();
      setHealth(h);
      setHealthError(null);
    } catch (err) {
      setHealth(null);
      setHealthError(err instanceof Error ? err.message : "Unable to reach backend");
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  const handleFileSelection = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedTypes.includes(file.type) && !["jpg", "jpeg", "png"].includes(ext)) {
      setAnalysisError("Unsupported file type. Please select a JPG, JPEG, or PNG image.");
      return;
    }

    setAnalysisError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreviewUrl(dataUrl);
      const probe = new window.Image();
      probe.onload = () => {
        setImageDims({ width: probe.naturalWidth, height: probe.naturalHeight });
      };
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  };

  const runAnalysis = async () => {
    if (!selectedFile) {
      setAnalysisError("Please upload an image before running analysis.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setUploadProgress(0);

    try {
      const response = await analyzeImageWithProgress(selectedFile, (pct) =>
        setUploadProgress(pct)
      );
      setResult(response);
      if (previewUrl) {
        setImageAnalysis(response, previewUrl);
      }
      await checkBackend();
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : "Crowd analysis request failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadDensityMap = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.density_map_image;
    const baseName = result.filename.replace(/\.[^.]+$/, "");
    a.download = `${baseName}_density_map.png`;
    a.click();
  };

  const downloadResultJson = () => {
    if (!result) return;
    const exportPayload = {
      filename: result.filename,
      estimated_count: result.estimated_count,
      original_dimensions: result.original_dimensions,
      preprocessed_dimensions: result.preprocessed_dimensions,
      density_map_shape: result.density_map_shape,
      inference_time_ms: result.inference_time_ms,
      verification: result.verification,
      regional_breakdown: result.regional_breakdown,
      density_map_values: result.density_map_values,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = result.filename.replace(/\.[^.]+$/, "");
    a.download = `${baseName}_crowdpulse_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Live CNN Inference Verification</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Model Testing Lab
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            Upload any crowd photograph (JPG, JPEG, PNG) to execute live PyTorch{" "}
            <code className="font-mono text-cyan-300">CrowdPulseCNN</code> inference,
            verify the <code className="font-mono text-cyan-300">48 × 64</code> density
            map output, and inspect the spatial heatmap overlay.
          </p>
        </div>

        <button
          type="button"
          onClick={checkBackend}
          disabled={checkingHealth}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-cyan-200 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checkingHealth ? "animate-spin" : ""}`} />
          <span>Test Backend Connectivity</span>
        </button>
      </div>

      {healthError && <BackendOfflineCard error={healthError} onRetry={checkBackend} />}

      {/* Upload + Verification Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upload Zone */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? "border-cyan-400 bg-cyan-500/10"
                : "border-slate-700/80 bg-slate-950/40 hover:border-cyan-400/50 hover:bg-slate-900/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelection(file);
              }}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">
              Drag and drop a crowd image here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Accepted formats: JPG, JPEG, PNG (max 20 MB). Preprocessed to 256 × 192 RGB.
            </p>
          </div>

          {previewUrl && (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={previewUrl}
                  alt="Uploaded preview"
                  className="h-16 w-20 rounded-lg object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-white">
                    {selectedFile?.name || result?.filename || "Selected Image"}
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    {imageDims
                      ? `${imageDims.width} × ${imageDims.height} px`
                      : "Reading dimensions..."}
                    {selectedFile
                      ? ` · ${(selectedFile.size / 1024).toFixed(1)} KB`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={runAnalysis}
                disabled={analyzing || !selectedFile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running Inference...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Run Crowd Analysis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {analyzing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading &amp; running CrowdPulseCNN forward pass...</span>
                <span className="font-mono text-cyan-300">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-200"
                  style={{ width: `${Math.max(12, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {analysisError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-4 text-sm text-rose-200 flex items-start gap-2.5">
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}
        </div>

        {/* Technical Inference Verification Panel */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Technical Inference Verification
            </h2>
            <InfoTooltip text="Technical verification confirms the CNN executed cleanly and returned finite, non-negative 48×64 outputs. It does not measure predictive accuracy on unlabeled uploads." />
          </div>

          <div className="space-y-2.5 text-xs">
            <VerificationRow
              label="Backend Connectivity"
              ok={Boolean(health)}
              detail={health ? `Connected (${health.device.toUpperCase()})` : "Not connected"}
            />
            <VerificationRow
              label="Model Weights Status"
              ok={Boolean(health?.model_loaded)}
              detail={
                health?.model_loaded
                  ? `${health.model_name} loaded`
                  : "Model not loaded"
              }
            />
            <VerificationRow
              label="Expected Output Shape (48 × 64)"
              ok={result ? result.verification.output_shape_valid : null}
              detail={
                result
                  ? `Actual: ${result.verification.actual_output_shape.join(" × ")}`
                  : "Awaiting inference"
              }
            />
            <VerificationRow
              label="Finite & Non-Negative Values"
              ok={
                result
                  ? result.verification.all_finite &&
                    result.verification.all_non_negative
                  : null
              }
              detail={
                result
                  ? result.verification.all_finite &&
                    result.verification.all_non_negative
                    ? "Verified (Softplus >= 0)"
                    : "Invalid tensor values detected"
                  : "Awaiting inference"
              }
            />
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3.5 text-xs leading-relaxed text-amber-200/90">
            <strong>Methodological Note:</strong> Technical inference verification confirms
            that the neural network pipeline works end-to-end. A single uploaded image
            without ground-truth head annotations does not establish model accuracy—see{" "}
            <span className="underline">Model Performance</span> for official benchmark
            metrics.
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result ? (
        <div className="space-y-6">
          {/* Summary Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-5 border-cyan-400/30">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Estimated Crowd Count
              </p>
              <p className="mt-2 text-4xl font-bold font-mono text-cyan-300">
                {result.estimated_count.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Sum of 48 × 64 predicted density map values
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                Inference Time
              </p>
              <p className="mt-2 text-3xl font-bold font-mono text-white">
                {result.inference_time_ms.toFixed(2)}{" "}
                <span className="text-base font-normal text-slate-400">ms</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Preprocessed: {result.preprocessed_dimensions.width} ×{" "}
                {result.preprocessed_dimensions.height} →{" "}
                {result.density_map_shape.join(" × ")}
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Export Artifacts
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={downloadDensityMap}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Density Map PNG</span>
                </button>
                <button
                  type="button"
                  onClick={downloadResultJson}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 transition-colors"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  <span>Analysis JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Panel Visual Inspection */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Original Image</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {result.original_dimensions.width} × {result.original_dimensions.height}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Original uploaded crowd"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-600" />
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Predicted Density Map
                </h3>
                <span className="text-[11px] font-mono text-cyan-300">
                  {result.density_map_shape[0]} × {result.density_map_shape[1]}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                <img
                  src={result.density_map_image}
                  alt="Generated CNN density map"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Heatmap Overlay</h3>
                <span className="text-[11px] font-mono text-sky-300">
                  Turbo Colormap Blend
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                <img
                  src={result.overlay_image}
                  alt="Density heatmap overlay on original image"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
          <ImageIcon className="mx-auto h-10 w-10 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-200">
            No Crowd Analysis Executed Yet
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload a crowd photo above and click <strong>Run Crowd Analysis</strong> to
            generate real CNN predictions, density maps, and verification metrics.
          </p>
        </div>
      )}
    </div>
  );
}

function VerificationRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean | null;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-950/60 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {ok === true && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
        {ok === false && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
        {ok === null && (
          <span className="h-3.5 w-3.5 rounded-full border border-slate-600 shrink-0" />
        )}
        <span className="font-medium text-slate-200">{label}</span>
      </div>
      <span
        className={`font-mono text-[11px] ${
          ok === true
            ? "text-emerald-300"
            : ok === false
            ? "text-rose-300"
            : "text-slate-400"
        }`}
      >
        {detail}
      </span>
    </div>
  );
}
