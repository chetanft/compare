import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { BrowserManager } from '../utils/browserManager.js';

/**
 * Live Webpage Style Extractor
 * Uses Puppeteer to extract computed styles from live web pages
 */
export class WebExtractor {
  constructor(config = {}) {
    this.config = {
      headless: "new",
      timeout: 30000,
      viewport: { width: 1200, height: 800 },
      ...config
    };

    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize Puppeteer browser
   */
  async safeNavigate(url) {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Ensure page is ready before navigation
        await this.ensurePageReady();
        
        // Wait a bit more to ensure page is completely ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Attempt navigation using BrowserManager
        await BrowserManager.navigateWithRetry(this.page, url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout || 30000
        });
        
        console.log(`Successfully navigated to: ${url}`);
        return;
      } catch (error) {
        retries++;
        console.log(`Navigation attempt ${retries}/${maxRetries} failed: ${error.message}`);
        
        if (retries >= maxRetries) {
          throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry and re-initialize if needed
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.initialize();
      }
    }
  }

  async ensurePageReady() {
    let initRetries = 0;
    const maxInitRetries = 3;
    
    while (initRetries < maxInitRetries) {
      // Check if browser and page exist and are not closed
      if (!this.browser || !this.page || this.page.isClosed()) {
        console.log('Page not ready, initializing...');
        try {
          await this.initialize();
        } catch (initError) {
          initRetries++;
          console.log(`Initialization failed (attempt ${initRetries}/${maxInitRetries}): ${initError.message}`);
          if (initRetries >= maxInitRetries) {
            throw new Error(`Failed to initialize WebExtractor after ${maxInitRetries} attempts: ${initError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      // Verify page is actually ready by testing basic functionality
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        try {
          // Test basic page functionality without accessing mainFrame
          await this.page.evaluate(() => document.readyState);
          await this.page.evaluate(() => window.location.href);
          console.log('Page is ready and responsive');
          return;
        } catch (error) {
          retries++;
          console.log(`Page not ready (attempt ${retries}/${maxRetries}), waiting...`);
          
          if (retries >= maxRetries) {
            console.log('Page failed to become ready after multiple attempts, will re-initialize...');
            break; // Break inner loop to try re-initialization
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we get here, page readiness checks failed, try re-initialization
      initRetries++;
      this.browser = null;
      this.page = null;
    }
    
    throw new Error('Failed to ensure page readiness after multiple initialization attempts');
  }

  async initialize() {
    try {
      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await this.launchBrowser();
      }

      // Wait for page to be ready
      await this.page.waitForTimeout(500);

      // Create new page
      this.page = await this.browser.newPage();
      await this.page.setViewport(this.config.viewport);
      await this.page.setDefaultTimeout(this.config.timeout);

      // Wait for page to be ready
      await this.page.waitForTimeout(2000);

      // Set up error handlers
      this.page.on('error', error => {
        console.error('❌ Page error:', error);
      });

      this.page.on('pageerror', error => {
        console.error('❌ Page script error:', error);
      });

      // Wait for page to be ready
      await this.page.waitForTimeout(2000);

      // Test page by navigating to about:blank
      await this.page.goto('about:blank');
      await this.page.waitForTimeout(1000);

      console.log('✅ WebExtractor initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing web extractor:', error);
      throw error;
    }
  }

  async authenticateWithCredentials(authConfig) {
    const { loginUrl, username, password, usernameSelector, passwordSelector, submitSelector } = authConfig;
    
    try {
      // Validate required authentication parameters
      if (!loginUrl || !username || !password || !usernameSelector || !passwordSelector || !submitSelector) {
        throw new Error('Missing required authentication parameters. Required: loginUrl, username, password, usernameSelector, passwordSelector, submitSelector');
      }

      // Ensure page is ready for authentication with robust checking
      await this.ensurePageReady();
      
      console.log(`Navigating to login page: ${loginUrl}`);
      await this.safeNavigate(loginUrl);
      
      // Wait for login form to load
      console.log(`Waiting for username selector: ${usernameSelector}`);
      await this.page.waitForSelector(usernameSelector, { timeout: 10000 });
      
      // Fill in credentials
      await this.page.type(usernameSelector, username);
      await this.page.type(passwordSelector, password);
      
      // Submit form
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click(submitSelector)
      ]);
      
      console.log('Authentication successful');
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async authenticateWithCookies(cookies) {
    try {
      if (!Array.isArray(cookies)) {
        throw new Error('Cookies must be an array');
      }
      
      // Set cookies in the browser
      await this.page.setCookie(...cookies);
      console.log(`Set ${cookies.length} authentication cookies`);
      return true;
    } catch (error) {
      console.error('Cookie authentication failed:', error);
      throw new Error(`Cookie authentication failed: ${error.message}`);
    }
  }

  async authenticateWithHeaders(headers) {
    try {
      // Set authentication headers
      await this.page.setExtraHTTPHeaders(headers);
      console.log('Authentication headers set');
      return true;
    } catch (error) {
      console.error('Header authentication failed:', error);
      throw new Error(`Header authentication failed: ${error.message}`);
    }
  }

  async waitForManualLogin(url, options = {}) {
    const { maxWaitTime = 300000, successIndicator } = options; // 5 minutes default
    
    try {
      // Switch to non-headless mode for manual login
      if (this.config.headless) {
        await this.browser.close();
        this.browser = await puppeteer.launch({ 
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport(this.config.viewport);
      }
      
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      console.log('Please complete manual login in the browser window...');
      console.log('The tool will automatically continue once login is detected');
      
      // Wait for login completion
      if (successIndicator) {
        await this.page.waitForSelector(successIndicator, { timeout: maxWaitTime });
      } else {
        // Wait for URL change or specific time
        await new Promise(resolve => {
          const startUrl = this.page.url();
          const checkInterval = setInterval(async () => {
            const currentUrl = this.page.url();
            if (currentUrl !== startUrl) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 2000);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, maxWaitTime);
        });
      }
      
      console.log('Manual login completed');
      return true;
    } catch (error) {
      console.error('Manual login failed:', error);
      throw new Error(`Manual login failed: ${error.message}`);
    }
  }

  async waitForPageLoad(options = {}) {
    const defaultTimeout = 60000; // 60 seconds
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await Promise.race([
          this.page.waitForNavigation({
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: options.timeout || defaultTimeout
          }),
          // Fallback timer
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Navigation timeout')), 
            (options.timeout || defaultTimeout) + 5000)
          )
        ]);
        
        // Additional wait for dynamic content
        await this.page.waitForFunction(
          () => document.readyState === 'complete' &&
                (!window.System || !window.System._pendingLoads || window.System._pendingLoads.size === 0),
          { timeout: options.timeout || defaultTimeout }
        );
        
        return true;
      } catch (error) {
        console.warn(`Navigation attempt ${attempt}/${maxRetries} failed:`, error.message);
        lastError = error;
        
        if (attempt === maxRetries) {
          throw new Error(`Navigation failed after ${maxRetries} attempts: ${lastError.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async extractFromUrl(url, options = {}) {
    const {
      selector = null,
      authentication = null,
      waitForElement = null,
      screenshot = true,
      customActions = null
    } = options;

    try {
      // Ensure browser and page are properly initialized
      await this.ensurePageReady();

      // Handle authentication if provided
      if (authentication) {
        console.log('🔐 Authentication required - ensuring browser is ready...');
        await this.ensurePageReady();
        try {
          await this.handleAuthentication(authentication, url);
        } catch (authError) {
          console.warn('🔐 Authentication failed, attempting to continue without authentication:', authError.message);
          // Continue execution - many sites can be accessed without authentication for public pages
        }
      }

      // Navigate to target URL
      console.log(`Navigating to: ${url}`);
      await this.safeNavigate(url);

      // Wait for specific element if requested
      if (waitForElement) {
        await this.page.waitForSelector(waitForElement, { timeout: 10000 });
      }

      // Execute custom actions if provided
      if (customActions && typeof customActions === 'function') {
        await customActions(this.page);
      }

      // Extract styles from specific selector or entire page
      let elements;
      if (selector) {
        elements = await this.page.$$(selector);
        if (elements.length === 0) {
          throw new Error(`No elements found for selector: ${selector}`);
        }
      } else {
        // Get all visible elements with meaningful styles
        elements = await this.page.$$('*:not(script):not(style):not(meta):not(title)');
      }

      const extractedData = {
        url,
        extractedAt: new Date().toISOString(),
        authentication: authentication ? 'enabled' : 'none',
        elements: []
      };

      // Extract styles from each element
      for (let i = 0; i < Math.min(elements.length, 100); i++) { // Limit to 100 elements
        try {
          const elementData = await this.extractElementStyles(elements[i], i);
          if (elementData && Object.keys(elementData.styles).length > 0) {
            extractedData.elements.push(elementData);
          }
        } catch (error) {
          console.warn(`Failed to extract styles from element ${i}:`, error.message);
        }
      }

      // Take screenshot if requested
      if (screenshot) {
        extractedData.screenshot = await this.takeScreenshot(selector);
      }

      console.log(`Extracted styles from ${extractedData.elements.length} elements`);
      return extractedData;

    } catch (error) {
      console.error('Extraction failed:', error);
      throw error;
    }
  }

  async handleAuthentication(authentication, targetUrl) {
    if (!authentication || !authentication.type) {
      console.log('🔐 No authentication required, skipping...');
      return;
    }

    const { type, ...authConfig } = authentication;
    console.log(`🔐 Handling ${type} authentication...`);

    switch (type) {
      case 'credentials':
        // Validate credentials auth config before proceeding
        if (!authConfig.loginUrl || !authConfig.username || !authConfig.password || 
            !authConfig.usernameSelector || !authConfig.passwordSelector || !authConfig.submitSelector) {
          throw new Error('Credentials authentication requires: loginUrl, username, password, usernameSelector, passwordSelector, submitSelector');
        }
        await this.authenticateWithCredentials(authConfig);
        break;
      
      case 'cookies':
        await this.authenticateWithCookies(authConfig.cookies);
        break;
      
      case 'headers':
        await this.authenticateWithHeaders(authConfig.headers);
        break;
      
      case 'manual':
        await this.waitForManualLogin(targetUrl, authConfig);
        break;
      
      case 'session':
        // Handle session-based auth (navigate to session URL first)
        if (authConfig.sessionUrl) {
          await this.page.goto(authConfig.sessionUrl, { waitUntil: 'networkidle2' });
        }
        break;
      
      default:
        throw new Error(`Unsupported authentication type: ${type}`);
    }
  }

  async extractElementStyles(element, index) {
    try {
      const elementInfo = await this.page.evaluate((el, idx) => {
        const computedStyles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Skip invisible elements
        if (rect.width === 0 || rect.height === 0 || computedStyles.display === 'none') {
          return null;
        }

        return {
          index: idx,
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          textContent: el.textContent ? el.textContent.trim().substring(0, 100) : null,
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          styles: {
            // Typography
            fontFamily: computedStyles.fontFamily,
            fontSize: computedStyles.fontSize,
            fontWeight: computedStyles.fontWeight,
            lineHeight: computedStyles.lineHeight,
            letterSpacing: computedStyles.letterSpacing,
            textAlign: computedStyles.textAlign,
            color: computedStyles.color,
            
            // Layout
            display: computedStyles.display,
            position: computedStyles.position,
            top: computedStyles.top,
            left: computedStyles.left,
            right: computedStyles.right,
            bottom: computedStyles.bottom,
            width: computedStyles.width,
            height: computedStyles.height,
            
            // Spacing
            margin: computedStyles.margin,
            marginTop: computedStyles.marginTop,
            marginRight: computedStyles.marginRight,
            marginBottom: computedStyles.marginBottom,
            marginLeft: computedStyles.marginLeft,
            padding: computedStyles.padding,
            paddingTop: computedStyles.paddingTop,
            paddingRight: computedStyles.paddingRight,
            paddingBottom: computedStyles.paddingBottom,
            paddingLeft: computedStyles.paddingLeft,
            
            // Background & Border
            backgroundColor: computedStyles.backgroundColor,
            backgroundImage: computedStyles.backgroundImage,
            border: computedStyles.border,
            borderRadius: computedStyles.borderRadius,
            borderWidth: computedStyles.borderWidth,
            borderStyle: computedStyles.borderStyle,
            borderColor: computedStyles.borderColor,
            
            // Effects
            boxShadow: computedStyles.boxShadow,
            opacity: computedStyles.opacity,
            transform: computedStyles.transform,
            
            // Flexbox
            flexDirection: computedStyles.flexDirection,
            justifyContent: computedStyles.justifyContent,
            alignItems: computedStyles.alignItems,
            gap: computedStyles.gap
          }
        };
      }, element, index);

      return elementInfo;
    } catch (error) {
      console.warn(`Failed to extract element styles:`, error);
      return null;
    }
  }

  async takeScreenshot(selector = null) {
    try {
      let screenshotBuffer;
      
      if (selector) {
        const element = await this.page.$(selector);
        if (element) {
          screenshotBuffer = await element.screenshot({ type: 'png' });
        } else {
          console.warn(`Selector ${selector} not found, taking full page screenshot`);
          screenshotBuffer = await this.page.screenshot({ type: 'png', fullPage: true });
        }
      } else {
        screenshotBuffer = await this.page.screenshot({ type: 'png', fullPage: true });
      }

      // Optimize screenshot with sharp
      const optimizedBuffer = await sharp(screenshotBuffer)
        .png({ quality: 80, compressionLevel: 6 })
        .toBuffer();

      return {
        buffer: optimizedBuffer,
        base64: optimizedBuffer.toString('base64'),
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }

  async getAuthenticationState() {
    try {
      const cookies = await this.page.cookies();
      const localStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage[key] = localStorage.getItem(key);
        }
        return storage;
      });
      
      return {
        cookies,
        localStorage,
        url: this.page.url()
      };
    } catch (error) {
      console.error('Failed to get authentication state:', error);
      return null;
    }
  }

  /**
   * Extract web data for comparison with Figma designs
   * This is the main method called by the comparison engine
   * @param {string} url - Target webpage URL
   * @param {Object} authentication - Authentication configuration
   * @returns {Object} Extracted web data in standard format
   */
  async extractWebData(url, authentication = null, options = {}) {
    try {
      await this.initialize();
      await this.handleModuleLoadingErrors();
      
      // Navigate to URL with proper timeout handling
      await this.page.goto(url, { waitUntil: 'networkidle0' });
      await this.waitForPageLoad(options);
      
      // Extract elements with error handling
      const elements = await this.extractElements(this.page);
      
      return {
        url,
        elements,
        metadata: {
          timestamp: new Date().toISOString(),
          extractionMethod: 'enhanced'
        }
      };
    } catch (error) {
      console.error('Web extraction error:', error);
      throw error;
    }
  }

  /**
   * Handle page crash by attempting to recover or create a new page
   */
  async handlePageCrash(page) {
    try {
      // Try to close the crashed page
      await page.close().catch(() => {});
      
      // Create a new page
      const newPage = await this.createPage();
      
      // Return the new page
      return newPage;
    } catch (error) {
      console.error('❌ Failed to handle page crash:', error);
      throw error;
    }
  }

  /**
   * Create a new page with error handling
   */
  async createPage() {
    try {
      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      });

      // Enable request interception
      await page.setRequestInterception(true);

      // Handle requests
      page.on('request', (request) => {
        // Block unnecessary resources
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });

      return page;
    } catch (error) {
      console.error('❌ Failed to create page:', error);
      throw error;
    }
  }

  /**
   * Generate a CSS selector for an element
   * @param {Object} element - Element data
   * @returns {string} CSS selector
   */
  generateCSSSelector(element) {
    let selector = element.tagName;
    
    if (element.id) {
      selector = `#${element.id}`;
    } else if (element.className) {
      // Handle both string and DOMTokenList className
      const classString = typeof element.className === 'string' ? 
        element.className : 
        Array.from(element.className).join(' ');
      
      const classes = classString.split(' ').filter(c => c.trim()).slice(0, 2);
      if (classes.length > 0) {
        selector = `${element.tagName}.${classes.join('.')}`;
      }
    }
    
    return selector;
  }

  async close() {
    try {
      if (this.browser) {
        await BrowserManager.closeBrowserSafely(this.browser);
        this.browser = null;
        this.page = null;
        console.log('✅ WebExtractor closed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to close WebExtractor:', error);
      // Force cleanup if normal close fails
      await BrowserManager.cleanupOrphanedProcesses();
    }
  }

  /**
   * Navigate to URL and extract component styles
   * @param {string} url - Target webpage URL
   * @param {string} selector - CSS selector for the component
   * @param {Object} options - Additional options
   * @returns {Object} Extracted style data
   */
  async extractStyles(url, selector, options = {}) {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      console.log(`Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.puppeteer?.timeout || 30000
      });

      // Wait for specific selector if provided
      if (selector) {
        await this.page.waitForSelector(selector, { timeout: 10000 });
      }

      // Extract computed styles
      const styleData = await this.page.evaluate((sel, props) => {
        const element = sel ? document.querySelector(sel) : document.body;
        
        if (!element) {
          throw new Error(`Element not found: ${sel}`);
        }

        const computedStyles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Extract all relevant CSS properties
        const extractedStyles = {
          selector: sel,
          tagName: element.tagName.toLowerCase(),
          properties: {},
          dimensions: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          },
          text: element.textContent?.trim() || ''
        };

        // Extract typography properties
        extractedStyles.properties.typography = {
          fontFamily: computedStyles.fontFamily,
          fontSize: parseFloat(computedStyles.fontSize),
          fontWeight: computedStyles.fontWeight,
          letterSpacing: computedStyles.letterSpacing,
          lineHeight: computedStyles.lineHeight,
          textAlign: computedStyles.textAlign,
          textDecoration: computedStyles.textDecoration,
          textTransform: computedStyles.textTransform
        };

        // Extract color properties
        extractedStyles.properties.colors = {
          color: computedStyles.color,
          backgroundColor: computedStyles.backgroundColor,
          borderColor: computedStyles.borderColor
        };

        // Extract spacing properties
        extractedStyles.properties.spacing = {
          paddingTop: parseFloat(computedStyles.paddingTop),
          paddingRight: parseFloat(computedStyles.paddingRight),
          paddingBottom: parseFloat(computedStyles.paddingBottom),
          paddingLeft: parseFloat(computedStyles.paddingLeft),
          marginTop: parseFloat(computedStyles.marginTop),
          marginRight: parseFloat(computedStyles.marginRight),
          marginBottom: parseFloat(computedStyles.marginBottom),
          marginLeft: parseFloat(computedStyles.marginLeft)
        };

        // Extract border properties
        extractedStyles.properties.border = {
          borderRadius: computedStyles.borderRadius,
          borderWidth: computedStyles.borderWidth,
          borderStyle: computedStyles.borderStyle,
          borderColor: computedStyles.borderColor
        };

        // Extract shadow properties
        extractedStyles.properties.effects = {
          boxShadow: computedStyles.boxShadow,
          textShadow: computedStyles.textShadow,
          opacity: parseFloat(computedStyles.opacity)
        };

        // Extract layout properties
        extractedStyles.properties.layout = {
          display: computedStyles.display,
          position: computedStyles.position,
          zIndex: computedStyles.zIndex,
          overflow: computedStyles.overflow,
          visibility: computedStyles.visibility
        };

        // Extract flex/grid properties if applicable
        if (computedStyles.display.includes('flex')) {
          extractedStyles.properties.flexbox = {
            flexDirection: computedStyles.flexDirection,
            justifyContent: computedStyles.justifyContent,
            alignItems: computedStyles.alignItems,
            flexWrap: computedStyles.flexWrap,
            gap: computedStyles.gap
          };
        }

        if (computedStyles.display.includes('grid')) {
          extractedStyles.properties.grid = {
            gridTemplateColumns: computedStyles.gridTemplateColumns,
            gridTemplateRows: computedStyles.gridTemplateRows,
            gap: computedStyles.gap,
            gridGap: computedStyles.gridGap
          };
        }

        return extractedStyles;
      }, selector, this.config.comparison?.properties || []);

      // Take screenshot of the component
      let screenshotPath = null;
      if (options.takeScreenshot !== false) {
        screenshotPath = await this.takeComponentScreenshot(selector, options);
      }

      return {
        url,
        selector,
        styles: styleData,
        screenshotPath,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error extracting styles from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Take screenshot of specific component
   * @param {string} selector - CSS selector for the component
   * @param {Object} options - Screenshot options
   * @returns {string} Screenshot file path
   */
  async takeComponentScreenshot(selector, options = {}) {
    try {
      const outputDir = options.outputDir || this.config.output?.screenshotDir || './output/screenshots';
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `component-${timestamp}.png`;
      const screenshotPath = path.join(outputDir, filename);

      if (selector) {
        // Screenshot specific element
        const element = await this.page.$(selector);
        if (element) {
          await element.screenshot({ 
            path: screenshotPath,
            type: 'png'
          });
        } else {
          console.warn(`Element not found for screenshot: ${selector}`);
          return null;
        }
      } else {
        // Full page screenshot
        await this.page.screenshot({ 
          path: screenshotPath,
          type: 'png',
          fullPage: true
        });
      }

      console.log(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;

    } catch (error) {
      console.error('Error taking screenshot:', error);
      return null;
    }
  }

  /**
   * Extract styles from multiple components on the same page
   * @param {string} url - Target webpage URL
   * @param {Array} selectors - Array of CSS selectors
   * @returns {Array} Array of extracted style data
   */
  async extractMultipleComponents(url, selectors) {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      console.log(`Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.puppeteer?.timeout || 30000
      });

      const results = [];

      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`Extracting styles for: ${selector}`);

        try {
          const styleData = await this.extractStyles(url, selector, {
            takeScreenshot: true,
            filename: `component-${i + 1}-${Date.now()}.png`
          });
          results.push(styleData);
        } catch (error) {
          console.error(`Failed to extract styles for ${selector}:`, error);
          results.push({
            selector,
            error: error.message,
            extractedAt: new Date().toISOString()
          });
        }
      }

      return results;

    } catch (error) {
      console.error(`Error extracting multiple components from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get element information without full style extraction
   * @param {string} url - Target webpage URL
   * @param {string} selector - CSS selector
   * @returns {Object} Basic element information
   */
  async getElementInfo(url, selector) {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.page.waitForSelector(selector, { timeout: 10000 });

      const elementInfo = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
          tagName: element.tagName.toLowerCase(),
          className: element.className,
          id: element.id,
          text: element.textContent?.trim(),
          dimensions: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          },
          exists: true
        };
      }, selector);

      return elementInfo;

    } catch (error) {
      console.error(`Error getting element info for ${selector}:`, error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Save extracted data to file
   * @param {Object} data - Extracted style data
   * @param {string} outputPath - Output file path
   */
  async saveToFile(data, outputPath) {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`Web style data saved to: ${outputPath}`);
  }

  /**
   * Clean up browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('Browser closed');
    }
  }

  /**
   * Convert RGB/RGBA color to hex
   * @param {string} color - RGB or RGBA color string
   * @returns {string} Hex color string
   */
  rgbToHex(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return 'transparent';
    }

    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return color;
  }

  async handleModuleLoadingErrors() {
    await this.page.evaluateOnNewDocument(() => {
      // Intercept all module loading errors
      window.addEventListener('error', (event) => {
        if (event.message.includes('@ft-mf/') || 
            event.message.includes('SystemJS') ||
            event.message.includes('LOADING_SOURCE_CODE')) {
          console.warn('Module loading error intercepted:', event.message);
          event.preventDefault();
          return false;
        }
      });

      // Override SystemJS import
      if (window.System) {
        const originalSystemImport = window.System.import;
        window.System.import = async function(...args) {
          try {
            return await originalSystemImport.apply(this, args);
          } catch (error) {
            console.warn('SystemJS import error:', error.message);
            // Return empty module to prevent crashes
            return {
              __esModule: true,
              default: {},
            };
          }
        };
      }

      // Intercept Google Maps API errors
      const originalConsoleWarn = console.warn;
      console.warn = function(...args) {
        const message = args.join(' ');
        if (message.includes('Google Maps JavaScript API')) {
          // Suppress Google Maps warnings
          return;
        }
        originalConsoleWarn.apply(this, args);
      };
    });
  }

  /**
   * Handle console messages and errors
   */
  async setupConsoleHandling() {
    this.page.on('console', async (msg) => {
      const text = msg.text();
      const type = msg.type();

      // Filter out non-critical warnings
      if (this.isNonCriticalWarning(text)) {
        return;
      }

      // Log critical errors and warnings
      if (type === 'error' || this.isCriticalWarning(text)) {
        console.log(`🔍 Page ${type}:`, text);
      }
    });

    this.page.on('pageerror', (error) => {
      if (this.isCriticalError(error.message)) {
        console.log('❌ Page script error:', error);
      }
    });
  }

  /**
   * Check if a warning is non-critical
   */
  isNonCriticalWarning(message) {
    const nonCriticalPatterns = [
      'Google Maps JavaScript API',
      'InvalidKey',
      'libraries is unknown',
      '@ft-mf/login',
      '@ft-mf/parent',
      'LOADING_SOURCE_CODE',
      'Failed to load resource: the server responded with a status of 404'
    ];

    return nonCriticalPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if a warning is critical
   */
  isCriticalWarning(message) {
    const criticalPatterns = [
      'SecurityError',
      'Fatal Error',
      'Uncaught Exception',
      'Memory limit exceeded',
      'Browser disconnected'
    ];

    return criticalPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if an error is critical
   */
  isCriticalError(message) {
    const criticalPatterns = [
      'Page crashed',
      'Browser disconnected',
      'Session closed',
      'Target closed',
      'Memory limit exceeded'
    ];

    return criticalPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Launch browser with proper cleanup and setup
   */
  async launchBrowser() {
    console.log('🔍 Checking browser environment...');
    const browserInfo = await BrowserManager.getBrowserInfo();
    console.log(`📊 Current browser processes: ${browserInfo.runningProcesses}`);
    
    if (!browserInfo.isClean) {
      console.log('🧹 Cleaning up orphaned processes...');
      await BrowserManager.cleanupOrphanedProcesses();
    }

    console.log('🚀 Launching browser...');
    const browser = await BrowserManager.createBrowser({
      headless: this.config.headless === true ? "new" : this.config.headless,
      timeout: 60000,
      viewport: this.config.viewport
    });

    // Wait for browser to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    return browser;
  }
}

// Helper function for creating authentication configurations
export const createAuthConfig = {
  credentials: (loginUrl, username, password, selectors = {}) => ({
    type: 'credentials',
    loginUrl,
    username,
    password,
    usernameSelector: selectors.username || 'input[type="email"], input[name="username"], input[name="email"]',
    passwordSelector: selectors.password || 'input[type="password"], input[name="password"]',
    submitSelector: selectors.submit || 'button[type="submit"], input[type="submit"], .login-button'
  }),

  cookies: (cookies) => ({
    type: 'cookies',
    cookies: Array.isArray(cookies) ? cookies : [cookies]
  }),

  headers: (headers) => ({
    type: 'headers',
    headers
  }),

  manual: (options = {}) => ({
    type: 'manual',
    maxWaitTime: options.maxWaitTime || 300000,
    successIndicator: options.successIndicator || null
  }),

  session: (sessionUrl) => ({
    type: 'session',
    sessionUrl
  })
};

/**
 * Get the optimal web extractor based on requirements
 * @param {Object} config - Configuration object
 * @returns {Object} Web extractor instance
 */
export async function getOptimalWebExtractor(config = {}) {
  // For now, always return EnhancedWebExtractor since it provides better component analysis
  try {
    const { EnhancedWebExtractor } = await import('./enhancedWebExtractor.js');
    return new EnhancedWebExtractor(config);
  } catch (error) {
    console.warn('Failed to load EnhancedWebExtractor, falling back to basic WebExtractor:', error.message);
    return new WebExtractor(config);
  }
} 