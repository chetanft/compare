# macOS App Testing Instructions

## Installation

### Option 1: Install from DMG (Recommended)
```bash
# Open the ARM64 DMG (for Apple Silicon Macs)
open "dist/Figma Comparison Tool-1.1.0-arm64.dmg"

# Or x64 DMG (for Intel Macs)
open "dist/Figma Comparison Tool-1.1.0.dmg"

# Drag "Figma Comparison Tool" to Applications folder
# Eject DMG
# Launch from Applications folder
```

### Option 2: Quick Test Without Installing
```bash
# Extract and run directly (temporary)
cd "dist/mac-arm64/Figma Comparison Tool.app/Contents/MacOS"
./Figma\ Comparison\ Tool
```

## Testing Checklist

### 1. Launch Test ✅
- [ ] App icon appears in Applications
- [ ] Double-click launches app
- [ ] App icon appears in dock
- [ ] Server starts automatically (see console logs in dev tools)
- [ ] Main UI loads (no white screen)
- [ ] No "Something went wrong" error screen

### 2. Functionality Test ✅
Run a full comparison with these test URLs:

**Figma URL:**
```
https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=6578-54894&t=YuqCa4WIWkb21fCk-4
```

**Web URL:**
```
https://www.freighttiger.com/v10/journey/listing
```

**Credentials:**
- Email: `FTProductUser2@gmail.com`
- Password: `DemoUser@@123`

### 3. Visual Comparison Verification ✅
After comparison completes, verify:

- [ ] **Color Palette Section Appears**
  - Shows "Color Palette" heading
  - Displays Figma colors (18 total)
  - Displays Web colors (25 total)
  - Shows matched colors in green
  - Shows missing colors in red
  - Shows extra colors in orange
  - Similarity percentage displayed

- [ ] **Typography Section Appears**
  - Shows "Typography" heading
  - Displays font families with "Aa" preview
  - Shows font sizes and weights
  - Lists 14 Figma typography tokens
  - Shows matched/missing/extra fonts

- [ ] **Spacing Section** (if data available)
  - Shows "Spacing" heading
  - Displays spacing values

- [ ] **Border Radius Section** (if data available)
  - Shows "Border Radius" heading
  - Displays border radius values

### 4. Error Verification ✅
- [ ] No React errors in browser console (Cmd+Option+I)
- [ ] No "Objects are not valid as React child" error
- [ ] No "Minified React error #31" error
- [ ] Comparison completes without crashes

### 5. Additional Features ✅
- [ ] "Save Report" button works
- [ ] "Stop Server" button works
- [ ] Reports section shows generated reports
- [ ] Extraction details display correctly

## Expected Console Output

When app launches, you should see:
```
🚀 STARTING FIGMA COMPARISON TOOL SERVER
✅ SERVER STARTED SUCCESSFULLY ON PORT 3847
🎉 Figma Comparison Tool is ready!
```

During comparison:
```
✅ Figma extraction completed: 389 components
✅ Web extraction completed: 1489 elements
✅ Comparison completed
📄 HTML report generated
```

## Troubleshooting

### App Won't Launch
1. Check if port 3847 is already in use:
   ```bash
   lsof -ti:3847
   ```
2. If process exists, kill it:
   ```bash
   lsof -ti:3847 | xargs kill -9
   ```
3. Restart the app

### White Screen
1. Hard refresh: Cmd+Shift+R
2. Open dev tools: Cmd+Option+I
3. Check console for errors
4. Restart app

### "Server Stopped" Page
- Click "Start Server" button
- Should reload automatically

### Visual Sections Not Showing
- Check if comparison completed successfully
- Verify data was extracted (check extraction details)
- If no data, sections won't appear (this is expected)

## Uninstallation

To remove the app:
```bash
# Remove from Applications
rm -rf /Applications/Figma\ Comparison\ Tool.app

# Remove user data (if needed)
rm -rf ~/Library/Application\ Support/figma-comparison-tool
rm -rf ~/Library/Caches/figma-comparison-tool
```

## Development Mode Testing

To test with hot reload:
```bash
# Stop all servers
lsof -ti:3847 | xargs kill -9

# Start dev server
npm run dev

# Visit http://localhost:3847
```

## Build Info

- **Version**: 1.1.0
- **Electron**: 28.3.3
- **Node**: Bundled with Electron
- **Platform**: macOS (ARM64 + x64)
- **Bundle Size**: ~146 MB (ARM64), ~151 MB (x64)

## Success Criteria

✅ App launches without errors
✅ Server starts automatically
✅ UI loads correctly
✅ Comparison completes successfully
✅ Visual sections display (colors, typography)
✅ No React errors
✅ All buttons work (Save Report, Stop Server)

If all criteria pass: **Deployment Successful!** 🎉
