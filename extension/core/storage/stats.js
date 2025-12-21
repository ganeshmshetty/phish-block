/**
 * Storage Layer - Statistics Persistence
 * 
 * Provides abstraction for statistics storage and retrieval
 */

export const statsStorage = {
  /**
   * Get all statistics
   */
  async get() {
    const result = await chrome.storage.local.get('stats');
    return result.stats || this.getDefaults();
  },
  
  /**
   * Save statistics
   */
  async save(stats) {
    await chrome.storage.local.set({ stats });
  },
  
  /**
   * Increment a counter
   */
  async increment(key, amount = 1) {
    const stats = await this.get();
    
    if (typeof stats[key] === 'number') {
      stats[key] += amount;
    } else {
      stats[key] = amount;
    }
    
    stats.lastUpdated = Date.now();
    await this.save(stats);
    
    return stats;
  },
  
  /**
   * Reset all statistics
   */
  async reset() {
    const defaults = this.getDefaults();
    await this.save(defaults);
    return defaults;
  },
  
  /**
   * Get specific statistic
   */
  async getStat(key) {
    const stats = await this.get();
    return stats[key];
  },
  
  /**
   * Get default statistics
   */
  getDefaults() {
    return {
      urlsScanned: 0,
      threatsBlocked: 0,
      warningsShown: 0,
      whitelistHits: 0,
      cacheHits: 0,
      lastUpdated: Date.now(),
      installDate: Date.now()
    };
  },
  
  /**
   * Get statistics summary
   */
  async getSummary() {
    const stats = await this.get();
    
    const safeSites = stats.urlsScanned - stats.threatsBlocked - stats.warningsShown;
    const detectionRate = stats.urlsScanned > 0
      ? ((stats.threatsBlocked + stats.warningsShown) / stats.urlsScanned * 100).toFixed(1)
      : 0;
    
    const cacheEfficiency = stats.urlsScanned > 0
      ? (stats.cacheHits / stats.urlsScanned * 100).toFixed(1)
      : 0;
    
    return {
      ...stats,
      safeSites,
      detectionRate,
      cacheEfficiency
    };
  }
};
