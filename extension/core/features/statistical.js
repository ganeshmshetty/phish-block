/**
 * Statistical Features
 * Entropy and other statistical measures
 */

export class StatisticalFeatures {
  /**
   * Calculate Shannon entropy of a string
   * Measures randomness/predictability
   * MUST MATCH Python implementation: iterate over 256 possible byte values (0-255)
   * 
   * @param {string} text - Text to analyze
   * @returns {number} Entropy value (typically 0-8)
   */
  static calculateEntropy(text) {
    if (!text || text.length === 0) {
      return 0.0;
    }
    
    let entropy = 0.0;
    const len = text.length;
    
    // Iterate over all 256 possible byte values (0-255) to match Python implementation
    for (let x = 0; x < 256; x++) {
      const char = String.fromCharCode(x);
      let count = 0;
      
      // Count occurrences of this character
      for (let i = 0; i < text.length; i++) {
        if (text[i] === char) {
          count++;
        }
      }
      
      const p_x = count / len;
      if (p_x > 0) {
        entropy += -p_x * Math.log2(p_x);
      }
    }
    
    return entropy;
  }
  
  /**
   * Calculate consonant-vowel ratio
   * Phishing domains often have unusual ratios
   * 
   * @param {string} text
   * @returns {number}
   */
  static consonantVowelRatio(text) {
    const vowels = (text.match(/[aeiou]/gi) || []).length;
    const consonants = (text.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    
    if (consonants === 0) return 0;
    return vowels / consonants;
  }
  
  /**
   * Calculate longest consecutive character run
   * Long runs indicate randomly generated domains
   * 
   * @param {string} text
   * @returns {number}
   */
  static longestCharacterRun(text) {
    if (text.length === 0) return 0;
    
    let maxRun = 1;
    let currentRun = 1;
    
    for (let i = 1; i < text.length; i++) {
      if (text[i] === text[i - 1]) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 1;
      }
    }
    
    return maxRun;
  }
  
  /**
   * Calculate longest digit sequence
   * @param {string} text
   * @returns {number}
   */
  static longestDigitSequence(text) {
    const matches = text.match(/\d+/g);
    if (!matches) return 0;
    
    return Math.max(...matches.map(m => m.length));
  }
  
  /**
   * Calculate standard deviation of character positions
   * Measures distribution of different character types
   * 
   * @param {string} text
   * @returns {number}
   */
  static characterPositionStdDev(text) {
    if (text.length < 2) return 0;
    
    const positions = [];
    for (let i = 0; i < text.length; i++) {
      positions.push(i);
    }
    
    const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => 
      sum + Math.pow(pos - mean, 2), 0) / positions.length;
    
    return Math.sqrt(variance);
  }
}
