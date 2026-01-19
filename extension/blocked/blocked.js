/**
 * PhishBlock - Blocked Page Script
 */

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get('url') || 'Unknown URL';
const confidence = parseFloat(params.get('confidence')) || 0;
const riskLevel = params.get('risk') || 'high';
const domain = params.get('domain') || 'Unknown';

// Update page with blocked URL details
document.getElementById('blocked-url').textContent = blockedUrl;
document.getElementById('confidence').textContent = `${Math.round(confidence * 100)}%`;
document.getElementById('domain').textContent = domain;

// Set risk level with appropriate styling
const riskEl = document.getElementById('risk-level');
riskEl.textContent = riskLevel.toUpperCase();
riskEl.classList.add(riskLevel);

// Go home button
document.getElementById('go-home').addEventListener('click', () => {
  window.location.href = 'https://www.google.com';
});

// Explain button
document.getElementById('explain-btn').addEventListener('click', async () => {
  const btn = document.getElementById('explain-btn');
  const reasoningSection = document.getElementById('reasoning-section');
  const reasoningText = document.getElementById('reasoning-text');

  if (reasoningSection.classList.contains('show')) {
    reasoningSection.classList.remove('show');
    btn.textContent = 'Explain Why This Was Blocked';
    return;
  }

  btn.textContent = 'Loading...';
  btn.disabled = true;
  reasoningSection.classList.add('show');
  reasoningText.textContent = 'Analyzing...';

  try {
    const result = await chrome.runtime.sendMessage({
      action: 'explainUrl',
      url: blockedUrl
    });

    if (result && !result.error) {
      reasoningText.textContent = result.reasoning;
      btn.textContent = 'Hide Explanation';
    } else {
      reasoningText.textContent = 'Could not generate explanation: ' + (result?.error || 'Unknown error');
      btn.textContent = 'Explain Why This Was Blocked';
    }
  } catch (error) {
    console.error('Explain error:', error);
    reasoningText.textContent = 'Error loading explanation';
    btn.textContent = 'Explain Why This Was Blocked';
  } finally {
    btn.disabled = false;
  }
});

// Advanced options toggle
document.getElementById('advanced-toggle').addEventListener('click', () => {
  const content = document.getElementById('advanced-content');
  const toggle = document.getElementById('advanced-toggle');

  if (content.classList.contains('show')) {
    content.classList.remove('show');
    toggle.textContent = 'Advanced Options';
  } else {
    content.classList.add('show');
    toggle.textContent = 'Hide Options';
  }
});

// Proceed anyway (dangerous!)
document.getElementById('proceed-anyway').addEventListener('click', async () => {
  const confirmed = confirm(
    'WARNING: This is a suspected phishing site!\n\n' +
    '• May steal your passwords and personal information\n' +
    '• May install malware on your device\n' +
    '• Do NOT enter any sensitive information\n\n' +
    'Proceed at your own risk?'
  );

  if (confirmed) {
    try {
      // Tell background to temporarily allow this URL
      await chrome.runtime.sendMessage({
        action: 'temporarilyAllow',
        url: blockedUrl
      });

      // Navigate using chrome.tabs API
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.update(tab.id, { url: blockedUrl });
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = blockedUrl;
    }
  }
});

// Add to whitelist - no confirmation needed, button label is clear
document.getElementById('whitelist-domain').addEventListener('click', async () => {
  try {
    // Send message to background script to add to whitelist
    await chrome.runtime.sendMessage({
      action: 'addToWhitelist',
      domain: domain
    });

    // Navigate using chrome.tabs API
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(tab.id, { url: blockedUrl });
  } catch (error) {
    console.error('Whitelist error:', error);
  }
});

// Report false positive - just open a simple thank you message in the reasoning section
document.getElementById('report-false-positive').addEventListener('click', () => {
  const reasoningSection = document.getElementById('reasoning-section');
  const reasoningText = document.getElementById('reasoning-text');
  const btn = document.getElementById('explain-btn');

  reasoningSection.classList.add('show');
  reasoningText.textContent = 'Thank you for your feedback! To report a false positive, please note the URL and domain shown above. Your feedback helps improve PhishBlock detection.';
  btn.textContent = 'Hide Message';
});

// ===========================================
// SANDBOX VIEWER
// ===========================================

const sandboxModal = document.getElementById('sandbox-modal');
const sandboxIframe = document.getElementById('sandbox-iframe');
const sandboxContent = document.querySelector('.sandbox-content');

// Open sandbox viewer
document.getElementById('view-sandbox').addEventListener('click', () => {
  const confirmed = confirm(
    'SANDBOX MODE\n\n' +
    'The page will be loaded with the following restrictions:\n' +
    '• Forms CANNOT be submitted\n' +
    '• Navigation outside iframe is BLOCKED\n' +
    '• Pop-ups and downloads are BLOCKED\n' +
    '• JavaScript IS allowed (read-only)\n\n' +
    'Do NOT enter any sensitive information!\n\n' +
    'Continue?'
  );

  if (confirmed) {
    // Show modal
    sandboxModal.classList.add('show');
    sandboxContent.classList.add('loading');

    // Load the blocked URL in sandboxed iframe
    // The sandbox attribute restricts: scripts, forms, popups, top navigation
    sandboxIframe.src = blockedUrl;

    // Remove loading state when iframe loads
    sandboxIframe.onload = () => {
      sandboxContent.classList.remove('loading');
    };

    sandboxIframe.onerror = () => {
      sandboxContent.classList.remove('loading');
    };

    // Re-initialize feather icons in the modal
    if (typeof initFeatherIcons === 'function') {
      setTimeout(initFeatherIcons, 100);
    }
  }
});

// Close sandbox viewer
document.getElementById('sandbox-close').addEventListener('click', () => {
  sandboxModal.classList.remove('show');
  sandboxIframe.src = 'about:blank'; // Clear iframe
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sandboxModal.classList.contains('show')) {
    sandboxModal.classList.remove('show');
    sandboxIframe.src = 'about:blank';
  }
});

// Log blocked page view
console.log('[PhishBlock] Blocked page loaded:', {
  url: blockedUrl,
  domain: domain,
  confidence: confidence,
  riskLevel: riskLevel
});
