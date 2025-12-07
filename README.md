# PhishGuard Project

A comprehensive phishing detection system with machine learning backend, Chrome extension, and admin dashboard.

## Project Structure

```
PhishGuard-Project/
│
├── 📂 ml_research/              # WHERE YOU TRAIN (The Lab)
│   ├── 📂 datasets/             # Raw CSVs (dataset_a.csv, etc.)
│   ├── 📂 notebooks/            # Jupyter Notebooks (Colab code goes here)
│   │   ├── 01_data_cleaning.ipynb
│   │   └── 02_model_training.ipynb
│   ├── 📜 extract_features.py   # The core logic (IMPORTANT: Shared logic)
│   └── 📜 scraper_augment.py    # The script to get "Long Safe" URLs
│
├── 📂 backend/                  # THE BRAIN (FastAPI Server)
│   ├── 📂 app/
│   │   ├── 📂 api/              # API Routes (endpoints)
│   │   │   └── 📜 scan.py       # POST /analyze endpoint
│   │   ├── 📂 core/             # Config & Feature Extraction Logic
│   │   │   ├── 📜 config.py
│   │   │   └── 📜 extractor.py  # COPY of extract_features.py for production
│   │   ├── 📂 services/         # Business Logic
│   │   │   └── 📜 model_loader.py # Loads XGBoost model into memory
│   │   └── 📜 main.py           # Server Entry Point
│   ├── 📂 models/               # Saved Models (Production Ready)
│   │   └── 📦 phishing_xgb.json # The 1MB file you downloaded from Colab
│   ├── 📜 Dockerfile            # For deployment
│   └── 📜 requirements.txt      # python dependencies (fastapi, xgboost, etc.)
│
├── 📂 extension/                # THE SENSOR (Chrome Extension V3)
│   ├── 📂 assets/               # Icons and Images
│   │   ├── 🖼️ icon-48.png
│   │   └── 🖼️ icon-128.png
│   ├── 📂 popup/                # The UI user sees when clicking extension
│   │   ├── 📜 popup.html
│   │   ├── 📜 popup.css
│   │   └── 📜 popup.js          # Displays "Safe" or "Phishing" result
│   ├── 📜 background.js         # Handles API calls to your Backend
│   ├── 📜 content.js            # Scrapes HTML/DOM from current page
│   └── 📜 manifest.json         # Configuration file (Manifest V3)
│
├── 📂 dashboard/                # THE ADMIN VIEW (Optional React/Next.js App)
│   ├── 📂 src/
│   │   ├── 📂 components/       # Charts, Stats Cards
│   │   └── 📜 App.js
│   └── 📜 package.json
│
└── 📜 README.md                 # Documentation
```

## Getting Started

(Instructions to be added)
