/**
 * Settings Page Script
 */

import { store } from '../../core/state/store.js';
import { whitelistManager } from '../../core/decision/whitelist.js';
import { decisionCache } from '../../core/decision/cache.js';

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
 * Load settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  settings = result.settings || getDefaultSettings();
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
  state = await store.getState();
}

/**
 * Load whitelist
 */
async function loadWhitelist() {
  whitelist = await whitelistManager.getAll();
}

/**
 * Update UI with current settings
 */
function updateUI() {
  // Protection toggle
  document.getElementById('enable-protection').checked = settings.enabled;
  
  // Thresholds
  updateThreshold('block', settings.thresholds.block);
  updateThreshold('warn', settings.thresholds.warn);
  updateThreshold('popular', settings.thresholds.popularDomain);
  
  // Cache
  document.getElementById('cache-enabled').checked = settings.cache.enabled;
  
  // Statistics
  document.getElementById('stat-scanned').textContent = state.stats.urlsScanned.toLocaleString();
  document.getElementById('stat-blocked').textContent = state.stats.threatsBlocked.toLocaleString();
  document.getElementById('stat-warnings').textContent = state.stats.warningsShown.toLocaleString();
  document.getElementById('stat-safe').textContent = 
    (state.stats.urlsScanned - state.stats.threatsBlocked - state.stats.warningsShown).toLocaleString();
  
  // Whitelist
  renderWhitelist();
}

/**
 * Update threshold slider and value
 */
function updateThreshold(type, value) {
  const slider = document.getElementById(`${type}-threshold`);
  const display = document.getElementById(`${type}-value`);
  
  slider.value = value;
  display.textContent = value.toFixed(2);
}

/**
 * Render whitelist
 */
function renderWhitelist() {
  const container = document.getElementById('whitelist-list');
  
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
  await whitelistManager.add(domain);
  whitelist.push(domain);
  
  // Update UI
  renderWhitelist();
  document.getElementById('whitelist-input').value = '';
  showMessage('Domain added to trusted sites', 'success');
}

/**
 * Remove domain from whitelist
 */
async function removeDomain(domain) {
  const confirmed = confirm(`Remove "${domain}" from trusted sites?`);
  
  if (confirmed) {
    await whitelistManager.remove(domain);
    whitelist = whitelist.filter(d => d !== domain);
    
    // Update UI
    renderWhitelist();
    showMessage('Domain removed from trusted sites', 'success');
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  // Update settings from UI
  settings.enabled = document.getElementById('enable-protection').checked;
  settings.thresholds.block = parseFloat(document.getElementById('block-threshold').value);
  settings.thresholds.warn = parseFloat(document.getElementById('warn-threshold').value);
  settings.thresholds.popularDomain = parseFloat(document.getElementById('popular-threshold').value);
  settings.cache.enabled = document.getElementById('cache-enabled').checked;
  
  // Validate thresholds
  if (settings.thresholds.warn >= settings.thresholds.block) {
    showMessage('Warning threshold must be lower than block threshold', 'error');
    return;
  }
  
  // Save to storage
  await chrome.storage.local.set({ settings });
  
  // Notify background script
  chrome.runtime.sendMessage({
    action: 'settingsUpdated',
    settings
  }).catch(() => {});
  
  showMessage('Settings saved successfully', 'success');
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
    await store.resetStats();
    state = await store.getState();
    updateUI();
    showMessage('Statistics reset successfully', 'success');
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  decisionCache.clear();
  showMessage('Cache cleared successfully', 'success');
}

/**
 * Show status message
 */
function showMessage(message, type = 'success') {
  const statusElement = document.getElementById('save-status');
  statusElement.textContent = message;
  statusElement.className = `save-status ${type}`;
  statusElement.style.display = 'block';
  
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Threshold sliders
  ['block', 'warn', 'popular'].forEach(type => {
    const slider = document.getElementById(`${type}-threshold`);
    const display = document.getElementById(`${type}-value`);
    
    slider.addEventListener('input', (e) => {
      display.textContent = parseFloat(e.target.value).toFixed(2);
    });
  });
  
  // Whitelist
  document.getElementById('add-whitelist-btn').addEventListener('click', async () => {
    const input = document.getElementById('whitelist-input');
    await addDomain(input.value);
  });
  
  document.getElementById('whitelist-input').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      await addDomain(e.target.value);
    }
  });
  
  // Statistics
  document.getElementById('reset-stats-btn').addEventListener('click', resetStats);
  
  // Cache
  document.getElementById('clear-cache-btn').addEventListener('click', clearCache);
  
  // Save settings
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  
  // External links
  document.getElementById('github-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block' });
  });
  
  document.getElementById('docs-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block#readme' });
  });
  
  document.getElementById('report-issue-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/ganeshmshetty/phish-block/issues/new' });
  });
}
