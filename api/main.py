"""
PhishBlock API - FastAPI server for real-time phishing URL detection
Designed for deployment on Render.com
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
import xgboost as xgb
import numpy as np
import math
import re
from urllib.parse import urlparse
import tldextract
import os
import json
from functools import lru_cache
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PhishBlock API",
    description="Real-time phishing URL detection API using XGBoost ML model",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants ---
SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'update', 'account', 'secure', 'banking',
    'confirm', 'signin', 'password', 'wallet', 'crypto', 'admin', 'service'
]

SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club', '.work', '.buzz']

# Popular legitimate domains (whitelist)
POPULAR_DOMAINS = {
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
    'instagram.com', 'linkedin.com', 'github.com', 'microsoft.com',
    'apple.com', 'amazon.com', 'netflix.com', 'reddit.com', 'wikipedia.org',
    'stackoverflow.com', 'medium.com', 'twitch.tv', 'discord.com',
    'whatsapp.com', 'telegram.org', 'zoom.us', 'dropbox.com', 'paypal.com',
    'stripe.com', 'shopify.com', 'wordpress.com', 'blogger.com', 'tumblr.com'
}

# Feature names in exact order
FEATURE_NAMES = [
    "domain_length", "qty_dot_domain", "qty_hyphen_domain", "domain_entropy",
    "is_ip", "path_length", "qty_slash_path", "qty_hyphen_path",
    "sus_keywords_count", "qty_double_slash", "has_suspicious_tld", "is_https",
    "subdomain_depth", "digit_ratio", "special_char_count", "domain_path_ratio"
]

# --- Global Model ---
model = None
model_metadata = None


def load_model():
    """Load the XGBoost model on startup."""
    global model, model_metadata
    
    # Determine model path (check multiple locations)
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'ml_research', 'models', 'phishing_xgb.json'),
        os.path.join(os.path.dirname(__file__), 'models', 'phishing_xgb.json'),
        '/app/models/phishing_xgb.json',  # Render deployment path
        'phishing_xgb.json'
    ]
    
    model_path = None
    for path in possible_paths:
        if os.path.exists(path):
            model_path = path
            break
    
    if model_path is None:
        logger.error("Model file not found!")
        raise FileNotFoundError("phishing_xgb.json not found in any expected location")
    
    logger.info(f"Loading model from: {model_path}")
    model = xgb.Booster()
    model.load_model(model_path)
    
    # Load metadata
    metadata_path = model_path.replace('phishing_xgb.json', 'model_metadata.json')
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            model_metadata = json.load(f)
        logger.info(f"Model metadata loaded: v{model_metadata.get('version', 'unknown')}")
    else:
        model_metadata = {"recommended_threshold": 0.50}
    
    logger.info("Model loaded successfully!")


@app.on_event("startup")
async def startup_event():
    """Load model when server starts."""
    # Ensure model exists locally; if not, try to download from MODEL_URL
    try:
        await ensure_model_available()
    except Exception as e:
        logger.warning(f"Model ensure step failed: {e}")
    load_model()


async def ensure_model_available():
    """Ensure model file exists locally; download if MODEL_URL is provided."""
    # Check existing possible paths first
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', 'ml_research', 'models', 'phishing_xgb.json'),
        os.path.join(os.path.dirname(__file__), 'models', 'phishing_xgb.json'),
        '/app/models/phishing_xgb.json',  # Render deployment path
        'phishing_xgb.json'
    ]
    for path in possible_paths:
        if os.path.exists(path):
            logger.info(f"Found existing model at {path}")
            return

    model_url = os.environ.get('MODEL_URL')
    metadata_url = os.environ.get('MODEL_METADATA_URL')
    if not model_url:
        raise FileNotFoundError('Model not found and MODEL_URL not provided')

    # Prepare destination directory
    dest_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, 'phishing_xgb.json')

    # Download model with basic safety checks
    max_bytes = int(os.environ.get('MODEL_MAX_BYTES', 250 * 1024 * 1024))
    logger.info(f"Downloading model from {model_url} to {dest_path} (max {max_bytes} bytes)")
    download_file(model_url, dest_path, max_bytes=max_bytes)

    # Try metadata
    if metadata_url:
        meta_dest = os.path.join(dest_dir, 'model_metadata.json')
        logger.info(f"Downloading model metadata from {metadata_url} to {meta_dest}")
        download_file(metadata_url, meta_dest, max_bytes=1024 * 1024)  # 1MB
    else:
        # Attempt to infer metadata URL by replacing filename
        try:
            inferred = model_url.replace('phishing_xgb.json', 'model_metadata.json')
            meta_dest = os.path.join(dest_dir, 'model_metadata.json')
            logger.info(f"Attempting inferred metadata URL: {inferred}")
            download_file(inferred, meta_dest, max_bytes=1024 * 1024)
        except Exception:
            logger.info('No metadata downloaded')


def download_file(url: str, dest: str, max_bytes: int = 250 * 1024 * 1024, timeout: int = 30):
    """Download a file from `url` to `dest` with streaming and size limit."""
    try:
        with requests.get(url, stream=True, timeout=timeout) as r:
            r.raise_for_status()
            total = 0
            tmp_path = dest + '.part'
            with open(tmp_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > max_bytes:
                        f.close()
                        os.remove(tmp_path)
                        raise IOError(f"Download exceeds maximum allowed size ({max_bytes} bytes)")
                    f.write(chunk)
            # Move temp to final
            os.replace(tmp_path, dest)
            logger.info(f"Downloaded {dest} ({total} bytes)")
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        raise


# --- Feature Extraction ---
def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not text:
        return 0.0
    entropy = 0.0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += -p_x * math.log(p_x, 2)
    return entropy


def extract_features(url: str) -> dict:
    """Extract all 16 features from a URL."""
    features = {}
    
    if not isinstance(url, str):
        url = str(url)
    
    original_url = url
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        
        full_domain = ".".join(part for part in [ext.subdomain, ext.domain, ext.suffix] if part)
        path = parsed.path
        
        # Domain features
        features['domain_length'] = len(full_domain)
        features['qty_dot_domain'] = full_domain.count('.')
        features['qty_hyphen_domain'] = full_domain.count('-')
        features['domain_entropy'] = calculate_entropy(full_domain)
        
        # IP check
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        features['is_ip'] = 1 if re.match(ip_pattern, full_domain) else 0
        
        # Path features
        features['path_length'] = len(path)
        features['qty_slash_path'] = path.count('/')
        features['qty_hyphen_path'] = path.count('-')
        
        # Semantic features
        features['sus_keywords_count'] = sum(1 for word in SUSPICIOUS_KEYWORDS if word in url.lower())
        features['qty_double_slash'] = path.count('//')
        
        # Enhanced features
        tld_with_dot = '.' + ext.suffix if ext.suffix else ''
        features['has_suspicious_tld'] = 1 if tld_with_dot.lower() in SUSPICIOUS_TLDS else 0
        features['is_https'] = 1 if original_url.lower().startswith('https://') else 0
        features['subdomain_depth'] = len(ext.subdomain.split('.')) if ext.subdomain else 0
        features['digit_ratio'] = sum(c.isdigit() for c in full_domain) / len(full_domain) if full_domain else 0
        features['special_char_count'] = sum(1 for c in full_domain if not c.isalnum() and c != '.')
        features['domain_path_ratio'] = features['domain_length'] / (features['path_length'] + 1)
        
    except Exception as e:
        logger.error(f"Feature extraction error for {url}: {e}")
        return None
    
    return features


def is_popular_domain(url: str) -> bool:
    """Check if URL belongs to a popular legitimate domain."""
    try:
        ext = tldextract.extract(url)
        domain = f"{ext.domain}.{ext.suffix}"
        return domain.lower() in POPULAR_DOMAINS
    except:
        return False


# --- Pydantic Models ---
class URLRequest(BaseModel):
    url: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://secure-paypal-login.suspicious-site.xyz/verify"
            }
        }


class BatchURLRequest(BaseModel):
    urls: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "urls": [
                    "https://google.com",
                    "http://suspicious-login.tk/verify"
                ]
            }
        }


class PredictionResponse(BaseModel):
    url: str
    is_phishing: bool
    confidence: float
    risk_level: str  # "safe", "low", "medium", "high", "critical"
    is_popular_domain: bool
    features: Optional[dict] = None
    recommendation: str


class BatchPredictionResponse(BaseModel):
    results: List[PredictionResponse]
    total_analyzed: int
    phishing_detected: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str]
    features_count: int


# --- API Endpoints ---
@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API info."""
    return {
        "name": "PhishBlock API",
        "version": "1.0.0",
        "description": "Real-time phishing URL detection",
        "endpoints": {
            "predict": "/predict",
            "batch": "/predict/batch",
            "health": "/health",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        model_version=model_metadata.get("version") if model_metadata else None,
        features_count=len(FEATURE_NAMES)
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_url(request: URLRequest):
    """
    Analyze a single URL for phishing indicators.
    
    Returns prediction with confidence score and risk level.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    url = request.url.strip()
    
    # Check if it's a popular domain (quick whitelist)
    popular = is_popular_domain(url)
    
    # Extract features
    features = extract_features(url)
    if features is None:
        raise HTTPException(status_code=400, detail="Could not parse URL")
    
    # Prepare feature array in correct order
    feature_array = np.array([[features[name] for name in FEATURE_NAMES]])
    dmatrix = xgb.DMatrix(feature_array, feature_names=FEATURE_NAMES)
    
    # Get prediction
    probability = float(model.predict(dmatrix)[0])
    
    # Adjust threshold for popular domains (require higher confidence)
    threshold = 0.80 if popular else 0.50
    is_phishing = probability >= threshold
    
    # Determine risk level
    if probability < 0.20:
        risk_level = "safe"
    elif probability < 0.40:
        risk_level = "low"
    elif probability < 0.60:
        risk_level = "medium"
    elif probability < 0.80:
        risk_level = "high"
    else:
        risk_level = "critical"
    
    # Generate recommendation
    if popular and not is_phishing:
        recommendation = "This appears to be a legitimate popular website."
    elif is_phishing:
        recommendation = "⚠️ WARNING: This URL shows strong phishing indicators. Do not enter any personal information."
    elif risk_level == "medium":
        recommendation = "Exercise caution. Verify the website's authenticity before proceeding."
    else:
        recommendation = "No significant phishing indicators detected."
    
    return PredictionResponse(
        url=url,
        is_phishing=is_phishing,
        confidence=round(probability, 4),
        risk_level=risk_level,
        is_popular_domain=popular,
        features=features,
        recommendation=recommendation
    )


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchURLRequest):
    """
    Analyze multiple URLs at once.
    
    Useful for checking browser history or bookmarks.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if len(request.urls) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 URLs per batch")
    
    results = []
    phishing_count = 0
    
    for url in request.urls:
        try:
            single_request = URLRequest(url=url)
            result = await predict_url(single_request)
            results.append(result)
            if result.is_phishing:
                phishing_count += 1
        except HTTPException:
            # Skip invalid URLs
            results.append(PredictionResponse(
                url=url,
                is_phishing=False,
                confidence=0.0,
                risk_level="unknown",
                is_popular_domain=False,
                recommendation="Could not analyze this URL"
            ))
    
    return BatchPredictionResponse(
        results=results,
        total_analyzed=len(results),
        phishing_detected=phishing_count
    )


@app.get("/features")
async def get_features():
    """Get list of features used by the model."""
    return {
        "feature_names": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "suspicious_keywords": SUSPICIOUS_KEYWORDS,
        "suspicious_tlds": SUSPICIOUS_TLDS
    }


@app.get("/stats")
async def get_model_stats():
    """Get model statistics and metadata."""
    if model_metadata is None:
        raise HTTPException(status_code=503, detail="Model metadata not loaded")
    
    return {
        "model": model_metadata,
        "popular_domains_count": len(POPULAR_DOMAINS),
        "api_version": "1.0.0"
    }


# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
