/**
 * Enhanced Authentication Handler
 * Handles complex login forms including custom elements and SPA authentication
 */

export class EnhancedAuthentication {
  constructor(page, config = {}) {
    this.page = page;
    this.config = {
      timeout: 30000,
      retries: 3,
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
      await this.waitForAuthenticationResult();
      
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
    
    // Wait for network to be idle (Puppeteer syntax)
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
          selector: `input:nth-of-type(${index + 1})`,
          type: input.type || 'text',
          name: input.name || '',
          id: input.id || '',
          className: input.className || '',
          placeholder: input.placeholder || '',
          value: input.value || '',
          visible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none',
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          attributes: {
            autocomplete: input.autocomplete || '',
            required: input.required,
            disabled: input.disabled,
            readonly: input.readOnly
          }
        };
      }).filter(field => field.visible && !field.attributes.disabled && !field.attributes.readonly);
    });
  }

  /**
   * Intelligently identify username and password fields
   */
  identifyLoginFields(inputFields) {
    let usernameField = null;
    let passwordField = null;
    
    // First, look for obvious password field
    passwordField = inputFields.find(field => 
      field.type === 'password' ||
      field.name.toLowerCase().includes('password') ||
      field.placeholder.toLowerCase().includes('password') ||
      field.id.toLowerCase().includes('password')
    );
    
    // If no obvious password field, look for patterns
    if (!passwordField && inputFields.length >= 2) {
      // In most login forms, password is the second field
      passwordField = inputFields[1];
    }
    
    // Find username field
    usernameField = inputFields.find(field => 
      field !== passwordField && (
        field.type === 'email' ||
        field.type === 'text' ||
        field.name.toLowerCase().includes('email') ||
        field.name.toLowerCase().includes('username') ||
        field.name.toLowerCase().includes('user') ||
        field.placeholder.toLowerCase().includes('email') ||
        field.placeholder.toLowerCase().includes('username') ||
        field.id.toLowerCase().includes('email') ||
        field.id.toLowerCase().includes('username')
      )
    );
    
    // If no obvious username field, use the first available field
    if (!usernameField && inputFields.length >= 1) {
      usernameField = inputFields.find(field => field !== passwordField) || inputFields[0];
    }
    
    return { usernameField, passwordField };
  }

  /**
   * Fill credentials with enhanced typing simulation
   */
  async fillCredentials(usernameSelector, passwordSelector, auth) {
    console.log('📝 Filling credentials...');
    
    // Clear and fill username
    await this.page.click(usernameSelector);
    await this.page.keyboard.press('Control+A'); // Select all
    await this.page.keyboard.press('Delete'); // Clear
    await this.page.type(usernameSelector, auth.username, { delay: 100 });
    
    // Small delay between fields
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear and fill password
    await this.page.click(passwordSelector);
    await this.page.keyboard.press('Control+A'); // Select all
    await this.page.keyboard.press('Delete'); // Clear
    await this.page.type(passwordSelector, auth.password, { delay: 100 });
    
    console.log('✅ Credentials filled');
  }

  /**
   * Submit form using multiple strategies
   */
  async submitForm() {
    console.log('🚀 Submitting form...');
    
    const submitStrategies = [
      // Strategy 1: Find submit button by text (Puppeteer syntax)
      async () => {
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await this.page.evaluate(el => el.textContent?.toLowerCase() || '', button);
          if (text.includes('login') || text.includes('sign in')) {
            await button.click();
            return true;
          }
        }
        return false;
      },
      
      // Strategy 2: Find submit button by type
      async () => {
        const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          return true;
        }
        return false;
      },
      
      // Strategy 3: Find any button in a form
      async () => {
        const formButton = await this.page.$('form button, .login-form button, .auth-form button');
        if (formButton) {
          await formButton.click();
          return true;
        }
        return false;
      },
      
      // Strategy 4: Press Enter on password field
      async () => {
        const passwordFields = await this.page.$$('input[type="password"]');
        if (passwordFields.length > 0) {
          await passwordFields[0].focus();
          await this.page.keyboard.press('Enter');
          return true;
        }
        return false;
      },
      
      // Strategy 5: Press Enter on last input field
      async () => {
        const inputs = await this.page.$$('input');
        if (inputs.length > 0) {
          await inputs[inputs.length - 1].focus();
          await this.page.keyboard.press('Enter');
          return true;
        }
        return false;
      }
    ];
    
    for (let i = 0; i < submitStrategies.length; i++) {
      try {
        console.log(`🎯 Trying submit strategy ${i + 1}...`);
        const success = await submitStrategies[i]();
        if (success) {
          console.log(`✅ Submit strategy ${i + 1} succeeded`);
          return;
        }
      } catch (error) {
        console.log(`⚠️ Submit strategy ${i + 1} failed:`, error.message);
      }
    }
    
    throw new Error('All submit strategies failed');
  }

  /**
   * Wait for authentication result
   */
  async waitForAuthenticationResult() {
    console.log('⏳ Waiting for authentication result...');
    
    try {
      // Wait for navigation or URL change (Puppeteer syntax)
      await Promise.race([
        this.page.waitForNavigation({ timeout: 15000 }),
        this.page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 }),
        this.page.waitForSelector('[class*="dashboard"], [class*="home"], [class*="main"]', { timeout: 15000 })
      ]);
      
      console.log('✅ Authentication appears successful - page changed');
    } catch (error) {
      // Check if we're still on login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Authentication failed - still on login page');
      }
      
      // If URL changed but no navigation event, that's still success
      console.log('✅ Authentication completed - URL changed without navigation event');
    }
  }
}
