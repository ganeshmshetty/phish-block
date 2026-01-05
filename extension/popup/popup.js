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

  if (result.is_phishing) {
    statusIndicator.className = 'status-indicator danger';
    statusText.textContent = 'Phishing Detected';
  } else if (result.risk_level === 'medium' || result.risk_level === 'high') {
    statusIndicator.className = 'status-indicator warning';
    statusText.textContent = 'Suspicious';
  } else {
    statusIndicator.className = 'status-indicator safe';
    statusText.textContent = result.is_popular_domain ? 'Trusted Site' : 'Appears Safe';
  }

  riskLevel.textContent = result.risk_level.toUpperCase();
  riskLevel.className = 'detail-value ' + getRiskClass(result.risk_level);

  confidence.textContent = Math.round(result.confidence * 100) + '%';
  confidence.className = 'detail-value ' + getRiskClass(result.risk_level);

  // Show explain button
  document.getElementById('explain-btn').style.display = 'block';
  document.getElementById('reasoning-section').style.display = 'none';
}

function showNoAnalysis(message = 'Cannot analyze') {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const riskLevel = document.getElementById('risk-level');
  const confidence = document.getElementById('confidence');

  statusIndicator.className = 'status-indicator';
  statusText.textContent = message;
  riskLevel.textContent = '-';
  riskLevel.className = 'detail-value';
  confidence.textContent = '-';
  confidence.className = 'detail-value';
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
      const response = await fetch('http://localhost:8000/predict/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentTab.url })
      });

      if (response.ok) {
        const result = await response.json();
        reasoningText.textContent = result.reasoning;
        btn.textContent = 'Hide Explanation';
      } else {
        reasoningText.textContent = 'Could not generate explanation';
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
