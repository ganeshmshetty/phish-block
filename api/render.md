# PhishBlock API - Render Deployment

## Build Command
pip install -r requirements.txt

## Start Command
uvicorn main:app --host 0.0.0.0 --port $PORT

## Environment Variables
# No required environment variables

## Notes
# - Model files must be included in the deployment
# - Copy model files to api/models/ directory before deploying
