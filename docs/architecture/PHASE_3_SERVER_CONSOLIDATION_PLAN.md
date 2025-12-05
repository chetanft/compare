# 🏗️ Phase 3: Server Consolidation Plan

## 🎯 **OBJECTIVE**
Consolidate **14 server files** down to **3 core files** with unified architecture.

## 📊 **CURRENT STATE ANALYSIS**

### **✅ ACTIVE SERVERS (Keep)**
1. `server.js` - Main entry point ✅
2. `src/server/unified-server-starter.js` - Platform detection & routing ✅ 
3. `src/core/server/index.js` - Web app server implementation ✅
4. `src/macos/server/electron-server.js` - macOS app server implementation ✅
5. `src/server/simple-fallback-server.js` - Emergency fallback ✅

### **❌ DUPLICATE SERVERS (Remove)**
1. `hello-server.js` - Duplicate simple server
2. `unified-server.js` - Duplicate of unified-server-starter.js
3. `production-server.js` - Duplicate production implementation
4. `modular-server.js` - Duplicate modular implementation  
5. `standalone-server.js` - Duplicate standalone implementation
6. `test-server.js` - Simple test server (keep for testing)
7. `figma-mcp-server.js` - MCP-specific server (obsolete)
8. `scripts/start-server.js` - Script wrapper (keep for scripts)

### **🧪 TEST SERVERS (Keep for testing)**
1. `tests/integration/enhanced-server.test.js` - Keep for tests
2. `tests/integration/server.test.js` - Keep for tests

## 🚀 **CONSOLIDATION STRATEGY**

### **Phase 3A: Safe Removal (Zero Risk)**
Remove obvious duplicates that aren't imported anywhere:
- `hello-server.js`
- `unified-server.js` 
- `production-server.js`
- `modular-server.js`
- `standalone-server.js`
- `figma-mcp-server.js`

### **Phase 3B: Import Analysis**
Check if any removed servers are imported/referenced:
- Search for imports
- Update any references
- Ensure no breaking changes

### **Phase 3C: Testing**
Test consolidated architecture:
- Web app functionality
- macOS app functionality  
- Cross-platform compatibility

## 📈 **EXPECTED RESULTS**
- **Reduce from 14 → 5 server files** (64% reduction)
- **Remove ~3000+ lines of duplicate code**
- **Eliminate server confusion** 
- **Improve maintainability**
- **Zero breaking changes**
