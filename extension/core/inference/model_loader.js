/**
 * Model Loader
 * Loads and initializes the ML model for client-side inference
 */

export class ModelLoader {
  constructor() {
    this.model = null;
    this.metadata = null;
    this.isLoaded = false;
  }
  
  /**
   * Load model and metadata
   * @returns {Promise<void>}
   */
  async load() {
    if (this.isLoaded) {
      return;
    }
    
    try {
      console.log('🔄 Loading ML model...');
      
      // Load metadata first
      await this.loadMetadata();
      
      // Load model (XGBoost JSON format)
      await this.loadModel();
      
      this.isLoaded = true;
      console.log('✅ Model loaded successfully');
      console.log(`📊 Model version: ${this.metadata.version}`);
      console.log(`📦 Features: ${this.metadata.feature_names.length}`);
      console.log(`🎯 Threshold: ${this.metadata.recommended_threshold}`);
      
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }
  
  /**
   * Load model metadata
   * @private
   */
  async loadMetadata() {
    const metadataUrl = chrome.runtime.getURL('models/model_metadata.json');
    const response = await fetch(metadataUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    
    this.metadata = await response.json();
    
    // Validate metadata
    if (!this.metadata.feature_names || !this.metadata.recommended_threshold) {
      throw new Error('Invalid metadata format');
    }
  }
  
  /**
   * Load XGBoost model from JSON
   * @private
   */
  async loadModel() {
    const modelUrl = chrome.runtime.getURL('models/phishing_xgb.json');
    const response = await fetch(modelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status}`);
    }
    
    const modelData = await response.json();
    this.model = this.parseXGBoostModel(modelData);
    
    console.log(`📦 Model loaded: ${this.model.trees.length} trees`);
  }
  
  /**
   * Parse XGBoost JSON format into executable structure
   * @private
   * @param {Object} modelData - Raw XGBoost JSON
   * @returns {Object} Parsed model
   */
  parseXGBoostModel(modelData) {
    // XGBoost JSON structure:
    // {learner: {gradient_booster: {model: {trees: [...], tree_info: [...]}}}}
    
    const learner = modelData.learner || modelData;
    const booster = learner.gradient_booster || learner;
    const model = booster.model || booster;
    
    if (!model.trees) {
      throw new Error('Invalid XGBoost model format: missing trees');
    }
    
    // Parse trees
    const trees = model.trees.map(tree => this.parseTree(tree));
    
    // Parse base_score - XGBoost stores it as "[3.3873945E-1]" string format
    let baseScore = 0.5;
    const baseScoreRaw = learner.learner_model_param?.base_score;
    if (baseScoreRaw) {
      if (typeof baseScoreRaw === 'string') {
        // Handle "[3.3873945E-1]" format
        const match = baseScoreRaw.match(/\[?([\d.eE+-]+)\]?/);
        if (match) {
          baseScore = parseFloat(match[1]);
        }
      } else if (typeof baseScoreRaw === 'number') {
        baseScore = baseScoreRaw;
      }
    }
    
    console.log('📊 Base score parsed:', baseScore);
    
    return {
      trees,
      base_score: baseScore,
      num_trees: trees.length
    };
  }
  
  /**
   * Parse individual tree from XGBoost format
   * @private
   * @param {Object} treeData
   * @returns {Object}
   */
  parseTree(treeData) {
    // Modern XGBoost uses array-based format:
    // - left_children: array of left child indices
    // - right_children: array of right child indices
    // - split_indices: feature indices for splits
    // - split_conditions: threshold values for splits
    // - base_weights: leaf values
    
    // Return the tree data as-is (it's already in the correct format)
    return treeData;
  }
  
  /**
   * Get model information
   * @returns {Object}
   */
  getInfo() {
    return {
      isLoaded: this.isLoaded,
      version: this.metadata?.version,
      numTrees: this.model?.num_trees,
      numFeatures: this.metadata?.feature_names?.length,
      threshold: this.metadata?.recommended_threshold,
      featureNames: this.metadata?.feature_names
    };
  }
  
  /**
   * Get feature names
   * @returns {Array<string>}
   */
  getFeatureNames() {
    return this.metadata?.feature_names || [];
  }
  
  /**
   * Get recommended threshold
   * @returns {number}
   */
  getThreshold() {
    return this.metadata?.recommended_threshold || 0.70;
  }
}
