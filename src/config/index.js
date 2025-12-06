/**
 * Unified Configuration System
 * Single source of truth for all application configuration
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PORTS } from './PORTS.js';
import { detectDeploymentMode } from '../database/index.js';

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
      port: parseInt(env.PORT || env.SERVER_PORT || PORTS.SERVER.toString(), 10),
      host: env.HOST || env.SERVER_HOST || '0.0.0.0',  // Bind to all interfaces for Electron compatibility
    },
    cors: {
      origins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : [
        'http://localhost:3000',
        `http://localhost:${PORTS.SERVER}`,
        `http://localhost:${PORTS.WEB_DEV}`,
        `http://localhost:${PORTS.PREVIEW}`,
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
      protocolTimeout: parseInt(env.PUPPETEER_PROTOCOL_TIMEOUT || '300000', 10), // 5 minutes for slow sites
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
    browserPool: {
      maxConcurrentJobs: parseInt(env.BROWSER_POOL_MAX_CONCURRENT_JOBS || '3', 10),
      maxBrowsers: parseInt(env.BROWSER_POOL_MAX_BROWSERS || '5', 10),
      maxPagesPerBrowser: parseInt(env.BROWSER_POOL_MAX_PAGES || '20', 10),
      maxIdleMinutes: parseInt(env.BROWSER_POOL_MAX_IDLE_MINUTES || '10', 10),
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
    snapshots: {
      enabled: env.SNAPSHOTS_ENABLED !== 'false',
      maxRecords: parseInt(env.SNAPSHOT_MAX_RECORDS || '50', 10),
      includeInputs: env.SNAPSHOT_INCLUDE_INPUTS === 'true',
    },
    // Next Version Features (Production-Ready)
    nextVersion: {
      enabled: env.ENABLE_NEXT_VERSION === 'true',
      features: {
        enhancedVisualComparison: env.ENABLE_VISUAL_COMPARISON !== 'false',
        llmIntegration: env.ENABLE_LLM_INTEGRATION === 'true',
        multiPageComparison: env.ENABLE_MULTI_PAGE === 'true',
        performanceDashboard: env.ENABLE_PERFORMANCE_DASHBOARD === 'true',
        autoErrorRecovery: env.ENABLE_ERROR_RECOVERY !== 'false'
      },
      llm: {
        provider: env.LLM_PROVIDER || 'deepseek',
        apiKey: env.LLM_API_KEY,
        apiUrl: env.LLM_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: env.LLM_MODEL || 'deepseek-chat',
        maxTokens: parseInt(env.LLM_MAX_TOKENS || '1000', 10),
        timeout: parseInt(env.LLM_TIMEOUT || '30000', 10)
      },
      authentication: {
        maxRetries: parseInt(env.AUTH_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(env.AUTH_RETRY_DELAY || '2000', 10),
        selectorTimeout: parseInt(env.AUTH_SELECTOR_TIMEOUT || '15000', 10),
        skipOnFailure: env.AUTH_SKIP_ON_FAILURE !== 'false'
      },
      visualComparison: {
        diffThreshold: parseFloat(env.VISUAL_DIFF_THRESHOLD || '0.1'),
        similarity: {
          threshold: parseFloat(env.VISUAL_SIMILARITY_THRESHOLD || '85.0')
        }
      }
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
  
  // Add database configuration
  result.database = {
    deploymentMode: detectDeploymentMode(),
    databaseUrl: process.env.DATABASE_URL || null,
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || null,
    encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.LOCAL_CREDENTIAL_KEY || null
  };

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