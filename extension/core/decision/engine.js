/**
 * Decision Engine
 * Main decision-making logic for phishing detection
 */

import { PredictionCache } from './cache.js';
import { Whitelist } from './whitelist.js';
import { ThresholdManager } from './threshold.js';

export class DecisionEngine {
  constructor(featureExtractor, predictor) {
    this.featureExtractor = featureExtractor;
    this.predictor = predictor;
    this.cache = new PredictionCache();
    this.whitelist = new Whitelist();
    this.thresholds = new ThresholdManager();
    this.initialized = false;
  }
  
  /**
   * Initialize the decision engine
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    
    await Promise.all([
      this.whitelist.load(),
      this.thresholds.load()
    ]);
    
    this.initialized = true;
    console.log('✅ Decision engine initialized');
  }
  
  /**
   * Make decision for a URL
   * @param {string} url
   * @returns {Promise<Object>} Decision result
   */
  async decide(url) {
    if (!this.initialized) {
      await this.init();
    }
    
    const startTime = performance.now();
    
    try {
      // Step 1: Check whitelist (highest priority)
      if (this.whitelist.isWhitelisted(url)) {
        return this.createDecision({
          url,
          action: 'ALLOW',
          level: 'SAFE',
          reason: 'whitelisted',
          probability: 0,
          confidence: 1,
          cached: false,
          latency: performance.now() - startTime
        });
      }
      
      // Step 2: Check cache
      const cached = this.cache.get(url);
      if (cached) {
        return this.createDecision({
          ...cached,
          cached: true,
          latency: performance.now() - startTime
        });
      }
      
      // Step 3: Extract features
      const features = this.featureExtractor.extractFeatures(url);
      if (!features) {
        throw new Error('Failed to extract features');
      }
      
      const featureArray = this.featureExtractor.featuresToArray(features);
      
      // Step 4: Run ML prediction
      const prediction = this.predictor.predictWithConfidence(featureArray);
      
      // Step 5: Apply decision policy
      const isPopularDomain = this.isPopularDomain(url);
      const action = this.thresholds.getAction(prediction.probability, isPopularDomain);
      
      // Step 6: Create decision
      const decision = this.createDecision({
        url,
        action,
        level: prediction.level,
        probability: prediction.probability,
        confidence: prediction.confidence,
        reason: isPopularDomain ? 'popular_domain_check' : 'ml_prediction',
        features,
        cached: false,
        latency: performance.now() - startTime
      });
      
      // Step 7: Cache result
      this.cache.set(url, decision);
      
      return decision;
      
    } catch (error) {
      console.error('Decision error:', error);
      
      // Fail open (allow) on errors
      return this.createDecision({
        url,
        action: 'ALLOW',
        level: 'UNKNOWN',
        reason: 'error',
        error: error.message,
        probability: null,
        confidence: 0,
        cached: false,
        latency: performance.now() - startTime
      });
    }
  }
  
  /**
   * Create standardized decision object
   * @private
   * @param {Object} params
   * @returns {Object}
   */
  createDecision(params) {
    return {
      url: params.url,
      action: params.action,
      level: params.level,
      probability: params.probability,
      confidence: params.confidence,
      reason: params.reason,
      features: params.features || null,
      cached: params.cached || false,
      timestamp: Date.now(),
      latency: Math.round(params.latency || 0),
      error: params.error || null
    };
  }
  
  /**
   * Check if domain is in popular domains list
   * @private
   * @param {string} url
   * @returns {boolean}
   */
  isPopularDomain(url) {
    // Top 100 most popular domains (simplified)
    const popularDomains = [
      'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'linkedin.com', 'reddit.com', 'amazon.com', 'wikipedia.org', 'netflix.com',
      'microsoft.com', 'apple.com', 'github.com', 'stackoverflow.com', 'medium.com'
    ];
    
    try {
      const hostname = new URL(url).hostname;
      return popularDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
  
  /**
   * Get decision engine statistics
   * @returns {Object}
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      whitelist: this.whitelist.getStats(),
      thresholds: this.thresholds.getThresholds()
    };
  }
  
  /**
   * Clear caches and reset
   */
  reset() {
    this.cache.clear();
    console.log('🔄 Decision engine reset');
  }
}
