/**
 * Server Control Service
 * Manages server lifecycle (start/stop/status) with proper process management
 */

import { spawn, exec } from 'child_process';
import { EventEmitter } from 'events';
import { APP_SERVER_PORT, SERVER_CONFIG } from '../../config/app-constants.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServerControlService extends EventEmitter {
  constructor() {
    super();
    this.serverProcess = null;
    this.serverStatus = 'stopped'; // 'stopped', 'starting', 'running', 'stopping', 'error'
    this.serverPort = APP_SERVER_PORT;
    this.startTime = null;
    this.pidFile = path.join(__dirname, '../../.server.pid');
  }

  /**
   * Get current server status
   */
  getStatus() {
    return {
      status: this.serverStatus,
      port: this.serverPort,
      pid: this.serverProcess?.pid || null,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      startTime: this.startTime,
      managed: !!this.serverProcess
    };
  }

  /**
   * Check if port is available
   */
  async isPortAvailable(port = this.serverPort) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Find and kill existing server process on port
   */
  async killExistingServer() {
    return new Promise((resolve) => {
      exec(`lsof -ti:${this.serverPort}`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(false);
          return;
        }

        const pids = stdout.trim().split('\n');
        let killCount = 0;
        
        pids.forEach(pid => {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            killCount++;
            logger.info(`🔄 Killed existing server process: ${pid}`);
          } catch (err) {
            logger.warn(`⚠️ Could not kill process ${pid}:`, err.message);
          }
        });

        // Wait for processes to terminate
        setTimeout(() => resolve(killCount > 0), 1000);
      });
    });
  }

  /**
   * Start the server
   */
  async startServer() {
    if (this.serverStatus === 'running' || this.serverStatus === 'starting') {
      logger.warn('⚠️ Server is already running or starting');
      return { success: false, message: 'Server already running' };
    }

    try {
      this.serverStatus = 'starting';
      this.emit('statusChange', this.getStatus());
      
      logger.info('🚀 Starting server...');

      // Kill any existing server on the port
      await this.killExistingServer();

      // Wait a moment for port to be freed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if port is available
      const portAvailable = await this.isPortAvailable();
      if (!portAvailable) {
        throw new Error(`Port ${this.serverPort} is still in use`);
      }

      // Start the server process - point to root server.js, not src/server.js
      const serverPath = path.join(__dirname, '../../../server.js');
      
      this.serverProcess = spawn('node', [serverPath], {
        env: {
          ...process.env,
          PORT: this.serverPort.toString(),
          NODE_ENV: process.env.NODE_ENV || 'development'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        cwd: path.join(__dirname, '../../..')  // Repository root, not src/
      });

      // Handle server output
      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        logger.info('📡 Server:', output.trim());
        this.emit('serverOutput', output);
        
        // Check for successful startup
        if (output.includes('Server running at') || output.includes('Express server running')) {
          this.serverStatus = 'running';
          this.startTime = Date.now();
          this.emit('statusChange', this.getStatus());
          logger.info(`✅ Server started successfully on port ${this.serverPort}`);
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        logger.error('❌ Server Error:', error.trim());
        this.emit('serverError', error);
      });

      // Handle process exit
      this.serverProcess.on('exit', (code, signal) => {
        logger.info(`🔄 Server process exited with code ${code} (signal: ${signal})`);
        this.serverStatus = code === 0 ? 'stopped' : 'error';
        this.serverProcess = null;
        this.startTime = null;
        this.emit('statusChange', this.getStatus());
      });

      this.serverProcess.on('error', (error) => {
        logger.error('❌ Failed to start server:', error.message);
        this.serverStatus = 'error';
        this.serverProcess = null;
        this.emit('statusChange', this.getStatus());
      });

      // Wait for startup confirmation or timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.serverStatus !== 'running') {
            this.stopServer();
            resolve({ success: false, message: 'Server startup timeout' });
          }
        }, 15000);

        const statusHandler = (status) => {
          if (status.status === 'running') {
            clearTimeout(timeout);
            this.removeListener('statusChange', statusHandler);
            resolve({ success: true, message: 'Server started successfully', status });
          } else if (status.status === 'error') {
            clearTimeout(timeout);
            this.removeListener('statusChange', statusHandler);
            resolve({ success: false, message: 'Server failed to start', status });
          }
        };

        this.on('statusChange', statusHandler);
      });

    } catch (error) {
      logger.error('❌ Server startup failed:', error.message);
      this.serverStatus = 'error';
      this.emit('statusChange', this.getStatus());
      return { success: false, message: error.message };
    }
  }

  /**
   * Stop the server
   */
  async stopServer() {
    if (this.serverStatus === 'stopped' || this.serverStatus === 'stopping') {
      logger.warn('⚠️ Server is already stopped or stopping');
      return { success: false, message: 'Server already stopped' };
    }

    try {
      this.serverStatus = 'stopping';
      this.emit('statusChange', this.getStatus());
      
      logger.info('🛑 Stopping server...');

      const hadManagedProcess = !!this.serverProcess;
      
      if (this.serverProcess) {
        // Graceful shutdown for managed process
        this.serverProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if not stopped gracefully
            if (this.serverProcess) {
              logger.warn('⚠️ Force killing server process');
              this.serverProcess.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          this.serverProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        
        this.serverProcess = null;
      }

      // Always try to kill any processes on the port (handles externally started servers)
      const killed = await this.killExistingServer();
      
      if (!hadManagedProcess && !killed) {
        // Server wasn't managed by us and we couldn't kill it
        logger.warn('⚠️ Could not stop externally managed server');
        this.serverStatus = 'running'; // Reset status
        this.emit('statusChange', this.getStatus());
        return { 
          success: false, 
          message: 'Server was started externally and could not be stopped automatically. Please stop it manually.' 
        };
      }

      this.serverStatus = 'stopped';
      this.serverProcess = null;
      this.startTime = null;
      this.emit('statusChange', this.getStatus());
      
      logger.info('✅ Server stopped successfully');
      return { success: true, message: 'Server stopped successfully' };

    } catch (error) {
      logger.error('❌ Server stop failed:', error.message);
      this.serverStatus = 'error';
      this.emit('statusChange', this.getStatus());
      return { success: false, message: error.message };
    }
  }

  /**
   * Restart the server
   */
  async restartServer() {
    logger.info('🔄 Restarting server...');
    
    const stopResult = await this.stopServer();
    if (!stopResult.success && this.serverStatus !== 'stopped') {
      return { success: false, message: 'Failed to stop server for restart' };
    }

    // Wait a moment before starting
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await this.startServer();
  }

  /**
   * Health check - verify server is responding
   */
  async healthCheck() {
    try {
      const response = await fetch(`http://localhost:${this.serverPort}/api/health`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, healthy: true, data };
      } else {
        return { success: false, healthy: false, status: response.status };
      }
    } catch (error) {
      return { success: false, healthy: false, error: error.message };
    }
  }
}

// Singleton instance
export const serverControlService = new ServerControlService();
