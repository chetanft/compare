/**
 * Navigation Handler Module
 * Handles page navigation with retry strategies and timeout management
 */

/**
 * Navigate to page with multiple retry strategies
 * @param {Object} page - Puppeteer page object
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @param {Object} config - Configuration object
 */
export async function navigateToPage(page, url, options = {}, config = {}) {
  const maxRetries = 3;
  const baseTimeout = Math.max(config?.timeouts?.webExtraction || 30000, 45000);
  const isFreightTiger = url.includes('freighttiger.com');
  
  // For FreightTiger, use fixed timeouts; for others, use deadline-aware timeouts
  let mkTimeout;
  if (isFreightTiger) {
    mkTimeout = () => baseTimeout;
  } else {
    const deadlineTs = options._deadlineTs;
    const timeLeft = () => (deadlineTs ? Math.max(2000, deadlineTs - Date.now() - 500) : baseTimeout);
    mkTimeout = () => Math.min(baseTimeout, timeLeft());
  }

  const strategies = isFreightTiger
    ? [
        { waitUntil: 'domcontentloaded', timeout: mkTimeout() },
        { waitUntil: 'networkidle0', timeout: mkTimeout() },
        { waitUntil: 'load', timeout: mkTimeout() }
      ]
    : [
        { waitUntil: 'networkidle0', timeout: mkTimeout() },
        { waitUntil: 'domcontentloaded', timeout: mkTimeout() },
        { waitUntil: 'load', timeout: mkTimeout() }
      ];

  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const strategy = strategies[attempt] || strategies[strategies.length - 1];
    
    try {
      console.log(`🔗 Navigation attempt ${attempt + 1}/${maxRetries} with ${strategy.waitUntil}`);
      await page.goto(url, strategy);
      console.log(`✅ Navigation successful with ${strategy.waitUntil}`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Navigation attempt ${attempt + 1} failed: ${error.message}`);
      
      if (attempt < maxRetries - 1) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error(`Navigation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Wait for page to stabilize (handle SPAs and dynamic content)
 * @param {Object} page - Puppeteer page object
 * @param {Object} options - Stability options
 */
export async function waitForPageStability(page, options = {}) {
  const isFreightTiger = page.url().includes('freighttiger.com');
  const defaultStabilityTimeout = isFreightTiger ? 30000 : 5000;
  const stabilityTimeout = isFreightTiger ? 30000 : (options.stabilityTimeout || defaultStabilityTimeout);
  
  console.log(`⏱️ Using stability timeout: ${stabilityTimeout}ms (FreightTiger: ${isFreightTiger})`);
  
  try {
    // Check if this looks like a JavaScript-heavy site
    const isJSHeavy = await page.evaluate(() => {
      return !!(window.React || window.Vue || window.Angular || 
               document.querySelector('[data-reactroot], [data-vue], .ng-app') ||
               document.scripts.length > 10);
    });

    if (isJSHeavy) {
      console.log('🔍 Detected JS-heavy site, waiting for stability...');
      
      // Wait for loading indicators to disappear
      try {
        await page.waitForFunction(() => {
          const loadingIndicators = document.querySelectorAll(
            '.loading, .spinner, [class*="loading"], [class*="spinner"], .loader'
          );
          return loadingIndicators.length === 0 || 
                 Array.from(loadingIndicators).every(el => 
                   getComputedStyle(el).display === 'none' || 
                   getComputedStyle(el).visibility === 'hidden'
                 );
        }, { timeout: stabilityTimeout });
      } catch (e) {
        console.log('⚠️ Loading indicator check timed out');
      }

      // Wait for meaningful content
      try {
        await page.waitForFunction(() => {
          const meaningfulElements = document.querySelectorAll(
            'h1, h2, h3, p, article, section, main, [role="main"]'
          );
          return meaningfulElements.length > 3;
        }, { timeout: stabilityTimeout });
      } catch (e) {
        console.log('⚠️ Content detection timed out');
      }

      // Final fallback: ensure there is a reasonable number of nodes in DOM
      try {
        await page.waitForFunction(() => document.querySelectorAll('body *').length > 50, { timeout: stabilityTimeout });
      } catch (_) { /* ignore */ }
    }
    
    // Additional stability wait
    await new Promise(resolve => setTimeout(resolve, 1200));
    
  } catch (error) {
    console.warn('⚠️ Page stability check failed:', error.message);
  }
}

/**
 * Apply minimal stealth evasions to reduce detection
 * @param {Object} page - Puppeteer page object
 */
export async function applyStealth(page) {
  try {
    await page.evaluateOnNewDocument(() => {
      // webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // plugins
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      // languages
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
  } catch (_) { /* ignore */ }
}

/**
 * Validate URL for security and format
 * @param {string} url - URL to validate
 * @param {Object} config - Security configuration
 */
export function validateUrl(url, config = {}) {
  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    // Check for security restrictions if configured
    const allowedHosts = config?.security?.allowedHosts || [];
    if (allowedHosts.length > 0) {
      const hostname = parsed.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname);
      
      if (isLocalhost || isPrivateIP) {
        const isAllowed = allowedHosts.some(allowed => hostname.includes(allowed));
        if (!isAllowed) {
          throw new Error('URL not in allowed hosts list');
        }
      }
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}
