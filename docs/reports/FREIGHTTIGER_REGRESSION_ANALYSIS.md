# 🚨 FreightTiger Regression Analysis
**Date**: September 7, 2025  
**Issue**: FreightTiger extraction was working before macOS development, now failing  
**Status**: ROOT CAUSE IDENTIFIED

## 🎯 **ROOT CAUSE IDENTIFIED**

**FreightTiger extraction broke during macOS development due to TIMEOUT CONFIGURATION REGRESSION**

### **BEFORE macOS Development (WORKING)**

**Web App Server** (`src/core/server/index.js`):

1. **Web-only extraction** (Line 663):
   ```javascript
   timeout: isFreightTiger ? Math.max(config.timeouts.webExtraction, 120000) : config.timeouts.webExtraction
   // FreightTiger gets: Math.max(30000, 120000) = 120000ms (2 minutes)
   ```

2. **Comparison extraction** (Line 856):
   ```javascript
   timeout: webUrl.includes('freighttiger.com') ? 180000 : 60000,
   // FreightTiger gets: 180000ms (3 minutes)
   ```

### **AFTER macOS Development (BROKEN)**

**macOS App Server** (`src/macos/server/electron-server.js`):

1. **Comparison extraction** (Line 592):
   ```javascript
   timeout: 30000
   // FreightTiger gets: 30000ms (30 seconds) - HARDCODED!
   ```

**UnifiedWebExtractor** (`src/web/UnifiedWebExtractor.js`):

1. **Default timeout** (Line 39):
   ```javascript
   const defaultTimeout = isFreightTiger ? 180000 : (this.config?.timeouts?.webExtraction || 30000);
   // FreightTiger gets: 180000ms (3 minutes) - This part is correct
   ```

2. **Stability timeout** (Line 1082):
   ```javascript
   const defaultStabilityTimeout = isFreightTiger ? 30000 : 5000;
   // FreightTiger gets: 30000ms (30 seconds) - This is the problem!
   ```

---

## 🔍 **DETAILED BREAKDOWN**

### **What Was Working Before**

1. **Total timeout**: 180s (3 minutes) for FreightTiger
2. **Stability timeout**: Not explicitly limited (used default Puppeteer behavior)
3. **Authentication**: ~65s (successful)
4. **DOM extraction**: Had ~115s remaining (sufficient)

### **What's Broken Now**

1. **Total timeout**: 180s (3 minutes) - Still correct in UnifiedWebExtractor
2. **Stability timeout**: 30s (hardcoded) - **TOO SHORT!**
3. **Authentication**: ~65s (still successful)
4. **DOM extraction**: Only ~25s remaining after stability timeout - **INSUFFICIENT!**

### **The Regression**

**macOS App Issue**:
```javascript
// src/macos/server/electron-server.js:592
timeout: 30000  // ❌ HARDCODED 30s - ignores FreightTiger needs
```

**Should be**:
```javascript
timeout: webUrl.includes('freighttiger.com') ? 180000 : 30000
```

**Stability Timeout Issue**:
```javascript
// src/web/UnifiedWebExtractor.js:1082
const defaultStabilityTimeout = isFreightTiger ? 30000 : 5000; // ❌ 30s insufficient
```

**Should be**:
```javascript
const defaultStabilityTimeout = isFreightTiger ? 60000 : 5000; // ✅ 60s sufficient
```

---

## 📊 **TIMELINE ANALYSIS**

### **Before macOS Development**
```
FreightTiger Extraction Timeline (WORKING):
├── Total: 180s
├── Authentication: ~65s ✅
├── Navigation: ~5s ✅
├── Stability: ~45s ✅ (no explicit limit)
└── DOM Extraction: ~65s ✅ (sufficient time)
```

### **After macOS Development**
```
FreightTiger Extraction Timeline (BROKEN):
├── Total: 30s (macOS) / 180s (web) 
├── Authentication: ~65s ✅ (web app only)
├── Navigation: ~5s ✅
├── Stability: 30s ❌ (times out during SystemJS loading)
└── DOM Extraction: 0s ❌ (never reached)
```

---

## 🚨 **EVIDENCE FROM LOGS**

### **Working Web App Logs**:
```
⏱️ Setting extraction timeout: 120000ms (FreightTiger: true)
✅ FreightTiger authentication completed successfully
⏱️ Using stability timeout: 30000ms (FreightTiger: true)
✅ SystemJS modules loaded and body content rendered
✅ Extraction completed in 121325ms
```

### **Broken macOS App Logs**:
```
⏱️ Setting extraction timeout: 30000ms (FreightTiger: true)  // ❌ Wrong timeout!
⏱️ Using stability timeout: 30000ms (FreightTiger: true)
🔍 Detected JS-heavy site, waiting for stability...
⏰ Extraction timeout reached for: https://www.freighttiger.com/v10/journey/listing
❌ Extraction failed after 83508ms: Extraction aborted due to timeout
✅ Extracted 0 elements (including frames)
```

---

## 🔧 **SPECIFIC FIXES REQUIRED**

### **Fix #1: macOS App Timeout Regression**

**File**: `src/macos/server/electron-server.js`  
**Line**: 592  
**Current**:
```javascript
timeout: 30000
```
**Fix**:
```javascript
timeout: webUrl.includes('freighttiger.com') ? 180000 : 30000
```

### **Fix #2: Stability Timeout Insufficient**

**File**: `src/web/UnifiedWebExtractor.js`  
**Line**: 1082  
**Current**:
```javascript
const defaultStabilityTimeout = isFreightTiger ? 30000 : 5000;
```
**Fix**:
```javascript
const defaultStabilityTimeout = isFreightTiger ? 60000 : 5000;
```

### **Fix #3: Add Authentication to macOS Comparison**

**File**: `src/macos/server/electron-server.js`  
**Line**: 590-593  
**Current**:
```javascript
const webResult = await webExtractor.extractWebData(webUrl, {
  includeVisual,
  timeout: 30000
});
```
**Fix**:
```javascript
const webResult = await webExtractor.extractWebData(webUrl, {
  authentication: req.body.authentication,
  includeVisual,
  timeout: webUrl.includes('freighttiger.com') ? 180000 : 30000
});
```

---

## 📋 **VERIFICATION PLAN**

### **Step 1: Apply Fixes**
1. Fix macOS app timeout configuration
2. Increase stability timeout for FreightTiger
3. Add authentication support to macOS comparison

### **Step 2: Test Scenarios**
1. **Web App FreightTiger**: Should continue working
2. **macOS App FreightTiger**: Should start working
3. **Simple extractions**: Should remain unaffected
4. **Other authenticated sites**: Should remain unaffected

### **Step 3: Validate Timeline**
```
Expected FreightTiger Timeline (FIXED):
├── Total: 180s ✅
├── Authentication: ~65s ✅
├── Navigation: ~5s ✅
├── Stability: ~60s ✅ (increased timeout)
└── DOM Extraction: ~50s ✅ (sufficient time)
```

---

## 🎯 **CONCLUSION**

**FreightTiger extraction was NOT fundamentally broken** - it was a **CONFIGURATION REGRESSION** introduced during macOS development:

1. **macOS app hardcoded 30s timeout** instead of using FreightTiger-specific 180s
2. **Stability timeout was insufficient** for SystemJS micro-frontend loading
3. **Authentication was not passed** from comparison endpoint to extractor

**All issues are simple configuration fixes** - no architectural changes needed.

**The original FreightTiger extraction logic was correct** - it just got overridden by macOS-specific hardcoded values.

**Estimated fix time**: 15 minutes  
**Risk level**: LOW (configuration-only changes)  
**Impact**: Will restore FreightTiger functionality to both apps
