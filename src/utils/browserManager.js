import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import puppeteer from 'puppeteer';

const execAsync = promisify(exec);

export class BrowserManager {
  static async cleanupOrphanedProcesses() {
    console.log('🧹 Cleaning up orphaned browser processes...');
    
    try {
      // More aggressive cleanup - kill all Chrome processes that might be stuck
      const commands = [
        'pkill -f "chrome-headless-shell" || true',
        'pkill -f "puppeteer" || true',  
        'pkill -f "no-sandbox.*headless" || true',
        'pkill -f "chrome.*--headless" || true',
        'pkill -f "chrome.*--remote-debugging" || true',
        'killall -9 chrome || true',
        'killall -9 "Google Chrome" || true'
      ];
      
      for (const cmd of commands) {
        try {
          await execAsync(cmd);
        } catch (cmdError) {
          // Ignore individual command errors
        }
      }
      
      // Wait longer for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('✅ Orphaned processes cleaned up');
      return true;
    } catch (error) {
      console.log('⚠️ Some processes may still be running:', error.message);
      return false;
    }
  }

  static async createBrowser(options = {}) {
    // Clean up before trying to launch
    await this.cleanupOrphanedProcesses();
    
    // macOS-specific browser configuration to fix socket hang up issues
    const defaultOptions = {
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // Use system Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--use-mock-keychain',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-background-networking',
        '--remote-debugging-port=0'
      ],
      timeout: 90000, // Increased timeout
      ignoreDefaultArgs: ['--disable-extensions'], // Allow some defaults
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      ...options
    };

    let browser = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🚀 Launching browser (attempt ${retryCount + 1}/${maxRetries})...`);
        
        browser = await puppeteer.launch(defaultOptions);
        
        // Test the browser connection
        const pages = await browser.pages();
        console.log(`✅ Browser launched successfully with ${pages.length} pages`);
        
        return browser;
      } catch (error) {
        console.log(`❌ Browser launch attempt ${retryCount + 1} failed:`, error.message);
        
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log('🧹 Cleaning up and retrying...');
          await this.cleanupOrphanedProcesses();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    throw new Error(`Failed to launch browser after ${maxRetries} attempts`);
  }

  static async createPage(browser, options = {}) {
    const defaultOptions = {
      timeout: 30000,
      waitUntil: 'networkidle0',
      ...options
    };

    try {
      const page = await browser.newPage();
      
      // Set timeouts
      page.setDefaultTimeout(defaultOptions.timeout);
      page.setDefaultNavigationTimeout(defaultOptions.timeout);
      
      // Handle console errors gracefully
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`🔍 Page console error: ${msg.text()}`);
        }
      });
      
      // Handle page errors gracefully
      page.on('pageerror', error => {
        console.log(`🔍 Page error: ${error.message}`);
      });
      
      return page;
    } catch (error) {
      throw new Error(`Failed to create page: ${error.message}`);
    }
  }

  static async navigateWithRetry(page, url, options = {}) {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`🌐 Navigating to ${url} (attempt ${retryCount + 1}/${maxRetries})`);
        
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
          ...options
        });
        
        console.log('✅ Navigation successful');
        return true;
      } catch (error) {
        console.log(`❌ Navigation attempt ${retryCount + 1} failed:`, error.message);
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log('⏳ Waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts`);
  }

  static async closeBrowserSafely(browser) {
    if (!browser) return;

    try {
      console.log('🔄 Closing browser safely...');
      
      const pages = await browser.pages();
      
      // Close all pages first
      for (const page of pages) {
        try {
          await page.close();
        } catch (error) {
          // Ignore page close errors
        }
      }
      
      // Close the browser
      await browser.close();
      
      console.log('✅ Browser closed successfully');
    } catch (error) {
      console.log('⚠️ Error closing browser:', error.message);
      
      // Force cleanup
      await this.cleanupOrphanedProcesses();
    }
  }

  static async getBrowserInfo() {
    try {
      const { stdout } = await execAsync('ps aux | grep -i "chrome\\|puppeteer" | grep -v grep | wc -l');
      const processCount = parseInt(stdout.trim());
      
      return {
        runningProcesses: processCount,
        isClean: processCount < 5 // Less than 5 processes is considered clean
      };
    } catch (error) {
      return {
        runningProcesses: 0,
        isClean: true
      };
    }
  }
} 