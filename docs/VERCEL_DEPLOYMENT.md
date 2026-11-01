# 🚀 Vercel Deployment Guide for Paytm Vriddhi

This project is fully configured for **one-click deployment on Vercel** as a full-stack application (React SPA frontend + FastAPI serverless backend).

---

## 1. Project Configuration Overview

The repository includes all necessary Vercel configuration files:
- **[`vercel.json`](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/vercel.json)**: Directs `/api/(.*)` requests to the Python serverless function and all other routes to Vite's `dist/index.html`.
- **[`api/index.py`](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/api/index.py)**: Serverless bridge connecting Vercel's Python runtime to the FastAPI application.
- **[`requirements.txt`](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/requirements.txt)**: Root Python dependencies automatically detected and installed by Vercel.
- **[`.vercelignore`](file:///c:/Users/WHEELYDOS/Desktop/paytm%20hackathon/.vercelignore)**: Prevents test caches, local virtual environments, and unneeded files from being uploaded.

---

## 2. Deploying via Vercel Dashboard (Recommended)

1. **Push your repository** to GitHub, GitLab, or Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and click **"Import"** on your repository.
3. In **Project Settings**:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add the following keys:

| Environment Variable | Value / Description | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key from Google AI Studio | **Yes** |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | **Yes** |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot token from @BotFather | Optional (for Telegram) |
| `DATABASE_URL` | Optional PostgreSQL / SQLite URL (e.g. Neon, Supabase, Turso). If omitted, auto-seeds in `/tmp/vriddhi.db`. | Optional |
| `VITE_API_URL` | Leave blank for full-stack Vercel. Only set if running backend on Railway/Render. | Optional |

5. Click **"Deploy"**!

---

## 3. Deploying via Vercel CLI

If you have the [Vercel CLI](https://vercel.com/docs/cli) installed:

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy to preview environment
vercel

# 3. Deploy to production
vercel --prod
```

Set environment variables via CLI if needed:
```bash
vercel env add GEMINI_API_KEY
vercel env add GEMINI_MODEL
vercel env add TELEGRAM_BOT_TOKEN
```

---

## 4. Setting up Telegram Bot Webhook on Vercel

In serverless environments, long-polling runners cannot run indefinitely. Instead, register your Vercel deployment URL with Telegram's Webhook API:

```bash
# Replace <YOUR_BOT_TOKEN> and <YOUR_VERCEL_DOMAIN>
curl -F "url=https://<YOUR_VERCEL_DOMAIN>.vercel.app/api/telegram" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

Telegram will now push updates directly to your Vercel FastAPI backend at `/api/telegram` with zero idle server cost!

To check webhook status anytime:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

---

## 5. Local Development vs. Production Architecture

- **Local Development**:
  - Frontend runs on `http://localhost:5173`.
  - Vite dev server automatically proxies `/api` calls to `http://localhost:8000`.
  - Local Telegram runner polls via `python -m app.adapters.telegram`.
- **Vercel Production**:
  - Frontend static assets are distributed via Vercel's Edge Network CDN.
  - `/api/*` routes are handled by FastAPI Serverless Functions.
  - Telegram bot receives updates via Webhook (`/api/telegram`).

