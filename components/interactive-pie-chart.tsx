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
import { parseNumeric, cn } from "@/lib/utils";

interface InteractivePieChartProps {
  positionsData: any[];
  logos: Record<string, string>;
  view: "company" | "sector";
  onViewChange: (view: "company" | "sector") => void;
}

const COLORS = [
  "#FF4757", // Vibrant Red
  "#FF6348", // Coral
  "#FFA502", // Orange
  "#ECCC68", // Yellow
  "#A3CB38", // Lime Green
  "#1DD1A1", // Mint Green
  "#00D2D3", // Bright Cyan
  "#01A3A4", // Teal
  "#0097E6", // Blue
  "#54A0FF", // Pastel Blue
  "#5F27CD", // Purple
  "#9C88FF", // Periwinkle
  "#D980FA", // Lavender
  "#FF9FF3", // Pink
  "#FF006E", // Magenta
  "#e84393", // Deep Rose
];

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
  const logoWidth = 36;
  const gap = 12; // Space between elements

  // LOGO POSITION:
  // If Right: Start after line end + gap
  // If Left: Start before line end - gap - logoWidth
  const logoX = isRightSide ? (ex + gap) : (ex - gap - logoWidth);
  const logoY = ey - 18; // Vertically centered (half of height 36)

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
        strokeWidth={2}
        fill="none"
        opacity={0.6}
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
            r={8}
            fill={fill}
            fillOpacity={0.5}
          />
        )
      )}

      {payload.isOther && (
        <g transform={`translate(${logoX}, ${logoY})`}>
          <circle cx={18} cy={18} r={18} fill="rgba(255,255,255,0.1)" />
          <text x={18} y={18} dy={6} textAnchor="middle" fill="#FFF" fontSize={22} fontWeight="bold">+</text>
        </g>
      )}

      {/* TEXT GROUP */}
      <g>
        <text
          x={textX}
          y={ey}
          textAnchor={textAnchor}
          fill="#FFF"
          fontSize={14}
          fontWeight="900"
          dominantBaseline="middle"
          className="tracking-tight"
        >
          {payload.ticker || payload.label}
          <tspan fill="#78e08f" fontWeight="bold" dx={6} fontFamily="monospace">
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
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        stroke="#22352f"
        strokeWidth={6}
        cornerRadius={12}
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
      <div className="flex gap-3 mb-4 justify-center relative z-20">
        <Button
          variant={view === "company" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("company")}
          className={cn(
            "relative px-6 rounded-xl font-extrabold shadow-md",
            view === "company" ? "bg-jiggy-gold hover:bg-jiggy-gold-alt text-slate-900 border-none" : "border-jiggy-border bg-jiggy-surface-2 text-slate-400 hover:text-white"
          )}
        >
          Holdings
        </Button>
        <Button
          variant={view === "sector" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("sector")}
          className={cn(
            "relative px-6 rounded-xl font-extrabold shadow-md",
            view === "sector" ? "bg-jiggy-gold hover:bg-jiggy-gold-alt text-slate-900 border-none" : "border-jiggy-border bg-jiggy-surface-2 text-slate-400 hover:text-white"
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
                innerRadius: "45%",
                outerRadius: "70%",
                fill: "#8884d8",
                dataKey: "value",
                onMouseEnter: onPieEnter,
                onMouseLeave: onPieLeave,
                stroke: "#22352f",
                strokeWidth: 6,
                paddingAngle: 0,
                cornerRadius: 12,
                label: renderFiscalLabel,
                labelLine: false,
                animationBegin: 0,
                animationDuration: 400,
                startAngle: 90,
                endAngle: -270,
                isAnimationActive: false,
                tabIndex: -1
              } as any)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
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
