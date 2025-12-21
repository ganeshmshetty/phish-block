/**
 * Storage Layer - Persistent Settings
 * 
 * Provides abstraction over chrome.storage for settings management
 */

export const settingsStorage = {
  /**
   * Get all settings
   */
  async get() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || this.getDefaults();
  },
  
  /**
   * Save settings
   */
  async save(settings) {
    await chrome.storage.local.set({ settings });
  },
  
  /**
   * Update specific setting
   */
  async update(key, value) {
    const settings = await this.get();
    
    // Support nested keys (e.g., 'thresholds.block')
    const keys = key.split('.');
    let current = settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    await this.save(settings);
  },
  
  /**
   * Get specific setting
   */
  async getSetting(key) {
    const settings = await this.get();
    
    // Support nested keys
    const keys = key.split('.');
    let value = settings;
    
    for (const k of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[k];
    }
    
    return value;
  },
  
  /**
   * Reset to defaults
   */
  async reset() {
    const defaults = this.getDefaults();
    await this.save(defaults);
    return defaults;
  },
  
  /**
   * Get default settings
   */
  getDefaults() {
    return {
      enabled: true,
      thresholds: {
        block: 0.70,
        warn: 0.50,
        popularDomain: 0.90
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000 // 1 hour in ms
      },
      ui: {
        showNotifications: true,
        autoClosePopup: false
      }
    };
  }
};
