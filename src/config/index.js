/**
 * Unified Configuration System
 * Single source of truth for all application configuration
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedConfig = null;
let configLoadTime = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load configuration from environment variables and optional local config
 */
export async function loadConfig() {
  // Return cached config if still valid
  if (cachedConfig && Date.now() - configLoadTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const env = process.env;
  
  // Base configuration from environment
  const baseConfig = {
    server: {
      port: parseInt(env.PORT || env.SERVER_PORT || '3007', 10),
      host: env.HOST || env.SERVER_HOST || 'localhost',
    },
    cors: {
      origins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : [
        'http://localhost:3000',
        'http://localhost:3007',
        'http://localhost:5173',
      ],
      credentials: env.CORS_CREDENTIALS !== 'false',
    },
    mcp: {
      enabled: env.MCP_ENABLED !== 'false',
      url: env.MCP_URL || 'http://127.0.0.1:3845',
      endpoint: env.MCP_ENDPOINT || '/mcp',
    },
    puppeteer: {
      headless: env.PUPPETEER_HEADLESS === 'false' ? false : 
                env.PUPPETEER_HEADLESS === 'true' ? true : 'new',
      timeout: parseInt(env.PUPPETEER_TIMEOUT || '30000', 10),
      protocolTimeout: parseInt(env.PUPPETEER_PROTOCOL_TIMEOUT || '60000', 10),
      executablePath: env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: env.PUPPETEER_ARGS ? env.PUPPETEER_ARGS.split(',') : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    },
    thresholds: {
      colorDifference: parseInt(env.COLOR_DIFFERENCE_THRESHOLD || '10', 10),
      sizeDifference: parseInt(env.SIZE_DIFFERENCE_THRESHOLD || '5', 10),
      spacingDifference: parseInt(env.SPACING_DIFFERENCE_THRESHOLD || '3', 10),
      fontSizeDifference: parseInt(env.FONT_SIZE_DIFFERENCE_THRESHOLD || '2', 10),
    },
    timeouts: {
      figmaExtraction: parseInt(env.FIGMA_EXTRACTION_TIMEOUT || '60000', 10),
      webExtraction: parseInt(env.WEB_EXTRACTION_TIMEOUT || '30000', 10),
      comparison: parseInt(env.COMPARISON_TIMEOUT || '10000', 10),
    },
    security: {
      allowedHosts: env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(',') : [],
      rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
        max: parseInt(env.RATE_LIMIT_MAX || '100', 10),
        extractionMax: parseInt(env.RATE_LIMIT_EXTRACTION_MAX || '10', 10),
      },
    },
    figma: {
      apiKey: env.FIGMA_API_KEY || env.FIGMA_PERSONAL_ACCESS_TOKEN,
    },
  };

  // Try to load local configuration file (optional)
  const localConfigPath = join(__dirname, '../../config.local.js');
  let localConfig = {};
  
  try {
    if (existsSync(localConfigPath)) {
      const localConfigModule = await import(localConfigPath);
      localConfig = localConfigModule.default || localConfigModule;
    }
  } catch (error) {
    // Local config is optional, ignore errors
  }

  // Merge configurations (environment takes precedence)
  const mergedConfig = mergeDeep(baseConfig, localConfig);

  // Validate basic requirements
  if (isNaN(mergedConfig.server.port) || mergedConfig.server.port < 1024 || mergedConfig.server.port > 65535) {
    throw new Error(`Invalid port: ${mergedConfig.server.port}. Must be between 1024 and 65535.`);
  }

  cachedConfig = mergedConfig;
  configLoadTime = Date.now();
  return cachedConfig;
}

/**
 * Get Figma API key from environment or throw error
 */
export async function getFigmaApiKey() {
  const config = await loadConfig();
  const apiKey = config.figma.apiKey;
  
  if (!apiKey) {
    throw new Error(
      'Figma API key not found. Please set FIGMA_API_KEY environment variable.'
    );
  }
  
  return apiKey;
}

/**
 * Deep merge two objects
 */
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Create singleton instance
let configPromise = null;

/**
 * Get configuration synchronously (for compatibility)
 */
export function getConfig() {
  if (!configPromise) {
    configPromise = loadConfig();
  }
  return configPromise;
}

// Legacy compatibility - note this returns a promise now
export const config = getConfig();
export default getConfig; 