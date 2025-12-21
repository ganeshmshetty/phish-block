/**
 * Whitelist Manager
 * Manages user-trusted domains
 */

export class Whitelist {
  constructor() {
    this.domains = new Set();
    this.loaded = false;
  }
  
  /**
   * Load whitelist from storage
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const result = await chrome.storage.local.get(['whitelist']);
      if (result.whitelist && Array.isArray(result.whitelist)) {
        this.domains = new Set(result.whitelist);
      }
      this.loaded = true;
      console.log(`📝 Whitelist loaded: ${this.domains.size} domains`);
    } catch (error) {
      console.error('Failed to load whitelist:', error);
      this.domains = new Set();
      this.loaded = true;
    }
  }
  
  /**
   * Save whitelist to storage
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await chrome.storage.local.set({
        whitelist: Array.from(this.domains)
      });
    } catch (error) {
      console.error('Failed to save whitelist:', error);
    }
  }
  
  /**
   * Add domain to whitelist
   * @param {string} url - URL or domain
   * @returns {Promise<boolean>} True if added
   */
  async add(url) {
    const domain = this.extractDomain(url);
    if (!domain) return false;
    
    this.domains.add(domain);
    await this.save();
    
    console.log(`✅ Added to whitelist: ${domain}`);
    return true;
  }
  
  /**
   * Remove domain from whitelist
   * @param {string} url - URL or domain
   * @returns {Promise<boolean>} True if removed
   */
  async remove(url) {
    const domain = this.extractDomain(url);
    if (!domain) return false;
    
    const removed = this.domains.delete(domain);
    if (removed) {
      await this.save();
      console.log(`🗑️ Removed from whitelist: ${domain}`);
    }
    
    return removed;
  }
  
  /**
   * Check if URL is whitelisted
   * @param {string} url
   * @returns {boolean}
   */
  isWhitelisted(url) {
    const domain = this.extractDomain(url);
    if (!domain) return false;
    
    // Check exact match
    if (this.domains.has(domain)) {
      return true;
    }
    
    // Check if any parent domain is whitelisted
    const parts = domain.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parentDomain = parts.slice(i).join('.');
      if (this.domains.has(parentDomain)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get all whitelisted domains
   * @returns {Array<string>}
   */
  getAll() {
    return Array.from(this.domains).sort();
  }
  
  /**
   * Clear entire whitelist
   * @returns {Promise<void>}
   */
  async clear() {
    this.domains.clear();
    await this.save();
    console.log('🗑️ Whitelist cleared');
  }
  
  /**
   * Get whitelist statistics
   * @returns {Object}
   */
  getStats() {
    return {
      count: this.domains.size,
      loaded: this.loaded
    };
  }
  
  /**
   * Extract registered domain from URL
   * @private
   * @param {string} url
   * @returns {string|null}
   */
  extractDomain(url) {
    try {
      // Handle both full URLs and bare domains
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Extract registered domain (domain + TLD)
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // Return last two parts (domain.tld)
        return parts.slice(-2).join('.');
      }
      
      return hostname;
    } catch {
      return null;
    }
  }
}
