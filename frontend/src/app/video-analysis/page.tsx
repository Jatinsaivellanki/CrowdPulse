"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Film,
  Loader2,
  Play,
  UploadCloud,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchVideoJobResults,
  fetchVideoJobStatus,
  submitVideoJobWithProgress,
} from "@/lib/api";
import { useAnalysisStore } from "@/lib/analysis-store";
import type {
  VideoAnalysisResultsResponse,
  VideoJobStatusResponse,
} from "@/lib/types";

export default function VideoAnalysisPage() {
  const { latestVideoAnalysis, setLatestVideoAnalysis } = useAnalysisStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [samplingRateFps, setSamplingRateFps] = useState<number>(1.0);

  const [uploadPct, setUploadPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<VideoJobStatusResponse | null>(null);
  const [results, setResults] = useState<VideoAnalysisResultsResponse | null>(
    latestVideoAnalysis
  );
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const handleVideoSelected = (file: File) => {
    setError(null);
    setVideoFile(file);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleStartAnalysis = async () => {
    if (!videoFile) {
      setError("Please select a video file first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadPct(0);
    setJobStatus(null);

    try {
      const created = await submitVideoJobWithProgress(
        videoFile,
        samplingRateFps,
        (pct) => setUploadPct(pct)
      );

      // Poll job status until completed or failed
      let finished = false;
      while (!finished) {
        const status = await fetchVideoJobStatus(created.job_id);
        setJobStatus(status);
        if (status.status === "completed") {
          finished = true;
          const finalData = await fetchVideoJobResults(created.job_id);
          setResults(finalData);
          setLatestVideoAnalysis(finalData);
          setSelectedFrameIdx(0);
          break;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "Video processing failed on the server.");
        }
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete video analysis."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const chartData =
    results?.frames.map((f) => ({
      time: `${f.timestamp_sec.toFixed(1)}s`,
      timestamp_sec: f.timestamp_sec,
      count: Number(f.estimated_count.toFixed(2)),
    })) || [];

  const activeFrame = results?.frames[selectedFrameIdx] || null;

  return (
    <div className="space-y-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <Video className="h-3.5 w-3.5" />
          <span>Asynchronous OpenCV Frame Sampling</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Video Analysis
        </h1>
        <p className="mt-1 text-sm text-slate-300 max-w-3xl">
          Upload an MP4, MOV, AVI, MKV, or WEBM clip. The backend extracts frames
          with OpenCV at your chosen sampling rate and executes{" "}
          <code className="font-mono text-cyan-300">CrowdPulseCNN</code> independently
          on each frame.
        </p>
      </div>

      {/* Honest Methodological Guardrail */}
      <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4 text-xs leading-relaxed text-sky-100 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
        <div>
          <strong>Independent Frame Evaluation:</strong> Each sampled frame yields an
          instantaneous crowd-count estimate. Counts from separate frames must{" "}
          <strong>not</strong> be summed as unique visitors, and CrowdPulse does not
          perform person re-identification or individual tracking.
        </div>
      </div>

      {/* Upload & Video Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-950/40 p-7 text-center hover:border-cyan-400/50 hover:bg-slate-900/50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoSelected(file);
              }}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 border border-sky-400/30">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              {videoFile ? videoFile.name : "Select a crowd video file"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supports MP4, MOV, AVI, MKV, WEBM (up to 100 MB, max 120 sampled frames)
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5 flex-1">
              <label
                htmlFor="sampling-rate"
                className="block text-xs font-medium text-slate-300"
              >
                Frame Sampling Rate (frames per second)
              </label>
              <select
                id="sampling-rate"
                value={samplingRateFps}
                onChange={(e) => setSamplingRateFps(Number(e.target.value))}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value={0.5}>0.5 fps (1 frame every 2 seconds)</option>
                <option value={1.0}>1.0 fps (Default · 1 frame/sec)</option>
                <option value={2.0}>2.0 fps (2 frames/sec)</option>
                <option value={3.0}>3.0 fps (3 frames/sec)</option>
                <option value={5.0}>5.0 fps (5 frames/sec)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={!videoFile || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:from-cyan-400 hover:to-sky-400 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Analyze Video</span>
                </>
              )}
            </button>
          </div>

          {submitting && (
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>
                  {jobStatus
                    ? `Job ${jobStatus.status} · ${jobStatus.processed_frames}/${jobStatus.total_sampled_frames || "?"} frames`
                    : `Uploading video (${uploadPct}%)...`}
                </span>
                <span className="font-mono text-cyan-300">
                  {jobStatus ? `${jobStatus.progress_percent.toFixed(0)}%` : `${uploadPct}%`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-300"
                  style={{
                    width: `${
                      jobStatus ? jobStatus.progress_percent : Math.max(8, uploadPct)
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-3.5 text-xs text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Video Preview</h2>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
            {videoPreviewUrl ? (
              <video
                src={videoPreviewUrl}
                controls
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-500 space-y-2 p-6">
                <Film className="mx-auto h-10 w-10" />
                <p className="text-xs">Uploaded video preview will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-slate-400">Average Count / Frame</p>
              <p className="mt-2 text-3xl font-bold font-mono text-cyan-300">
                {results.summary_statistics.average_count.toFixed(1)}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-slate-400">Maximum Frame Count</p>
              <p className="mt-2 text-3xl font-bold font-mono text-amber-300">
                {results.summary_statistics.max_count.toFixed(1)}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-slate-400">Minimum Frame Count</p>
              <p className="mt-2 text-3xl font-bold font-mono text-emerald-300">
                {results.summary_statistics.min_count.toFixed(1)}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs text-slate-400">Sampled Frames</p>
              <p className="mt-2 text-3xl font-bold font-mono text-white">
                {results.sampled_frame_count}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {results.duration_sec.toFixed(1)}s @ {results.sampling_rate_fps} fps
              </p>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Estimated Crowd Count Timeline
              </h2>
              <p className="text-xs text-slate-400">
                Independent CNN predictions plotted against video timestamp (seconds)
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="crowdTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
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
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Estimated Count"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#crowdTimelineGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Selected Frame Inspector + Frame Table */}
          {activeFrame && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Frame #{activeFrame.frame_index} · {activeFrame.timestamp_sec.toFixed(2)}s
                  </h3>
                  <span className="font-mono text-sm font-semibold text-cyan-300">
                    Est. Count: {activeFrame.estimated_count.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">
                      Heatmap Overlay
                    </p>
                    <img
                      src={activeFrame.overlay_image}
                      alt={`Frame ${activeFrame.frame_index} overlay`}
                      className="w-full rounded-xl border border-slate-800 object-contain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">
                      Density Map (48 × 64)
                    </p>
                    <img
                      src={activeFrame.density_map_image}
                      alt={`Frame ${activeFrame.frame_index} density map`}
                      className="w-full rounded-xl border border-slate-800 object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Sampled Frames ({results.frames.length})
                </h3>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 pr-1">
                  {results.frames.map((frame, idx) => (
                    <button
                      key={frame.frame_index}
                      type="button"
                      onClick={() => setSelectedFrameIdx(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs rounded-lg transition-colors ${
                        idx === selectedFrameIdx
                          ? "bg-cyan-500/15 text-cyan-200"
                          : "hover:bg-slate-800/50 text-slate-300"
                      }`}
                    >
                      <span className="font-mono">
                        t = {frame.timestamp_sec.toFixed(2)}s (frame {frame.frame_index})
                      </span>
                      <span className="font-mono font-semibold text-cyan-300">
                        {frame.estimated_count.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
