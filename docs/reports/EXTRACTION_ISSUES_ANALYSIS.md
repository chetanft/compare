# Extraction Issues Analysis

## Issues Identified

### 1. Figma Typography Extraction Returns 0
**Symptom:** Typography shows "Unknown" and count is 0, despite successful extraction of colors (18) and components (389)

**Root Causes:**
1. MCP Dev Mode extraction may not include typography in its metadata/code response
2. Typography extraction logic in MCPXMLAdapter may not be parsing the data correctly
3. The comparison endpoint may not be properly mapping typography data

### 2. Web Extraction Returns 0 Elements
**Symptom:** All web data shows 0 (Elements, Colors, Fonts, Spacing)

**Possible Root Causes:**
1. Browser pool not initializing correctly in Electron environment
2. Puppeteer/Playwright may have architecture mismatch (ARM64 vs x86_64)
3. Web extractor may be timing out without proper error handling
4. Electron security restrictions may be blocking browser launch

## Investigation Steps

### For Typography:
1. Check MCP response structure in console logs
2. Verify MCPXMLAdapter.extractTypographyFromCode() logic
3. Check if typography data exists in raw MCP response
4. Verify comparison endpoint properly forwards typography data

### For Web Extraction:
1. Check browser pool initialization logs
2. Verify Puppeteer/Playwright binaries are correct architecture
3. Check for timeout or permission errors
4. Test web extraction via HTTP API endpoint directly

## Quick Diagnostic Commands

```bash
# Check MCP typography data
curl -X POST http://localhost:3847/api/figma-only/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"YOUR_FIGMA_URL"}' | jq '.data.typography'

# Check web extraction
curl -X POST http://localhost:3847/api/web/extract-v3 \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' | jq '.data'

# Check browser pool status
curl http://localhost:3847/api/health | jq '.data.browser'
```

## Expected Behavior

### Typography Should Show:
- Font families: Array of font names
- Font sizes: Array of sizes (px)
- Font weights: Array of weights (400, 700, etc.)

### Web Extraction Should Show:
- Elements: >0 DOM elements extracted
- Colors: Colors used in styles
- Fonts: Font families detected
- Spacing: Margin/padding values

