/**
 * Popup UI Script
 */

let currentURL = null;
let currentDecision = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentTab();
  await loadState();
  setupEventListeners();
  startAutoRefresh();
});

/**
 * Load current tab information
 */
async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    currentURL = tab.url;
    
    // Skip chrome:// URLs
    if (currentURL.startsWith('chrome://') || currentURL.startsWith('chrome-extension://')) {
      showSystemPage();
      return;
    }
    
    // Check URL
    const response = await chrome.runtime.sendMessage({
      action: 'checkURL',
      url: currentURL
    });
    
    currentDecision = response;
    updateStatus(response);
    
  } catch (error) {
    console.error('Failed to load tab:', error);
    showError();
  }
}

/**
 * Load extension state and statistics
 */
async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });
    
    // Update toggle
    document.getElementById('enabled-toggle').checked = response.enabled;
    
    // Update statistics
    document.getElementById('stat-blocked').textContent = response.stats.blocked;
    document.getElementById('stat-warned').textContent = response.stats.warned;
    document.getElementById('stat-total').textContent = response.stats.totalChecks;
    
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

/**
 * Update status display
 */
function updateStatus(decision) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');
  const statusDetails = document.getElementById('status-details');
  
  // Remove all status classes
  statusIndicator.className = 'status-indicator';
  
  switch (decision.level) {
    case 'SAFE':
      statusIndicator.classList.add('safe');
      statusIcon.textContent = '✓';
      statusTitle.textContent = 'Safe Website';
      statusDescription.textContent = 'No threats detected on this site';
      break;
    
    case 'SUSPICIOUS':
      statusIndicator.classList.add('suspicious');
      statusIcon.textContent = '⚠';
      statusTitle.textContent = 'Suspicious Site';
      statusDescription.textContent = 'This site shows some concerning patterns';
      statusDetails.style.display = 'block';
      break;
    
    case 'PHISHING':
      statusIndicator.classList.add('phishing');
      statusIcon.textContent = '✕';
      statusTitle.textContent = 'Phishing Detected';
      statusDescription.textContent = 'This site is likely a phishing attempt';
      statusDetails.style.display = 'block';
      break;
    
    default:
      statusIndicator.classList.add('unknown');
      statusIcon.textContent = '?';
      statusTitle.textContent = 'Unknown';
      statusDescription.textContent = 'Unable to analyze this site';
  }
  
  // Update details
  if (decision.probability !== null) {
    document.getElementById('confidence-value').textContent = 
      `${Math.round(decision.confidence * 100)}%`;
    document.getElementById('risk-score').textContent = 
      `${Math.round(decision.probability * 100)}%`;
  }
  
  document.getElementById('latency').textContent = 
    decision.latency ? `${decision.latency}ms` : '-';
}

/**
 * Show system page message
 */
function showSystemPage() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');
  
  statusIndicator.className = 'status-indicator unknown';
  statusIcon.textContent = '🔒';
  statusTitle.textContent = 'System Page';
  statusDescription.textContent = 'Cannot analyze browser system pages';
  
  document.getElementById('whitelist-btn').disabled = true;
  document.getElementById('report-btn').disabled = true;
}

/**
 * Show error state
 */
function showError() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');
  
  statusIndicator.className = 'status-indicator unknown';
  statusIcon.textContent = '⚠';
  statusTitle.textContent = 'Error';
  statusDescription.textContent = 'Failed to check this site';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Enabled toggle
  document.getElementById('enabled-toggle').addEventListener('change', async (e) => {
    try {
      await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
      if (!e.target.checked) {
        showDisabled();
      } else {
        await loadCurrentTab();
      }
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  });
  
  // Whitelist button
  document.getElementById('whitelist-btn').addEventListener('click', async () => {
    if (!currentURL) return;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'addToWhitelist',
        url: currentURL
      });
      
      // Refresh status
      await loadCurrentTab();
      
      showNotification('✓ Site added to whitelist');
    } catch (error) {
      console.error('Whitelist failed:', error);
      showNotification('✕ Failed to add to whitelist', true);
    }
  });
  
  // Report button
  document.getElementById('report-btn').addEventListener('click', () => {
    // Open report form or GitHub issues
    chrome.tabs.create({
      url: 'https://github.com/ganeshmshetty/phish-block/issues/new'
    });
  });
  
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Help button
  document.getElementById('help-btn').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/ganeshmshetty/phish-block#readme'
    });
  });
}

/**
 * Show disabled state
 */
function showDisabled() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDescription = document.getElementById('status-description');
  
  statusIndicator.className = 'status-indicator unknown';
  statusIcon.textContent = '⏸';
  statusTitle.textContent = 'Protection Disabled';
  statusDescription.textContent = 'Phish-Block is currently paused';
}

/**
 * Show notification
 */
function showNotification(message, isError = false) {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? '#e74c3c' : '#2ecc71'};
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Auto-refresh every 5 seconds
 */
function startAutoRefresh() {
  setInterval(async () => {
    await loadState();
  }, 5000);
}
