/**
 * Electron Main Process with Unified Express Server
 * Complete rewrite to use Express.js for feature parity with web app
 */

import electron from 'electron';
const { app, BrowserWindow, Menu, shell, dialog } = electron;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Disable all security features via command line flags
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('allow-running-insecure-content');
app.commandLine.appendSwitch('ignore-certificate-errors');

// Import server utilities
import { ElectronServerControl } from './server-control.js';

// Note: We connect to existing Figma MCP server instead of starting our own

// Handle uncaught exceptions to prevent app crashes
process.on('uncaughtException', (error) => {
  if (error.code === 'EPIPE') {
    // Ignore EPIPE errors (broken pipe) during shutdown
    return;
  }
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow;
let expressServer;
let serverPort = 3847; // Use unified port matching APP_SERVER_PORT
let serverControl;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false, // Disable context isolation to bypass CSP
      enableRemoteModule: false,
      webSecurity: false, // Disable CSP restrictions for local app
      allowRunningInsecureContent: true, // Allow mixed content
      experimentalFeatures: true, // Enable experimental features
      sandbox: false, // Disable sandbox for full access
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Add app icon if available
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Override session permissions to bypass all CSP restrictions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true); // Allow all permissions
  });
  
  // Disable CSP enforcement at session level
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // Remove all CSP headers from responses
    delete details.responseHeaders['content-security-policy'];
    delete details.responseHeaders['content-security-policy-report-only'];
    callback({ responseHeaders: details.responseHeaders });
  });

  // Load the app once server is ready
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    // Clear any cached CSP policies and storage
    mainWindow.webContents.session.clearCache();
    mainWindow.webContents.session.clearStorageData();
    
    mainWindow.show();
    console.log('🎉 Figma Comparison Tool is ready!');
    console.log('🔓 Web security disabled, CSP restrictions bypassed');
    
    // Focus on window (optional)
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== `http://localhost:${serverPort}`) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Comparison',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/new-comparison');
            }
          }
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/settings');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Figma Comparison Tool',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Figma Comparison Tool',
              detail: 'A powerful tool for comparing Figma designs with web implementations.\n\nVersion: 2.0.0\nPlatform: macOS (Electron + Express)',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/your-repo/figma-comparison-tool');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });

    // Window menu
    template[4].submenu = [
      { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
      { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: 'Zoom', role: 'zoom' },
      { type: 'separator' },
      { label: 'Bring All to Front', role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function startServer() {
  try {
    console.log('🚀 Starting Figma Comparison Tool...');
    console.log('📡 Will connect to existing Figma MCP server on port 3845');
    
    // Import and start server directly in-process (no spawn, avoids ESM issues)
    console.log('🚀 Starting unified server in-process...');
    const { startUnifiedServer } = await import('../src/server/unified-server-starter.js');
    const server = await startUnifiedServer();
    
    console.log(`✅ Server started successfully on port ${serverPort}`);
    
    // Initialize server control
    if (!serverControl) {
      serverControl = new ElectronServerControl();
    }
    serverControl.initializeWithPort(serverPort);
    
    return true;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    
    // Show error dialog
    dialog.showErrorBox(
      'Server Error',
      `Failed to start the application server:\n\n${error.message}\n\nPlease check the console for details.`
    );
    
    app.quit();
    return false;
  }
}

// App event handlers
app.whenReady().then(async () => {
  console.log('🚀 Electron app ready, starting server...');
  
  // Start the server first
  const serverStarted = await startServer();
  
  if (serverStarted) {
    // Create window and menu
    createWindow();
    createMenu();
    
    console.log('✅ App is ready!');
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!expressServer) {
      await startServer();
    }
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  try {
    if (process.stdout && process.stdout.writable) {
      console.log('🔄 Shutting down...');
    }

    // Stop the web server process
    if (expressServer && expressServer.kill) {
      if (process.stdout && process.stdout.writable) {
        console.log('⏹️ Stopping web server process...');
      }
      expressServer.kill('SIGTERM');
      expressServer = null;
    }

    // Clean up server control
    if (serverControl) {
      await serverControl.cleanup();
      serverControl = null;
    }

  } catch (error) {
    // Ignore shutdown errors
    if (process.stdout && process.stdout.writable) {
      console.error('⚠️ Shutdown error (ignored):', error.message);
    }
  }
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost:')) {
    // Ignore certificate errors for localhost
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle protocol for deep linking (optional)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('figma-comparison', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('figma-comparison');
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}