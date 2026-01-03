# Jiggy Capital Financial Analysis Dashboard

A professional financial visualization application built with Next.js 14+, TypeScript, and TanStack Table.

## Features

- **Home Dashboard**: Executive summary with portfolio stats, sector allocation, and top movers
- **Analyze Page**: Powerful data table with:
  - Column visibility toggling
  - Multi-column sorting
  - Global search/filtering
  - Tabs for Holdings, Watchlist, and Combined views
  - Click any row to view detailed stock analysis

- **Stock Detail View**: Side panel showing:
  - Revenue growth chart (2018-2027e)
  - Profitability margins (EBITDA vs FCF)
  - Valuation metrics (P/E comparison)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with dark mode (slate/zinc palette)
- **UI Components**: shadcn/ui
- **Table**: TanStack Table v8
- **Charts**: Recharts
- **Data**: Google Sheets API (CSV export)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Data Sources

The app fetches data from two Google Sheets:
- **Positions Detailed**: Active holdings (gid: 1134366200)
- **Watchlist Detailed**: Potential investments (gid: 695255397)

Data is cached for 5 minutes to prevent API rate limits.

## Project Structure

```
app/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home dashboard
│   ├── analyze/
│   │   └── page.tsx        # Analyze page
│   └── globals.css         # Global styles with dark theme
├── components/
│   ├── navigation.tsx      # Top navigation bar
│   ├── home-dashboard.tsx  # Home page dashboard
│   ├── analyze-table.tsx   # Main data table component
│   ├── stock-detail-sheet.tsx # Stock detail side panel
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── google-sheets.ts    # Google Sheets API integration
│   └── utils.ts            # Utility functions
└── types/
    └── portfolio.ts        # TypeScript interfaces
```

## Design Philosophy

- **Density is King**: Compact rows, minimal whitespace
- **Dark Mode First**: Professional financial terminal aesthetic
- **Monospaced Numbers**: JetBrains Mono for all financial data
- **Color Coding**: Green for gains, red for losses
- **Tooltips**: Hover interactions for additional context

## Future Enhancements

- [ ] Advanced filtering (by sector, risk level, theme)
- [ ] Saved views/presets
- [ ] Column reordering (drag-and-drop)
- [ ] Export to CSV/Excel
- [ ] More chart types (candlestick, heatmaps)
- [ ] Real-time data updates
- [ ] Custom metric calculations
