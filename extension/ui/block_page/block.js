/**
 * Block Page Script
 */

let blockedURL = null;
let probability = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadBlockInfo();
  setupEventListeners();
});

/**
 * Load blocked URL information from URL parameters
 */
function loadBlockInfo() {
  const params = new URLSearchParams(window.location.search);
  
  blockedURL = decodeURIComponent(params.get('url') || '');
  probability = parseFloat(params.get('probability') || '0');
  const reason = params.get('reason') || 'ml_prediction';
  
  // Display URL (sanitized)
  if (blockedURL) {
    const urlElement = document.getElementById('blocked-url');
    urlElement.textContent = sanitizeURL(blockedURL);
    urlElement.title = blockedURL;
  }
  
  // Update risk meter
  updateRiskMeter(probability);
  
  // Update reasons based on detection
  if (reason) {
    updateReasons(reason);
  }
}

/**
 * Sanitize URL for display
 */
function sanitizeURL(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url.substring(0, 100);
  }
}

/**
 * Update risk meter visualization
 */
function updateRiskMeter(prob) {
  const riskFill = document.getElementById('risk-fill');
  const riskValue = document.getElementById('risk-value');
  
  const percentage = Math.round(prob * 100);
  
  riskFill.style.width = `${percentage}%`;
  
  // Color coding
  if (percentage >= 80) {
    riskFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    riskValue.textContent = `Critical (${percentage}%)`;
  } else if (percentage >= 60) {
    riskFill.style.background = 'linear-gradient(90deg, #e67e22, #d35400)';
    riskValue.textContent = `High (${percentage}%)`;
  } else {
    riskFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
    riskValue.textContent = `Elevated (${percentage}%)`;
  }
}

/**
 * Update block reasons
 */
function updateReasons(reason) {
  const reasonsList = document.getElementById('reasons');
  
  // Default reasons
  const reasons = {
    ml_prediction: [
      'Machine learning model detected phishing patterns',
      'Suspicious domain characteristics',
      'URL structure matches known phishing techniques'
    ],
    ip_address: [
      'Using IP address instead of domain name',
      'Common tactic to evade domain blacklists',
      'Legitimate sites rarely use IP addresses'
    ],
    suspicious_keywords: [
      'URL contains deceptive keywords (login, verify, etc.)',
      'Attempting to impersonate legitimate services',
      'Common social engineering tactic'
    ],
    popular_domain_check: [
      'High confidence ML detection',
      'Multiple phishing indicators detected',
      'Flagged despite domain popularity'
    ]
  };
  
  const reasonText = reasons[reason] || reasons.ml_prediction;
  
  reasonsList.innerHTML = reasonText
    .map(text => `<li>${text}</li>`)
    .join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Go back button
  document.getElementById('go-back-btn').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'about:blank';
    }
  });
  
  // Whitelist button
  document.getElementById('whitelist-btn').addEventListener('click', async () => {
    if (!blockedURL) return;
    
    const confirmed = confirm(
      'Are you sure you want to trust this site?\n\n' +
      'This will allow future visits without warnings.\n\n' +
      'Only do this if you are absolutely certain this site is safe.'
    );
    
    if (confirmed) {
      try {
        await chrome.runtime.sendMessage({
          action: 'addToWhitelist',
          url: blockedURL
        });
        
        // Redirect to the site
        window.location.href = blockedURL;
      } catch (error) {
        alert('Failed to whitelist site. Please try again.');
      }
    }
  });
  
  // Continue anyway button
  document.getElementById('continue-btn').addEventListener('click', () => {
    const confirmed = confirm(
      '⚠️ FINAL WARNING ⚠️\n\n' +
      'You are about to visit a site that may steal your information.\n\n' +
      'Do NOT enter:\n' +
      '• Passwords\n' +
      '• Credit card numbers\n' +
      '• Social security numbers\n' +
      '• Personal information\n\n' +
      'Continue at your own risk?'
    );
    
    if (confirmed) {
      // Record that user bypassed warning
      chrome.runtime.sendMessage({
        action: 'recordBypass',
        url: blockedURL
      }).catch(() => {});
      
      // Redirect
      window.location.href = blockedURL;
    }
  });
  
  // Report button
  document.getElementById('report-btn').addEventListener('click', () => {
    const issueURL = 'https://github.com/ganeshmshetty/phish-block/issues/new' +
      '?title=False+Positive+Report' +
      '&body=' + encodeURIComponent(
        `**Blocked URL:** ${blockedURL}\n\n` +
        `**Risk Score:** ${Math.round(probability * 100)}%\n\n` +
        `**Why is this a false positive?**\n(Please explain why you believe this site is safe)\n\n`
      );
    
    chrome.tabs.create({ url: issueURL });
  });
}
