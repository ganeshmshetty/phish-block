/**
 * Model Validation Test
 * Run this in the browser console to verify model and extension are properly linked
 */

(async function validateModelSetup() {
  console.log('🔍 PHISH-BLOCK MODEL VALIDATION\n');
  console.log('================================\n');
  
  const results = {
    passed: [],
    failed: []
  };
  
  function pass(test) {
    console.log(`✅ ${test}`);
    results.passed.push(test);
  }
  
  function fail(test, error) {
    console.error(`❌ ${test}: ${error}`);
    results.failed.push({ test, error });
  }
  
  try {
    // Test 1: Check if model files exist
    console.log('Test 1: Model Files\n-------------------');
    try {
      const metadataUrl = chrome.runtime.getURL('models/model_metadata.json');
      const metadataResponse = await fetch(metadataUrl);
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        pass('model_metadata.json exists and is valid JSON');
        console.log(`  Version: ${metadata.version}`);
        console.log(`  Features: ${metadata.feature_names.length}`);
        console.log(`  Threshold: ${metadata.recommended_threshold}`);
      } else {
        fail('model_metadata.json', `HTTP ${metadataResponse.status}`);
      }
    } catch (e) {
      fail('model_metadata.json', e.message);
    }
    
    try {
      const modelUrl = chrome.runtime.getURL('models/phishing_xgb.json');
      const modelResponse = await fetch(modelUrl);
      if (modelResponse.ok) {
        const model = await modelResponse.json();
        pass('phishing_xgb.json exists and is valid JSON');
        
        // Verify model structure
        const learner = model.learner || model;
        const booster = learner.gradient_booster || learner;
        const modelData = booster.model || booster;
        
        if (modelData.trees) {
          console.log(`  Trees: ${modelData.trees.length}`);
          pass(`Model has ${modelData.trees.length} trees`);
        } else {
          fail('Model structure', 'No trees found');
        }
      } else {
        fail('phishing_xgb.json', `HTTP ${modelResponse.status}`);
      }
    } catch (e) {
      fail('phishing_xgb.json', e.message);
    }
    
    console.log('\n');
    
    // Test 2: Load model through ModelLoader
    console.log('Test 2: Model Loader\n--------------------');
    try {
      // Dynamic import
      const { ModelLoader } = await import(chrome.runtime.getURL('core/inference/model_loader.js'));
      const loader = new ModelLoader();
      await loader.load();
      
      if (loader.isLoaded) {
        pass('ModelLoader successfully loaded model');
        const info = loader.getInfo();
        console.log(`  Version: ${info.version}`);
        console.log(`  Trees: ${info.numTrees}`);
        console.log(`  Features: ${info.numFeatures}`);
        console.log(`  Threshold: ${info.threshold}`);
      } else {
        fail('ModelLoader', 'Failed to load');
      }
    } catch (e) {
      fail('ModelLoader', e.message);
    }
    
    console.log('\n');
    
    // Test 3: Feature Extraction
    console.log('Test 3: Feature Extraction\n--------------------------');
    try {
      const { FeatureExtractor, FEATURE_NAMES } = await import(chrome.runtime.getURL('core/features/index.js'));
      
      console.log(`Feature names (${FEATURE_NAMES.length}):`);
      FEATURE_NAMES.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
      
      // Test with a sample URL
      const testUrl = 'https://secure-login-verify.com/account/update';
      const features = FeatureExtractor.extractFeatures(testUrl);
      
      if (features) {
        pass('Feature extraction works');
        const featureArray = FeatureExtractor.featuresToArray(features);
        console.log(`  Extracted ${featureArray.length} features from test URL`);
        console.log(`  Test URL: ${testUrl}`);
        console.log(`  Features:`, featureArray);
      } else {
        fail('Feature extraction', 'Returned null');
      }
    } catch (e) {
      fail('Feature extraction', e.message);
    }
    
    console.log('\n');
    
    // Test 4: Feature Count Match
    console.log('Test 4: Feature Count Validation\n---------------------------------');
    try {
      const metadataUrl = chrome.runtime.getURL('models/model_metadata.json');
      const metadata = await (await fetch(metadataUrl)).json();
      
      const { FEATURE_NAMES } = await import(chrome.runtime.getURL('core/features/index.js'));
      
      if (metadata.feature_names.length === FEATURE_NAMES.length) {
        pass(`Feature counts match: ${FEATURE_NAMES.length}`);
      } else {
        fail('Feature count mismatch', 
          `Metadata: ${metadata.feature_names.length}, Extractor: ${FEATURE_NAMES.length}`);
      }
      
      // Check if feature names match
      let allMatch = true;
      for (let i = 0; i < metadata.feature_names.length; i++) {
        if (metadata.feature_names[i] !== FEATURE_NAMES[i]) {
          allMatch = false;
          fail('Feature name mismatch', 
            `Position ${i}: metadata="${metadata.feature_names[i]}", extractor="${FEATURE_NAMES[i]}"`);
        }
      }
      
      if (allMatch) {
        pass('All feature names match exactly');
      }
    } catch (e) {
      fail('Feature validation', e.message);
    }
    
    console.log('\n');
    
    // Test 5: End-to-End Prediction
    console.log('Test 5: End-to-End Prediction\n------------------------------');
    try {
      const { ModelLoader } = await import(chrome.runtime.getURL('core/inference/model_loader.js'));
      const { Predictor } = await import(chrome.runtime.getURL('core/inference/predictor.js'));
      const { FeatureExtractor } = await import(chrome.runtime.getURL('core/features/index.js'));
      
      const loader = new ModelLoader();
      await loader.load();
      const predictor = new Predictor(loader);
      
      const testUrls = [
        'https://google.com',
        'https://secure-login-verify-account.com/update/password',
        'http://192.168.1.1/admin'
      ];
      
      for (const url of testUrls) {
        const features = FeatureExtractor.extractFeaturesArray(url);
        const prediction = predictor.predictWithConfidence(features);
        console.log(`  ${url}`);
        console.log(`    Probability: ${(prediction.probability * 100).toFixed(2)}%`);
        console.log(`    Level: ${prediction.level}`);
      }
      
      pass('End-to-end prediction works');
    } catch (e) {
      fail('End-to-end prediction', e.message);
    }
    
  } catch (error) {
    console.error('Validation failed:', error);
  }
  
  // Summary
  console.log('\n');
  console.log('================================');
  console.log('VALIDATION SUMMARY');
  console.log('================================');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All tests passed! Model is properly linked to extension.');
  } else {
    console.log('\n⚠️ Some tests failed. Review errors above.');
  }
  
  return results;
})();
