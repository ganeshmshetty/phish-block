/**
 * Predictor
 * Runs XGBoost model inference client-side
 */

export class Predictor {
  constructor(modelLoader) {
    this.modelLoader = modelLoader;
  }
  
  /**
   * Predict phishing probability for feature vector
   * @param {Array<number>} features - Feature vector (14 values)
   * @returns {number} Probability between 0 and 1
   */
  predict(features) {
    if (!this.modelLoader.isLoaded) {
      throw new Error('Model not loaded');
    }
    
    if (!features || features.length !== 14) {
      throw new Error(`Expected 14 features, got ${features?.length}`);
    }
    
    const model = this.modelLoader.model;
    
    // Get predictions from all trees
    let score = model.base_score;
    
    for (const tree of model.trees) {
      score += this.predictTree(tree, features);
    }
    
    // Convert to probability using sigmoid function
    const probability = 1.0 / (1.0 + Math.exp(-score));
    
    return Math.round(probability * 10000) / 10000; // Round to 4 decimals
  }
  
  /**
   * Traverse a single tree and get prediction
   * @private
   * @param {Object} tree
   * @param {Array<number>} features
   * @returns {number} Tree prediction
   */
  predictTree(tree, features) {
    let nodeIdx = 0;
    const nodes = tree.nodes;
    
    while (true) {
      const node = nodes[nodeIdx];
      
      // Check if leaf node
      if (node.leaf !== undefined) {
        return node.leaf;
      }
      
      if (node.leaf_value !== undefined) {
        return node.leaf_value;
      }
      
      // Internal node - traverse based on split
      const featureIdx = node.split_feature || node.feature;
      const threshold = node.split_condition || node.threshold;
      const featureValue = features[featureIdx];
      
      // Go left if feature < threshold, else right
      if (featureValue < threshold) {
        nodeIdx = node.left_child || node.yes;
      } else {
        nodeIdx = node.right_child || node.no;
      }
      
      // Safety check for infinite loops
      if (nodeIdx === undefined || nodeIdx < 0 || nodeIdx >= nodes.length) {
        console.error('Invalid node index:', nodeIdx);
        return 0;
      }
    }
  }
  
  /**
   * Get prediction with confidence intervals
   * @param {Array<number>} features
   * @returns {Object} {probability, confidence, level}
   */
  predictWithConfidence(features) {
    const probability = this.predict(features);
    const threshold = this.modelLoader.getThreshold();
    
    // Determine risk level
    let level;
    if (probability >= threshold) {
      level = 'PHISHING';
    } else if (probability >= threshold - 0.20) {
      level = 'SUSPICIOUS';
    } else {
      level = 'SAFE';
    }
    
    // Confidence is distance from decision boundary
    const confidence = level === 'SAFE' 
      ? 1 - probability 
      : probability;
    
    return {
      probability,
      confidence: Math.round(confidence * 10000) / 10000,
      level,
      threshold
    };
  }
  
  /**
   * Batch prediction for multiple feature vectors
   * @param {Array<Array<number>>} featuresBatch
   * @returns {Array<number>}
   */
  predictBatch(featuresBatch) {
    return featuresBatch.map(features => this.predict(features));
  }
}
