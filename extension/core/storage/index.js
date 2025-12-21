/**
 * Storage Layer - Main Export
 * 
 * Central access point for all storage operations
 */

export { settingsStorage } from './settings.js';
export { statsStorage } from './stats.js';

/**
 * Initialize storage on extension install
 */
export async function initializeStorage() {
  // Check if this is first install
  const result = await chrome.storage.local.get(['settings', 'stats', 'initialized']);
  
  if (!result.initialized) {
    // First install - set defaults
    const { settingsStorage } = await import('./settings.js');
    const { statsStorage } = await import('./stats.js');
    
    await settingsStorage.save(settingsStorage.getDefaults());
    await statsStorage.save(statsStorage.getDefaults());
    
    await chrome.storage.local.set({ initialized: true, installDate: Date.now() });
    
    console.log('[Storage] Initialized with defaults');
  }
  
  return true;
}

/**
 * Clear all stored data (for debugging/uninstall)
 */
export async function clearAllStorage() {
  await chrome.storage.local.clear();
  console.log('[Storage] All data cleared');
}

/**
 * Export all data (for backup)
 */
export async function exportData() {
  const data = await chrome.storage.local.get(null);
  return JSON.stringify(data, null, 2);
}

/**
 * Import data (for restore)
 */
export async function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    await chrome.storage.local.clear();
    await chrome.storage.local.set(data);
    console.log('[Storage] Data imported successfully');
    return true;
  } catch (error) {
    console.error('[Storage] Import failed:', error);
    return false;
  }
}
