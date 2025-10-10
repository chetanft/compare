# Visual Comparison Feature Deployment Plan

## Phase 1: Pre-Deployment Validation ✅
### 1.1 Development Server Testing
- [ ] Server running on port 3847
- [ ] Frontend loads without errors
- [ ] Run Figma-Web comparison with test URLs
- [ ] Verify all visual sections render:
  - Colors (if data available)
  - Typography
  - Spacing (if data available)
  - Border Radius (if data available)
- [ ] Check browser console - no React errors
- [ ] Verify comparison completes successfully
- [ ] Test "Save Report" functionality

### 1.2 Code Quality Checks
- [ ] No TypeScript errors
- [ ] No console.error in production build
- [ ] All object-to-primitive conversions working
- [ ] getTokenValue() helper used consistently

## Phase 2: Git Commit 📝
### 2.1 Stage Changes
```bash
git add frontend/src/pages/NewComparison.tsx
git add frontend/src/components/comparison/VisualTokenComparison.tsx
```

### 2.2 Commit Message
```
feat: Add visual design token comparison for colors, typography, spacing

- Created VisualTokenComparison component for visual display
- Added color palette analysis with auto-matching
- Added typography comparison with font family, size, weight
- Added spacing and border radius comparisons
- Fixed React error #31 with getTokenValue() helper
- Object-to-primitive conversion for all token types
- Graceful handling of missing data (conditional rendering)
- Side-by-side comparison layout with similarity scores

Fixes: Object rendering in JSX
Affects: Comparison results display, visual token analysis
```

## Phase 3: Production Build Testing 🏗️
### 3.1 Build Frontend
```bash
npm run build:frontend
```
- [ ] Build completes without errors
- [ ] No warnings about large chunks (acceptable)
- [ ] Output files created in frontend/dist/

### 3.2 Test Production Build Locally
```bash
# Start server with production build
npm run dev
# OR
node server.js
```
- [ ] Navigate to http://localhost:3847
- [ ] Run same test comparison
- [ ] Verify all visual sections work
- [ ] Check for minified errors in console
- [ ] Verify data displays correctly

## Phase 4: macOS App Build 🍎
### 4.1 Pre-Build Checklist
- [ ] Stop all dev servers (lsof -ti:3847 | xargs kill -9)
- [ ] Verify frontend/dist/ contains latest build
- [ ] Check electron/main.js uses correct paths
- [ ] Verify package.json electron config

### 4.2 Build macOS App
```bash
npm run build:mac
```
- [ ] Build completes without errors
- [ ] DMG created in dist/
- [ ] App bundle created

### 4.3 macOS App Installation
```bash
# Unmount any existing DMG
hdiutil detach /Volumes/Figma\ Comparison\ Tool -force 2>/dev/null

# Install new version
open dist/Figma\ Comparison\ Tool-*.dmg
# Drag to Applications
# Eject DMG
```

## Phase 5: macOS App Testing 🧪
### 5.1 Launch Test
- [ ] Double-click app in Applications
- [ ] App icon appears in dock
- [ ] Server starts automatically (console logs visible in dev tools)
- [ ] Main UI loads without errors
- [ ] No white screen
- [ ] No "Something went wrong" error

### 5.2 Functional Test
- [ ] Run Figma-Web comparison:
  - Figma URL: https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/...
  - Web URL: https://www.freighttiger.com/v10/journey/listing
  - Credentials: FTProductUser2@gmail.com / DemoUser@@123
- [ ] Comparison completes (both extractions succeed)
- [ ] Visual Design Token Analysis section appears
- [ ] Colors section displays (18 Figma colors)
- [ ] Typography section displays (14 fonts)
- [ ] Spacing section displays (if web data extracted)
- [ ] Border Radius section displays (if web data extracted)
- [ ] No React errors in console
- [ ] "Save Report" button works
- [ ] Stop Server button works

### 5.3 Edge Case Testing
- [ ] Test with Figma-only extraction (no web data)
- [ ] Test with Web-only extraction (no Figma data)
- [ ] Verify conditional rendering (sections only show if data exists)
- [ ] Test with empty/missing token values

## Phase 6: Git Push 🚀
### 6.1 Push to Repository
```bash
git push origin main
```
- [ ] Push successful
- [ ] No conflicts
- [ ] CI/CD passes (if configured)

## Phase 7: Rollback Plan 🔄
### In Case of Issues:
```bash
# Revert commit
git revert HEAD

# Or reset to previous commit
git reset --hard HEAD~1

# Rebuild previous version
npm run build:frontend
npm run build:mac
```

## Success Criteria ✅
1. ✅ Development server works perfectly
2. ✅ Production build works identically
3. ✅ macOS app launches without errors
4. ✅ All visual comparison sections render
5. ✅ No React errors in any environment
6. ✅ Comparison completes successfully
7. ✅ Git commit is clean and descriptive

## Known Issues & Mitigations
1. **Typography as Object**: Fixed with Object.values() conversion
2. **React Error #31**: Fixed with getTokenValue() helper
3. **Missing Data**: Handled with conditional rendering (if data exists)
4. **Color Matching**: Basic exact-match algorithm included

## Timeline
- Phase 1-3: 15 minutes (validation + commit + build)
- Phase 4-5: 10 minutes (macOS build + testing)
- Phase 6-7: 5 minutes (push + verification)
- **Total: ~30 minutes for complete deployment**
