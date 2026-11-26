# CrowdPulse Inference Backend (FastAPI + PyTorch)

This service hosts the trained `CrowdPulseCNN` PyTorch model (`crowdpulse_cnn.pth`) and exposes REST endpoints for image crowd-density estimation, asynchronous video frame analysis, spatial 3×3 grid density breakdowns, and official evaluation artifacts.

## Model & Preprocessing Contract

Loaded directly from `artifacts/`:

- **Model**: `CrowdPulseCNN` (`379,297` trainable parameters, `Softplus` output activation)
- **Input**: RGB image resized with bilinear interpolation to `256 × 192` (width × height), normalized to `[0, 1]` by dividing pixel values by `255.0`
- **Output**: `48 × 64` (height × width) density map; `estimated_count = sum(density_map)`

## Project Layout

```text
backend/
  app/
    main.py            # FastAPI app, CORS, startup lifespan, endpoints
    model.py           # CrowdPulseCNN architecture & startup artifact loader
    inference.py       # Exact preprocessing, inference, verification, 3x3 grid
    video_processor.py # OpenCV frame sampling & async ThreadPool job manager
    visualization.py   # Colorized density map & heatmap overlay PNG generator
    schemas.py         # Pydantic response schemas
  artifacts/
    crowdpulse_cnn.pth
    model_config.json
    preprocessing.json
    evaluation.json
    training_history.csv
    test_predictions.csv
    evaluation_plots/
  tests/
    test_api.py
  Dockerfile
  requirements.txt
  .env.example
```

## Local Setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the backend:

```bash
python tests/test_api.py
```

## API Endpoints

- `GET /api/health` — Model load status, device (`cpu`/`cuda`), expected input/output shapes.
- `POST /api/analyze/image` — Multipart image (`JPG`/`JPEG`/`PNG`) → density map, overlay, count, 3×3 breakdown, verification checks, inference time.
- `POST /api/analyze/video` — Multipart video (`MP4`/`MOV`/etc.) + `sampling_rate_fps` (default `1.0`) → returns `job_id`.
- `GET /api/jobs/{job_id}` — Poll video processing progress (`queued` / `processing` / `completed` / `failed`).
- `GET /api/results/{job_id}` — Retrieve completed video timestamps, counts, summary stats, and sampled-frame maps.
- `GET /api/model/metrics` — Official test evaluation metrics (`evaluation.json`).
- `GET /api/model/config` — Model & preprocessing configuration (`model_config.json`, `preprocessing.json`).
- `GET /api/model/evaluation-data` — Parsed `training_history.csv`, `test_predictions.csv` scatter points, and error histogram bins.
- `GET /api/model/plots/{plot_name}` — Official `test_evaluation.png` and `training_history.png`.

## Deployment (Hugging Face Spaces / Docker / Render / Railway)

1. Push the `backend/` folder to a Docker-based Hugging Face Space (port `7860` or `8000`, `Dockerfile` supports `$PORT` defaulting to `7860` on HF Spaces or `8000` locally) or any Python container host (Render, Railway, Fly.io).
2. Set `CORS_ORIGINS` to your deployed Vercel frontend URL (e.g. `https://crowdpulse.vercel.app`).
3. Point the frontend `NEXT_PUBLIC_API_URL` environment variable to the deployed backend URL (without a trailing slash).
