/**
 * Prediction Cache
 * Caches URL predictions with LRU eviction and TTL
 */

export class PredictionCache {
  constructor(maxSize = 1000, ttlMs = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get cached prediction for URL
   * @param {string} url
   * @returns {Object|null} Cached prediction or null
   */
  get(url) {
    const key = this.normalizeURL(url);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.hits++;
    return entry.prediction;
  }
  
  /**
   * Store prediction in cache
   * @param {string} url
   * @param {Object} prediction
   */
  set(url, prediction) {
    const key = this.normalizeURL(url);
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      prediction,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear all cached predictions
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10000) / 10000,
      ttl: this.ttl
    };
  }
  
  /**
   * Normalize URL for consistent caching
   * @private
   * @param {string} url
   * @returns {string}
   */
  normalizeURL(url) {
    try {
      const urlObj = new URL(url);
      // Remove fragments and normalize
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;
    } catch {
      return url;
    }
  }
  
  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    return keysToDelete.length;
  }
}
