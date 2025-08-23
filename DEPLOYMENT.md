# 🚀 Jiggy Capital Portfolio - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. **Security Configuration**
- [ ] Update `config.js` with your actual Google Sheets URLs
- [ ] Set up environment variables for sensitive data
- [ ] Configure CORS headers on your hosting provider
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up Content Security Policy (CSP) headers

### 2. **Performance Optimization**
- [ ] Minify CSS and JavaScript files
- [ ] Optimize images (compress golf-photo.jpg)
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure browser caching

### 3. **Domain Setup**
- [ ] Purchase domain from GoDaddy (jiggycapital.com)
- [ ] Configure DNS settings
- [ ] Set up domain forwarding/redirects
- [ ] Configure email hosting (optional)

## 🔒 Security Best Practices

### **1. Protect Google Sheets URLs**
```javascript
// In config.js - NEVER commit this file
const CONFIG = {
    GOOGLE_SHEETS: {
        PORTFOLIO_URL: 'https://docs.google.com/spreadsheets/d/YOUR_ACTUAL_ID/export?format=csv&gid=1871140253',
        LOGOS_URL: 'https://docs.google.com/spreadsheets/d/YOUR_ACTUAL_ID/export?format=csv&gid=1789448141',
        PERFORMANCE_URL: 'https://docs.google.com/spreadsheets/d/YOUR_ACTUAL_ID/export?format=csv&gid=721839254'
    }
};
```

### **2. Environment Variables (Recommended)**
```bash
# .env file (add to .gitignore)
GOOGLE_SHEETS_PORTFOLIO_URL=your_url_here
GOOGLE_SHEETS_LOGOS_URL=your_url_here
GOOGLE_SHEETS_PERFORMANCE_URL=your_url_here
```

### **3. Content Security Policy**
Add to your hosting provider's headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://docs.google.com https://query1.finance.yahoo.com;
```

## 🚀 Deployment Options

### **Option 1: Netlify (Recommended)**
1. Connect your GitHub repository
2. Set build command: `echo "No build required"`
3. Set publish directory: `.`
4. Add environment variables in Netlify dashboard
5. Configure custom domain

### **Option 2: Vercel**
1. Import your GitHub repository
2. Set framework preset to "Other"
3. Configure environment variables
4. Deploy and connect custom domain

### **Option 3: GitHub Pages**
1. Enable GitHub Pages in repository settings
2. Set source to main branch
3. Configure custom domain in repository settings
4. Add CNAME file for domain

## 📊 Performance Monitoring

### **Google Analytics Setup**
```html
<!-- Add to index.prod.html before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### **Performance Metrics to Monitor**
- Page load time (< 3 seconds)
- First Contentful Paint (< 1.5 seconds)
- Largest Contentful Paint (< 2.5 seconds)
- Cumulative Layout Shift (< 0.1)

## 🔧 Post-Deployment Tasks

### **1. SEO Optimization**
- [ ] Add meta description
- [ ] Configure Open Graph tags
- [ ] Set up Google Search Console
- [ ] Create sitemap.xml
- [ ] Add robots.txt

### **2. Monitoring Setup**
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure error tracking (Sentry)
- [ ] Set up performance monitoring
- [ ] Create backup strategy

### **3. Maintenance Plan**
- [ ] Schedule regular security updates
- [ ] Monitor Google Sheets API quotas
- [ ] Backup configuration files
- [ ] Test portfolio data updates

## 🛠️ Troubleshooting

### **Common Issues:**
1. **CORS Errors**: Configure hosting provider to allow Google Sheets domains
2. **Slow Loading**: Enable gzip compression and CDN
3. **Security Warnings**: Update CSP headers and enable HTTPS
4. **Data Not Loading**: Check Google Sheets sharing permissions

### **Performance Tips:**
- Use `loading="lazy"` for images
- Minify all CSS/JS files
- Enable browser caching
- Use CDN for external libraries
- Optimize images (WebP format)

## 📞 Support

For deployment issues:
1. Check hosting provider documentation
2. Verify DNS configuration
3. Test locally before deploying
4. Monitor error logs

---

**Remember**: Never commit `config.js` with real URLs to public repositories!
