import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  
  if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(1)}`;
}

// Format currency in billions (for Historical Financials, Forward Estimates, Market Cap, Enterprise Value)
export function formatCurrencyBillions(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  // Format zero as $0.0B, not as "-"
  return `$${(num / 1e9).toFixed(1)}B`;
}

// Format as multiple with "x" suffix (e.g., "28.5x")
export function formatMultiple(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num.toFixed(1)}x`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  // Always use one decimal point
  return num.toFixed(1);
}

export function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num.toFixed(1)}%`;
}

// Format date as MM/DD (e.g., "12/12")
export function formatDate(value: string | null | undefined): string {
  if (!value || value === "" || value === "-") return "-";
  
  // Try to parse various date formats
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    // If not a valid date, try to extract MM/DD from string
    const match = value.match(/(\d{1,2})\/(\d{1,2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}`;
    }
    return value; // Return as-is if can't parse
  }
  
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

export function cleanColumnName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase();
}

export function parseNumeric(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle empty strings and error values
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "#N/A" || trimmed === "#DIV/0!" || trimmed === "#VALUE!" || trimmed === "#REF!") {
    return null;
  }
  
  // Remove currency symbols, commas, spaces, percentage signs, and "x" suffix
  const cleaned = trimmed.replace(/[$,\s%xX]/g, "");
  
  // Handle negative values in parentheses: (100) = -100
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const finalCleaned = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const num = parseFloat(finalCleaned);
  if (isNaN(num)) {
    return null;
  }
  
  return isNegative ? -num : num;
}

