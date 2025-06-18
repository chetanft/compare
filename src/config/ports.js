/**
 * Centralized Port Configuration
 * Single source of truth for all port settings
 */

const DEFAULT_PORT = 3007;
const VITE_DEV_PORT = 5173;
const CONFIG_FILE_PORT_KEY = 'ports.server';

const PORTS = {
  // Main application port
  APP: process.env.PORT || DEFAULT_PORT,
  
  // Development ports
  VITE_DEV: VITE_DEV_PORT,
  
  // MCP Server port
  MCP_SERVER: process.env.MCP_PORT || 3845,
  
  // Fallback ports for testing
  FALLBACK_PORTS: [3007, 3008, 3009, 3010]
};

/**
 * Get the main application port
 */
function getAppPort() {
  return PORTS.APP;
}

/**
 * Get all allowed CORS origins based on ports
 */
function getCorsOrigins() {
  return [
    `http://localhost:${PORTS.APP}`,
    `http://127.0.0.1:${PORTS.APP}`,
    `http://localhost:${PORTS.VITE_DEV}`,
    `http://127.0.0.1:${PORTS.VITE_DEV}`,
    // Add fallback ports for development
    ...PORTS.FALLBACK_PORTS.map(port => `http://localhost:${port}`),
    ...PORTS.FALLBACK_PORTS.map(port => `http://127.0.0.1:${port}`)
  ];
}

/**
 * Find an available port starting from the preferred port
 */
async function findAvailablePort(preferredPort = PORTS.APP) {
  const net = await import('net');
  
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(preferredPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      // Try next port
      resolve(findAvailablePort(preferredPort + 1));
    });
  });
}

/**
 * Updates the config.json file with the current port
 * @param {number} port - The port to save
 * @param {string} configPath - Path to config file
 */
async function updateConfigFile(port, configPath = './config.json') {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const configFilePath = path.resolve(process.cwd(), configPath);
    
    // Check if file exists
    try {
      await fs.access(configFilePath);
    } catch (err) {
      console.warn(`⚠️ Config file not found at ${configFilePath}, skipping port update`);
      return false;
    }
    
    // Read config file
    const configContent = await fs.readFile(configFilePath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Update port
    if (!config.ports) {
      config.ports = {};
    }
    
    config.ports.server = port;
    
    // Write updated config
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ Updated config file with port: ${port}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to update config file: ${err.message}`);
    return false;
  }
}

/**
 * Synchronizes port across all configuration files
 * @param {number} port - The port to use
 */
async function syncPortAcrossConfigs(port) {
  const results = {
    config: await updateConfigFile(port),
    environment: false
  };
  
  // Update environment variables
  process.env.PORT = port.toString();
  PORTS.APP = port;
  
  console.log(`🔄 Port synchronized across configurations: ${port}`);
  return results;
}

export {
  PORTS,
  DEFAULT_PORT,
  getAppPort,
  getCorsOrigins,
  findAvailablePort,
  updateConfigFile,
  syncPortAcrossConfigs
}; 