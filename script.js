// ============================================================================
// JIGGY CAPITAL PORTFOLIO - RESTORED VERSION
// ============================================================================

// Google Sheets Integration Configuration - Obfuscated URLs for security
const GOOGLE_SHEETS_CONFIG = {
    portfolioSheetUrl: atob('aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMXhtRF9oMl8xSS1rSmtILU1zTlVoSFhNVjdXREhyQWxDdGoxVXE1akxjRkUvZXhwb3J0P2Zvcm1hdD1jc3Y='),
    logosSheetUrl: atob('aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMXhtRF9oMl8xSS1rSmtILU1zTlVoSFhNVjdXREhyQWxDdGoxVXE1akxjRkUvZXhwb3J0P2Zvcm1hdD1jc3Y='),
    performanceSheetUrl: atob('aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMXhtRF9oMl8xSS1rSmtILU1zTlVoSFhNVjdXREhyQWxDdGoxVXE1akxjRkUvZXhwb3J0P2Zvcm1hdD1jc3Y='),
    eventsSheetUrl: atob('aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vc3ByZWFkc2hlZXRzL2QvMXhtRF9oMl8xSS1rSmtILU1zTlVoSFhNVjdXREhyQWxDdGoxVXE1akxjRkUvZXhwb3J0P2Zvcm1hdD1jc3Y=')
};

// Global variables
let portfolioData = [];
let logosData = {};
let performanceData = {};
let eventsData = [];
let currentFilter = 'all';
let currentSort = { column: null, direction: 'asc' };
let cashBalance = 13108.60;
let charts = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization...');
    try {
        console.log('Initializing navigation...');
        initializeNavigation();
        
        console.log('Loading portfolio data...');
        loadPortfolioData();
        
        console.log('Initializing event listeners...');
        initializeEventListeners();
        console.log('Initialization complete!');
    } catch (error) {
        console.error('Error during initialization:', error);
        // Show error on page
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid) {
            portfolioGrid.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }
});

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Load portfolio data
async function loadPortfolioData() {
    try {
        console.log('Loading portfolio data from Google Sheets...');
        
        // Load portfolio data
        console.log('Fetching portfolio data...');
        const portfolioResponse = await fetch(GOOGLE_SHEETS_CONFIG.portfolioSheetUrl);
        console.log('Portfolio response status:', portfolioResponse.status);
        const portfolioCsv = await portfolioResponse.text();
        console.log('Portfolio CSV length:', portfolioCsv.length);
        portfolioData = parsePortfolioCSV(portfolioCsv);
        console.log('Parsed portfolio data:', portfolioData.length, 'items');
        
        // Load logos data
        console.log('Fetching logos data...');
        const logosResponse = await fetch(GOOGLE_SHEETS_CONFIG.logosSheetUrl);
        console.log('Logos response status:', logosResponse.status);
        const logosCsv = await logosResponse.text();
        console.log('Logos CSV length:', logosCsv.length);
        logosData = parseLogosCSV(logosCsv);
        console.log('Parsed logos data:', Object.keys(logosData).length, 'items');
        
        // Load performance data
        console.log('Fetching performance data...');
        const performanceResponse = await fetch(GOOGLE_SHEETS_CONFIG.performanceSheetUrl);
        console.log('Performance response status:', performanceResponse.status);
        const performanceCsv = await performanceResponse.text();
        console.log('Performance CSV length:', performanceCsv.length);
        performanceData = parsePerformanceCSV(performanceCsv);
        console.log('Parsed performance data:', Object.keys(performanceData).length, 'items');
        
        // Load events data
        console.log('Fetching events data...');
        const eventsResponse = await fetch(GOOGLE_SHEETS_CONFIG.eventsSheetUrl);
        console.log('Events response status:', eventsResponse.status);
        const eventsCsv = await eventsResponse.text();
        console.log('Events CSV length:', eventsCsv.length);
        eventsData = parseEventsCSV(eventsCsv);
        console.log('Parsed events data:', eventsData.length, 'items');
        
        console.log('All data loaded successfully');
        console.log('Portfolio data:', portfolioData.length, 'items');
        console.log('Events data:', eventsData.length, 'items');
        
        // Fetch real-time prices and compute weights
        portfolioData = updatePortfolioPrices(portfolioData);

        // Update displays
        console.log('Updating displays...');
        updateHeroStats();
        updatePortfolioDisplay();
        updatePerformanceDisplay();
        updateAllocationChart();
        updateSectorChart();
        
        // Fetch upcoming events and company news
        console.log('Fetching upcoming events...');
        await fetchUpcomingEvents();
        updateEventsDisplay();
        
        console.log('Fetching company news...');
        await fetchCompanyNews();
        
    } catch (error) {
        console.error('Error loading portfolio data:', error);
        console.error('Error details:', error.stack);
        // Fallback to sample data
        console.log('Using fallback sample data...');
        portfolioData = SAMPLE_PORTFOLIO_DATA;
        updateHeroStats();
        updatePortfolioDisplay();
    }
}

// Get price from Google Sheet data (Column M)
function getPriceFromSheetData(symbol, portfolioData) {
    const item = portfolioData.find(item => item.symbol === symbol);
    if (item && item.price) {
        return toNumber(item.price);
    }
    console.warn(`No price found for ${symbol} in sheet data`);
    return 0;
}

// Update portfolio with prices from Google Sheet and compute returns/weights
function updatePortfolioPrices(items) {
    console.log('Starting portfolio price update from Google Sheet...');
    const updated = [];
    
    for (const it of items) {
        if (!it.symbol || it.symbol === 'Cash' || it.symbol === 'CASH') {
            updated.push(it);
            continue;
        }
        
        // Use price directly from the sheet data (Column M)
        const price = toNumber(it.price);
        const shares = toNumber(it.shares);
        const avg = toNumber(it.avgCost);
        const value = (price || 0) * shares;
        const calcCostBasis = avg * shares;
        const usedCostBasis = calcCostBasis > 0 ? calcCostBasis : (it.costBasis || 0);
        const retPct = (usedCostBasis > 0) ? ((value - usedCostBasis) / usedCostBasis) * 100 : 0;
        
        updated.push({ 
            ...it, 
            price: price || 0, 
            shares, 
            avgCost: avg, 
            value, 
            costBasis: usedCostBasis, 
            return: retPct 
        });
        
        console.log(`✅ ${it.symbol}: $${price.toFixed(2)} | Value: $${value.toFixed(2)} | Return: ${retPct.toFixed(1)}%`);
    }
    
    // Calculate weights
    const totalValue = updated.reduce((s, x) => s + (x.value || 0), 0) + cashBalance;
    console.log(`Total portfolio value: $${totalValue.toFixed(2)}`);
    
    return updated.map(x => ({ 
        ...x, 
        weight: totalValue > 0 ? ((x.value || 0) / totalValue) * 100 : 0 
    }));
}

// Robust CSV parsing to handle quoted fields and commas inside quotes
function parseCSVToRows(csvText) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];
        if (char === '"') {
            if (inQuotes && next === '"') { // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (current !== '' || row.length > 0) {
                row.push(current);
                rows.push(row);
            }
            current = '';
            row = [];
            if (char === '\r' && next === '\n') i++;
        } else {
            current += char;
        }
    }
    if (current !== '' || row.length > 0) {
        row.push(current);
        rows.push(row);
    }
    return rows;
}

// Helper: parse numbers that may include $, commas, %, or trailing units like 'x'
function toNumber(value) {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

// Parse portfolio CSV
function parsePortfolioCSV(csv) {
    const rows = parseCSVToRows(csv);
    if (!rows || rows.length === 0) return [];
    const data = [];
    // Only A1:AR21 (row 1 header + rows 2..21 data)
    const lastRowIndex = Math.min(rows.length - 1, 20);
    for (let i = 1; i <= lastRowIndex; i++) {
        let r = rows[i];
        if (!r || r.length === 0) continue;
        // Limit columns to A..AR (0..43)
        if (r.length > 44) r = r.slice(0, 44);
        const ticker = (r[0] || '').trim(); // A
        if (!ticker) continue;
        // Handle Cash specially: set cashBalance and skip adding as a holding
        if (ticker.toUpperCase() === 'CASH') {
            const parsedCash = parseFloat(r[15]) || 0; // Column P Cost Basis as cash amount
            if (!isNaN(parsedCash) && parsedCash > 0) {
                cashBalance = parsedCash;
            }
            continue;
        }
        const item = {
            symbol: ticker,
            name: cleanCompanyName((r[1] || '').trim()),         // B
            firstBuy: (r[4] || '').trim(),     // E
            lastBuy: (r[5] || '').trim(),      // F
            sector: (r[7] || '').trim(),       // H
            price: toNumber(r[12]),            // M - Price from Google Sheet
            shares: toNumber(r[13]),           // N
            avgCost: toNumber(r[14]),          // O
            costBasis: toNumber(r[15]),        // P
            changePct: toNumber(r[21]),        // V
            pe2026: toNumber(r[36]) || null,   // AK
            pfcf2026: toNumber(r[37]) || null  // AL
        };
        // Calculate value and return based on sheet data
        item.value = item.shares * item.price;
        item.return = (item.costBasis > 0) ? ((item.value - item.costBasis) / item.costBasis) * 100 : 0;
        // type used for filtering if needed
        item.type = 'stocks';
        data.push(item);
    }
    return data;
}

// Parse logos CSV
function parseLogosCSV(csv) {
    const rows = parseCSVToRows(csv);
    const data = {};
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r) continue;
        const rawSymbol = (r[0] || '').trim(); // A
        if (!rawSymbol) continue;
        const symbol = rawSymbol.toUpperCase();
        // Column C (Link) for the image URL
        let logoUrl = (r[2] || '').trim(); // C
        if (!logoUrl) {
            // Fallback: Column B may contain a markdown image ![](URL)
            let b = (r[1] || '').trim();
            if (b.startsWith('![')) {
                const start = b.indexOf('(');
                const end = b.lastIndexOf(')');
                if (start !== -1 && end !== -1 && end > start) {
                    logoUrl = b.substring(start + 1, end);
                }
            } else if (b.startsWith('http')) {
                logoUrl = b;
            }
        }
        if (logoUrl) data[symbol] = logoUrl;
        // Map company name (E) and IR page (D)
        const companyName = (r[4] || '').trim(); // E
        if (companyName && !data[`${symbol}_name`]) data[`${symbol}_name`] = cleanCompanyName(companyName);
        const irUrl = (r[3] || '').trim(); // D
        if (irUrl && !data[`${symbol}_ir`]) data[`${symbol}_ir`] = irUrl;
    }
    return data;
}

// Parse performance CSV
function parsePerformanceCSV(csv) {
    const rows = parseCSVToRows(csv);
    const data = {};
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (!values) continue;
        const metric = (values[0] || '').trim();
        const value = (values[1] || '').trim();
        if (metric) data[metric] = value;
    }
    return data;
}

// Parse events CSV
function parseEventsCSV(csv) {
    const rows = parseCSVToRows(csv);
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (!values) continue;
        data.push({
            ticker: (values[0] || '').trim(),
            companyName: cleanCompanyName((((values[4] || '').trim()) || ((values[0] || '').trim()))),
            irUrl: (values[3] || '').trim(),
            eventDate: (values[2] || '').trim(),
            eventName: (values[2] || '').trim()
        });
    }
    return data;
}

// Normalize company names by trimming common suffixes
function cleanCompanyName(companyName) {
    if (!companyName) return companyName;
    
    console.log(`[CLEAN] Original company name: "${companyName}"`);
    
    let cleaned = companyName.trim();
    
    console.log(`[CLEAN] Starting suffix check for: "${cleaned}"`);
    
    // Simple and effective suffix removal
    const suffixes = [
        ' Inc', ' Corp', ' Corporation', ' Company', ' Co', ' LLC', ' Ltd', ' Limited',
        ' Technology', ' Technologies', ' Systems', ' Solutions', ' Services',
        ' ADR', ' Class A', ' Class B', ' Class C'
    ];
    
    console.log(`[CLEAN] Suffixes array:`, suffixes);
    
    // Remove suffixes in order (longest first to avoid partial matches)
    suffixes.sort((a, b) => b.length - a.length);
    
    console.log(`[CLEAN] Sorted suffixes:`, suffixes);
    console.log(`[CLEAN] Checking suffixes for: "${cleaned}"`);
    
    for (const suffix of suffixes) {
        console.log(`[CLEAN] Checking suffix: "${suffix}" - endsWith: ${cleaned.endsWith(suffix)}`);
        if (cleaned.endsWith(suffix)) {
            console.log(`[CLEAN] Removing suffix: "${suffix}"`);
            cleaned = cleaned.slice(0, -suffix.length);
            break; // Only remove one suffix at a time
        }
    }
    
    console.log(`[CLEAN] Cleaned company name: "${cleaned}"`);
    return cleaned.trim();
}

// Update hero stats
function updateHeroStats() {
    const totalValueElement = document.getElementById('totalValue');
    const totalReturnElement = document.getElementById('totalReturn');
    const holdingsCountElement = document.getElementById('holdingsCount');
    
    if (totalValueElement && totalReturnElement && holdingsCountElement) {
        // Use performance data from Google Sheet
        const dailyPerformance = performanceData['Day Performance'] || '0%';
        const ytdPerformance = performanceData['YTD Performance'] || '0%';
        const lifetimeCagr = performanceData['Lifetime CAGR'] || '0%';
        
        // Update the elements with new labels and values
        totalValueElement.textContent = dailyPerformance;
        totalValueElement.parentElement.querySelector('.stat-label').textContent = 'Daily Performance';
        
        totalReturnElement.textContent = ytdPerformance;
        totalReturnElement.parentElement.querySelector('.stat-label').textContent = 'YTD Performance';
        
        holdingsCountElement.textContent = lifetimeCagr;
        const lifetimeLabel = holdingsCountElement.parentElement.querySelector('.stat-label');
        lifetimeLabel.textContent = 'Lifetime CAGR';
        
        // Add subtext for Lifetime CAGR
        const lifetimeSubtext = document.createElement('div');
        lifetimeSubtext.className = 'stat-subtext';
        lifetimeSubtext.textContent = 'Jan 29th, 2020 -';
        lifetimeSubtext.style.fontSize = '0.7em';
        lifetimeSubtext.style.color = '#aaa';
        lifetimeSubtext.style.marginTop = '2px';
        
        // Remove existing subtext if it exists
        const existingSubtext = holdingsCountElement.parentElement.querySelector('.stat-subtext');
        if (existingSubtext) {
            existingSubtext.remove();
        }
        
        // Add new subtext
        holdingsCountElement.parentElement.appendChild(lifetimeSubtext);
    }
}

// Fetch upcoming events from cached data (GitHub Actions only)
async function fetchUpcomingEvents() {
    console.log('Fetching upcoming events from cached data...');
    
    try {
        // Load from cached file only
        const response = await fetch('./events-cache.json');
        if (response.ok) {
            const cachedData = await response.json();
            console.log(`Loaded ${cachedData.events.length} events from cache (updated: ${cachedData.lastUpdated})`);
            
            // Process cached events
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Group events by ticker
            const eventsByTicker = {};
            cachedData.events.forEach(event => {
                const eventDate = new Date(event.date);
                if (eventDate >= today) {
                    if (!eventsByTicker[event.ticker]) {
                        eventsByTicker[event.ticker] = [];
                    }
                    eventsByTicker[event.ticker].push(event);
                }
            });
            
            // Assign events to portfolio items
            eventsData.forEach(event => {
                event.upcomingEvents = eventsByTicker[event.ticker] || [];
                console.log(`[${event.ticker}] Using cached ${event.upcomingEvents.length} events`);
            });
            
            // Display events
            displayUpcomingEvents();
        } else {
            console.log('No events cache found - events will be empty until GitHub Actions runs');
            // Set empty events for all companies
            eventsData.forEach(event => {
                event.upcomingEvents = [];
            });
            displayUpcomingEvents();
        }
    } catch (error) {
        console.log('Failed to load cached events:', error.message);
        // Set empty events for all companies
        eventsData.forEach(event => {
            event.upcomingEvents = [];
        });
        displayUpcomingEvents();
    }
}



// Fetch company news from Finnhub API
async function fetchCompanyNews() {
    console.log('Fetching company news...');
    
    try {
        const API_KEY = 'd2l0fm1r01qqq9qsstfgd2l0fm1r01qqq9qsstg0';
        const API_URL = 'https://finnhub.io/api/v1/company-news';
        
        // Get date range for last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const fromDate = sevenDaysAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];
        
        const allNews = [];
        
        // Fetch news for each company in portfolio
        for (const event of eventsData) {
            if (!event.ticker) continue;
            
            try {
                const params = new URLSearchParams({
                    symbol: event.ticker,
                    from: fromDate,
                    to: toDate,
                    token: API_KEY
                });
                
                const url = `${API_URL}?${params.toString()}`;
                console.log(`[${event.ticker}] Fetching news: ${url}`);
                
                const response = await fetch(url);
                if (!response.ok) {
                    console.log(`[${event.ticker}] News API error: ${response.status}`);
                    continue;
                }
                
                const newsData = await response.json();
                console.log(`[${event.ticker}] Found ${newsData.length} news articles`);
                
                // Add company info to each news item
                const companyNews = newsData.map(news => ({
                    ...news,
                    ticker: event.ticker,
                    companyName: event.companyName,
                    logoUrl: logosData[event.ticker] || ''
                }));
                
                allNews.push(...companyNews);
                
            } catch (error) {
                console.log(`[${event.ticker}] News fetch error:`, error.message);
            }
        }
        
        // Sort by date (newest first) and display
        allNews.sort((a, b) => b.datetime - a.datetime);
        displayCompanyNews(allNews);
        
    } catch (error) {
        console.error('Error fetching company news:', error);
        displayCompanyNews([]);
    }
}

// Display company news
function displayCompanyNews(newsData) {
    const newsContainer = document.getElementById('companyNews');
    if (!newsContainer) return;
    
    if (newsData.length === 0) {
        newsContainer.innerHTML = '<div class="no-news"><i class="far fa-newspaper"></i><p>No recent news found.</p><small>We check for news from the last 7 days.</small></div>';
        return;
    }
    
    // Filter news to only include articles with company name in headline and exclude fool.com
    const filteredNews = newsData.filter(news => {
        // Exclude articles from fool.com
        if (news.url && news.url.toLowerCase().includes('fool.com')) {
            return false;
        }
        
        const companyName = news.companyName || news.ticker;
        const headline = news.headline.toLowerCase();
        
        // Check if company name appears in headline
        const companyWords = companyName.toLowerCase().split(' ');
        const hasCompanyName = companyWords.some(word => {
            // Skip very short words (less than 3 characters) to avoid false matches
            if (word.length < 3) return false;
            return headline.includes(word);
        });
        
        // Also check for ticker symbol
        const ticker = news.ticker.toLowerCase();
        const hasTicker = headline.includes(ticker);
        
        return hasCompanyName || hasTicker;
    });
    
    if (filteredNews.length === 0) {
        newsContainer.innerHTML = '<div class="no-news"><i class="far fa-newspaper"></i><p>No relevant company news found.</p><small>We only show news that mentions the company name.</small></div>';
        return;
    }
    
    let html = '';
            filteredNews.slice(0, 50).forEach(news => { // Limit to 50 most recent relevant articles
        const logoHtml = news.logoUrl ? `<img src="${news.logoUrl}" alt="${news.ticker}" />` : news.ticker;
        
        // Debug the date data and company name
        console.log(`[NEWS DEBUG] ${news.ticker}:`, {
            datetime: news.datetime,
            datetimeType: typeof news.datetime,
            datetimeString: news.datetime.toString(),
            companyName: news.companyName,
            ticker: news.ticker
        });
        
        // Try different date parsing approaches
        let newsDate;
        if (typeof news.datetime === 'number') {
            // If it's a number, try both seconds and milliseconds
            if (news.datetime > 1000000000000) {
                // Likely milliseconds (13 digits)
                newsDate = new Date(news.datetime);
            } else {
                // Likely seconds (10 digits)
                newsDate = new Date(news.datetime * 1000);
            }
        } else if (typeof news.datetime === 'string') {
            // If it's a string, try direct parsing
            newsDate = new Date(news.datetime);
        } else {
            // Fallback to current date
            newsDate = new Date();
        }
        
        console.log(`[NEWS DATE DEBUG] ${news.ticker} parsed date:`, newsDate);
        
        const formattedDate = newsDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div class="news-item">
                <div class="news-logo">${logoHtml}</div>
                <div class="news-info">
                    <div class="news-company">${news.companyName || news.ticker}</div>
                    <div class="news-headline">${news.headline}</div>
                    <div class="news-date"><i class="far fa-calendar"></i>${formattedDate}</div>
                </div>
                <div class="news-actions">
                    <a class="news-link" href="${news.url}" target="_blank">
                        <i class="fas fa-external-link-alt"></i>Read Article
                    </a>
                </div>
            </div>`;
    });
    
    newsContainer.innerHTML = html;
}

// Extract events from HTML with smart section targeting
function extractEventsFromHTML(html, eventInfo) {
    console.log(`\n=== [${eventInfo.ticker}] STARTING EVENT EXTRACTION ===`);
    console.log(`[${eventInfo.ticker}] HTML length: ${html.length}`);
    
    const events = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = (doc.body && doc.body.textContent) ? doc.body.textContent : html;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    console.log(`[${eventInfo.ticker}] Total lines after splitting: ${lines.length}`);
    console.log(`[${eventInfo.ticker}] First 10 lines:`, lines.slice(0, 10));

    // First, try to find "Upcoming Events" or "Future Events" sections
    const upcomingSectionPatterns = [
        /upcoming\s+events?/i,
        /future\s+events?/i,
        /scheduled\s+events?/i,
        /next\s+events?/i,
        /forthcoming\s+events?/i,
        /featured\s+events?/i  // Added based on Datadog page structure
    ];

    let startIndex = 0;
    let endIndex = lines.length;
    let sectionFound = false;

    // Look for upcoming events section
    console.log(`[${eventInfo.ticker}] Searching for event sections...`);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of upcomingSectionPatterns) {
            if (pattern.test(line)) {
                console.log(`[${eventInfo.ticker}] Found event section at line ${i}: "${line}"`);
                startIndex = i;
                sectionFound = true;
                
                // Look for the end of this section (next major heading or end of content)
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    if (nextLine.length > 0 && 
                        (nextLine.toUpperCase() === nextLine || 
                         /^(past|previous|historical|completed)/i.test(nextLine) ||
                         /^[A-Z][A-Z\s]+$/.test(nextLine))) {
                        endIndex = j;
                        console.log(`[${eventInfo.ticker}] Event section ends at line ${j}: "${nextLine}"`);
                        break;
                    }
                }
                break;
            }
        }
        if (startIndex > 0) break;
    }

    // If we found an event section, only process that section
    if (sectionFound) {
        console.log(`[${eventInfo.ticker}] Processing event section (lines ${startIndex}-${endIndex})`);
        const sectionLines = lines.slice(startIndex, endIndex);
        console.log(`[${eventInfo.ticker}] Section lines:`, sectionLines);
        lines.splice(0, lines.length, ...sectionLines);
    } else {
        console.log(`[${eventInfo.ticker}] No event section found, processing entire page`);
    }

    // General config for all companies
    const DEFAULT_CONFIG = { maxConsecutiveOldEvents: 20, dateAboveEvent: false };
    const cfg = DEFAULT_CONFIG;

    // Enhanced event patterns for broader coverage
    const eventPatterns = [
        // Earnings and Financial Results (most common)
        /Q[1-4]\s+\d{4}\s+[A-Za-z\s]+Earnings\s+Conference\s+Call/gi,
        /Q[1-4]\s+\d{4}\s+[A-Za-z\s]+Earnings\s+Call/gi,
        /Earnings\s+Call\s+Q[1-4]\s+\d{4}/gi,
        /Q[1-4]\s+\d{4}\s+(Results|Earnings)/gi,
        /\d+(?:st|nd|rd|th)\s+Quarter\s+FY\d+\s+Financial\s+Results/gi,
        /Financial\s+Results/gi,
        /Earnings\s+Release/gi,
        /Results\s+Call/gi,
        /Quarterly\s+Results/gi,
        /Annual\s+Results/gi,
        
        // Fiscal Year patterns (like GitLab's "Second Quarter Fiscal 2026")
        /(First|Second|Third|Fourth)\s+Quarter\s+Fiscal\s+\d{4}\s+Financial\s+Results/gi,
        /(First|Second|Third|Fourth)\s+Quarter\s+FY\d{4}\s+Financial\s+Results/gi,
        /(First|Second|Third|Fourth)\s+Quarter\s+Fiscal\s+\d{4}/gi,
        /(First|Second|Third|Fourth)\s+Quarter\s+FY\d{4}/gi,
        
        // Conference and Presentation patterns
        /Investor\s+Day/gi,
        /Analyst\s+Day/gi,
        /Annual\s+Meeting/gi,
        /Conference\s+Call/gi,
        /[A-Za-z\s]+Conference/gi,
        /[A-Za-z\s]+Technology\s+Conference/gi,
        /[A-Za-z\s]+TMT\s+Conference/gi,
        /[A-Za-z\s]+Leadership\s+Forum/gi,
        /[A-Za-z\s]+Keynote/gi,
        /[A-Za-z\s]+Presentation/gi,
        
        // Broader financial event patterns
        /Financial\s+Results/gi,
        /Earnings\s+Report/gi,
        /Quarterly\s+Report/gi,
        /Annual\s+Report/gi,
        /Investor\s+Presentation/gi,
        /Analyst\s+Presentation/gi,
        
        // Generic patterns for any event with date
        /(Earnings|Results|Financial|Quarterly|Annual|Investor|Analyst|Conference|Meeting|Presentation|Call|Report)/gi
    ];
    const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
        /(\d{4})-(\d{1,2})-(\d{1,2})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/g,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2}),\s+(\d{4})/g,
        // Additional date formats for Datadog
        /(\d{1,2})\/(\d{1,2})\/(\d{2})/g, // MM/DD/YY format
        /(\d{4})\/(\d{1,2})\/(\d{1,2})/g, // YYYY/MM/DD format
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/g, // Jan 15 2024 format
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/g, // 15 Jan 2024 format
        // Datadog specific formats from the image
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\s+at\s+\d{1,2}:\d{2}\s+(AM|PM)\s+(EST|EDT|PST|PDT)/g, // "Aug 7, 2025 at 8:00 AM EDT"
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\s+at\s+\d{1,2}:\d{2}\s+(AM|PM)\s+(EST|EDT|PST|PDT)/g, // "August 7, 2025 at 8:00 AM EDT"
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})/g, // "Aug 7, 2025"
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/g, // "August 7, 2025"
        // Additional formats for other companies
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/g, // "15 Jan 2024" format
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // "MM/DD/YYYY" format
        /(\d{4})-(\d{1,2})-(\d{1,2})/g // "YYYY-MM-DD" format
    ];

    // Collect dates with line indices
    console.log(`[${eventInfo.ticker}] Starting date collection...`);
    const allDates = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pat of datePatterns) {
            const m = line.match(pat);
            if (m) {
                const dateStr = m[0];
                const d = parseDate(dateStr);
                if (d) {
                    allDates.push({ lineIndex: i, date: d, dateStr });
                    console.log(`[${eventInfo.ticker}] Found date at line ${i}: "${dateStr}" -> ${d.toDateString()}`);
                } else {
                    console.log(`[${eventInfo.ticker}] Failed to parse date: "${dateStr}" at line ${i}`);
                }
            }
        }
    }
    console.log(`[${eventInfo.ticker}] Total dates found: ${allDates.length}`);

    const today = new Date();
    today.setHours(0,0,0,0);
    console.log(`[${eventInfo.ticker}] Today's date: ${today.toDateString()}`);
    let consecutiveOld = 0;



    console.log(`[${eventInfo.ticker}] Starting enhanced event matching...`);
    
    // Enhanced event matching: look for dates first, then find associated events
    for (const dateInfo of allDates) {
        const d = dateInfo.date;
        if (!d || d < today) continue;
        
        console.log(`[${eventInfo.ticker}] Processing future date: ${dateInfo.dateStr} at line ${dateInfo.lineIndex}`);
        
        // Look for event title in nearby lines (within 5 lines)
        const searchRange = 5;
        let eventName = null;
        let eventLineIndex = -1;
        
        // Search lines around the date
        for (let offset = -searchRange; offset <= searchRange; offset++) {
            const checkIndex = dateInfo.lineIndex + offset;
            if (checkIndex < 0 || checkIndex >= lines.length) continue;
            
            const line = lines[checkIndex];
            if (!line || line.length < 10) continue; // Skip short lines
            
            // Check if this line contains event keywords
            const eventKeywords = [
                'earnings', 'results', 'financial', 'quarterly', 'annual', 'investor', 
                'analyst', 'conference', 'meeting', 'presentation', 'call', 'report',
                'quarter', 'fiscal', 'fy', 'webcast', 'release'
            ];
            
            const hasEventKeyword = eventKeywords.some(keyword => 
                line.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (hasEventKeyword) {
                // Try to extract a meaningful event title
                let potentialTitle = line.trim();
                
                // Clean up the title
                potentialTitle = potentialTitle.replace(/^\d+\.\s*/, ''); // Remove numbered lists
                potentialTitle = potentialTitle.replace(/^[-•*]\s*/, ''); // Remove bullet points
                potentialTitle = potentialTitle.replace(/\s+/g, ' ').trim(); // Normalize whitespace
                
                // Skip if it's just a date or very short
                if (potentialTitle.length < 20 || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(potentialTitle)) {
                    continue;
                }
                
                // Check if it looks like a proper event title
                if (potentialTitle.length > 0 && potentialTitle.length < 200) {
                    eventName = potentialTitle;
                    eventLineIndex = checkIndex;
                    console.log(`[${eventInfo.ticker}] Found event title at line ${checkIndex}: "${eventName}"`);
                    break;
                }
            }
        }
        
        // If no event found nearby, try pattern matching on the date line itself
        if (!eventName) {
            const dateLine = lines[dateInfo.lineIndex];
            for (const ep of eventPatterns) {
                const m = dateLine.match(ep);
                if (m) {
                    eventName = m[0];
                    eventLineIndex = dateInfo.lineIndex;
                    console.log(`[${eventInfo.ticker}] Found event pattern at date line: "${eventName}"`);
                    break;
                }
            }
        }
        
        if (!eventName) {
            console.log(`[${eventInfo.ticker}] No event title found for date: ${dateInfo.dateStr}`);
            continue;
        }
        
        console.log(`[${eventInfo.ticker}] Adding future event: "${eventName}" on ${dateInfo.dateStr} (${d.toDateString()} >= ${today.toDateString()})`);
        events.push({
            name: cleanEventTitle(eventName),
            date: dateInfo.dateStr,
            companyName: eventInfo.companyName,
            ticker: eventInfo.ticker
        });
    }
    
    console.log(`[${eventInfo.ticker}] Event extraction complete. Found ${events.length} events:`);
    events.forEach((event, index) => {
        console.log(`[${eventInfo.ticker}] Event ${index + 1}: "${event.name}" on ${event.date}`);
    });
    console.log(`=== [${eventInfo.ticker}] EVENT EXTRACTION COMPLETE ===\n`);
    
    // Sort events by date before deduplication
    const sortedEvents = events.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });
    
    return dedupeEvents(sortedEvents);
}

// Enhanced script extraction for Q4 Events and other dynamic content
function extractEventsFromScripts(html, eventInfo) {
    console.log(`[${eventInfo.ticker}] Starting script-based event extraction...`);
    const events = [];
    
    // Collect script contents
    const scriptContents = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(html)) !== null) {
        const content = m[1];
        if (!content) continue;
        // Skip big libs but keep Q4 Events scripts
        if (/function\s*\(|=>|webpackJsonp|require\(/.test(content) && !content.includes('q4Events')) continue;
        scriptContents.push(content);
    }

    console.log(`[${eventInfo.ticker}] Found ${scriptContents.length} script blocks to analyze`);

    const today = new Date(); today.setHours(0,0,0,0);

    // Enhanced patterns for Q4 Events and other dynamic systems
    const patterns = [
        // Q4 Events specific patterns
        {
            titleRe: /"(title|name|eventTitle)"\s*:\s*"([^"]{5,200})"/g,
            dateRe: /"(date|startDate|start_time|start|eventDate)"\s*:\s*"([^"]{6,50})"/g,
            description: "Q4 Events JSON"
        },
        // Alternative JSON patterns
        {
            titleRe: /title\s*:\s*['"`]([^'"`]{5,200})['"`]/g,
            dateRe: /date\s*:\s*['"`]([^'"`]{6,50})['"`]/g,
            description: "Alternative JSON"
        },
        // Array-based patterns
        {
            titleRe: /"([^"]{5,200})"\s*,\s*"([^"]{6,50})"/g,
            dateRe: /"([^"]{6,50})"\s*,\s*"([^"]{5,200})"/g,
            description: "Array format"
        }
    ];

    for (const pattern of patterns) {
        console.log(`[${eventInfo.ticker}] Trying pattern: ${pattern.description}`);
        
        for (const sc of scriptContents) {
            const titles = [];
            let t;
            while ((t = pattern.titleRe.exec(sc)) !== null) {
                const title = t[2] || t[1]; // Handle different group structures
                if (title && title.length > 10 && !title.includes('function')) {
                    titles.push({ value: title, index: t.index });
                }
            }
            
            if (titles.length === 0) continue;
            console.log(`[${eventInfo.ticker}] Found ${titles.length} potential titles`);

            // Find dates
            const dates = [];
            let d;
            while ((d = pattern.dateRe.exec(sc)) !== null) {
                const dateStr = d[2] || d[1]; // Handle different group structures
                const pd = parseDate(dateStr);
                if (pd) {
                    dates.push({ value: dateStr, index: d.index, date: pd });
                    console.log(`[${eventInfo.ticker}] Found date: ${dateStr} -> ${pd.toDateString()}`);
                }
            }
            
            if (dates.length === 0) continue;
            console.log(`[${eventInfo.ticker}] Found ${dates.length} dates`);

            // Pair each title with nearest date
            for (const title of titles) {
                let best = null; 
                let bestDist = Infinity;
                
                for (const dd of dates) {
                    const dist = Math.abs(dd.index - title.index);
                    if (dist < bestDist) { 
                        bestDist = dist; 
                        best = dd; 
                    }
                }
                
                if (!best || bestDist > 1000) continue; // Skip if too far apart
                
                const pd = best.date;
                if (pd >= today) {
                    console.log(`[${eventInfo.ticker}] Found future event: "${title.value}" on ${best.value}`);
                    events.push({
                        name: title.value,
                        date: best.value,
                        companyName: eventInfo.companyName,
                        ticker: eventInfo.ticker
                    });
                }
            }
        }
    }

    // Also try to extract from Q4 Events configuration
    const q4ConfigMatch = html.match(/\$tudio\([^)]+\)\.q4Events\(({[^}]+})/);
    if (q4ConfigMatch) {
        console.log(`[${eventInfo.ticker}] Found Q4 Events configuration`);
        
        // Look for event data embedded in the page
        const eventDataPatterns = [
            /events\s*:\s*\[([^\]]+)\]/g,
            /data\s*:\s*\[([^\]]+)\]/g,
            /items\s*:\s*\[([^\]]+)\]/g,
            /"events"\s*:\s*\[([^\]]+)\]/g,
            /"data"\s*:\s*\[([^\]]+)\]/g
        ];
        
        for (const pattern of eventDataPatterns) {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`[${eventInfo.ticker}] Found potential event data with pattern:`, pattern);
                for (const match of matches) {
                    console.log(`[${eventInfo.ticker}] Event data match:`, match);
                }
            }
        }
        
        // Try to find JSON data in script tags
        const jsonDataPattern = /var\s+eventsData\s*=\s*(\[[^\]]+\])/g;
        const jsonMatches = html.match(jsonDataPattern);
        if (jsonMatches) {
            console.log(`[${eventInfo.ticker}] Found JSON event data:`, jsonMatches);
        }
    }

    console.log(`[${eventInfo.ticker}] Script extraction found ${events.length} events`);
    
    // If no events found and Q4 Events detected, try to extract from embedded data
    if (events.length === 0 && html.includes('q4Events')) {
        console.log(`[${eventInfo.ticker}] No events found, trying Q4 Events embedded data extraction...`);
        const embeddedEvents = extractQ4EventsEmbeddedData(html, eventInfo);
        if (embeddedEvents.length > 0) {
            console.log(`[${eventInfo.ticker}] Found ${embeddedEvents.length} events from embedded data`);
            return dedupeEvents(embeddedEvents);
        }
    }
    
    return dedupeEvents(events);
}

// Extract events from Q4 Events embedded data
function extractQ4EventsEmbeddedData(html, eventInfo) {
    console.log(`[${eventInfo.ticker}] Starting Q4 Events embedded data extraction...`);
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Look for Q4 Events configuration and extract any embedded data
    const q4ConfigMatch = html.match(/\$tudio\([^)]+\)\.q4Events\(({[^}]+})/);
    if (q4ConfigMatch) {
        console.log(`[${eventInfo.ticker}] Found Q4 Events configuration:`, q4ConfigMatch[1]);
        
        // Look for event data in the configuration
        const configText = q4ConfigMatch[1];
        
        // Look for Q4 Events data that might be embedded in the page
        console.log(`[${eventInfo.ticker}] Searching for Q4 Events data in HTML...`);
        
        // Q4 Events often embeds data in script tags or as JSON blobs
        const q4DataPatterns = [
            // Look for Q4 Events data arrays
            /var\s+q4EventsData\s*=\s*(\[[^\]]+\])/g,
            /var\s+eventsData\s*=\s*(\[[^\]]+\])/g,
            /window\.q4EventsData\s*=\s*(\[[^\]]+\])/g,
            /window\.eventsData\s*=\s*(\[[^\]]+\])/g,
            
            // Look for Q4 Events data in script tags
            /<script[^>]*>[\s\S]*?q4EventsData\s*=\s*(\[[^\]]+\])[\s\S]*?<\/script>/g,
            /<script[^>]*>[\s\S]*?eventsData\s*=\s*(\[[^\]]+\])[\s\S]*?<\/script>/g,
            
            // Look for Q4 Events API responses embedded in the page
            /"events"\s*:\s*(\[[^\]]+\])/g,
            /"data"\s*:\s*(\[[^\]]+\])/g,
            /"items"\s*:\s*(\[[^\]]+\])/g
        ];
        
        for (const pattern of q4DataPatterns) {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`[${eventInfo.ticker}] Found Q4 Events data pattern:`, pattern);
                for (const match of matches) {
                    console.log(`[${eventInfo.ticker}] Q4 Events data match:`, match);
                    
                    // Try to extract JSON from the match
                    try {
                        // Clean up the match to extract just the JSON array
                        let jsonStr = match;
                        if (jsonStr.includes('=')) {
                            jsonStr = jsonStr.split('=')[1].trim();
                        }
                        if (jsonStr.includes(';')) {
                            jsonStr = jsonStr.split(';')[0].trim();
                        }
                        
                        const jsonData = JSON.parse(jsonStr);
                        console.log(`[${eventInfo.ticker}] Parsed Q4 Events JSON:`, jsonData);
                        
                        // Extract events from the JSON
                        if (Array.isArray(jsonData)) {
                            for (const event of jsonData) {
                                if (event.date || event.startDate || event.eventDate || event.start_time) {
                                    const dateStr = event.date || event.startDate || event.eventDate || event.start_time;
                                    const eventDate = parseDate(dateStr);
                                    
                                    if (eventDate && eventDate >= today) {
                                        const title = event.title || event.name || event.eventTitle || event.headline || 'Upcoming Event';
                                        console.log(`[${eventInfo.ticker}] Found Q4 Events event: "${title}" on ${dateStr}`);
                                        events.push({
                                            name: cleanEventTitle(title),
                                            date: dateStr,
                                            companyName: eventInfo.companyName,
                                            ticker: eventInfo.ticker
                                        });
                                    }
                                }
                            }
                        }
                    } catch (parseError) {
                        console.log(`[${eventInfo.ticker}] Failed to parse Q4 Events JSON:`, parseError.message);
                    }
                }
            }
        }
        
        // Look for various patterns of embedded event data
        const patterns = [
            // Look for JSON-like data structures
            /"title"\s*:\s*"([^"]{5,200})"[^}]*"date"\s*:\s*"([^"]{6,50})"/g,
            /"name"\s*:\s*"([^"]{5,200})"[^}]*"date"\s*:\s*"([^"]{6,50})"/g,
            /"eventTitle"\s*:\s*"([^"]{5,200})"[^}]*"eventDate"\s*:\s*"([^"]{6,50})"/g,
            
            // Look for array-like structures
            /\["([^"]{5,200})",\s*"([^"]{6,50})"\]/g,
            /\["([^"]{6,50})",\s*"([^"]{5,200})"\]/g,
            
            // Look for template variables that might contain actual data
            /{{date\.date}}\s*{{title}}/g,
            /{{title}}\s*{{date\.date}}/g,
            
            // Look for Q4 Events specific patterns
            /events\s*:\s*\[([^\]]+)\]/g,
            /data\s*:\s*\[([^\]]+)\]/g,
            /items\s*:\s*\[([^\]]+)\]/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(configText)) !== null) {
                console.log(`[${eventInfo.ticker}] Found pattern match:`, match[0]);
                
                if (match[1] && match[2]) {
                    const title = match[1];
                    const dateStr = match[2];
                    
                    if (title && dateStr && title.length > 10 && dateStr.length > 5) {
                        const eventDate = parseDate(dateStr);
                        if (eventDate && eventDate >= today) {
                            console.log(`[${eventInfo.ticker}] Found embedded event: "${title}" on ${dateStr}`);
                            events.push({
                                name: cleanEventTitle(title),
                                date: dateStr,
                                companyName: eventInfo.companyName,
                                ticker: eventInfo.ticker
                            });
                        }
                    }
                }
            }
        }
        
        // Also try to extract from the Q4 Events configuration object itself
        console.log(`[${eventInfo.ticker}] Analyzing Q4 Events configuration for embedded data...`);
        
        // Look for event data that might be embedded in the configuration
        const configEventPatterns = [
            // Look for events array in configuration
            /events\s*:\s*\[([^\]]+)\]/g,
            /data\s*:\s*\[([^\]]+)\]/g,
            /items\s*:\s*\[([^\]]+)\]/g,
            
            // Look for individual event objects
            /{[^}]*"title"[^}]*"date"[^}]*}/g,
            /{[^}]*"name"[^}]*"date"[^}]*}/g,
            /{[^}]*"eventTitle"[^}]*"eventDate"[^}]*}/g
        ];
        
        for (const pattern of configEventPatterns) {
            const matches = configText.match(pattern);
            if (matches) {
                console.log(`[${eventInfo.ticker}] Found event data in Q4 config:`, matches);
                
                for (const match of matches) {
                    try {
                        // Try to parse as JSON object
                        const eventData = JSON.parse(match);
                        if (eventData.date || eventData.startDate || eventData.eventDate) {
                            const dateStr = eventData.date || eventData.startDate || eventData.eventDate;
                            const eventDate = parseDate(dateStr);
                            
                            if (eventDate && eventDate >= today) {
                                const title = eventData.title || eventData.name || eventData.eventTitle || 'Upcoming Event';
                                console.log(`[${eventInfo.ticker}] Found Q4 config event: "${title}" on ${dateStr}`);
                                events.push({
                                    name: cleanEventTitle(title),
                                    date: dateStr,
                                    companyName: eventInfo.companyName,
                                    ticker: eventInfo.ticker
                                });
                            }
                        }
                    } catch (parseError) {
                        console.log(`[${eventInfo.ticker}] Failed to parse Q4 config event:`, parseError.message);
                    }
                }
            }
        }
    }
    
    // Also look for any hardcoded event data in the HTML
    const hardcodedPatterns = [
        // Look for actual event titles and dates that might be embedded
        /"([^"]{10,200}Quarter[^"]{0,50}Financial[^"]{0,50}Results[^"]{0,50})"/g,
        /"([^"]{10,200}Earnings[^"]{0,50}Call[^"]{0,50})"/g,
        /"([^"]{10,200}Investor[^"]{0,50}Day[^"]{0,50})"/g,
        /"([^"]{10,200}Conference[^"]{0,50})"/g,
        // Look for fiscal year patterns (general purpose)
        /"([^"]{10,200}Quarter[^"]{0,50}Fiscal[^"]{0,50}Financial[^"]{0,50}Results[^"]{0,50})"/g,
        /"([^"]{10,200}Fiscal[^"]{0,50}Year[^"]{0,50}Financial[^"]{0,50}Results[^"]{0,50})"/g,
        // Look for any date patterns (general purpose)
        /"([^"]{10,200}(January|February|March|April|May|June|July|August|September|October|November|December)[^"]{0,50}\d{1,2}[^"]{0,50}\d{4}[^"]{0,50})"/g
    ];
    
    for (const pattern of hardcodedPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const title = match[1];
            console.log(`[${eventInfo.ticker}] Found potential event title: "${title}"`);
            
            // Look for a date near this title
            const titleIndex = match.index;
            const searchRange = 1000; // Look within 1000 characters
            const beforeText = html.substring(Math.max(0, titleIndex - searchRange), titleIndex);
            const afterText = html.substring(titleIndex, titleIndex + searchRange);
            
            // Look for dates in the surrounding text
            const datePatterns = [
                /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g,
                /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/g,
                /\d{1,2}\/\d{1,2}\/\d{4}/g
            ];
            
            for (const datePattern of datePatterns) {
                const beforeDates = beforeText.match(datePattern);
                const afterDates = afterText.match(datePattern);
                
                if (beforeDates && beforeDates.length > 0) {
                    const dateStr = beforeDates[beforeDates.length - 1]; // Get the closest date
                    const eventDate = parseDate(dateStr);
                    if (eventDate && eventDate >= today) {
                        console.log(`[${eventInfo.ticker}] Found event with date before: "${title}" on ${dateStr}`);
                        events.push({
                            name: cleanEventTitle(title),
                            date: dateStr,
                            companyName: eventInfo.companyName,
                            ticker: eventInfo.ticker
                        });
                        break;
                    }
                }
                
                if (afterDates && afterDates.length > 0) {
                    const dateStr = afterDates[0]; // Get the closest date
                    const eventDate = parseDate(dateStr);
                    if (eventDate && eventDate >= today) {
                        console.log(`[${eventInfo.ticker}] Found event with date after: "${title}" on ${dateStr}`);
                        events.push({
                            name: cleanEventTitle(title),
                            date: dateStr,
                            companyName: eventInfo.companyName,
                            ticker: eventInfo.ticker
                        });
                        break;
                    }
                }
            }
        }
    }
    
    console.log(`[${eventInfo.ticker}] Q4 Events embedded extraction found ${events.length} events`);
    
    // If still no events, try to find any JSON data in the entire HTML
    if (events.length === 0) {
        console.log(`[${eventInfo.ticker}] No events found, searching for any JSON data in HTML...`);
        
        // Look for any JSON-like structures in the HTML
        const jsonPatterns = [
            /\[\s*{[^}]*"title"[^}]*"date"[^}]*}\s*\]/g,
            /\[\s*{[^}]*"name"[^}]*"date"[^}]*}\s*\]/g,
            /\[\s*{[^}]*"eventTitle"[^}]*"eventDate"[^}]*}\s*\]/g,
            /"events"\s*:\s*\[[^\]]+\]/g,
            /"data"\s*:\s*\[[^\]]+\]/g,
            // Look for Q4 Events specific patterns
            /q4EventsData\s*=\s*\[[^\]]+\]/g,
            /eventsData\s*=\s*\[[^\]]+\]/g,
            /window\.q4EventsData\s*=\s*\[[^\]]+\]/g,
            /window\.eventsData\s*=\s*\[[^\]]+\]/g
        ];
        
        for (const pattern of jsonPatterns) {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`[${eventInfo.ticker}] Found potential JSON data:`, matches[0]);
                
                // Try to extract event data from the JSON
                try {
                    // Clean up the JSON string
                    let jsonStr = matches[0];
                    if (jsonStr.includes('"events"')) {
                        jsonStr = '{' + jsonStr + '}';
                    } else if (jsonStr.startsWith('[')) {
                        jsonStr = '{"data":' + jsonStr + '}';
                    }
                    
                    const jsonData = JSON.parse(jsonStr);
                    console.log(`[${eventInfo.ticker}] Parsed JSON data:`, jsonData);
                    
                    // Extract events from the JSON
                    const jsonEvents = jsonData.events || jsonData.data || (Array.isArray(jsonData) ? jsonData : []);
                    
                    for (const event of jsonEvents) {
                        if (event.date || event.startDate || event.eventDate) {
                            const dateStr = event.date || event.startDate || event.eventDate;
                            const eventDate = parseDate(dateStr);
                            
                            if (eventDate && eventDate >= today) {
                                const title = event.title || event.name || event.eventTitle || 'Upcoming Event';
                                console.log(`[${eventInfo.ticker}] Found JSON event: "${title}" on ${dateStr}`);
                                events.push({
                                    name: cleanEventTitle(title),
                                    date: dateStr,
                                    companyName: eventInfo.companyName,
                                    ticker: eventInfo.ticker
                                });
                            }
                        }
                    }
                } catch (parseError) {
                    console.log(`[${eventInfo.ticker}] Failed to parse JSON:`, parseError.message);
                }
            }
        }
    }
    
    // If still no events, try a more aggressive search for any event-related data
    if (events.length === 0) {
        console.log(`[${eventInfo.ticker}] No events found, trying aggressive search for event data...`);
        
        // Look for any text that might contain event information
        const aggressivePatterns = [
            // Look for any text containing "September 3, 2025" or similar future dates
            /"([^"]{10,200}(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[5-9][^"]{0,100})"/g,
            // Look for any text containing "Quarter" and "Financial Results"
            /"([^"]{10,200}Quarter[^"]{0,100}Financial[^"]{0,100}Results[^"]{0,100})"/g,
            // Look for any text containing "Earnings" and "Call"
            /"([^"]{10,200}Earnings[^"]{0,100}Call[^"]{0,100})"/g,
            // Look for any text containing "Investor" and "Day"
            /"([^"]{10,200}Investor[^"]{0,100}Day[^"]{0,100})"/g,
            // Look for any text containing "Conference"
            /"([^"]{10,200}Conference[^"]{0,100})"/g
        ];
        
        for (const pattern of aggressivePatterns) {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`[${eventInfo.ticker}] Found potential event text with pattern:`, pattern);
                for (const match of matches) {
                    console.log(`[${eventInfo.ticker}] Potential event text:`, match);
                    
                    // Try to extract a date from this text
                    const datePatterns = [
                        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g,
                        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/g,
                        /\d{1,2}\/\d{1,2}\/\d{4}/g
                    ];
                    
                    for (const datePattern of datePatterns) {
                        const dateMatches = match.match(datePattern);
                        if (dateMatches && dateMatches.length > 0) {
                            const dateStr = dateMatches[0];
                            const eventDate = parseDate(dateStr);
                            
                            if (eventDate && eventDate >= today) {
                                // Try to extract a meaningful title
                                let title = match.replace(/"/g, '').trim();
                                if (title.length > 50) {
                                    title = title.substring(0, 100) + '...';
                                }
                                
                                console.log(`[${eventInfo.ticker}] Found potential event: "${title}" on ${dateStr}`);
                                events.push({
                                    name: cleanEventTitle(title),
                                    date: dateStr,
                                    companyName: eventInfo.companyName,
                                    ticker: eventInfo.ticker
                                });
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return events;
}

// Try Finnhub Earnings Calendar API
async function tryFinnhubEarningsAPI(ticker, eventInfo) {
    console.log(`[${ticker}] Attempting Finnhub Earnings Calendar API...`);
    
    try {
        // Check cache first
        const cacheKey = `finnhub_events_${ticker}`;
        const cached = loadFinnhubEventsCache(cacheKey);
        console.log(`[${ticker}] Cache check for key: ${cacheKey}, cached:`, cached ? 'found' : 'not found');
        if (cached && cached.events && cached.events.length > 0) {
            const cacheAge = Date.now() - cached.timestamp;
            const cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            console.log(`[${ticker}] Cache age: ${Math.round(cacheAge / 1000 / 60)} minutes, max age: ${Math.round(cacheMaxAge / 1000 / 60)} minutes`);
            
            if (cacheAge < cacheMaxAge) {
                console.log(`[${ticker}] Using cached Finnhub events (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
                return cached.events;
            } else {
                console.log(`[${ticker}] Cache expired, fetching fresh data`);
            }
        } else {
            console.log(`[${ticker}] No cache found, fetching fresh data`);
        }
        
        const API_KEY = 'd2l0fm1r01qqq9qsstfgd2l0fm1r01qqq9qsstg0';
        const API_URL = 'https://finnhub.io/api/v1/calendar/earnings';
        
        // Get current date and future dates
        const today = new Date();
        const fromDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const toDate = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 90 days from now
        
        try {
            const params = new URLSearchParams({
                from: fromDate,
                to: toDate,
                symbol: ticker,
                token: API_KEY
            });
            
            const url = `${API_URL}?${params.toString()}`;
            console.log(`[${ticker}] Trying Finnhub API: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`[${ticker}] Finnhub API error: ${response.status} ${response.statusText}`);
                return [];
            }
            
            const data = await response.json();
            console.log(`[${ticker}] Finnhub API response:`, data);
            
            if (data && data.earningsCalendar && Array.isArray(data.earningsCalendar)) {
                const events = [];
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                
                for (const earning of data.earningsCalendar) {
                    if (earning.date) {
                        // Handle Finnhub date format (YYYY-MM-DD) to avoid timezone issues
                        let eventDate;
                        console.log(`[${ticker}] Processing Finnhub date: ${earning.date}`);
                        if (earning.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            // Parse YYYY-MM-DD format in local timezone
                            const [year, month, day] = earning.date.split('-').map(Number);
                            eventDate = new Date(year, month - 1, day); // month is 0-indexed
                            console.log(`[${ticker}] Parsed YYYY-MM-DD: ${year}-${month}-${day} -> ${eventDate.toDateString()}`);
                        } else {
                            eventDate = parseDate(earning.date);
                            console.log(`[${ticker}] Parsed with parseDate: ${earning.date} -> ${eventDate ? eventDate.toDateString() : 'null'}`);
                        }
                        
                        if (eventDate && eventDate >= todayStart) {
                            // Calculate days until event
                            const daysUntilEvent = Math.ceil((eventDate - todayStart) / (1000 * 60 * 60 * 24));
                            
                            // Only show events within 30 days
                            console.log(`[${ticker}] Event: ${earning.date}, Parsed date: ${eventDate.toDateString()}, Days until: ${daysUntilEvent}, Show: ${daysUntilEvent <= 30}`);
                            if (daysUntilEvent <= 30) {
                                events.push({
                                    name: cleanEventTitle(`Q${getQuarterFromDate(eventDate)} ${eventDate.getFullYear()} Earnings`),
                                    date: earning.date,
                                    companyName: cleanCompanyName(eventInfo.companyName),
                                    ticker: ticker,
                                    estimate: earning.estimate || earning.epsEstimate,
                                    actual: earning.actual || earning.epsActual,
                                    surprise: earning.surprise || earning.epsSurprise,
                                    daysUntil: daysUntilEvent
                                });
                            }
                        }
                    }
                }
                
                if (events.length > 0) {
                    console.log(`[${ticker}] Finnhub API found ${events.length} events`);
                    
                    // Cache the results
                    saveFinnhubEventsCache(cacheKey, events);
                    
                    return events;
                } else {
                    console.log(`[${ticker}] No Finnhub earnings data found, caching empty result`);
                    
                    // Cache empty result to avoid repeated API calls
                    saveFinnhubEventsCache(cacheKey, []);
                    
                    return [];
                }
            }
            
            console.log(`[${ticker}] No Finnhub earnings data found`);
            return [];
            
        } catch (error) {
            console.log(`[${ticker}] Finnhub API error:`, error.message);
            return [];
        }
        
    } catch (error) {
        console.error(`[${ticker}] Error in Finnhub API extraction:`, error);
        return [];
    }
}

// Helper function to get quarter from date
function getQuarterFromDate(date) {
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return 1;
    if (month >= 4 && month <= 6) return 2;
    if (month >= 7 && month <= 9) return 3;
    return 4;
}



// Proxy fetch with fallbacks
async function getProxiedHTML(url) {
    console.log(`[PROXY] Attempting to fetch: ${url}`);
    
    const proxies = [
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://cors-anywhere.herokuapp.com/${u}`,
        (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://cors.bridged.cc/${u}`,
        (u) => `https://r.jina.ai/http://cors.isomorphic-git.org/${encodeURIComponent(u)}`,
        (u) => `https://r.jina.ai/http://r.jina.ai/http://r.jina.ai/http://` // noop fallback (will likely fail)
    ];
    
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        try {
            const proxied = proxy(url);
            console.log(`[PROXY] Trying proxy ${i + 1}: ${proxied}`);
            
            const res = await fetch(proxied, { 
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (res && res.ok) {
                const txt = await res.text();
                if (txt && txt.length > 0) {
                    // Check if we got an error page instead of actual content
                    if (txt.includes('403 Forbidden') || txt.includes('Access denied') || txt.includes('HTTP ERROR')) {
                        console.log(`[PROXY] Proxy ${i + 1} returned error page, trying next...`);
                        continue;
                    }
                    console.log(`[PROXY] Success with proxy ${i + 1}, content length: ${txt.length}`);
                    return txt;
                }
            } else {
                console.log(`[PROXY] Proxy ${i + 1} failed with status: ${res?.status}`);
            }
        } catch (error) {
            console.log(`[PROXY] Proxy ${i + 1} error: ${error.message}`);
        }
    }
    
    console.log(`[PROXY] All proxies failed for: ${url}`);
    return null;
}

// Simple localStorage cache for events
function loadEventsCache() {
    try {
        const raw = localStorage.getItem('eventsCache_v1');
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return obj && typeof obj === 'object' ? obj : {};
    } catch { return {}; }
}
function saveEventsCache(cacheObj) {
    try { localStorage.setItem('eventsCache_v1', JSON.stringify(cacheObj)); } catch {}
}

// Finnhub events cache
function loadFinnhubEventsCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        return obj && typeof obj === 'object' ? obj : null;
    } catch { return null; }
}
function saveFinnhubEventsCache(key, events) {
    try {
        const cacheData = {
            events: events,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch {}
}

// Clean company names for display
function cleanCompanyName(companyName) {
    if (!companyName) return companyName;
    
    let cleaned = companyName.trim();
    
    // Simple and effective suffix removal
    const suffixes = [
        ' Inc', ' Corp', ' Corporation', ' Company', ' Co', ' LLC', ' Ltd', ' Limited',
        ' Technology', ' Technologies', ' Solutions', ' Services',
        ' ADR', ' Class A', ' Class B', ' Class C',
        ' & Co', ' & Co.', '.com', ' USA'
    ];
    
    // Remove suffixes in order (longest first to avoid partial matches)
    suffixes.sort((a, b) => b.length - a.length);
    
    // Keep removing suffixes until no more changes
    let changed = true;
    while (changed) {
        changed = false;
        for (const suffix of suffixes) {
            if (cleaned.endsWith(suffix)) {
                cleaned = cleaned.slice(0, -suffix.length);
                changed = true;
                break; // Start over with the new cleaned string
            }
        }
    }
    
    return cleaned.trim();
}

// Clean event titles for display
function cleanEventTitle(eventTitle) {
    if (!eventTitle) return '';
    
    const title = eventTitle.toLowerCase();
    
    // Earnings events
    if (title.includes('earnings') || title.includes('q1') || title.includes('q2') || title.includes('q3') || title.includes('q4')) {
        return 'Earnings Report';
    }
    
    // Analyst day events
    if (title.includes('analyst day') || title.includes('analyst') || title.includes('investor day')) {
        return 'Analyst Day';
    }
    
    // Conference events
    if (title.includes('conference') || title.includes('summit') || title.includes('presentation') || title.includes('webcast')) {
        return 'Conference';
    }
    
    // Annual meeting events
    if (title.includes('annual meeting') || title.includes('shareholder meeting') || title.includes('agm')) {
        return 'Annual Meeting';
    }
    
    // Default fallback
    return eventTitle;
}

// Deduplicate events by ticker+date and prefer longer names
function dedupeEvents(events) {
    const keyToEvent = new Map();
    for (const ev of events) {
        const key = `${ev.ticker}|${ev.date}`;
        const cur = keyToEvent.get(key);
        if (!cur || (ev.name && cur.name && ev.name.length > cur.name.length)) {
            keyToEvent.set(key, ev);
        }
    }
    return Array.from(keyToEvent.values());
}

// Format date to "Month day, year" format
function formatDateForDisplay(dateStr) {
    let date;
    
    // Handle Finnhub date format (YYYY-MM-DD) to avoid timezone issues
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
        date = parseDate(dateStr);
    }
    
    if (!date) return dateStr; // Return original if parsing fails
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
}

// Robust date parsing for multiple formats
function parseDate(dateStr) {
    try {
        if (!dateStr) return null;
        const s = String(dateStr).trim();
        // Strip time (e.g., "August 27, 2025 2:00 PM PT") to just date
        const timeSplit = s.split(/\s+\d{1,2}:\d{2}\s*[AP]M.*/i)[0];
        const str = timeSplit || s;

        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const day = parseInt(parts[2]);
                    const d = new Date(year, month, day);
                    return isNaN(d) ? null : d;
                }
                let month = parseInt(parts[0]) - 1;
                let day = parseInt(parts[1]);
                let year = parseInt(parts[2]);
                if (parts[2].length === 2) year = 2000 + year;
                const d = new Date(year, month, day);
                return isNaN(d) ? null : d;
            }
        }
        if (str.includes('.')) {
            const parts = str.split('.');
            if (parts.length === 3) {
                const month = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                const d = new Date(year, month, day);
                return isNaN(d) ? null : d;
            }
        }
        if (/\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
            const d = new Date(str);
            return isNaN(d) ? null : d;
        }
        // Month name formats, including leading zero day
        const d2 = new Date(str);
        return isNaN(d2) ? null : d2;
    } catch (e) {
        return null;
    }
}

// Update portfolio display
function updatePortfolioDisplay() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    if (!portfolioGrid) {
        console.error('Portfolio grid element not found');
        return;
    }
    const filteredData = filterPortfolioData(portfolioData, currentFilter);
    
    const investedValue = filteredData.reduce((sum, item) => sum + item.value, 0);
    const totalWithCash = investedValue + cashBalance;
    const withWeights = filteredData.map(item => ({
        ...item,
        weight: totalWithCash > 0 ? (item.value / totalWithCash) * 100 : 0
    }));

    let rows = withWeights;
    if (currentSort && currentSort.column) {
        rows = sortPortfolioData(withWeights, currentSort.column, currentSort.direction);
    }

    let html = '';
    const headers = [
        { cls: 'portfolio-logo', key: null, label: '' },
        { cls: 'portfolio-symbol', key: 'symbol', label: 'Symbol' },
        { cls: 'portfolio-price', key: 'price', label: 'Price' },
        { cls: 'portfolio-return', key: 'changePct', label: 'Change %' },
        { cls: 'portfolio-sector', key: 'sector', label: 'Sector' },
        { cls: 'portfolio-first-buy', key: 'firstBuy', label: 'First Buy' },
        { cls: 'portfolio-last-buy', key: 'lastBuy', label: 'Last Buy' },
        { cls: 'portfolio-shares', key: 'shares', label: 'Shares' },
        { cls: 'portfolio-cost', key: 'costBasis', label: 'Cost Basis' },
        { cls: 'portfolio-value', key: 'value', label: 'Market Value' },
        { cls: 'portfolio-pe2026', key: 'pe2026', label: "2026 P/E" },
        { cls: 'portfolio-pfcf2026', key: 'pfcf2026', label: "2026 P/FCF" },
        { cls: 'portfolio-weight', key: 'weight', label: 'Weight %' },
    ];
    const sortIcon = (key) => {
        if (!key) return '';
        const isActive = currentSort.column === key;
        const dir = currentSort.direction === 'desc' ? 'down' : 'up';
        const iconClass = isActive ? `fa-sort-${dir}` : 'fa-sort';
        return `<i class="fas ${iconClass} sort-icon"></i>`;
    };
    html += '<div class="portfolio-item">';
    headers.forEach(h => {
        if (h.key) {
            html += `<div class="${h.cls} sortable" data-column="${h.key}">${h.label} ${sortIcon(h.key)}</div>`;
        } else {
            html += `<div class="${h.cls}"></div>`;
        }
    });
    html += '</div>';

    rows.forEach(item => {
        const key = (item.symbol || '').toUpperCase();
        const logoUrl = logosData[key];
        const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${key}" />` : (key || '?');
        const name = item.name || logosData[`${key}_name`] || '';
        html += `
            <div class="portfolio-item">
                <div class="portfolio-logo">${logoHtml}</div>
                <div>
                    <div class="portfolio-symbol">${key}</div>
                    <div class="portfolio-name">${name}</div>
            </div>
                <div class="portfolio-price">$${(item.price || 0).toFixed(2)}</div>
                <div class="portfolio-return ${(+item.changePct || 0) >= 0 ? 'positive' : 'negative'}">${(+item.changePct >= 0 ? '+' : '')}${(+item.changePct || 0).toFixed(1)}%</div>
                <div class="portfolio-sector">${item.sector || 'Other'}</div>
                <div class="portfolio-first-buy">${item.firstBuy || '-'}</div>
                <div class="portfolio-last-buy">${item.lastBuy || '-'}</div>
                <div class="portfolio-shares">${(item.shares || 0).toLocaleString()}</div>
                <div class="portfolio-cost">$${(item.costBasis || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="portfolio-value">$${(item.value || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="portfolio-pe2026">${item.pe2026 ? item.pe2026.toFixed(1) + 'x' : '-'}</div>
                <div class="portfolio-pfcf2026">${item.pfcf2026 ? item.pfcf2026.toFixed(1) + 'x' : '-'}</div>
                <div class="portfolio-weight">${(item.weight || 0).toFixed(1)}%</div>
            </div>`;
    });

    if (cashBalance > 0) {
        const cashWeight = totalWithCash > 0 ? (cashBalance / totalWithCash) * 100 : 0;
        const cashLogoUrl = logosData['CASH'] || logosData['Cash'] || '';
        const cashLogoHtml = cashLogoUrl ? `<img src="${cashLogoUrl}" alt="CASH" />` : '💵';
        html += `
            <div class="portfolio-item cash-summary">
                <div class="portfolio-logo">${cashLogoHtml}</div>
                <div>
                    <div class="portfolio-symbol">CASH</div>
                    <div class="portfolio-name">Cash Balance</div>
                </div>
                <div class="portfolio-price">-</div>
                <div class="portfolio-sector">Cash</div>
                <div class="portfolio-first-buy">-</div>
                <div class="portfolio-last-buy">-</div>
                <div class="portfolio-shares">-</div>
                <div class="portfolio-cost">-</div>
                <div class="portfolio-value">$${cashBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="portfolio-return">-</div>
                <div class="portfolio-pe2026">-</div>
                <div class="portfolio-pfcf2026">-</div>
                <div class="portfolio-weight">${cashWeight.toFixed(1)}%</div>
            </div>`;
    }

    portfolioGrid.innerHTML = html;

    portfolioGrid.querySelectorAll('.sortable').forEach(el => {
        el.addEventListener('click', () => {
            const column = el.getAttribute('data-column');
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            updatePortfolioDisplay();
        });
    });

    updatePortfolioMultiples();
}

// Update performance display
function updatePerformanceDisplay() {
    // Update benchmark performance - only show QQQ, IGV, and SMH
    const benchmarkContainer = document.getElementById('benchmarkPerformance');
    if (benchmarkContainer) {
        if (Object.keys(performanceData).length > 0) {
            let html = '';
            
            // Only show the three specific benchmark comparisons
            const benchmarkMetrics = [
                { key: 'Performance vs QQQ', label: 'QQQ' },
                { key: 'Performance vs IGV', label: 'IGV' },
                { key: 'Performance vs SMH', label: 'SMH' }
            ];
            
            benchmarkMetrics.forEach(({ key, label }) => {
                const value = performanceData[key];
                if (value) {
                    const numeric = parseFloat(String(value).replace('%','').replace('bp',''));
                    const cls = isNaN(numeric) ? '' : (numeric >= 0 ? 'positive' : 'negative');
                    html += `
                        <div class="benchmark-item">
                            <span class="benchmark-symbol">${label}</span>
                            <span class="benchmark-performance-value ${cls}">${value}</span>
                        </div>`;
                }
            });
            
            benchmarkContainer.innerHTML = html;
        } else {
            benchmarkContainer.innerHTML = '<p>Performance data loaded from Google Sheets</p>';
        }
    }
    
    // Update top performers
    const topPerformersContainer = document.getElementById('topPerformers');
    if (topPerformersContainer && portfolioData.length > 0) {
        const topPerformers = portfolioData
            .sort((a, b) => b.return - a.return)
            .slice(0, 3);
        
        let html = '';
        topPerformers.forEach(item => {
            html += `
                <div class="performer-item">
                    <span class="performer-symbol">${item.symbol}</span>
                    <span class="performer-return ${item.return >= 0 ? 'positive' : 'negative'}">${item.return >= 0 ? '+' : ''}${item.return.toFixed(1)}%</span>
        </div>
    `;
        });
        topPerformersContainer.innerHTML = html;
    }
}

// Update portfolio multiples
function updatePortfolioMultiples() {
    const fcfMultipleElement = document.getElementById('fcfMultiple');
    const peMultipleElement = document.getElementById('peMultiple');
    
    if (fcfMultipleElement && peMultipleElement) {
        const portfolioItems = portfolioData.filter(item => item.value > 0 && item.symbol !== 'CASH');
        
        // Calculate weighted average P/E multiple using weight percentages
        let weightedPE = 0;
        let peWeightSum = 0;
        
        portfolioItems.forEach(item => {
            if (item.pe2026 > 0 && item.weight > 0) {
                const weightDecimal = item.weight / 100; // Convert percentage to decimal
                weightedPE += item.pe2026 * weightDecimal;
                peWeightSum += weightDecimal;
            }
        });
        
        // Calculate weighted average P/FCF multiple using weight percentages
        let weightedFCF = 0;
        let fcfWeightSum = 0;
        
        portfolioItems.forEach(item => {
            if (item.pfcf2026 > 0 && item.weight > 0) {
                const weightDecimal = item.weight / 100; // Convert percentage to decimal
                weightedFCF += item.pfcf2026 * weightDecimal;
                fcfWeightSum += weightDecimal;
            }
        });
        
        fcfMultipleElement.textContent = fcfWeightSum > 0 ? `${weightedFCF.toFixed(1)}x` : '-';
        peMultipleElement.textContent = peWeightSum > 0 ? `${weightedPE.toFixed(1)}x` : '-';
    }
}

// Global variable for the allocation chart
let allocationChart = null;

// Function to create the allocation pie chart
function updateAllocationChart() {
    const ctx = document.getElementById('allocationPieChart');
    if (!ctx) {
        console.log('Allocation chart canvas not found');
        return;
    }

    // Filter out items with no weight and sort by weight (descending)
    let chartData = portfolioData
        .filter(item => item.weight > 0)
        .sort((a, b) => b.weight - a.weight);
    
    // Add cash to the chart data if it exists
    if (cashBalance > 0) {
        // Calculate total portfolio value the same way as in updatePortfolioPrices
        const totalPortfolioValue = portfolioData.reduce((sum, item) => {
            const itemValue = item.shares * (item.price || 0);
            return sum + itemValue;
        }, 0) + cashBalance;
        
        const cashWeight = (cashBalance / totalPortfolioValue) * 100;
        
        console.log('Chart Debug:', {
            cashBalance,
            totalPortfolioValue,
            cashWeight,
            portfolioDataLength: portfolioData.length,
            portfolioDataValues: portfolioData.map(item => ({ 
                symbol: item.symbol, 
                shares: item.shares,
                price: item.price,
                calculatedValue: item.shares * (item.price || 0)
            }))
        });
        
        chartData.unshift({
            symbol: 'CASH',
            weight: cashWeight,
            name: 'Cash Balance'
        });
    }

    if (chartData.length === 0) {
        console.log('No data available for allocation chart');
        return;
    }

    // Modern color palette
    const modernColors = [
        '#6366F1', // Indigo
        '#EC4899', // Pink
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#8B5CF6', // Violet
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#F97316', // Orange
        '#EF4444', // Red
        '#14B8A6', // Teal
        '#F43F5E', // Rose
        '#A855F7', // Purple
        '#0EA5E9', // Sky
        '#22C55E', // Green
        '#EAB308'  // Yellow
    ];

    // Create custom colors array with green for cash
    const customColors = chartData.map((item, index) => {
        if (item.symbol === 'CASH') {
            return '#22C55E'; // Green for cash
        }
        return modernColors[index % modernColors.length];
    });

    const data = {
        labels: chartData.map(item => item.symbol),
        datasets: [{
            data: chartData.map(item => item.weight),
            backgroundColor: customColors,
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverBorderWidth: 6,
            hoverOffset: 15
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutQuart'
            },
            elements: {
                arc: {
                    borderRadius: 8,
                    borderSkipped: false
                }
            }
        }
    };

    // Destroy existing chart if it exists
    if (allocationChart) {
        allocationChart.destroy();
    }

    // Create new chart
    allocationChart = new Chart(ctx, config);

    // Create callouts after chart is rendered
    setTimeout(() => {
        createAllocationCallouts(chartData, customColors);
    }, 2000);
}

// Global variable for the sector allocation chart
let sectorChart = null;

// Function to create the sector allocation pie chart
function updateSectorChart() {
    const ctx = document.getElementById('sectorPieChart');
    if (!ctx) {
        console.log('Sector chart canvas not found');
        return;
    }

    // Group by sector and calculate total value for each sector
    const sectorData = {};
    portfolioData.forEach(item => {
        const sector = item.sector || 'Other';
        const itemValue = item.shares * (item.price || 0);
        sectorData[sector] = (sectorData[sector] || 0) + itemValue;
    });

    // Calculate total portfolio value
    const totalPortfolioValue = portfolioData.reduce((sum, item) => {
        const itemValue = item.shares * (item.price || 0);
        return sum + itemValue;
    }, 0) + cashBalance;

    // Convert to chart data format with weights
    let chartData = Object.entries(sectorData)
        .map(([sector, value]) => ({
            symbol: sector,
            weight: (value / totalPortfolioValue) * 100,
            name: sector
        }))
        .filter(item => item.weight > 0)
        .sort((a, b) => b.weight - a.weight);

    // Add cash as a separate sector if it exists
    if (cashBalance > 0) {
        const cashWeight = (cashBalance / totalPortfolioValue) * 100;
        chartData.unshift({
            symbol: 'CASH',
            weight: cashWeight,
            name: 'Cash'
        });
    }

    if (chartData.length === 0) {
        console.log('No data available for sector chart');
        return;
    }

    // Clean, distinct color palette for sectors
    const sectorColorMap = {
        'Software': '#3B82F6', // Blue - Software
        'Healthcare': '#10B981', // Green - Healthcare
        'Consumer Discretionary': '#F59E0B', // Amber - Consumer
        'Financial Services': '#8B5CF6', // Purple - Financial
        'Energy': '#EF4444', // Red - Energy
        'Communication Services': '#06B6D4', // Cyan - Communication
        'Industrials': '#84CC16', // Lime - Industrials
        'Materials': '#F97316', // Orange - Materials
        'Real Estate': '#EC4899', // Pink - Real Estate
        'Utilities': '#6366F1', // Indigo - Utilities
        'Other': '#14B8A6', // Teal - Other
        'CASH': '#22C55E'  // Green - Cash
    };

    // Create custom colors array with proper sector mapping
    const customColors = chartData.map((item) => {
        return sectorColorMap[item.symbol] || '#6366F1'; // Default to indigo if sector not found
    });

    const data = {
        labels: chartData.map(item => item.symbol),
        datasets: [{
            data: chartData.map(item => item.weight),
            backgroundColor: customColors,
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverBorderWidth: 6,
            hoverOffset: 15
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutQuart'
            },
            elements: {
                arc: {
                    borderRadius: 8,
                    borderSkipped: false
                }
            }
        }
    };

    // Destroy existing chart if it exists
    if (sectorChart) {
        sectorChart.destroy();
    }

    // Create new chart
    sectorChart = new Chart(ctx, config);

    // Create callouts after chart is rendered
    setTimeout(() => {
        createSectorCallouts(chartData, customColors);
    }, 2000);
}

// Function to create sector allocation callouts
function createSectorCallouts(chartData, colors) {
    const chartContainer = document.querySelector('#sector-allocation .allocation-chart');
    if (!chartContainer) {
        console.log('Sector chart container not found');
        return;
    }

    // Remove existing callouts and branches
    const existingCallouts = chartContainer.querySelectorAll('.chart-callout, .chart-branch');
    existingCallouts.forEach(element => element.remove());

    // Get chart dimensions
    const chartRect = chartContainer.getBoundingClientRect();
    const chartCenterX = chartRect.width / 2;
    const chartCenterY = chartRect.height / 2;
    
    // Check if chart dimensions are valid
    if (chartRect.width === 0 || chartRect.height === 0) {
        console.log('Sector chart container has zero dimensions, retrying in 500ms');
        setTimeout(() => createSectorCallouts(chartData, colors), 500);
        return;
    }
    
    // Filter items that should have callouts (weight > 2.8%)
    const calloutItems = chartData.filter(item => item.weight > 2.8);
    
    console.log('Sector callout creation debug:', {
        chartDataLength: chartData.length,
        calloutItemsLength: calloutItems.length,
        calloutItems: calloutItems.map(item => ({ symbol: item.symbol, weight: item.weight })),
        chartCenterX,
        chartCenterY
    });
    
    // Calculate positions based on actual pie slice angles
    const totalWeight = chartData.reduce((sum, item) => sum + item.weight, 0);
    const baseRadius = Math.min(chartCenterX, chartCenterY) * 0.8; // Chart radius
    const baseCalloutRadius = Math.min(chartCenterX, chartCenterY) * 1.4; // Base distance from chart edge

    // Calculate initial callout positions
    const calloutPositions = [];
    calloutItems.forEach((item, index) => {
        // Find the item's position in the full chart data to get its slice angle
        const itemIndex = chartData.findIndex(chartItem => chartItem.symbol === item.symbol);
        let sliceStartAngle = -90;
        
        // Calculate the start angle for this slice
        for (let i = 0; i < itemIndex; i++) {
            const sliceWeight = chartData[i].weight;
            const sliceAngle = (sliceWeight / totalWeight) * 360;
            sliceStartAngle += sliceAngle;
        }
        
        // Calculate the middle of this slice
        const sliceWeight = item.weight;
        const sliceAngle = (sliceWeight / totalWeight) * 360;
        const midAngle = sliceStartAngle + (sliceAngle / 2);
        
        // Convert angle to radians
        const angleRad = (midAngle * Math.PI) / 180;
        
        // Calculate initial callout position
        const calloutX = chartCenterX + Math.cos(angleRad) * baseCalloutRadius;
        const calloutY = chartCenterY + Math.sin(angleRad) * baseCalloutRadius;
        
        calloutPositions.push({
            item,
            angle: midAngle,
            angleRad,
            x: calloutX,
            y: calloutY,
            originalRadius: baseCalloutRadius
        });
    });
    
    // Adjust positions to prevent overlaps
    const adjustedPositions = adjustCalloutPositions(calloutPositions, chartCenterX, chartCenterY, baseRadius);

    // Create callouts with adjusted positions
    adjustedPositions.forEach((position, index) => {
        const { item, angle, angleRad, x, y, adjustedRadius } = position;
        
        // Calculate branch start position (on chart edge)
        const branchStartX = chartCenterX + Math.cos(angleRad) * baseRadius;
        const branchStartY = chartCenterY + Math.sin(angleRad) * baseRadius;

        // Create connecting branch
        const branch = document.createElement('div');
        branch.className = 'chart-branch';
        branch.style.cssText = `
            position: absolute;
            left: ${branchStartX}px;
            top: ${branchStartY}px;
            width: ${adjustedRadius - baseRadius}px;
            height: 2px;
            background: linear-gradient(90deg, ${colors[chartData.indexOf(item)]}, ${colors[chartData.indexOf(item)]}80);
            transform-origin: left center;
            transform: rotate(${angle}deg);
            z-index: 5;
        `;

        // Create callout element
        const callout = document.createElement('div');
        callout.className = 'chart-callout';
        callout.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 3px solid ${colors[chartData.indexOf(item)]};
            border-radius: 16px;
            padding: 12px 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10;
            min-width: 100px;
            justify-content: center;
            transition: all 0.3s ease;
        `;

        // Add hover effect
        callout.addEventListener('mouseenter', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1.1)';
            callout.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)`;
            branch.style.background = colors[chartData.indexOf(item)];
            branch.style.height = '3px';
        });

        callout.addEventListener('mouseleave', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1)';
            callout.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)`;
            branch.style.background = `linear-gradient(90deg, ${colors[chartData.indexOf(item)]}, ${colors[chartData.indexOf(item)]}80)`;
            branch.style.height = '2px';
        });

        // Create sector name text (no logo for sectors)
        const sectorText = document.createElement('span');
        // Fix CASH capitalization - make it "Cash" instead of "CASH"
        const displayText = item.symbol === 'CASH' ? 'Cash' : item.symbol;
        sectorText.textContent = displayText;
        sectorText.style.cssText = `
            font-weight: 600;
            font-size: 14px;
            color: #1f2937;
            font-family: 'Inter', sans-serif;
            text-align: center;
        `;

        // Create weight text
        const weightText = document.createElement('span');
        weightText.textContent = `${item.weight.toFixed(1)}%`;
        weightText.style.cssText = `
            font-weight: 700;
            font-size: 16px;
            color: #1f2937;
            font-family: 'Inter', sans-serif;
        `;

        // Create container for sector name and weight
        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        `;

        // Add sector name and weight to container
        textContainer.appendChild(sectorText);
        textContainer.appendChild(weightText);

        // Add text container to callout
        callout.appendChild(textContainer);

        // Add branch and callout to chart container
        chartContainer.appendChild(branch);
        chartContainer.appendChild(callout);
    });
}

// Function to adjust callout positions to prevent overlaps
function adjustCalloutPositions(positions, chartCenterX, chartCenterY, baseRadius) {
    const adjustedPositions = [...positions];
    const calloutSize = 120; // Approximate callout size (width + padding)
    const minDistance = calloutSize * 1.2; // Minimum distance between callout centers
    const maxRadius = Math.min(chartCenterX, chartCenterY) * 2.0; // Maximum distance from center
    
    // Sort positions by angle to process them in order
    adjustedPositions.sort((a, b) => a.angle - b.angle);
    
    // Check for overlaps and adjust positions
    for (let i = 0; i < adjustedPositions.length; i++) {
        const current = adjustedPositions[i];
        let adjustedRadius = current.originalRadius;
        
        // Check distance from previous callout
        if (i > 0) {
            const prev = adjustedPositions[i - 1];
            const distance = Math.sqrt(
                Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
            );
            
            if (distance < minDistance) {
                // Calculate how much to increase the radius
                const angleDiff = Math.abs(current.angle - prev.angle);
                if (angleDiff < 30) { // Only adjust if angles are close
                    const neededDistance = minDistance - distance;
                    const radiusIncrease = neededDistance / Math.sin(angleDiff * Math.PI / 180);
                    adjustedRadius = Math.min(adjustedRadius + radiusIncrease, maxRadius);
                    
                    // Recalculate position with new radius
                    current.x = chartCenterX + Math.cos(current.angleRad) * adjustedRadius;
                    current.y = chartCenterY + Math.sin(current.angleRad) * adjustedRadius;
                }
            }
        }
        
        // Check distance from next callout (wrap around)
        const next = adjustedPositions[(i + 1) % adjustedPositions.length];
        const distanceToNext = Math.sqrt(
            Math.pow(current.x - next.x, 2) + Math.pow(current.y - next.y, 2)
        );
        
        if (distanceToNext < minDistance) {
            const angleDiff = Math.abs(current.angle - next.angle);
            if (angleDiff < 30) { // Only adjust if angles are close
                const neededDistance = minDistance - distanceToNext;
                const radiusIncrease = neededDistance / Math.sin(angleDiff * Math.PI / 180);
                adjustedRadius = Math.min(adjustedRadius + radiusIncrease, maxRadius);
                
                // Recalculate position with new radius
                current.x = chartCenterX + Math.cos(current.angleRad) * adjustedRadius;
                current.y = chartCenterY + Math.sin(current.angleRad) * adjustedRadius;
            }
        }
        
        current.adjustedRadius = adjustedRadius;
    }
    
    return adjustedPositions;
}

// Function to create allocation callouts with logos and weights
function createAllocationCallouts(chartData, colors) {
    const chartContainer = document.querySelector('.allocation-chart');
    if (!chartContainer) {
        console.log('Allocation chart container not found');
        return;
    }

    // Remove existing callouts and branches
    const existingCallouts = chartContainer.querySelectorAll('.chart-callout, .chart-branch');
    existingCallouts.forEach(element => element.remove());

    // Get chart dimensions
    const chartRect = chartContainer.getBoundingClientRect();
    const chartCenterX = chartRect.width / 2;
    const chartCenterY = chartRect.height / 2;
    
    // Check if chart dimensions are valid
    if (chartRect.width === 0 || chartRect.height === 0) {
        console.log('Chart container has zero dimensions, retrying in 500ms');
        setTimeout(() => createAllocationCallouts(chartData, colors), 500);
        return;
    }
    
    // Filter items that should have callouts (weight > 2.8%)
    const calloutItems = chartData.filter(item => item.weight > 2.8);
    
    console.log('Callout creation debug:', {
        chartDataLength: chartData.length,
        calloutItemsLength: calloutItems.length,
        calloutItems: calloutItems.map(item => ({ symbol: item.symbol, weight: item.weight })),
        chartCenterX,
        chartCenterY
    });
    
    // Calculate positions based on actual pie slice angles
    const totalWeight = chartData.reduce((sum, item) => sum + item.weight, 0);
    let currentAngle = -90; // Start from top
    const baseRadius = Math.min(chartCenterX, chartCenterY) * 0.8; // Chart radius
    const calloutRadius = Math.min(chartCenterX, chartCenterY) * 1.4; // Uniform distance from chart edge
    
    // Adjust callout radius to avoid title overlap
    const adjustedCalloutRadius = calloutRadius * 0.85; // Reduce radius to avoid title area

    calloutItems.forEach((item, index) => {
        // Find the item's position in the full chart data to get its slice angle
        const itemIndex = chartData.findIndex(chartItem => chartItem.symbol === item.symbol);
        let sliceStartAngle = -90;
        
        // Calculate the start angle for this slice
        for (let i = 0; i < itemIndex; i++) {
            const sliceWeight = chartData[i].weight;
            const sliceAngle = (sliceWeight / totalWeight) * 360;
            sliceStartAngle += sliceAngle;
        }
        
        // Calculate the middle of this slice
        const sliceWeight = item.weight;
        const sliceAngle = (sliceWeight / totalWeight) * 360;
        const midAngle = sliceStartAngle + (sliceAngle / 2);
        
        // Convert angle to radians
        const angleRad = (midAngle * Math.PI) / 180;
        
        // Calculate callout position with uniform distance from chart
        const calloutX = chartCenterX + Math.cos(angleRad) * calloutRadius;
        const calloutY = chartCenterY + Math.sin(angleRad) * calloutRadius;
        
        // Calculate branch start position (on chart edge)
        const branchStartX = chartCenterX + Math.cos(angleRad) * baseRadius;
        const branchStartY = chartCenterY + Math.sin(angleRad) * baseRadius;

        console.log(`Creating callout for ${item.symbol}:`, {
            itemIndex,
            sliceStartAngle,
            sliceWeight,
            sliceAngle,
            midAngle,
            calloutX,
            calloutY,
            branchStartX,
            branchStartY
        });

        // Create connecting branch
        const branch = document.createElement('div');
        branch.className = 'chart-branch';
        branch.style.cssText = `
            position: absolute;
            left: ${branchStartX}px;
            top: ${branchStartY}px;
            width: ${calloutRadius - baseRadius}px;
            height: 2px;
            background: linear-gradient(90deg, ${colors[chartData.indexOf(item)]}, ${colors[chartData.indexOf(item)]}80);
            transform-origin: left center;
            transform: rotate(${midAngle}deg);
            z-index: 5;
        `;

        // Create callout element
        const callout = document.createElement('div');
        callout.className = 'chart-callout';
        callout.style.cssText = `
            position: absolute;
            left: ${calloutX}px;
            top: ${calloutY}px;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 3px solid ${colors[chartData.indexOf(item)]};
            border-radius: 16px;
            padding: 12px 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
        display: flex;
        align-items: center;
            gap: 10px;
            z-index: 10;
            min-width: 100px;
            justify-content: center;
            transition: all 0.3s ease;
        `;

        // Add hover effect
        callout.addEventListener('mouseenter', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1.1)';
            callout.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)`;
            branch.style.background = colors[chartData.indexOf(item)];
            branch.style.height = '3px';
        });

        callout.addEventListener('mouseleave', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1)';
            callout.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)`;
            branch.style.background = `linear-gradient(90deg, ${colors[chartData.indexOf(item)]}, ${colors[chartData.indexOf(item)]}80)`;
            branch.style.height = '2px';
        });

        // Get logo URL
        const logoUrl = logosData[item.symbol];
        
        // Create logo element
        const logo = document.createElement('img');
        logo.src = logoUrl || '';
        logo.alt = `${item.symbol} logo`;
        logo.style.cssText = `
            width: 28px;
            height: 28px;
            object-fit: contain;
            border-radius: 6px;
            flex-shrink: 0;
        `;
        logo.onerror = function() {
            this.style.display = 'none';
        };

        // Create weight text
        const weightText = document.createElement('span');
        weightText.textContent = `${item.weight.toFixed(1)}%`;
        weightText.style.cssText = `
            font-weight: 700;
            font-size: 16px;
            color: #1f2937;
            font-family: 'Inter', sans-serif;
        `;

        // Add logo and weight to callout
        callout.appendChild(logo);
        callout.appendChild(weightText);

        // Add branch and callout to chart container
        chartContainer.appendChild(branch);
        chartContainer.appendChild(callout);
    });
}

// Update events display
function updateEventsDisplay() {
    const eventsContainer = document.getElementById('upcomingEvents');
    if (!eventsContainer) return;
    
    // Collect all events and sort by date
    const allEvents = [];
    eventsData.forEach(ev => {
        if (ev.upcomingEvents && ev.upcomingEvents.length > 0) {
            ev.upcomingEvents.forEach(u => {
                allEvents.push({
                    ...u,
                    ticker: ev.ticker,
                    companyName: ev.companyName,
                    irUrl: ev.irUrl,
                    logoUrl: logosData[ev.ticker] || ''
                });
            });
        }
    });
    
    // Sort events by date
    allEvents.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });
    
    let html = '';
        allEvents.forEach(event => {
        const logoHtml = event.logoUrl ? `<img src="${event.logoUrl}" alt="${event.ticker}" />` : event.ticker;
        html += `
            <div class="event-item">
                <div class="event-logo">${logoHtml}</div>
                <div class="event-info">
                    <div class="event-company">${cleanCompanyName(event.companyName || logosData[`${event.ticker}_name`] || event.ticker)}</div>
                    <div class="event-name">${event.name}</div>
                    <div class="event-date"><i class="far fa-calendar"></i>${formatDateForDisplay(event.date)}</div>
                </div>
                ${(event.irUrl || logosData[`${event.ticker}_ir`]) ? `<div class="event-actions"><a class="event-link" href="${event.irUrl || logosData[`${event.ticker}_ir`]}" target="_blank"><i class="fas fa-external-link-alt"></i> IR Page</a></div>` : ''}
            </div>`;
    });
    
    if (html === '') {
        html = '<div class="no-events"><i class="far fa-calendar-times"></i><p>No upcoming events found.</p><small>We check IR pages and cache results for speed.</small></div>';
    }
    
    eventsContainer.innerHTML = html;
}

// Filter portfolio data
function filterPortfolioData(data, filter) {
    if (filter === 'all') return data;
    return data.filter(item => item.type === filter);
}

// Sort portfolio data
function sortPortfolioData(data, column, direction) {
    if (!column) return data;
    
    return [...data].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = direction === 'asc' ? Infinity : -Infinity;
        if (bVal === null || bVal === undefined) bVal = direction === 'asc' ? Infinity : -Infinity;
        
        // Handle string comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Contact form handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
            console.log('Contact form submitted');
        });
    }
    
    console.log('Event listeners initialized');
}

// Sample data for fallback
const SAMPLE_PORTFOLIO_DATA = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stocks', shares: 100, price: 175.50, value: 17550.00, return: 12.5, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stocks', shares: 50, price: 320.25, value: 16012.50, return: 8.3, sector: 'Technology' }
];
