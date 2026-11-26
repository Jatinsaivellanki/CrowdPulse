import os
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError

from app.inference import run_image_inference
from app.model import ARTIFACTS_DIR, ModelRegistry
from app.schemas import (
    HealthResponse,
    ImageAnalysisResponse,
    ModelConfigResponse,
    ModelMetricsResponse,
    VideoAnalysisResultsResponse,
    VideoJobCreateResponse,
    VideoJobStatusResponse,
)
from app.video_processor import VideoJobManager


MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

registry = ModelRegistry(ARTIFACTS_DIR)
video_manager = VideoJobManager(registry)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Load the trained PyTorch model exactly once on startup."""
    registry.load()
    yield


app = FastAPI(
    title="CrowdPulse Inference API",
    description="Supervised CNN crowd density-map estimation backend built on ShanghaiTech artifacts.",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = (
    ["*"]
    if cors_origins_env.strip() == "*"
    else [o.strip() for o in cors_origins_env.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_model_ready() -> None:
    if not registry.model_loaded:
        raise HTTPException(
            status_code=503,
            detail=registry.load_error or "CrowdPulse CNN model is unavailable.",
        )


def _safe_filename(raw_name: str | None, default_name: str) -> str:
    return Path(raw_name or default_name).name


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    in_w, in_h = registry.expected_input_size
    out_h, out_w = registry.expected_output_shape
    return HealthResponse(
        status="ok" if registry.model_loaded else "degraded",
        model_loaded=registry.model_loaded,
        model_name=str(registry.model_config.get("model_name", "CrowdPulseCNN")),
        framework=str(registry.model_config.get("framework", "PyTorch")),
        device=str(registry.device),
        expected_input_size=[in_w, in_h],
        expected_output_shape=[out_h, out_w],
        error=registry.load_error,
    )


@app.post("/api/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(file: UploadFile = File(...)) -> ImageAnalysisResponse:
    _require_model_ready()

    safe_name = _safe_filename(file.filename, "upload.jpg")
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please upload a JPG, JPEG, or PNG image.",
        )

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")
    if len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 20 MB upload limit.",
        )

    try:
        image = Image.open(BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {exc}") from exc

    result = run_image_inference(registry, image, filename=safe_name, include_density_values=True)
    return ImageAnalysisResponse(**result)


@app.post("/api/analyze/video", response_model=VideoJobCreateResponse)
async def analyze_video(
    file: UploadFile = File(...),
    sampling_rate_fps: float = Form(1.0),
) -> VideoJobCreateResponse:
    _require_model_ready()

    safe_name = _safe_filename(file.filename, "upload.mp4")
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video format. Accepted formats: MP4, MOV, AVI, MKV, WEBM.",
        )

    if sampling_rate_fps <= 0:
        raise HTTPException(status_code=400, detail="sampling_rate_fps must be greater than 0.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")
    if len(payload) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Video exceeds the 100 MB upload limit.",
        )

    job = video_manager.submit_job(payload, safe_name, sampling_rate_fps)
    return VideoJobCreateResponse(
        job_id=job.job_id,
        status=job.status,
        sampling_rate_fps=job.sampling_rate_fps,
        message="Video analysis job queued. Poll /api/jobs/{job_id} for progress.",
    )


@app.get("/api/jobs/{job_id}", response_model=VideoJobStatusResponse)
async def get_job_status(job_id: str) -> VideoJobStatusResponse:
    job = video_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Video analysis job not found.")

    return VideoJobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        filename=job.filename,
        progress_percent=job.progress_percent,
        processed_frames=job.processed_frames,
        total_sampled_frames=job.total_sampled_frames,
        sampling_rate_fps=job.sampling_rate_fps,
        duration_sec=job.duration_sec,
        error=job.error,
    )


@app.get("/api/results/{job_id}", response_model=VideoAnalysisResultsResponse)
async def get_job_results(job_id: str) -> VideoAnalysisResultsResponse:
    job = video_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Video analysis job not found.")
    if job.status == "failed":
        raise HTTPException(status_code=500, detail=job.error or "Video processing failed.")
    if job.status != "completed":
        raise HTTPException(
            status_code=202,
            detail=f"Job is currently '{job.status}' ({job.progress_percent}%). Poll /api/jobs/{job_id}.",
        )

    summary = video_manager.build_summary(job.frames)
    return VideoAnalysisResultsResponse(
        job_id=job.job_id,
        status=job.status,
        filename=job.filename,
        sampling_rate_fps=job.sampling_rate_fps,
        duration_sec=job.duration_sec,
        sampled_frame_count=len(job.frames),
        timestamps=[f.timestamp_sec for f in job.frames],
        estimated_counts=[f.estimated_count for f in job.frames],
        summary_statistics=summary,
        frames=job.frames,
    )


@app.get("/api/model/metrics", response_model=ModelMetricsResponse)
async def get_model_metrics() -> ModelMetricsResponse:
    if not registry.evaluation:
        raise HTTPException(status_code=503, detail="Evaluation metrics artifact could not be loaded.")
    return ModelMetricsResponse(
        evaluation=registry.evaluation,
        note="Offline test-set evaluation metrics computed on ShanghaiTech Part A and Part B.",
    )


@app.get("/api/model/config", response_model=ModelConfigResponse)
async def get_model_config() -> ModelConfigResponse:
    if not registry.model_config or not registry.preprocessing:
        raise HTTPException(status_code=503, detail="Model configuration artifacts could not be loaded.")
    return ModelConfigResponse(
        model_config_data=registry.model_config,
        preprocessing=registry.preprocessing,
    )


@app.get("/api/model/evaluation-data")
async def get_evaluation_data() -> Dict[str, Any]:
    """Return training history, prediction scatter samples, and error histogram bins from official CSVs."""
    history_path = ARTIFACTS_DIR / "training_history.csv"
    preds_path = ARTIFACTS_DIR / "test_predictions.csv"

    if not history_path.exists() or not preds_path.exists():
        raise HTTPException(status_code=503, detail="Training or test prediction CSV artifacts are missing.")

    history_df = pd.read_csv(history_path)
    training_history = history_df.to_dict(orient="records")

    preds_df = pd.read_csv(preds_path)
    preds_df["sample_label"] = (
        "Part " + preds_df["subset"].astype(str) + " · " + preds_df["image"].astype(str).apply(lambda p: Path(p).name)
    )

    # Error histogram bins across all 2,988 official test images
    abs_err = preds_df["absolute_error"].to_numpy(dtype=np.float64)
    bin_edges = [0, 15, 30, 50, 75, 100, 150, 200, 300, 500, float("inf")]
    bin_labels = ["0-15", "15-30", "30-50", "50-75", "75-100", "100-150", "150-200", "200-300", "300-500", "500+"]
    error_distribution: List[Dict[str, Any]] = []
    for idx in range(len(bin_labels)):
        low = bin_edges[idx]
        high = bin_edges[idx + 1]
        if np.isinf(high):
            mask = abs_err >= low
        else:
            mask = (abs_err >= low) & (abs_err < high)
        part_a_cnt = int(((preds_df["subset"] == "A").to_numpy() & mask).sum())
        part_b_cnt = int(((preds_df["subset"] == "B").to_numpy() & mask).sum())
        error_distribution.append(
            {
                "range": bin_labels[idx],
                "total": int(mask.sum()),
                "part_a": part_a_cnt,
                "part_b": part_b_cnt,
            }
        )

    # Stratified sample (up to 450 points) + extremes for responsive browser scatter plotting
    # without stripping out high-density outliers
    part_a_df = preds_df[preds_df["subset"] == "A"]
    part_b_df = preds_df[preds_df["subset"] == "B"]
    scatter_df = pd.concat(
        [
            part_a_df.iloc[:: max(1, len(part_a_df) // 200)],
            part_b_df.iloc[:: max(1, len(part_b_df) // 200)],
            preds_df.nlargest(20, "actual_count"),
            preds_df.nlargest(15, "absolute_error"),
        ]
    ).drop_duplicates(subset=["sample_label"])

    scatter_points = [
        {
            "label": row["sample_label"],
            "subset": str(row["subset"]),
            "actual_count": round(float(row["actual_count"]), 2),
            "predicted_count": round(float(row["predicted_count"]), 2),
            "absolute_error": round(float(row["absolute_error"]), 2),
            "prediction_bias": round(float(row["prediction_bias"]), 2),
        }
        for _, row in scatter_df.iterrows()
    ]

    subset_summary = {}
    for subset_key, subset_label in [("A", "Part A"), ("B", "Part B")]:
        sub = preds_df[preds_df["subset"] == subset_key]
        subset_summary[subset_label] = {
            "count": int(len(sub)),
            "median_abs_error": round(float(sub["absolute_error"].median()), 3),
            "p90_abs_error": round(float(sub["absolute_error"].quantile(0.90)), 3),
            "max_actual_count": round(float(sub["actual_count"].max()), 2),
            "min_actual_count": round(float(sub["actual_count"].min()), 2),
        }

    return {
        "total_test_rows": int(len(preds_df)),
        "training_history": training_history,
        "error_distribution": error_distribution,
        "scatter_points": scatter_points,
        "subset_summary": subset_summary,
    }


@app.get("/api/model/plots/{plot_name}")
async def get_evaluation_plot(plot_name: str) -> FileResponse:
    allowed = {"test_evaluation.png", "training_history.png"}
    if plot_name not in allowed:
        raise HTTPException(status_code=404, detail="Evaluation plot not found.")
    plot_path = ARTIFACTS_DIR / "evaluation_plots" / plot_name
    if not plot_path.exists():
        raise HTTPException(status_code=404, detail="Evaluation plot file is missing.")
    return FileResponse(plot_path, media_type="image/png")
