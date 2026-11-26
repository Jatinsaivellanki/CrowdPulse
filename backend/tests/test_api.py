"""Verification tests for the CrowdPulse FastAPI backend and real CNN inference."""

import io
import sys
import tempfile
import time
from pathlib import Path

import cv2
import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app  # noqa: E402
from artifacts.inference import CrowdPulsePredictor  # noqa: E402


def _make_sample_crowd_image(width: int = 640, height: int = 480) -> Image.Image:
    rng = np.random.default_rng(42)
    arr = rng.integers(30, 210, size=(height, width, 3), dtype=np.uint8)
    # Draw clustered blobs resembling heads/people for non-uniform spatial density
    for cx, cy in [(180, 160), (200, 170), (220, 165), (450, 310), (470, 320)]:
        cv2.circle(arr, (cx, cy), 14, (235, 220, 200), -1)
    return Image.fromarray(arr, mode="RGB")


def _make_sample_video_bytes(num_frames: int = 12, fps: float = 4.0) -> bytes:
    fd, path = tempfile.mkstemp(suffix=".mp4")
    import os

    os.close(fd)
    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(path, fourcc, fps, (320, 240))
        rng = np.random.default_rng(7)
        for i in range(num_frames):
            frame = rng.integers(20, 180, size=(240, 320, 3), dtype=np.uint8)
            cv2.circle(frame, (40 + i * 18, 120), 16, (250, 240, 220), -1)
            writer.write(frame)
        writer.release()
        with open(path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(path):
            os.remove(path)


def run_verification() -> None:
    sample_img = _make_sample_crowd_image()

    buf = io.BytesIO()
    sample_img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    # 1. Cross-check backend output against the reference artifacts/inference.py predictor on exact decoded bytes
    ref_predictor = CrowdPulsePredictor(str(BACKEND_DIR / "artifacts" / "crowdpulse_cnn.pth"))
    ref_result = ref_predictor.predict(Image.open(io.BytesIO(img_bytes)))

    with TestClient(app) as client:
        # Health
        health = client.get("/api/health")
        assert health.status_code == 200, health.text
        h_data = health.json()
        assert h_data["model_loaded"] is True, h_data
        assert h_data["expected_input_size"] == [256, 192]
        assert h_data["expected_output_shape"] == [48, 64]

        # Config & Metrics & Evaluation data
        cfg = client.get("/api/model/config")
        assert cfg.status_code == 200
        assert cfg.json()["model_config_data"]["model_name"] == "CrowdPulseCNN"

        metrics = client.get("/api/model/metrics")
        assert metrics.status_code == 200
        ev = metrics.json()["evaluation"]
        assert abs(ev["Overall"]["MAE"] - 65.6647415161) < 1e-6

        eval_data = client.get("/api/model/evaluation-data")
        assert eval_data.status_code == 200
        ed = eval_data.json()
        assert ed["total_test_rows"] == 2988
        assert len(ed["training_history"]) == 20
        assert all("/kaggle/" not in pt["label"] for pt in ed["scatter_points"])

        # Image inference
        img_resp = client.post(
            "/api/analyze/image",
            files={"file": ("test_crowd.jpg", img_bytes, "image/jpeg")},
        )
        assert img_resp.status_code == 200, img_resp.text
        img_data = img_resp.json()
        assert img_data["density_map_shape"] == [48, 64]
        assert img_data["verification"]["output_shape_valid"] is True
        assert img_data["verification"]["all_finite"] is True
        assert img_data["verification"]["all_non_negative"] is True
        assert img_data["density_map_image"].startswith("data:image/png;base64,")
        assert img_data["overlay_image"].startswith("data:image/png;base64,")
        assert len(img_data["regional_breakdown"]) == 9
        region_sum = sum(r["estimated_count"] for r in img_data["regional_breakdown"])
        assert abs(region_sum - img_data["estimated_count"]) < 0.05

        # Ensure exact numerical parity with CrowdPulsePredictor
        assert abs(img_data["estimated_count"] - round(ref_result["estimated_count"], 3)) < 1e-2

        # Invalid image upload handling
        bad_resp = client.post(
            "/api/analyze/image",
            files={"file": ("notes.txt", b"not an image", "text/plain")},
        )
        assert bad_resp.status_code == 400

        # Video analysis async job + polling
        vid_bytes = _make_sample_video_bytes()
        vid_resp = client.post(
            "/api/analyze/video",
            files={"file": ("sample.mp4", vid_bytes, "video/mp4")},
            data={"sampling_rate_fps": "2.0"},
        )
        assert vid_resp.status_code == 200, vid_resp.text
        job_id = vid_resp.json()["job_id"]

        for _ in range(40):
            job_status = client.get(f"/api/jobs/{job_id}").json()
            if job_status["status"] in ("completed", "failed"):
                break
            time.sleep(0.1)

        assert job_status["status"] == "completed", job_status
        vid_results = client.get(f"/api/results/{job_id}")
        assert vid_results.status_code == 200, vid_results.text
        vr = vid_results.json()
        assert vr["sampled_frame_count"] >= 3
        assert len(vr["timestamps"]) == vr["sampled_frame_count"]
        assert len(vr["estimated_counts"]) == vr["sampled_frame_count"]

        print(
            f"VERIFICATION PASSED: image_count={img_data['estimated_count']}, "
            f"ref_count={ref_result['estimated_count']:.3f}, "
            f"inference_ms={img_data['inference_time_ms']}, "
            f"video_frames={vr['sampled_frame_count']}"
        )


if __name__ == "__main__":
    run_verification()
