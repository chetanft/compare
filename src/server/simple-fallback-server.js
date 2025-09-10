/**
 * Simple Fallback Server
 * Minimal server implementation for emergency fallback
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startSimpleServer(port = 3001) {
  const app = express();
  
  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: 'fallback',
      timestamp: new Date().toISOString(),
      platform: process.platform
    });
  });
  
  // Basic test endpoint
  app.get('/api/test', (req, res) => {
    res.json({
      success: true,
      message: 'Fallback server is working',
      timestamp: new Date().toISOString()
    });
  });
  
  // Serve static files
  const staticPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticPath));
  
  // Catch-all for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`🔄 Fallback server running on port ${port}`);
    console.log(`📍 Static files served from: ${staticPath}`);
  });
  
  return server;
}
