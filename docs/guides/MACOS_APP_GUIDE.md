# macOS App Installation Guide

## 🎉 Your Figma Comparison Tool is Ready!

We've successfully converted your web-based Figma Comparison Tool into a native macOS application.

## 📦 Generated Files

In the `dist/` folder, you'll find:

- **`Figma Comparison Tool-1.0.0.dmg`** - For Intel Macs (x64)
- **`Figma Comparison Tool-1.0.0-arm64.dmg`** - For Apple Silicon Macs (M1/M2/M3)

## 🚀 Installation Steps

### 1. Choose Your DMG File
- **Intel Mac**: Use `Figma Comparison Tool-1.0.0.dmg`
- **Apple Silicon Mac**: Use `Figma Comparison Tool-1.0.0-arm64.dmg`

### 2. Install the App
1. **Double-click** the DMG file
2. **Drag** the app to your Applications folder
3. **Eject** the DMG

### 3. First Launch (Important!)
Since the app is unsigned, you'll need to bypass Gatekeeper:

1. **Go to Applications folder**
2. **Right-click** on "Figma Comparison Tool"
3. **Select "Open"**
4. **Click "Open"** in the security dialog

After this first launch, you can open the app normally by double-clicking.

## ✨ What You Get

### Native macOS Experience
- **Menu Bar**: Full native menus (File, Edit, View, Window, Help)
- **Keyboard Shortcuts**: Standard Mac shortcuts (⌘N, ⌘O, ⌘W, etc.)
- **Window Management**: Native window controls and behaviors
- **Dock Integration**: App appears in your dock with progress indicators

### All Your Existing Features
- **Figma Extraction**: Full MCP integration for Figma data
- **Web Scraping**: Complete web extraction capabilities
- **Visual Comparison**: Screenshot and visual diff tools
- **Report Generation**: HTML reports with all analysis
- **Authentication**: FreightTiger and other site login support

### Performance Benefits
- **Faster Startup**: No browser overhead
- **Better Memory Management**: Native resource handling
- **Offline Capable**: Works without internet (for local files)

## 🔧 Development Commands

If you want to modify the app:

```bash
# Run in development mode
npm run electron:dev

# Build new DMG files
npm run build:mac

# Build frontend only
npm run build:frontend
```

## 📁 App Structure

The macOS app includes:
- **Backend Server**: Your Node.js server runs embedded
- **Frontend**: React app served locally
- **Native Shell**: Electron provides macOS integration

## 🐛 Troubleshooting

### App Won't Open
- Make sure you right-clicked and selected "Open" on first launch
- Check Console app for error messages

### ES Module Errors (Fixed)
- ✅ **Fixed**: Converted Electron main process to use ES modules
- ✅ **Fixed**: Preload script uses CommonJS (.cjs extension)
- ✅ **Fixed**: Compatible with your project's ES module setup

### Spawn ENOTDIR Errors (Fixed)
- ✅ **Fixed**: Enhanced path resolution for server.js location
- ✅ **Fixed**: Multiple fallback paths for different environments
- ✅ **Fixed**: Robust error handling and debugging output

### Features Not Working
- The app needs the same dependencies as your web version
- Config files (`config.json`) should be in the app bundle

### Performance Issues
- The app includes all your existing dependencies
- Large Puppeteer operations may still take time
- Check Activity Monitor if needed

## 🔄 Updates

To update the app:
1. Make changes to your code
2. Run `npm run build:mac`
3. Install the new DMG file (overwrites the old one)

## 📊 App Size

- **Intel Version**: ~140MB
- **Apple Silicon**: ~135MB

Size includes:
- Electron runtime
- Node.js dependencies
- Your complete application
- Puppeteer browser binaries

## 🎯 Next Steps

Your Figma Comparison Tool is now a fully functional macOS application! You can:

1. **Use it daily** for your design comparison workflow
2. **Share with team members** (they'll need to do the right-click open process)
3. **Customize further** by modifying the Electron configuration
4. **Add app icons** by creating proper .icns files

Enjoy your new native macOS app! 🚀
