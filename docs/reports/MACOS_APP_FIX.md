# macOS App - Complete Fix for Server Startup

## Problem
App launches but server doesn't start. Error: "SyntaxError: Unexpected reserved word" in ESM loader.

## Root Cause
Electron's bundled Node has ESM compatibility issues when spawning `server.js` as a child process.

## Solution: Run Server In-Process

Instead of spawning server.js, import and start it directly in Electron's main process:

### 1. Update `electron/main.js`

Replace the entire `startWebServer()` and `startServer()` functions with:

```javascript
async function startServer() {
  try {
    console.log('🚀 Starting Figma Comparison Tool...');
    console.log('📡 Will connect to existing Figma MCP server on port 3845');
    
    // Import and start server directly (no spawn)
    const { startUnifiedServer } = await import('../src/server/unified-server-starter.js');
    const server = await startUnifiedServer();
    
    console.log('✅ Server started successfully');
    
    // Initialize server control
    if (!serverControl) {
      serverControl = new ElectronServerControl();
    }
    serverControl.initializeWithPort(3847);
    
    return true;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    dialog.showErrorBox(
      'Server Error',
      `Failed to start the application server:\n\n${error.message}\n\nPlease check the logs.`
    );
    
    app.quit();
    return false;
  }
}
```

### 2. Remove spawn-related code

Delete these lines from `electron/main.js`:
- Lines 256-340 (entire `startWebServer` function)
- The spawn, axios, and child_process imports (no longer needed)

### 3. Test

```bash
npm run build:mac
cp -R "dist/mac/Figma Comparison Tool.app" /Applications/
xattr -dr com.apple.quarantine /Applications/Figma\ Comparison\ Tool.app
open -a "Figma Comparison Tool"

# Wait 10 seconds then verify:
lsof -nP -iTCP:3847 | grep LISTEN
# Should show: node ... (LISTEN)
```

## Why This Works

1. **No child process spawn** - server runs in Electron's main process
2. **Same Node runtime** - uses Electron's Node directly, no compatibility issues  
3. **Proper ESM support** - ES modules work correctly when imported, not spawned
4. **Cleaner architecture** - single process, easier debugging

## Verification

After implementing:
1. App should launch within 5-10 seconds
2. Port 3847 should be listening
3. Window should load `http://localhost:3847` successfully
4. No syntax errors in Console.app


