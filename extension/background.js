/**
 * PhishBlock - Background Service Worker
 * Handles real-time URL analysis and blocking
 */

// ===========================================
// CONFIGURATION
// ===========================================
const CONFIG = {
  // API endpoint - Update this with your Render URL after deployment
  API_URL: 'phish-block.railway.internal',
  
  // Local development API
  DEV_API_URL: 'http://localhost:8000',
  
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

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  autoBlock: true,
  showNotifications: true,
  whitelist: [],
  apiUrl: CONFIG.API_URL,
  devMode: false,
  strictMode: false,
  logHistory: true
};

let settings = { ...DEFAULT_SETTINGS };

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get current API URL based on settings
 */
function getApiUrl() {
  return settings.devMode ? CONFIG.DEV_API_URL : settings.apiUrl;
}

/**
 * Check if URL should be skipped (internal pages, whitelisted, etc.)
 */
function shouldSkipUrl(url) {
  if (!url) return true;
  
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    
    const response = await fetch(`${getApiUrl()}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Cache the result
    cacheResult(url, result);
    
    // Update stats
    analysisStats.totalAnalyzed++;
    
    console.log('[PhishBlock] Analysis:', extractDomain(url), result.risk_level, result.confidence);
    
    return result;
  } catch (error) {
    console.error('[PhishBlock] Analysis failed:', error.message);
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
  
  // Show notification
  if (settings.showNotifications) {
    showNotification(
      '🛡️ Phishing Blocked!',
      `Blocked access to ${extractDomain(url)}`,
      'blocked'
    );
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
  
  if (settings.showNotifications) {
    showNotification(
      '⚠️ Suspicious Website',
      `${extractDomain(url)} shows phishing indicators`,
      'warning'
    );
  }
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
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      color: white;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">⚠️</span>
        <div>
          <strong>PhishBlock Warning:</strong> This website shows suspicious characteristics.
          <br>
          <small style="opacity: 0.9;">Risk Level: ${riskLevel.toUpperCase()} • Confidence: ${Math.round(confidence * 100)}%</small>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="phishblock-proceed" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid white;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        ">Proceed Anyway</button>
        <button id="phishblock-close" style="
          background: white;
          border: none;
          color: #ff6b35;
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
 * Show browser notification
 */
function showNotification(title, message, type) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message,
    priority: type === 'blocked' ? 2 : 1
  });
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
  } else if (result.confidence >= CONFIG.THRESHOLDS.WARN && !result.is_phishing) {
    // Show warning for suspicious but not blocked URLs
    setTimeout(() => showWarning(details.tabId, details.url, result), 1000);
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
        enabled: settings.enabled
      });
      break;
      
    case 'getSettings':
      sendResponse(settings);
      break;
      
    case 'updateSettings':
      settings = { ...settings, ...message.settings };
      chrome.storage.sync.set({ settings });
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
      fetch(`${getApiUrl()}/health`)
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
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
  }
  console.log('[PhishBlock] Settings loaded:', settings.enabled ? 'Enabled' : 'Disabled');
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
