/**
 * Unified Web Extractor
 * Combines the best features of EnhancedWebExtractor and WebExtractorV2
 * with improved architecture, cross-platform support, and proper resource management
 */

import { getBrowserPool } from '../browser/BrowserPool.js';
import { getResourceManager } from '../utils/ResourceManager.js';
import { loadConfig } from '../config/index.js';
import { EnhancedAuthentication } from './EnhancedAuthentication.js';
import { colorElementMapping } from '../services/ColorElementMappingService.js';

export class UnifiedWebExtractor {
  constructor() {
    this.browserPool = getBrowserPool();
    this.resourceManager = getResourceManager();
    this.config = null;
    this.activeExtractions = new Map(); // extractionId -> { pageId, controller, startTime }
  }

  async initialize() {
    if (!this.config) {
      this.config = await loadConfig();
      console.log('🔧 UnifiedWebExtractor initialized');
    }
  }

  /**
   * Extract web data with improved architecture and error handling
   */
  async extractWebData(url, options = {}) {
    await this.initialize();
    
    const extractionId = this.generateExtractionId();
    const controller = new AbortController();
    const startTime = Date.now();
    
    // Set up timeout with special handling for FreightTiger (longer for SystemJS loading)
    const isFreightTiger = url.includes('freighttiger.com');
    const defaultTimeout = isFreightTiger ? 180000 : (this.config?.timeouts?.webExtraction || 30000); // 3 minutes for FreightTiger
    const actualTimeout = options.timeout || defaultTimeout;
    // Don't propagate deadline for FreightTiger - it needs flexible timeouts
    if (!isFreightTiger) {
      const deadlineTs = startTime + actualTimeout;
      options._deadlineTs = deadlineTs;
    }
    
    console.log(`⏱️ Setting extraction timeout: ${actualTimeout}ms (FreightTiger: ${isFreightTiger})`);
    
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Extraction deadline reached for: ${url}`);
      controller.abort();
    }, actualTimeout);

    try {
      console.log(`🌐 Starting unified extraction from: ${url}`);
      
      // Validate URL
      this.validateUrl(url);
      
      // Create managed page through browser pool with enhanced options for FreightTiger
      const { page, pageId } = await this.browserPool.createPage({
        width: options.viewport?.width || 1920,
        height: options.viewport?.height || 1080,
        userAgent: options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // CRITICAL: Mark page as active immediately to prevent cleanup race condition
      this.browserPool.markPageActive(pageId);

      // Apply lightweight stealth to reduce automation detection
      await this.applyStealth(page);

      // Enhanced page configuration for complex SPAs
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(30000);
      
      // Track whether we enabled interception so we can restore later
      let interceptionEnabled = false;

      // FreightTiger requires full assets (SystemJS/microfrontends). Do not block resources.
      if (url.includes('freighttiger.com')) {
        console.log('🚛 Configuring for FreightTiger - allowing all resources (no interception)');
      }

      // Track extraction (page already marked active above)
      this.activeExtractions.set(extractionId, { 
        pageId, 
        controller, 
        startTime, 
        url 
      });

      // Track extraction in resource manager
      this.resourceManager.track(extractionId, controller, 'extraction', {
        url,
        pageId,
        startTime
      });

      // Set up abort handling
      const abortPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Extraction aborted due to timeout'));
        });
      });

      // Navigate to page with retry logic
      try {
        await Promise.race([
          this.navigateToPage(page, url, options),
          abortPromise
        ]);
      } catch (navError) {
        // Handle flaky navigation errors by recreating page once
        const msg = navError?.message || '';
        if (msg.includes('Requesting main frame too early') || msg.includes('frame was detached')) {
          console.warn('⚠️ Navigation failed due to frame state; recreating page and retrying...');
          await this.browserPool.closePage(pageId);
          const fresh = await this.browserPool.createPage({
            width: options.viewport?.width || 1920,
            height: options.viewport?.height || 1080
          });
          // Best-effort: reapply interception if needed
          if (interceptionEnabled) {
            await fresh.page.setRequestInterception(true);
            fresh.page.on('request', (request) => {
              const resourceType = request.resourceType();
              if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                request.abort();
              } else {
                request.continue();
              }
            });
          }
          // Update tracking to use fresh page
          this.activeExtractions.set(extractionId, { pageId: fresh.pageId, controller, startTime, url });
          await Promise.race([
            this.navigateToPage(fresh.page, url, options),
            abortPromise
          ]);
        } else {
          throw navError;
        }
      }

      // Handle authentication if provided
      if (options.authentication) {
        if (url.includes('freighttiger.com')) {
          console.log('🚛 Using FreightTiger-specific authentication flow');
          // FreightTiger authentication can take a long time due to complex login flow
          // Don't abort it with the timeout - let it complete naturally
          await this.handleFreightTigerAuthentication(page, options.authentication, url);
        } else {
          await Promise.race([
            this.handleAuthentication(page, options.authentication),
            abortPromise
          ]);
          
          // After authentication, check if we need to navigate to target URL
          const currentUrl = page.url();
          if (options.authentication.targetUrl && currentUrl !== options.authentication.targetUrl) {
            console.log(`🔗 Navigating to target URL after authentication: ${options.authentication.targetUrl}`);
            await Promise.race([
              this.navigateToPage(page, options.authentication.targetUrl, options),
              abortPromise
            ]);
          }
        }
      }

      // Wait for page to stabilize
      await this.waitForPageStability(page, options);

      // Extract data with enhanced error handling for navigation
      let extractionResult;
      try {
        // Check if page and browser are still connected before extraction
        if (page.isClosed()) {
          throw new Error('Page was closed before extraction could begin');
        }
        
        const browser = page.browser();
        if (!browser.isConnected()) {
          throw new Error('Browser disconnected before extraction');
        }
        
        // Do not race the actual extraction with the abort signal.
        // If the deadline triggers while we already collect DOM, allow extraction to finish.
        extractionResult = await this.performExtraction(page, url, options);
      } catch (error) {
        if (error.message.includes('Execution context was destroyed')) {
          console.log('🔄 Page navigated during extraction, retrying...');
          // Wait a bit for navigation to complete
          await new Promise(resolve => setTimeout(resolve, 3000));
          // Retry extraction
          extractionResult = await this.performExtraction(page, page.url(), options);
        } else {
          throw error;
        }
      }

      // FreightTiger fallback: if zero elements, try extracting from same-domain child frame URLs directly
      if ((extractionResult?.elements?.length || 0) === 0 && isFreightTiger) {
        try {
          const frameUrls = Array.from(new Set(
            page.frames()
              .map(f => {
                try { return f.url(); } catch { return ''; }
              })
              .filter(u => u && /^https?:\/\//.test(u))
              .filter(u => new URL(u).hostname.endsWith('freighttiger.com'))
              .filter(u => !u.includes('/login'))
          )).slice(0, 3);

          if (frameUrls.length > 0) {
            console.log('🔗 Trying direct extraction from child frame URLs:', frameUrls);
            for (const fUrl of frameUrls) {
              try {
                const { page: childPage, pageId: childPageId } = await this.browserPool.createPage({
                  width: options.viewport?.width || 1920,
                  height: options.viewport?.height || 1080,
                });
                await Promise.race([
                  this.navigateToPage(childPage, fUrl, options),
                  abortPromise
                ]);
                const childResult = await Promise.race([
                  this.performExtraction(childPage, fUrl, options),
                  abortPromise
                ]);
                await this.browserPool.closePage(childPageId);
                if ((childResult?.elements?.length || 0) > 0) {
                  console.log(`✅ Extracted ${childResult.elements.length} elements from child frame URL: ${fUrl}`);
                  extractionResult = childResult;
                  break;
                }
              } catch (childErr) {
                console.warn('⚠️ Child frame extraction failed:', childErr.message);
              }
            }
          } else {
            console.log('ℹ️ No candidate child frame URLs found for fallback extraction');
          }
        } catch (fallbackErr) {
          console.warn('⚠️ Fallback frame URL extraction failed:', fallbackErr.message);
        }
      }

      // Capture screenshot if requested
      let screenshot = null;
      if (options.includeScreenshot !== false) {
        try {
          screenshot = await Promise.race([
            this.captureScreenshot(page, options.screenshot),
            abortPromise
          ]);
        } catch (screenshotError) {
          console.warn('📸 Screenshot capture failed:', screenshotError.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Extraction completed in ${duration}ms: ${url}`);

      return {
        url,
        extractedAt: new Date().toISOString(),
        duration,
        screenshot,
        ...extractionResult
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Extraction failed after ${duration}ms: ${error.message}`);
      throw new Error(`Web extraction failed: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
      await this.cleanup(extractionId);
    }
  }

  /**
   * Validate URL for security and format
   */
  validateUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Check for security restrictions if configured
      if (this.config.security.allowedHosts.length > 0) {
        const hostname = parsed.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname);
        
        if (isLocalhost || isPrivateIP) {
          const isAllowed = this.config.security.allowedHosts.some(allowed => 
            hostname.includes(allowed)
          );
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

  /**
   * Navigate to page with multiple retry strategies
   */
  async navigateToPage(page, url, options) {
    const maxRetries = 3;
    const baseTimeout = Math.max(this.config?.timeouts?.webExtraction || 30000, 45000);
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
   * FreightTiger-specific authentication handler
   */
  async handleFreightTigerAuthentication(page, auth, targetUrl) {
    console.log('🚛 Starting FreightTiger authentication process...');
    
    try {
      // Step 1: Navigate to login page if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        console.log('🔗 Navigating to FreightTiger login page...');
        await page.goto('https://www.freighttiger.com/login', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      }

      // Step 2: Wait for login form (supports iframes) and ensure correct tab
      console.log('⏳ Waiting for login form to load...');
      const getLoginFrame = async () => {
        // Search all frames for known login fields
        const frames = page.frames();
        for (const frame of frames) {
          try {
            if (await frame.$('#username') || await frame.$('#password') || await frame.$('input[type="password"]')) {
              return frame;
            }
          } catch (_) { /* ignore */ }
        }
        return null;
      };
      
      // Poll for a login-capable context (page or frame)
      let loginCtx = null;
      const waitStart = Date.now();
      while (!loginCtx && Date.now() - waitStart < 20000) {
        loginCtx = await getLoginFrame();
        if (!loginCtx) {
          // Also accept presence of any input on main page
          try {
            await page.waitForSelector('input', { timeout: 500 });
            loginCtx = page;
            break;
          } catch (_) {
            // keep waiting
          }
        }
      }
      if (!loginCtx) {
        throw new Error('Login form not found in page or iframes');
      }
      
      // Step 2.5: Ensure we're on the "with Password" tab
      console.log('🔍 Ensuring "with Password" tab is selected...');
      
      // DEBUG: Capture screenshot of login page
      try {
        const loginScreenshot = await page.screenshot({ encoding: 'base64' });
        console.log('📸 Login page screenshot captured (base64 length:', loginScreenshot.length, ')');
      } catch (e) {
        console.log('⚠️ Could not capture login screenshot');
      }
      
      // DEBUG: Analyze login page structure
      const loginPageAnalysis = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          id: btn.id
        }));
        const allInputs = Array.from(document.querySelectorAll('input')).map(inp => ({
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          className: inp.className
        }));
        return { buttons: allButtons, inputs: allInputs, title: document.title, url: window.location.href };
      });
      console.log('🔍 Login page analysis:', JSON.stringify(loginPageAnalysis, null, 2));
      
      try {
        // Look for the "with Password" tab - it might be a div, span, or other element, not just button
        console.log('🔍 Looking for "with Password" tab...');
        
        // First, analyze all clickable elements to find the correct tab
        const tabAnalysis = await page.evaluate(() => {
          const allClickable = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent?.trim().toLowerCase() || '';
            return text.includes('with password') || text.includes('password') || text.includes('otp') || text.includes('sso');
          }).map(el => ({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim(),
            className: el.className,
            id: el.id,
            clickable: el.onclick !== null || el.style.cursor === 'pointer' || ['button', 'a'].includes(el.tagName.toLowerCase())
          }));
          return allClickable;
        });
        console.log('🔍 Tab analysis:', JSON.stringify(tabAnalysis, null, 2));
        
        // Look for the actual "with Password" tab (not "Forgot Password")
        const tabSelectors = [
          '*:contains("with Password")',
          '[data-tab*="password" i]',
          '[role="tab"]:contains("Password")',
          'div:contains("with Password")',
          'span:contains("with Password")',
          'a:contains("with Password")'
        ];
        
        let tabFound = false;
        for (const selector of tabSelectors) {
          try {
            const elements = await page.$$eval('*', (allElements) => {
              return allElements.filter(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text === 'with password' && !text.includes('forgot');
              });
            });
            
            if (elements.length > 0) {
              console.log('✅ Found "with Password" tab via text matching');
              // Click the first matching element
              await page.evaluate(() => {
                const allElements = Array.from(document.querySelectorAll('*'));
                const passwordTab = allElements.find(el => {
                  const text = el.textContent?.trim().toLowerCase() || '';
                  return text === 'with password' && !text.includes('forgot');
                });
                if (passwordTab) {
                  passwordTab.click();
                }
              });
              tabFound = true;
              break;
            }
          } catch (_) {
            // Try next selector
          }
        }
        
        if (tabFound) {
          console.log('⏳ Waiting for password tab content to load...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Wait specifically for password field to appear
          try {
            await page.waitForSelector('input[type="password"]', { timeout: 5000 });
            console.log('✅ Password field appeared after tab click');
          } catch (_) {
            console.log('⚠️ Password field not detected after tab click, continuing...');
          }
        } else {
          console.log('⚠️ Could not find "with Password" tab, assuming it\'s already selected');
        }
      } catch (e) {
        console.log('⚠️ Error finding password tab:', e.message);
      }

      // Step 3: Fill credentials using multiple strategies
      console.log('📝 Filling username field...');
      
      const usernameSelectors = [
        '#username',
        '#userName', 
        '#user-name',
        '#email',
        '#user_name',
        'input[name="username"]',
        'input[name="userName"]', 
        'input[name="user-name"]',
        'input[name="email"]',
        'input[placeholder*="username" i]',
        'input[placeholder*="email" i]',
        'input[type="text"]',
        'input[type="email"]'
      ];
      
      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          await (loginCtx.waitForSelector ? loginCtx.waitForSelector(selector, { timeout: 2000 }) : page.waitForSelector(selector, { timeout: 2000 }));
          usernameField = selector;
          console.log(`✅ Found username field with selector: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (usernameField) {
        try {
          await (loginCtx.click ? loginCtx.click(usernameField) : page.click(usernameField));
          await (loginCtx.evaluate ? loginCtx.evaluate((sel) => {
            const field = document.querySelector(sel);
            if (field) field.value = '';
          }, usernameField) : page.evaluate((sel) => { const field = document.querySelector(sel); if (field) field.value = ''; }, usernameField));
          await (loginCtx.type ? loginCtx.type(usernameField, String(auth.credentials?.username || auth.username || ''), { delay: 100 }) : page.type(usernameField, String(auth.credentials?.username || auth.username || ''), { delay: 100 }));
          console.log('✅ Username filled successfully');
        } catch (e) {
          console.log('⚠️ Failed to fill username field:', e.message);
        }
      } else {
        console.log('❌ No username field found with any selector');
      }
      
      console.log('📝 Filling password field...');
      
      // DEBUG: Check current page state before password detection
      const passwordPageAnalysis = await page.evaluate(() => {
        const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]')).map(inp => ({
          id: inp.id,
          name: inp.name,
          className: inp.className,
          placeholder: inp.placeholder,
          visible: inp.offsetParent !== null
        }));
        return { passwordInputs, url: window.location.href };
      });
      console.log('🔍 Password field analysis:', JSON.stringify(passwordPageAnalysis, null, 2));
      
      const passwordSelectors = [
        '#password',
        '#Password',
        '#pass',
        '#pwd',
        '#user_password',
        'input[name="password"]',
        'input[name="Password"]',
        'input[name="pass"]',
        'input[name="pwd"]',
        'input[placeholder*="password" i]',
        'input[placeholder*="Password" i]',
        'input[type="password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          console.log(`🔍 Trying password selector: ${selector}`);
          await (loginCtx.waitForSelector ? loginCtx.waitForSelector(selector, { timeout: 2000 }) : page.waitForSelector(selector, { timeout: 2000 }));
          passwordField = selector;
          console.log(`✅ Found password field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`❌ Password selector failed: ${selector} - ${e.message}`);
        }
      }
      
      if (passwordField) {
        try {
          await (loginCtx.click ? loginCtx.click(passwordField) : page.click(passwordField));
          await (loginCtx.evaluate ? loginCtx.evaluate((sel) => {
            const field = document.querySelector(sel);
            if (field) field.value = '';
          }, passwordField) : page.evaluate((sel) => { const field = document.querySelector(sel); if (field) field.value = ''; }, passwordField));
          await (loginCtx.type ? loginCtx.type(passwordField, String(auth.credentials?.password || auth.password || ''), { delay: 100 }) : page.type(passwordField, String(auth.credentials?.password || auth.password || ''), { delay: 100 }));
          console.log('✅ Password filled successfully');
        } catch (e) {
          console.log('⚠️ Failed to fill password field:', e.message);
        }
      } else {
        console.log('❌ No password field found with any selector');
      }

      // Step 4: Submit the form using the Login button
      console.log('🚀 Clicking Login button...');
      try {
        const loginButtonSelectors = [
          'button[type="submit"]',
          'button:contains("Login")',
          '.login-button',
          'input[type="submit"]'
        ];
        
        let submitted = false;
        
        // First try to find by button text
        const buttons = await (loginCtx.$$ ? loginCtx.$$('button') : page.$$('button'));
        for (const button of buttons) {
          const text = await (loginCtx.evaluate ? loginCtx.evaluate(el => el.textContent?.toLowerCase() || '', button) : page.evaluate(el => el.textContent?.toLowerCase() || '', button));
          if (text.includes('login')) {
            console.log(`✅ Found login button with text: "${text}"`);
            await button.click();
            submitted = true;
            break;
          }
        }
        
        // Then try by selectors
        if (!submitted) {
          for (const selector of loginButtonSelectors) {
            try {
              await (loginCtx.waitForSelector ? loginCtx.waitForSelector(selector, { timeout: 3000 }) : page.waitForSelector(selector, { timeout: 3000 }));
              await (loginCtx.click ? loginCtx.click(selector) : page.click(selector));
              submitted = true;
              console.log(`✅ Clicked login button: ${selector}`);
              break;
            } catch (e) {
              // Try next selector
            }
          }
        }
        
        if (!submitted) {
          // Fallback: press Enter on password field
          try {
            if (loginCtx.focus) {
              await loginCtx.focus('#password');
              await page.keyboard.press('Enter');
            } else {
              await page.focus('#password');
              await page.keyboard.press('Enter');
            }
            console.log('✅ Submitted using Enter key');
          } catch (e) {
            throw new Error('Failed to submit login form - no working method found');
          }
        }
        
      } catch (e) {
        console.log('⚠️ Could not submit form:', e.message);
        throw new Error('Failed to submit login form');
      }

      // Step 6: Wait for authentication and handle navigation carefully
      console.log('⏳ Waiting for authentication to complete...');
      
      // Give the form submission time to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        // Multiple strategies to detect successful authentication
        const authSuccess = await Promise.race([
          // Strategy 1: Wait for URL change away from login
          page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 10000 })
            .then(() => 'url_redirect'),
          
          // Strategy 2: Wait for dashboard elements to appear
          page.waitForSelector('[class*="dashboard"], [class*="journey"], [class*="listing"], .main-content, .app-content', { timeout: 10000 })
            .then(() => 'dashboard_loaded'),
          
          // Strategy 3: Wait for login form to disappear
          page.waitForFunction(() => {
            const loginForms = document.querySelectorAll('form, [class*="login"], [class*="auth"]');
            const passwordInputs = document.querySelectorAll('input[type="password"], #password');
            return loginForms.length === 0 || passwordInputs.length === 0;
          }, { timeout: 10000 }).then(() => 'login_form_gone')
        ]);
        
        console.log(`✅ Authentication successful via: ${authSuccess}`);
        
      } catch (e) {
        console.log('⚠️ Standard auth detection failed, checking page state...');
        
        // Final check: analyze current page state
        const pageAnalysis = await page.evaluate(() => {
          const url = window.location.href;
          const hasLoginForm = document.querySelector('input[type="password"], #password, form[class*="login"]') !== null;
          const hasDashboardElements = document.querySelector('[class*="dashboard"], [class*="journey"], [class*="listing"], .main-content, .app-content, [class*="nav"]') !== null;
          const pageTitle = document.title;
          const bodyClasses = document.body.className;
          
          return {
            url,
            hasLoginForm,
            hasDashboardElements,
            pageTitle,
            bodyClasses,
            isLoginPage: url.includes('/login') || pageTitle.toLowerCase().includes('login')
          };
        });
        
        console.log('📊 Page state analysis:', JSON.stringify(pageAnalysis, null, 2));
        
        // If we have dashboard elements or no login form, consider it successful
        if (!pageAnalysis.hasLoginForm || pageAnalysis.hasDashboardElements || !pageAnalysis.isLoginPage) {
          console.log('✅ Authentication appears successful based on page analysis');
        } else {
          throw new Error('Authentication failed - still appears to be on login page');
        }
      }

      // Step 7: Navigate to target URL if specified
      const finalUrl = page.url();
      console.log(`📍 Current URL after auth: ${finalUrl}`);
      
      if (targetUrl && !finalUrl.includes(new URL(targetUrl).pathname)) {
        console.log(`🔗 Navigating to target: ${targetUrl}`);
        try {
          await page.goto(targetUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          console.log('✅ Successfully navigated to target URL');
        } catch (navError) {
          console.log('⚠️ Navigation to target failed, trying with domcontentloaded...');
          await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
        }
        
        // Extra wait for SPA to load
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const finalCurrentUrl = page.url();
      console.log(`✅ FreightTiger authentication completed successfully - Final URL: ${finalCurrentUrl}`);
      
      // Verify we're on the expected page
      if (targetUrl && finalCurrentUrl.includes(new URL(targetUrl).pathname)) {
        console.log('🎯 Successfully reached target page after authentication');
      }

      // After authentication, wait for network to settle to allow MFEs to load
      try {
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
      } catch (_) { /* ignore */ }

      // Wait for SystemJS modules to load and render body content
      try {
        console.log('⏳ Waiting for SystemJS modules to load...');
        await page.waitForFunction(() => {
          // Check if body has actual content (not just head elements)
          const bodyChildren = document.body?.children || [];
          const hasBodyContent = bodyChildren.length > 0;
          const hasSystemJS = !!window.System;
          
          return hasBodyContent && hasSystemJS;
        }, { timeout: 30000 });
        console.log('✅ SystemJS modules loaded and body content rendered');
      } catch (_) {
        console.log('⚠️ SystemJS module loading timed out, checking body content...');
        
        // Fallback: wait for ANY body content to appear
        try {
          await page.waitForFunction(() => {
            return document.body?.children?.length > 0;
          }, { timeout: 15000 });
          console.log('✅ Body content detected');
        } catch (_) {
          console.log('❌ No body content rendered - microfrontend failed to load');
        }
      }

      // Additional wait for FreightTiger-specific dashboard elements
      try {
        await page.waitForFunction(() => {
          return !!document.querySelector(
            'main, [role="main"], [class*="journey" i], [class*="listing" i], table, tr, [class*="dashboard" i], div[id*="root"], div[class*="app"]'
          );
        }, { timeout: 15000 });
        console.log('✅ Dashboard content detected');
      } catch (_) {
        console.log('⚠️ Dashboard content not detected in time, continuing');
      }

      // DEBUG: Capture dashboard screenshot and analyze structure
      try {
        const dashboardScreenshot = await page.screenshot({ encoding: 'base64' });
        console.log('📸 Dashboard screenshot captured (base64 length:', dashboardScreenshot.length, ')');
      } catch (e) {
        console.log('⚠️ Could not capture dashboard screenshot');
      }

      // DEBUG: Analyze dashboard page structure with focus on body content
      const dashboardAnalysis = await page.evaluate(() => {
        const bodyChildren = Array.from(document.body?.children || []);
        const bodyElementInfo = bodyChildren.map(el => ({
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          text: el.textContent?.trim().substring(0, 100),
          visible: el.offsetParent !== null,
          computedDisplay: window.getComputedStyle(el).display,
          computedVisibility: window.getComputedStyle(el).visibility
        }));
        
        // Look for specific FreightTiger elements
        const navElements = Array.from(document.querySelectorAll('nav, [class*="nav"], [class*="topnav"]')).map(el => ({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          text: el.textContent?.trim().substring(0, 50)
        }));
        
        const tableElements = Array.from(document.querySelectorAll('table, tbody, tr, td')).map(el => ({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          text: el.textContent?.trim().substring(0, 50)
        }));
        
        const antdElements = Array.from(document.querySelectorAll('[class*="ant-"], [class*="css-"]')).slice(0, 20).map(el => ({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          text: el.textContent?.trim().substring(0, 50),
          visible: el.offsetParent !== null
        }));
        
        return {
          title: document.title,
          url: window.location.href,
          totalElements: document.querySelectorAll('*').length,
          bodyChildrenCount: bodyChildren.length,
          bodyElements: bodyElementInfo,
          navElements: navElements,
          tableElements: tableElements,
          antdElements: antdElements,
          bodyClasses: document.body?.className || '',
          bodyStyle: document.body?.style?.cssText || '',
          hasReact: !!window.React,
          hasSystemJS: !!window.System,
          hasAntd: !!document.querySelector('[class*="ant-"]')
        };
      });
      console.log('🔍 Dashboard analysis:', JSON.stringify(dashboardAnalysis, null, 2));
      
    } catch (error) {
      console.error('❌ FreightTiger authentication failed:', error.message);
      throw new Error(`FreightTiger authentication failed: ${error.message}`);
    }
  }

  /**
   * Handle user authentication (simplified but robust)
   */
  async handleAuthentication(page, auth) {
    if (!auth || !auth.type) {
      return;
    }

    console.log(`🔐 Handling ${auth.type} authentication...`);

    if (auth.type === 'form' && auth.username && auth.password) {
      // Wait for form elements to be available
      const selectorTimeout = Math.max(
        this.config?.nextVersion?.authentication?.selectorTimeout || 15000,
        20000
      );

      try {
        // First try to wait for any input fields (more flexible for custom forms)
        await page.waitForSelector('input', { timeout: selectorTimeout });
        
        // Get all input fields to analyze
        const allInputs = await page.$$('input');
        console.log(`🔍 Found ${allInputs.length} input fields on the page`);
        
        // If we have fewer than 2 inputs, this might not be a login form
        if (allInputs.length < 2) {
          throw new Error(`Insufficient input fields for login: found ${allInputs.length}, need at least 2`);
        }
        
        // Try to find password field, but don't fail if not found
        let hasPasswordField = false;
        try {
          await page.waitForSelector('input[type="password"]', { timeout: 3000 });
          hasPasswordField = true;
          console.log('✅ Found standard password field');
        } catch (e) {
          console.log('ℹ️ No standard password field found, will use positional approach');
        }

        // Enhanced field filling approach
        let usernameField = null;
        let passwordField = null;
        
        if (hasPasswordField) {
          // Standard approach with typed password field
          const usernameSelectors = [
            'input[type="email"]',
            'input[type="text"]',
            'input[name*="username" i]',
            'input[name*="user" i]',
            'input[name*="email" i]',
            'input[placeholder*="email" i]',
            'input[placeholder*="username" i]'
          ];

          for (const selector of usernameSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              usernameField = selector;
              break;
            } catch (e) {
              // Try next selector
            }
          }
          
          passwordField = 'input[type="password"]';
          
        } else {
          // Positional approach for custom forms (like FreightTiger)
          console.log('🎯 Using positional approach for custom form');
          
          // Use first two visible input fields
          usernameField = allInputs[0];
          passwordField = allInputs[1];
          
          // Verify they're visible and interactable
          const isUsernameVisible = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }, usernameField);
          
          const isPasswordVisible = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }, passwordField);
          
          if (!isUsernameVisible || !isPasswordVisible) {
            throw new Error('Input fields are not visible or interactable');
          }
        }

        // Fill username field
        if (typeof usernameField === 'string') {
          await page.type(usernameField, auth.username);
        } else {
          await usernameField.click();
          await page.keyboard.press('Control+A');
          await usernameField.type(auth.username);
        }
        console.log('✅ Username entered');

        // Small delay between fields
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fill password field
        if (typeof passwordField === 'string') {
          await page.type(passwordField, auth.password);
        } else {
          await passwordField.click();
          await page.keyboard.press('Control+A');
          await passwordField.type(auth.password);
        }
        console.log('✅ Password entered');

        // Enhanced form submission
        console.log('🚀 Attempting to submit form...');
        
        let submitted = false;
        
        // Strategy 1: Look for buttons with login text
        const buttons = await page.$$('button');
        for (const button of buttons) {
          try {
            const text = await page.evaluate(el => el.textContent?.toLowerCase() || '', button);
            if (text.includes('login') || text.includes('sign in') || text.includes('sign')) {
              console.log(`🎯 Found login button with text: "${text}"`);
              await button.click();
              submitted = true;
              break;
            }
          } catch (e) {
            // Continue to next button
          }
        }
        
        // Strategy 2: Try standard submit selectors
        if (!submitted) {
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'form button',
            '.login-form button',
            '.auth-form button'
          ];

          for (const selector of submitSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              await page.click(selector);
              submitted = true;
              console.log(`✅ Form submitted via ${selector}`);
              break;
            } catch (e) {
              // Try next selector
            }
          }
        }

        // Strategy 3: Press Enter on password field
        if (!submitted) {
          try {
            if (typeof passwordField === 'string') {
              await page.focus(passwordField);
            } else {
              await passwordField.focus();
            }
            await page.keyboard.press('Enter');
            submitted = true;
            console.log('✅ Form submitted via Enter key on password field');
          } catch (e) {
            console.log('⚠️ Enter key submission failed:', e.message);
          }
        }

        if (!submitted) {
          throw new Error('Could not submit the login form - no working submission method found');
        }

        // Wait for navigation or content change
        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            page.waitForFunction(
              () => !document.querySelector('input[type="password"]'),
              { timeout: 15000 }
            )
          ]);
          console.log('✅ Authentication completed');
        } catch (e) {
          console.warn('⚠️ Authentication result unclear, continuing...');
        }

      } catch (error) {
        console.warn(`⚠️ Authentication failed: ${error.message}`);
        // Don't throw - continue with extraction
      }
    }
  }

  /**
   * Wait for page to stabilize (handle SPAs and dynamic content)
   */
  async waitForPageStability(page, options) {
    // Increase timeout for FreightTiger due to complex SystemJS loading
    const isFreightTiger = page.url().includes('freighttiger.com');
    // FreightTiger needs longer stability timeout due to complex SystemJS loading
    const defaultStabilityTimeout = isFreightTiger ? 30000 : 5000; // 30s for FreightTiger, 5s for others
    // For FreightTiger, always use the longer timeout regardless of passed options
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
      // Don't throw - continue with extraction
    }
  }

  /**
   * Apply minimal stealth evasions to reduce detection
   */
  async applyStealth(page) {
    try {
      await page.evaluateOnNewDocument(() => {
        // webdriver flag
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // plugins
        // @ts-ignore
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        // languages
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
    } catch (_) { /* ignore */ }
  }

  /**
   * Perform comprehensive DOM extraction
   */
  async performExtraction(page, url, options) {
    console.log('🔍 Starting DOM extraction...');
    
    // Core extractor function to run inside any frame
    const extractorFn = (pageUrl) => {
      const elements = [];
      const colorPalette = new Set();
      const typography = {
        fontFamilies: new Set(),
        fontSizes: new Set(),
        fontWeights: new Set()
      };
      const spacingValues = new Set();
      const borderRadiusValues = new Set();

      const maxElements = 1500;
      let elementCount = 0;

      const semanticSelectors = [
        // FreightTiger specific elements (based on screenshot analysis)
        '[class*="ant-"]',
        '[class*="css-"]',
        'nav[class*="topnav"]',
        'div[class*="ant-layout"]', 
        'div[class*="ant-layout-content"]',
        'div[class*="main-content"]',
        'main[class*="ant-layout-content"]',
        'table, tbody, tr, td, th',
        '.ant-table, .ant-table-body',
        'div[class*="journey"], div[class*="vehicle"], div[class*="transport"]',
        
        // Standard semantic elements
        'h1, h2, h3, h4, h5, h6',
        'p, span:not(:empty)',
        'article, section, main, aside',
        'nav, [role="navigation"]',
        'header, [role="banner"]',
        'footer, [role="contentinfo"]',
        'button, [role="button"], [class*="btn" i]',
        'a[href]:not(:empty)',
        'form',
        'input, textarea, select',
        'table, [role="table"], tr, td, th',
        'ul, ol, li, dl',
        'img[src], [role="img"]',
        'div[class*="content"], div[class*="text"], div[class*="list"], div[class*="item"]',
        '[role="main"], [role="article"]'
      ];

      const addElement = (element, selectorIndex, elemIndex) => {
        if (elementCount >= maxElements) return;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 5 || rect.height <= 5) return;
        const styles = window.getComputedStyle(element);
        if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) < 0.1) return;

        // Enhanced color extraction
        if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)' && styles.color !== 'transparent') {
          colorPalette.add(styles.color);
        }
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent') {
          colorPalette.add(styles.backgroundColor);
        }
        if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)' && styles.borderColor !== 'transparent') {
          colorPalette.add(styles.borderColor);
        }
        if (styles.borderTopColor && styles.borderTopColor !== 'rgba(0, 0, 0, 0)' && styles.borderTopColor !== 'transparent') {
          colorPalette.add(styles.borderTopColor);
        }
        if (styles.borderBottomColor && styles.borderBottomColor !== 'rgba(0, 0, 0, 0)' && styles.borderBottomColor !== 'transparent') {
          colorPalette.add(styles.borderBottomColor);
        }

        // Enhanced typography extraction
        if (styles.fontFamily) typography.fontFamilies.add(styles.fontFamily.split(',')[0].trim());
        if (styles.fontSize) typography.fontSizes.add(styles.fontSize);
        if (styles.fontWeight) typography.fontWeights.add(styles.fontWeight);
        if (styles.lineHeight && styles.lineHeight !== 'normal') typography.fontWeights.add(`lineHeight-${styles.lineHeight}`);
        if (styles.letterSpacing && styles.letterSpacing !== 'normal') typography.fontWeights.add(`letterSpacing-${styles.letterSpacing}`);

        // Extract spacing values
        if (styles.padding && styles.padding !== '0px') spacingValues.add(styles.padding);
        if (styles.margin && styles.margin !== '0px') spacingValues.add(styles.margin);
        if (styles.paddingTop && styles.paddingTop !== '0px') spacingValues.add(styles.paddingTop);
        if (styles.paddingRight && styles.paddingRight !== '0px') spacingValues.add(styles.paddingRight);
        if (styles.paddingBottom && styles.paddingBottom !== '0px') spacingValues.add(styles.paddingBottom);
        if (styles.paddingLeft && styles.paddingLeft !== '0px') spacingValues.add(styles.paddingLeft);
        if (styles.marginTop && styles.marginTop !== '0px') spacingValues.add(styles.marginTop);
        if (styles.marginRight && styles.marginRight !== '0px') spacingValues.add(styles.marginRight);
        if (styles.marginBottom && styles.marginBottom !== '0px') spacingValues.add(styles.marginBottom);
        if (styles.marginLeft && styles.marginLeft !== '0px') spacingValues.add(styles.marginLeft);

        // Extract border radius values
        if (styles.borderRadius && styles.borderRadius !== '0px') borderRadiusValues.add(styles.borderRadius);
        if (styles.borderTopLeftRadius && styles.borderTopLeftRadius !== '0px') borderRadiusValues.add(styles.borderTopLeftRadius);
        if (styles.borderTopRightRadius && styles.borderTopRightRadius !== '0px') borderRadiusValues.add(styles.borderTopRightRadius);
        if (styles.borderBottomLeftRadius && styles.borderBottomLeftRadius !== '0px') borderRadiusValues.add(styles.borderBottomLeftRadius);
        if (styles.borderBottomRightRadius && styles.borderBottomRightRadius !== '0px') borderRadiusValues.add(styles.borderBottomRightRadius);

        const textContent = element.textContent?.trim() || '';
        const hasText = textContent.length > 0;
        const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
        const hasBorder = styles.borderWidth !== '0px' && styles.borderStyle !== 'none';
        const isLarge = rect.width * rect.height > 100;
        const tag = element.tagName.toLowerCase();
        const isImage = tag === 'img';
        const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tag);

        if (hasText || hasBackground || hasBorder || isLarge || isImage || isInteractive) {
          const elementData = {
            id: `element-${selectorIndex}-${elemIndex}`,
            name: element.className ? `.${element.className.split(' ')[0]}` : tag,
            type: tag,
            text: textContent.slice(0, 200),
            className: element.className || '',
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            styles: {
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: styles.fontSize,
              fontFamily: styles.fontFamily,
              fontWeight: styles.fontWeight,
              lineHeight: styles.lineHeight,
              letterSpacing: styles.letterSpacing,
              // Spacing properties
              padding: styles.padding,
              paddingTop: styles.paddingTop,
              paddingRight: styles.paddingRight,
              paddingBottom: styles.paddingBottom,
              paddingLeft: styles.paddingLeft,
              margin: styles.margin,
              marginTop: styles.marginTop,
              marginRight: styles.marginRight,
              marginBottom: styles.marginBottom,
              marginLeft: styles.marginLeft,
              // Border properties
              border: styles.border,
              borderWidth: styles.borderWidth,
              borderStyle: styles.borderStyle,
              borderColor: styles.borderColor,
              borderRadius: styles.borderRadius,
              borderTopLeftRadius: styles.borderTopLeftRadius,
              borderTopRightRadius: styles.borderTopRightRadius,
              borderBottomLeftRadius: styles.borderBottomLeftRadius,
              borderBottomRightRadius: styles.borderBottomRightRadius
            },
            attributes: {
              href: element.href || '',
              alt: element.alt || '',
              src: element.src || '',
              role: element.getAttribute('role') || ''
            },
            source: 'unified-extractor',
            // Add CSS selector for easier identification
            selector: this.generateCSSSelector ? this.generateCSSSelector(element) : `${tag}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ')[0] : ''}`
          };
          
          // Add color-element associations for web extraction
          // Note: This runs in browser context, so we'll need to collect this data and process it outside
          if (typeof window !== 'undefined') {
            // Store color mapping data for later processing
            if (!window._colorMappingData) window._colorMappingData = [];
            
            if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)' && styles.color !== 'transparent') {
              window._colorMappingData.push({
                color: styles.color,
                elementId: elementData.id,
                colorType: 'text',
                elementData: elementData
              });
            }
            
            if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && styles.backgroundColor !== 'transparent') {
              window._colorMappingData.push({
                color: styles.backgroundColor,
                elementId: elementData.id,
                colorType: 'background',
                elementData: elementData
              });
            }
            
            if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)' && styles.borderColor !== 'transparent') {
              window._colorMappingData.push({
                color: styles.borderColor,
                elementId: elementData.id,
                colorType: 'border',
                elementData: elementData
              });
            }
          }
          
          elements.push(elementData);
          elementCount++;
        }
      };

      const visitNode = (root, selectorIndex) => {
        try {
          semanticSelectors.forEach((selector) => {
            try {
              const nodeList = root.querySelectorAll ? root.querySelectorAll(selector) : [];
              nodeList.forEach((el, idx) => addElement(el, selectorIndex, idx));
            } catch (_) {}
          });

          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let node;
          while ((node = walker.nextNode())) {
            if (node.shadowRoot) {
              visitNode(node.shadowRoot, selectorIndex + 1);
            }
          }
        } catch (_) {}
      };

      const collectFromDocument = (doc) => {
        visitNode(doc, 0);

        const frames = doc.querySelectorAll('iframe');
        frames.forEach((iframe, fIdx) => {
          try {
            const iframeDoc = iframe.contentDocument;
            if (iframeDoc) visitNode(iframeDoc, fIdx + 10);
          } catch (_) {
            // cross-origin, skip
          }
        });
      };

      collectFromDocument(document);

      return {
        elements,
        colorPalette: Array.from(colorPalette).slice(0, 50),
        typography: {
          fontFamilies: Array.from(typography.fontFamilies).slice(0, 20),
          fontSizes: Array.from(typography.fontSizes).slice(0, 20),
          fontWeights: Array.from(typography.fontWeights).slice(0, 10)
        },
        spacing: Array.from(spacingValues).slice(0, 30),
        borderRadius: Array.from(borderRadiusValues).slice(0, 20),
        metadata: {
          title: document.title,
          url: pageUrl,
          elementCount: elements.length,
          extractorVersion: '3.0.0-unified'
        }
      };
    };

    // Evaluate in main frame
    const results = [];
    try {
      const top = await page.evaluate(extractorFn, url);
      results.push(top);
      
      // Collect color mapping data from browser context
      try {
        const colorMappingData = await page.evaluate(() => {
          const data = window._colorMappingData || [];
          delete window._colorMappingData; // Clean up
          return data;
        });
        
        // Process color mapping data in Node.js context
        this.processColorMappingData(colorMappingData);
      } catch (e) {
        console.warn('⚠️ Color mapping data collection failed:', e.message);
      }
    } catch (e) {
      console.warn('⚠️ Top-level extraction failed:', e.message);
    }

    // Evaluate in all frames (same-origin and cross-origin)
    const frames = page.frames();
    for (const frame of frames) {
      try {
        // Skip main frame as it's already processed
        if (frame === page.mainFrame()) continue;
        const frameResult = await frame.evaluate(extractorFn, frame.url());
        results.push(frameResult);
      } catch (e) {
        console.warn(`⚠️ Frame extraction failed for ${frame.url()}:`, e.message);
      }
    }

    // Merge results
    const merged = {
      elements: [],
      colorPalette: [],
      typography: { fontFamilies: [], fontSizes: [], fontWeights: [] },
      spacing: [],
      borderRadius: [],
      metadata: { title: '', url, elementCount: 0, extractorVersion: '3.0.0-unified' }
    };

    const colorSet = new Set();
    const famSet = new Set();
    const sizeSet = new Set();
    const weightSet = new Set();
    const spacingSet = new Set();
    const borderRadiusSet = new Set();

    for (const r of results) {
      if (r?.elements?.length) merged.elements.push(...r.elements);
      for (const c of r?.colorPalette || []) colorSet.add(c);
      for (const f of r?.typography?.fontFamilies || []) famSet.add(f);
      for (const s of r?.typography?.fontSizes || []) sizeSet.add(s);
      for (const w of r?.typography?.fontWeights || []) weightSet.add(w);
      for (const sp of r?.spacing || []) spacingSet.add(sp);
      for (const br of r?.borderRadius || []) borderRadiusSet.add(br);
      if (!merged.metadata.title && r?.metadata?.title) merged.metadata.title = r.metadata.title;
    }

    merged.colorPalette = Array.from(colorSet).slice(0, 50);
    merged.typography.fontFamilies = Array.from(famSet).slice(0, 20);
    merged.typography.fontSizes = Array.from(sizeSet).slice(0, 20);
    merged.typography.fontWeights = Array.from(weightSet).slice(0, 10);
    merged.spacing = Array.from(spacingSet).slice(0, 30);
    merged.borderRadius = Array.from(borderRadiusSet).slice(0, 20);
    merged.metadata.elementCount = merged.elements.length;

    console.log(`✅ Extracted ${merged.elements.length} elements (including frames)`);
    return merged;
  }

  /**
   * Capture screenshot with retry logic
   */
  async captureScreenshot(page, options = {}) {
    const maxRetries = 2;
    const screenshotTimeout = 15000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📸 Screenshot attempt ${attempt + 1}/${maxRetries}`);
        
        const screenshot = await Promise.race([
          page.screenshot({
            type: options.type || 'png',
            // quality only valid for jpeg/webp; omit for png
            ...(options.type === 'jpeg' || options.type === 'webp' ? { quality: options.quality || 80 } : {}),
            fullPage: options.fullPage !== false,
            encoding: 'base64'
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Screenshot timeout')), screenshotTimeout)
          )
        ]);
        
        console.log('✅ Screenshot captured successfully');
        return {
          data: screenshot,
          type: options.type || 'png',
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        console.warn(`📸 Screenshot attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt === maxRetries - 1) {
          console.log('⚠️ Screenshot capture failed, continuing without screenshot');
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  }

  /**
   * Generate extraction ID
   */
  generateExtractionId() {
    return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up extraction resources
   */
  async cleanup(extractionId) {
    const extraction = this.activeExtractions.get(extractionId);
    if (!extraction) {
      return; // Already cleaned up or doesn't exist
    }
    
    const { pageId, controller } = extraction;
    
    try {
      // Abort if still running
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
      
      // Mark page as inactive before cleanup
      if (pageId) {
        this.browserPool.markPageInactive(pageId);
      }
      
      // Close page through browser pool
      if (pageId) {
        await this.browserPool.closePage(pageId);
      }
      
      // Clean up from resource manager
      await this.resourceManager.cleanup(extractionId);
      
    } catch (error) {
      console.error(`⚠️ Error during cleanup of ${extractionId}:`, error.message);
    } finally {
      // Always remove from active extractions
      this.activeExtractions.delete(extractionId);
    }
  }

  /**
   * Get active extractions count
   */
  getActiveExtractions() {
    return this.activeExtractions.size;
  }

  /**
   * Cancel specific extraction
   */
  async cancelExtraction(extractionId) {
    const extraction = this.activeExtractions.get(extractionId);
    if (extraction) {
      extraction.controller.abort();
      await this.cleanup(extractionId);
    }
  }

  /**
   * Cancel all active extractions
   */
  async cancelAllExtractions() {
    const extractionIds = Array.from(this.activeExtractions.keys());
    await Promise.allSettled(
      extractionIds.map(id => this.cancelExtraction(id))
    );
  }

  /**
   * Process color mapping data collected from browser context
   * @param {Array} colorMappingData - Array of color-element associations
   */
  processColorMappingData(colorMappingData) {
    if (!Array.isArray(colorMappingData)) return;
    
    console.log(`🎨 Processing ${colorMappingData.length} color-element associations`);
    
    colorMappingData.forEach(({ color, elementId, colorType, elementData }) => {
      try {
        // Convert RGB colors to hex for consistency
        const normalizedColor = this.normalizeColor(color);
        
        colorElementMapping.addColorElementAssociation(
          normalizedColor,
          elementData,
          colorType,
          'web'
        );
      } catch (error) {
        console.warn('⚠️ Failed to process color mapping:', error.message);
      }
    });
  }

  /**
   * Normalize color values to hex format
   * @param {string} color - Color value in any CSS format
   * @returns {string} Hex color value
   */
  normalizeColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return '#000000';
    }
    
    // If already hex, return as is
    if (color.startsWith('#')) {
      return color.toLowerCase();
    }
    
    // Handle rgb/rgba format
    if (color.startsWith('rgb')) {
      return this.rgbToHex(color);
    }
    
    // Handle named colors (basic support)
    const namedColors = {
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ff0000',
      'green': '#008000',
      'blue': '#0000ff',
      'yellow': '#ffff00',
      'orange': '#ffa500',
      'purple': '#800080',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return namedColors[color.toLowerCase()] || '#000000';
  }

  /**
   * Convert RGB/RGBA to hex
   * @param {string} rgb - RGB/RGBA color string
   * @returns {string} Hex color
   */
  rgbToHex(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return '#000000';
    
    const [, r, g, b] = match;
    return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
  }

  /**
   * Check if extractor is ready (compatibility method)
   */
  isReady() {
    return this.browserPool && this.resourceManager && this.config;
  }
}

export default UnifiedWebExtractor;
