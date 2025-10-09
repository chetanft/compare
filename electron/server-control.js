/**
 * Electron Server Control
 * Manages the internal Electron Express server lifecycle
 */

import electron from 'electron';
import { EventEmitter } from 'events';
const { ipcMain } = electron;

// Static flag to prevent duplicate handler registration across all instances
let handlersRegistered = false;

export class ElectronServerControl extends EventEmitter {
  constructor() {
    super(); // Call EventEmitter constructor
    this.server = null;
    this.status = 'stopped';
    this.port = null;
    this.startTime = null;
    this.lifecycleHandlers = {
      start: null,
      stop: null,
    };
    
    this.setupIPC();
  }

  setLifecycleHandlers(handlers = {}) {
    this.lifecycleHandlers = {
      start: handlers.start || null,
      stop: handlers.stop || null,
    };
  }

  setupIPC() {
    // Prevent duplicate handler registration across all instances
    if (handlersRegistered) {
      console.log('⚠️ IPC handlers already registered, skipping...');
      return;
    }

    // Handle server control requests from renderer
    ipcMain.handle('server-control:status', () => {
      return this.getStatus();
    });

    ipcMain.handle('server-control:start', async () => {
      return await this.startServer();
    });

    ipcMain.handle('server-control:stop', async () => {
      return await this.stopServer();
    });

    ipcMain.handle('server-control:restart', async () => {
      return await this.restartServer();
    });

    handlersRegistered = true;
    console.log('✅ IPC handlers registered successfully');
  }

  getStatus() {
    return {
      status: this.status,
      port: this.port,
      pid: this.server ? process.pid : null,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      startTime: this.startTime,
      healthy: this.status === 'running'
    };
  }

  async startServer() {
    if (this.status === 'running') {
      return { success: false, message: 'Server already running' };
    }

    try {
      this.status = 'starting';
      
      if (this.lifecycleHandlers.start) {
        const result = await this.lifecycleHandlers.start();
        if (result?.success === false) {
          this.status = 'error';
          return result;
        }

        if (result?.server) {
          this.server = result.server;
        }
        if (result?.port) {
          this.port = result.port;
        }

        this.status = 'running';
        this.startTime = Date.now();

        return {
          success: true,
          message: 'Server started successfully',
          data: this.getStatus()
        };
      }

      // Fallback legacy start (deprecated)
      const { ElectronExpressServer } = await import('../src/macos/server/electron-server.js');
      this.server = new ElectronExpressServer();
      const legacyResult = await this.server.start();

      if (legacyResult.success) {
        this.status = 'running';
        this.port = legacyResult.port || this.server.port;
        this.startTime = Date.now();

        return {
          success: true,
          message: 'Server started successfully',
          data: this.getStatus()
        };
      }
      
      this.status = 'error';
      return { success: false, message: 'Failed to start server' };
      
    } catch (error) {
      this.status = 'error';
      return { success: false, message: error.message };
    }
  }

  async stopServer() {
    if (this.status === 'stopped') {
      return { success: false, message: 'Server already stopped' };
    }

    try {
      this.status = 'stopping';
      this.emit('statusChange', this.getStatus());

      let stopResult = { success: true };
      if (this.lifecycleHandlers.stop) {
        stopResult = await this.lifecycleHandlers.stop() || { success: true };
        if (stopResult.success === false) {
          this.status = 'error';
          this.emit('statusChange', this.getStatus());
          return stopResult;
        }
      } else if (this.server && this.server.stop) {
        await this.server.stop();
      } else if (this.server && this.server.close) {
        await new Promise((resolve, reject) => {
          this.server.close((err) => (err ? reject(err) : resolve()));
        });
      }
      
      await this.cleanup({ closeServer: false });
      
      // Update status to stopped and emit event
      this.status = 'stopped';
      this.emit('statusChange', this.getStatus());
      
      return {
        success: true,
        message: 'Server stopped successfully',
        data: this.getStatus()
      };
      
    } catch (error) {
      this.status = 'error';
      this.emit('statusChange', this.getStatus());
      return { success: false, message: error.message };
    }
  }

  async restartServer() {
    const stopResult = await this.stopServer();
    if (!stopResult.success && this.status !== 'stopped') {
      return { success: false, message: 'Failed to stop server for restart' };
    }

    // Wait a moment before starting
    await new Promise(resolve => setTimeout(resolve, 1000));

    return await this.startServer();
  }

  // Initialize with existing server instance
  initializeWithServer(serverInstance, port) {
    this.server = serverInstance;
    this.port = port;
    this.status = 'running';
    this.startTime = Date.now();
  }

  // Initialize with server instance and port (unified method)
  initializeWithServerInstance(serverInstance, port) {
    this.server = serverInstance;
    this.port = port;
    this.status = 'running';
    this.startTime = Date.now();
    
    console.log(`✅ Server control initialized with server instance on port ${port}`);
    this.emit('statusChange', this.getStatus());
  }

  // Initialize with port only (for web server connection)
  initializeWithPort(port) {
    this.port = port;
    this.status = 'running';
    this.startTime = Date.now();
    
    console.log(`✅ Server control initialized for web server on port ${port}`);
  }

  async cleanup(options = {}) {
    const { closeServer = true } = options;

    if (closeServer && this.server && this.server.close) {
      try {
        await new Promise((resolve) => {
          this.server.close(() => {
            console.log('✅ Server closed via cleanup');
            resolve();
          });
        });
      } catch (error) {
        console.error('⚠️ Error during server cleanup:', error);
      }
    }
    
    this.server = null;
    this.status = 'stopped';
    this.port = null;
    this.startTime = null;
  }
}
