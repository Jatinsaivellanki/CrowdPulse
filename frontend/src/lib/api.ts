import type {
  EvaluationDataResponse,
  HealthResponse,
  ImageAnalysisResponse,
  ModelConfigResponse,
  ModelMetricsResponse,
  VideoAnalysisResultsResponse,
  VideoJobCreateResponse,
  VideoJobStatusResponse,
} from "./types";

export function getApiBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }
  return "";
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return `HTTP ${res.status} ${res.statusText}`;
  } catch {
    return `HTTP ${res.status} ${res.statusText}`;
  }
}

function assertConfiguredUrl(): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured. Set NEXT_PUBLIC_API_URL in your environment variables to the deployed FastAPI backend URL."
    );
  }
  return base;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchModelMetrics(): Promise<ModelMetricsResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/model/metrics`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchModelConfig(): Promise<ModelConfigResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/model/config`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchEvaluationData(): Promise<EvaluationDataResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/model/evaluation-data`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export function getEvaluationPlotUrl(plotName: "test_evaluation.png" | "training_history.png"): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/model/plots/${plotName}` : "";
}

export function analyzeImageWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ImageAnalysisResponse> {
  const base = assertConfiguredUrl();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/api/analyze/image`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImageAnalysisResponse);
        } catch {
          reject(new Error("Invalid JSON response from inference server."));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          reject(new Error(parsed?.detail || `Analysis failed (HTTP ${xhr.status}).`));
        } catch {
          reject(new Error(`Analysis failed (HTTP ${xhr.status}).`));
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Unable to reach the CrowdPulse Python backend at ${base}. Verify the FastAPI server is running and CORS allows this origin.`
        )
      );
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export function submitVideoJobWithProgress(
  file: File,
  samplingRateFps: number,
  onUploadProgress?: (percent: number) => void
): Promise<VideoJobCreateResponse> {
  const base = assertConfiguredUrl();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/api/analyze/video`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as VideoJobCreateResponse);
        } catch {
          reject(new Error("Invalid JSON response when creating video job."));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          reject(new Error(parsed?.detail || `Video upload failed (HTTP ${xhr.status}).`));
        } catch {
          reject(new Error(`Video upload failed (HTTP ${xhr.status}).`));
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Unable to reach the CrowdPulse Python backend at ${base}. Verify the FastAPI server is running.`
        )
      );
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sampling_rate_fps", String(samplingRateFps));
    xhr.send(formData);
  });
}

export async function fetchVideoJobStatus(jobId: string): Promise<VideoJobStatusResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchVideoJobResults(jobId: string): Promise<VideoAnalysisResultsResponse> {
  const base = assertConfiguredUrl();
  const res = await fetch(`${base}/api/results/${encodeURIComponent(jobId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}
