import pandas as pd
import tldextract
from urllib.parse import urlparse
import math
import re

# --- CONFIGURATION ---
INPUT_FILE = 'master_data_1.csv'  # The file you created in step 1
OUTPUT_FILE = 'url_features_extracted.csv'

# List of suspicious keywords to check in the URL
SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'update', 'account', 'secure', 'banking', 
    'confirm', 'signin', 'password', 'wallet', 'crypto', 'admin'
]

def calculate_entropy(text):
    """Calculates the randomness of a string. High entropy = random junk."""
    if not text:
        return 0
    entropy = 0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return entropy

def extract_url_features(url):
    features = {}
    
    # 1. Pre-processing: Ensure URL has a scheme for parsing
    if not isinstance(url, str):
        url = str(url)
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
        
    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
        
        # Construct parts
        # "full_domain" includes subdomain + domain + suffix (e.g., mail.google.co.uk)
        full_domain = ".".join(part for part in [ext.subdomain, ext.domain, ext.suffix] if part)
        path = parsed.path
        
        # --- GROUP 1: DOMAIN FEATURES (Available for ALL URLs) ---
        # These are safe to use even on your "Short URL" dataset
        features['domain_length'] = len(full_domain)
        features['qty_dot_domain'] = full_domain.count('.')
        features['qty_hyphen_domain'] = full_domain.count('-')
        features['qty_digit_domain'] = sum(c.isdigit() for c in full_domain)
        
        # Entropy (Phishing domains often look like "x83-1a.com")
        features['domain_entropy'] = calculate_entropy(full_domain)
        
        # IP Address Check (e.g., http://192.168.1.1/login)
        # Regex for IPv4 pattern
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        features['is_ip'] = 1 if re.match(ip_pattern, full_domain) else 0

        # --- GROUP 2: PATH FEATURES (The "Bias Fix") ---
        # We extract these separately. If path is empty (Dataset B), these are 0.
        # This tells the model: "It's not safe because it's short, it's safe because path features are empty."
        
        features['path_length'] = len(path)
        features['qty_slash_path'] = path.count('/')
        features['qty_dot_path'] = path.count('.')
        features['qty_hyphen_path'] = path.count('-')
        features['qty_digit_path'] = sum(c.isdigit() for c in path)
        
        # --- GROUP 3: SECURITY / SUSPICIOUS WORDS ---
        # Check if sensitive words appear in the URL
        features['sus_keywords_count'] = sum(1 for word in SUSPICIOUS_KEYWORDS if word in url.lower())
        
        # Check for TLDs in path (e.g., google.com-login.xyz) which is a common trick
        features['tld_in_path'] = 1 if 'com' in path or 'net' in path or 'org' in path else 0
        
        # Double slash check (redirect trick: http://site.com//google.com)
        features['qty_double_slash'] = path.count('//')

    except Exception as e:
        # In case of parsing error, return -1 or 0
        print(f"Error parsing {url}: {e}")
        return None

    return features

# --- MAIN EXECUTION ---
print("Loading Master Dataset...")
df = pd.read_csv(INPUT_FILE)

# OPTIONAL: Drop NaN URLs if any
df = df.dropna(subset=['url'])

print(f"Extracting features for {len(df)} URLs... (This may take a moment)")

# Apply the function to the 'url' column and expand the result into new columns
feature_df = df['url'].apply(lambda x: pd.Series(extract_url_features(x)))

# Combine the features with the original 'label'
# We drop the original 'url' text column now, as the model only needs numbers
final_df = pd.concat([feature_df, df['label']], axis=1)

# Drop any rows that failed parsing
final_df = final_df.dropna()

print("Saving to CSV...")
final_df.to_csv(OUTPUT_FILE, index=False)

print(f"Success! Features saved to {OUTPUT_FILE}")
print(f"Final Shape: {final_df.shape}")
print("\nSample of Extracted Data:")
print(final_df.head())