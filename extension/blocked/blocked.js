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

// Go back button
document.getElementById('go-back').addEventListener('click', () => {
  if (window.history.length > 1) {
    window.history.go(-2); // Go back past the blocked URL
  } else {
    window.location.href = 'https://www.google.com';
  }
});

// Go home button
document.getElementById('go-home').addEventListener('click', () => {
  window.location.href = 'https://www.google.com';
});

// Advanced options toggle
document.getElementById('advanced-toggle').addEventListener('click', () => {
  const content = document.getElementById('advanced-content');
  const toggle = document.getElementById('advanced-toggle');
  
  if (content.classList.contains('show')) {
    content.classList.remove('show');
    toggle.textContent = 'Advanced Options ▼';
  } else {
    content.classList.add('show');
    toggle.textContent = 'Advanced Options ▲';
  }
});

// Proceed anyway (dangerous!)
document.getElementById('proceed-anyway').addEventListener('click', () => {
  const confirmed = confirm(
    '⚠️ WARNING: You are about to visit a suspected phishing site.\n\n' +
    'This site may:\n' +
    '• Steal your passwords and personal information\n' +
    '• Install malware on your device\n' +
    '• Impersonate legitimate services\n\n' +
    'Are you absolutely sure you want to proceed?'
  );
  
  if (confirmed) {
    const doubleConfirmed = confirm(
      '🚨 FINAL WARNING 🚨\n\n' +
      'You are taking full responsibility for any consequences.\n\n' +
      'Do NOT enter any passwords, credit card numbers, or personal information on this site.\n\n' +
      'Proceed at your own risk?'
    );
    
    if (doubleConfirmed) {
      window.location.href = blockedUrl;
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
      await chrome.runtime.sendMessage({
        action: 'addToWhitelist',
        domain: domain
      });
      
      alert(`${domain} has been added to your whitelist.\n\nYou can now visit this site.`);
      window.location.href = blockedUrl;
    } catch (error) {
      alert('Failed to add to whitelist. Please try again.');
    }
  }
});

// Report false positive
document.getElementById('report-false-positive').addEventListener('click', () => {
  const subject = encodeURIComponent(`PhishBlock False Positive Report: ${domain}`);
  const body = encodeURIComponent(
    `URL: ${blockedUrl}\n` +
    `Domain: ${domain}\n` +
    `Confidence: ${Math.round(confidence * 100)}%\n` +
    `Risk Level: ${riskLevel}\n` +
    `Date: ${new Date().toISOString()}\n\n` +
    `Additional comments:\n`
  );
  
  // Open email client or show info
  alert(
    'To report a false positive:\n\n' +
    '1. Take a screenshot of this page\n' +
    '2. Note the URL and domain\n' +
    '3. Submit a report to help improve our detection\n\n' +
    'Your feedback helps make PhishBlock better for everyone!'
  );
});

// Learn more link
document.getElementById('learn-more').addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://github.com/ganeshmshetty/phish-block', '_blank');
});

// Log blocked page view
console.log('[PhishBlock] Blocked page loaded:', {
  url: blockedUrl,
  domain: domain,
  confidence: confidence,
  riskLevel: riskLevel
});
