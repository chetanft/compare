# Security Guide: Environment Variables

## ⚠️ CRITICAL SECURITY INFORMATION

### VITE_ Prefixed Variables are PUBLIC

**IMPORTANT:** Any environment variable prefixed with `VITE_` is **PUBLICLY EXPOSED** in your built JavaScript bundle. This means:

1. ✅ `.env` files are gitignored (safe from committing)
2. ❌ **BUT** the VALUES are embedded in `frontend/dist/*.js` files
3. ❌ Anyone can view your website's source code and see these values
4. ❌ These values are visible in browser DevTools → Sources → JavaScript files

### What Gets Exposed?

When you build with Vite, all `VITE_*` variables are replaced with their actual values in the JavaScript bundle:

```javascript
// In your code:
const url = import.meta.env.VITE_SUPABASE_URL;

// In the built bundle (publicly visible):
const url = "https://your-project.supabase.co"; // ⚠️ EXPOSED!
```

## Supabase Anon Key: Designed to be Public

**Good news:** Supabase's `anon` key is **designed to be public**. It's meant for client-side use and has Row Level Security (RLS) policies protecting your data.

However, you should still:
- ✅ Use RLS policies to restrict access
- ✅ Never expose the `service_role` key (server-side only)
- ✅ Rotate keys if compromised

## Best Practices

### ✅ DO:

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use `.env.example`** for templates with placeholder values
3. **For production deployments:**
   - Use Vercel/Netlify environment variables (set in dashboard)
   - These are injected at build time, not committed to git
4. **For sensitive server-side variables:**
   - Use variables WITHOUT `VITE_` prefix
   - Keep them in root `.env` (not frontend)
   - Never expose them to the client

### ❌ DON'T:

1. **Don't commit `.env` files** (even if gitignored, double-check)
2. **Don't use `VITE_` prefix for sensitive secrets** (API keys, passwords, etc.)
3. **Don't store sensitive data in frontend code**
4. **Don't expose service_role keys or database passwords**

## File Structure

```
.env                    # Root .env (server-side, gitignored ✅)
frontend/.env           # Frontend .env (client-side, gitignored ✅)
frontend/.env.example   # Template (safe to commit ✅)
```

## Deployment Checklist

### Local Development:
- [ ] `.env` files are gitignored
- [ ] `.env.example` has placeholders (no real values)
- [ ] Never commit actual credentials

### Vercel/Netlify Deployment:
- [ ] Add environment variables in dashboard (Settings → Environment Variables)
- [ ] Variables are set for Production, Preview, Development
- [ ] No `.env` files in repository
- [ ] Build uses dashboard variables automatically

## What Should Be Public vs Private?

### ✅ Safe to Use with `VITE_` Prefix (Public):
- `VITE_SUPABASE_URL` - Public API endpoint
- `VITE_SUPABASE_ANON_KEY` - Public anon key (protected by RLS)
- `VITE_API_URL` - Public API endpoint
- Feature flags, public configuration

### ❌ NEVER Use with `VITE_` Prefix (Private):
- Database passwords
- Service role keys
- Secret API keys
- Authentication tokens
- Private credentials

## Verification

Check if your `.env` is properly ignored:

```bash
git check-ignore frontend/.env
# Should output: frontend/.env
```

If it's not ignored, add to `.gitignore`:
```
frontend/.env
.env
```

## Summary

- ✅ `.env` files are gitignored - safe from committing
- ⚠️ `VITE_*` variables are PUBLIC in the built bundle
- ✅ Supabase anon key is designed to be public
- ✅ Use Vercel/Netlify dashboard for production secrets
- ❌ Never commit real credentials to git

