/**
 * PhishBlock - Popup Script (Simplified)
 */

// State
let currentTab = null;
let settings = {};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await getCurrentTab();
  await loadStats();
  await analyzeCurrentSite();
  setupEventListeners();
});

// Data Loading
async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
  settings = response;
  document.getElementById('main-toggle').checked = settings.enabled;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      document.getElementById('current-domain').textContent = url.hostname;
    } catch {
      document.getElementById('current-domain').textContent = 'N/A';
    }
  }
}

async function loadStats() {
  const stats = await chrome.runtime.sendMessage({ action: 'getStats' });

  document.getElementById('stat-analyzed').textContent = formatNumber(stats.totalAnalyzed);
  document.getElementById('stat-blocked').textContent = formatNumber(stats.phishingBlocked);
  document.getElementById('stat-warnings').textContent = formatNumber(stats.warningsShown);
}

async function analyzeCurrentSite() {
  if (!currentTab || !currentTab.url) {
    showNoAnalysis();
    return;
  }

  if (currentTab.url.startsWith('chrome://') ||
    currentTab.url.startsWith('chrome-extension://') ||
    currentTab.url.startsWith('about:')) {
    showNoAnalysis('Internal page');
    return;
  }

  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  statusIndicator.className = 'status-indicator analyzing';
  statusText.textContent = 'Analyzing...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'analyzeCurrentTab' });

    if (result) {
      updateAnalysisUI(result);
    } else {
      showNoAnalysis('Analysis failed');
    }
  } catch (error) {
    showNoAnalysis('Error');
    console.error('Analysis error:', error);
  }
}

// UI Updates
function updateAnalysisUI(result) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const riskLevel = document.getElementById('risk-level');
  const confidence = document.getElementById('confidence');
  const checkIcon = document.getElementById('status-icon-safe');

  // Update threat meter
  updateThreatMeter(result);

  if (result.is_phishing) {
    statusIndicator.className = 'status-indicator danger';
    statusIndicator.style.display = 'inline-block';
    checkIcon.style.display = 'none';
    statusText.textContent = 'Phishing Detected';
    confidence.className = 'confidence-value danger';
  } else if (result.risk_level === 'medium' || result.risk_level === 'high') {
    statusIndicator.className = 'status-indicator warning';
    statusIndicator.style.display = 'inline-block';
    checkIcon.style.display = 'none';
    statusText.textContent = 'Suspicious';
    confidence.className = 'confidence-value warning';
  } else {
    // Safe - show check icon instead of dot
    statusIndicator.className = 'status-indicator safe';
    statusIndicator.style.display = 'inline-block';
    checkIcon.style.display = 'none';
    statusText.textContent = result.is_popular_domain ? 'Trusted Site' : 'Appears Safe';
    confidence.className = 'confidence-value safe';
  }

  riskLevel.textContent = result.risk_level.toUpperCase();
  riskLevel.className = 'detail-value ' + getRiskClass(result.risk_level);

  confidence.textContent = Math.round(result.confidence * 100) + '%';

  // Show explain button
  document.getElementById('explain-btn').style.display = 'block';
  document.getElementById('reasoning-section').style.display = 'none';
}

/**
 * Update the threat meter visualization
 */
function updateThreatMeter(result) {
  const needle = document.getElementById('meter-needle');
  const meterFill = document.getElementById('meter-fill');

  // Calculate threat level (0 = safe, 1 = dangerous)
  // For safe sites, show low threat; for phishing, show high threat
  let threatLevel = result.confidence;

  // Invert for safe sites (low confidence in phishing = low threat)
  if (!result.is_phishing && result.risk_level === 'low') {
    threatLevel = 0.1; // Show as very safe
  } else if (!result.is_phishing && result.risk_level === 'medium') {
    threatLevel = 0.4; // Show as somewhat cautious
  } else if (result.is_phishing) {
    threatLevel = Math.max(0.7, result.confidence); // Show as dangerous
  }

  // Needle rotation: -90deg (safe/left) to 90deg (danger/right)
  const rotation = -90 + (threatLevel * 180);
  needle.style.transform = `rotate(${rotation}deg)`;

  // Update arc fill
  // Arc length is ~126 (half circle with radius 40)
  const arcLength = 126;
  const fillAmount = threatLevel * arcLength;
  meterFill.style.strokeDashoffset = arcLength - fillAmount;

  // Update fill color based on threat level
  meterFill.classList.remove('safe', 'warning', 'danger');
  if (threatLevel < 0.3) {
    meterFill.classList.add('safe');
  } else if (threatLevel < 0.6) {
    meterFill.classList.add('warning');
  } else {
    meterFill.classList.add('danger');
  }
}

function showNoAnalysis(message = 'Cannot analyze') {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const riskLevel = document.getElementById('risk-level');
  const confidence = document.getElementById('confidence');
  const checkIcon = document.getElementById('status-icon-safe');

  statusIndicator.className = 'status-indicator';
  statusIndicator.style.display = 'inline-block';
  checkIcon.style.display = 'none';
  statusText.textContent = message;
  riskLevel.textContent = '-';
  riskLevel.className = 'detail-value';
  confidence.textContent = '-';
  confidence.className = 'confidence-value';

  // Reset threat meter to neutral
  const needle = document.getElementById('meter-needle');
  const meterFill = document.getElementById('meter-fill');
  if (needle) needle.style.transform = 'rotate(-90deg)';
  if (meterFill) {
    meterFill.style.strokeDashoffset = '126';
    meterFill.classList.remove('safe', 'warning', 'danger');
  }
}

function getRiskClass(level) {
  switch (level) {
    case 'critical':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'safe';
  }
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// Event Handlers
function setupEventListeners() {
  document.getElementById('main-toggle').addEventListener('change', async (e) => {
    console.log('[PhishBlock Popup] Toggle changed to:', e.target.checked);
    await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { enabled: e.target.checked }
    });
  });

  document.getElementById('refresh-analysis').addEventListener('click', () => {
    analyzeCurrentSite();
  });

  // Explain button
  document.getElementById('explain-btn').addEventListener('click', async () => {
    const btn = document.getElementById('explain-btn');
    const reasoningSection = document.getElementById('reasoning-section');
    const reasoningText = document.getElementById('reasoning-text');

    if (reasoningSection.style.display === 'block') {
      reasoningSection.style.display = 'none';
      btn.textContent = 'Explain Analysis';
      return;
    }

    if (!currentTab || !currentTab.url) return;

    btn.textContent = 'Loading...';
    btn.disabled = true;
    reasoningSection.style.display = 'block';
    reasoningText.textContent = 'Analyzing...';

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'explainUrl',
        url: currentTab.url
      });

      if (result && !result.error) {
        reasoningText.textContent = result.reasoning;
        btn.textContent = 'Hide Explanation';
      } else {
        reasoningText.textContent = 'Could not generate explanation: ' + (result?.error || 'Unknown error');
        btn.textContent = 'Explain Analysis';
      }
    } catch (error) {
      console.error('Explain error:', error);
      reasoningText.textContent = 'Error loading explanation';
      btn.textContent = 'Explain Analysis';
    } finally {
      btn.disabled = false;
    }
  });

  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
}
