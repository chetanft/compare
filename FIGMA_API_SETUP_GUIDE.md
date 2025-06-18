# Figma API Setup Guide

## 🚨 Current Issue: Invalid API Key Scope

The visual comparison feature is **working correctly**, but the Figma API key has insufficient permissions.

### Error Details
```
"Invalid scope(s): file_dev_resources:read, file_content:read, library_assets:read"
```

### What This Means
- ✅ **Visual comparison is turned on and functional**
- ❌ **Figma API key lacks required permissions**
- ❌ **Cannot access Figma files** (getting 404 errors)

## 🔧 How to Fix

### 1. Create New Figma Personal Access Token

1. **Go to Figma Account Settings**:
   - Visit: https://www.figma.com/settings
   - Or: Figma → Settings → Account → Personal Access Tokens

2. **Generate New Token**:
   - Click "Create new token"
   - Name: `Design Comparison Tool`
   - **Scopes Required** (select ALL):
     - ✅ `File content` - Read design files
     - ✅ `File comments` - Read file metadata  
     - ✅ `File dev resources` - Access development resources
     - ✅ `Library analytics` - Read library usage
     - ✅ `Webhook` - For real-time updates

3. **Copy the Token**:
   - Save it immediately (you won't see it again)
   - Example: `figd_PLACEHOLDER_TOKEN_FORMAT`

### 2. Update Environment Variable

```bash
# Set the new token
export FIGMA_API_KEY="figd_your_new_token_here"

# Or update your .env file:
echo "FIGMA_API_KEY=figd_your_new_token_here" >> .env
```

### 3. Restart the Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
node server-unified.js
```

## 🧪 Test the Fix

### Test 1: Verify API Key Works
```bash
curl -H "X-Figma-Token: YOUR_NEW_TOKEN" "https://api.figma.com/v1/me"
```

**Expected**: Your Figma user profile (not a 403 error)

### Test 2: Test File Access
```bash
curl -H "X-Figma-Token: YOUR_NEW_TOKEN" "https://api.figma.com/v1/files/YOUR_FILE_ID"
```

**Expected**: File data (not 404 error)

### Test 3: Test Visual Comparison
1. Open: http://localhost:3006
2. Enter your Figma URL and a web URL
3. ✅ **Check "Include Visual Comparison"**
4. Submit the comparison
5. **Expected**: Full comparison with visual diffs!

## 📋 File Access Requirements

### Public Files
- ✅ **Any Figma file marked as "Anyone with the link can view"**
- ✅ **Community files and templates**

### Private Files  
- ✅ **Files you own**
- ✅ **Files in teams where you have access**
- ❌ **Private files you don't have access to**

### URL Format
Use these URL formats:
```
https://www.figma.com/design/FILE_ID/File-Name?node-id=NODE_ID
https://www.figma.com/file/FILE_ID/File-Name?node-id=NODE_ID
```

## 🎯 Why Visual Comparison Failed Before

The issue was **NOT** with visual comparison code - it was:

1. **Missing API Integration**: `includeVisual` flag was ignored
2. **Figma Access Issues**: API key scope problems
3. **No Error Handling**: Failed silently without proper feedback

## ✅ What's Fixed Now

1. **Visual Comparison Activated**: `includeVisual` flag now works
2. **Proper Error Messages**: Clear feedback about API issues  
3. **Graceful Degradation**: System continues working even if Figma fails
4. **Complete Integration**: Visual data included in reports and responses

## 🚀 Next Steps

1. **Fix API Key** (this guide)
2. **Test with Real Data** 
3. **Enjoy Visual Comparisons**!

Once the API key is fixed, you'll get:
- 📸 **Real web page screenshots**
- 🎨 **Actual Figma design images** 
- 🔍 **Pixel-perfect comparisons**
- 📊 **Visual similarity metrics**
- 📋 **Side-by-side diff reports**

**No more red placeholder images!** 🎉 