/**
 * Electron Server Control
 * Manages the internal Electron Express server lifecycle
 */

import electron from 'electron';
const { ipcMain } = electron;

export class ElectronServerControl {
  constructor() {
    this.server = null;
    this.status = 'stopped';
    this.port = null;
    this.startTime = null;
    
    this.setupIPC();
  }

  setupIPC() {
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
      
      // Import and start the Electron Express server
      const { ElectronExpressServer } = await import('../src/macos/server/electron-server.js');
      
      this.server = new ElectronExpressServer();
      const result = await this.server.start();
      
      if (result.success) {
        this.status = 'running';
        this.port = result.port || this.server.port;
        this.startTime = Date.now();
        
        return {
          success: true,
          message: 'Server started successfully',
          data: this.getStatus()
        };
      } else {
        this.status = 'error';
        return { success: false, message: 'Failed to start server' };
      }
      
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
      
      if (this.server && this.server.stop) {
        await this.server.stop();
      }
      
      this.status = 'stopped';
      this.server = null;
      this.port = null;
      this.startTime = null;
      
      return {
        success: true,
        message: 'Server stopped successfully',
        data: this.getStatus()
      };
      
    } catch (error) {
      this.status = 'error';
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
}
