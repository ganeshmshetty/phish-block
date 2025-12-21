/**
 * Feature Normalizer
 * Ensures features are in correct format and range for model
 */

export class FeatureNormalizer {
  /**
   * Normalize a single feature value
   * @param {number} value
   * @param {Object} config - {min, max, mean, std} for normalization
   * @returns {number}
   */
  static normalize(value, config) {
    if (!config) return value;
    
    // Z-score normalization
    if (config.mean !== undefined && config.std !== undefined) {
      return (value - config.mean) / (config.std || 1);
    }
    
    // Min-max normalization
    if (config.min !== undefined && config.max !== undefined) {
      const range = config.max - config.min;
      return range === 0 ? 0 : (value - config.min) / range;
    }
    
    return value;
  }
  
  /**
   * Clip value to range
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static clip(value, min = 0, max = 1) {
    return Math.min(Math.max(value, min), max);
  }
  
  /**
   * Round to specified decimal places
   * @param {number} value
   * @param {number} decimals
   * @returns {number}
   */
  static round(value, decimals = 4) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }
  
  /**
   * Handle missing or invalid values
   * @param {any} value
   * @param {number} defaultValue
   * @returns {number}
   */
  static handleMissing(value, defaultValue = 0) {
    if (value === null || value === undefined || isNaN(value)) {
      return defaultValue;
    }
    return value;
  }
  
  /**
   * Normalize all features in a feature vector
   * @param {Object} features - Feature dictionary
   * @param {Object} normConfig - Normalization configuration
   * @returns {Object}
   */
  static normalizeFeatures(features, normConfig = {}) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(features)) {
      const config = normConfig[key];
      let normalizedValue = this.handleMissing(value);
      
      if (config) {
        normalizedValue = this.normalize(normalizedValue, config);
        
        // Apply clipping if specified
        if (config.clip) {
          normalizedValue = this.clip(
            normalizedValue,
            config.clip.min,
            config.clip.max
          );
        }
      }
      
      normalized[key] = this.round(normalizedValue);
    }
    
    return normalized;
  }
}
