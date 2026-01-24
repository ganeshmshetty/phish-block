/**
 * PhishBlock - Background Service Worker
 * Handles real-time URL analysis and blocking
 */

// ===========================================
// CONFIGURATION
// ===========================================
const CONFIG = {
  // API endpoint - Update this with your Render URL after deployment
  // Removed hard-coded production API URL. Set `apiUrl` via extension settings if needed.

  // Local development API
  DEV_API_URL: 'http://localhost:8000',
  // Optional production API URL. If you have a deployed API, set this to its base URL.
  // Using the Railway/deployed endpoint here as a safe fallback so the extension
  // can function without requiring the user to configure `settings.apiUrl` first.
  PROD_API_URL: 'https://phish-block-production.up.railway.app/',

  // Analysis settings
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  REQUEST_TIMEOUT_MS: 5000, // 5 seconds

  // Risk thresholds
  THRESHOLDS: {
    BLOCK: 0.50,      // Block page
    WARN: 0.40,       // Show warning
  }
};

// ===========================================
// STATE MANAGEMENT
// ===========================================
let urlCache = new Map();
let analysisStats = {
  totalAnalyzed: 0,
  phishingBlocked: 0,
  warningsShown: 0,
  sessionStart: Date.now()
};

// URLs temporarily allowed by user (bypass blocking once)
let temporarilyAllowedUrls = new Set();

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  autoBlock: true,
  whitelist: [],
  apiUrl: '', // Leave blank by default; set via extension settings if needed
  devMode: false,
  strictMode: false,
  logHistory: true
};

let settings = { ...DEFAULT_SETTINGS };

// ===========================================
// UTILITY FUNCTIONS
// ===========================================


//Get current API URL based on settings

function getApiUrl() {
  let url = CONFIG.DEV_API_URL;
  if (settings.devMode) {
    url = CONFIG.DEV_API_URL;
  } else if (settings.apiUrl) {
    url = settings.apiUrl;
  } else if (CONFIG.PROD_API_URL) {
    url = CONFIG.PROD_API_URL;
  }
  console.log('[PhishBlock] Active API URL:', url);
  return url;
}

/**
 * Check if URL should be skipped (internal pages, whitelisted, etc.)
 */
function shouldSkipUrl(url) {
  if (!url) return true;

  // Check if temporarily allowed (bypass blocking for 30 seconds)
  if (temporarilyAllowedUrls.has(url)) {
    console.log('[PhishBlock] Temporarily allowed URL (exact match):', url);
    return true;
  }

  // Also check by origin to handle URL variations (query params, fragments, etc.)
  try {
    const urlOrigin = new URL(url).origin;
    for (const allowedUrl of temporarilyAllowedUrls) {
      try {
        if (new URL(allowedUrl).origin === urlOrigin) {
          console.log('[PhishBlock] Temporarily allowed URL (origin match):', url);
          return true;
        }
      } catch { /* ignore invalid URLs in set */ }
    }
  } catch { /* ignore URL parse errors */ }

  // Skip browser internal pages
  const skipPatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /^edge:\/\//,
    /^about:/,
    /^file:\/\//,
    /^data:/,
    /^javascript:/,
    /^blob:/
  ];

  if (skipPatterns.some(pattern => pattern.test(url))) {
    return true;
  }

  // Check whitelist
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    return settings.whitelist.some(whitelisted => {
      const wl = whitelisted.toLowerCase();
      return domain === wl || domain.endsWith('.' + wl);
    });
  } catch {
    return true;
  }
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Get cached result if still valid
 */
function getCachedResult(url) {
  const cached = urlCache.get(url);
  if (cached && (Date.now() - cached.timestamp) < CONFIG.CACHE_DURATION_MS) {
    return cached.result;
  }
  return null;
}

/**
 * Cache analysis result
 */
function cacheResult(url, result) {
  // Limit cache size
  if (urlCache.size > 1000) {
    const oldestKey = urlCache.keys().next().value;
    urlCache.delete(oldestKey);
  }

  urlCache.set(url, {
    result,
    timestamp: Date.now()
  });
}

// ===========================================
// API COMMUNICATION
// ===========================================

/**
 * Analyze URL using the PhishBlock API
 */
async function analyzeUrl(url) {
  // Check cache first
  const cached = getCachedResult(url);
  if (cached) {
    console.log('[PhishBlock] Cache hit:', extractDomain(url));
    return cached;
  }

  try {
    const base = getApiUrl();
    const endpoint = base ? `${String(base).replace(/\/$/, '')}/predict` : '/predict';
    console.log('[PhishBlock] Analyzing URL, endpoint:', endpoint, 'url:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to read response body for better diagnostics
      let text = '';
      try { text = await response.text(); } catch (e) { text = `<could not read response: ${e.message}>`; }
      throw new Error(`API error: ${response.status} ${response.statusText} - ${text}`);
    }

    const result = await response.json();

    // Cache the result
    cacheResult(url, result);

    // Update stats
    analysisStats.totalAnalyzed++;

    console.log('[PhishBlock] Analysis:', extractDomain(url), result.risk_level, result.confidence);

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[PhishBlock] Analysis failed: request timed out after', CONFIG.REQUEST_TIMEOUT_MS, 'ms');
    } else {
      console.error('[PhishBlock] Analysis failed:', error && error.message ? error.message : error);
    }
    // expose more detail in stats for debugging
    if (!analysisStats.lastError) analysisStats.lastError = {};
    analysisStats.lastError = { message: error && error.message ? error.message : String(error), time: Date.now(), url };
    return null;
  }
}

// ===========================================
// BLOCKING & WARNINGS
// ===========================================

/**
 * Block a phishing page by redirecting to blocked page
 */
function blockPage(tabId, url, result) {
  const blockedPageUrl = chrome.runtime.getURL('blocked/blocked.html') +
    `?url=${encodeURIComponent(url)}` +
    `&confidence=${result.confidence}` +
    `&risk=${result.risk_level}` +
    `&domain=${encodeURIComponent(extractDomain(url))}`;

  chrome.tabs.update(tabId, { url: blockedPageUrl });

  analysisStats.phishingBlocked++;

  // Log to history
  if (settings.logHistory) {
    logBlockedUrl(url, result);
  }
}

/**
 * Show warning for suspicious URLs
 */
function showWarning(tabId, url, result) {
  // Inject warning banner into page
  chrome.scripting.executeScript({
    target: { tabId },
    func: injectWarningBanner,
    args: [result.confidence, result.risk_level, result.recommendation]
  }).catch(err => console.log('[PhishBlock] Could not inject warning:', err));

  analysisStats.warningsShown++;
}
/**
 * Function to inject warning banner (runs in page context)
 */
function injectWarningBanner(confidence, riskLevel, recommendation) {
  // Check if banner already exists
  if (document.getElementById('phishblock-warning')) return;

  const banner = document.createElement('div');
  banner.id = 'phishblock-warning';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fef3c7;
      color: #92400e;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L1 21h22L12 2z" fill="#000" opacity="0.2"/>
          <path d="M12 9v4M12 17h.01" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <strong>PhishBlock Warning:</strong> This website shows suspicious characteristics.
          <br>
          <small style="opacity: 0.8;">Risk: ${riskLevel.toUpperCase()} | Confidence: ${Math.round(confidence * 100)}%</small>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="phishblock-proceed" style="
          background: rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.3);
          color: #000;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        ">Proceed</button>
        <button id="phishblock-close" style="
          background: #000;
          border: none;
          color: #f59e0b;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 13px;
        ">Leave Site</button>
      </div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
  document.body.style.marginTop = '60px';

  // Add event listeners
  document.getElementById('phishblock-proceed').onclick = () => {
    banner.remove();
    document.body.style.marginTop = '0';
  };

  document.getElementById('phishblock-close').onclick = () => {
    window.history.back();
  };
}


/**
 * Log blocked URL to history
 */
async function logBlockedUrl(url, result) {
  const history = await chrome.storage.local.get('blockedHistory') || { blockedHistory: [] };
  const blockedHistory = history.blockedHistory || [];

  blockedHistory.unshift({
    url,
    domain: extractDomain(url),
    timestamp: Date.now(),
    confidence: result.confidence,
    riskLevel: result.risk_level
  });

  // Keep only last 100 entries
  if (blockedHistory.length > 100) {
    blockedHistory.pop();
  }

  await chrome.storage.local.set({ blockedHistory });
}

// ===========================================
// EVENT LISTENERS
// ===========================================

/**
 * Handle navigation events
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check main frame navigations
  if (details.frameId !== 0) return;
  if (!settings.enabled) return;
  if (shouldSkipUrl(details.url)) return;

  console.log('[PhishBlock] Checking:', extractDomain(details.url));

  const result = await analyzeUrl(details.url);

  if (!result) return; // API error, allow navigation

  if (result.is_phishing && settings.autoBlock) {
    blockPage(details.tabId, details.url, result);
  } else if (!result.is_phishing && result.risk_level &&
    (result.risk_level.toLowerCase() === 'medium' || result.risk_level.toLowerCase() === 'high')) {
    // Show warning only for suspicious sites (medium/high risk) that aren't blocked
    // Never show warning for 'safe' or 'low' risk levels
    const riskLower = result.risk_level.toLowerCase();
    if (riskLower !== 'safe' && riskLower !== 'low') {
      setTimeout(() => showWarning(details.tabId, details.url, result), 1000);
    }
  }
});

/**
 * Handle completed navigation (for pages that loaded before analysis finished)
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!settings.enabled) return;
  if (shouldSkipUrl(details.url)) return;

  const result = await analyzeUrl(details.url);

  if (!result) return;

  // Update badge based on result
  updateBadge(details.tabId, result);
});

/**
 * Update extension badge for current tab
 */
function updateBadge(tabId, result) {
  let color, text;

  if (result.is_phishing) {
    color = '#dc3545';
    text = '!';
  } else if (result.risk_level === 'medium' || result.risk_level === 'high') {
    color = '#ffc107';
    text = '?';
  } else {
    color = '#28a745';
    text = '✓';
  }

  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text });
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getStats':
      sendResponse({
        ...analysisStats,
        cacheSize: urlCache.size,
        enabled: settings.enabled,
        lastError: analysisStats.lastError || null
      });
      break;

    case 'getSettings':
      sendResponse(settings);
      break;

    case 'updateSettings':
      settings = { ...settings, ...message.settings };
      chrome.storage.sync.set({ settings });
      console.log('[PhishBlock] Settings updated:', settings);
      sendResponse({ success: true });
      break;

    case 'analyzeCurrentTab':
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0] && tabs[0].url) {
          const result = await analyzeUrl(tabs[0].url);
          sendResponse(result);
        } else {
          sendResponse(null);
        }
      });
      return true; // Keep channel open for async response

    case 'addToWhitelist':
      if (message.domain && !settings.whitelist.includes(message.domain)) {
        settings.whitelist.push(message.domain);
        chrome.storage.sync.set({ settings });
      }
      sendResponse({ success: true });
      break;

    case 'removeFromWhitelist':
      settings.whitelist = settings.whitelist.filter(d => d !== message.domain);
      chrome.storage.sync.set({ settings });
      sendResponse({ success: true });
      break;

    case 'getHistory':
      chrome.storage.local.get('blockedHistory', (data) => {
        sendResponse(data.blockedHistory || []);
      });
      return true;

    case 'clearHistory':
      chrome.storage.local.set({ blockedHistory: [] });
      sendResponse({ success: true });
      break;

    case 'clearCache':
      urlCache.clear();
      sendResponse({ success: true, message: 'Cache cleared' });
      break;

    case 'testApi':
      const healthEndpoint = `${getApiUrl().replace(/\/$/, '')}/health`;
      console.log('[PhishBlock] Testing API health at:', healthEndpoint);
      fetch(healthEndpoint, { cache: 'no-cache' })
        .then(res => res.json())
        .then(data => {
          console.log('[PhishBlock] API health response:', data);
          sendResponse({ success: true, data });
        })
        .catch(err => {
          console.error('[PhishBlock] API health test failed:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'temporarilyAllow':
      // Add URL to temporary allow list (expires after navigation)
      temporarilyAllowedUrls.add(message.url);
      // Auto-remove after 30 seconds
      setTimeout(() => temporarilyAllowedUrls.delete(message.url), 30000);
      sendResponse({ success: true });
      break;

    case 'explainUrl':
      const explainEndpoint = `${getApiUrl().replace(/\/$/, '')}/predict/explain`;
      fetch(explainEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: message.url })
      })
        .then(res => res.json())
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'getApiUrl':
      sendResponse({ url: getApiUrl() });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Handle tab updates to show badge
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const cached = getCachedResult(tab.url);
    if (cached) {
      updateBadge(tabId, cached);
    }
  }
});

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Load settings from storage
 */
async function loadSettings() {
  const stored = await chrome.storage.sync.get('settings');
  if (stored.settings) {
    settings = { ...DEFAULT_SETTINGS, ...stored.settings };
  } else {
    // First run - save default settings
    settings = { ...DEFAULT_SETTINGS };
    await chrome.storage.sync.set({ settings });
    console.log('[PhishBlock] First run - saved default settings');
  }
  console.log('[PhishBlock] Settings loaded:', settings.enabled ? 'Enabled' : 'Disabled', 'DevMode:', settings.devMode);
}

/**
 * Initialize extension
 */
async function init() {
  await loadSettings();

  console.log('[PhishBlock] Extension initialized');
  console.log('[PhishBlock] API URL:', getApiUrl());
}

// Start
init();

// Clear old cache periodically
chrome.alarms.create('clearOldCache', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clearOldCache') {
    const now = Date.now();
    for (const [url, data] of urlCache.entries()) {
      if (now - data.timestamp > CONFIG.CACHE_DURATION_MS) {
        urlCache.delete(url);
      }
    }
    console.log('[PhishBlock] Cache cleanup complete. Size:', urlCache.size);
  }
});
