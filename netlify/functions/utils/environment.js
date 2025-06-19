/**
 * Environment Configuration Utilities for Netlify Functions
 * Handles environment variable validation and provides defaults
 */

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'FIGMA_API_KEY',
];

// Optional environment variables with defaults
const DEFAULT_ENV_VARS = {
  NODE_ENV: 'production',
  COLOR_DIFFERENCE_THRESHOLD: '10',
  SIZE_DIFFERENCE_THRESHOLD: '5',
  SPACING_DIFFERENCE_THRESHOLD: '3',
  FONT_SIZE_DIFFERENCE_THRESHOLD: '2',
};

/**
 * Validates environment variables and returns config object
 * @returns {Object} Configuration object with validated environment variables
 * @throws {Error} If required environment variables are missing in production
 */
export function validateEnvironment() {
  const isProduction = process.env.CONTEXT === 'production' || 
                      process.env.NODE_ENV === 'production';
  
  const missingVars = [];
  
  // Check for required environment variables in production
  if (isProduction) {
    REQUIRED_ENV_VARS.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });
  }
  
  // Log warnings or throw error for missing variables
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    
    if (isProduction) {
      throw new Error(errorMessage);
    } else {
      console.warn(`⚠️ ${errorMessage}`);
    }
  }
  
  // Create config object with defaults and environment overrides
  const config = {
    environment: {
      isProduction,
      isDevelopment: !isProduction,
    },
    figma: {
      accessToken: process.env.FIGMA_API_KEY || '',
      baseUrl: process.env.FIGMA_BASE_URL || 'https://api.figma.com/v1',
    },
    thresholds: {
      colorDifference: parseInt(process.env.COLOR_DIFFERENCE_THRESHOLD || DEFAULT_ENV_VARS.COLOR_DIFFERENCE_THRESHOLD),
      sizeDifference: parseInt(process.env.SIZE_DIFFERENCE_THRESHOLD || DEFAULT_ENV_VARS.SIZE_DIFFERENCE_THRESHOLD),
      spacingDifference: parseInt(process.env.SPACING_DIFFERENCE_THRESHOLD || DEFAULT_ENV_VARS.SPACING_DIFFERENCE_THRESHOLD),
      fontSizeDifference: parseInt(process.env.FONT_SIZE_DIFFERENCE_THRESHOLD || DEFAULT_ENV_VARS.FONT_SIZE_DIFFERENCE_THRESHOLD),
    },
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  };
  
  return config;
}

/**
 * Gets a specific environment variable with fallback
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Environment variable value or default
 */
export function getEnvVar(name, defaultValue = '') {
  return process.env[name] || DEFAULT_ENV_VARS[name] || defaultValue;
}

/**
 * Logs the current environment configuration
 */
export function logEnvironmentInfo() {
  const config = validateEnvironment();
  
  console.group('🔧 Environment Configuration');
  console.log('Environment:', config.environment.isProduction ? 'production' : 'development');
  console.log('Figma API Configured:', !!config.figma.accessToken);
  console.log('Thresholds:', config.thresholds);
  console.groupEnd();
  
  return config;
} 