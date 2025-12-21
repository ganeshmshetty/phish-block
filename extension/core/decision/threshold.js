/**
 * Threshold Configuration
 * Manages decision thresholds for different risk levels
 */

export class ThresholdManager {
  constructor() {
    this.config = {
      // Main decision threshold
      blockThreshold: 0.70,
      
      // Warning threshold (suspicious but not blocked)
      warnThreshold: 0.50,
      
      // High confidence threshold for popular domains
      popularDomainThreshold: 0.90,
      
      // Threshold profiles
      profiles: {
        conservative: {
          block: 0.85,
          warn: 0.65,
          description: 'Fewer false positives, may miss some phishing'
        },
        balanced: {
          block: 0.70,
          warn: 0.50,
          description: 'Recommended balance of detection and accuracy'
        },
        aggressive: {
          block: 0.50,
          warn: 0.30,
          description: 'Maximum detection, more false positives'
        }
      }
    };
    
    this.currentProfile = 'balanced';
  }
  
  /**
   * Load threshold configuration from storage
   * @returns {Promise<void>}
   */
  async load() {
    try {
      const result = await chrome.storage.local.get(['thresholdConfig']);
      if (result.thresholdConfig) {
        this.config = { ...this.config, ...result.thresholdConfig };
        this.currentProfile = this.config.profile || 'balanced';
      }
    } catch (error) {
      console.error('Failed to load threshold config:', error);
    }
  }
  
  /**
   * Save threshold configuration
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await chrome.storage.local.set({
        thresholdConfig: this.config
      });
    } catch (error) {
      console.error('Failed to save threshold config:', error);
    }
  }
  
  /**
   * Set threshold profile
   * @param {string} profileName - 'conservative', 'balanced', or 'aggressive'
   * @returns {Promise<boolean>}
   */
  async setProfile(profileName) {
    const profile = this.config.profiles[profileName];
    if (!profile) {
      console.error(`Unknown profile: ${profileName}`);
      return false;
    }
    
    this.config.blockThreshold = profile.block;
    this.config.warnThreshold = profile.warn;
    this.currentProfile = profileName;
    this.config.profile = profileName;
    
    await this.save();
    console.log(`🎯 Threshold profile set to: ${profileName}`);
    return true;
  }
  
  /**
   * Set custom thresholds
   * @param {number} blockThreshold
   * @param {number} warnThreshold
   * @returns {Promise<void>}
   */
  async setCustom(blockThreshold, warnThreshold) {
    this.config.blockThreshold = blockThreshold;
    this.config.warnThreshold = warnThreshold;
    this.currentProfile = 'custom';
    this.config.profile = 'custom';
    
    await this.save();
    console.log(`🎯 Custom thresholds: block=${blockThreshold}, warn=${warnThreshold}`);
  }
  
  /**
   * Get current thresholds
   * @returns {Object}
   */
  getThresholds() {
    return {
      block: this.config.blockThreshold,
      warn: this.config.warnThreshold,
      popularDomain: this.config.popularDomainThreshold,
      profile: this.currentProfile
    };
  }
  
  /**
   * Get all available profiles
   * @returns {Object}
   */
  getProfiles() {
    return this.config.profiles;
  }
  
  /**
   * Determine action based on probability
   * @param {number} probability
   * @param {boolean} isPopularDomain
   * @returns {string} 'BLOCK', 'WARN', or 'ALLOW'
   */
  getAction(probability, isPopularDomain = false) {
    // For popular domains, require higher confidence
    if (isPopularDomain && probability < this.config.popularDomainThreshold) {
      return 'ALLOW';
    }
    
    if (probability >= this.config.blockThreshold) {
      return 'BLOCK';
    } else if (probability >= this.config.warnThreshold) {
      return 'WARN';
    } else {
      return 'ALLOW';
    }
  }
}
