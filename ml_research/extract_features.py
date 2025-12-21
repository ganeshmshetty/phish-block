"""
Phish-Block: Canonical Feature Extraction
==========================================

This is the SINGLE SOURCE OF TRUTH for feature extraction logic.
Any changes here must be replicated in:
- JavaScript implementation (dashboard/extension/js/feature_extractor.js)
- Model training notebook (ml_research/notebooks/02_model_training.ipynb)

Feature Engineering Principles:
1. **Deterministic**: Same URL always produces same features
2. **Browser-compatible**: All features can be extracted client-side
3. **Fast**: < 5ms extraction time for real-time blocking
4. **Explainable**: Features are human-interpretable

Feature Groups:
- DOMAIN FEATURES: Domain length, character composition, entropy
- PATH FEATURES: Path structure and patterns
- SECURITY FEATURES: Suspicious keywords, IP addresses, tricks
"""

import pandas as pd
import tldextract
from urllib.parse import urlparse
import math
import re
from typing import Dict, List, Optional, Tuple

# Configuration Constants
SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'update', 'account', 'secure', 'banking',
    'confirm', 'signin', 'password', 'wallet', 'crypto', 'admin'
]

# Feature names in exact order (CRITICAL for model inference)
FEATURE_NAMES = [
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
]


def calculate_entropy(text: str) -> float:
    """
    Calculate Shannon entropy of a string.
    
    High entropy indicates random/suspicious characters (e.g., "x83-1a.com").
    Low entropy indicates normal text patterns.
    
    Args:
        text: String to analyze
        
    Returns:
        Entropy value (typically 0-8 for URLs)
    """
    if not text:
        return 0.0
    
    entropy = 0.0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += -p_x * math.log(p_x, 2)
    
    return round(entropy, 4)


def extract_url_features(url: str) -> Optional[Dict[str, float]]:
    """
    Extract all features from a URL for phishing detection.
    
    This function must be kept in sync with the JavaScript implementation.
    
    Args:
        url: URL string to analyze
        
    Returns:
        Dictionary mapping feature names to values, or None if parsing fails
    """
    features = {}
    
    # Normalize URL
    if not isinstance(url, str):
        url = str(url)
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        
        # Construct full domain (subdomain.domain.suffix)
        full_domain = ".".join(part for part in [ext.subdomain, ext.domain, ext.suffix] if part)
        path = parsed.path
        
        # ============================================================
        # GROUP 1: DOMAIN FEATURES
        # Available for all URLs, including short URLs
        # ============================================================
        
        features['domain_length'] = len(full_domain)
        features['qty_dot_domain'] = full_domain.count('.')
        features['qty_hyphen_domain'] = full_domain.count('-')
        features['qty_digit_domain'] = sum(c.isdigit() for c in full_domain)
        features['domain_entropy'] = calculate_entropy(full_domain)
        
        # IP address check (phishing sites often use raw IPs)
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        features['is_ip'] = 1 if re.match(ip_pattern, full_domain) else 0
        
        # ============================================================
        # GROUP 2: PATH FEATURES
        # These are 0 for short URLs, which is intentional
        # ============================================================
        
        features['path_length'] = len(path)
        features['qty_slash_path'] = path.count('/')
        features['qty_dot_path'] = path.count('.')
        features['qty_hyphen_path'] = path.count('-')
        features['qty_digit_path'] = sum(c.isdigit() for c in path)
        
        # ============================================================
        # GROUP 3: SUSPICIOUS PATTERNS
        # Security indicators and phishing tricks
        # ============================================================
        
        # Suspicious keywords (login, verify, etc.)
        features['sus_keywords_count'] = sum(
            1 for word in SUSPICIOUS_KEYWORDS if word in url.lower()
        )
        
        # TLD in path (e.g., google.com-login.xyz)
        features['tld_in_path'] = 1 if any(
            tld in path.lower() for tld in ['com', 'net', 'org', 'io']
        ) else 0
        
        # Double slash redirect trick (http://site.com//evil.com)
        features['qty_double_slash'] = path.count('//')
        
    except Exception as e:
        print(f"Error parsing URL '{url}': {e}")
        return None
    
    return features


def features_to_array(features: Dict[str, float]) -> List[float]:
    """
    Convert feature dictionary to ordered array for model input.
    
    Args:
        features: Dictionary of feature name -> value
        
    Returns:
        List of feature values in the correct order
    """
    return [features[name] for name in FEATURE_NAMES]


def extract_features_batch(urls: List[str]) -> Tuple[List[List[float]], List[int]]:
    """
    Extract features from multiple URLs efficiently.
    
    Args:
        urls: List of URLs to process
        
    Returns:
        Tuple of (feature_matrix, valid_indices)
    """
    features_list = []
    valid_indices = []
    
    for idx, url in enumerate(urls):
        feats = extract_url_features(url)
        if feats:
            features_list.append(features_to_array(feats))
            valid_indices.append(idx)
    
    return features_list, valid_indices


# CLI Testing Interface
if __name__ == "__main__":
    test_urls = [
        "https://www.google.com",
        "https://github.com/microsoft/vscode",
        "http://192.168.1.1/admin",
        "http://paypal-verify.xyz/login",
    ]
    
    print("Feature Extraction Test")
    print("=" * 60)
    
    for url in test_urls:
        print(f"\nURL: {url}")
        features = extract_url_features(url)
        if features:
            for name, value in features.items():
                print(f"  {name:25s} = {value}")
        else:
            print("  [FAILED TO PARSE]")
