/**
 * Lexical Features Extractor
 * Character-level and pattern-based features
 */

export class LexicalFeatures {
  /**
   * Count character occurrences in a string
   * @param {string} text - Text to analyze
   * @param {string} char - Character to count
   * @returns {number} Count
   */
  static countChar(text, char) {
    return (text.match(new RegExp(`\\${char}`, 'g')) || []).length;
  }
  
  /**
   * Count digits in a string
   * @param {string} text
   * @returns {number}
   */
  static countDigits(text) {
    return (text.match(/\d/g) || []).length;
  }
  
  /**
   * Count letters in a string
   * @param {string} text
   * @returns {number}
   */
  static countLetters(text) {
    return (text.match(/[a-zA-Z]/g) || []).length;
  }
  
  /**
   * Count special characters
   * @param {string} text
   * @returns {number}
   */
  static countSpecialChars(text) {
    return (text.match(/[^a-zA-Z0-9]/g) || []).length;
  }
  
  /**
   * Check for suspicious keywords
   * @param {string} text
   * @param {Array<string>} keywords
   * @returns {number} Count of suspicious keywords found
   */
  static countSuspiciousKeywords(text, keywords) {
    const textLower = text.toLowerCase();
    return keywords.filter(keyword => textLower.includes(keyword)).length;
  }
  
  /**
   * Check if TLD appears in path (phishing trick)
   * @param {string} path
   * @returns {number} 1 if found, 0 otherwise
   */
  static hasTLDInPath(path) {
    const pathLower = path.toLowerCase();
    // Match Python training data exactly (data.py)
    const commonTLDs = ['com', 'net', 'org'];
    return commonTLDs.some(tld => pathLower.includes(tld)) ? 1 : 0;
  }
  
  /**
   * Check for double slashes in path (redirect trick)
   * @param {string} path
   * @returns {number} Count
   */
  static countDoubleSlashes(path) {
    return (path.match(/\/\//g) || []).length;
  }
  
  /**
   * Calculate ratio of digits to total length
   * @param {string} text
   * @returns {number} Ratio between 0 and 1
   */
  static digitRatio(text) {
    if (text.length === 0) return 0;
    return this.countDigits(text) / text.length;
  }
  
  /**
   * Extract all lexical features from domain
   * @param {string} domain
   * @returns {Object}
   */
  static extractDomainFeatures(domain) {
    return {
      length: domain.length,
      dots: this.countChar(domain, '.'),
      hyphens: this.countChar(domain, '-'),
      underscores: this.countChar(domain, '_'),
      digits: this.countDigits(domain),
      digitRatio: this.digitRatio(domain)
    };
  }
  
  /**
   * Extract all lexical features from path
   * @param {string} path
   * @returns {Object}
   */
  static extractPathFeatures(path) {
    return {
      length: path.length,
      slashes: this.countChar(path, '/'),
      dots: this.countChar(path, '.'),
      hyphens: this.countChar(path, '-'),
      underscores: this.countChar(path, '_'),
      digits: this.countDigits(path),
      doubleSlashes: this.countDoubleSlashes(path)
    };
  }
}
