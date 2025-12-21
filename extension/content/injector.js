/**
 * Content Script Injector
 * Injects warning UI into pages
 */

// Listen for warning messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showWarning') {
    showWarningBanner(request.decision);
    sendResponse({ success: true });
  }
});

/**
 * Show warning banner at top of page
 */
function showWarningBanner(decision) {
  // Remove existing warning if present
  const existing = document.getElementById('phish-block-warning');
  if (existing) {
    existing.remove();
  }
  
  // Create warning banner
  const banner = document.createElement('div');
  banner.id = 'phish-block-warning';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: white;
    padding: 15px 20px;
    z-index: 2147483647;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideDown 0.3s ease-out;
  `;
  
  const probability = Math.round(decision.probability * 100);
  
  banner.innerHTML = `
    <style>
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      #phish-block-warning button {
        background: white;
        color: #e67e22;
        border: none;
        padding: 8px 16px;
        margin: 0 5px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
      }
      #phish-block-warning button:hover {
        background: #f0f0f0;
      }
    </style>
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">⚠️</span>
        <div>
          <strong>Suspicious Website Detected</strong>
          <div style="font-size: 13px; opacity: 0.9; margin-top: 3px;">
            This site shows phishing patterns (${probability}% confidence). Proceed with caution.
          </div>
        </div>
      </div>
      <div>
        <button id="phish-block-dismiss">Dismiss</button>
        <button id="phish-block-more-info">More Info</button>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Add event listeners
  document.getElementById('phish-block-dismiss')?.addEventListener('click', () => {
    banner.remove();
  });
  
  document.getElementById('phish-block-more-info')?.addEventListener('click', () => {
    // Open popup or details page
    chrome.runtime.sendMessage({ action: 'openDetails' });
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.animation = 'slideDown 0.3s ease-in reverse';
      setTimeout(() => banner.remove(), 300);
    }
  }, 10000);
}

console.log('🔵 Phish-Block content script loaded');
