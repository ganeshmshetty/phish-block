# PhishBlock - Real-time Phishing URL Detection

<div align="center">
  
  Shield Protect yourself from phishing attacks with ML-powered real-time detection
  
  ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
  ![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
  ![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)
</div>

---

## Features

### Browser Extension
- **Real-time Protection**: Analyzes URLs as you browse
- **Automatic Blocking**: Blocks detected phishing pages with a warning screen
- **Warning Banners**: Shows non-intrusive warnings for suspicious sites
- **Whitelist Management**: Add trusted domains to bypass scanning
- **History Tracking**: View recently blocked phishing attempts
- **Customizable Settings**: Adjust protection levels and notifications
- **Popular Domain Recognition**: Reduced false positives for known sites

### API Server
- **XGBoost ML Model**: 89.4% accuracy phishing detection
- **16 URL Features**: Domain, path, semantic, and security analysis
- **Fast Inference**: Sub-100ms response times
- **Batch Processing**: Analyze multiple URLs at once
- **Health Monitoring**: Built-in health check endpoint
- **CORS Enabled**: Works with browser extensions

---

## Project Structure

```
phish-block/
├── api/                          # FastAPI Backend
│   ├── main.py                   # API server
│   ├── requirements.txt          # Python dependencies
│   ├── render.yaml              # Render deployment config
│   └── models/                  # Model files (copy from ml_research)
│
├── extension/                    # Browser Extension
│   ├── manifest.json            # Extension manifest (MV3)
│   ├── background.js            # Service worker
│   ├── popup/                   # Extension popup UI
│   ├── blocked/                 # Blocked page UI
│   └── icons/                   # Extension icons
│
└── ml_research/                  # ML Model Training
    ├── notebooks/train.ipynb    # Training notebook
    ├── models/                  # Trained models
    └── datasets/                # Training data
```

---

## Quick Start

### 1. Deploy the API Server (Render)

1. **Prepare model files**:
   ```bash
   mkdir -p api/models
   cp ml_research/models/phishing_xgb.json api/models/
   cp ml_research/models/model_metadata.json api/models/
   ```

2. **Deploy to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click New+ and Web Service
   - Connect your GitHub repository
   - Set root directory to `api`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Click Create Web Service

3. **Note your API URL** (e.g., `https://phishblock-api.onrender.com`)

### 2. Install the Browser Extension

1. **Update API URL** in `extension/background.js`:
   ```javascript
   const CONFIG = {
     API_URL: 'https://your-app-name.onrender.com',  // Your Render URL
     // ...
   };
   ```

2. **Generate icons**:
   - Convert `icons/icon128.svg` to PNG files
   - Create: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

3. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click Load unpacked
   - Select the `extension` folder

4. **Load in Firefox**:
   - Open `about:debugging#/runtime/this-firefox`
   - Click Load Temporary Add-on
   - Select `extension/manifest.json`

---

## Configuration

### Extension Settings

| Setting | Description |
|---------|-------------|
| **Auto-Block** | Automatically block detected phishing sites |
| **Notifications** | Show browser notifications for threats |
| **Strict Mode** | Lower threshold for more aggressive blocking |
| **Dev Mode** | Use localhost API for development |

---

## API Endpoints

### `POST /predict`
Analyze a single URL.

```bash
curl -X POST "https://your-api.onrender.com/predict" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://suspicious-site.xyz/login"}'
```

Response:
```json
{
  "url": "https://suspicious-site.xyz/login",
  "is_phishing": true,
  "confidence": 0.8542,
  "risk_level": "critical",
  "is_popular_domain": false,
  "recommendation": "WARNING: This URL shows strong phishing indicators..."
}
```

### `POST /predict/batch`
Analyze multiple URLs (max 100).

### `GET /health`
Health check endpoint.

### `GET /features`
List model features and suspicious indicators.

---

## Model Details

### Features (16 total)

| Feature | Description |
|---------|-------------|
| `domain_length` | Length of the full domain |
| `qty_dot_domain` | Number of dots in domain |
| `qty_hyphen_domain` | Number of hyphens in domain |
| `domain_entropy` | Shannon entropy (randomness) |
| `is_ip` | Domain is IP address (1/0) |
| `path_length` | URL path length |
| `qty_slash_path` | Slashes in path |
| `qty_hyphen_path` | Hyphens in path |
| `sus_keywords_count` | Suspicious keywords found |
| `qty_double_slash` | Double slashes (redirect trick) |
| `has_suspicious_tld` | Risky TLD (.tk, .xyz, etc.) |
| `is_https` | HTTPS presence (1/0) |
| `subdomain_depth` | Subdomain nesting level |
| `digit_ratio` | Ratio of digits in domain |
| `special_char_count` | Special characters in domain |
| `domain_path_ratio` | Domain/path length ratio |

### Performance

| Metric | Score |
|--------|-------|
| Accuracy | 89.42% |
| Precision | 89.62% |
| Recall | 88.94% |
| F1 Score | 89.28% |
| ROC AUC | 95.96% |

---

## Security and Privacy

- **No data collection**: URLs are analyzed and discarded
- **Local caching**: Results cached client-side only
- **Open source**: Full transparency of detection logic
- **Minimal permissions**: Only necessary browser APIs used

---

## Development

### Local API Development

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Extension Development

1. Enable Dev Mode in extension settings
2. API will use `http://localhost:8000`
3. Use Chrome DevTools for debugging

---

## License

MIT License - feel free to use and modify!

---

## Disclaimer

PhishBlock is a tool to help identify potential phishing sites but is not 100% accurate. Always exercise caution when browsing and never enter sensitive information on suspicious websites.

---

<div align="center">
  Made with love for a safer internet
</div>
