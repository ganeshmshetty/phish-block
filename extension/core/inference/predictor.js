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
   * @param {Array<number>} features - Feature vector (10 values)
   * @returns {number} Probability between 0 and 1
   */
  predict(features) {
    if (!this.modelLoader.isLoaded) {
      throw new Error('Model not loaded');
    }
    
    const expectedFeatures = this.modelLoader.metadata.feature_names.length;
    if (!features || features.length !== expectedFeatures) {
      throw new Error(`Expected ${expectedFeatures} features, got ${features?.length}`);
    }
    
    const model = this.modelLoader.model;
    
    // Get predictions from all trees
    // XGBoost base_score is already in log-odds space for binary:logistic
    let score = model.base_score;
    
    for (let i = 0; i < model.trees.length; i++) {
      const treeScore = this.predictTree(model.trees[i], features);
      score += treeScore;
    }
    
    // Convert to probability using sigmoid function
    const probability = 1.0 / (1.0 + Math.exp(-score));
    
    console.log('🔍 Prediction:', { 
      features: features.slice(0, 5).map(f => f.toFixed(2)), 
      score: score.toFixed(4), 
      probability: probability.toFixed(4) 
    });
    
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
    // XGBoost uses array-based format (not nodes array)
    // Arrays: left_children, right_children, split_indices, split_conditions, base_weights
    const leftChildren = tree.left_children;
    const rightChildren = tree.right_children;
    const splitIndices = tree.split_indices;
    const splitConditions = tree.split_conditions;
    const baseWeights = tree.base_weights;
    
    // Fallback to old format if new format not found
    if (!leftChildren && tree.nodes) {
      return this.predictTreeNodes(tree.nodes, features);
    }
    
    let nodeIdx = 0;
    
    while (true) {
      const leftChild = leftChildren[nodeIdx];
      const rightChild = rightChildren[nodeIdx];
      
      // Leaf node: both children are -1
      if (leftChild === -1 && rightChild === -1) {
        return baseWeights[nodeIdx];
      }
      
      // Internal node: check split condition
      const splitIdx = splitIndices[nodeIdx];
      const splitValue = splitConditions[nodeIdx];
      const featureValue = features[splitIdx];
      
      // Navigate to next node
      if (featureValue < splitValue) {
        nodeIdx = leftChild;
      } else {
        nodeIdx = rightChild;
      }
      
      // Safety check
      if (nodeIdx < 0 || nodeIdx >= leftChildren.length) {
        console.error('Invalid node index:', nodeIdx);
        return 0;
      }
    }
  }
  
  /**
   * Fallback: traverse old-style nodes array format
   * @private
   */
  predictTreeNodes(nodes, features) {
    let nodeIdx = 0;
    
    while (true) {
      const node = nodes[nodeIdx];
      
      if (!node) {
        console.error('Node not found at index:', nodeIdx);
        return 0;
      }
      
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
