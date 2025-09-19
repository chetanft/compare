#!/usr/bin/env node

/**
 * Web App Launcher
 * Starts the web app with server control capabilities
 * This allows users to start the web app without terminal commands
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebAppLauncher {
  constructor() {
    this.serverProcess = null;
    this.launcherPort = 3846; // Different from main app port
    this.appPort = 3847;
    this.launcherApp = null;
  }

  async start() {
    console.log('🚀 Starting Figma-Web Comparison Tool Launcher...');
    
    // Create launcher server
    await this.createLauncherServer();
    
    // Open browser to launcher
    console.log(`🌐 Opening launcher at http://localhost:${this.launcherPort}`);
    await open(`http://localhost:${this.launcherPort}`);
  }

  async createLauncherServer() {
    this.launcherApp = express();
    
    // Serve static launcher page
    this.launcherApp.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    // API to start main server
    this.launcherApp.post('/api/launcher/start', async (req, res) => {
      try {
        if (this.serverProcess) {
          return res.json({ success: false, message: 'Server already running' });
        }

        console.log('🚀 Starting main server...');
        
        const serverPath = path.join(__dirname, '../server.js');
        this.serverProcess = spawn('node', [serverPath], {
          env: { ...process.env, PORT: this.appPort },
          stdio: 'pipe'
        });

        this.serverProcess.stdout.on('data', (data) => {
          console.log('📡 Server:', data.toString().trim());
        });

        this.serverProcess.stderr.on('data', (data) => {
          console.error('❌ Server Error:', data.toString().trim());
        });

        this.serverProcess.on('exit', (code) => {
          console.log(`🔄 Server process exited with code ${code}`);
          this.serverProcess = null;
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        res.json({ 
          success: true, 
          message: 'Server started successfully',
          appUrl: `http://localhost:${this.appPort}`
        });

        // Open main app after starting
        setTimeout(() => {
          open(`http://localhost:${this.appPort}`);
        }, 1000);

      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error.message 
        });
      }
    });

    // API to stop main server
    this.launcherApp.post('/api/launcher/stop', (req, res) => {
      try {
        if (!this.serverProcess) {
          return res.json({ success: false, message: 'Server not running' });
        }

        console.log('🛑 Stopping main server...');
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;

        res.json({ success: true, message: 'Server stopped successfully' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // Status endpoint
    this.launcherApp.get('/api/launcher/status', (req, res) => {
      res.json({
        success: true,
        data: {
          serverRunning: !!this.serverProcess,
          launcherPort: this.launcherPort,
          appPort: this.appPort
        }
      });
    });

    // Start launcher server
    this.launcherApp.listen(this.launcherPort, () => {
      console.log(`✅ Launcher running at http://localhost:${this.launcherPort}`);
    });
  }
}

// Start launcher if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const launcher = new WebAppLauncher();
  launcher.start().catch(console.error);
}

export { WebAppLauncher };
