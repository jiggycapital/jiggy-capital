// Financial data sheets integration
// Multi-sheet Google Sheet with time-series financial data per company

const FINANCIAL_SHEET_ID = "12uA_P1wwGopW-hd9twllHEJ5D0zhrvPx";

// Sheets to ignore
const IGNORED_SHEETS = ["Blank", "HyperScalers"];

export interface FinancialDataPoint {
  quarter: string;
  value: number | null;
}

export interface FinancialMetric {
  metric: string;
  data: FinancialDataPoint[];
}

export interface CompanyFinancialData {
  companyName: string;
  metrics: FinancialMetric[];
}

export type MetricCategory = "universal" | "segment" | "company-specific";

export interface MetricCategoryInfo {
  metric: string;
  category: MetricCategory;
  companyCount: number; // How many companies have this metric
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get all sheet names from the spreadsheet
// Note: Google Sheets API would be better, but we'll use a workaround
// For now, we'll need to manually specify sheet names or fetch them differently
export async function fetchCompanySheetNames(): Promise<string[]> {
  // Since we can't easily get sheet names via CSV export,
  // we'll need to maintain a list or use a different approach
  // For now, return common company names that might be in the sheet
  // This should be updated based on actual sheet names
  
  // Common company names from the user's description
  const commonCompanies = [
    "Reddit", "Comfort Systems", "IESC", "Modine", "Nvidia", "Broadcom",
    "ServiceNow", "HubSpot", "Datadog", "Amazon", "Google", "Microsoft",
    "Toast", "Monday", "Klaviyo", "Procore", "Atlassian", "Freshworks",
    "GitLab", "Zscaler", "Cloudflare", "Salesforce", "Snowflake", "MongoDB",
    "Rubrik", "Marvell", "Crowdstrike", "Okta", "AppFolio", "Workday",
    "Intuit", "Autodesk", "SentinelOne", "Braze", "Insulet", "BellRing",
    "KLAC", "Chipotle", "Eli Lilly", "theTradeDesk", "TradeWeb", "MSCI",
    "AMD", "Lam Research", "Astera Labs", "DutchBros", "Texas Roadhouse",
    "FirstWatch", "DexCom", "MasterCard", "DigitalOcean", "Elastic",
    "Twilio", "Robinhood"
  ];
  
  return commonCompanies;
}

// Retry with exponential backoff for rate limiting
async function fetchWithRetry(
  url: string,
  sheetName: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      });
      
      // If we get a 429, wait and retry
      if (response.status === 429) {
        const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
        console.warn(`Rate limited for ${sheetName}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed to fetch ${sheetName} after ${maxRetries} attempts`);
}

// Fetch a specific sheet by name using Google Sheets CSV export
export async function fetchCompanySheet(sheetName: string): Promise<string[][]> {
  const cacheKey = `financial-sheet-${sheetName}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Google Sheets CSV export with sheet name
  // Using the gviz API with sheet parameter
  const encodedSheetName = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${FINANCIAL_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedSheetName}`;
  
  try {
    const response = await fetchWithRetry(url, sheetName);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet ${sheetName}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Check if we got an error response
    if (csvText.includes('error') || csvText.includes('Error')) {
      throw new Error(`Sheet ${sheetName} not found or inaccessible`);
    }
    
    const rows = parseCSV(csvText);
    
    cache.set(cacheKey, { data: rows, timestamp: Date.now() });
    return rows;
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    throw error;
  }
}

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n').filter(line => line.trim());
  const rows: string[][] = [];
  
  for (const line of lines) {
    const values = parseCSVLine(line);
    rows.push(values);
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

// Parse financial data from sheet rows
// Structure: Row 1 = headers (quarters), Row 2+ = metrics with values
export function parseFinancialSheet(rows: string[][], companyName: string): CompanyFinancialData {
  if (rows.length < 2) {
    return { companyName, metrics: [] };
  }

  // First row contains quarters (skip "Metric" column)
  const quarters = rows[0].slice(1).map(q => q.trim().replace(/^"|"$/g, ''));
  
  const metrics: FinancialMetric[] = [];
  
  // Process each metric row (starting from row 2, index 1)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const metricName = (row[0] || '').trim().replace(/^"|"$/g, '');
    
    // Skip empty rows or rows without metric name
    if (!metricName || metricName === '') {
      continue;
    }
    
    // Skip summary rows
    if (metricName.toLowerCase().includes('total') && i > 10) {
      continue;
    }
    
    const dataPoints: FinancialDataPoint[] = [];
    
    // Process each quarter value
    for (let j = 0; j < quarters.length; j++) {
      const quarter = quarters[j];
      if (!quarter || quarter === '') continue;
      
      const valueStr = (row[j + 1] || '').trim().replace(/^"|"$/g, '');
      const value = parseFinancialValue(valueStr);
      
      dataPoints.push({
        quarter,
        value,
      });
    }
    
    if (dataPoints.length > 0) {
      metrics.push({
        metric: metricName,
        data: dataPoints,
      });
    }
  }
  
  return {
    companyName,
    metrics,
  };
}

// Parse financial value (handles currency, percentages, negatives, etc.)
function parseFinancialValue(valueStr: string): number | null {
  if (!valueStr || valueStr === '' || valueStr === '-' || valueStr === '#DIV/0!' || valueStr === '#N/A') {
    return null;
  }
  
  // Remove currency symbols, commas, spaces
  let cleaned = valueStr
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle negative values in parentheses: (100) = -100
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return null;
  }
  
  return isNegative ? -num : num;
}

// Batch processing helper - process items in batches with delay
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processor: (item: T) => Promise<R | null>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect successful results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    });
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// Fetch all company financial data with rate limiting
export async function fetchAllCompanyData(): Promise<CompanyFinancialData[]> {
  const companyNames = await fetchCompanySheetNames();
  
  // Process in batches of 5 with 200ms delay between batches to avoid rate limits
  const allData = await processInBatches(
    companyNames,
    5, // Batch size
    200, // Delay between batches (ms)
    async (companyName) => {
      try {
        const rows = await fetchCompanySheet(companyName);
        const data = parseFinancialSheet(rows, companyName);
        return data;
      } catch (error) {
        console.warn(`Failed to fetch data for ${companyName}:`, error);
        return null;
      }
    }
  );
  
  return allData;
}

// Get unique metrics across all companies
export function getAllMetrics(companies: CompanyFinancialData[]): string[] {
  const metricSet = new Set<string>();
  
  companies.forEach(company => {
    company.metrics.forEach(metric => {
      metricSet.add(metric.metric);
    });
  });
  
  return Array.from(metricSet).sort();
}

// Get unique quarters across all companies
export function getAllQuarters(companies: CompanyFinancialData[]): string[] {
  const quarterSet = new Set<string>();
  
  companies.forEach(company => {
    company.metrics.forEach(metric => {
      metric.data.forEach(point => {
        if (point.quarter) {
          quarterSet.add(point.quarter);
        }
      });
    });
  });
  
  return Array.from(quarterSet).sort((a, b) => {
    // Sort quarters: Q1 23, Q2 23, Q3 23, Q4 23, Q1 24, etc.
    const parseQuarter = (q: string) => {
      const match = q.match(/Q(\d)\s+(\d{2})/);
      if (match) {
        const quarter = parseInt(match[1]);
        const year = parseInt(match[2]);
        return year * 4 + quarter;
      }
      return 0;
    };
    
    return parseQuarter(a) - parseQuarter(b);
  });
}

// Segment-specific metric patterns (metrics that appear in specific industry segments)
const SEGMENT_METRIC_PATTERNS = [
  /arr|annual recurring revenue/i,
  /deferred revenue/i,
  /rpo|remaining performance obligation/i,
  /bookings/i,
  /billings/i,
  /subscription.*revenue/i,
  /services.*revenue/i,
  /saas.*revenue/i,
  /customer.*count/i,
  /large.*customer/i,
  /enterprise.*customer/i,
  /net.*retention/i,
  /dollar.*retention/i,
  /nrr|net revenue retention/i,
  /dollar-based net retention/i,
];

// Categorize metrics based on how many companies have them
export function categorizeMetrics(companies: CompanyFinancialData[]): MetricCategoryInfo[] {
  const metricCounts = new Map<string, number>();
  const totalCompanies = companies.length;
  
  // Count how many companies have each metric
  companies.forEach(company => {
    const companyMetrics = new Set<string>();
    company.metrics.forEach(metric => {
      companyMetrics.add(metric.metric);
    });
    
    companyMetrics.forEach(metric => {
      metricCounts.set(metric, (metricCounts.get(metric) || 0) + 1);
    });
  });
  
  // Categorize each metric
  const categorized: MetricCategoryInfo[] = [];
  
  metricCounts.forEach((count, metric) => {
    let category: MetricCategory;
    
    // Check if it's a segment-specific metric by pattern matching
    const isSegmentMetric = SEGMENT_METRIC_PATTERNS.some(pattern => pattern.test(metric));
    
    if (count >= 5) {
      // Universal if 5+ companies have it (unless it's a known segment metric)
      if (isSegmentMetric && count < totalCompanies * 0.8) {
        // Segment-specific: appears in multiple companies but not universal
        category = "segment";
      } else {
        // Universal: appears in 5+ companies and is common
        category = "universal";
      }
    } else {
      // Company-specific: appears in fewer than 5 companies
      category = "company-specific";
    }
    
    categorized.push({
      metric,
      category,
      companyCount: count,
    });
  });
  
  return categorized.sort((a, b) => {
    // Sort by category (universal first, then segment, then company-specific)
    const categoryOrder = { "universal": 0, "segment": 1, "company-specific": 2 };
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    
    // Then sort by metric name
    return a.metric.localeCompare(b.metric);
  });
}

// Get metrics by category
export function getMetricsByCategory(
  companies: CompanyFinancialData[],
  category: MetricCategory
): string[] {
  const categorized = categorizeMetrics(companies);
  return categorized
    .filter(info => info.category === category)
    .map(info => info.metric);
}

