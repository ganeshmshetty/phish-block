/**
 * Settings Page Script
 */

// State
let settings = null;
let whitelist = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
  updateUI();
});

/**
 * Load settings from background script
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
    
    settings = {
      enabled: response.enabled,
      thresholds: response.thresholds,
      stats: stats
    };
    
    whitelist = response.whitelist || [];
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Fallback defaults
    settings = {
      enabled: true,
      thresholds: {
        blockThreshold: 0.70,
        warnThreshold: 0.50,
        profile: 'balanced'
      },
      stats: { hits: 0, misses: 0 }
    };
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });
  
  // Protection Toggle
  const toggle = document.getElementById('enable-protection');
  toggle.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({ 
      action: 'updateSettings',
      settings: { enabled: toggle.checked }
    });
  });
  
  // Profile Selection
  document.querySelectorAll('.profile-option').forEach(option => {
    option.addEventListener('click', async () => {
      const profile = option.dataset.profile;
      await chrome.runtime.sendMessage({
        action: 'setThresholdProfile',
        profile
      });
      
      // Update UI
      document.querySelectorAll('.profile-option').forEach(opt => 
        opt.classList.remove('active'));
      option.classList.add('active');
      
      // Reload settings to get new threshold values
      await loadSettings();
      updateUI();
    });
  });
  
  // Sliders
  const blockSlider = document.getElementById('block-threshold-slider');
  const warnSlider = document.getElementById('warn-threshold-slider');
  
  [blockSlider, warnSlider].forEach(slider => {
    slider.addEventListener('change', async () => {
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: {
          thresholds: {
            block: parseFloat(blockSlider.value) / 100,
            warn: parseFloat(warnSlider.value) / 100,
            popularDomain: 0.90 // Keep default
          }
        }
      });
      updateUI();
    });
    
    slider.addEventListener('input', () => {
      document.getElementById('block-threshold-value').textContent = 
        (parseFloat(blockSlider.value) / 100).toFixed(2);
      document.getElementById('warn-threshold-value').textContent = 
        (parseFloat(warnSlider.value) / 100).toFixed(2);
    });
  });
  
  // Whitelist
  document.getElementById('add-domain-btn').addEventListener('click', addDomain);
  document.getElementById('new-domain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addDomain();
  });
  
  // Stats Actions
  document.getElementById('reset-stats-btn').addEventListener('click', async () => {
    if (confirm('Reset all statistics?')) {
      await chrome.runtime.sendMessage({ action: 'resetStats' });
      location.reload();
    }
  });
  
  document.getElementById('clear-cache-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clearCache' });
    alert('Cache cleared!');
    location.reload();
  });
}

/**
 * Switch active tab
 */
function switchTab(tabId) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

/**
 * Update UI elements with current settings
 */
function updateUI() {
  if (!settings) return;
  
  // General
  document.getElementById('enable-protection').checked = settings.enabled;
  
  // Stats
  // Note: We need to fetch stats from StateStore for total scans/blocks
  // The stats object here is from DecisionEngine (cache stats)
  // For now, we'll use placeholders or fetch full state if needed
  
  if (settings.stats) {
    const total = settings.stats.hits + settings.stats.misses;
    const hitRate = total > 0 ? Math.round((settings.stats.hits / total) * 100) : 0;
    document.getElementById('cache-hit-rate').textContent = `${hitRate}%`;
  }
  
  // Thresholds
  const blockVal = Math.round(settings.thresholds.blockThreshold * 100);
  const warnVal = Math.round(settings.thresholds.warnThreshold * 100);
  
  document.getElementById('block-threshold-slider').value = blockVal;
  document.getElementById('block-threshold-value').textContent = (blockVal / 100).toFixed(2);
  
  document.getElementById('warn-threshold-slider').value = warnVal;
  document.getElementById('warn-threshold-value').textContent = (warnVal / 100).toFixed(2);
  
  // Profile
  const profile = settings.thresholds.profile || 'balanced';
  document.querySelectorAll('.profile-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.profile === profile);
  });
  
  // Whitelist
  renderWhitelist();
}

/**
 * Render whitelist items
 */
function renderWhitelist() {
  const list = document.getElementById('whitelist-list');
  const empty = document.getElementById('empty-whitelist');
  
  list.innerHTML = '';
  
  if (whitelist.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  
  whitelist.sort().forEach(domain => {
    const li = document.createElement('li');
    li.className = 'whitelist-item';
    li.innerHTML = `
      <span class="domain">${domain}</span>
      <button class="delete-btn" title="Remove">×</button>
    `;
    
    li.querySelector('.delete-btn').addEventListener('click', async () => {
      await chrome.runtime.sendMessage({
        action: 'removeFromWhitelist',
        url: domain
      });
      whitelist = whitelist.filter(d => d !== domain);
      renderWhitelist();
    });
    
    list.appendChild(li);
  });
}

/**
 * Add new domain to whitelist
 */
async function addDomain() {
  const input = document.getElementById('new-domain');
  const domain = input.value.trim();
  
  if (!domain) return;
  
  await chrome.runtime.sendMessage({
    action: 'addToWhitelist',
    url: domain
  });
  
  whitelist.push(domain); // Optimistic update
  renderWhitelist();
  input.value = '';
}

