/**
 * State Store
 * Centralized state management for extension
 */

export class StateStore {
  constructor() {
    this.state = {
      enabled: true,
      stats: {
        totalChecks: 0,
        blocked: 0,
        warned: 0,
        allowed: 0,
        cached: 0
      },
      currentTab: {
        url: null,
        status: null,
        decision: null
      },
      performance: {
        avgLatency: 0,
        maxLatency: 0
      }
    };
    
    this.listeners = new Set();
    this.loaded = false;
  }
  
  /**
   * Load state from storage
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const result = await chrome.storage.local.get(['extensionState']);
      if (result.extensionState) {
        this.state = { ...this.state, ...result.extensionState };
      }
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load state:', error);
      this.loaded = true;
    }
  }
  
  /**
   * Save state to storage
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await chrome.storage.local.set({
        extensionState: this.state
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }
  
  /**
   * Update state
   * @param {Object} updates - Partial state updates
   */
  async update(updates) {
    this.state = this.deepMerge(this.state, updates);
    await this.save();
    this.notifyListeners();
  }
  
  /**
   * Get current state
   * @returns {Object}
   */
  get() {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }
  
  /**
   * Get specific state value
   * @param {string} path - Dot notation path (e.g., 'stats.blocked')
   * @returns {any}
   */
  getValue(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }
  
  /**
   * Set specific state value
   * @param {string} path - Dot notation path
   * @param {any} value
   */
  async setValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key], this.state);
    target[lastKey] = value;
    
    await this.save();
    this.notifyListeners();
  }
  
  /**
   * Record decision statistics
   * @param {Object} decision
   */
  async recordDecision(decision) {
    this.state.stats.totalChecks++;
    
    if (decision.action === 'BLOCK') {
      this.state.stats.blocked++;
    } else if (decision.action === 'WARN') {
      this.state.stats.warned++;
    } else {
      this.state.stats.allowed++;
    }
    
    if (decision.cached) {
      this.state.stats.cached++;
    }
    
    // Update performance metrics
    if (decision.latency) {
      const total = this.state.stats.totalChecks;
      const prevAvg = this.state.performance.avgLatency;
      this.state.performance.avgLatency = 
        (prevAvg * (total - 1) + decision.latency) / total;
      this.state.performance.maxLatency = 
        Math.max(this.state.performance.maxLatency, decision.latency);
    }
    
    await this.save();
  }
  
  /**
   * Update current tab status
   * @param {Object} tabInfo
   */
  async updateCurrentTab(tabInfo) {
    this.state.currentTab = tabInfo;
    this.notifyListeners();
    // Don't save (session-only)
  }
  
  /**
   * Toggle extension enabled/disabled
   * @returns {Promise<boolean>} New state
   */
  async toggleEnabled() {
    this.state.enabled = !this.state.enabled;
    await this.save();
    this.notifyListeners();
    return this.state.enabled;
  }
  
  /**
   * Reset statistics
   */
  async resetStats() {
    this.state.stats = {
      totalChecks: 0,
      blocked: 0,
      warned: 0,
      allowed: 0,
      cached: 0
    };
    this.state.performance = {
      avgLatency: 0,
      maxLatency: 0
    };
    await this.save();
    this.notifyListeners();
  }
  
  /**
   * Subscribe to state changes
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of state change
   * @private
   */
  notifyListeners() {
    const state = this.get();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
  
  /**
   * Deep merge objects
   * @private
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}
