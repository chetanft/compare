# 📋 macOS Application Development Checklist

## 🏗️ **FOUNDATION REQUIREMENTS**

### **1. Project Structure**
- [ ] Main Electron process file exists (`electron/main.js`)
- [ ] Preload script exists and uses correct module system
- [ ] Package.json configured for Electron
- [ ] Build configuration for electron-builder
- [ ] Frontend built and available in `dist/` folder

### **2. File Permissions & Execution**
- [ ] Server executable has proper permissions (`chmod +x`)
- [ ] Server has valid shebang line (`#!/usr/bin/env node`)
- [ ] All required files are readable by Electron process
- [ ] No directory permission issues

### **3. Module System Compatibility**
- [ ] Main process uses correct import/require syntax
- [ ] Preload script uses CommonJS (`.cjs` extension recommended)
- [ ] Server files use consistent module system
- [ ] No ES module conflicts

## 🔧 **ELECTRON CONFIGURATION**

### **4. Main Process Setup**
- [ ] BrowserWindow configured correctly
- [ ] Security settings appropriate (contextIsolation, nodeIntegration)
- [ ] Window management (show/hide, ready-to-show)
- [ ] Menu system implemented
- [ ] App lifecycle events handled

### **5. Process Management**
- [ ] Child process spawning configured correctly
- [ ] Proper stdio handling (stdin, stdout, stderr)
- [ ] Process termination handled gracefully
- [ ] Error handling for spawn failures
- [ ] Cleanup on app quit

### **6. IPC & Communication**
- [ ] Preload script exposes necessary APIs
- [ ] Secure communication between main/renderer
- [ ] No direct Node.js access from renderer
- [ ] Proper error boundaries

## 🌐 **SERVER INTEGRATION**

### **7. Backend Server**
- [ ] Server starts independently (manual test)
- [ ] Correct port configuration
- [ ] Server ready detection logic
- [ ] Environment variables handled
- [ ] Dependencies available

### **8. Network Configuration**
- [ ] Frontend connects to correct server port
- [ ] CORS configured if needed
- [ ] WebSocket connections (if used)
- [ ] API endpoints accessible
- [ ] Static file serving

## 📦 **BUILD & PACKAGING**

### **9. Build Process**
- [ ] Frontend builds without errors
- [ ] All dependencies included in package
- [ ] Native modules rebuilt for Electron
- [ ] File inclusion/exclusion rules correct
- [ ] Build artifacts cleaned between builds

### **10. Electron Builder Configuration**
- [ ] App metadata (name, version, description)
- [ ] Target platforms specified
- [ ] File patterns correct
- [ ] DMG configuration (macOS specific)
- [ ] Code signing settings (null for unsigned)

### **11. Asset Management**
- [ ] App icons prepared (optional for development)
- [ ] Static assets included
- [ ] Resource paths correct
- [ ] File size optimization

## 🍎 **macOS SPECIFIC**

### **12. Platform Integration**
- [ ] Native menu bar
- [ ] Dock integration
- [ ] Window styling (titleBarStyle)
- [ ] Keyboard shortcuts
- [ ] File associations (if needed)

### **13. Security & Permissions**
- [ ] App can run unsigned (development)
- [ ] Gatekeeper bypass instructions
- [ ] Required permissions requested
- [ ] Sandboxing considerations

### **14. Distribution**
- [ ] DMG generation successful
- [ ] Both Intel and Apple Silicon builds
- [ ] Installation instructions clear
- [ ] Error handling for common issues

## 🧪 **TESTING & VALIDATION**

### **15. Functionality Tests**
- [ ] App launches without errors
- [ ] Server starts correctly
- [ ] Frontend loads and functions
- [ ] All features work as expected
- [ ] Graceful shutdown

### **16. Error Scenarios**
- [ ] Handle server startup failures
- [ ] Network connectivity issues
- [ ] File permission problems
- [ ] Resource exhaustion
- [ ] User interruption

### **17. Cross-Architecture**
- [ ] Intel Mac compatibility
- [ ] Apple Silicon compatibility
- [ ] Universal binary (if needed)
- [ ] Performance optimization

## 🚨 **COMMON PITFALLS TO AVOID**

### **18. Spawn Issues**
- [ ] ❌ Using wrong executable path
- [ ] ❌ Incorrect working directory
- [ ] ❌ Missing file permissions
- [ ] ❌ Wrong port configuration
- [ ] ❌ Environment variable conflicts

### **19. Module System Issues**
- [ ] ❌ Mixing CommonJS and ES modules incorrectly
- [ ] ❌ Missing file extensions in imports
- [ ] ❌ Incorrect preload script configuration
- [ ] ❌ Node.js version compatibility

### **20. Build Issues**
- [ ] ❌ Missing dependencies in package
- [ ] ❌ Native module rebuild failures
- [ ] ❌ File path case sensitivity
- [ ] ❌ Large bundle sizes
- [ ] ❌ Resource path issues

## 🎯 **SUCCESS CRITERIA**

### **Final Validation**
- [ ] App installs via DMG without issues
- [ ] First launch works (after Gatekeeper bypass)
- [ ] All original web features functional
- [ ] Native macOS experience provided
- [ ] No console errors or crashes
- [ ] Proper cleanup on quit

### **User Experience**
- [ ] Intuitive installation process
- [ ] Clear error messages
- [ ] Responsive interface
- [ ] Professional appearance
- [ ] Stable performance

---

## 📊 **CURRENT STATUS AUDIT**

Use this checklist to audit the current implementation and identify gaps or issues that need addressing.
