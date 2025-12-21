# Phish-Block Browser Extension

A privacy-first, client-side phishing detection browser extension powered by machine learning.

## 🎯 Features

- **🛡️ Real-Time Protection**: Scans URLs before navigation and blocks phishing attempts
- **🔒 100% Client-Side**: All processing happens in your browser - zero data sent to servers
- **🤖 Machine Learning**: XGBoost model trained on thousands of phishing URLs
- **⚡ Fast**: <50ms detection time with intelligent caching
- **🎨 User-Friendly**: Clear warnings, easy whitelisting, detailed statistics
- **🔓 Open Source**: Fully auditable code

## 📦 Installation

### From Chrome Web Store (Recommended)
*Coming soon*

### Manual Installation (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ganeshmshetty/phish-block.git
   cd phish-block
   ```

2. **Train and export the model**
   ```bash
   cd ml_research
   pip install -r requirements.txt
   
   # Run notebooks in order
   jupyter notebook notebooks/01_data_cleaning.ipynb
   jupyter notebook notebooks/02_model_training.ipynb
   ```

3. **Copy model to extension**
   ```bash
   # After running 02_model_training.ipynb, it will generate xgboost_model.json
   cp xgboost_model.json ../extension/models/
   ```

4. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension` folder (at project root)
   - Extension should now be active!

## 🚀 Usage

### Basic Protection

Once installed, Phish-Block automatically:
- Monitors all URLs you visit
- Shows warnings for suspicious sites
- Blocks confirmed phishing attempts
- Updates statistics in real-time

### Managing Trusted Sites

**Add to whitelist:**
1. Click the Phish-Block icon in your toolbar
2. When on a site you trust, click "Trust This Site"
3. Or manage all trusted sites in Settings

**Remove from whitelist:**
1. Click extension icon → Settings
2. Scroll to "Trusted Sites"
3. Click "Remove" next to any domain

### Adjusting Sensitivity

Default thresholds work for most users, but you can customize:

1. Click extension icon → Settings
2. Adjust thresholds:
   - **Block Threshold** (default: 0.70): Sites above this are blocked
   - **Warning Threshold** (default: 0.50): Sites above this show warnings
   - **Popular Domain** (default: 0.90): Higher bar for well-known sites

## 🏗️ Architecture

```
extension/
├── manifest.json           # Extension configuration
├── background/
│   └── service_worker.js   # Navigation monitoring, decision orchestration
├── content/
│   └── injector.js         # Warning banner injection
├── core/
│   ├── features/           # URL feature extraction (14 features)
│   ├── inference/          # XGBoost model execution
│   ├── decision/           # Cache, whitelist, threshold logic
│   └── state/              # Centralized state management
├── ui/
│   ├── popup/              # Extension toolbar popup
│   ├── block_page/         # Full-page block warning
│   └── settings/           # Settings page
└── models/
    ├── xgboost_model.json  # Exported ML model
    └── model_metadata.json # Feature names, thresholds
```

### Key Components

**Feature Extraction**
- 14 numerical features extracted from URLs
- Lexical: domain length, character counts, entropy
- Structural: path analysis, IP detection
- Behavioral: suspicious keywords, TLD patterns

**ML Inference**
- XGBoost binary classifier (~500KB JSON)
- Client-side tree traversal
- <30ms prediction time

**Decision Engine**
- LRU cache (1000 entries, 1-hour TTL)
- Persistent whitelist
- Graduated response: BLOCK / WARN / ALLOW

**Privacy Guarantees**
- Zero network requests for URL analysis
- No telemetry or analytics
- All data stays local

## 🔧 Development

### Project Structure

```bash
phish-block/
├── ml_research/           # Model training & research
│   ├── notebooks/         # Jupyter notebooks
│   ├── extract_features.py  # Canonical feature extraction
│   └── datasets/          # Training data
├── extension/             # Browser extension code
├── dashboard/             # Web dashboard (separate from extension)
├── backend/               # Backend API (if needed)
└── docs/                  # Documentation
```

### Testing Feature Parity

Critical: JavaScript and Python feature extractors MUST produce identical output.

**Test script:**
```python
# test_feature_parity.py
import sys
sys.path.append('ml_research')
from extract_features import extract_url_features

url = "https://secure-login-verify.com/account?id=123"
features = extract_url_features(url)
print(features)  # Compare with JavaScript output
```

**In browser console:**
```javascript
import { extractFeatures } from './core/features/index.js';
const features = extractFeatures("https://secure-login-verify.com/account?id=123");
console.log(features);  // Should match Python output EXACTLY
```

### Adding Features

To add new URL features:

1. **Update Python** (`ml_research/extract_features.py`)
2. **Update JavaScript** (`dashboard/extension/core/features/`)
3. **Update FEATURE_NAMES** in both locations
4. **Retrain model** with new features
5. **Test parity** thoroughly
6. **Update documentation**

## 📊 Performance Targets

- **Total Pipeline**: <50ms
  - Feature extraction: <5ms
  - ML inference: <30ms
  - Decision logic: <5ms
  - Overhead: <10ms

- **Accuracy**:
  - Precision: 95%+ (minimize false positives)
  - Recall: 90%+ (catch real threats)
  - F1 Score: 92%+

## 🔐 Security & Privacy

### What We Do
✅ Process all URLs locally in your browser  
✅ Use open-source, auditable code  
✅ Store only necessary data (whitelist, settings)  
✅ Provide full user control over decisions  

### What We DON'T Do
❌ Send URLs to external servers  
❌ Collect browsing history  
❌ Track user behavior  
❌ Include analytics or telemetry  
❌ Require account creation  

## 🤝 Contributing

Contributions welcome! Areas needing help:

- **Dataset expansion**: More phishing URLs for training
- **Feature engineering**: New URL analysis techniques
- **UI/UX improvements**: Better warnings, clearer messaging
- **Performance optimization**: Faster inference, smaller model
- **Testing**: Cross-browser compatibility, edge cases

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Training dataset: [Phishing URL Dataset](https://www.kaggle.com/datasets/shashwatwork/phishing-dataset-for-machine-learning)
- XGBoost: https://github.com/dmlc/xgboost
- Icon design: [TBD]

## 📧 Contact

- **Author**: Ganesh Shetty
- **GitHub**: [@ganeshmshetty](https://github.com/ganeshmshetty)
- **Issues**: [Report a bug](https://github.com/ganeshmshetty/phish-block/issues)

## 🗺️ Roadmap

- [ ] Firefox extension port
- [ ] Enhanced ML model (deep learning)
- [ ] Real-time threat intelligence (opt-in)
- [ ] Visual similarity detection
- [ ] Multi-language support
- [ ] Mobile browser support

---

**⚠️ Important**: Phish-Block is a tool to help identify phishing sites, but no system is perfect. Always exercise caution when entering sensitive information online. Check URLs carefully, look for HTTPS, and verify legitimacy through multiple channels when in doubt.
