# CrowdPulse Frontend (Next.js + TypeScript + Tailwind CSS)

Web dashboard for **CrowdPulse**, communicating with the separate Python FastAPI CNN inference service via `NEXT_PUBLIC_API_URL`.

## Environment Configuration

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> Do not bundle `crowdpulse_cnn.pth` or PyTorch dependencies into the Next.js frontend. All inference is delegated over HTTPS/REST to the Python backend.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploying to Vercel

1. Import the `frontend/` directory as the **Root Directory** in Vercel.
2. Framework Preset: **Next.js**.
3. Add Environment Variable in Vercel Project Settings:
   - `NEXT_PUBLIC_API_URL` = `https://your-python-backend-url` (no trailing slash)
4. Deploy.
5. Ensure the Python backend's `CORS_ORIGINS` environment variable includes your Vercel deployment domain.
