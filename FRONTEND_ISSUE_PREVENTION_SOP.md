# Frontend Issue Prevention SOP

## The 48-Hour Problem

**Symptom**: Browser shows "Something went wrong" screen after server changes
**Impact**: Takes 48+ hours to debug what should be a 5-minute fix
**Root Cause**: Browser cache issues masquerading as server problems

## Systematic Solution

### 1. Immediate Diagnosis (< 2 minutes)

```bash
npm run diagnose
```

This will check:
- ✅ Server health (port 3847)
- ✅ Process running 
- ✅ Frontend build exists
- ✅ Static files served

### 2. Quick Recovery Commands

| Issue | Command | Time |
|-------|---------|------|
| Browser cache | Hard refresh (Cmd+Shift+R) | 10 seconds |
| JS errors | Open incognito window | 30 seconds |
| Frontend stale | `npm run fix:frontend` | 2 minutes |
| Server restart | `pkill -f "PORT=3847" && npm start` | 1 minute |

### 3. Prevention Mechanisms

#### A. Build Process
- ✅ Auto-cleanup old builds: `npm run clean:dist`
- ✅ Cache-busting headers in development
- ✅ Version consistency checks

#### B. Development Workflow
```bash
# After any server change:
1. npm run build:frontend    # Rebuild frontend
2. npm run diagnose         # Verify health
3. Hard refresh browser     # Clear cache
```

#### C. Emergency Recovery
```bash
# Nuclear option (< 5 minutes):
pkill -f "PORT=3847"        # Kill server
rm -rf frontend/dist        # Clear frontend
npm run build:frontend      # Rebuild
npm start                   # Start fresh
# Then hard refresh browser
```

## Why This Keeps Happening

1. **Browser Cache**: Old JavaScript cached, new API calls fail
2. **Build Mismatch**: Frontend built with old config, server updated
3. **Port Confusion**: Multiple servers/processes on different ports
4. **CSP Issues**: Security policies blocking updated scripts
5. **Version Skew**: Frontend/backend out of sync

## The Real Fix

**Stop debugging the server - it's usually the browser!**

90% of "Something went wrong" screens after server changes are:
- Browser cache issues (60%)
- JavaScript runtime errors (25%)
- Build/version mismatches (5%)

## Emergency Checklist

When you see "Something went wrong":

- [ ] Run `npm run diagnose` (2 min)
- [ ] Hard refresh browser (10 sec)
- [ ] Try incognito window (30 sec)
- [ ] Check browser console for JS errors (1 min)
- [ ] Run `npm run fix:frontend` (2 min)
- [ ] Try different browser (1 min)

**Total time to resolution: < 7 minutes instead of 48 hours**

## Memory Aid

```
Server healthy + "Something went wrong" = Browser issue, not server issue
```
