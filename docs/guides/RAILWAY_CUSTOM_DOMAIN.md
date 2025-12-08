# Railway Custom Domain Setup

## Using Your Vercel Domain with Railway

If you have a domain configured in Vercel and want to use it with Railway instead, here's how to set it up:

## Option 1: Point Domain to Railway (Recommended)

### Step 1: Get Railway Domain
1. Go to Railway Dashboard → Your Project
2. Go to **Settings** → **Domains**
3. Railway provides a default domain: `your-app.up.railway.app`
4. Or add a custom domain in Railway

### Step 2: Update DNS in Vercel/Domain Provider

#### If Domain is Managed by Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Remove the domain from Vercel (or keep it, but point DNS to Railway)
3. Go to your domain registrar (where you bought the domain)
4. Update DNS records:

**For Root Domain (example.com):**
```
Type: CNAME
Name: @
Value: your-app.up.railway.app
```

**For Subdomain (www.example.com):**
```
Type: CNAME
Name: www
Value: your-app.up.railway.app
```

#### If Domain is Managed Elsewhere:
1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Update DNS records to point to Railway:

**CNAME Record:**
```
Type: CNAME
Host: @ (or www)
Points to: your-app.up.railway.app
TTL: 3600
```

**OR A Record (if CNAME not supported for root):**
```
Type: A
Host: @
Points to: [Railway IP - get from Railway support]
TTL: 3600
```

### Step 3: Add Domain in Railway
1. Railway Dashboard → Your Project → Settings → Domains
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `example.com` or `www.example.com`)
4. Railway will verify DNS configuration
5. SSL certificate will be automatically provisioned

## Option 2: Keep Both Deployments

You can keep both Vercel and Railway deployments:

- **Vercel**: Frontend-only deployment (if you want)
- **Railway**: Full-stack deployment (recommended)

### Update Environment Variables

If using Railway with custom domain, update:

```bash
# In Railway Dashboard → Variables
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
VITE_API_URL=https://your-domain.com
```

## Option 3: Use Railway's Default Domain

Railway provides a free domain: `your-app.up.railway.app`

- ✅ Works immediately
- ✅ SSL included
- ✅ No DNS configuration needed
- ✅ Can add custom domain later

## DNS Propagation

After updating DNS:
- **Propagation Time**: 5 minutes to 48 hours
- **Check Status**: Use `dig` or online DNS checker
- **Railway Verification**: Railway will show "Verified" when DNS is correct

## Verify Domain Setup

### Check DNS:
```bash
# Check CNAME record
dig CNAME your-domain.com

# Check A record
dig A your-domain.com
```

### Check Railway:
1. Railway Dashboard → Settings → Domains
2. Status should show "Verified" ✅
3. SSL certificate should be "Active" ✅

## Troubleshooting

### Domain Not Resolving
- Wait for DNS propagation (up to 48 hours)
- Verify DNS records are correct
- Check Railway domain status

### SSL Certificate Issues
- Railway automatically provisions SSL
- May take a few minutes after DNS verification
- Check Railway dashboard for SSL status

### CORS Errors
- Update `CORS_ORIGINS` in Railway to include your domain
- Format: `https://your-domain.com,https://www.your-domain.com`

## Example Configuration

### Railway Environment Variables:
```bash
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
VITE_API_URL=https://your-domain.com
```

### DNS Records (at domain registrar):
```
Type: CNAME
Name: @
Value: your-app.up.railway.app
TTL: 3600

Type: CNAME
Name: www
Value: your-app.up.railway.app
TTL: 3600
```

## Next Steps

1. ✅ Add domain in Railway Dashboard
2. ✅ Update DNS records at domain registrar
3. ✅ Wait for DNS propagation
4. ✅ Verify domain in Railway
5. ✅ Update CORS_ORIGINS environment variable
6. ✅ Test your domain!

## 📚 Resources

- [Railway Custom Domains](https://docs.railway.app/guides/custom-domains)
- [DNS Configuration Guide](https://docs.railway.app/guides/custom-domains#dns-configuration)
