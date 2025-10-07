# 🚀 Quick Start Guide - Figma Web Comparison Tool

## ✨ **Super Simple Setup (No Terminal Required!)**

### **Method 1: Double-Click (Easiest)** 
1. **Double-click** the `start.command` file in this folder
2. Your browser will automatically open to `http://localhost:3847`
3. Start comparing your designs! 🎨

### **Method 2: From Finder**
1. Right-click on `start.command` → "Open With" → "Terminal"
2. Browser opens automatically
3. Done!

### **Method 3: Terminal Command**
Open Terminal in this folder and run:
```bash
npm run dev
```

---

## 🎯 **How to Use the App**

### **1. Basic Comparison**
- **Figma URL**: Paste your Figma design URL
- **Web URL**: Paste the live website URL  
- Click **"Start Comparison"**

### **2. Example URLs to Test**
**Figma**: `https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260&t=gJqkGD3cpEHFth5D-4`

**Web**: `https://demo.aftercrop.in/incoming/shipments`

### **3. View Results**
- The app will extract and compare designs
- View detailed reports with differences
- Export reports as needed

---

## 🔧 **Troubleshooting**

### **If double-clicking doesn't work:**
1. Right-click the `start.command` file
2. Select "Open With" → "Terminal"
3. Or open Terminal and run: `npm run dev`

### **If you see "404 Not Found" errors:**
The app has been fixed to correctly route to local backend servers.

### **If Node.js is missing:**
Download and install from: [nodejs.org](https://nodejs.org/)

---

## 🌐 **App URLs**
- **Main App**: http://localhost:3847
- **Health Check**: http://localhost:3847/health
- **API**: http://localhost:3847/api/*

---

## 🛑 **To Stop the App**
- Press `Ctrl+C` in the terminal window
- Or close the terminal window

---

## 📋 **What's Fixed**
✅ **API routing** - Now correctly calls local backend  
✅ **Environment detection** - Proper development vs production mode  
✅ **Automatic frontend building** - No manual build steps needed  
✅ **One-click launcher** - Just double-click to start  
✅ **Port management** - Consistent port usage across frontend/backend
✅ **Path handling** - Works with spaces in folder names 