# 🚀 Figma Dev Mode MCP Setup Guide

## ✅ **Implementation Status**

**COMPLETED**: Full Figma Dev Mode MCP integration based on [official documentation](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server)

- ✅ **Dev Mode MCP Client** created (`src/figma/devModeMCPClient.js`)
- ✅ **Integration** added to robust extractor  
- ✅ **Fallback chain**: Dev Mode MCP → Legacy MCP → Figma API
- ✅ **Configuration** updated in `mcp.json`
- ✅ **Server restarted** with new integration

---

## 🎯 **Expected Results After Setup**

### **Before (What You Had)**
- ❌ Colors: 6 tokens
- ❌ Typography: 2 tokens  
- ❌ Limited component data
- ❌ Manual token extraction from API

### **After (With Dev Mode MCP)**
- ✅ Colors: **20-50+ tokens** (all design system colors)
- ✅ Typography: **10-20+ tokens** (all text styles)
- ✅ **Spacing variables** automatically extracted
- ✅ **Component variants and props**
- ✅ **Native Figma design tokens**

---

## 📋 **Setup Steps**

### **Step 1: Enable Figma Dev Mode MCP Server**

1. **Open Figma Desktop App** (required - browser version won't work)
2. **Update to latest version** (Settings → Check for updates)
3. **Enable Dev Mode MCP Server**:
   - **Figma menu** → **Preferences** 
   - Check **"Enable Dev Mode MCP Server"**
   - You should see: "MCP Server enabled and running at http://127.0.0.1:3845/sse"

### **Step 2: Verify Server is Running**

Open Terminal and test the connection:
```bash
curl -s http://127.0.0.1:3845/sse
```

**Expected**: Should not give "connection refused" error

### **Step 3: Test Your App**

Your server is already restarted with Dev Mode MCP integration. Now test:

1. **Open**: http://localhost:3007
2. **Go to**: Figma Data page
3. **Enter your URL**: `https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260&t=gJqkGD3cpEHFth5D-4`
4. **Add Figma token** 
5. **Click**: "Extract Figma Data"

### **Step 4: Check Console Logs**

Look for these messages in your app console:

#### **Success (Dev Mode MCP Working)**
```
🔌 Attempting extraction via Figma Dev Mode MCP...
✅ Figma Dev Mode MCP server is available
🎨 Getting variable definitions via Dev Mode MCP...
✅ Variable definitions extracted via Dev Mode MCP
🎨 Dev Mode MCP extracted design tokens:
  - Colors: 25
  - Typography: 12
  - Spacing: 18
  [etc...]
```

#### **Fallback (Dev Mode MCP Not Available)**
```
❌ Failed to connect to Figma Dev Mode MCP server
🔄 Falling back to legacy MCP...
🔄 Falling back to direct API...
```

---

## 🧪 **Testing Results**

### **What to Look For**

#### **In the UI:**
- **Colors tab**: Should show significantly more colors (20-50+ instead of 6)
- **Typography tab**: Should show many more typography tokens (10-20+ instead of 2)
- **New token names**: Should include actual Figma variable names
- **Debug info**: Should show "figma-dev-mode-mcp" as extraction method

#### **In Console:**
- **Connection success**: "✅ Figma Dev Mode MCP server is available"
- **Rich extraction**: Much higher token counts in logs
- **Sample data**: Should show actual color/typography names from your design

---

## 🐛 **Troubleshooting**

### **Issue: "Failed to connect to Figma Dev Mode MCP server"**

**Solutions:**
1. **Ensure Figma Desktop is running** (not browser)
2. **Check Dev Mode MCP is enabled** in Figma Preferences
3. **Restart Figma Desktop app**
4. **Test connection**: `curl http://127.0.0.1:3845/sse`

### **Issue: Still Getting Limited Tokens**

**Check:**
1. **Console logs** - Is Dev Mode MCP being attempted?
2. **Figma file** - Does it actually have design variables/tokens?
3. **URL format** - Ensure proper Figma URL format

### **Issue: "Dev Mode MCP API error"**

**Solutions:**
1. **Update Figma Desktop** to latest version
2. **Check file permissions** - Ensure you have access to the Figma file
3. **Try different node ID** or no node ID

---

## 🔄 **Fallback Behavior**

The app now tries extraction in this order:

1. **Figma Dev Mode MCP** (highest priority, richest data)
2. **Legacy MCP integration** (if Dev Mode fails)
3. **Direct Figma API** (fallback, limited data)

This ensures you always get **some** data, but **best** data when Dev Mode MCP is available.

---

## 📊 **Expected Improvement Examples**

### **Colors**
- **Before**: `#F8F8F9`, `#CED1D7`, `#FFBE07` (6 total)
- **After**: `primary-500`, `secondary-100`, `success-600`, `error-400`, etc. (20-50+ total)

### **Typography**  
- **Before**: `Inter 24px 600`, `Inter 16px Regular` (2 total)
- **After**: `heading-xl`, `body-medium`, `caption-small`, `button-text`, etc. (10-20+ total)

### **New Token Types**
- **Spacing**: `spacing-xs`, `spacing-md`, `spacing-xl`
- **Border Radius**: `radius-sm`, `radius-lg`, `radius-full`
- **Shadows**: `shadow-card`, `shadow-modal`, `shadow-tooltip`

---

## 🎉 **Next Steps**

1. **Test the setup** following the steps above
2. **Check console logs** to verify Dev Mode MCP connection
3. **Compare results** - you should see dramatically more design tokens
4. **Report back** with the results!

If Dev Mode MCP is working, you'll see a **massive improvement** in design token extraction. If not, we'll troubleshoot the connection to Figma's Dev Mode server.

---

## 💡 **Pro Tips**

### **For Best Results**
- **Use Figma files with design variables** (colors, typography, spacing)
- **Ensure proper component structure** in Figma
- **Test with different node IDs** to see various token extraction
- **Keep Figma Desktop app running** while extracting

### **Debugging**
- **Check browser console** for detailed extraction logs
- **Test connection manually**: `curl http://127.0.0.1:3845/sse`
- **Verify Figma preferences** show MCP server as enabled

**🚀 Your app now has cutting-edge Figma Dev Mode MCP integration!** 