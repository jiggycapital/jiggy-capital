// ============================================================================
// JIGGY CAPITAL PORTFOLIO - RESTORED VERSION
// ============================================================================

// Google Sheets Integration Configuration
const GOOGLE_SHEETS_CONFIG = {
    portfolioSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1871140253',
    logosSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1789448141',
    performanceSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=721839254',
    eventsSheetUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1789448141'
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
        portfolioData = await updatePortfolioPrices(portfolioData);

        // Update displays
        console.log('Updating displays...');
        updateHeroStats();
        updatePortfolioDisplay();
        updatePerformanceDisplay();
        updateAllocationChart();
        updateSectorChart();
        
        // Fetch upcoming events
        console.log('Fetching upcoming events...');
        await fetchUpcomingEvents();
        updateEventsDisplay();
        
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

// Fetch real-time price from Yahoo Finance (with basic fallback mapping)
async function fetchStockPrice(symbol) {
    try {
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        let response;
        try {
            response = await fetch(apiUrl);
        } catch (_) {
            const fallbackPrices = {
                'NTDOY': 24.43, 'NVDA': 180.45, 'AVGO': 306.34, 'FIX': 680.86, 'RDDT': 246.50,
                'AMZN': 231.03, 'DDOG': 127.25, 'NOW': 867.24, 'CRM': 242.44, 'HUBS': 439.37,
                'GTLB': 44.28, 'GOOGL': 203.90, 'MRVL': 76.19, 'AJG': 292.72, 'MNDY': 175.74,
                'TEAM': 167.00, 'SEZL': 91.87, 'TOST': 43.15, 'TER': 109.42, 'ELF': 116.37
            };
            return fallbackPrices[symbol] || 100;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        const price = result?.meta?.regularMarketPrice || result?.meta?.previousClose;
        return price || 0;
    } catch (e) {
        return 0;
    }
}

// Update portfolio with fetched prices and compute returns/weights
async function updatePortfolioPrices(items) {
    const updated = [];
    for (const it of items) {
        if (!it.symbol || it.symbol === 'Cash' || it.symbol === 'CASH') { updated.push(it); continue; }
        const price = await fetchStockPrice(it.symbol);
        const shares = toNumber(it.shares);
        const avg = toNumber(it.avgCost);
        const existingCost = toNumber(it.costBasis);
        const value = (price || 0) * shares;
        const calcCostBasis = avg * shares;
        const usedCostBasis = calcCostBasis > 0 ? calcCostBasis : (it.costBasis || 0);
        const retPct = (usedCostBasis > 0) ? ((value - usedCostBasis) / usedCostBasis) * 100 : 0;
        updated.push({ ...it, price: price || 0, shares, avgCost: avg, value, costBasis: usedCostBasis, return: retPct });
        await new Promise(r => setTimeout(r, 100));
    }
    const totalValue = updated.reduce((s, x) => s + (x.value || 0), 0) + cashBalance;
    return updated.map(x => ({ ...x, weight: totalValue > 0 ? ((x.value || 0) / totalValue) * 100 : 0 }));
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
            name: (r[1] || '').trim(),         // B
            firstBuy: (r[4] || '').trim(),     // E
            lastBuy: (r[5] || '').trim(),      // F
            sector: (r[7] || '').trim(),       // H
            shares: toNumber(r[13]),           // N
            avgCost: toNumber(r[14]),          // O
            costBasis: toNumber(r[15]),        // P
            changePct: toNumber(r[21]),        // V
            pe2026: toNumber(r[36]) || null,   // AK
            pfcf2026: toNumber(r[37]) || null  // AL
        };
        // derived placeholders; real-time price and value computed later
        item.price = 0;
        item.value = item.shares * item.price;
        // return % calculated from market value vs cost basis later
        item.return = 0;
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
        if (companyName && !data[`${symbol}_name`]) data[`${symbol}_name`] = companyName;
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
    const suffixes = [
        ', Inc.', ' Inc.', ', Incorporated', ' Incorporated', ', LLC', ' LLC', ', Ltd.', ' Ltd.', ', Limited', ' Limited',
        ', Co.', ' Co.', ', Corp.', ' Corp.', ', Corporation', ' Corporation', ', PLC', ' PLC', ', S.A.', ' S.A.'
    ];
    let cleaned = companyName.trim();
    for (const s of suffixes) {
        if (cleaned.endsWith(s)) cleaned = cleaned.slice(0, -s.length);
    }
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

// Fetch upcoming events from IR pages
async function fetchUpcomingEvents() {
    console.log('Fetching upcoming events from IR pages...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cache = loadEventsCache();
    const updatesForCache = {};
    
    for (const event of eventsData) {
        if (!event.irUrl) continue;
        
        try {
            // Serve from cache if fresh (6h TTL)
            const cached = cache[event.ticker];
            const nowMs = Date.now();
            const ttlMs = 6 * 60 * 60 * 1000;
            if (cached && Array.isArray(cached.events) && (nowMs - cached.fetchedAt) < ttlMs) {
                event.upcomingEvents = cached.events.filter(ev => {
                    const d = parseDate(ev.date);
                    return d && d >= today;
                });
                if (event.upcomingEvents.length > 0) {
                    console.log(`[${event.ticker}] Using cached ${event.upcomingEvents.length} events`);
                    continue;
                }
            }

            console.log(`Fetching events for ${event.ticker} from ${event.irUrl}`);
            const html = await getProxiedHTML(event.irUrl);
            if (!html) continue;
            console.log(`[${event.ticker}] HTML length: ${html.length}`);

            // Try script-based extraction first (Q4/JS data), then HTML text fallback
            let extractedEvents = extractEventsFromScripts(html, event);
            if (!extractedEvents || extractedEvents.length === 0) {
                extractedEvents = extractEventsFromHTML(html, event);
            }

            const futureEvents = (extractedEvents || []).filter(ev => {
                if (!ev.date) return false;
                const d = parseDate(ev.date);
                return d && d >= today;
            });

            if (futureEvents.length > 0) {
                console.log(`[${event.ticker}] Found ${futureEvents.length} future events`);
                event.upcomingEvents = futureEvents;
                updatesForCache[event.ticker] = { events: futureEvents, fetchedAt: nowMs };
            }
    } catch (error) {
            console.error(`Error fetching events for ${event.ticker}:`, error);
        }
    }

    // Persist cache updates
    if (Object.keys(updatesForCache).length > 0) {
        saveEventsCache({ ...cache, ...updatesForCache });
    }
}

// Extract events from HTML with enhanced patterns
function extractEventsFromHTML(html, eventInfo) {
    const events = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const text = (doc.body && doc.body.textContent) ? doc.body.textContent : html;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Company configs
    const COMPANY_CONFIGS = {
        'MRVL': { maxConsecutiveOldEvents: 15, dateAboveEvent: true },
        'DDOG': { maxConsecutiveOldEvents: 15, dateAboveEvent: false },
        'NVDA': { maxConsecutiveOldEvents: 8,  dateAboveEvent: true },
        'CRM' : { maxConsecutiveOldEvents: 10, dateAboveEvent: true },
        'TER' : { maxConsecutiveOldEvents: 5,  dateAboveEvent: false }
    };
    const cfg = COMPANY_CONFIGS[eventInfo.ticker] || { maxConsecutiveOldEvents: 10, dateAboveEvent: false };

    // Patterns
    const eventPatterns = [
        /Q[1-4]\s+\d{4}\s+Earnings\s+Call/gi,
        /Earnings\s+Call\s+Q[1-4]\s+\d{4}/gi,
        /Q[1-4]\s+\d{4}\s+(Results|Earnings)/gi,
        /\d+(?:st|nd|rd|th)\s+Quarter\s+FY\d+\s+Financial\s+Results/gi,
        /Financial\s+Results/gi,
        /Investor\s+Day/gi,
        /Analyst\s+Day/gi,
        /Annual\s+Meeting/gi,
        /Conference\s+Call/gi
    ];
    const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
        /(\d{4})-(\d{1,2})-(\d{1,2})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/g,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2}),\s+(\d{4})/g
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
                if (d) allDates.push({ lineIndex: i, date: d, dateStr });
            }
        }
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    let consecutiveOld = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let eventName = null;
        for (const ep of eventPatterns) {
            const m = line.match(ep);
            if (m) {
                eventName = m[0];
                break;
            }
        }
        if (!eventName) continue;

        // Find closest date above or below depending on cfg
        let best = null;
        let bestDist = Infinity;
        for (const d of allDates) {
            const dist = Math.abs(d.lineIndex - i);
            if (dist < bestDist) {
                bestDist = dist;
                best = d;
            }
        }
        if (!best) continue;
        const d = best.date;
        if (!d) continue;

        if (d < today) {
            consecutiveOld++;
            if (consecutiveOld >= cfg.maxConsecutiveOldEvents) break;
            continue;
        }
        consecutiveOld = 0;

        events.push({
            name: eventName,
            date: best.dateStr,
            companyName: eventInfo.companyName,
            ticker: eventInfo.ticker
        });
    }

    return dedupeEvents(events);
}

// Attempt to extract events from embedded scripts (Q4, JSON blobs, etc.)
function extractEventsFromScripts(html, eventInfo) {
    const events = [];
    // Collect script contents
    const scriptContents = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(html)) !== null) {
        const content = m[1];
        if (!content) continue;
        // Skip big libs
        if (/function\s*\(|=>|webpackJsonp|require\(/.test(content)) continue;
        scriptContents.push(content);
    }

    const today = new Date(); today.setHours(0,0,0,0);

    // Heuristic: look for title/name and date/start fields in proximity
    const titleRe = /"(title|name)"\s*:\s*"([^"]{5,120})"/g;
    const dateRe = /"(date|startDate|start_time|start)"\s*:\s*"([^"]{6,40})"/g;

    for (const sc of scriptContents) {
        const titles = [];
        let t;
        while ((t = titleRe.exec(sc)) !== null) {
            titles.push({ key: t[1], value: t[2], index: t.index });
        }
        if (titles.length === 0) continue;

        // Find dates
        const dates = [];
        let d;
        while ((d = dateRe.exec(sc)) !== null) {
            const pd = parseDate(d[2]);
            if (pd) dates.push({ key: d[1], value: d[2], index: d.index, date: pd });
        }
        if (dates.length === 0) continue;

        // Pair each title with nearest date
        for (const title of titles) {
            let best = null; let bestDist = Infinity;
            for (const dd of dates) {
                const dist = Math.abs(dd.index - title.index);
                if (dist < bestDist) { bestDist = dist; best = dd; }
            }
            if (!best) continue;
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

    return dedupeEvents(events);
}

// Proxy fetch with fallbacks
async function getProxiedHTML(url) {
    const proxies = [
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://r.jina.ai/http://cors.isomorphic-git.org/${encodeURIComponent(u)}`,
        (u) => `https://r.jina.ai/http://r.jina.ai/http://r.jina.ai/http://` // noop fallback (will likely fail)
    ];
    for (const p of proxies) {
        try {
            const proxied = p(url);
            const res = await fetch(proxied, { method: 'GET' });
            if (res && res.ok) {
                const txt = await res.text();
                if (txt && txt.length > 0) return txt;
            }
        } catch (_) {}
    }
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
                const weightPercent = item.weight; // Use weight percentage
                weightedPE += item.pe2026 * weightPercent;
                peWeightSum += weightPercent;
            }
        });
        
        // Calculate weighted average P/FCF multiple using weight percentages
        let weightedFCF = 0;
        let fcfWeightSum = 0;
        
        portfolioItems.forEach(item => {
            if (item.pfcf2026 > 0 && item.weight > 0) {
                const weightPercent = item.weight; // Use weight percentage
                weightedFCF += item.pfcf2026 * weightPercent;
                fcfWeightSum += weightPercent;
            }
        });
        
        fcfMultipleElement.textContent = fcfWeightSum > 0 ? `${(weightedFCF / fcfWeightSum).toFixed(1)}x` : '-';
        peMultipleElement.textContent = peWeightSum > 0 ? `${(weightedPE / peWeightSum).toFixed(1)}x` : '-';
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
    
    let html = '';
    eventsData.forEach(ev => {
        if (ev.upcomingEvents && ev.upcomingEvents.length > 0) {
            ev.upcomingEvents.forEach(u => {
                const logoUrl = logosData[ev.ticker] || '';
                const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="${ev.ticker}" />` : ev.ticker;
                html += `
                    <div class="event-item">
                        <div class="event-logo">${logoHtml}</div>
                        <div class="event-info">
                            <div class="event-company">${ev.companyName || logosData[`${ev.ticker}_name`] || ev.ticker} (${ev.ticker})</div>
                            <div class="event-name">${u.name}</div>
                            <div class="event-date"><i class="far fa-calendar"></i>${u.date}</div>
                        </div>
                        ${(ev.irUrl || logosData[`${ev.ticker}_ir`]) ? `<div class="event-actions"><a class="event-link" href="${ev.irUrl || logosData[`${ev.ticker}_ir`]}" target="_blank"><i class="fas fa-external-link-alt"></i> IR Page</a></div>` : ''}
                    </div>`;
            });
        }
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
