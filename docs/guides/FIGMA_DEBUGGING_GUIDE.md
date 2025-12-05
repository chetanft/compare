# Figma Extraction Debugging Guide

## 🔍 **DEBUGGING STEPS TO FOLLOW**

### **Step 1: Verify Backend Connectivity**
1. **Open the new DMG** and install the app
2. **Open Developer Tools** (F12 or Cmd+Option+I)
3. **Go to Console tab**
4. **Test backend connectivity** by opening: `http://localhost:3007/api/test`
   - Should show: `{"success": true, "message": "Backend is working!"}`
   - If this fails, the backend isn't starting properly

### **Step 2: Check Console Logs During Extraction**
When you click "Extract Data", watch for these console messages:

**Expected Success Flow:**
```
🎯 /api/figma-only/extract endpoint hit
🚀 Figma extract endpoint called
📋 Request body: { "url": "https://...", ... }
🚀 Starting Figma extraction for: https://...
📋 Parsed file ID: fb5YcTaKJv9YWsMLnNlWeK
🔍 Raw node-id from URL: 2-22260
🔄 Converted dash format to: 2:22260
✅ Final parsed node-id: 2:22260
⚡ Using optimized nodes endpoint for node: 2:22260
⏰ Setting timeout to 10000ms (lightMode: true)
🔑 API key configured: Yes (length: XX)
🧪 Testing API key with /v1/me endpoint...
✅ API key valid for user: your-email@domain.com
📡 Making Figma API request to: https://api.figma.com/v1/files/fb5YcTaKJv9YWsMLnNlWeK/nodes?ids=2:22260
✅ Figma API response received (XXXXms)
📊 Figma data received, processing...
⚡ Running light analysis...
✅ Data processing completed in XXms
🎉 Figma extraction completed in XXXXms
```

### **Step 3: Identify Where It Fails**

#### **If you see NO console logs:**
- Backend isn't starting or endpoint not reached
- Check if app is running on correct port
- Try: `http://localhost:3007/api/health`

#### **If it stops at "Testing API key":**
- **API key is invalid or expired**
- **Solution**: Update your Figma API key in Settings

#### **If it stops at "Making Figma API request":**
- **Network timeout or Figma API is slow**
- **File might be too large**
- **Solution**: Try with a smaller file or specific node

#### **If you see "TimeoutError" or "aborted":**
- **Request is timing out (10s for light mode)**
- **Solution**: Try "Frame Only" mode or smaller section

### **Step 4: Test Different Scenarios**

#### **Test 1: Simple API Key Test**
1. Go to Settings
2. Click "Test Connection" 
3. Should show success with your email

#### **Test 2: Small File Test**
Try with a simple Figma file (few components) first

#### **Test 3: Specific Node Test**
Use a URL with `?node-id=` parameter for faster extraction

#### **Test 4: Frame Only Mode**
Select "Frame Only" instead of "Both" for faster extraction

### **Step 5: Common Error Solutions**

#### **"Invalid Figma API key"**
- Go to Figma → Settings → Personal Access Tokens
- Create new token with "File content" permission
- Update in app Settings

#### **"Network error"**
- Check internet connection
- Try different network (mobile hotspot)
- Figma API might be down

#### **"Timed out after 10000ms"**
- File is too large for light mode
- Try "Frame Only" extraction mode
- Use specific node URL instead of full file

#### **"Request aborted: timed out after 45s"**
- Frontend timeout (our new 45s limit)
- Backend is hanging somewhere
- Check console for where it stops

### **Step 6: Advanced Debugging**

#### **Check Network Tab**
1. Open Developer Tools → Network tab
2. Click "Extract Data"
3. Look for the API request to `/api/figma-only/extract`
4. Check if it's pending, failed, or completed

#### **Check Response Details**
- Click on the failed request in Network tab
- Look at Response tab for error details
- Check Headers for status codes

### **Step 7: Fallback Options**

#### **If All Else Fails:**
1. **Try web version**: Use the original web app to compare
2. **Use different file**: Test with a known working Figma file
3. **Check Figma permissions**: Ensure file is accessible with your token
4. **Restart app**: Close and reopen the macOS app

## 🚨 **WHAT TO REPORT**

If extraction still fails, please provide:

1. **Console logs**: Copy all console output during extraction attempt
2. **Network tab**: Screenshot of failed request details
3. **Error message**: Exact error text shown in UI
4. **File info**: Size/complexity of Figma file being extracted
5. **API key status**: Whether test connection works

## ⚡ **QUICK FIXES TO TRY**

1. **Restart the app** completely
2. **Update API key** in Settings
3. **Try "Frame Only"** extraction mode
4. **Use specific node URL** instead of full file
5. **Test with smaller file** first
6. **Check internet connection**

The enhanced debugging should help identify exactly where the extraction is failing!
