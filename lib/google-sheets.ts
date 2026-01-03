// Google Sheets API integration
// Since we're using public sheets, we can use the CSV export method

const SHEET_IDS = {
  positionsDetailed: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || "1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE",
  watchlistDetailed: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || "1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE",
} as const;

const GIDS = {
  positionsDetailed: "1134366200",
  watchlistDetailed: "695255397",
  logosPt2: "1789448141",
  portfolio: "1871140253",
  performance: "721839254",
} as const;

export type DatasetType = "positions" | "watchlist" | "portfolio" | "performance" | "logosPt2";

export interface SheetConfig {
  sheetId: string;
  gid: string;
}

export const SHEET_CONFIGS: Record<DatasetType, SheetConfig> = {
  positions: {
    sheetId: SHEET_IDS.positionsDetailed,
    gid: GIDS.positionsDetailed,
  },
  watchlist: {
    sheetId: SHEET_IDS.watchlistDetailed,
    gid: GIDS.watchlistDetailed,
  },
  portfolio: {
    sheetId: SHEET_IDS.positionsDetailed,
    gid: GIDS.portfolio,
  },
  performance: {
    sheetId: SHEET_IDS.positionsDetailed,
    gid: GIDS.performance,
  },
  logosPt2: {
    sheetId: SHEET_IDS.positionsDetailed,
    gid: GIDS.logosPt2,
  },
};

// Separate config for logos sheet
const LOGOS_CONFIG: SheetConfig = {
  sheetId: SHEET_IDS.positionsDetailed,
  gid: GIDS.logosPt2,
};

export function getSheetUrl(config: SheetConfig): string {
  return `https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=${config.gid}`;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchSheetData(dataset: DatasetType): Promise<string[][]> {
  const cacheKey = `sheet-${dataset}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const config = SHEET_CONFIGS[dataset];
  const url = getSheetUrl(config);
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    cache.set(cacheKey, { data: rows, timestamp: Date.now() });
    return rows;
  } catch (error) {
    console.error(`Error fetching ${dataset} data:`, error);
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

export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const firstCell = rows[i][0]?.toLowerCase() || '';
    if (
      firstCell.includes('ticker') ||
      firstCell.includes('company') ||
      firstCell.includes('symbol')
    ) {
      return i;
    }
  }
  return 0;
}

export function findDataStartRow(rows: string[][], headerRow: number): number {
  for (let i = headerRow + 1; i < Math.min(headerRow + 15, rows.length); i++) {
    const firstCell = (rows[i][0] || '').trim().toLowerCase();
    if (
      !firstCell.includes('general') &&
      !firstCell.includes('information') &&
      !firstCell.includes('median') &&
      !firstCell.includes('min') &&
      !firstCell.includes('max') &&
      !firstCell.includes('sum') &&
      firstCell !== '' &&
      firstCell.length < 10
    ) {
      return i;
    }
  }
  return headerRow + 1;
}

// Extract category information from Row 1 (category row) and map to Row 2 (header row)
// Handles merged cells by propagating category names across empty cells
export function extractColumnCategories(rows: string[][]): Record<string, string> {
  const headerRowIndex = findHeaderRow(rows);
  const categoryRowIndex = headerRowIndex > 0 ? headerRowIndex - 1 : -1;
  
  const categoryMap: Record<string, string> = {};
  
  // If we have a category row, extract categories
  if (categoryRowIndex >= 0 && categoryRowIndex < rows.length) {
    const categoryRow = rows[categoryRowIndex];
    const headerRow = rows[headerRowIndex];
    
    let currentCategory = "Other";
    
    // Process each column
    // Merged cells in CSV appear as empty strings, so we propagate the last seen category
    for (let i = 0; i < Math.max(categoryRow.length, headerRow.length); i++) {
      const categoryCell = (categoryRow[i] || '').trim().replace(/^"|"$/g, '');
      const headerCell = (headerRow[i] || '').trim().replace(/^"|"$/g, '');
      
      // If category cell has content, it's a new category header (start of merged cell range)
      if (categoryCell && categoryCell.length > 0) {
        currentCategory = categoryCell;
      }
      
      // Map this column to the current category (even if category cell was empty due to merge)
      if (headerCell && headerCell.length > 0) {
        categoryMap[headerCell] = currentCategory;
      }
    }
  } else {
    // No category row, assign all columns to "Other"
    const headerRow = rows[headerRowIndex];
    headerRow.forEach(header => {
      const cleanHeader = header.trim().replace(/^"|"$/g, '');
      if (cleanHeader) {
        categoryMap[cleanHeader] = "Other";
      }
    });
  }
  
  return categoryMap;
}

export function parseSheetData(rows: string[][]): Record<string, string>[] {
  const headerRowIndex = findHeaderRow(rows);
  const headers = rows[headerRowIndex].map(h => h.trim().replace(/^"|"$/g, ''));
  const dataStartRow = findDataStartRow(rows, headerRowIndex);
  
  const data: Record<string, string>[] = [];
  
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = (row[0] || '').trim().replace(/^"|"$/g, '');
    
    // Stop at summary rows
    if (
      firstCell.toLowerCase().includes('median') ||
      firstCell.toLowerCase().includes('min') ||
      firstCell.toLowerCase().includes('max') ||
      firstCell.toLowerCase().includes('sum') ||
      firstCell === ''
    ) {
      break;
    }
    
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      let value = (row[index] || '').trim().replace(/^"|"$/g, '');
      if (value === '#N/A' || value === '#DIV/0!' || value === '#VALUE!' || value === '#REF!') {
        value = '';
      }
      record[header] = value;
    });
    
    if (record[headers[0]] && record[headers[0]].length > 0) {
      data.push(record);
    }
  }
  
  return data;
}

// Parse logos and IR links data - expects Ticker in column A (index 0), Logo in column C (index 2), and IR Link in column D (index 3)
export function parseLogosData(rows: string[][]): { logos: Record<string, string>; irLinks: Record<string, string> } {
  const logoMap: Record<string, string> = {};
  const irLinkMap: Record<string, string> = {};
  const headerRowIndex = findHeaderRow(rows);
  const dataStartRow = findDataStartRow(rows, headerRowIndex);
  
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const ticker = (row[0] || '').trim().replace(/^"|"$/g, '').toUpperCase();
    const logoUrl = (row[2] || '').trim().replace(/^"|"$/g, ''); // Column C (index 2)
    const irLink = (row[3] || '').trim().replace(/^"|"$/g, ''); // Column D (index 3)
    
    if (ticker && ticker !== '') {
      if (logoUrl && logoUrl !== '') logoMap[ticker] = logoUrl;
      if (irLink && irLink !== '') irLinkMap[ticker] = irLink;
    }
  }
  
  return { logos: logoMap, irLinks: irLinkMap };
}

export async function fetchLogos(): Promise<{ logos: Record<string, string>; irLinks: Record<string, string> }> {
  const cacheKey = 'logos';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const url = getSheetUrl(LOGOS_CONFIG);
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch logos: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const data = parseLogosData(rows);
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching logos:', error);
    return { logos: {}, irLinks: {} };
  }
}

