# Development Workflow Guide

## The "Old App" Problem

### Why This Keeps Happening

The recurring issue of running old app versions happens because:

1. **macOS App Installation**: When you install the app via DMG, it goes to `/Applications/`
2. **System Registration**: macOS registers this as the "official" version
3. **Spotlight Priority**: Searches find `/Applications/` version first
4. **Development Builds**: New builds go to `dist/mac-arm64/` but don't replace the installed version

### Root Cause
```
/Applications/Figma Comparison Tool.app     ← Old installed version (gets launched by default)
dist/mac-arm64/Figma Comparison Tool.app   ← New development build (what we want to test)
```

## Permanent Solutions

### Option 1: Use Development Scripts (Recommended)

**Quick Commands:**
```bash
# Start development app (kills old, starts new)
npm run dev:restart

# Just start development app
npm run dev:app

# Build and start
npm run build:mac && npm run dev:app
```

**What the script does:**
- ✅ Kills any running instances
- ✅ Warns about installed versions
- ✅ Starts from `dist/` directory
- ✅ Verifies server is responding
- ✅ Shows helpful development info

### Option 2: Remove Installed Version

```bash
# Remove the installed version to avoid confusion
rm -rf "/Applications/Figma Comparison Tool.app"
```

### Option 3: Always Use Full Paths

```bash
# Always specify the exact path
./dist/mac-arm64/Figma\ Comparison\ Tool.app/Contents/MacOS/Figma\ Comparison\ Tool &
```

## Development Workflow

### 1. Making Changes
```bash
# Make your code changes
# Then rebuild and restart:
npm run build:mac && npm run dev:restart
```

### 2. Testing
```bash
# Check if app is running correctly
curl http://localhost:3007/api/test

# Test extraction
curl -X POST http://localhost:3007/api/compare \
  -H "Content-Type: application/json" \
  -d '{"figmaUrl": "...", "webUrl": "..."}'
```

### 3. Debugging
```bash
# Check which version is running
ps aux | grep "Figma Comparison Tool"

# Kill all instances
pkill -f "Figma Comparison Tool"

# Start fresh
npm run dev:app
```

## Prevention Tips

1. **Never double-click DMG files** during development
2. **Use `npm run dev:restart`** instead of manual app launching
3. **Remove installed versions** when doing active development
4. **Always check logs** to ensure you're running the right version

## Identifying the Correct Version

**✅ Correct (Development) Version:**
```
📡 GET /api/test
🧪 Test endpoint called
✅ Electron Express Server running on 127.0.0.1:3007
```

**❌ Wrong (Old) Version:**
```
# Simple logs without emojis
# Or "Something went wrong" errors
# Or missing features
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev:restart` | Kill old app, start new one |
| `npm run dev:app` | Start development app |
| `npm run build:mac` | Build new version |
| `pkill -f "Figma Comparison Tool"` | Kill all instances |
| `rm -rf "/Applications/Figma Comparison Tool.app"` | Remove installed version |

## Troubleshooting

**Problem**: "Something went wrong" error
**Solution**: `npm run dev:restart`

**Problem**: Old features/bugs appearing
**Solution**: Check you're running from `dist/`, not `/Applications/`

**Problem**: App won't start
**Solution**: `npm run build:mac && npm run dev:restart`
