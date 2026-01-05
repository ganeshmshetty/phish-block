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
    const response = await fetch('http://localhost:8000/predict/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: blockedUrl })
    });

    if (response.ok) {
      const result = await response.json();
      reasoningText.textContent = result.reasoning;
      btn.textContent = 'Hide Explanation';
    } else {
      reasoningText.textContent = 'Could not generate explanation';
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
document.getElementById('proceed-anyway').addEventListener('click', () => {
  const confirmed = confirm(
    'WARNING: You are about to visit a suspected phishing site.\n\n' +
    'This site may:\n' +
    '• Steal your passwords and personal information\n' +
    '• Install malware on your device\n' +
    '• Impersonating legitimate services\n\n' +
    'Are you absolutely sure you want to proceed?'
  );

  if (confirmed) {
    const doubleConfirmed = confirm(
      'FINAL WARNING\n\n' +
      'You are taking full responsibility for any consequences.\n\n' +
      'Do NOT enter any passwords, credit card numbers, or personal information on this site.\n\n' +
      'Proceed at your own risk?'
    );

    if (doubleConfirmed) {
      // Navigate to the blocked URL
      window.location.replace(blockedUrl);
    }
  }
});

// Add to whitelist
document.getElementById('whitelist-domain').addEventListener('click', async () => {
  const confirmed = confirm(
    `Add "${domain}" to your whitelist?\n\n` +
    'This will prevent PhishBlock from blocking this domain in the future.\n' +
    'Only do this if you are certain this is a legitimate website.'
  );

  if (confirmed) {
    try {
      // Send message to background script to add to whitelist
      await chrome.runtime.sendMessage({
        action: 'addToWhitelist',
        domain: domain
      });

      alert(`${domain} has been added to your whitelist.\n\nYou can now visit this site.`);
      // Navigate to the URL after whitelisting
      window.location.replace(blockedUrl);
    } catch (error) {
      console.error('Whitelist error:', error);
      alert('Failed to add to whitelist. Please try again.');
    }
  }
});

// Report false positive
document.getElementById('report-false-positive').addEventListener('click', () => {
  alert(
    'To report a false positive:\n\n' +
    '1. Take a screenshot of this page\n' +
    '2. Note the URL and domain\n' +
    '3. Submit a report to help improve detection\n\n' +
    'Your feedback helps make PhishBlock better!'
  );
});

// Log blocked page view
console.log('[PhishBlock] Blocked page loaded:', {
  url: blockedUrl,
  domain: domain,
  confidence: confidence,
  riskLevel: riskLevel
});
