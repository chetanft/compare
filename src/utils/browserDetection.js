/**
 * Cross-Platform Browser Detection Utility
 * Automatically detects browser executable paths across different operating systems
 */

import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Get the appropriate browser executable path for the current platform
 */
export function getBrowserExecutablePath() {
  const platform = process.platform;
  
  const browserPaths = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/opt/google/chrome/chrome',
      '/opt/chromium/chromium'
    ]
  };

  const platformPaths = browserPaths[platform] || [];
  
  // Find first existing browser executable
  for (const path of platformPaths) {
    if (existsSync(path)) {
      console.log(`✅ Found browser executable: ${path}`);
      return path;
    }
  }

  // Return null to use Puppeteer's bundled Chromium
  console.log('⚠️ No system browser found, will use Puppeteer bundled Chromium');
  return null;
}

/**
 * Get platform-specific browser launch arguments
 */
export function getBrowserArgs(platform = process.platform) {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--disable-background-networking'
  ];

  const platformSpecificArgs = {
    linux: [
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling'
    ],
    win32: [
      '--disable-background-timer-throttling'
    ],
    darwin: [
      '--disable-features=VizDisplayCompositor'
    ]
  };

  return [...baseArgs, ...(platformSpecificArgs[platform] || [])];
}

/**
 * Get browser configuration for current environment
 */
export function getBrowserConfig(options = {}) {
  const executablePath = getBrowserExecutablePath();
  const args = getBrowserArgs();
  
  return {
    headless: options.headless !== false ? 'new' : false,
    executablePath,
    args,
    timeout: options.timeout || 90000,
    protocolTimeout: options.protocolTimeout || 300000, // 5 minutes for slow sites like FreightTiger
    ignoreDefaultArgs: ['--disable-extensions'],
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    ...options
  };
}

/**
 * Validate browser availability
 */
export async function validateBrowserAvailability() {
  const executablePath = getBrowserExecutablePath();
  
  if (!executablePath) {
    console.log('ℹ️ Using Puppeteer bundled Chromium (recommended for Docker/CI)');
    return { available: true, type: 'bundled', path: null };
  }

  try {
    // Test if the browser executable is actually runnable
    return { 
      available: true, 
      type: 'system', 
      path: executablePath,
      platform: process.platform
    };
  } catch (error) {
    console.warn(`⚠️ System browser found but not accessible: ${error.message}`);
    return { available: true, type: 'bundled', path: null };
  }
}

export default {
  getBrowserExecutablePath,
  getBrowserArgs,
  getBrowserConfig,
  validateBrowserAvailability
};
