// ============================================================================
// JIGGY CAPITAL PORTFOLIO - OPTIMIZED VERSION
// ============================================================================

// Configuration - API Keys and URLs
// NOTE: In production, these should be moved to environment variables or backend
const CONFIG = {
    GOOGLE_SHEETS: {
        portfolioSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1871140253',
        watchlistSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=842475955',
        positionsDetailedUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1134366200',
        watchlistDetailedUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=695255397',
        logosSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1789448141',
        performanceSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=721839254',
        eventsSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1789448141'
    },
    FINNHUB: {
        API_KEY: 'd2l0fm1r01qqq9qsstfgd2l0fm1r01qqq9qsstg0', // TODO: Move to environment variable
        API_URL: 'https://finnhub.io/api/v1',
        NEWS_DAYS: 7,
        EARNINGS_DAYS: 90
    },
    CACHE: {
        EVENTS_CACHE_KEY: 'eventsCache_v1',
        FINNHUB_CACHE_PREFIX: 'finnhub_events_',
        CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
};

// Backward compatibility
const GOOGLE_SHEETS_CONFIG = CONFIG.GOOGLE_SHEETS;

// Global state - consider moving to a state management pattern for larger apps
const state = {
    portfolioData: [],
    watchlistData: [],
    logosData: {},
    performanceData: {},
    eventsData: [],
    currentFilter: 'all',
    currentSort: { column: null, direction: 'asc' },
    currentPortfolioView: 'portfolio',
    watchlistSortColumn: null,
    watchlistSortDirection: 'asc',
    cashBalance: 0, // Will be loaded from sheet
    charts: {},
    consolidatedChart: null,
    currentView: 'company'
};

// Backward compatibility aliases
let portfolioData = state.portfolioData;
let watchlistData = state.watchlistData;
let logosData = state.logosData;
let performanceData = state.performanceData;
let eventsData = state.eventsData;
let currentFilter = state.currentFilter;
let currentSort = state.currentSort;
let currentPortfolioView = state.currentPortfolioView;
let watchlistSortColumn = state.watchlistSortColumn;
let watchlistSortDirection = state.watchlistSortDirection;
let cashBalance = state.cashBalance;
let charts = state.charts;
let consolidatedChart = state.consolidatedChart;
let currentView = state.currentView;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeNavigation();
        loadPortfolioData();
        initializeEventListeners();
    } catch (error) {
        console.error('Error during initialization:', error);
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid && typeof showError === 'function') {
            showError(error.message, portfolioGrid);
        } else if (portfolioGrid) {
            portfolioGrid.innerHTML = `<div class="error" style="padding: 1rem; color: #c33;">Error: ${sanitizeHTML(error.message)}</div>`;
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

// Load portfolio data - OPTIMIZED: Parallel fetching for better performance
async function loadPortfolioData() {
    try {
        // Show loading state
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid && typeof showLoading === 'function') {
            showLoading(portfolioGrid, 'Loading portfolio data...');
        }

        // Fetch all data in parallel for better performance
        const [portfolioResponse, watchlistResponse, logosResponse, performanceResponse, eventsResponse] = await Promise.allSettled([
            fetch(GOOGLE_SHEETS_CONFIG.portfolioSheetUrl),
            fetch(GOOGLE_SHEETS_CONFIG.watchlistSheetUrl),
            fetch(GOOGLE_SHEETS_CONFIG.logosSheetUrl),
            fetch(GOOGLE_SHEETS_CONFIG.performanceSheetUrl),
            fetch(GOOGLE_SHEETS_CONFIG.eventsSheetUrl)
        ]);

        // Process portfolio data
        if (portfolioResponse.status === 'fulfilled' && portfolioResponse.value.ok) {
            const portfolioCsv = await portfolioResponse.value.text();
            const extractedCash = extractCashBalance(portfolioCsv);
            if (extractedCash !== null) {
                state.cashBalance = extractedCash;
                cashBalance = extractedCash;
            }
            state.portfolioData = parsePortfolioCSV(portfolioCsv);
            portfolioData = state.portfolioData;
        } else {
            throw new Error('Failed to load portfolio data');
        }

        // Process watchlist data
        if (watchlistResponse.status === 'fulfilled' && watchlistResponse.value.ok) {
            const watchlistCsv = await watchlistResponse.value.text();
            state.watchlistData = parseWatchlistCSV(watchlistCsv);
            watchlistData = state.watchlistData;
        }

        // Process logos data
        if (logosResponse.status === 'fulfilled' && logosResponse.value.ok) {
            const logosCsv = await logosResponse.value.text();
            state.logosData = parseLogosCSV(logosCsv);
            logosData = state.logosData;
        }

        // Process performance data
        if (performanceResponse.status === 'fulfilled' && performanceResponse.value.ok) {
            const performanceCsv = await performanceResponse.value.text();
            state.performanceData = parsePerformanceCSV(performanceCsv);
            performanceData = state.performanceData;
        }

        // Process events data
        if (eventsResponse.status === 'fulfilled' && eventsResponse.value.ok) {
            const eventsCsv = await eventsResponse.value.text();
            state.eventsData = parseEventsCSV(eventsCsv);
            eventsData = state.eventsData;
        }

        // Fetch real-time prices and compute weights
        state.portfolioData = updatePortfolioPrices(state.portfolioData);
        portfolioData = state.portfolioData;

        // Update displays
        updateHeroStats();
        updatePortfolioDisplay();
        updatePerformanceDisplay();
        
        // Initialize chart and set up toggle buttons
        updateConsolidatedChart('company');
        // Set up toggle buttons after a short delay to ensure DOM is ready
        setTimeout(() => {
            setupToggleButtons();
        }, 200);

        // Fetch upcoming events and company news in parallel (non-blocking)
        Promise.all([
            fetchUpcomingEvents().then(() => updateEventsDisplay()),
            fetchCompanyNews()
        ]).catch(error => {
            console.error('Error loading events/news:', error);
        });

        // Update displays again after data processing
        updatePortfolioDisplay();
        updatePerformanceDisplay();
        
    } catch (error) {
        console.error('Error loading portfolio data:', error);
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid) {
            if (typeof showError === 'function') {
                showError('Failed to load portfolio data. Please refresh the page.', portfolioGrid);
            } else {
                portfolioGrid.innerHTML = `<div class="error" style="padding: 1rem; color: #c33;">Error: ${sanitizeHTML(error.message)}</div>`;
            }
        }
        // Fallback to sample data only if we have no data at all
        if (state.portfolioData.length === 0) {
            state.portfolioData = SAMPLE_PORTFOLIO_DATA;
            portfolioData = state.portfolioData;
            updateHeroStats();
            updatePortfolioDisplay();
        }
    }
}

// Get price from Google Sheet data (Column M)
function getPriceFromSheetData(symbol, portfolioData) {
    const item = portfolioData.find(item => item.symbol === symbol);
    if (item && item.price) {
        return toNumber(item.price);
    }
    return 0;
}

// Update portfolio with prices from Google Sheet and compute returns/weights
function updatePortfolioPrices(items) {
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
        
    }
    
    // Calculate weights
    const totalValue = updated.reduce((s, x) => s + (x.value || 0), 0) + cashBalance;
    
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

// Helper functions moved to utils.js - keeping for backward compatibility
// NOTE: utils.js is loaded first, so these are only fallbacks
// Don't check window.* to avoid recursion - utils.js functions will override these
function toNumber(value) {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function toPercentage(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    const cleaned = str.replace(/[^0-9.\-+]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

// Sanitization helper (fallback if utils.js not loaded)
// NOTE: utils.js is loaded first, so this is only a fallback
function sanitizeHTML(str) {
    // Don't check window.sanitizeHTML to avoid recursion - utils.js defines it
    // If utils.js is loaded, it will override this function
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Extract cash balance from CSV data
function extractCashBalance(csv) {
    const rows = parseCSVToRows(csv);
    
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        
        const ticker = (r[0] || '').trim(); // Column A
        
        if (ticker.toUpperCase() === 'CASH') {
            // Column S is index 18 (Market Value)
            const marketValue = r[18] || '';
            const parsedCash = parseFloat(marketValue.replace(/[$,]/g, '')) || 0;
            
            if (!isNaN(parsedCash) && parsedCash > 0) {
                return parsedCash;
            }
        }
    }
    
    return null;
}

// Parse portfolio CSV
function parsePortfolioCSV(csv) {
    const rows = parseCSVToRows(csv);
    if (!rows || rows.length === 0) return [];
    const data = [];
    
    // Dynamic row detection: find the first blank row (empty ticker) after header
    let lastRowIndex = rows.length - 1; // Default to all rows
    for (let i = 1; i < rows.length; i++) {
        const ticker = (rows[i][0] || '').trim();
        if (!ticker) {
            // Found blank row, stop processing here
            lastRowIndex = i - 1;

            break;
        }
    }
    

    
    // Process all valid rows up to the blank row
    for (let i = 1; i <= lastRowIndex; i++) {
        let r = rows[i];
        if (!r || r.length === 0) continue;
        // Limit columns to A..AR (0..43)
        if (r.length > 44) r = r.slice(0, 44);
        const ticker = (r[0] || '').trim(); // A
        if (!ticker) continue;
        // Skip Cash row - it will be handled separately
        if (ticker.toUpperCase() === 'CASH') {
            continue;
        }
        


        
        // Try YTD Gain first (Column AR), fallback to One Year Change (Column AC), then FCF
        let ytdGainValue = toPercentage(r[43]); // Column AR - YTD Gain
        let fcfMultiple = toNumber(r[37]); // Column AL - P/2026 FCF
        
        const item = {
            symbol: ticker,
            name: cleanCompanyName((r[1] || '').trim()),         // B
            firstBuy: (r[4] || '').trim(),     // E
            lastBuy: (r[5] || '').trim(),      // F
            sector: (r[7] || '').trim(),       // H - Sector for pie chart
            marketCap: toNumber(r[10]),        // K - Market Cap from Google Sheet
            price: toNumber(r[12]),            // M - Price from Google Sheet
            shares: toNumber(r[13]),           // N
            avgCost: toNumber(r[14]),          // O
            costBasis: toNumber(r[15]),        // P
            changePct: toNumber(r[21]),        // V
            pe2026: toNumber(r[36]) || null,   // AK
            pfcf2026: toNumber(r[37]) || null, // AL
            peg: toNumber(r[41]) || null,      // AP - P/E/G Multiple
            fwdRevCagr: toNumber(r[38]) || null, // AM - Fwd Rev CAGR
            ytdGain: ytdGainValue,       // AR - YTD Gain (or null if #N/A)
            fcfMultiple: fcfMultiple     // AL - P/2026 FCF for FCF multiples
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

// Parse watchlist CSV
function parseWatchlistCSV(csv) {
    const rows = parseCSVToRows(csv);
    if (!rows || rows.length === 0) return [];
    const data = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        
        const ticker = (r[0] || '').trim(); // Column A
        if (!ticker) continue;
        
        const originalName = (r[1] || '').trim();
        const cleanedName = cleanCompanyName(originalName);
        


        const item = {
            symbol: ticker,
            name: cleanedName,                                   // Column B
            logoUrl: (r[3] || '').trim(),                       // Column D
            price: toNumber(r[5]),                              // Column F
            marketCap: toNumber(r[6]),                          // Column G
            changePct: toPercentage(r[7]),                      // Column H - Change %
            oneMonthChange: toPercentage(r[9]),                 // Column J - 1M Change %
            ytdChange: toPercentage(r[11]),                     // Column L - YTD Change %
            pe2026: toNumber(r[13]) || null,                    // Column N
            pfcf2026: toNumber(r[14]) || null,                  // Column O
            fwdRevCagr: toPercentage(r[15]) || null,            // Column P - Fwd Rev CAGR
            peg: toNumber(r[18]) || null                        // Column S
        };
        

        
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
    
    let cleaned = companyName.trim();
    
    // Handle specific known cases first
    if (cleaned === "Adyen Unsponsored Netherl 100 ADR Representing 1 Ord Shs") {
        return "Adyen";
    }
    if (cleaned === "ASML Holding NV") {
        return "ASML";
    }
    if (cleaned === "Birkenstock Holding PLC") {
        return "Birkenstock";
    }
    if (cleaned === "On Holding AG") {
        return "On";
    }
    
    // Remove common suffixes using simple string replacement
    const suffixes = [
        ' Inc', ' Corp', ' Corporation', ' Company', ' Co', ' LLC', ' Ltd', ' Limited',
        ' Technology', ' Technologies', ' Systems', ' Solutions', ' Services',
        ' ADR', ' Class A', ' Class B', ' Class C',
        ' Holdings', ' Holding', ' PLC', ' AG', ' Markets'
    ];
    
    for (const suffix of suffixes) {
        if (cleaned.endsWith(suffix)) {
            cleaned = cleaned.slice(0, -suffix.length);
            break;
        }
    }
    
    // Special handling for "And" patterns
    if (cleaned.endsWith(' And Co')) {
        cleaned = cleaned.slice(0, -7);
    } else if (cleaned.endsWith(' And')) {
        cleaned = cleaned.slice(0, -4);
    }
    
    return cleaned.trim();
}

// Get sort icon for watchlist headers (using same approach as Portfolio)
function getWatchlistSortIcon(column) {
    if (watchlistSortColumn === column) {
        const dir = watchlistSortDirection === 'desc' ? 'down' : 'up';
        const iconClass = `fa-sort-${dir}`;
        return `<i class="fas ${iconClass} sort-icon"></i>`;
    }
    return `<i class="fas fa-sort sort-icon"></i>`;
}

// Sort watchlist data - uses unified function (DRY)
function sortWatchlistData(data, column, direction) {
    return sortData(data, column, direction);
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
    try {
        // Load from cached file only
        const response = await fetch('./events-cache.json');
        if (response.ok) {
            const cachedData = await response.json();
            
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
            
            // Only assign events to companies actually in the portfolio
            // Create a set of portfolio tickers for fast lookup
            const portfolioTickers = new Set(
                state.portfolioData
                    .filter(item => item.symbol && item.symbol.toUpperCase() !== 'CASH')
                    .map(item => item.symbol.toUpperCase())
            );
            
            // Assign events to portfolio items only
            eventsData.forEach(event => {
                // Only process if this company is in the portfolio
                if (event.ticker && portfolioTickers.has(event.ticker.toUpperCase())) {
                    event.upcomingEvents = eventsByTicker[event.ticker] || [];
                } else {
                    event.upcomingEvents = [];
                }
            });
            
            // Display events
            displayUpcomingEvents();
        } else {
            // Set empty events for all companies
            eventsData.forEach(event => {
                event.upcomingEvents = [];
            });
            displayUpcomingEvents();
        }
    } catch (error) {
        console.error('Failed to load cached events:', error.message);
        // Set empty events for all companies
        eventsData.forEach(event => {
            event.upcomingEvents = [];
        });
        displayUpcomingEvents();
    }
}





// Fetch company news from Finnhub API - OPTIMIZED: Parallel fetching with rate limiting
async function fetchCompanyNews() {
    try {
        const { API_KEY, API_URL, NEWS_DAYS } = CONFIG.FINNHUB;
        const newsApiUrl = `${API_URL}/company-news`;
        
        // Get date range
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - (NEWS_DAYS * 24 * 60 * 60 * 1000));
        const fromDate = sevenDaysAgo.toISOString().split('T')[0];
        const toDate = today.toISOString().split('T')[0];
        
        const allNews = [];
        // Only fetch news for companies actually in the portfolio
        const tickers = state.portfolioData
            .filter(item => item.symbol && item.symbol.toUpperCase() !== 'CASH')
            .map(item => item.symbol.toUpperCase()); // Normalize to uppercase for consistency
        
        // Debug: Log portfolio tickers to verify filtering
        console.log('[Company News] Fetching news for portfolio tickers:', tickers);
        
        if (tickers.length === 0) {
            console.warn('[Company News] No portfolio tickers found, skipping news fetch');
            displayCompanyNews([]);
            return;
        }
        
        // Fetch news for all companies in parallel with concurrency limit
        const BATCH_SIZE = 5; // Limit concurrent requests to avoid rate limits
        for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
            const batch = tickers.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (ticker) => {
                try {
                    const params = new URLSearchParams({
                        symbol: ticker,
                        from: fromDate,
                        to: toDate,
                        token: API_KEY
                    });
                    
                    const url = `${newsApiUrl}?${params.toString()}`;
                    
                    // Use CORS proxy to avoid CORS errors
                    const newsData = await getProxiedJSON(url);
                    
                    if (!newsData || !Array.isArray(newsData)) {
                        return [];
                    }
                    
                    // Get company name from portfolio data (match case-insensitive)
                    const portfolioItem = state.portfolioData.find(item => 
                        item.symbol && item.symbol.toUpperCase() === ticker.toUpperCase()
                    );
                    
                    return newsData.map(news => ({
                        ...news,
                        ticker: ticker.toUpperCase(), // Normalize ticker to uppercase
                        companyName: portfolioItem?.name || ticker,
                        logoUrl: logosData[ticker] || ''
                    }));
                } catch (error) {
                    // Silent fail for individual requests
                    return [];
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            allNews.push(...batchResults.flat());
        }
        
        // Sort by date (newest first) and display
        allNews.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        displayCompanyNews(allNews);
        
    } catch (error) {
        console.error('Error fetching company news:', error);
        displayCompanyNews([]);
    }
}

// Display upcoming events
function displayUpcomingEvents() {
    const eventsContainer = document.getElementById('upcomingEvents');
    if (!eventsContainer) return;
    
    // Collect all events from portfolio companies only
    const allEvents = [];
    
    // Create a set of portfolio tickers for fast lookup
    const portfolioTickers = new Set(
        state.portfolioData
            .filter(item => item.symbol && item.symbol.toUpperCase() !== 'CASH')
            .map(item => item.symbol.toUpperCase())
    );
    
    // Only show events for companies in the portfolio
    eventsData.forEach(company => {
        // Only process if this company is in the portfolio
        if (company.ticker && portfolioTickers.has(company.ticker.toUpperCase())) {
            if (company.upcomingEvents && Array.isArray(company.upcomingEvents)) {
                allEvents.push(...company.upcomingEvents);
            }
        }
    });
    
    if (allEvents.length === 0) {
        eventsContainer.innerHTML = '<div class="no-events"><i class="far fa-calendar"></i><p>No upcoming events found.</p><small>Events are updated every 7 days via GitHub Actions.</small></div>';
        return;
    }
    
    // Sort events by date
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Use DOM methods instead of innerHTML for better security
    eventsContainer.innerHTML = ''; // Clear first
    
    allEvents.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        
        // Logo
        const logoDiv = document.createElement('div');
        logoDiv.className = 'event-logo';
        const logoUrl = logosData[event.ticker] || '';
        if (logoUrl) {
            const img = document.createElement('img');
            img.src = logoUrl;
            img.alt = sanitizeHTML(event.ticker);
            logoDiv.appendChild(img);
        } else {
            logoDiv.textContent = sanitizeHTML(event.ticker);
        }
        eventItem.appendChild(logoDiv);
        
        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'event-info';
        
        const companyDiv = document.createElement('div');
        companyDiv.className = 'event-company';
        companyDiv.textContent = sanitizeHTML(event.companyName || event.ticker);
        infoDiv.appendChild(companyDiv);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'event-name';
        nameDiv.textContent = sanitizeHTML(event.name);
        infoDiv.appendChild(nameDiv);
        
        const dateDiv = document.createElement('div');
        dateDiv.className = 'event-date';
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
        });
        dateDiv.innerHTML = `<i class="far fa-calendar"></i>${sanitizeHTML(formattedDate)}`;
        infoDiv.appendChild(dateDiv);
        
        eventItem.appendChild(infoDiv);
        
        // Actions
        if (event.url) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'event-actions';
            const link = document.createElement('a');
            link.className = 'event-link';
            link.href = sanitizeHTML(event.url);
            link.target = '_blank';
            link.rel = 'noopener noreferrer'; // Security best practice
            link.innerHTML = '<i class="fas fa-external-link-alt"></i>View Details';
            actionsDiv.appendChild(link);
            eventItem.appendChild(actionsDiv);
        }
        
        eventsContainer.appendChild(eventItem);
    });
}

// Display company news - SECURITY: Uses DOM methods instead of innerHTML
function displayCompanyNews(newsData) {
    const newsContainer = document.getElementById('companyNews');
    if (!newsContainer) return;
    
    if (newsData.length === 0) {
        newsContainer.innerHTML = '<div class="no-news"><i class="far fa-newspaper"></i><p>No recent news found.</p><small>We check for news from the last 7 days.</small></div>';
        return;
    }
    
    // Create a set of portfolio tickers for fast lookup
    const portfolioTickers = new Set(
        state.portfolioData
            .filter(item => item.symbol && item.symbol.toUpperCase() !== 'CASH')
            .map(item => item.symbol.toUpperCase())
    );
    
    // Debug: Log portfolio tickers and news tickers for troubleshooting
    const newsTickers = [...new Set(newsData.map(n => (n.ticker || '').toUpperCase()))];
    console.log('[Company News] Portfolio tickers:', Array.from(portfolioTickers));
    console.log('[Company News] News tickers received:', newsTickers);
    console.log('[Company News] News items before filtering:', newsData.length);
    
    // Filter news to only include:
    // 1. Companies in the portfolio
    // 2. Articles with company name in headline
    // 3. Exclude fool.com and Seeking Alpha
    const filteredNews = newsData.filter(news => {
        // Only show news for companies in the portfolio
        const newsTicker = (news.ticker || '').toUpperCase().trim();
        if (!newsTicker || !portfolioTickers.has(newsTicker)) {
            return false;
        }
        
        // Exclude articles from fool.com and Seeking Alpha (check both URL and source)
        const url = (news.url || '').toLowerCase();
        const source = (news.source || '').toLowerCase();
        
        if (url.includes('fool.com') || url.includes('seekingalpha.com') || 
            source.includes('fool') || source.includes('seeking alpha') || source.includes('seekingalpha')) {
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
    
    // Use DOM methods for better security - limit to 50 articles
    newsContainer.innerHTML = '';
    filteredNews.slice(0, 50).forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        // Logo
        const logoDiv = document.createElement('div');
        logoDiv.className = 'news-logo';
        if (news.logoUrl) {
            const img = document.createElement('img');
            img.src = news.logoUrl;
            img.alt = sanitizeHTML(news.ticker);
            logoDiv.appendChild(img);
        } else {
            logoDiv.textContent = sanitizeHTML(news.ticker);
        }
        newsItem.appendChild(logoDiv);
        
        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'news-info';
        
        const companyDiv = document.createElement('div');
        companyDiv.className = 'news-company';
        companyDiv.textContent = sanitizeHTML(news.companyName || news.ticker);
        infoDiv.appendChild(companyDiv);
        
        const headlineDiv = document.createElement('div');
        headlineDiv.className = 'news-headline';
        headlineDiv.textContent = sanitizeHTML(news.headline);
        infoDiv.appendChild(headlineDiv);
        
        const dateDiv = document.createElement('div');
        dateDiv.className = 'news-date';
        // Parse date
        let newsDate;
        if (typeof news.datetime === 'number') {
            newsDate = news.datetime > 1000000000000 
                ? new Date(news.datetime) 
                : new Date(news.datetime * 1000);
        } else if (typeof news.datetime === 'string') {
            newsDate = new Date(news.datetime);
        } else {
            newsDate = new Date();
        }
        const formattedDate = newsDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        dateDiv.innerHTML = `<i class="far fa-calendar"></i>${sanitizeHTML(formattedDate)}`;
        infoDiv.appendChild(dateDiv);
        
        newsItem.appendChild(infoDiv);
        
        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'news-actions';
        const link = document.createElement('a');
        link.className = 'news-link';
        link.href = sanitizeHTML(news.url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer'; // Security best practice
        link.innerHTML = `<i class="fas fa-external-link-alt"></i>${window.innerWidth <= 768 ? 'Read' : 'Read Article'}`;
        actionsDiv.appendChild(link);
        newsItem.appendChild(actionsDiv);
        
        newsContainer.appendChild(newsItem);
    });
}

// Extract events from HTML with smart section targeting
function extractEventsFromHTML(html, eventInfo) {
    const events = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = (doc.body && doc.body.textContent) ? doc.body.textContent : html;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

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
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of upcomingSectionPatterns) {
            if (pattern.test(line)) {
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
        const sectionLines = lines.slice(startIndex, endIndex);
        lines.splice(0, lines.length, ...sectionLines);
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
    
                }
            }
        }
    }


    const today = new Date();
    today.setHours(0,0,0,0);

    let consecutiveOld = 0;




    
    // Enhanced event matching: look for dates first, then find associated events
    for (const dateInfo of allDates) {
        const d = dateInfo.date;
        if (!d || d < today) continue;
        

        
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
        
                break;
            }
            }
        }
        
        if (!eventName) {
    
            continue;
        }


        events.push({
            name: cleanEventTitle(eventName),
            date: dateInfo.dateStr,
            companyName: eventInfo.companyName,
            ticker: eventInfo.ticker
        });
    }
    

    
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


        // Find dates
        const dates = [];
        let d;
            while ((d = pattern.dateRe.exec(sc)) !== null) {
                const dateStr = d[2] || d[1]; // Handle different group structures
                const pd = parseDate(dateStr);
                if (pd) {
                    dates.push({ value: dateStr, index: d.index, date: pd });

                }
            }
            
        if (dates.length === 0) continue;


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
                for (const match of matches) {
                }
            }
        }
        
        // Try to find JSON data in script tags
        const jsonDataPattern = /var\s+eventsData\s*=\s*(\[[^\]]+\])/g;
        const jsonMatches = html.match(jsonDataPattern);
        if (jsonMatches) {
    
        }
    }


    
    // If no events found and Q4 Events detected, try to extract from embedded data
    if (events.length === 0 && html.includes('q4Events')) {

        const embeddedEvents = extractQ4EventsEmbeddedData(html, eventInfo);
        if (embeddedEvents.length > 0) {
    
            return dedupeEvents(embeddedEvents);
        }
    }

    return dedupeEvents(events);
}

// Extract events from Q4 Events embedded data
function extractQ4EventsEmbeddedData(html, eventInfo) {

    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Look for Q4 Events configuration and extract any embedded data
    const q4ConfigMatch = html.match(/\$tudio\([^)]+\)\.q4Events\(({[^}]+})/);
    if (q4ConfigMatch) {
        // // console.log(`[${eventInfo.ticker}] Found Q4 Events configuration:`, q4ConfigMatch[1]);
        
        // Look for event data in the configuration
        const configText = q4ConfigMatch[1];
        
        // Look for Q4 Events data that might be embedded in the page
        // // console.log(`[${eventInfo.ticker}] Searching for Q4 Events data in HTML...`);
        
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
                // // console.log(`[${eventInfo.ticker}] Found Q4 Events data pattern:`, pattern);
                for (const match of matches) {
                    // // console.log(`[${eventInfo.ticker}] Q4 Events data match:`, match);
                    
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
                        // console.log(`[${eventInfo.ticker}] Parsed Q4 Events JSON:`, jsonData);
                        
                        // Extract events from the JSON
                        if (Array.isArray(jsonData)) {
                            for (const event of jsonData) {
                                if (event.date || event.startDate || event.eventDate || event.start_time) {
                                    const dateStr = event.date || event.startDate || event.eventDate || event.start_time;
                                    const eventDate = parseDate(dateStr);
                                    
                                    if (eventDate && eventDate >= today) {
                                        const title = event.title || event.name || event.eventTitle || event.headline || 'Upcoming Event';
                                        // console.log(`[${eventInfo.ticker}] Found Q4 Events event: "${title}" on ${dateStr}`);
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
                        // console.log(`[${eventInfo.ticker}] Failed to parse Q4 Events JSON:`, parseError.message);
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
                // console.log(`[${eventInfo.ticker}] Found pattern match:`, match[0]);
                
                if (match[1] && match[2]) {
                    const title = match[1];
                    const dateStr = match[2];
                    
                    if (title && dateStr && title.length > 10 && dateStr.length > 5) {
                        const eventDate = parseDate(dateStr);
                        if (eventDate && eventDate >= today) {
                            // console.log(`[${eventInfo.ticker}] Found embedded event: "${title}" on ${dateStr}`);
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
        // console.log(`[${eventInfo.ticker}] Analyzing Q4 Events configuration for embedded data...`);
        
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
                // console.log(`[${eventInfo.ticker}] Found event data in Q4 config:`, matches);
                
                for (const match of matches) {
                    try {
                        // Try to parse as JSON object
                        const eventData = JSON.parse(match);
                        if (eventData.date || eventData.startDate || eventData.eventDate) {
                            const dateStr = eventData.date || eventData.startDate || eventData.eventDate;
                            const eventDate = parseDate(dateStr);
                            
                            if (eventDate && eventDate >= today) {
                                const title = eventData.title || eventData.name || eventData.eventTitle || 'Upcoming Event';
                                // console.log(`[${eventInfo.ticker}] Found Q4 config event: "${title}" on ${dateStr}`);
                                events.push({
                                    name: cleanEventTitle(title),
                                    date: dateStr,
                                    companyName: eventInfo.companyName,
                                    ticker: eventInfo.ticker
                                });
                            }
                        }
                    } catch (parseError) {
                        // console.log(`[${eventInfo.ticker}] Failed to parse Q4 config event:`, parseError.message);
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
            // console.log(`[${eventInfo.ticker}] Found potential event title: "${title}"`);
            
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
                        // console.log(`[${eventInfo.ticker}] Found event with date before: "${title}" on ${dateStr}`);
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
                        // console.log(`[${eventInfo.ticker}] Found event with date after: "${title}" on ${dateStr}`);
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
    
    // console.log(`[${eventInfo.ticker}] Q4 Events embedded extraction found ${events.length} events`);
    
    // If still no events, try to find any JSON data in the entire HTML
    if (events.length === 0) {
        // console.log(`[${eventInfo.ticker}] No events found, searching for any JSON data in HTML...`);
        
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
                // console.log(`[${eventInfo.ticker}] Found potential JSON data:`, matches[0]);
                
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
                    // console.log(`[${eventInfo.ticker}] Parsed JSON data:`, jsonData);
                    
                    // Extract events from the JSON
                    const jsonEvents = jsonData.events || jsonData.data || (Array.isArray(jsonData) ? jsonData : []);
                    
                    for (const event of jsonEvents) {
                        if (event.date || event.startDate || event.eventDate) {
                            const dateStr = event.date || event.startDate || event.eventDate;
                            const eventDate = parseDate(dateStr);
                            
                            if (eventDate && eventDate >= today) {
                                const title = event.title || event.name || event.eventTitle || 'Upcoming Event';
                                // console.log(`[${eventInfo.ticker}] Found JSON event: "${title}" on ${dateStr}`);
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
                    // console.log(`[${eventInfo.ticker}] Failed to parse JSON:`, parseError.message);
                }
            }
        }
    }
    
    // If still no events, try a more aggressive search for any event-related data
    if (events.length === 0) {
        // console.log(`[${eventInfo.ticker}] No events found, trying aggressive search for event data...`);
        
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
                // console.log(`[${eventInfo.ticker}] Found potential event text with pattern:`, pattern);
                for (const match of matches) {
                    // console.log(`[${eventInfo.ticker}] Potential event text:`, match);
                    
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
                                
                                // console.log(`[${eventInfo.ticker}] Found potential event: "${title}" on ${dateStr}`);
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

// Try Finnhub Earnings Calendar API - OPTIMIZED: Uses config and improved caching
async function tryFinnhubEarningsAPI(ticker, eventInfo) {
    try {
        // Check cache first
        const cacheKey = `${CONFIG.CACHE.FINNHUB_CACHE_PREFIX}${ticker}`;
        const cached = loadFinnhubEventsCache(cacheKey);
        
        if (cached && cached.events && cached.events.length > 0) {
            const cacheAge = Date.now() - cached.timestamp;
            if (cacheAge < CONFIG.CACHE.CACHE_MAX_AGE) {
                return cached.events;
            }
        }
        
        const { API_KEY, API_URL, EARNINGS_DAYS } = CONFIG.FINNHUB;
        const earningsApiUrl = `${API_URL}/calendar/earnings`;
        
        // Get current date and future dates
        const today = new Date();
        const fromDate = today.toISOString().split('T')[0];
        const toDate = new Date(today.getTime() + (EARNINGS_DAYS * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
            try {
                const params = new URLSearchParams({
                    from: fromDate,
                    to: toDate,
                    symbol: ticker,
                    token: API_KEY
                });
                
                const url = `${earningsApiUrl}?${params.toString()}`;
                
                // Use CORS proxy to avoid CORS errors
                const data = await getProxiedJSON(url);
                
            if (!data) {
                // console.log(`[${ticker}] Finnhub API error: No data returned`);
                return [];
            }
            // console.log(`[${ticker}] Finnhub API response:`, data);
            
            if (data && data.earningsCalendar && Array.isArray(data.earningsCalendar)) {
                const events = [];
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                
                for (const earning of data.earningsCalendar) {
                    if (earning.date) {
                        // Handle Finnhub date format (YYYY-MM-DD) to avoid timezone issues
                        let eventDate;
                        // console.log(`[${ticker}] Processing Finnhub date: ${earning.date}`);
                        if (earning.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            // Parse YYYY-MM-DD format in local timezone
                            const [year, month, day] = earning.date.split('-').map(Number);
                            eventDate = new Date(year, month - 1, day); // month is 0-indexed
                            // console.log(`[${ticker}] Parsed YYYY-MM-DD: ${year}-${month}-${day} -> ${eventDate.toDateString()}`);
                        } else {
                            eventDate = parseDate(earning.date);
                            // console.log(`[${ticker}] Parsed with parseDate: ${earning.date} -> ${eventDate ? eventDate.toDateString() : 'null'}`);
                        }
                        
                        if (eventDate && eventDate >= todayStart) {
                            // Calculate days until event
                            const daysUntilEvent = Math.ceil((eventDate - todayStart) / (1000 * 60 * 60 * 24));
                            
                            // Only show events within 30 days
                            // console.log(`[${ticker}] Event: ${earning.date}, Parsed date: ${eventDate.toDateString()}, Days until: ${daysUntilEvent}, Show: ${daysUntilEvent <= 30}`);
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
                    // console.log(`[${ticker}] Finnhub API found ${events.length} events`);
                    
                    // Cache the results
                    saveFinnhubEventsCache(cacheKey, events);
                    
                    return events;
                } else {
                    // console.log(`[${ticker}] No Finnhub earnings data found, caching empty result`);
                    
                    // Cache empty result to avoid repeated API calls
                    saveFinnhubEventsCache(cacheKey, []);
                    
                    return [];
                }
            }
            
            // console.log(`[${ticker}] No Finnhub earnings data found`);
            return [];
            
        } catch (error) {
            // console.log(`[${ticker}] Finnhub API error:`, error.message);
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
    // console.log(`[PROXY] Attempting to fetch: ${url}`);
    
    // Updated proxy list - removed broken ones (cors-anywhere.herokuapp.com, thingproxy.freeboard.io)
    const proxies = [
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://cors.bridged.cc/${u}`,
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        // Additional fallback: try allorigins with get method
        (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&callback=`
    ];
    
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        try {
            const proxied = proxy(url);
            // console.log(`[PROXY] Trying proxy ${i + 1}: ${proxied}`);
            
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
                        // console.log(`[PROXY] Proxy ${i + 1} returned error page, trying next...`);
                        continue;
                    }
                    // console.log(`[PROXY] Success with proxy ${i + 1}, content length: ${txt.length}`);
                    return txt;
                }
            } else {
                // console.log(`[PROXY] Proxy ${i + 1} failed with status: ${res?.status}`);
            }
        } catch (error) {
            // console.log(`[PROXY] Proxy ${i + 1} error: ${error.message}`);
        }
    }
    
    // console.log(`[PROXY] All proxies failed for: ${url}`);
    return null;
}

// Fetch JSON from URL using CORS proxy (for APIs that don't support CORS)
async function getProxiedJSON(url) {
    // console.log(`[PROXY] Attempting to fetch JSON: ${url}`);
    
    // First, try direct fetch (in case CORS is actually working)
    try {
        const directRes = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (directRes && directRes.ok) {
            const json = await directRes.json();
            if (json && !json.error) {
                return json;
            }
        }
    } catch (error) {
        // Direct fetch failed, continue to proxies
    }
    
    // Updated proxy list - removed broken ones (cors-anywhere.herokuapp.com, thingproxy.freeboard.io)
    // Using only known working proxies with fallbacks
    const proxies = [
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://cors.bridged.cc/${u}`,
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        // Additional fallback: try allorigins with get method
        (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&callback=`
    ];
    
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        try {
            const proxied = proxy(url);
            // console.log(`[PROXY] Trying proxy ${i + 1}: ${proxied}`);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const res = await fetch(proxied, { 
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (res && res.ok) {
                const text = await res.text();
                if (text && text.length > 0) {
                    // Check if we got an error page instead of actual content
                    if (text.includes('403 Forbidden') || text.includes('Access denied') || text.includes('HTTP ERROR') || text.includes('CORS') || text.includes('Rate limit')) {
                        // console.log(`[PROXY] Proxy ${i + 1} returned error page, trying next...`);
                        continue;
                    }
                    
                    try {
                        let json;
                        // Handle allorigins get method which wraps in callback
                        if (proxied.includes('api.allorigins.win/get')) {
                            // allorigins get returns JSONP-like format, extract content
                            const match = text.match(/^[^(]*\((.+)\);?\s*$/);
                            if (match) {
                                json = JSON.parse(match[1]);
                                // allorigins wraps the response in a 'contents' field
                                if (json && json.contents) {
                                    json = JSON.parse(json.contents);
                                }
                            } else {
                                json = JSON.parse(text);
                            }
                        } else {
                            json = JSON.parse(text);
                        }
                        
                        // Basic check to ensure it's not an error page disguised as JSON
                        if (json && !json.error && !json.message?.includes('Access denied') && !json.message?.includes('Forbidden')) {
                            // console.log(`[PROXY] Success with proxy ${i + 1}, parsed JSON`);
                            return json;
                        }
                        // If it's an error JSON, try next proxy
                        // console.log(`[PROXY] Proxy ${i + 1} returned error JSON, trying next...`);
                        continue;
                    } catch (parseError) {
                        // If it's not valid JSON, try next proxy
                        // console.log(`[PROXY] Proxy ${i + 1} returned non-JSON, trying next...`);
                        continue;
                    }
                }
            } else {
                // console.log(`[PROXY] Proxy ${i + 1} failed with status: ${res?.status}`);
            }
        } catch (error) {
            // Handle timeout and other errors gracefully
            if (error.name === 'AbortError') {
                // console.log(`[PROXY] Proxy ${i + 1} timed out, trying next...`);
            } else {
                // console.log(`[PROXY] Proxy ${i + 1} error: ${error.message}`);
            }
        }
    }
    
    // console.log(`[PROXY] All proxies failed for: ${url}`);
    throw new Error('All proxies failed to fetch JSON data.');
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







// Update portfolio display - IMPROVED: Better error handling
function updatePortfolioDisplay() {
    const portfolioGrid = document.getElementById('portfolioGrid');
    if (!portfolioGrid) {
        console.error('Portfolio grid element not found');
        return;
    }
    
    // Show loading state if no data
    if (!portfolioData || portfolioData.length === 0) {
        if (typeof showLoading === 'function') {
            showLoading(portfolioGrid, 'Loading portfolio data...');
        } else {
            portfolioGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading portfolio data...</p></div>';
        }
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
        { cls: 'portfolio-sector', key: 'marketCap', label: 'Mkt\nCap' }, // \n = line break
        { cls: 'portfolio-first-buy', key: 'firstBuy', label: 'First\nBuy' }, // \n = line break
        { cls: 'portfolio-last-buy', key: 'lastBuy', label: 'Last\nBuy' }, // \n = line break
        { cls: 'portfolio-fwd-rev-cagr', key: 'fwdRevCagr', label: 'Fwd Rev\nCAGR' }, // \n = line break
        { cls: 'portfolio-shares', key: null, label: '' },
        { cls: 'portfolio-cost', key: null, label: '' },
        { cls: 'portfolio-value', key: null, label: '' },
        { cls: 'portfolio-pe2026', key: 'pe2026', label: "2026 P/E" },
        { cls: 'portfolio-pfcf2026', key: 'pfcf2026', label: "2026\nP/FCF" }, // \n = line break
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
            html += `<div class="${h.cls} sortable" data-column="${h.key}"><span class="header-text">${h.label}</span>${sortIcon(h.key)}</div>`;
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
                <div class="portfolio-sector">${item.marketCap ? item.marketCap.toLocaleString() : '-'}</div>
                <div class="portfolio-first-buy">${item.firstBuy || '-'}</div>
                <div class="portfolio-last-buy">${item.lastBuy || '-'}</div>
                <div class="portfolio-fwd-rev-cagr">${item.fwdRevCagr ? item.fwdRevCagr.toFixed(1) + '%' : '-'}</div>
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
                    <div class="portfolio-symbol">Cash</div>
                    <div class="portfolio-name">Cash Balance</div>
                </div>
                <div class="portfolio-price"></div>
                <div class="portfolio-return"></div>
                <div class="portfolio-sector"></div>
                <div class="portfolio-first-buy"></div>
                <div class="portfolio-last-buy"></div>
                <div class="portfolio-fwd-rev-cagr"></div>
                <div class="portfolio-shares"></div>
                <div class="portfolio-cost"></div>
                <div class="portfolio-value">$${cashBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="portfolio-pe2026"></div>
                <div class="portfolio-pfcf2026"></div>
                <div class="portfolio-weight">${cashWeight.toFixed(1)}%</div>
            </div>`;
    }

    portfolioGrid.innerHTML = html;
    
    // Clean up old event listeners before adding new ones (prevent memory leaks)
    const oldSortables = portfolioGrid.querySelectorAll('.sortable[data-listener-attached]');
    oldSortables.forEach(el => {
        el.removeAttribute('data-listener-attached');
    });

    // Add event listeners with cleanup tracking
    portfolioGrid.querySelectorAll('.sortable').forEach(el => {
        el.setAttribute('data-listener-attached', 'true');
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

// Display watchlist data
function displayWatchlist() {
    // Watchlist display debugging removed for cleaner console output
    const portfolioGrid = document.getElementById('portfolioGrid');
    if (!portfolioGrid) {

        return;
    }
    

    if (!watchlistData || watchlistData.length === 0) {

        portfolioGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading watchlist data...</p></div>';
        return;
    }
    
    // Sort the data if a sort column is selected (same approach as Portfolio)
    let sortedData = watchlistData;
    if (watchlistSortColumn) {
        sortedData = sortWatchlistData(watchlistData, watchlistSortColumn, watchlistSortDirection);
    }
    
    let html = `
        <div class="portfolio-item">
            <div class="portfolio-logo"></div>
            <div>
                <div class="portfolio-symbol sortable" data-column="symbol">Symbol ${getWatchlistSortIcon('symbol')}</div>
            </div>
            <div class="portfolio-price sortable" data-column="price">Price ${getWatchlistSortIcon('price')}</div>
            <div class="portfolio-return sortable" data-column="changePct">Change % ${getWatchlistSortIcon('changePct')}</div>
            <div class="portfolio-sector sortable" data-column="marketCap">Mkt\nCap ${getWatchlistSortIcon('marketCap')}</div>
            <div class="portfolio-first-buy sortable" data-column="oneMonthChange">1M\nChange % ${getWatchlistSortIcon('oneMonthChange')}</div>
            <div class="portfolio-last-buy sortable" data-column="ytdChange">YTD\nChange % ${getWatchlistSortIcon('ytdChange')}</div>
            <div class="portfolio-shares"></div>
            <div class="portfolio-cost"></div>
            <div class="portfolio-pe2026-watchlist sortable" data-column="pe2026">2026 P/E ${getWatchlistSortIcon('pe2026')}</div>
            <div class="portfolio-pe2026 sortable" data-column="pfcf2026">2026\nP/FCF ${getWatchlistSortIcon('pfcf2026')}</div>
            <div class="portfolio-pfcf2026 sortable" data-column="fwdRevCagr">Fwd Rev\nCAGR ${getWatchlistSortIcon('fwdRevCagr')}</div>
            <div class="portfolio-weight sortable" data-column="peg">PEG ${getWatchlistSortIcon('peg')}</div>
        </div>`;
    
    sortedData.forEach(item => {
        const logoHtml = item.logoUrl ? `<img src="${item.logoUrl}" alt="${item.symbol}" />` : item.symbol;
        const changeClass = item.changePct >= 0 ? 'positive' : 'negative';
        const oneMonthClass = item.oneMonthChange !== null ? (item.oneMonthChange >= 0 ? 'positive' : 'negative') : '';
        const ytdClass = item.ytdChange !== null ? (item.ytdChange >= 0 ? 'positive' : 'negative') : '';
        
        html += `
            <div class="portfolio-item">
                <div class="portfolio-logo">${logoHtml}</div>
                <div>
                    <div class="portfolio-symbol">${item.symbol}</div>
                    <div class="portfolio-name">${item.name}</div>
                </div>
                <div class="portfolio-price">$${item.price ? item.price.toFixed(2) : '-'}</div>
                <div class="portfolio-return ${changeClass}">${item.changePct ? item.changePct.toFixed(1) + '%' : '-'}</div>
                <div class="portfolio-sector">${item.marketCap ? item.marketCap.toLocaleString() : '-'}</div>
                <div class="portfolio-first-buy ${oneMonthClass}">${item.oneMonthChange !== null ? item.oneMonthChange.toFixed(1) + '%' : '-'}</div>
                <div class="portfolio-last-buy ${ytdClass}">${item.ytdChange !== null ? item.ytdChange.toFixed(1) + '%' : '-'}</div>
                <div class="portfolio-shares"></div>
                <div class="portfolio-cost"></div>
                <div class="portfolio-pe2026-watchlist">${item.pe2026 ? item.pe2026.toFixed(1) + 'x' : '-'}</div>
                <div class="portfolio-pe2026">${item.pfcf2026 ? item.pfcf2026.toFixed(1) + 'x' : '-'}</div>
                <div class="portfolio-pfcf2026">${item.fwdRevCagr ? item.fwdRevCagr.toFixed(1) + '%' : '-'}</div>
                <div class="portfolio-weight">${item.peg ? item.peg.toFixed(1) + 'x' : '-'}</div>
            </div>`;
    });
    
    portfolioGrid.innerHTML = html;
    
    // Clean up old event listeners (prevent memory leaks)
    const oldSortables = portfolioGrid.querySelectorAll('.sortable[data-listener-attached]');
    oldSortables.forEach(el => {
        el.removeAttribute('data-listener-attached');
    });
    
    // Add event listeners for sorting with cleanup tracking
    portfolioGrid.querySelectorAll('.sortable').forEach(el => {
        el.setAttribute('data-listener-attached', 'true');
        el.addEventListener('click', () => {
            const column = el.getAttribute('data-column');
            if (watchlistSortColumn === column) {
                watchlistSortDirection = watchlistSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                watchlistSortColumn = column;
                watchlistSortDirection = 'asc';
            }
            displayWatchlist();
        });
    });
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
    
            // Dynamic performance display - YTD if available, FCF if not
        const topPerformersContainer = document.getElementById('topPerformers');
        if (topPerformersContainer && portfolioData.length > 0) {

            // Check if YTD data is available (not all null)
            const stocksWithYTD = portfolioData.filter(item => item.ytdGain !== null && item.ytdGain !== undefined && item.symbol !== 'CASH');
            const hasYTDData = stocksWithYTD.length > 1; // Need more than just SEZL
            
            let html = '';
            let sectionTitle = '';
            
            if (hasYTDData) {
                // Use YTD data
                sectionTitle = 'YTD Top Performers';
                const topYTD = stocksWithYTD
                    .sort((a, b) => parseFloat(b.ytdGain) - parseFloat(a.ytdGain))
                    .slice(0, 3);
                
                topYTD.forEach(item => {
                    const ytdValue = parseFloat(item.ytdGain);
                    html += `
                        <div class="performer-item">
                            <span class="performer-symbol">${item.symbol}</span>
                            <span class="performer-return ${ytdValue >= 0 ? 'positive' : 'negative'}">${ytdValue >= 0 ? '+' : ''}${ytdValue.toFixed(1)}%</span>
                        </div>`;
                });
            } else {
                // Use FCF multiples
                sectionTitle = 'Highest FCF Multiples';
                const stocksWithFCF = portfolioData
                    .filter(item => item.fcfMultiple !== null && item.fcfMultiple !== undefined && item.symbol !== 'CASH')
                    .sort((a, b) => parseFloat(b.fcfMultiple) - parseFloat(a.fcfMultiple))
                    .slice(0, 3);
                
                if (stocksWithFCF.length > 0) {
                    stocksWithFCF.forEach(item => {
                        const fcfValue = parseFloat(item.fcfMultiple);
                        html += `
                            <div class="performer-item">
                                <span class="performer-symbol">${item.symbol}</span>
                                <span class="performer-return">${fcfValue.toFixed(1)}x</span>
                            </div>`;
                    });
                } else {
                    // Fallback to total return
                    sectionTitle = 'Top Performers';
                    const topPerformers = portfolioData
                        .filter(item => item.symbol !== 'CASH')
                        .sort((a, b) => b.return - a.return)
                        .slice(0, 3);
                    
                    topPerformers.forEach(item => {
                        html += `
                            <div class="performer-item">
                                <span class="performer-symbol">${item.symbol}</span>
                                <span class="performer-return ${item.return >= 0 ? 'positive' : 'negative'}">${item.return >= 0 ? '+' : ''}${item.return.toFixed(1)}%</span>
                            </div>`;
                    });
                }
            }
            
            // Update title dynamically
            const titleElement = topPerformersContainer.previousElementSibling;
            if (titleElement && titleElement.tagName === 'H3') {
                titleElement.textContent = sectionTitle;
            }
            
            topPerformersContainer.innerHTML = html;
        }
        
        // Dynamic performance display - YTD if available, FCF if not
        const topLaggardsContainer = document.getElementById('topLaggards');
        if (topLaggardsContainer && portfolioData.length > 0) {
            // Check if YTD data is available (not all null)
            const stocksWithYTD = portfolioData.filter(item => item.ytdGain !== null && item.ytdGain !== undefined && item.symbol !== 'CASH');
            const hasYTDData = stocksWithYTD.length > 1; // Need more than just SEZL
            
            let html = '';
            let sectionTitle = '';
            
            if (hasYTDData) {
                // Use YTD data
                sectionTitle = 'YTD Top Laggards';
                const bottomYTD = stocksWithYTD
                    .sort((a, b) => parseFloat(a.ytdGain) - parseFloat(b.ytdGain))
                    .slice(0, 3);
                
                bottomYTD.forEach(item => {
                    const ytdValue = parseFloat(item.ytdGain);
                    html += `
                        <div class="performer-item">
                            <span class="performer-symbol">${item.symbol}</span>
                            <span class="performer-return ${ytdValue >= 0 ? 'positive' : 'negative'}">${ytdValue >= 0 ? '+' : ''}${ytdValue.toFixed(1)}%</span>
                        </div>`;
                });
            } else {
                // Use FCF multiples
                sectionTitle = 'Lowest FCF Multiples';
                const stocksWithFCF = portfolioData
                    .filter(item => item.fcfMultiple !== null && item.fcfMultiple !== undefined && item.symbol !== 'CASH')
                    .sort((a, b) => parseFloat(a.fcfMultiple) - parseFloat(b.fcfMultiple))
                    .slice(0, 3);
                
                if (stocksWithFCF.length > 0) {
                    stocksWithFCF.forEach(item => {
                        const fcfValue = parseFloat(item.fcfMultiple);
                        html += `
                            <div class="performer-item">
                                <span class="performer-symbol">${item.symbol}</span>
                                <span class="performer-return">${fcfValue.toFixed(1)}x</span>
                            </div>`;
                    });
                } else {
                    // Fallback to total return
                    sectionTitle = 'Top Laggards';
                    const topLaggards = portfolioData
                        .filter(item => item.symbol !== 'CASH')
                        .sort((a, b) => a.return - b.return)
                        .slice(0, 3);
                    
                    topLaggards.forEach(item => {
                        html += `
                            <div class="performer-item">
                                <span class="performer-symbol">${item.symbol}</span>
                                <span class="performer-return ${item.return >= 0 ? 'positive' : 'negative'}">${item.return >= 0 ? '+' : ''}${item.return.toFixed(1)}%</span>
                            </div>`;
                    });
                }
            }
            
            // Update title dynamically
            const titleElement = topLaggardsContainer.previousElementSibling;
            if (titleElement && titleElement.tagName === 'H3') {
                titleElement.textContent = sectionTitle;
            }
            
            topLaggardsContainer.innerHTML = html;
        }
}

// Update portfolio multiples
function updatePortfolioMultiples() {
    const fcfMultipleElement = document.getElementById('fcfMultiple');
    const peMultipleElement = document.getElementById('peMultiple');
    const pegMultipleElement = document.getElementById('pegMultiple');
    
    if (fcfMultipleElement && peMultipleElement && pegMultipleElement) {
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
        
        // Calculate weighted average P/E/G multiple using weight percentages
        let weightedPEG = 0;
        let pegWeightSum = 0;
        
        portfolioItems.forEach(item => {
            if (item.peg > 0 && item.weight > 0) {
                const weightDecimal = item.weight / 100; // Convert percentage to decimal
                weightedPEG += item.peg * weightDecimal;
                pegWeightSum += weightDecimal;
            }
        });
        
        fcfMultipleElement.textContent = fcfWeightSum > 0 ? `${weightedFCF.toFixed(1)}x` : '-';
        peMultipleElement.textContent = peWeightSum > 0 ? `${weightedPE.toFixed(1)}x` : '-';
        pegMultipleElement.textContent = pegWeightSum > 0 ? `${weightedPEG.toFixed(2)}x` : '-';
    }
}

// Global variables for chart - using state object (declared above)
// consolidatedChart and currentView are aliased from state above

// Function to create the consolidated pie chart - OPTIMIZED: Prevents unnecessary re-renders
function updateConsolidatedChart(view = 'company') {
    console.log('[DEBUG] updateConsolidatedChart called with view:', view);
    
    const ctx = document.getElementById('consolidatedPieChart');
    if (!ctx) {
        console.error('[DEBUG] Could not find consolidatedPieChart canvas element');
        return;
    }
    
    console.log('[DEBUG] Found canvas element, current chart exists:', !!state.consolidatedChart);

    // Update state view
    state.currentView = view;
    currentView = view;

    // Update title based on view
    const titleElement = document.getElementById('allocationTitle');
    if (titleElement) {
        titleElement.textContent = view === 'company' ? 'Portfolio Allocation' : 'Sector Allocation';
    }

    let chartData = [];
    let customColors = [];

    console.log('[DEBUG] Processing view:', view);
    console.log('[DEBUG] portfolioData length:', portfolioData?.length || 0);

    if (view === 'company') {
        console.log('[DEBUG] Processing company view');
        // Company view - Portfolio Allocation
        chartData.push(...portfolioData.filter(item => item.weight > 0));
        
        // Add cash to the chart data if it exists
        if (cashBalance > 0) {
            const totalPortfolioValue = portfolioData.reduce((sum, item) => {
                const itemValue = item.shares * (item.price || 0);
                return sum + itemValue;
            }, 0) + cashBalance;
            
            const cashWeight = (cashBalance / totalPortfolioValue) * 100;
            
            chartData.push({
                            symbol: 'Cash',
            weight: cashWeight,
            name: 'Cash Balance'
            });
        }
        
        // Sort by weight (descending)
        chartData.sort((a, b) => b.weight - a.weight);

        // Modern color palette for companies
        const modernColors = [
            '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6',
            '#06B6D4', '#84CC16', '#F97316', '#EF4444', '#14B8A6',
            '#F43F5E', '#A855F7', '#0EA5E9', '#22C55E', '#EAB308'
        ];

        // Create custom colors array with green for cash
        customColors = chartData.map((item, index) => {
                    if (item.symbol === 'Cash') {
            return '#22C55E'; // Green for cash
        }
            return modernColors[index % modernColors.length];
        });
    } else {
        // Sector view - Sector Allocation
        console.log('[DEBUG] Processing sector view');
        const sectorData = {};
        
        // Group portfolio items by sector
        portfolioData.forEach(item => {
            if (item.weight > 0 && item.sector) {
                if (!sectorData[item.sector]) {
                    sectorData[item.sector] = 0;
                }
                sectorData[item.sector] += item.weight;
            }
        });
        
        console.log('[DEBUG] Sector data after grouping:', sectorData);
        
        // Add cash as a sector if it exists
        if (cashBalance > 0) {
            const totalPortfolioValue = portfolioData.reduce((sum, item) => {
                const itemValue = item.shares * (item.price || 0);
                return sum + itemValue;
            }, 0) + cashBalance;
            
            const cashWeight = (cashBalance / totalPortfolioValue) * 100;
            sectorData['Cash'] = cashWeight;
        }
        
        // Convert to array format
        chartData = Object.entries(sectorData).map(([sector, weight]) => ({
            symbol: sector,
            weight: weight
        }));
        
        console.log('[DEBUG] Chart data before sorting:', chartData);
        
        // Sort by weight (descending)
        chartData.sort((a, b) => b.weight - a.weight);
        
        console.log('[DEBUG] Chart data after sorting:', chartData);

        // Sector color mapping
        const sectorColorMap = {
            'Technology': '#6366F1', // Indigo
            'Software': '#EF4444', // Red
            'Healthcare': '#EC4899', // Pink
            'Financial Services': '#10B981', // Emerald
            'Consumer Discretionary': '#F59E0B', // Amber
            'Communication Services': '#8B5CF6', // Violet
            'Semiconductors': '#EAB308', // Yellow
            'Industrials': '#06B6D4', // Cyan
            'Energy': '#84CC16', // Lime
            'Consumer Staples': '#F97316', // Orange
            'Real Estate': '#EF4444', // Red
            'Materials': '#14B8A6', // Teal
            'Utilities': '#F43F5E', // Rose
            'Other': '#F43F5E', // Rose - Other
            'Cash': '#22C55E'  // Green - Cash
        };

        // Create custom colors array with proper sector mapping
        customColors = chartData.map((item) => {
            return sectorColorMap[item.symbol] || '#6366F1'; // Default to indigo if sector not found
        });
    }

    if (chartData.length === 0) {
        console.warn('[DEBUG] No chart data to display for view:', view);
        return;
    }
    
    console.log('[DEBUG] Final chartData length:', chartData.length);
    console.log('[DEBUG] Final chartData:', chartData);

    const data = {
        labels: chartData.map(item => {
            if (view === 'company') {
                // Use company name instead of ticker symbol for company view
                return item.companyName || item.name || item.symbol;
            }
            return item.symbol;
        }),
        datasets: [{
            data: chartData.map(item => item.weight),
            backgroundColor: customColors,
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverBorderWidth: 6,
            hoverOffset: 15
        }]
    };

    const isMobile = window.innerWidth <= 768;
    
    // Register datalabels plugin
    if (typeof ChartDataLabels !== 'undefined' && !Chart.registry.plugins.get('datalabels')) {
        Chart.register(ChartDataLabels);
    }
    
    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            layout: {
                padding: {
                    top: isMobile ? 80 : (view === 'company' ? 40 : 50),
                    bottom: isMobile ? 30 : 50,
                    left: 15,
                    right: 15
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: { enabled: false },
                datalabels: {
                    display: false, // Hide text labels, use logo callouts instead
                    color: '#111827',
                    formatter: (v, ctx) => {
                        const percent = `${Number(v).toFixed(1)}%`;
                        if (view === 'sector') {
                            const label = (ctx.chart.data.labels[ctx.dataIndex] || '').replace('Consumer Discretionary','Cons Disc').replace('Communication Services','Internet').replace('Semiconductors','Semis');
                            return `${label}\n${percent}`;
                        }
                        // Company view: company name on first line, percent on second
                        const companyName = ctx.chart.data.labels[ctx.dataIndex] || '';
                        return `${companyName}\n${percent}`;
                    },
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderColor: (ctx) => {
                        const bg = ctx.dataset.backgroundColor;
                        return Array.isArray(bg) ? bg[ctx.dataIndex] : bg;
                    },
                    borderWidth: 2,
                    borderRadius: 10,
                    padding: isMobile ? {top:4,right:6,bottom:4,left:6} : {top:6,right:8,bottom:6,left:8},
                    font: {
                        family: 'Inter',
                        size: isMobile ? 10 : 12,
                        weight: '700'
                    },
                    align: 'end',
                    anchor: 'end',
                    offset: (ctx) => {
                        const mobile = window.innerWidth <= 768;
                        return mobile ? 6 : 12;
                    },
                    clamp: true,
                    clip: false
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
    if (state.consolidatedChart) {
        console.log('[DEBUG] Destroying existing chart');
        if (!state.consolidatedChart.destroyed) {
            state.consolidatedChart.destroy();
        } else {
            console.log('[DEBUG] Chart already destroyed');
        }
    } else {
        console.log('[DEBUG] No existing chart to destroy');
    }

    // Create new chart
    console.log('[DEBUG] Creating new chart with config:', {
        labels: config.data.labels.length,
        datasets: config.data.datasets.length,
        view: view
    });
    state.consolidatedChart = new Chart(ctx, config);
    consolidatedChart = state.consolidatedChart; // Update alias
    console.log('[DEBUG] Chart created successfully');
    
    // Create callouts for both company and sector views
    // Use requestAnimationFrame for better performance than setTimeout
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            createChartCallouts(chartData, customColors, view === 'sector');
            forceBranchStyling();
        });
    });
    
    // Set up toggle buttons after chart is created
    setupToggleButtons();
}

// Function to handle toggle button clicks for allocation chart
function handleToggleClick(view) {
    console.log('[DEBUG] handleToggleClick called with view:', view);
    
    if (!view || (view !== 'company' && view !== 'sector')) {
        console.error('[DEBUG] Invalid view:', view);
        return;
    }
    
    console.log('[DEBUG] Current state.currentView:', state.currentView);
    console.log('[DEBUG] Current state.consolidatedChart exists:', !!state.consolidatedChart);
    
    state.currentView = view;
    currentView = view; // Update alias
    
    // Update active button state - only for allocation toggle buttons
    const allocationToggle = document.querySelector('.allocation-toggle');
    if (allocationToggle) {
        console.log('[DEBUG] Found allocation-toggle, updating buttons');
        allocationToggle.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = allocationToggle.querySelector(`[data-view="${view}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            console.log('[DEBUG] Activated button for view:', view);
        } else {
            console.error('[DEBUG] Could not find button with data-view:', view);
        }
    } else {
        console.error('[DEBUG] Could not find .allocation-toggle element');
    }
    
    // Update chart
    console.log('[DEBUG] Calling updateConsolidatedChart with view:', view);
    updateConsolidatedChart(view);
}

// Unified function to create chart callouts for both company and sector views
function createChartCallouts(chartData, colors, isSectorView = false) {
    // Both company and sector views use the same chart container
    const chartContainer = document.querySelector('.allocation-chart');
    if (!chartContainer) {
        return;
    }
    
    // Define isMobile early for use throughout the function
    const isMobile = window.innerWidth <= 768;

    // Remove existing callouts and branches
    const existingCallouts = chartContainer.querySelectorAll('.chart-callout, .chart-branch');
    existingCallouts.forEach(element => element.remove());

    // Get the actual canvas element for accurate dimensions
    const canvas = chartContainer.querySelector('canvas');
    if (!canvas) {
        return; // Canvas not ready yet, will retry
    }
    
    const canvasRect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(chartContainer);
    const transform = computedStyle.transform;
    let scaleX = 1, scaleY = 1;
    
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        scaleX = matrix.a;
        scaleY = matrix.d;
    }
    
    // Try to get the actual chart center from Chart.js if available
    let chartCenterX, chartCenterY;
    
    if (state.consolidatedChart && state.consolidatedChart.chartArea) {
        // Use Chart.js's actual chart area center, but adjust for container position
        const chartArea = state.consolidatedChart.chartArea;
        const containerRect = chartContainer.getBoundingClientRect();
        
        // Chart.js coordinates are already the visual coordinates (after CSS scaling)
        // We should use them directly without additional scaling compensation
        chartCenterX = (chartArea.left + chartArea.right) / 2;
        chartCenterY = (chartArea.top + chartArea.bottom) / 2;
        

    } else {
        // Fallback to canvas-based calculation
        chartCenterX = (canvasRect.width / scaleX) / 2;
        chartCenterY = (canvasRect.height / scaleY) / 2;
    }
    

    
    if (canvasRect.width === 0 || canvasRect.height === 0) {
        // Retry after chart is fully rendered - use requestAnimationFrame for better performance
        let retries = 0;
        const maxRetries = 10;
        const checkAndRetry = () => {
            const canvas = chartContainer.querySelector('canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    createChartCallouts(chartData, colors, isSectorView);
                } else if (retries < maxRetries) {
                    retries++;
                    requestAnimationFrame(checkAndRetry);
                }
            }
        };
        requestAnimationFrame(checkAndRetry);
        return;
    }
    
    // Filter items that should have callouts
    const weightThreshold = window.innerWidth <= 768 ? 4.0 : 2.95;
    const calloutItems = chartData.filter(item => item.weight > weightThreshold);
    
    // Calculate positions based on actual pie slice angles
    const totalWeight = chartData.reduce((sum, item) => sum + item.weight, 0);
    const baseRadius = Math.min(chartCenterX, chartCenterY) * (isMobile ? 0.55 : 0.6);
    const baseCalloutRadius = Math.min(chartCenterX, chartCenterY) * (isMobile ? 0.7 : 1.03);
    


    // Calculate initial callout positions
    const calloutPositions = [];
    calloutItems.forEach((item, index) => {
        const itemIndex = chartData.findIndex(chartItem => chartItem.symbol === item.symbol);
        let sliceStartAngle = -90;
        
        for (let i = 0; i < itemIndex; i++) {
            const sliceWeight = chartData[i].weight;
            const sliceAngle = (sliceWeight / totalWeight) * 360;
            sliceStartAngle += sliceAngle;
        }
        
        const sliceWeight = item.weight;
        const sliceAngle = (sliceWeight / totalWeight) * 360;
        const midAngle = sliceStartAngle + (sliceAngle / 2);
        const angleRad = (midAngle * Math.PI) / 180;
        
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
    const adjustedPositions = adjustCalloutPositions(calloutPositions, chartCenterX, chartCenterY, baseRadius, baseCalloutRadius);

    // Create callouts with adjusted positions - OPTIMIZED: Cache color lookups
    const colorIndexMap = new Map();
    chartData.forEach((item, idx) => {
        colorIndexMap.set(item.symbol, idx);
    });
    
    adjustedPositions.forEach((position, index) => {
        const { item, angle, angleRad, x, y, adjustedRadius, needsBentBranch, finalX, finalY } = position;
        
        // Cache color index lookup
        const colorIndex = colorIndexMap.get(item.symbol) ?? chartData.indexOf(item);
        const itemColor = colors[colorIndex];
        
        // Calculate branch start position
        const branchStartX = chartCenterX + Math.cos(angleRad) * baseRadius;
        const branchStartY = chartCenterY + Math.sin(angleRad) * baseRadius;

        // Create connecting branch (hide on mobile)
        let branch = null;
        if (!isMobile) {
            branch = document.createElement('div');
            branch.className = 'chart-branch';
            
            if (needsBentBranch) {
                const branchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                branchSvg.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 5;
                `;
                
                const branchEndX = finalX;
                const branchEndY = finalY;
                const controlX = branchStartX + (branchEndX - branchStartX) * 0.5;
                const controlY = branchStartY + (branchEndY - branchStartY) * 0.5;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${branchStartX} ${branchStartY} Q ${controlX} ${controlY} ${branchEndX} ${branchEndY}`);
                path.setAttribute('stroke', itemColor);
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('opacity', '0.8');
                
                branchSvg.appendChild(path);
                branch.appendChild(branchSvg);
            } else {
                branch.style.cssText = `
                    position: absolute;
                    left: ${branchStartX}px;
                    top: ${branchStartY}px;
                    width: ${adjustedRadius - baseRadius}px;
                    height: 2px;
                    background: linear-gradient(90deg, ${itemColor}, ${itemColor}80);
                    transform-origin: left center;
                    transform: rotate(${angle}deg);
                    z-index: 5;
                `;
            }
            
            chartContainer.appendChild(branch);
        }

        // Create callout element
        const callout = document.createElement('div');
        callout.className = 'chart-callout';
        callout.style.cssText = `
            position: absolute;
            left: ${finalX}px;
            top: ${finalY}px;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid ${itemColor}40;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 10px;
            font-weight: 600;
            color: #1f2937;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(8px);
            z-index: 10;
            min-width: 56px;
            min-height: 56px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        // Add content to callout
        const percent = `${Number(item.weight).toFixed(1)}%`;
        let label;
        if (isSectorView) {
            label = item.symbol.replace('Consumer Discretionary','Cons Disc').replace('Communication Services','Internet').replace('Semiconductors','Semis');
            
            // Create container for sector text and percentage
            const sectorText = document.createElement('div');
            sectorText.textContent = label;
            sectorText.style.cssText = `
                font-weight: 600;
                font-size: 11px;
                margin-bottom: 2px;
            `;
            callout.appendChild(sectorText);
            
            const percentText = document.createElement('div');
            percentText.textContent = percent;
            percentText.style.cssText = `
                font-size: 12px;
                color: #666;
            `;
            callout.appendChild(percentText);
        } else {
            // Company view - add logo if available
            let logoUrl = logosData[item.symbol];
            
            // Special handling for Cash
            if (item.symbol === 'Cash' && !logoUrl) {
                logoUrl = logosData['CASH'] || logosData['Cash'];
            }
            
            if (logoUrl) {
                const img = document.createElement('img');
                img.src = logoUrl;
                img.alt = item.symbol;
                img.style.cssText = `
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    display: block;
                `;
                callout.appendChild(img);
            } else if (item.symbol === 'Cash') {
                // Fallback for Cash - use emoji if no logo
                const cashEmoji = document.createElement('span');
                cashEmoji.textContent = '💵';
                cashEmoji.style.cssText = `
                    font-size: 20px;
                    margin-bottom: 4px;
                    display: block;
                `;
                callout.appendChild(cashEmoji);
            }
            
            // Add percentage text below logo
            const percentText = document.createElement('div');
            percentText.textContent = percent;
            percentText.style.cssText = `
                font-size: 12px;
                color: #666;
            `;
            callout.appendChild(percentText);
        }

        // Add hover effect
        callout.addEventListener('mouseenter', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1.1)';
            callout.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 20px rgba(0, 0, 0, 0.1)`;
            if (branch && !needsBentBranch) {
                branch.style.background = itemColor;
            }
        });

        callout.addEventListener('mouseleave', () => {
            callout.style.transform = 'translate(-50%, -50%) scale(1)';
            callout.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)`;
            if (branch && !needsBentBranch) {
                branch.style.background = `linear-gradient(90deg, ${itemColor}, ${itemColor}80)`;
            }
        });

        // Append to container
        chartContainer.appendChild(callout);
    });
}

// Function to create sector allocation callouts (wrapper for unified function)
function createSectorCallouts(chartData, colors) {
    createChartCallouts(chartData, colors, true);
}

// Old duplicate function removed - using unified createChartCallouts instead

// Simple callout positioning - OPTIMIZED: Direct calculation without unnecessary iterations
function adjustCalloutPositions(positions, chartCenterX, chartCenterY, baseRadius, baseCalloutRadius) {
    // Use the passed baseCalloutRadius - no need to recalculate
    const calloutRadius = baseCalloutRadius;
    
    // Map positions directly - more efficient than loop with array mutation
    return positions.map(current => {
        const x = chartCenterX + Math.cos(current.angleRad) * calloutRadius;
        const y = chartCenterY + Math.sin(current.angleRad) * calloutRadius;
        
        return {
            ...current,
            finalX: x,
            finalY: y,
            adjustedRadius: calloutRadius,
            needsBentBranch: false
        };
    });
}

// No legend function - we're not using legends

// Function to create a legend for smaller holdings
function createChartLegend(container, chartData, colors, calloutItems) {
    // Remove existing legend
    const existingLegend = container.querySelector('.chart-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    // Find items that don't have callouts
    const calloutSymbols = calloutItems.map(item => item.symbol);
    const legendItems = chartData.filter(item => !calloutSymbols.includes(item.symbol) && item.weight > 0.5);
    
    if (legendItems.length === 0) return;
    
    // Create legend container
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        max-width: 300px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 15;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    `;
    
    // Create legend title
    const legendTitle = document.createElement('div');
    legendTitle.textContent = 'Other Holdings';
    legendTitle.style.cssText = `
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 8px;
    `;
    legend.appendChild(legendTitle);
    
    // Create legend items
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12px;
        `;
        
        const colorDot = document.createElement('div');
        colorDot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${colors[chartData.indexOf(item)]};
            margin-right: 8px;
            flex-shrink: 0;
        `;
        
        const symbol = document.createElement('span');
        symbol.textContent = item.symbol;
        symbol.style.cssText = `
            font-weight: 600;
            color: #1f2937;
            flex: 1;
        `;
        
        const weight = document.createElement('span');
        weight.textContent = `${item.weight.toFixed(1)}%`;
        weight.style.cssText = `
            color: #6b7280;
            font-weight: 500;
        `;
        
        legendItem.appendChild(colorDot);
        legendItem.appendChild(symbol);
        legendItem.appendChild(weight);
        legend.appendChild(legendItem);
    });
    
    container.appendChild(legend);
}

// Old createAllocationCallouts function removed - using unified createChartCallouts instead

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

// Unified sorting function - DRY: Used by both portfolio and watchlist
function sortData(data, column, direction) {
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

// Sort portfolio data - uses unified function
function sortPortfolioData(data, column, direction) {
    return sortData(data, column, direction);
}

// Force branch styling after chart creation - OPTIMIZED: Uses requestAnimationFrame
function forceBranchStyling() {
    requestAnimationFrame(() => {
        const chartContainer = document.querySelector('.allocation-chart');
        if (chartContainer) {
            const branches = chartContainer.querySelectorAll('.chart-branch');
            branches.forEach(branch => {
                branch.style.setProperty('height', '1px', 'important');
                branch.style.setProperty('opacity', '0.6', 'important');
                branch.style.setProperty('max-width', '25px', 'important');
                branch.style.setProperty('width', '25px', 'important');
                
                // Fix SVG paths
                const svgPaths = branch.querySelectorAll('path');
                svgPaths.forEach(path => {
                    path.setAttribute('stroke-width', '1');
                    path.setAttribute('opacity', '0.6');
                });
            });
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
            // console.log('Contact form submitted');
        });
    }
    




}

// Switch between Portfolio and Watchlist views
function switchView(view) {

    currentPortfolioView = view;
    
    // Update toggle button states
    document.querySelectorAll('.portfolio-toggle .toggle-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === view) {
            btn.classList.add('active');
        }
    });
    
    // Update section title
    updateSectionTitle(view);
    
    // Display the appropriate view
    if (view === 'watchlist') {

        displayWatchlist();
    } else {

        updatePortfolioDisplay();
    }
}

// Update section title based on current view
function updateSectionTitle(view) {
    const sectionTitle = document.querySelector('#portfolio .section-title');
    if (sectionTitle) {
        sectionTitle.textContent = view === 'watchlist' ? 'Watchlist' : 'Portfolio';
    }
}

// Function to set up toggle button event listeners - FIXED: Proper cleanup and allocation-specific
function setupToggleButtons() {
    console.log('[DEBUG] setupToggleButtons called');
    // Only set up buttons for allocation section, not portfolio section
    const allocationToggle = document.querySelector('.allocation-toggle');
    if (!allocationToggle) {
        console.error('[DEBUG] Could not find .allocation-toggle element');
        return;
    }
    
    const toggleButtons = allocationToggle.querySelectorAll('.toggle-btn');
    console.log('[DEBUG] Found', toggleButtons.length, 'toggle buttons');
    
    // Remove existing event listeners to prevent duplicates and memory leaks
    toggleButtons.forEach((button, index) => {
        console.log(`[DEBUG] Setting up button ${index + 1}, data-view:`, button.getAttribute('data-view'));
        // Clone node to remove all listeners (more reliable than removeEventListener)
        if (button.hasAttribute('data-listener-attached')) {
            console.log(`[DEBUG] Button ${index + 1} already has listener, cloning to remove old one`);
            const newButton = button.cloneNode(true);
            button.parentNode?.replaceChild(newButton, button);
            newButton.setAttribute('data-listener-attached', 'true');
            newButton.addEventListener('click', handleToggleButtonClick);
            console.log(`[DEBUG] Button ${index + 1} listener reattached`);
        } else {
            button.setAttribute('data-listener-attached', 'true');
            button.addEventListener('click', handleToggleButtonClick);
            console.log(`[DEBUG] Button ${index + 1} listener attached`);
        }
    });
    console.log('[DEBUG] setupToggleButtons completed');
}

// Function to handle toggle button click events
function handleToggleButtonClick() {
    const view = this.getAttribute('data-view');
    console.log('[DEBUG] handleToggleButtonClick - button clicked, data-view:', view);
    console.log('[DEBUG] Button element:', this);
    console.log('[DEBUG] Closest .portfolio-toggle:', this.closest('.portfolio-toggle'));
    console.log('[DEBUG] Closest .allocation-toggle:', this.closest('.allocation-toggle'));
    
    if (!view) {
        console.error('[DEBUG] No data-view attribute found on button');
        return;
    }
    
    // Check if this is a portfolio/watchlist toggle (not pie chart toggle)
    if (this.closest('.portfolio-toggle')) {
        console.log('[DEBUG] This is a portfolio toggle, calling switchView');
        switchView(view);
    } else if (this.closest('.allocation-toggle')) {
        // This is a pie chart toggle button
        console.log('[DEBUG] This is an allocation toggle, calling handleToggleClick');
        handleToggleClick(view);
    } else {
        console.error('[DEBUG] Button is not in .portfolio-toggle or .allocation-toggle');
    }
}

// Sample data for fallback
const SAMPLE_PORTFOLIO_DATA = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stocks', shares: 100, price: 175.50, value: 17550.00, return: 12.5, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stocks', shares: 50, price: 320.25, value: 16012.50, return: 8.3, sector: 'Technology' }
];
