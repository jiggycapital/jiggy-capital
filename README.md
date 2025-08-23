# 🏌️ Jiggy Capital Portfolio

A professional investment portfolio tracking website showcasing real-time portfolio data, performance analytics, and allocation visualization.

## ✨ Features

- **📊 Real-time Portfolio Data**: Live data and prices from Google Sheets with automatic updates
- **📈 Performance Analytics**: Daily, YTD, and lifetime performance metrics
- **🥧 Interactive Allocation Chart**: Beautiful pie chart with custom callouts
- **📱 Responsive Design**: Optimized for all devices
- **🔒 Security Focused**: Protected configuration and secure data handling
- **⚡ Performance Optimized**: Minified assets and efficient loading

## 🚀 Quick Start

### Prerequisites
- Google Sheets with portfolio data
- Web hosting service (Netlify, Vercel, etc.)
- Domain name (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jiggy-capital-portfolio.git
   cd jiggy-capital-portfolio
   ```

2. **Configure your data sources**
   - Copy `config.js` and update with your Google Sheets URLs
   - Ensure your Google Sheets are publicly accessible (view only)

3. **Deploy to your hosting provider**
   - Upload files to your web server
   - Or use Netlify/Vercel for automatic deployment

## 📁 Project Structure

```
jiggy-capital-portfolio/
├── index.html              # Development version
├── index.prod.html         # Production version (use this)
├── styles.css              # Development CSS
├── styles.min.css          # Minified CSS (use this)
├── script.js               # Development JavaScript
├── script.min.js           # Minified JavaScript (use this)
├── config.js               # Configuration (keep private)
├── golf-photo.jpg          # Hero image
├── .gitignore              # Git ignore rules
├── DEPLOYMENT.md           # Deployment guide
└── README.md               # This file
```

## 🔧 Configuration

### Google Sheets Setup

Your Google Sheets should have the following structure:

1. **Portfolio Sheet** (GID: 1871140253)
   - Column A: Company Name
   - Column B: Ticker
   - Column O: Shares
   - Column P: Average Cost
   - Column S: Market Value
   - Column I: Sector
   - Column F: First Buy
   - Column G: Last Buy
   - Row with "Cash": Cash balance

2. **Logos Sheet** (GID: 1789448141)
   - Column A: Ticker
   - Column B: Logo URL
   - Column C: Direct Link

3. **Performance Sheet** (GID: 721839254)
   - Cell B2: Daily Performance
   - Cell B3: YTD Performance
   - Cell B4: Lifetime CAGR
   - Cell B5: Performance vs QQQ
   - Cell B6: Performance vs IGV
   - Cell B7: Performance vs SMH

### Security Configuration

```javascript
// config.js - NEVER commit this file
const CONFIG = {
    GOOGLE_SHEETS: {
        PORTFOLIO_URL: 'your_portfolio_sheet_url',
        LOGOS_URL: 'your_logos_sheet_url',
        PERFORMANCE_URL: 'your_performance_sheet_url'
    }
};
```

## 🎨 Customization

### Colors and Branding
- Update CSS variables in `styles.min.css`
- Replace `golf-photo.jpg` with your own image
- Modify contact information in HTML

### Adding New Features
- Portfolio data is automatically updated from Google Sheets
- Performance metrics are calculated in real-time
- Charts are generated using Chart.js

## 📊 Performance Metrics

The site tracks:
- **Portfolio Value**: Total market value including cash
- **Daily Performance**: Current day's return
- **YTD Performance**: Year-to-date return
- **Lifetime CAGR**: Compound annual growth rate
- **Benchmark Comparison**: vs QQQ, IGV, SMH

## 🔒 Security Features

- **Protected Configuration**: Sensitive URLs in separate config file
- **CORS Protection**: Proper cross-origin resource sharing
- **Content Security Policy**: Prevents XSS attacks
- **HTTPS Enforcement**: Secure data transmission
- **Input Validation**: Sanitized data processing

## 🚀 Deployment

### Recommended: Netlify
1. Connect your GitHub repository
2. Set build command: `echo "No build required"`
3. Set publish directory: `.`
4. Add environment variables
5. Configure custom domain

### Alternative: Vercel
1. Import GitHub repository
2. Set framework preset to "Other"
3. Configure environment variables
4. Deploy and connect domain

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📈 Performance Optimization

- **Minified Assets**: CSS and JS files are compressed
- **Lazy Loading**: Images load only when needed
- **CDN Integration**: External libraries from CDN
- **Browser Caching**: Optimized cache headers
- **Gzip Compression**: Reduced file sizes

## 🛠️ Development

### Local Development
```bash
# Start local server
python -m http.server 8000
# or
npx serve .
```

### File Structure
- `index.prod.html`: Production HTML with security headers
- `styles.min.css`: Minified CSS (70% smaller than original)
- `script.min.js`: Minified JavaScript (60% smaller than original)
- `config.js`: Configuration (keep private)

## 📞 Support

For issues and questions:
1. Check the [deployment guide](DEPLOYMENT.md)
2. Verify Google Sheets permissions
3. Test configuration locally
4. Monitor browser console for errors

## 📄 License

This project is private and proprietary. All rights reserved.

## 🙏 Acknowledgments

- **Chart.js**: For beautiful data visualizations
- **Font Awesome**: For icons
- **Google Sheets API**: For data management
- **Google Sheets**: For real-time stock data and prices

---

**Built with ❤️ for professional portfolio management**
