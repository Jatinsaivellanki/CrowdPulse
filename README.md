<h1 align="center">CrowdPulse</h1>
<p align="center"><strong>Real-time AI-powered crowd density monitoring and bottleneck alerts</strong></p>

Academic engineering project demonstrating supervised CNN-based crowd density estimation (`CrowdPulseCNN`, trained on ShanghaiTech Part A & Part B).

## Architecture

- **`backend/`** — Python FastAPI service loading `crowdpulse_cnn.pth` once at startup, running exact `256 × 192` RGB preprocessing and `48 × 64` density-map inference, OpenCV async video sampling, 3×3 spatial grid breakdowns, and official evaluation artifact endpoints.
- **`frontend/`** — Next.js + React + TypeScript + Tailwind CSS + Recharts web dashboard designed for Vercel deployment, connecting to the backend via `NEXT_PUBLIC_API_URL`.

## Quick Local Run

1. **Start the Python Backend** (port `8000`):
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Start the Next.js Frontend** (port `3000`):
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```

## Deployment Guide

1. **Backend (Hugging Face Spaces / Docker / Render / Railway)**:
   - Deploy `backend/` using the included `Dockerfile` (or `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
   - Configure `CORS_ORIGINS` with your Vercel URL.
2. **Frontend (Vercel)**:
   - Set Root Directory to `frontend`.
   - Set `NEXT_PUBLIC_API_URL` to the public URL of your deployed Python backend.
   - Deploy via Vercel.
