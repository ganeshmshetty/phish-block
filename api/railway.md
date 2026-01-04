Railway Deployment Guide

Quick options to deploy the `api/` FastAPI service on Railway.

Option A — Use Railway's Python build (simple)

- Build Command: pip install -r requirements.txt
- Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
- Project root: set to `api/`
- Ensure `api/models/phishing_xgb.json` and `api/models/model_metadata.json` are present in the repository (they must be copied from `ml_research/models/`).

Notes:
- Railway will set the `PORT` environment variable for you. Keep `$PORT` in the start command.
- You can use the existing `Procfile` (already in `api/`) — Railway recognizes Procfile too.

Option B — Use a Docker deployment (recommended for consistent runtime)

1. Use the provided `Dockerfile` (in this folder) to build a container. Railway will build and run the container automatically.
2. Docker CMD uses the `PORT` env var; no additional settings required in Railway.

Railway CLI quick deploy (optional)

```bash
# install Railway CLI
npm i -g @railway/cli

# from repo root
cd api
railway init    # create/link project
railway up      # deploy
```

Production recommendations

- Use the Dockerfile for reproducible environments.
- Add a small number of workers if you expect concurrency (use Gunicorn + Uvicorn worker in Dockerfile if desired).
- Make sure your model files are included in the git repo under `api/models/` before deploying.

Troubleshooting

- If your deployment fails due to missing dependencies, ensure `requirements.txt` is up to date.
- Check Railway logs for the exact error and ensure the `PORT` variable is used by your start command.

