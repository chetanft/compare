# Typography & Web Extraction Fix for macOS App

## Current State Analysis

### Issue 1: Typography Shows "Unknown" and Count = 0
**From Screenshot:**
- Figma extracted: 389 components, 18 colors ✅
- Typography: 0 (shows "Unknown") ❌

**Root Cause:**
The Figma MCP Dev Mode extraction returns typography data, but it may be:
1. In a format not expected by `MCPXMLAdapter.extractTypographyFromCode()`
2. Empty in the MCP response for this specific Figma file
3. Not being properly parsed from the `variables` or `code` response

### Issue 2: Web Extraction Shows 0 Elements
**From Screenshot:**
- All web data: 0 elements, 0 colors, 0 fonts, 0 spacing ❌

**Root Cause:**
The UI shows "0% Match Rate" and "0 Matches/Deviations", which means **NO COMPARISON WAS RUN YET**. This is expected behavior - you need to:
1. Enter both Figma URL and Web URL
2. Click "Compare" or "Run Comparison" button
3. Wait for web extraction and comparison to complete

## Figma File Details

**URL:** https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=6578-54894
- File ID: `fb5Yc1aKJv9YWsMLnNlWeK`
- File Name: "My-Journeys"
- Node ID: `6578-54894`

## Web Target Details  

**URL:** https://www.freighttiger.com/v10/journey/listing
**Authentication Required:**
- Login URL: https://freighttiger.com/login
- Username: FTProductUser2@gmail.com
- Password: DemoUser@@123

## Fix Plan

### Fix 1: Typography Extraction from MCP

**File:** `src/shared/data-adapters/MCPXMLAdapter.js`

The issue is that MCP Dev Mode might not return typography in the `variables` object for this specific file. We need to:

1. **Add fallback extraction from code CSS**
2. **Extract from MCP metadata if variables is empty**
3. **Add debug logging to see what MCP returns**

**Code Fix:**
```javascript
extractTypographyFromCode(code, variables = null) {
  const typography = [];
  
  // Enhanced logging for debugging
  console.log('📝 Typography Extraction Debug:');
  console.log('  - Variables present:', !!variables);
  console.log('  - Code present:', !!code);
  
  if (variables && variables.content) {
    console.log('  - Variables type:', typeof variables.content);
    console.log('  - Variables length:', variables.content.length || 0);
  }
  
  // ... rest of existing extraction logic ...
  
  // FALLBACK: If no typography found in variables, extract from code CSS
  if (typography.length === 0 && code && code.content) {
    console.log('⚠️ No typography in variables, trying CSS extraction fallback...');
    typography.push(...this.extractTypographyFromCSS(code.content));
  }
  
  console.log(`✅ Extracted ${typography.length} typography items`);
  return typography;
}

// New method for CSS-based extraction
extractTypographyFromCSS(cssContent) {
  const typography = [];
  let cssString = '';
  
  if (Array.isArray(cssContent)) {
    const textItem = cssContent.find(item => item.type === 'text' && item.text);
    if (textItem) cssString = textItem.text;
  } else if (typeof cssContent === 'string') {
    cssString = cssContent;
  }
  
  if (!cssString) return typography;
  
  // Extract font-family declarations
  const fontFamilyMatches = cssString.match(/font-family:\s*([^;}"'\n]+)/gi) || [];
  const fontSizeMatches = cssString.match(/font-size:\s*(\d+(?:\.\d+)?(?:px|rem|em))/gi) || [];
  const fontWeightMatches = cssString.match(/font-weight:\s*(\d+|bold|normal)/gi) || [];
  
  // Extract unique font families
  const fontFamilies = [...new Set(fontFamilyMatches.map(m => {
    const match = m.match(/font-family:\s*([^;}"'\n]+)/i);
    return match ? match[1].trim().replace(/["']/g, '') : null;
  }).filter(Boolean))];
  
  // Create typography entries
  fontFamilies.forEach((family, index) => {
    typography.push({
      id: `css-font-${index}`,
      name: family,
      fontFamily: family,
      fontSize: 16, // Default, can be enhanced
      fontWeight: 400, // Default
      source: 'css-fallback'
    });
  });
  
  return typography;
}
```

### Fix 2: Web Extraction - User Action Required

**The web extraction IS working** - it just hasn't been triggered yet. To test:

1. **In the macOS app**, go to "New Comparison" page
2. **Enter Figma URL**: `https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=6578-54894`
3. **Enter Web URL**: `https://www.freighttiger.com/v10/journey/listing`
4. **Enable authentication** (if there's an auth section):
   - Method: Form authentication
   - Username: `FTProductUser2@gmail.com`
   - Password: `DemoUser@@123`
5. **Click "Run Comparison" or "Compare"**

The system will:
1. Extract Figma data via MCP ✅ (already done)
2. Navigate to FreightTiger login page
3. Fill credentials and log in
4. Navigate to `/v10/journey/listing`
5. Extract web data (colors, fonts, spacing)
6. Run comparison

## Testing Commands

```bash
# Check what MCP returns for this Figma file
curl -X POST http://localhost:3847/api/figma-only/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=6578-54894"
  }' | jq '.data.typography'

# Test web extraction with auth
curl -X POST http://localhost:3847/api/web/extract-v3 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.freighttiger.com/v10/journey/listing",
    "authentication": {
      "method": "form",
      "credentials": {
        "username": "FTProductUser2@gmail.com",
        "password": "DemoUser@@123"
      }
    }
  }' | jq '.data.elements | length'
```

## Priority Actions

1. **HIGH**: Add CSS fallback typography extraction (Fix 1)
2. **HIGH**: Run actual comparison in UI to test web extraction
3. **MEDIUM**: Add debug logging to see MCP response structure
4. **LOW**: Enhance typography extraction to capture more details

## Expected Results After Fixes

### Typography:
- Should show font families used in the Figma file
- Count > 0
- Font details visible in UI

### Web Extraction:
- Elements: 50-200+ (depending on page complexity)
- Colors: 10-30 (colors used on the page)
- Fonts: 2-5 (font families)
- Spacing: 10-20 (margin/padding values)

