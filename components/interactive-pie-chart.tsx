"use client";

import { useState, useMemo } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Sector,
  Tooltip
} from "recharts";
import { Button } from "@/components/ui/button";
import { parseNumeric } from "@/lib/utils";

interface InteractivePieChartProps {
  positionsData: any[];
  logos: Record<string, string>;
  view: "company" | "sector";
  onViewChange: (view: "company" | "sector") => void;
}

const COLORS = [
  "#6366F1", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6",
  "#06B6D4", "#84CC16", "#F97316", "#EF4444", "#14B8A6",
  "#F43F5E", "#A855F7", "#0EA5E9", "#22C55E", "#EAB308"
];

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#6366F1',
  'Software': '#EF4444',
  'Healthcare': '#EC4899',
  'Financial Services': '#10B981',
  'Consumer Discretionary': '#F59E0B',
  'Communication Services': '#8B5CF6',
  'Semiconductors': '#EAB308',
  'Industrials': '#06B6D4',
  'Energy': '#84CC16',
  'Consumer Staples': '#F97316',
  'Real Estate': '#EF4444',
  'Materials': '#14B8A6',
  'Utilities': '#F43F5E',
  'Other': '#F43F5E',
  'Cash': '#22C55E'
};

const renderFiscalLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, fill, payload, percent } = props;
  const RADIAN = Math.PI / 180;

  // 1. Calculate Vectors
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // START: Edge of the slice
  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;

  // ELBOW: Push out 50px
  const mx = cx + (outerRadius + 50) * cos;
  const my = cy + (outerRadius + 50) * sin;

  // END: The end of the visible line
  const isRightSide = cos >= 0;
  const ex = mx + (isRightSide ? 1 : -1) * 40; 
  const ey = my;

  // 2. Calculate Content Positions (The "Gap" Logic)
  const logoWidth = 22;
  const gap = 8; // Space between elements
  
  // LOGO POSITION:
  // If Right: Start after line end + gap
  // If Left: Start before line end - gap - logoWidth
  const logoX = isRightSide ? (ex + gap) : (ex - gap - logoWidth);
  const logoY = ey - 11; // Vertically centered (half of height 22)

  // TEXT POSITION:
  // If Right: Start after Logo + gap
  // If Left: Start before Logo - gap
  const textX = isRightSide ? (logoX + logoWidth + gap) : (logoX - gap);
  
  // Anchor text based on side
  const textAnchor = isRightSide ? 'start' : 'end';

  // Filter tiny slices
  if (percent < 0.02) return null;

  return (
    <g>
      {/* Connector Line */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill} 
        strokeWidth={1.5}
        fill="none"
        opacity={0.8}
      />
      
      {/* LOGO */}
      {payload.image ? (
         <image 
           href={payload.image} 
           x={logoX}
           y={logoY} 
           height={logoWidth} 
           width={logoWidth} 
           preserveAspectRatio="xMidYMid meet"
         />
      ) : (
        !payload.isOther && (
          <circle 
            cx={logoX + logoWidth / 2} 
            cy={ey} 
            r={5} 
            fill={fill} 
            fillOpacity={0.5} 
          />
        )
      )}

      {payload.isOther && (
        <g transform={`translate(${logoX}, ${logoY})`}>
          <circle cx={11} cy={11} r={11} fill="rgba(255,255,255,0.1)" />
          <text x={11} y={11} dy={4} textAnchor="middle" fill="#FFF" fontSize={14} fontWeight="bold">+</text>
        </g>
      )}

      {/* TEXT GROUP */}
      <g>
        <text
          x={textX}
          y={ey}
          textAnchor={textAnchor}
          fill="#FFF"
          fontSize={13}
          fontWeight="bold"
          dominantBaseline="middle"
          className="tracking-tight"
        >
          {payload.ticker || payload.label}
          <tspan fill="#9CA3AF" fontWeight="normal" dx={6} fontFamily="monospace">
          {`${(percent * 100).toFixed(1)}%`}
          </tspan>
        </text>
      </g>
    </g>
  );
};

const renderActiveShape = (props: any) => {
  const { 
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, 
    fill
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300"
      />
      {/* Ensure label remains visible and on top during hover */}
      {renderFiscalLabel(props)}
    </g>
  );
};

interface ChartDataItem {
  id: string;
  label: string;
  value: number;
  ticker: string | null;
  logo: string | null;
  image: string | null; // Added image field
  isOther?: boolean;
  midAngle?: number;
  labelPos?: {
    x: number;
    y: number;
    ix: number;
    iy: number;
    isRightSide: boolean;
  };
  finalY?: number;
}

export function InteractivePieChart({ positionsData, logos, view, onViewChange }: InteractivePieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const totalValue = positionsData
      .map(row => parseNumeric(row["Market Value"] || row["Value"] || "0") || 0)
      .reduce((a, b) => a + b, 0);

    let data: ChartDataItem[] = [];
    if (view === "company") {
      data = positionsData
        .map(row => {
          const ticker = (row.Ticker || row.Symbol || "").toUpperCase();
          const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
          const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
          
          if (ticker && ticker !== "CASH" && weight > 0) {
            const logoUrl = logos[ticker] || null;
            return {
              id: ticker,
              label: row.Name || row.Company || ticker,
              value: weight,
              ticker,
              logo: logoUrl,
              image: logoUrl, // Added image field as requested
            } as ChartDataItem;
          }
          return null;
        })
        .filter((item): item is ChartDataItem => item !== null);
    } else {
      const sectorMap = new Map<string, number>();
      positionsData.forEach(row => {
        const sector = row.Sector || "Other";
        const marketValue = parseNumeric(row["Market Value"] || row["Value"] || "0") || 0;
        if (marketValue > 0) {
          sectorMap.set(sector, (sectorMap.get(sector) || 0) + marketValue);
        }
      });

      data = Array.from(sectorMap.entries())
        .map(([sector, value]) => ({
          id: sector,
          label: sector,
          value: totalValue > 0 ? (value / totalValue) * 100 : 0,
          ticker: null,
          logo: null,
          image: null,
          isOther: sector === "Other" // Mark "Other" sector
        } as ChartDataItem));
    }

    // Sort descending by value
    const sortedData = data.sort((a, b) => b.value - a.value);

    // --- GROUP SMALL HOLDINGS INTO "OTHER" (Only for company view) ---
    let combinedData: ChartDataItem[] = [];
    if (view === "company") {
      const threshold = 2.5;
      const largeHoldings = sortedData.filter(d => d.value >= threshold);
      const smallHoldings = sortedData.filter(d => d.value < threshold);
      
      combinedData = [...largeHoldings];
      if (smallHoldings.length > 0) {
        combinedData.push({
          id: 'Other Holdings',
          label: `${smallHoldings.length} Other Positions`,
          ticker: 'OTHER',
          value: smallHoldings.reduce((sum, d) => sum + d.value, 0),
          logo: null,
          image: null,
          isOther: true
        });
      }
    } else {
      combinedData = [...sortedData];
    }
    
    // Sort to maintain descending order, but force "Other" to the very end
    const finalData = combinedData.sort((a, b) => {
      if (a.isOther) return 1;
      if (b.isOther) return -1;
      return b.value - a.value;
    });

    return finalData;
  }, [positionsData, logos, view]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div className="relative w-full">
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-4 justify-center relative z-20">
        <Button
          variant={view === "company" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("company")}
          className={cn(
            "relative",
            view === "company" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-700 text-slate-400"
          )}
        >
          Holdings
        </Button>
        <Button
          variant={view === "sector" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("sector")}
          className={cn(
            "relative",
            view === "sector" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-700 text-slate-400"
          )}
        >
          Sector
        </Button>
      </div>

      {/* Chart Container */}
      <div className="w-full h-[500px] md:h-[800px] flex items-center justify-center min-h-0 min-w-0 outline-none select-none touch-none relative z-10" style={{ WebkitTapHighlightColor: 'transparent' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={0}>
          <PieChart 
            margin={{ top: 0, left: 50, right: 50, bottom: 0 }}
            style={{ outline: 'none' }}
            tabIndex={-1}
          >
            <Pie
              {...({
                activeIndex,
                activeShape: renderActiveShape,
                data: chartData,
                cx: "50%",
                cy: "50%",
                innerRadius: "37%",
                outerRadius: "65%",
                fill: "#8884d8",
                dataKey: "value",
                onMouseEnter: onPieEnter,
                onMouseLeave: onPieLeave,
                stroke: "#0f172a",
                strokeWidth: 3,
                paddingAngle: 2,
                label: renderFiscalLabel,
                labelLine: false,
                animationBegin: 0,
                animationDuration: 400,
                startAngle: 90,
                endAngle: -270,
                isAnimationActive: false,
                tabIndex: -1 // Disable focus on pie slices
              } as any)}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={view === "sector" ? (SECTOR_COLORS[entry.id] || COLORS[index % COLORS.length]) : COLORS[index % COLORS.length]} 
                  className="transition-all duration-200 cursor-pointer outline-none border-none focus:ring-0 focus:outline-none active:outline-none"
                  style={{ outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
