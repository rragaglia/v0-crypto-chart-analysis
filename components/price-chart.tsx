"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricePoint, EmaData, EmaCrossover } from "@/lib/ema";
import { formatPrice } from "@/lib/ema";

interface PriceChartProps {
  pricePoints: PricePoint[];
  emas: EmaData[];
  coinName: string;
  crossovers?: EmaCrossover[];
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  price: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
}

// ─── Custom crossover marker ──────────────────────────────────────────────────
// Renders a small circle at the EMA intersection + a compact label tag offset
// upward (bullish) or downward (bearish) so it doesn't overlap the lines.

interface MarkerProps {
  cx?: number;
  cy?: number;
  isBullish?: boolean;
  fastPeriod?: number;
  slowPeriod?: number;
  index?: number; // 0 = most recent, 1 = older — drives opacity
}

function CrossoverMarker({
  cx = 0,
  cy = 0,
  isBullish = true,
  fastPeriod = 20,
  slowPeriod = 50,
  index = 0,
}: MarkerProps) {
  const color = isBullish ? "#22c55e" : "#ef4444";
  // Most recent cross is solid; older cross is more transparent
  const opacity = index === 0 ? 1 : 0.55;
  const labelText = `${fastPeriod}/${slowPeriod}`;
  // Offset label above for bullish, below for bearish
  const labelOffsetY = isBullish ? -18 : 18;
  const arrowChar = isBullish ? "↑" : "↓";

  return (
    <g opacity={opacity} style={{ pointerEvents: "none" }}>
      {/* Outer glow ring — very subtle */}
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill={color}
        fillOpacity={0.08}
        stroke="none"
      />
      {/* Main circle */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Vertical connecting line from circle to label */}
      <line
        x1={cx}
        y1={isBullish ? cy - 5 : cy + 5}
        x2={cx}
        y2={isBullish ? cy + labelOffsetY + 7 : cy + labelOffsetY - 7}
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.6}
      />
      {/* Label pill background */}
      <rect
        x={cx - 20}
        y={isBullish ? cy + labelOffsetY - 8 : cy + labelOffsetY - 8}
        width={40}
        height={16}
        rx={5}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />
      {/* Label text: arrow + period pair */}
      <text
        x={cx}
        y={isBullish ? cy + labelOffsetY + 3.5 : cy + labelOffsetY + 3.5}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={600}
        fill={color}
        fontFamily="monospace"
      >
        {arrowChar} {labelText}
      </text>
    </g>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceChart({
  pricePoints,
  emas,
  coinName,
  crossovers = [],
}: PriceChartProps) {

  // Build emaMap: period → (timestamp → value)
  const emaMap = useMemo(() => {
    const map: Record<number, Map<number, number>> = {};
    emas.forEach((ema) => {
      const m = new Map<number, number>();
      ema.values.forEach((v) => m.set(v.timestamp, v.value));
      map[ema.period] = m;
    });
    return map;
  }, [emas]);

  // Build chart data (includes timestamp for crossover lookup)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return pricePoints.map((point) => {
      const entry: ChartDataPoint = {
        date: point.date,
        timestamp: point.timestamp,
        price: point.price,
      };
      if (emaMap[20]?.get(point.timestamp))  entry.ema20  = emaMap[20].get(point.timestamp);
      if (emaMap[50]?.get(point.timestamp))  entry.ema50  = emaMap[50].get(point.timestamp);
      if (emaMap[100]?.get(point.timestamp)) entry.ema100 = emaMap[100].get(point.timestamp);
      if (emaMap[200]?.get(point.timestamp)) entry.ema200 = emaMap[200].get(point.timestamp);
      return entry;
    });
  }, [pricePoints, emaMap]);

  // Resolve each crossover to a {date, y} coordinate usable by ReferenceDot
  // x = date string of closest pricePoint
  // y = average of the two EMA values at that point (= where they actually cross)
  const crossoverMarkers = useMemo(() => {
    if (!crossovers.length || !chartData.length) return [];

    return crossovers.map((cross, index) => {
      // Find the chartData entry closest to this timestamp
      let closest = chartData[0];
      let minDiff = Math.abs(chartData[0].timestamp - cross.timestamp);
      for (const pt of chartData) {
        const diff = Math.abs(pt.timestamp - cross.timestamp);
        if (diff < minDiff) { minDiff = diff; closest = pt; }
      }

      // y = midpoint of the two crossing EMAs at that point (falls right on the cross)
      const fastVal = emaMap[cross.fastPeriod]?.get(closest.timestamp);
      const slowVal = emaMap[cross.slowPeriod]?.get(closest.timestamp);
      const y = fastVal !== undefined && slowVal !== undefined
        ? (fastVal + slowVal) / 2
        : closest.price;

      return {
        date: closest.date,
        y,
        isBullish: cross.direction === "bullish",
        fastPeriod: cross.fastPeriod,
        slowPeriod: cross.slowPeriod,
        index, // 0 = most recent, 1 = older
      };
    });
  }, [crossovers, chartData, emaMap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {coinName} - Precio vs EMAs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(0.25 0.005 260)" }}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(0.25 0.005 260)" }}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`
                }
                domain={["auto", "auto"]}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.17 0.005 260)",
                  border: "1px solid oklch(0.25 0.005 260)",
                  borderRadius: "8px",
                  color: "oklch(0.95 0 0)",
                  fontSize: "13px",
                }}
                formatter={(value: number, name: string) => [
                  formatPrice(value),
                  name === "price" ? "Precio" : name.toUpperCase().replace("EMA", "EMA "),
                ]}
                labelStyle={{ color: "oklch(0.6 0 0)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    price: "Precio",
                    ema20: "EMA 20",
                    ema50: "EMA 50",
                    ema100: "EMA 100",
                    ema200: "EMA 200",
                  };
                  return labels[value] || value;
                }}
              />

              {/* Lines */}
              <Line type="monotone" dataKey="price"  stroke="oklch(0.95 0 0)"      strokeWidth={2}   dot={false} name="price"  />
              <Line type="monotone" dataKey="ema20"  stroke="oklch(0.72 0.19 165)" strokeWidth={1.5} dot={false} name="ema20"  />
              <Line type="monotone" dataKey="ema50"  stroke="oklch(0.7 0.15 250)"  strokeWidth={1.5} dot={false} name="ema50"  />
              <Line type="monotone" dataKey="ema100" stroke="oklch(0.75 0.18 55)"  strokeWidth={1.5} dot={false} name="ema100" />
              <Line type="monotone" dataKey="ema200" stroke="oklch(0.65 0.2 25)"   strokeWidth={1.5} dot={false} name="ema200" />

              {/* Crossover markers — rendered on top of lines */}
              {crossoverMarkers.map((m, i) => (
                <ReferenceDot
                  key={i}
                  x={m.date}
                  y={m.y}
                  r={0}
                  shape={
                    <CrossoverMarker
                      isBullish={m.isBullish}
                      fastPeriod={m.fastPeriod}
                      slowPeriod={m.slowPeriod}
                      index={m.index}
                    />
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
