/**
 * Feature Extraction Pipeline
 * Main entry point for URL feature extraction
 * MUST match Python implementation in ml_research/extract_features.py
 */

import { URLParser } from './url_parser.js';
import { LexicalFeatures } from './lexical_features.js';
import { StatisticalFeatures } from './statistical.js';
import { FeatureNormalizer } from './normalizer.js';

// Configuration: Suspicious keywords to detect
const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'update', 'account', 'secure', 'banking',
  'confirm', 'signin', 'password', 'wallet', 'crypto', 'admin'
];

// Feature names in exact order (CRITICAL - must match model training)
export const FEATURE_NAMES = [
  'domain_length',
  'qty_dot_domain',
  'qty_hyphen_domain',
  'qty_digit_domain',
  'domain_entropy',
  'is_ip',
  'path_length',
  'qty_slash_path',
  'qty_dot_path',
  'qty_hyphen_path',
  'qty_digit_path',
  'sus_keywords_count',
  'tld_in_path',
  'qty_double_slash'
];

export class FeatureExtractor {
  /**
   * Extract all features from a URL
   * @param {string} url - URL to analyze
   * @returns {Object|null} Feature dictionary or null if parsing fails
   */
  static extractFeatures(url) {
    // Parse URL
    const parsed = URLParser.parse(url);
    if (!parsed) {
      return null;
    }
    
    const domain = URLParser.parseDomain(parsed.hostname);
    const fullDomain = domain.fullDomain;
    const path = parsed.pathname;
    
    // Extract features
    const features = {};
    
    // ============================================================
    // GROUP 1: DOMAIN FEATURES
    // ============================================================
    
    features.domain_length = fullDomain.length;
    features.qty_dot_domain = LexicalFeatures.countChar(fullDomain, '.');
    features.qty_hyphen_domain = LexicalFeatures.countChar(fullDomain, '-');
    features.qty_digit_domain = LexicalFeatures.countDigits(fullDomain);
    features.domain_entropy = StatisticalFeatures.calculateEntropy(fullDomain);
    features.is_ip = URLParser.isIPAddress(fullDomain) ? 1 : 0;
    
    // ============================================================
    // GROUP 2: PATH FEATURES
    // ============================================================
    
    features.path_length = path.length;
    features.qty_slash_path = LexicalFeatures.countChar(path, '/');
    features.qty_dot_path = LexicalFeatures.countChar(path, '.');
    features.qty_hyphen_path = LexicalFeatures.countChar(path, '-');
    features.qty_digit_path = LexicalFeatures.countDigits(path);
    
    // ============================================================
    // GROUP 3: SUSPICIOUS PATTERNS
    // ============================================================
    
    features.sus_keywords_count = LexicalFeatures.countSuspiciousKeywords(
      url,
      SUSPICIOUS_KEYWORDS
    );
    features.tld_in_path = LexicalFeatures.hasTLDInPath(path);
    features.qty_double_slash = LexicalFeatures.countDoubleSlashes(path);
    
    return features;
  }
  
  /**
   * Convert feature dictionary to ordered array for model input
   * @param {Object} features - Feature dictionary
   * @returns {Array<number>}
   */
  static featuresToArray(features) {
    return FEATURE_NAMES.map(name => features[name] || 0);
  }
  
  /**
   * Extract features and return as array
   * @param {string} url
   * @returns {Array<number>|null}
   */
  static extractFeaturesArray(url) {
    const features = this.extractFeatures(url);
    if (!features) return null;
    
    return this.featuresToArray(features);
  }
  
  /**
   * Validate that all required features are present
   * @param {Object} features
   * @returns {boolean}
   */
  static validateFeatures(features) {
    return FEATURE_NAMES.every(name => 
      features.hasOwnProperty(name) && typeof features[name] === 'number'
    );
  }
}

// Export constants
export { SUSPICIOUS_KEYWORDS };
