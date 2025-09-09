/**
 * Enhanced Authentication Service for macOS
 * Port of web app enhanced authentication with macOS-specific optimizations
 * Maintains 100% API compatibility with web app authentication
 */

export class EnhancedAuthenticationService {
  constructor(page, config = {}) {
    this.page = page;
    this.config = {
      timeout: 30000,
      retries: 3,
      selectorTimeout: 15000,
      ...config
    };
  }

  /**
   * Enhanced form authentication that handles custom forms
   */
  async handleFormAuthentication(auth) {
    console.log('🔐 Starting enhanced form authentication...');
    
    try {
      // Step 1: Wait for page to load and stabilize
      await this.waitForPageStability();
      
      // Step 2: Find all input fields dynamically
      const inputFields = await this.findAllInputFields();
      console.log(`🔍 Found ${inputFields.length} input fields:`, inputFields);
      
      if (inputFields.length < 2) {
        throw new Error(`Insufficient input fields found. Expected at least 2 (username/password), found ${inputFields.length}`);
      }
      
      // Step 3: Identify username and password fields intelligently
      const { usernameField, passwordField } = this.identifyLoginFields(inputFields);
      
      if (!usernameField || !passwordField) {
        throw new Error(`Could not identify login fields. Username: ${!!usernameField}, Password: ${!!passwordField}`);
      }
      
      console.log(`✅ Identified fields - Username: ${usernameField.selector}, Password: ${passwordField.selector}`);
      
      // Step 4: Fill credentials with enhanced typing
      await this.fillCredentials(usernameField.selector, passwordField.selector, auth);
      
      // Step 5: Submit form intelligently
      await this.submitForm();
      
      // Step 6: Wait for authentication result
      await this.waitForAuthenticationResult(auth);
      
      console.log('✅ Enhanced authentication completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Enhanced authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Wait for page to stabilize (handle SPA loading)
   */
  async waitForPageStability() {
    console.log('⏳ Waiting for page stability...');
    
    // Wait for network to be idle
    try {
      await this.page.waitForLoadState?.('networkidle') || 
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
      // Continue if navigation already complete
    }
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for any loading indicators to disappear
    try {
      await this.page.waitForFunction(() => {
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], .loader');
        return loadingElements.length === 0 || Array.from(loadingElements).every(el => el.style.display === 'none');
      }, { timeout: 10000 });
    } catch (e) {
      // Continue if no loading indicators found
    }
  }

  /**
   * Find all input fields on the page with detailed information
   */
  async findAllInputFields() {
    return await this.page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((input, index) => {
        const rect = input.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(input);
        
        return {
          index,
          selector: input.id ? `#${input.id}` : 
                   input.name ? `input[name="${input.name}"]` : 
                   input.className ? `input.${input.className.split(' ')[0]}` :
                   `input:nth-child(${index + 1})`,
          type: input.type,
          name: input.name,
          id: input.id,
          className: input.className,
          placeholder: input.placeholder,
          value: input.value,
          required: input.required,
          disabled: input.disabled,
          visible: rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none',
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        };
      }).filter(input => input.visible && !input.disabled);
    });
  }

  /**
   * Intelligently identify username and password fields
   */
  identifyLoginFields(inputFields) {
    // Find password field first (most reliable)
    let passwordField = inputFields.find(field => field.type === 'password');
    
    // Find username field (usually text/email field before password)
    let usernameField = null;
    
    if (passwordField) {
      // Look for text/email field before password field
      const passwordIndex = passwordField.index;
      usernameField = inputFields.find(field => 
        (field.type === 'text' || field.type === 'email') && 
        field.index < passwordIndex
      );
      
      // If not found, look for any text field
      if (!usernameField) {
        usernameField = inputFields.find(field => 
          field.type === 'text' || field.type === 'email'
        );
      }
    } else {
      // No password field found, use heuristics
      const textFields = inputFields.filter(field => 
        field.type === 'text' || field.type === 'email'
      );
      
      if (textFields.length >= 2) {
        // Assume first text field is username, second is password (might be masked)
        usernameField = textFields[0];
        passwordField = textFields[1];
      }
    }
    
    // Additional heuristics based on field attributes
    if (!usernameField && !passwordField) {
      inputFields.forEach(field => {
        const fieldText = `${field.name} ${field.id} ${field.placeholder}`.toLowerCase();
        
        if (fieldText.includes('user') || fieldText.includes('email') || fieldText.includes('login')) {
          usernameField = field;
        }
        
        if (fieldText.includes('pass') || fieldText.includes('pwd') || field.type === 'password') {
          passwordField = field;
        }
      });
    }
    
    return { usernameField, passwordField };
  }

  /**
   * Fill credentials with enhanced typing simulation
   */
  async fillCredentials(usernameSelector, passwordSelector, auth) {
    console.log('📝 Filling credentials...');
    
    try {
      // Clear and fill username field
      await this.page.click(usernameSelector);
      await this.page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (element) element.value = '';
      }, usernameSelector);
      await this.typeWithDelay(usernameSelector, auth.username);
      
      // Wait a bit between fields
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear and fill password field
      await this.page.click(passwordSelector);
      await this.page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (element) element.value = '';
      }, passwordSelector);
      await this.typeWithDelay(passwordSelector, auth.password);
      
      console.log('✅ Credentials filled successfully');
    } catch (error) {
      throw new Error(`Failed to fill credentials: ${error.message}`);
    }
  }

  /**
   * Type text with realistic delays to avoid detection
   */
  async typeWithDelay(selector, text) {
    await this.page.focus(selector);
    
    for (const char of text) {
      await this.page.keyboard.type(char);
      // Random delay between 50-150ms per character
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  }

  /**
   * Submit form intelligently
   */
  async submitForm() {
    console.log('🚀 Submitting form...');
    
    try {
      // Look for submit button
      const submitButton = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
          return text.includes('sign in') || text.includes('login') || text.includes('submit') || 
                 btn.type === 'submit';
        });
      });
      
      if (submitButton) {
        // Click submit button
        await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
          const submitBtn = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || btn.value?.toLowerCase() || '';
            return text.includes('sign in') || text.includes('login') || text.includes('submit') || 
                   btn.type === 'submit';
          });
          if (submitBtn) submitBtn.click();
        });
      } else {
        // Fallback: press Enter on password field
        await this.page.keyboard.press('Enter');
      }
      
      console.log('✅ Form submitted');
    } catch (error) {
      throw new Error(`Failed to submit form: ${error.message}`);
    }
  }

  /**
   * Wait for authentication result
   */
  async waitForAuthenticationResult(auth) {
    console.log('⏳ Waiting for authentication result...');
    
    const waitTime = auth.waitTime || this.config.timeout;
    const startTime = Date.now();
    
    try {
      // Wait for navigation or success indicator
      if (auth.successIndicator) {
        console.log(`🎯 Looking for success indicator: ${auth.successIndicator}`);
        await this.page.waitForSelector(auth.successIndicator, { 
          timeout: waitTime,
          visible: true 
        });
        console.log('✅ Success indicator found');
      } else {
        // Wait for URL change or specific elements that indicate success
        await Promise.race([
          // Wait for navigation
          this.page.waitForNavigation({ 
            waitUntil: 'networkidle0', 
            timeout: waitTime 
          }),
          // Or wait for dashboard/success elements
          this.page.waitForSelector('[class*="dashboard"], [class*="main"], [class*="home"], .user-menu, .logout', { 
            timeout: waitTime 
          }),
          // Or wait for error elements to NOT appear
          this.page.waitForFunction(() => {
            const errorElements = document.querySelectorAll('[class*="error"], .alert-danger, .error-message');
            return errorElements.length === 0;
          }, { timeout: 5000 })
        ]);
      }
      
      const elapsedTime = Date.now() - startTime;
      console.log(`✅ Authentication completed in ${elapsedTime}ms`);
      
      // Additional verification
      await this.verifyAuthenticationSuccess();
      
    } catch (error) {
      // Check for error messages
      const errorMessage = await this.page.evaluate(() => {
        const errorElements = document.querySelectorAll('[class*="error"], .alert-danger, .error-message, .invalid-feedback');
        return Array.from(errorElements).map(el => el.textContent?.trim()).filter(text => text).join('; ');
      });
      
      if (errorMessage) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else {
        throw new Error(`Authentication timeout after ${waitTime}ms: ${error.message}`);
      }
    }
  }

  /**
   * Verify authentication was successful
   */
  async verifyAuthenticationSuccess() {
    // Check current URL for success patterns
    const currentUrl = this.page.url();
    const successPatterns = ['/dashboard', '/home', '/main', '/app', '/portal'];
    
    const urlIndicatesSuccess = successPatterns.some(pattern => currentUrl.includes(pattern));
    
    if (urlIndicatesSuccess) {
      console.log('✅ URL indicates successful authentication');
      return true;
    }
    
    // Check for success elements on page
    const hasSuccessElements = await this.page.evaluate(() => {
      const successSelectors = [
        '[class*="dashboard"]', '[class*="main-content"]', '[class*="user-menu"]',
        '.logout', '.sign-out', '[data-testid*="dashboard"]'
      ];
      
      return successSelectors.some(selector => document.querySelector(selector));
    });
    
    if (hasSuccessElements) {
      console.log('✅ Page elements indicate successful authentication');
      return true;
    }
    
    console.warn('⚠️ Could not verify authentication success definitively');
    return false;
  }

  /**
   * Handle FreightTiger-specific authentication
   */
  async handleFreightTigerAuthentication(auth, targetUrl) {
    console.log('🚛 Starting FreightTiger-specific authentication...');
    
    try {
      // Navigate to login page if needed
      if (!this.page.url().includes('login')) {
        console.log('🔄 Navigating to FreightTiger login page...');
        await this.page.goto('https://www.freighttiger.com/login', {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
      }
      
      // Wait for FreightTiger login form to load
      await this.page.waitForSelector('input[type="email"], input[name="email"], #email', {
        timeout: 20000,
        visible: true
      });
      
      console.log('📧 Filling email field...');
      await this.page.type('input[type="email"], input[name="email"], #email', auth.username, {
        delay: 100
      });
      
      // Wait for password field
      await this.page.waitForSelector('input[type="password"], input[name="password"], #password', {
        timeout: 10000,
        visible: true
      });
      
      console.log('🔐 Filling password field...');
      await this.page.type('input[type="password"], input[name="password"], #password', auth.password, {
        delay: 100
      });
      
      // Submit form
      console.log('🚀 Submitting FreightTiger login form...');
      const submitButton = await this.page.$('button[type="submit"], .btn-login, .login-button');
      if (submitButton) {
        await submitButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for authentication result with extended timeout for FreightTiger
      console.log('⏳ Waiting for FreightTiger authentication result...');
      await Promise.race([
        this.page.waitForNavigation({ 
          waitUntil: 'networkidle0', 
          timeout: 60000 
        }),
        this.page.waitForSelector('.dashboard, .main-content, [class*="journey"]', { 
          timeout: 60000 
        })
      ]);
      
      // Navigate to target URL if specified
      if (targetUrl && !this.page.url().includes(targetUrl.split('/').pop())) {
        console.log(`🎯 Navigating to target URL: ${targetUrl}`);
        await this.page.goto(targetUrl, {
          waitUntil: 'networkidle0',
          timeout: 60000
        });
      }
      
      console.log('✅ FreightTiger authentication completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ FreightTiger authentication failed:', error.message);
      throw new Error(`FreightTiger authentication failed: ${error.message}`);
    }
  }

  /**
   * Handle different authentication types
   */
  async authenticate(auth) {
    if (!auth || !auth.type) {
      console.log('ℹ️ No authentication required');
      return true;
    }

    console.log(`🔐 Starting ${auth.type} authentication...`);

    switch (auth.type) {
      case 'form':
        if (this.page.url().includes('freighttiger.com')) {
          return await this.handleFreightTigerAuthentication(auth);
        } else {
          return await this.handleFormAuthentication(auth);
        }
        
      case 'credentials':
        // Basic HTTP authentication (handled by browser)
        console.log('🔐 Using HTTP basic authentication');
        return true;
        
      case 'cookies':
        // Cookie-based authentication
        if (auth.cookies && auth.cookies.length > 0) {
          console.log(`🍪 Setting ${auth.cookies.length} authentication cookies`);
          await this.page.setCookie(...auth.cookies);
          return true;
        }
        break;
        
      case 'headers':
        // Header-based authentication (handled at request level)
        console.log('📋 Using header-based authentication');
        if (auth.headers) {
          await this.page.setExtraHTTPHeaders(auth.headers);
        }
        return true;
        
      case 'manual':
      case 'none':
        console.log('👤 Manual or no authentication required');
        return true;
        
      default:
        console.warn(`⚠️ Unknown authentication type: ${auth.type}`);
        return false;
    }

    return false;
  }
}

export default EnhancedAuthenticationService;
