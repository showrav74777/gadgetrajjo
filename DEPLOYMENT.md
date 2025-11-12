# Deployment Guide - Gadget's Rajjo E-Commerce

## Pre-Deployment Checklist

### 1. Database Migrations
Run all migrations in Supabase SQL Editor in order:
- `20250101000000_storage_setup.sql` - Storage bucket setup
- `20250102000000_fix_order_insert.sql` - Order insertion fix
- `20250103000000_add_cost_price.sql` - Cost price column
- `20250104000000_user_activity_tracking.sql` - Activity tracking
- `20250105000000_add_multiple_images.sql` - Multiple images support

### 2. Environment Variables
Ensure these are set in your deployment platform:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Build Optimization
The project is already configured with:
- ✅ Code splitting (React.lazy)
- ✅ Image lazy loading
- ✅ Bundle optimization (manual chunks)
- ✅ Minification (Terser)
- ✅ Console.log removal in production
- ✅ Pagination for better performance

## Performance Optimizations Implemented

### ✅ Rule 1: Make Fewer HTTP Requests
- Code splitting with React.lazy
- Manual chunk splitting for vendors
- Combined CSS/JS bundles

### ✅ Rule 2: Use a Content Delivery Network
- Supabase Storage with CDN
- Static assets served via CDN (configure in deployment)

### ✅ Rule 3: Add an Expires Header
- Configure in your hosting provider (Vercel/Netlify auto-configures)
- Cache static assets for 1 year

### ✅ Rule 4: Gzip Components
- Vite automatically compresses assets
- Enable gzip on server if needed

### ✅ Rule 5: Put Stylesheets at the Top
- CSS is inlined in production build
- Critical CSS loaded first

### ✅ Rule 6: Put Scripts at the Bottom
- Scripts are deferred/async
- Non-blocking script loading

### ✅ Rule 7: Avoid CSS Expressions
- No CSS expressions used
- Pure CSS animations

### ✅ Rule 8: Make JavaScript and CSS External
- External bundles for better caching
- Separate vendor chunks

### ✅ Rule 9: Reduce DNS Lookups
- Single Supabase domain
- Minimal external resources

### ✅ Rule 10: Minify JavaScript
- Terser minification enabled
- Production build minifies all JS

### ✅ Rule 11: Avoid Redirects
- Direct routes, no redirects
- Clean URL structure

### ✅ Rule 12: Remove Duplicate Scripts
- Single bundle per dependency
- No duplicate imports

### ✅ Rule 13: Configure Etags
- Configure in hosting provider
- Vercel/Netlify handle automatically

### ✅ Rule 14: Make Ajax Cacheable
- React Query caching
- Supabase query caching
- Pagination reduces data load

### ✅ HTTP/2.0
- Modern hosting providers use HTTP/2
- Enable in hosting settings

## Additional Optimizations

### Image Optimization
- ✅ Lazy loading with Intersection Observer
- ✅ Placeholder while loading
- ✅ Progressive image loading
- ✅ WebP format support (via Supabase)

### Code Optimization
- ✅ React.memo for components
- ✅ useMemo for expensive calculations
- ✅ useCallback for event handlers
- ✅ Pagination to limit rendered items

### Network Optimization
- ✅ Pagination (12 items per page)
- ✅ Lazy loading images
- ✅ Code splitting
- ✅ Query caching with TanStack Query

## Deployment Steps

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Option 2: Netlify

1. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

2. **Deploy:**
   - Connect GitHub repository
   - Add environment variables in Netlify dashboard
   - Deploy automatically on push

### Option 3: Traditional Hosting

1. **Build the project:**
```bash
npm run build
```

2. **Upload `dist` folder** to your hosting provider

3. **Configure server:**
   - Enable gzip compression
   - Set cache headers
   - Configure HTTPS
   - Set up redirects for SPA routing

## Post-Deployment

### 1. Verify Environment Variables
- Check that Supabase URL and key are correct
- Test API connections

### 2. Test Performance
- Run Lighthouse audit
- Check Core Web Vitals
- Test on slow 3G connection

### 3. Monitor
- Set up error tracking (Sentry recommended)
- Monitor API usage
- Check Supabase dashboard for queries

### 4. CDN Configuration
- Enable CDN for static assets
- Configure cache headers
- Set up image optimization

## Performance Targets

- **First Contentful Paint (FCP):** < 1.8s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.8s
- **Total Blocking Time (TBT):** < 200ms
- **Cumulative Layout Shift (CLS):** < 0.1

## Troubleshooting

### Build Errors
- Check Node version (18+)
- Clear `node_modules` and reinstall
- Check for TypeScript errors

### Runtime Errors
- Verify environment variables
- Check Supabase connection
- Review browser console

### Performance Issues
- Check bundle size (should be < 500KB gzipped)
- Verify lazy loading works
- Check image optimization
- Monitor network requests

## Maintenance

### Regular Updates
- Update dependencies monthly
- Monitor security advisories
- Update Supabase client library

### Performance Monitoring
- Weekly Lighthouse audits
- Monitor Core Web Vitals
- Check error rates
- Review user analytics

## Support

For issues or questions:
- Check Supabase documentation
- Review Vite documentation
- Check React Query docs

---

**Last Updated:** January 2025
**Version:** 1.0.0

