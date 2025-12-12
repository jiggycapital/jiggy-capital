// TypeScript interfaces for portfolio data

export interface PortfolioRow {
  [key: string]: string | number | null | undefined;
  Ticker?: string;
  Company?: string;
  Sector?: string;
  "Market Cap"?: string;
  "YTD Gain"?: string;
  "1 Day % Chg"?: string;
  // Add more fields as needed - these will be dynamically typed based on sheet columns
}

export interface PortfolioData {
  positions: PortfolioRow[];
  watchlist: PortfolioRow[];
}

export interface ChartDataPoint {
  year: string;
  revenue?: number;
  ebitda?: number;
  fcf?: number;
  [key: string]: string | number | undefined;
}

export interface StockDetail {
  ticker: string;
  company: string;
  sector?: string;
  data: PortfolioRow;
  revenueHistory: ChartDataPoint[];
  profitabilityHistory: ChartDataPoint[];
  valuationMetrics: {
    currentPE?: number;
    pe2026?: number;
    historicalAvgPE?: number;
  };
}

