/**
 * Server Control API Routes
 * REST endpoints for server lifecycle management
 */

import { Router } from 'express';
import { serverControlService } from '../services/core/ServerControlService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/server/status
 * Get current server status
 */
router.get('/status', async (req, res) => {
  try {
    const status = serverControlService.getStatus();
    const healthCheck = await serverControlService.healthCheck();
    
    const actualStatus = {
      ...status,
      status: status.managed ? status.status : 'running',
      healthy: healthCheck.healthy,
      runningProcessManaged: status.managed,
      lastHealthCheck: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: actualStatus
    });
  } catch (error) {
    logger.error('❌ Server status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server status',
      message: error.message
    });
  }
});

/**
 * POST /api/server/start
 * Start the server
 */
router.post('/start', async (req, res) => {
  try {
    logger.info('📡 API: Starting server...');
    const result = await serverControlService.startServer();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.status || serverControlService.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start server',
        message: result.message
      });
    }
  } catch (error) {
    logger.error('❌ Server start API failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/server/stop
 * Stop the server
 */
router.post('/stop', async (req, res) => {
  try {
    logger.info('📡 API: Stopping server...');
    const result = await serverControlService.stopServer();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: serverControlService.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to stop server',
        message: result.message
      });
    }
  } catch (error) {
    logger.error('❌ Server stop API failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/server/restart
 * Restart the server
 */
router.post('/restart', async (req, res) => {
  try {
    logger.info('📡 API: Restarting server...');
    const result = await serverControlService.restartServer();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.status || serverControlService.getStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to restart server',
        message: result.message
      });
    }
  } catch (error) {
    logger.error('❌ Server restart API failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/server/health
 * Dedicated health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await serverControlService.healthCheck();
    const status = serverControlService.getStatus();
    
    if (healthCheck.healthy) {
      res.json({
        success: true,
        healthy: true,
        status: status.status,
        uptime: status.uptime,
        port: status.port,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        healthy: false,
        status: status.status,
        error: healthCheck.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * WebSocket endpoint for real-time server status
 * GET /api/server/status-stream
 */
router.get('/status-stream', (req, res) => {
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial status
  const sendStatus = () => {
    const status = serverControlService.getStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
  };

  sendStatus();

  // Listen for status changes
  const statusHandler = (status) => {
    res.write(`data: ${JSON.stringify(status)}\n\n`);
  };

  serverControlService.on('statusChange', statusHandler);

  // Send periodic heartbeats
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    serverControlService.removeListener('statusChange', statusHandler);
    clearInterval(heartbeat);
  });
});

export default router;
