import React from "react";
import { BookOpen, Cpu, Database, Layers, ShieldAlert, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Academic Engineering Overview</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          About CrowdPulse
        </h1>
        <p className="mt-1 text-sm text-slate-300 leading-relaxed">
          Technical architecture, supervised learning methodology, dataset scope, and
          engineering limitations prepared for academic evaluation and project viva.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="glass-panel rounded-2xl p-6 space-y-2.5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400" />
            Problem Statement &amp; Objectives
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Traditional bounding-box object detectors struggle in dense public scenes
            where severe occlusion, small head scales, and overlapping silhouettes hide
            individuals. CrowdPulse addresses this using{" "}
            <strong>supervised density-map regression</strong>, estimating both total
            crowd count and spatial concentration directly from an RGB image.
          </p>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pt-1">
            <li>Serve the real trained PyTorch CNN through a decoupled FastAPI service.</li>
            <li>Visualize 48 × 64 spatial density maps and heatmap overlays interactively.</li>
            <li>Provide frame-sampled video analysis and configurable density indicators.</li>
            <li>Present official ShanghaiTech benchmark errors transparently without hype.</li>
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-2.5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-sky-400" />
            Dataset: ShanghaiTech Part A &amp; Part B
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The model was trained and evaluated on the ShanghaiTech crowd counting
            benchmark across two distinct subsets totaling{" "}
            <strong className="text-white">2,988 official test images</strong>:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pt-1">
            <li>
              <strong>Part A (1,092 test images):</strong> Internet-sourced high-density
              scenes with extreme crowd variation (Test MAE: 129.577, RMSE: 195.125).
            </li>
            <li>
              <strong>Part B (1,896 test images):</strong> Metropolitan street scenes
              captured from fixed elevated cameras (Test MAE: 28.855, RMSE: 44.830).
            </li>
          </ul>
        </section>
      </div>

      {/* Density Map Regression & Architecture */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          CNN Architecture &amp; Density-Map Regression
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Instead of predicting a single scalar directly,{" "}
          <code className="font-mono text-cyan-300">CrowdPulseCNN</code> (379,297
          trainable parameters) maps a{" "}
          <code className="font-mono text-white">256 × 192</code> RGB image (normalized
          to <code className="font-mono text-white">[0, 1]</code>) through a
          convolutional encoder-decoder into a{" "}
          <code className="font-mono text-cyan-300">48 × 64</code> spatial density map
          smoothed with Gaussian kernels (<code className="font-mono">sigma = 1.5</code>).
          Summing every pixel in the predicted map produces the estimated crowd count.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-1">
            <p className="font-semibold text-cyan-300">Encoder (Downsampling ×4)</p>
            <p className="text-slate-300 font-mono leading-relaxed">
              Conv(3→32)×2 + MaxPool(2)
              <br />
              Conv(32→64)×2 + MaxPool(2)
              <br />
              Conv(64→128)×2 + ReLU
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-1">
            <p className="font-semibold text-sky-300">Decoder Head</p>
            <p className="text-slate-300 font-mono leading-relaxed">
              Conv(128→64, 3×3) + ReLU
              <br />
              Conv(64→32, 3×3) + ReLU
              <br />
              Conv(32→1, 1×1)
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-1">
            <p className="font-semibold text-emerald-300">Output &amp; Training</p>
            <p className="text-slate-300 font-mono leading-relaxed">
              Activation: Softplus (≥ 0)
              <br />
              20 Epochs · LR 1e-4 → 2.5e-5
              <br />
              Best Val MAE: 88.089 (Epoch 20)
            </p>
          </div>
        </div>
      </section>

      {/* Limitations & Tech Stack */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="glass-panel rounded-2xl p-6 space-y-3 border-amber-400/20">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Scope &amp; Honest Limitations
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <li>
              Estimates aggregate spatial crowd density; it does not locate individual
              faces/bodies or draw bounding boxes.
            </li>
            <li>
              Part A extreme-crowd accuracy is considerably weaker than Part B street-scene
              accuracy.
            </li>
            <li>
              Video mode samples frames independently with OpenCV; frame counts must not
              be summed as unique visitors.
            </li>
            <li>
              Alert thresholds measure estimated density only—they do not predict
              stampedes or physical safety hazards.
            </li>
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            Technology Stack
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <p className="font-semibold text-cyan-300">Frontend (Vercel)</p>
              <p className="text-slate-300">
                Next.js, React, TypeScript, Tailwind CSS, Recharts, Lucide Icons
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <p className="font-semibold text-sky-300">Backend (Python Host)</p>
              <p className="text-slate-300">
                FastAPI, PyTorch, OpenCV, NumPy, Pillow, Pandas
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
