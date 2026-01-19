/**
 * PhishBlock Dashboard - Full Page Management Interface
 */

// State
let settings = {};
let stats = {};

// Toast notification helper
function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#e11d48' : '#64748b'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadStats();
    await loadModelInfo();
    await loadWhitelist();
    await loadRecentActivity();
    setupNavigation();
    setupEventListeners();

    // Auto-refresh stats every 3 seconds
    setInterval(async () => {
        await loadStats();
    }, 3000);

    // Refresh when history changes (immediate update on block)
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.blockedHistory) {
            loadStats();
            loadRecentActivity();
        }
    });
});

// Load data
async function loadSettings() {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    settings = response;

    document.getElementById('main-toggle').checked = settings.enabled;
    document.getElementById('auto-block').checked = settings.autoBlock;
    document.getElementById('strict-mode').checked = settings.strictMode;
    document.getElementById('dev-mode').checked = settings.devMode;
}

async function loadStats() {
    stats = await chrome.runtime.sendMessage({ action: 'getStats' });

    document.getElementById('total-analyzed').textContent = stats.totalAnalyzed || 0;
    document.getElementById('threats-blocked').textContent = stats.phishingBlocked || 0;
    document.getElementById('warnings-shown').textContent = stats.warningsShown || 0;
    document.getElementById('cache-size').textContent = stats.cacheSize || 0;
}

async function loadModelInfo() {
    try {
        const apiUrlResponse = await chrome.runtime.sendMessage({ action: 'getApiUrl' });
        if (apiUrlResponse && apiUrlResponse.url) {
            document.getElementById('model-endpoint').textContent = apiUrlResponse.url;
        }

        const result = await chrome.runtime.sendMessage({ action: 'testApi' });
        if (result.success && result.data) {
            document.getElementById('model-version').textContent = result.data.model_version || 'v1.0.0';
            document.getElementById('model-status').textContent = result.data.status === 'healthy' ? 'Connected' : 'Unhealthy';
            document.getElementById('model-status').className = result.data.status === 'healthy' ? 'status-safe' : 'status-danger';
        } else {
            document.getElementById('model-version').textContent = '-';
            document.getElementById('model-status').textContent = 'Offline (' + (result.error || 'No response') + ')';
            document.getElementById('model-status').className = 'status-danger';
        }
    } catch (err) {
        document.getElementById('model-version').textContent = '-';
        document.getElementById('model-status').textContent = 'Error: ' + err.message;
        document.getElementById('model-status').className = 'status-danger';
    }
}

async function loadRecentActivity() {
    const history = await chrome.runtime.sendMessage({ action: 'getHistory' });
    const container = document.getElementById('recent-activity');

    if (!history || history.length === 0) {
        container.innerHTML = '<div class="activity-empty">No recent activity</div>';
        return;
    }

    container.innerHTML = history.slice(0, 5).map(item => `
    <div class="activity-item">
      <div class="activity-icon ${item.riskLevel}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="activity-info">
        <div class="activity-domain">${item.domain || item.url}</div>
        <div class="activity-meta">${item.riskLevel.toUpperCase()} - ${formatTimeAgo(item.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return new Date(timestamp).toLocaleDateString();
}

async function loadWhitelist() {
    const tbody = document.getElementById('whitelist-table-body');

    if (!settings.whitelist || settings.whitelist.length === 0) {
        tbody.innerHTML = '<div class="table-empty">No whitelisted domains yet</div>';
        return;
    }

    tbody.innerHTML = settings.whitelist.map(domain => `
    <div class="table-row">
      <div class="table-col">${domain}</div>
      <div class="table-col">${new Date().toLocaleDateString()}</div>
      <div class="table-col">
        <button class="remove-btn" data-domain="${domain}">Remove</button>
      </div>
    </div>
  `).join('');

    tbody.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromWhitelist(btn.dataset.domain));
    });
}

async function loadHistory() {
    const history = await chrome.runtime.sendMessage({ action: 'getHistory' });
    const tbody = document.getElementById('history-table-body');

    if (!history || history.length === 0) {
        tbody.innerHTML = '<div class="table-empty">No blocked sites in history</div>';
        return;
    }

    tbody.innerHTML = history.slice(0, 50).map(item => `
    <div class="table-row">
      <div class="table-col">${item.url}</div>
      <div class="table-col">
        <span class="risk-badge ${item.riskLevel}">${item.riskLevel.toUpperCase()}</span>
      </div>
      <div class="table-col">${Math.round(item.confidence * 100)}%</div>
      <div class="table-col">${new Date(item.timestamp).toLocaleDateString()}</div>
    </div>
  `).join('');
}

// Navigation
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');

            if (tabId === 'history') {
                loadHistory();
            }
        });
    });
}

// Event handlers
function setupEventListeners() {
    // Main toggle
    document.getElementById('main-toggle').addEventListener('change', async (e) => {
        await updateSetting('enabled', e.target.checked);
    });

    // Protection settings
    document.getElementById('auto-block').addEventListener('change', async (e) => {
        await updateSetting('autoBlock', e.target.checked);
    });

    document.getElementById('strict-mode').addEventListener('change', async (e) => {
        await updateSetting('strictMode', e.target.checked);
    });

    document.getElementById('dev-mode').addEventListener('change', async (e) => {
        await updateSetting('devMode', e.target.checked);
        await loadModelInfo(); // Refresh endpoint display
    });

    // Whitelist
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
        loadWhitelist();
    });

    // History
    document.getElementById('clear-history').addEventListener('click', async () => {
        if (confirm('Clear all blocked sites history?')) {
            await chrome.runtime.sendMessage({ action: 'clearHistory' });
            loadHistory();
            loadRecentActivity();
        }
    });

    // Data management
    document.getElementById('clear-cache').addEventListener('click', async () => {
        if (confirm('Clear all cached results?')) {
            await chrome.runtime.sendMessage({ action: 'clearCache' });
            showToast('Cache cleared');
            loadStats();
        }
    });

    document.getElementById('export-data').addEventListener('click', () => {
        const data = {
            settings: settings,
            stats: stats,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phishblock-data-${Date.now()}.json`;
        a.click();
    });

    document.getElementById('reset-settings').addEventListener('click', async () => {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
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
    if (confirm(`Remove "${domain}" from whitelist?`)) {
        await chrome.runtime.sendMessage({
            action: 'removeFromWhitelist',
            domain: domain
        });

        settings.whitelist = settings.whitelist.filter(d => d !== domain);
        loadWhitelist();
    }
}
