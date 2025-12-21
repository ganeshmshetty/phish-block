/**
 * Settings Page Script
 */

// State
let settings = null;
let state = null;
let whitelist = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadState();
  await loadWhitelist();
  setupEventListeners();
  updateUI();
});

/**
 * Load settings from background script
 */
async function loadSettings() {
  try {
    const [stateResponse, statsResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getState' }),
      chrome.runtime.sendMessage({ action: 'getStats' })
    ]);

    settings = {
      enabled: stateResponse.enabled,
      thresholds: {
        block: statsResponse.thresholds.block,
        warn: statsResponse.thresholds.warn,
        popularDomain: statsResponse.thresholds.popularDomain
      },
      cache: {
        enabled: true // Default to true as it's not togglable in backend yet
      }
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    settings = getDefaultSettings();
  }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    enabled: true,
    thresholds: {
      block: 0.70,
      warn: 0.50,
      popularDomain: 0.90
    },
    cache: {
      enabled: true
    }
  };
}

/**
 * Load state from store
 */
async function loadState() {
  try {
    state = await chrome.runtime.sendMessage({ action: 'getState' });
  } catch (error) {
    console.error('Failed to load state:', error);
    state = { stats: { totalChecks: 0, blocked: 0, warned: 0, allowed: 0 } };
  }
}

/**
 * Load whitelist
 */
async function loadWhitelist() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    whitelist = response.whitelist || [];
  } catch (error) {
    console.error('Failed to load whitelist:', error);
    whitelist = [];
  }
}

/**
 * Update UI with current settings
 */
function updateUI() {
  if (!settings || !state) return;

  // Protection toggle
  const enableProtection = document.getElementById('enable-protection');
  if (enableProtection) enableProtection.checked = settings.enabled;
  
  // Thresholds
  updateThreshold('block', settings.thresholds.block);
  updateThreshold('warn', settings.thresholds.warn);
  updateThreshold('popular', settings.thresholds.popularDomain);
  
  // Cache
  const cacheEnabled = document.getElementById('cache-enabled');
  if (cacheEnabled) cacheEnabled.checked = settings.cache.enabled;
  
  // Statistics
  const stats = state.stats || {};
  const scanned = stats.totalChecks || 0;
  const blocked = stats.blocked || 0;
  const warned = stats.warned || 0;
  const safe = stats.allowed || 0;

  const statScanned = document.getElementById('stat-scanned');
  if (statScanned) statScanned.textContent = scanned.toLocaleString();
  
  const statBlocked = document.getElementById('stat-blocked');
  if (statBlocked) statBlocked.textContent = blocked.toLocaleString();
  
  const statWarnings = document.getElementById('stat-warnings');
  if (statWarnings) statWarnings.textContent = warned.toLocaleString();
  
  const statSafe = document.getElementById('stat-safe');
  if (statSafe) statSafe.textContent = safe.toLocaleString();
  
  // Whitelist
  renderWhitelist();
}

/**
 * Update threshold slider and value
 */
function updateThreshold(type, value) {
  const slider = document.getElementById(`${type}-threshold`);
  const display = document.getElementById(`${type}-value`);
  
  if (slider && display) {
    slider.value = value;
    display.textContent = value.toFixed(2);
  }
}

/**
 * Render whitelist
 */
function renderWhitelist() {
  const container = document.getElementById('whitelist-list');
  if (!container) return;
  
  if (whitelist.length === 0) {
    container.innerHTML = '<div class="empty-state">No trusted sites yet</div>';
    return;
  }
  
  container.innerHTML = whitelist
    .map(domain => `
      <div class="whitelist-item">
        <span class="domain-icon">✓</span>
        <span class="domain-text">${domain}</span>
        <button class="remove-btn" data-domain="${domain}">Remove</button>
      </div>
    `)
    .join('');
  
  // Add remove listeners
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const domain = e.target.dataset.domain;
      await removeDomain(domain);
    });
  });
}

/**
 * Add domain to whitelist
 */
async function addDomain(domain) {
  // Validate domain
  if (!domain || domain.trim() === '') {
    showMessage('Please enter a domain', 'error');
    return;
  }
  
  // Normalize domain (remove protocol, www, trailing slash)
  domain = domain.trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
  
  // Check if already in whitelist
  if (whitelist.includes(domain)) {
    showMessage('Domain already trusted', 'error');
    return;
  }
  
  // Add to whitelist
  try {
    await chrome.runtime.sendMessage({ 
      action: 'addToWhitelist', 
      url: domain 
    });
    whitelist.push(domain);
    
    // Update UI
    renderWhitelist();
    const input = document.getElementById('whitelist-input');
    if (input) input.value = '';
    showMessage('Domain added to trusted sites', 'success');
  } catch (error) {
    showMessage('Failed to add domain', 'error');
  }
}

/**
 * Remove domain from whitelist
 */
async function removeDomain(domain) {
  const confirmed = confirm(`Remove "${domain}" from trusted sites?`);
  
  if (confirmed) {
    try {
      await chrome.runtime.sendMessage({ 
        action: 'removeFromWhitelist', 
        url: domain 
      });
      whitelist = whitelist.filter(d => d !== domain);
      
      // Update UI
      renderWhitelist();
      showMessage('Domain removed from trusted sites', 'success');
    } catch (error) {
      showMessage('Failed to remove domain', 'error');
    }
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  // Update settings from UI
  const enableProtection = document.getElementById('enable-protection');
  if (enableProtection) settings.enabled = enableProtection.checked;
  
  const blockThreshold = document.getElementById('block-threshold');
  if (blockThreshold) settings.thresholds.block = parseFloat(blockThreshold.value);
  
  const warnThreshold = document.getElementById('warn-threshold');
  if (warnThreshold) settings.thresholds.warn = parseFloat(warnThreshold.value);
  
  const popularThreshold = document.getElementById('popular-threshold');
  if (popularThreshold) settings.thresholds.popularDomain = parseFloat(popularThreshold.value);
  
  const cacheEnabled = document.getElementById('cache-enabled');
  if (cacheEnabled) settings.cache.enabled = cacheEnabled.checked;
  
  // Validate thresholds
  if (settings.thresholds.warn >= settings.thresholds.block) {
    showMessage('Warning threshold must be lower than block threshold', 'error');
    return;
  }
  
  // Notify background script
  try {
    await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings
    });
    
    showMessage('Settings saved successfully', 'success');
  } catch (error) {
    showMessage('Failed to save settings', 'error');
  }
}

/**
 * Reset statistics
 */
async function resetStats() {
  const confirmed = confirm(
    'Are you sure you want to reset all statistics?\n\n' +
    'This will clear:\n' +
    '• Sites scanned\n' +
    '• Threats blocked\n' +
    '• Warnings shown\n\n' +
    'This action cannot be undone.'
  );
  
  if (confirmed) {
    try {
      await chrome.runtime.sendMessage({ action: 'resetStats' });
      await loadState(); // Reload state
      updateUI();
      showMessage('Statistics reset successfully', 'success');
    } catch (error) {
      showMessage('Failed to reset statistics', 'error');
    }
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    await chrome.runtime.sendMessage({ action: 'clearCache' });
    showMessage('Cache cleared successfully', 'success');
  } catch (error) {
    showMessage('Failed to clear cache', 'error');
  }
}

/**
 * Show status message
 */
function showMessage(message, type = 'success') {
  const statusElement = document.getElementById('save-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `save-status ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Threshold sliders
  ['block', 'warn', 'popular'].forEach(type => {
    const slider = document.getElementById(`${type}-threshold`);
    const display = document.getElementById(`${type}-value`);
    
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        display.textContent = parseFloat(e.target.value).toFixed(2);
      });
    }
  });
  
  // Whitelist
  const addBtn = document.getElementById('add-whitelist-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const input = document.getElementById('whitelist-input');
      if (input) await addDomain(input.value);
    });
  }
  
  const whitelistInput = document.getElementById('whitelist-input');
  if (whitelistInput) {
    whitelistInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await addDomain(e.target.value);
      }
    });
  }
  
  // Statistics
  const resetBtn = document.getElementById('reset-stats-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetStats);
  
  // Cache
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);
  
  // Save settings
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  
  // External links
  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block' });
    });
  }
  
  const docsBtn = document.getElementById('docs-btn');
  if (docsBtn) {
    docsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block#readme' });
    });
  }
  
  const reportBtn = document.getElementById('report-issue-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block/issues/new' });
    });
  }
}
