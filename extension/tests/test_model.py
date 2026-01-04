"""
Test Model Files - Python Version
Run this to validate the model files work correctly before deploying to extension
Optionally tests model accuracy on master dataset if available
"""

import json
import sys
from pathlib import Path
import math
import re
from urllib.parse import urlparse

# Add parent directory to path to import from extension
extension_dir = Path(__file__).parent.parent
models_dir = extension_dir / 'models'
datasets_dir = extension_dir.parent / 'ml_research' / 'datasets'

# Suspicious keywords (must match JavaScript version)
SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'update', 'account', 'secure', 'banking',
    'confirm', 'signin', 'password', 'wallet', 'crypto', 'admin', 'service'
]


def calculate_entropy(text):
    """Calculate Shannon entropy - MUST match Colab implementation"""
    if not text:
        return 0.0
    
    entropy = 0.0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += -p_x * math.log(p_x, 2)
    
    return entropy


def extract_features(url):
    """Extract features from URL - MUST match Colab implementation"""
    
    # Ensure URL has scheme
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    try:
        parsed = urlparse(url)
        domain = parsed.hostname or ''
        path = parsed.path or ''
        
        # Build features dictionary
        features = {}
        
        # DOMAIN FEATURES (Universal)
        features['domain_length'] = len(domain)
        features['qty_dot_domain'] = domain.count('.')
        features['qty_hyphen_domain'] = domain.count('-')
        features['domain_entropy'] = calculate_entropy(domain)
        
        # Check if domain is IP address
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        features['is_ip'] = 1 if re.match(ip_pattern, domain) else 0
        
        # PATH FEATURES (The "Length Bias" Fix)
        features['path_length'] = len(path)
        features['qty_slash_path'] = path.count('/')
        features['qty_hyphen_path'] = path.count('-')
        
        # SEMANTIC FEATURES
        features['sus_keywords_count'] = sum(1 for word in SUSPICIOUS_KEYWORDS if word in url.lower())
        features['qty_double_slash'] = path.count('//')
        
        return features
        
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None


def load_metadata():
    """Load and validate model_metadata.json"""
    print("=" * 60)
    print("TEST 1: Loading model_metadata.json")
    print("=" * 60)
    
    metadata_path = models_dir / 'model_metadata.json'
    
    if not metadata_path.exists():
        print(f"❌ FAIL: File not found at {metadata_path}")
        return None
    
    print(f"✅ File exists: {metadata_path}")
    
    try:
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        print("✅ Valid JSON format")
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: Invalid JSON - {e}")
        return None
    
    # Validate required fields
    required_fields = ['feature_names', 'version', 'model_type', 'recommended_threshold']
    for field in required_fields:
        if field in metadata:
            print(f"✅ Field '{field}': {metadata[field]}")
        else:
            print(f"❌ FAIL: Missing required field '{field}'")
            return None
    
    # Validate feature count
    expected_feature_count = 10
    actual_count = len(metadata['feature_names'])
    
    if actual_count == expected_feature_count:
        print(f"✅ Feature count: {actual_count}")
    else:
        print(f"⚠️  WARNING: Expected {expected_feature_count} features, found {actual_count}")
    
    print(f"\nFeature names:")
    for i, feature in enumerate(metadata['feature_names'], 1):
        print(f"  {i}. {feature}")
    
    return metadata


def load_model():
    """Load and validate phishing_xgb.json"""
    print("\n" + "=" * 60)
    print("TEST 2: Loading phishing_xgb.json")
    print("=" * 60)
    
    model_path = models_dir / 'phishing_xgb.json'
    
    if not model_path.exists():
        print(f"❌ FAIL: File not found at {model_path}")
        return None
    
    print(f"✅ File exists: {model_path}")
    
    try:
        with open(model_path, 'r') as f:
            model = json.load(f)
        print("✅ Valid JSON format")
    except json.JSONDecodeError as e:
        print(f"❌ FAIL: Invalid JSON - {e}")
        return None
    
    # Navigate XGBoost structure
    try:
        learner = model.get('learner', model)
        booster = learner.get('gradient_booster', learner)
        model_data = booster.get('model', booster)
        
        if 'trees' in model_data:
            tree_count = len(model_data['trees'])
            print(f"✅ Model has {tree_count} trees")
            
            if 100 <= tree_count <= 200:
                print("✅ Tree count in expected range (100-200)")
            elif tree_count < 10:
                print("⚠️  WARNING: Very few trees - might be a test model")
            
            # Check first tree structure
            if tree_count > 0:
                first_tree = model_data['trees'][0]
                if 'nodes' in first_tree:
                    print(f"✅ Valid tree structure (first tree has {len(first_tree['nodes'])} nodes)")
                else:
                    print("⚠️  WARNING: Tree structure might be non-standard")
        else:
            print("❌ FAIL: No trees found in model")
            return None
            
    except Exception as e:
        print(f"❌ FAIL: Error parsing model structure - {e}")
        return None
    
    # Check file size
    file_size_kb = model_path.stat().st_size / 1024
    print(f"ℹ️  Model file size: {file_size_kb:.2f} KB")
    
    if file_size_kb > 5000:
        print("⚠️  WARNING: Model is very large (>5MB)")
    
    return model


def test_feature_extraction():
    """Test feature extraction with sample URLs"""
    print("\n" + "=" * 60)
    print("TEST 3: Feature Extraction")
    print("=" * 60)
    
    test_urls = [
        'https://google.com',
        'https://secure-login-verify-account.com/update/password',
        'http://192.168.1.1/admin',
        'https://paypal-secure-login.com/verify',
    ]
    
    for url in test_urls:
        print(f"\n📋 Testing: {url}")
        features = extract_features(url)
        
        if features:
            print("✅ Features extracted successfully:")
            for key, value in features.items():
                print(f"   {key}: {value}")
        else:
            print("❌ FAIL: Feature extraction failed")
    
    return True


def test_feature_compatibility(metadata):
    """Test that extracted features match metadata"""
    print("\n" + "=" * 60)
    print("TEST 4: Feature Compatibility")
    print("=" * 60)
    
    # Get feature names from extraction
    test_url = 'https://example.com'
    extracted_features = extract_features(test_url)
    
    if not extracted_features:
        print("❌ FAIL: Could not extract features")
        return False
    
    extracted_names = list(extracted_features.keys())
    metadata_names = metadata['feature_names']
    
    print(f"Extracted features: {len(extracted_names)}")
    print(f"Metadata features: {len(metadata_names)}")
    
    if len(extracted_names) != len(metadata_names):
        print(f"❌ FAIL: Feature count mismatch!")
        return False
    
    print("✅ Feature counts match")
    
    # Check if names and order match
    all_match = True
    print("\nFeature comparison:")
    print(f"{'#':<4} {'Extracted':<30} {'Metadata':<30} {'Match':<10}")
    print("-" * 80)
    
    for i, (ext_name, meta_name) in enumerate(zip(extracted_names, metadata_names), 1):
        match = ext_name == meta_name
        symbol = "✅" if match else "❌"
        print(f"{i:<4} {ext_name:<30} {meta_name:<30} {symbol}")
        
        if not match:
            all_match = False
    
    if all_match:
        print("\n✅ All feature names match perfectly!")
        return True
    else:
        print("\n❌ FAIL: Feature names do not match!")
        return False


def test_model_predictions():
    """Test model predictions on master dataset"""
    print("\n" + "=" * 60)
    print("TEST 5: Model Predictions on Master Dataset")
    print("=" * 60)
    
    # Check if datasets exist
    dataset_files = list(datasets_dir.glob('master_data_*.csv'))
    
    if not dataset_files:
        print("⚠️  No master dataset found. Skipping accuracy test.")
        print(f"   Looking in: {datasets_dir}")
        return None
    
    try:
        # Try to import pandas and xgboost
        try:
            import pandas as pd
            import xgboost as xgb
        except ImportError as e:
            print(f"⚠️  Missing required package: {e}")
            print("   Install with: pip install pandas xgboost")
            return None
        
        # Use the first master dataset
        dataset_path = dataset_files[0]
        print(f"Loading dataset: {dataset_path.name}")
        
        # Load dataset
        df = pd.read_csv(dataset_path)
        print(f"✅ Dataset loaded: {len(df)} URLs")
        
        # Sample if dataset is too large (for faster testing)
        if len(df) > 10000:
            print(f"   Sampling 10,000 URLs for faster testing...")
            df = df.sample(n=10000, random_state=42)
        
        # Extract features
        print("Extracting features... (this may take a moment)")
        feature_list = []
        valid_indices = []
        
        for idx, url in enumerate(df['url']):
            features = extract_features(str(url))
            if features:
                feature_list.append(list(features.values()))
                valid_indices.append(idx)
        
        if not feature_list:
            print("❌ FAIL: Could not extract any features")
            return False
        
        print(f"✅ Extracted features from {len(feature_list)}/{len(df)} URLs")
        
        # Load model
        model_path = models_dir / 'phishing_xgb.json'
        
        # Check if model file exists and is valid
        if not model_path.exists():
            print(f"❌ Model file not found: {model_path}")
            print("   Please copy the trained model from Colab to extension/models/")
            return False
        
        # Try to load with XGBClassifier (matches Colab training)
        try:
            model = xgb.XGBClassifier()
            model.load_model(str(model_path))
            
            # Get predictions (probabilities for class 1)
            predictions = model.predict_proba(feature_list)[:, 1]
            
        except Exception as e:
            print(f"❌ Could not load model with XGBClassifier: {e}")
            print("   The model file might be incomplete or from an older version.")
            print("   Please retrain the model using the Colab notebook and copy the new file.")
            return False
        
        # Convert probabilities to binary labels (threshold = 0.5)
        predicted_labels = (predictions > 0.5).astype(int)
        
        # Get actual labels
        actual_labels = df.iloc[valid_indices]['label'].values
        
        # Calculate metrics
        correct = (predicted_labels == actual_labels).sum()
        total = len(predicted_labels)
        accuracy = correct / total
        
        # Calculate precision, recall for phishing (label=1)
        true_positives = ((predicted_labels == 1) & (actual_labels == 1)).sum()
        false_positives = ((predicted_labels == 1) & (actual_labels == 0)).sum()
        false_negatives = ((predicted_labels == 0) & (actual_labels == 1)).sum()
        
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        print(f"\n📊 Model Performance:")
        print(f"   Accuracy:  {accuracy * 100:.2f}%")
        print(f"   Precision: {precision * 100:.2f}%")
        print(f"   Recall:    {recall * 100:.2f}%")
        print(f"   F1-Score:  {f1 * 100:.2f}%")
        print(f"   Tested on: {total} URLs")
        
        if accuracy > 0.90:
            print("✅ Excellent model performance!")
        elif accuracy > 0.80:
            print("✅ Good model performance")
        elif accuracy > 0.70:
            print("⚠️  Moderate performance - consider retraining")
        else:
            print("❌ Poor performance - model needs retraining")
        
        return accuracy > 0.70
        
    except Exception as e:
        print(f"❌ Error testing predictions: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("🧪 PHISH-BLOCK MODEL TEST SUITE (Python)")
    print("=" * 60)
    print()
    
    results = {}
    
    # Test 1: Load metadata
    metadata = load_metadata()
    results['metadata'] = metadata is not None
    
    # Test 2: Load model
    model = load_model()
    results['model'] = model is not None
    
    # Test 3: Feature extraction
    results['extraction'] = test_feature_extraction()
    
    # Test 4: Feature compatibility
    if metadata:
        results['compatibility'] = test_feature_compatibility(metadata)
    else:
        results['compatibility'] = False
    
    # Test 5: Model predictions (optional, requires pandas/xgboost)
    prediction_result = test_model_predictions()
    if prediction_result is not None:
        results['predictions'] = prediction_result
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total_tests - passed
    
    for test_name, result in results.items():
        symbol = "✅" if result else "❌"
        print(f"{symbol} {test_name.upper()}: {'PASS' if result else 'FAIL'}")
    
    print(f"\n{passed}/{total_tests} tests passed")
    
    if failed == 0:
        print("\n🎉 All tests passed! Model files are properly configured.")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review the errors above.")
        return 1


if __name__ == '__main__':
    sys.exit(run_all_tests())
