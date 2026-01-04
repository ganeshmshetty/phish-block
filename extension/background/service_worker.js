/**
 * Service Worker - Main Background Script
 * Handles extension lifecycle, navigation monitoring, and decision processing
 */

import { ModelLoader } from '../core/inference/model_loader.js';
import { Predictor } from '../core/inference/predictor.js';
import { FeatureExtractor } from '../core/features/index.js';
import { DecisionEngine } from '../core/decision/engine.js';
import { StateStore } from '../core/state/store.js';

// Global instances
let modelLoader;
let predictor;
let featureExtractor;
let decisionEngine;
let stateStore;
let isReady = false;

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🚀 Phish-Block initializing...');
  
  try {
    await initialize();
    
    if (details.reason === 'install') {
      console.log('📦 First time installation');
      // Open welcome page
      chrome.tabs.create({ url: 'ui/settings/settings.html' });
    } else if (details.reason === 'update') {
      console.log(`🔄 Updated to version ${chrome.runtime.getManifest().version}`);
    }
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
});

/**
 * Initialize core components
 */
async function initialize() {
  if (isReady) return;
  
  console.log('⚙️ Initializing components...');
  
  // Initialize state store
  stateStore = new StateStore();
  await stateStore.load();
  
  // Initialize feature extractor
  featureExtractor = FeatureExtractor;
  
  // Initialize model
  modelLoader = new ModelLoader();
  await modelLoader.load();
  
  // Initialize predictor
  predictor = new Predictor(modelLoader);
  
  // Initialize decision engine
  decisionEngine = new DecisionEngine(featureExtractor, predictor);
  await decisionEngine.init();
  
  isReady = true;
  console.log('✅ Phish-Block ready!');
  console.log(modelLoader.getInfo());
}

/**
 * Handle navigation events
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only process main frame navigations
  if (details.frameId !== 0) return;
  
  // Ensure initialized
  if (!isReady) {
    await initialize();
  }
  
  // Check if extension is enabled
  const state = stateStore.get();
  if (!state.enabled) {
    return;
  }
  
  const url = details.url;
  
  // Skip chrome:// and extension:// URLs
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return;
  }
  
  try {
    // Make decision
    const decision = await decisionEngine.decide(url);
    
    // Record statistics
    await stateStore.recordDecision(decision);
    
    // Update current tab status
    await stateStore.updateCurrentTab({
      url,
      status: decision.level,
      decision
    });
    
    // Update icon based on decision
    updateIcon(details.tabId, decision);
    
    // Handle blocking
    if (decision.action === 'BLOCK') {
      await blockURL(details.tabId, url, decision);
    } else if (decision.action === 'WARN') {
      await warnURL(details.tabId, url, decision);
    }
    
  } catch (error) {
    console.error('Navigation check error:', error);
  }
});

/**
 * Update extension icon based on decision
 */
function updateIcon(tabId, decision) {
  const icons = {
    SAFE: {
      path: 'assets/icons/icon-green.png',
      badgeText: '',
      badgeColor: '#2ecc71'
    },
    SUSPICIOUS: {
      path: 'assets/icons/icon-yellow.png',
      badgeText: '!',
      badgeColor: '#f39c12'
    },
    PHISHING: {
      path: 'assets/icons/icon-red.png',
      badgeText: '✕',
      badgeColor: '#e74c3c'
    },
    UNKNOWN: {
      path: 'assets/icons/icon-grey.png',
      badgeText: '',
      badgeColor: '#95a5a6'
    }
  };
  
  const icon = icons[decision.level] || icons.UNKNOWN;
  
  chrome.action.setIcon({
    tabId,
    path: icon.path
  }).catch(() => {
    // Fallback if icons don't exist yet
  });
  
  chrome.action.setBadgeText({
    tabId,
    text: icon.badgeText
  });
  
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: icon.badgeColor
  });
}

/**
 * Block a phishing URL
 */
async function blockURL(tabId, url, decision) {
  const blockPageURL = chrome.runtime.getURL('ui/block_page/block.html');
  const params = new URLSearchParams({
    url: encodeURIComponent(url),
    probability: decision.probability,
    reason: decision.reason
  });
  
  chrome.tabs.update(tabId, {
    url: `${blockPageURL}?${params.toString()}`
  });
}

/**
 * Warn about suspicious URL
 */
async function warnURL(tabId, url, decision) {
  // Inject warning banner via content script
  chrome.tabs.sendMessage(tabId, {
    action: 'showWarning',
    decision
  }).catch(() => {
    // Content script might not be ready
  });
}

/**
 * Handle messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Async response
});

/**
 * Process messages
 */
async function handleMessage(request, sender) {
  if (!isReady) {
    await initialize();
  }
  
  switch (request.action) {
    case 'checkURL':
      return await decisionEngine.decide(request.url);
    
    case 'getState':
      return stateStore.get();
    
    case 'toggleEnabled':
      const enabled = await stateStore.toggleEnabled();
      return { enabled };
    
    case 'addToWhitelist':
      await decisionEngine.whitelist.add(request.url);
      return { success: true };
    
    case 'removeFromWhitelist':
      await decisionEngine.whitelist.remove(request.url);
      return { success: true };
    
    case 'getWhitelist':
      return { whitelist: decisionEngine.whitelist.getAll() };
    
    case 'setThresholdProfile':
      await decisionEngine.thresholds.setProfile(request.profile);
      return { success: true };
    
    case 'getStats':
      return decisionEngine.getStats();
    
    case 'getSettings':
      return {
        enabled: stateStore.get().enabled,
        thresholds: decisionEngine.thresholds.config,
        whitelist: Array.from(decisionEngine.whitelist.domains)
      };
    
    case 'resetStats':
      await stateStore.resetStats();
      return { success: true };
    
    case 'clearCache':
      decisionEngine.reset();
      return { success: true };

    case 'updateSettings':
      const { settings } = request;
      if (settings.enabled !== undefined) {
        await stateStore.update({ enabled: settings.enabled });
      }
      if (settings.thresholds) {
        await decisionEngine.thresholds.setCustom(
          settings.thresholds.block,
          settings.thresholds.warn
        );
        // Manually update popular domain threshold
        decisionEngine.thresholds.config.popularDomainThreshold = settings.thresholds.popularDomain;
        await decisionEngine.thresholds.save();
      }
      return { success: true };
    
    default:
      return { error: 'Unknown action' };
  }
}

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Ensure initialized
    if (!isReady || !stateStore) {
      return;
    }
    
    // Update current tab info for popup
    const state = stateStore.get();
    if (state.currentTab.url === tab.url) {
      // Tab matches current tracked URL
      updateIcon(tabId, state.currentTab.decision);
    }
  }
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Ensure initialized
  if (!isReady || !stateStore) {
    return;
  }
  
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url && isReady) {
    const state = stateStore.get();
    if (state.enabled) {
      // Check current URL
      const decision = await decisionEngine.decide(tab.url);
      await stateStore.updateCurrentTab({
        url: tab.url,
        status: decision.level,
        decision
      });
      updateIcon(activeInfo.tabId, decision);
    }
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('🌅 Browser started');
  initialize();
});

console.log('🔵 Service worker loaded');
