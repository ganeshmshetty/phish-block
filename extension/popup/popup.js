/**
 * PhishBlock - Popup Script
 */

// ===========================================
// STATE
// ===========================================
let currentTab = null;
let settings = {};
let analysisResult = null;

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await getCurrentTab();
  await loadStats();
  await analyzeCurrentSite();
  setupEventListeners();
  setupTabs();
});

// ===========================================
// DATA LOADING
// ===========================================

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
  settings = response;
  
  // Update UI with settings
  document.getElementById('main-toggle').checked = settings.enabled;
  document.getElementById('auto-block').checked = settings.autoBlock;
  document.getElementById('show-notifications').checked = settings.showNotifications;
  document.getElementById('strict-mode').checked = settings.strictMode;
  document.getElementById('dev-mode').checked = settings.devMode;
  document.getElementById('api-url').value = settings.apiUrl || '';
  
  // Load whitelist
  renderWhitelist();
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
  
  // Skip internal pages
  if (currentTab.url.startsWith('chrome://') || 
      currentTab.url.startsWith('chrome-extension://') ||
      currentTab.url.startsWith('about:')) {
    showNoAnalysis('Internal page');
    return;
  }
  
  // Set analyzing state
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  statusIndicator.className = 'status-indicator analyzing';
  statusText.textContent = 'Analyzing...';
  
  try {
    const result = await chrome.runtime.sendMessage({ action: 'analyzeCurrentTab' });
    analysisResult = result;
    
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

// ===========================================
// UI UPDATES
// ===========================================

function updateAnalysisUI(result) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const riskLevel = document.getElementById('risk-level');
  const confidence = document.getElementById('confidence');
  
  // Update status indicator
  if (result.is_phishing) {
    statusIndicator.className = 'status-indicator danger';
    statusText.textContent = 'Phishing Detected!';
  } else if (result.risk_level === 'medium' || result.risk_level === 'high') {
    statusIndicator.className = 'status-indicator warning';
    statusText.textContent = 'Suspicious';
  } else {
    statusIndicator.className = 'status-indicator safe';
    statusText.textContent = result.is_popular_domain ? 'Trusted Site' : 'Appears Safe';
  }
  
  // Update risk level
  riskLevel.textContent = result.risk_level.toUpperCase();
  riskLevel.className = 'detail-value ' + getRiskClass(result.risk_level);
  
  // Update confidence
  confidence.textContent = Math.round(result.confidence * 100) + '%';
  confidence.className = 'detail-value ' + getRiskClass(result.risk_level);
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

function renderWhitelist() {
  const container = document.getElementById('whitelist-container');
  
  if (!settings.whitelist || settings.whitelist.length === 0) {
    container.innerHTML = '<div class="whitelist-empty">No whitelisted domains</div>';
    return;
  }
  
  container.innerHTML = settings.whitelist.map(domain => `
    <div class="whitelist-item">
      <span class="whitelist-domain">${domain}</span>
      <button class="whitelist-remove" data-domain="${domain}">✕</button>
    </div>
  `).join('');
  
  // Add remove handlers
  container.querySelectorAll('.whitelist-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromWhitelist(btn.dataset.domain));
  });
}

async function loadHistory() {
  const history = await chrome.runtime.sendMessage({ action: 'getHistory' });
  const container = document.getElementById('history-list');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="history-empty">No blocked sites yet</div>';
    return;
  }
  
  container.innerHTML = history.slice(0, 20).map(item => `
    <div class="history-item">
      <span class="history-domain">${item.domain}</span>
      <div class="history-meta">
        <div>${Math.round(item.confidence * 100)}%</div>
        <div>${formatDate(item.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString();
}

// ===========================================
// EVENT HANDLERS
// ===========================================

function setupEventListeners() {
  // Main toggle
  document.getElementById('main-toggle').addEventListener('change', async (e) => {
    await updateSetting('enabled', e.target.checked);
  });
  
  // Protection toggles
  document.getElementById('auto-block').addEventListener('change', async (e) => {
    await updateSetting('autoBlock', e.target.checked);
  });
  
  document.getElementById('show-notifications').addEventListener('change', async (e) => {
    await updateSetting('showNotifications', e.target.checked);
  });
  
  document.getElementById('strict-mode').addEventListener('change', async (e) => {
    await updateSetting('strictMode', e.target.checked);
  });
  
  // Dev mode
  document.getElementById('dev-mode').addEventListener('change', async (e) => {
    await updateSetting('devMode', e.target.checked);
  });
  
  // API URL
  document.getElementById('api-url').addEventListener('blur', async (e) => {
    await updateSetting('apiUrl', e.target.value.trim());
  });
  
  // Refresh analysis
  document.getElementById('refresh-analysis').addEventListener('click', () => {
    analyzeCurrentSite();
  });
  
  // Whitelist current site
  document.getElementById('whitelist-current').addEventListener('click', async () => {
    if (!currentTab || !currentTab.url) return;
    
    try {
      const url = new URL(currentTab.url);
      await chrome.runtime.sendMessage({
        action: 'addToWhitelist',
        domain: url.hostname
      });
      
      settings.whitelist = settings.whitelist || [];
      settings.whitelist.push(url.hostname);
      renderWhitelist();
      
      alert(`${url.hostname} added to whitelist!`);
    } catch (error) {
      alert('Could not whitelist this site');
    }
  });
  
  // Report site
  document.getElementById('report-site').addEventListener('click', () => {
    alert('Thank you for your report!\n\nIn a production version, this would submit the URL for review to improve our detection.');
  });
  
  // Add whitelist manually
  document.getElementById('add-whitelist').addEventListener('click', async () => {
    const input = document.getElementById('whitelist-input');
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) return;
    
    await chrome.runtime.sendMessage({
      action: 'addToWhitelist',
      domain: domain
    });
    
    settings.whitelist = settings.whitelist || [];
    if (!settings.whitelist.includes(domain)) {
      settings.whitelist.push(domain);
    }
    
    input.value = '';
    renderWhitelist();
  });
  
  // Test API
  document.getElementById('test-api').addEventListener('click', async () => {
    const statusEl = document.getElementById('api-status');
    statusEl.className = 'api-status';
    statusEl.textContent = 'Testing...';
    statusEl.style.display = 'block';
    
    const result = await chrome.runtime.sendMessage({ action: 'testApi' });
    
    if (result.success) {
      statusEl.className = 'api-status success';
      statusEl.textContent = `✓ Connected! Model v${result.data.model_version || 'unknown'}`;
    } else {
      statusEl.className = 'api-status error';
      statusEl.textContent = `✕ Failed: ${result.error}`;
    }
  });
  
  // Clear cache
  document.getElementById('clear-cache').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clearCache' });
    alert('Cache cleared!');
  });
  
  // Clear history
  document.getElementById('clear-history').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clearHistory' });
    loadHistory();
  });
  
  // Reset settings
  document.getElementById('reset-settings').addEventListener('click', async () => {
    if (confirm('Reset all settings to defaults?')) {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      location.reload();
    }
  });
}

async function updateSetting(key, value) {
  settings[key] = value;
  await chrome.runtime.sendMessage({
    action: 'updateSettings',
    settings: { [key]: value }
  });
}

async function removeFromWhitelist(domain) {
  await chrome.runtime.sendMessage({
    action: 'removeFromWhitelist',
    domain: domain
  });
  
  settings.whitelist = settings.whitelist.filter(d => d !== domain);
  renderWhitelist();
}

// ===========================================
// TAB NAVIGATION
// ===========================================

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update buttons
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update panes
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
      
      // Load history when switching to history tab
      if (tabId === 'history') {
        loadHistory();
      }
    });
  });
}
