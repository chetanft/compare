import { BaseExtractor, ExtractorError, ExtractorStatus } from '../base/BaseExtractor';
import { ExtractorOptions, WebData } from '../../../types/extractor';
import puppeteer, { Browser, Page } from 'puppeteer';

export class WebExtractor implements BaseExtractor {
  private status: ExtractorStatus = { isReady: false };
  private options: ExtractorOptions = {};
  private browser: Browser | null = null;
  private targetUrl: string = '';

  async initialize(options: ExtractorOptions & { targetUrl: string }): Promise<void> {
    try {
      this.options = options;
      this.targetUrl = options.targetUrl;

      if (!this.targetUrl) {
        throw new ExtractorError('WEB_URL_MISSING');
      }

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.status = { isReady: true };
    } catch (error) {
      this.status = { isReady: false, error: error as Error };
      throw new ExtractorError('WEB_INIT_FAILED', error as Error);
    }
  }

  private async handleAuthentication(page: Page): Promise<void> {
    if (!this.options.authentication) {
      return;
    }

    const auth = this.options.authentication;
    
    try {
      console.log('\n🔑 Starting authentication process...');
      
      // Navigate to login page if provided
      if (auth.loginUrl) {
        console.log(`\n🌐 Navigating to login page: ${auth.loginUrl}`);
        await page.goto(auth.loginUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('✅ Loaded login page');
      }

      // Handle credentials-based authentication
      if (auth.type === 'credentials' && auth.username && auth.password) {
        console.log('\n👤 Attempting credentials-based authentication...');
        
        // Wait for username field and type
        const usernameSelector = auth.selectors?.username || '#username';
        console.log(`\n⌨️ Waiting for username field (${usernameSelector})...`);
        await page.waitForSelector(usernameSelector, { timeout: 10000, visible: true });
        await page.type(usernameSelector, auth.username);
        console.log('✅ Username entered');

        // Wait for password field and type
        const passwordSelector = auth.selectors?.password || '#password';
        console.log(`\n🔒 Waiting for password field (${passwordSelector})...`);
        await page.waitForSelector(passwordSelector, { timeout: 10000, visible: true });
        await page.type(passwordSelector, auth.password);
        console.log('✅ Password entered');

        // Click submit button
        const submitSelector = auth.selectors?.submit || 'button[type="submit"]';
        console.log(`\n🔘 Clicking submit button (${submitSelector})...`);
        await page.waitForSelector(submitSelector, { timeout: 10000, visible: true });
        await page.click(submitSelector);
        console.log('✅ Submit button clicked');

        // Wait for navigation
        console.log('\n⏳ Waiting for navigation after login...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        console.log('✅ Navigation completed');

        // Check if we're redirected to the correct page
        const currentUrl = page.url();
        console.log(`\n🔍 Current URL after login: ${currentUrl}`);
        
        if (currentUrl.includes('/v10/') || currentUrl.includes('/dashboard')) {
          console.log('✅ Authentication successful based on URL redirect');
        } else {
          console.log('❌ Not redirected to dashboard/v10');
          throw new Error('Authentication failed: Not redirected to dashboard');
        }

        // Additional wait to ensure everything is loaded
        console.log('\n⏳ Waiting for page to stabilize...');
        await page.waitForTimeout(2000);
        console.log('✅ Authentication process completed successfully');
      }
    } catch (error) {
      console.error('\n❌ Authentication failed:', error);
      // Take a screenshot of the failed state
      try {
        const screenshot = await page.screenshot({ fullPage: true });
        const failureScreenshotPath = `auth-failure-${Date.now()}.png`;
        require('fs').writeFileSync(failureScreenshotPath, screenshot);
        console.error(`📸 Failure screenshot saved to: ${failureScreenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to save failure screenshot:', screenshotError);
      }
      throw new ExtractorError('WEB_AUTHENTICATION_FAILED', error as Error);
    }
  }

  async validate(): Promise<boolean> {
    try {
      if (!this.status.isReady || !this.browser) {
        throw new ExtractorError('WEB_NOT_INITIALIZED');
      }

      const page = await this.browser.newPage();
      await page.goto(this.targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      if (this.options.authentication) {
        await this.handleAuthentication(page);
      }
      
      await page.close();

      return true;
    } catch (error) {
      throw new ExtractorError('WEB_VALIDATION_FAILED', error as Error);
    }
  }

  async extract(): Promise<WebData> {
    try {
      this.status.stage = 'EXTRACTING';
      this.status.progress = 0;

      if (!this.browser) {
        throw new ExtractorError('WEB_BROWSER_NOT_INITIALIZED');
      }

      if (this.options.validateBeforeExtract) {
        await this.validate();
      }

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to page
      await page.goto(this.targetUrl, { waitUntil: 'networkidle0' });
      this.status.progress = 20;

      // Handle authentication if needed
      if (this.options.authentication) {
        await this.handleAuthentication(page);
        this.status.progress = 40;
      }

      // Get HTML content
      const html = await page.content();
      this.status.progress = 60;

      // Take screenshots
      const screenshot = await page.screenshot({ fullPage: true });
      const screenshots = [screenshot.toString('base64')];
      this.status.progress = 80;

      // Get resources
      const resources = await page.evaluate(() => {
        const images = Array.from(document.images).map(img => img.src);
        const stylesheets = Array.from(document.styleSheets).map((sheet: any) => sheet.href).filter(Boolean);
        const scripts = Array.from(document.scripts).map(script => script.src).filter(Boolean);
        return [...images, ...stylesheets, ...scripts];
      });
      this.status.progress = 100;

      await page.close();

      return {
        id: `web-${Buffer.from(this.targetUrl).toString('base64')}-${Date.now()}`,
        timestamp: Date.now(),
        source: 'web',
        data: {
          html,
          screenshots,
          resources
        },
        metadata: {
          version: '1.0.0',
          extractorType: 'web',
          url: this.targetUrl
        }
      };
    } catch (error) {
      this.status.error = error as Error;
      throw new ExtractorError('WEB_EXTRACTION_FAILED', error as Error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.status = { isReady: false };
    } catch (error) {
      throw new ExtractorError('WEB_CLEANUP_FAILED', error as Error);
    }
  }

  async getStatus(): Promise<ExtractorStatus> {
    return this.status;
  }
} 