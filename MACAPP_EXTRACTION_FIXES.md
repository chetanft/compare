# macOS App Extraction Fixes

## Issues Summary (from user screenshot)

### Issue 1: Typography Extraction = 0
- **Current**: "Typography: 0" and shows "Unknown"
- **Expected**: Should show font families, sizes, weights from Figma

### Issue 2: Web Extraction = 0 Elements  
- **Current**: "Elements: 0", all web data is 0
- **Expected**: Should extract DOM elements, colors, fonts, spacing

## Root Cause Analysis

### Typography Issue
The Figma MCP Dev Mode returns typography data in the `variables` object, but the extraction logic may not be parsing it correctly. The MCPXMLAdapter needs to properly extract typography from the MCP response.

### Web Extraction Issue
The web extraction is likely failing silently. Possible causes:
1. CSS selector targeting wrong elements
2. Timeout occurring before page loads
3. JavaScript not enabled or not executing
4. Authentication required but not handled

## Immediate Fixes Needed

### Fix 1: Typography Extraction from MCP
File: `src/shared/data-adapters/MCPXMLAdapter.js`

The `extractTypographyFromCode()` method needs to:
1. Parse MCP code response for text nodes
2. Extract font-family, font-size, font-weight from CSS
3. Parse variables for typography tokens

### Fix 2: Web Extraction Error Handling
File: `src/web/UnifiedWebExtractor.js`

Need to:
1. Add better error logging for failed extractions
2. Increase timeout for complex sites
3. Ensure proper CSS selector extraction
4. Add fallback extraction methods

## Testing Steps

1. **Test Figma Typography**:
   - Extract from Figma file with text layers
   - Check console logs for raw MCP response
   - Verify typography array in response

2. **Test Web Extraction**:
   - Try simple site first (example.com)
   - Check browser console for errors
   - Verify timeout settings
   - Check if elements are being selected

## Quick Diagnostic

```javascript
// Check what MCP returns for typography
console.log('MCP Variables:', variables);
console.log('Extracted Typography:', typography);

// Check web extraction
console.log('Web Elements Found:', elements.length);
console.log('First 5 Elements:', elements.slice(0, 5));
```

## Priority

1. **HIGH**: Fix web extraction (0 elements is blocker)
2. **MEDIUM**: Fix typography extraction (some data shows, just incomplete)

