/**
 * URL Parser
 * Extracts structural components from URLs
 */

export class URLParser {
  /**
   * Parse a URL into components
   * @param {string} url - URL to parse
   * @returns {Object|null} Parsed components
   */
  static parse(url) {
    try {
      // Normalize URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      
      const urlObj = new URL(url);
      
      return {
        protocol: urlObj.protocol.replace(':', ''),
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        full: urlObj.href
      };
    } catch (error) {
      console.error('Failed to parse URL:', error);
      return null;
    }
  }
  
  /**
   * Extract domain components using simple parsing
   * @param {string} hostname - Hostname to parse
   * @returns {Object} Domain components
   */
  static parseDomain(hostname) {
    const parts = hostname.split('.');
    
    let domain = '';
    let subdomain = '';
    let suffix = '';
    
    if (parts.length >= 2) {
      // Handle common TLDs
      const commonTLDs = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co'];
      const lastPart = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      
      // Handle cases like .co.uk, .com.au
      if (parts.length >= 3 && commonTLDs.includes(secondLast) && lastPart.length === 2) {
        suffix = `${secondLast}.${lastPart}`;
        domain = parts[parts.length - 3];
        if (parts.length > 3) {
          subdomain = parts.slice(0, -3).join('.');
        }
      } else {
        suffix = lastPart;
        domain = secondLast;
        if (parts.length > 2) {
          subdomain = parts.slice(0, -2).join('.');
        }
      }
    } else if (parts.length === 1) {
      domain = parts[0];
    }
    
    return {
      subdomain,
      domain,
      suffix,
      fullDomain: hostname,
      registeredDomain: domain && suffix ? `${domain}.${suffix}` : hostname
    };
  }
  
  /**
   * Check if hostname is an IP address
   * @param {string} hostname
   * @returns {boolean}
   */
  static isIPAddress(hostname) {
    const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    const ipv6Pattern = /^[0-9a-fA-F:]+$/;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
  }
  
  /**
   * Check if URL uses HTTPS
   * @param {string} url
   * @returns {boolean}
   */
  static isHTTPS(url) {
    return url.startsWith('https://');
  }
}
