import math
import os
import tempfile
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import cv2
from PIL import Image

from app.inference import run_image_inference
from app.model import ModelRegistry
from app.schemas import VideoFrameResult, VideoSummaryStatistics


MAX_SAMPLED_FRAMES = 120


@dataclass
class VideoJobRecord:
    job_id: str
    filename: str
    sampling_rate_fps: float
    status: str = "queued"  # queued | processing | completed | failed
    progress_percent: float = 0.0
    processed_frames: int = 0
    total_sampled_frames: int = 0
    duration_sec: float = 0.0
    error: Optional[str] = None
    frames: List[VideoFrameResult] = field(default_factory=list)


class VideoJobManager:
    """Manages asynchronous OpenCV frame extraction and CNN inference jobs."""

    def __init__(self, registry: ModelRegistry, max_workers: int = 2) -> None:
        self.registry = registry
        self.jobs: Dict[str, VideoJobRecord] = {}
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit_job(
        self, video_bytes: bytes, filename: str, sampling_rate_fps: float
    ) -> VideoJobRecord:
        job_id = str(uuid.uuid4())
        clamped_fps = max(0.2, min(5.0, float(sampling_rate_fps)))
        record = VideoJobRecord(
            job_id=job_id,
            filename=filename,
            sampling_rate_fps=clamped_fps,
            status="queued",
        )
        with self.lock:
            self.jobs[job_id] = record

        suffix = os.path.splitext(filename)[1] or ".mp4"
        fd, temp_path = tempfile.mkstemp(prefix="crowdpulse_", suffix=suffix)
        with os.fdopen(fd, "wb") as tmp_file:
            tmp_file.write(video_bytes)

        self.executor.submit(self._process_video, job_id, temp_path)
        return record

    def get_job(self, job_id: str) -> Optional[VideoJobRecord]:
        with self.lock:
            return self.jobs.get(job_id)

    def _update_job(self, job_id: str, **kwargs) -> None:
        with self.lock:
            job = self.jobs.get(job_id)
            if job is not None:
                for key, val in kwargs.items():
                    setattr(job, key, val)

    def _process_video(self, job_id: str, temp_path: str) -> None:
        cap = None
        try:
            self._update_job(job_id, status="processing", progress_percent=2.0)

            cap = cv2.VideoCapture(temp_path)
            if not cap.isOpened():
                raise ValueError("Unable to open uploaded video stream with OpenCV.")

            native_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            if native_fps <= 0.0:
                native_fps = 25.0

            job = self.get_job(job_id)
            if job is None:
                return

            duration_sec = (total_frames / native_fps) if total_frames > 0 else 0.0
            sampling_fps = job.sampling_rate_fps
            frame_step = max(1, int(round(native_fps / sampling_fps)))

            if total_frames > 0:
                planned_indices = list(range(0, total_frames, frame_step))[:MAX_SAMPLED_FRAMES]
            else:
                planned_indices = []

            self._update_job(
                job_id,
                duration_sec=round(duration_sec, 2),
                total_sampled_frames=len(planned_indices),
            )

            results: List[VideoFrameResult] = []
            frame_idx = 0
            sampled_count = 0

            while True:
                ok, frame_bgr = cap.read()
                if not ok:
                    break

                if frame_idx % frame_step == 0:
                    if sampled_count >= MAX_SAMPLED_FRAMES:
                        break

                    rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(rgb_frame)
                    timestamp_sec = round(frame_idx / native_fps, 2)

                    prediction = run_image_inference(
                        self.registry,
                        pil_image,
                        filename=f"{job.filename}#frame_{frame_idx}",
                        include_density_values=False,
                    )

                    results.append(
                        VideoFrameResult(
                            frame_index=frame_idx,
                            timestamp_sec=timestamp_sec,
                            estimated_count=prediction["estimated_count"],
                            inference_time_ms=prediction["inference_time_ms"],
                            density_map_image=prediction["density_map_image"],
                            overlay_image=prediction["overlay_image"],
                        )
                    )
                    sampled_count += 1

                    denom = max(len(planned_indices), sampled_count, 1)
                    pct = min(99.0, round(sampled_count / denom * 100.0, 1))
                    self._update_job(
                        job_id,
                        processed_frames=sampled_count,
                        total_sampled_frames=max(len(planned_indices), sampled_count),
                        progress_percent=pct,
                    )

                frame_idx += 1

            if not results:
                raise ValueError("No decodable video frames were found in the uploaded file.")

            if duration_sec <= 0.0:
                duration_sec = round(frame_idx / native_fps, 2)

            self._update_job(
                job_id,
                status="completed",
                progress_percent=100.0,
                processed_frames=len(results),
                total_sampled_frames=len(results),
                duration_sec=duration_sec,
                frames=results,
            )
        except Exception as exc:  # noqa: BLE001
            self._update_job(
                job_id,
                status="failed",
                error=str(exc),
            )
        finally:
            if cap is not None:
                cap.release()
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    @staticmethod
    def build_summary(frames: List[VideoFrameResult]) -> VideoSummaryStatistics:
        counts = [f.estimated_count for f in frames]
        total_ms = sum(f.inference_time_ms for f in frames)
        if not counts:
            return VideoSummaryStatistics(
                average_count=0.0,
                min_count=0.0,
                max_count=0.0,
                total_inference_time_ms=0.0,
            )
        return VideoSummaryStatistics(
            average_count=round(sum(counts) / len(counts), 3),
            min_count=round(min(counts), 3),
            max_count=round(max(counts), 3),
            total_inference_time_ms=round(total_ms, 2),
        )
