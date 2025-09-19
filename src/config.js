/**
 * Clean Configuration
 * Simple configuration for the application
 */

import { PORTS } from './config/PORTS.js';

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || PORTS.SERVER,
    host: process.env.HOST || 'localhost'
  },

  // MCP configuration
  mcp: {
    enabled: true,
    url: 'http://127.0.0.1:3845',
    endpoint: '/mcp'
  },

  // CORS configuration
  cors: {
    origin: [
      'http://localhost:3000',
      `http://localhost:${PORTS.SERVER}`,
      `http://localhost:${PORTS.WEB_DEV}`,
      `http://localhost:${PORTS.PREVIEW}`
    ],
    credentials: true
  },

  // Timeouts
  timeouts: {
    figmaExtraction: 60000,
    webExtraction: 30000,
    comparison: 10000
  }
}; 