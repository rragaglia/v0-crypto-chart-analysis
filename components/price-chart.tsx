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

// ─── Crossover marker — pure SVG, rendered via shape function ────────────────

function renderCrossoverMarker(
  cx: number,
  cy: number,
  isBullish: boolean,
  fastPeriod: number,
  slowPeriod: number,
  isRecent: boolean   // true = most recent cross (full opacity); false = older (dimmer)
) {
  const color = isBullish ? "#22c55e" : "#ef4444";
  const opacity = isRecent ? 1 : 0.5;
  const arrow = isBullish ? "↑" : "↓";
  const label = `${arrow} ${fastPeriod}/${slowPeriod}`;
  // Place pill above for bullish, below for bearish so it doesn't overlap the cross itself
  const pillOffsetY = isBullish ? -24 : 24;
  const pillY = cy + pillOffsetY;
  const pillW = 40;
  const pillH = 15;

  return (
    <g opacity={opacity} style={{ pointerEvents: "none" }}>
      {/* Subtle glow halo */}
      <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.07} stroke="none" />
      {/* Main circle */}
      <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      {/* Stem connecting circle to label */}
      <line
        x1={cx} y1={isBullish ? cy - 5 : cy + 5}
        x2={cx} y2={isBullish ? pillY + pillH : pillY}
        stroke={color} strokeWidth={0.8} strokeOpacity={0.5}
      />
      {/* Label pill */}
      <rect
        x={cx - pillW / 2} y={pillY}
        width={pillW} height={pillH} rx={5}
        fill={color} fillOpacity={0.14}
        stroke={color} strokeWidth={0.8} strokeOpacity={0.5}
      />
      <text
        x={cx} y={pillY + 10.5}
        textAnchor="middle"
        fontSize={9.5} fontWeight={600}
        fill={color} fontFamily="monospace"
      >
        {label}
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

  // period → timestamp → ema value
  const emaMap = useMemo(() => {
    const map: Record<number, Map<number, number>> = {};
    emas.forEach((ema) => {
      const m = new Map<number, number>();
      ema.values.forEach((v) => m.set(v.timestamp, v.value));
      map[ema.period] = m;
    });
    return map;
  }, [emas]);

  // Chart data — includes timestamp so we can match crossovers
  const chartData = useMemo<ChartDataPoint[]>(() => {
    return pricePoints.map((point) => {
      const entry: ChartDataPoint = {
        date: point.date,
        timestamp: point.timestamp,
        price: point.price,
      };
      if (emaMap[20]?.get(point.timestamp)) entry.ema20 = emaMap[20].get(point.timestamp);
      if (emaMap[50]?.get(point.timestamp)) entry.ema50 = emaMap[50].get(point.timestamp);
      if (emaMap[100]?.get(point.timestamp)) entry.ema100 = emaMap[100].get(point.timestamp);
      if (emaMap[200]?.get(point.timestamp)) entry.ema200 = emaMap[200].get(point.timestamp);
      return entry;
    });
  }, [pricePoints, emaMap]);

  // Resolve each crossover to {date, timestamp (x-axis key), y (EMA intersection value)}
  const crossoverMarkers = useMemo(() => {
    if (!crossovers.length || !chartData.length) return [];

    return crossovers.map((cross, index) => {
      // Find closest chart point by timestamp
      let closest = chartData[0];
      let minDiff = Math.abs(chartData[0].timestamp - cross.timestamp);
      for (const pt of chartData) {
        const diff = Math.abs(pt.timestamp - cross.timestamp);
        if (diff < minDiff) { minDiff = diff; closest = pt; }
      }

      // y = midpoint of both EMAs at that point (= where they actually intersect)
      const fastVal = emaMap[cross.fastPeriod]?.get(closest.timestamp);
      const slowVal = emaMap[cross.slowPeriod]?.get(closest.timestamp);
      const y = fastVal !== undefined && slowVal !== undefined
        ? (fastVal + slowVal) / 2
        : closest.price;

      return {
        date: closest.date,
        timestamp: closest.timestamp, // Pasamos el timestamp para guiar al ReferenceDot
        y,
        isBullish: cross.direction === "bullish",
        fastPeriod: cross.fastPeriod,
        slowPeriod: cross.slowPeriod,
        isRecent: index === 0,   // index 0 = most recent
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
              // Extra top margin so bullish labels above chart don't clip
              margin={{ top: 28, right: 10, left: 10, bottom: 5 }}
            >
              {/* EJE X: Convertido a escala numérica basada en el Timestamp */}
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(0.25 0.005 260)" }}
                minTickGap={50}
                tickFormatter={(val: number) => {
                  // Buscamos la fecha en el array para renderizar el texto legible ("19 ene")
                  const pt = chartData.find(p => p.timestamp === val);
                  if (pt) return pt.date;
                  const d = new Date(val);
                  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
                }}
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
                // Se reemplaza el título numérico del tooltip por la fecha real
                labelFormatter={(label: number) => {
                  const pt = chartData.find(p => p.timestamp === label);
                  if (pt) return pt.date;
                  const d = new Date(label);
                  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
                }}
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

              {/* Price + EMA lines */}
              <Line type="monotone" dataKey="price" stroke="oklch(0.95 0 0)" strokeWidth={2} dot={false} name="price" />
              <Line type="monotone" dataKey="ema20" stroke="oklch(0.72 0.19 165)" strokeWidth={1.5} dot={false} name="ema20" />
              <Line type="monotone" dataKey="ema50" stroke="oklch(0.7 0.15 250)" strokeWidth={1.5} dot={false} name="ema50" />
              <Line type="monotone" dataKey="ema100" stroke="oklch(0.75 0.18 55)" strokeWidth={1.5} dot={false} name="ema100" />
              <Line type="monotone" dataKey="ema200" stroke="oklch(0.65 0.2 25)" strokeWidth={1.5} dot={false} name="ema200" />

              {/* Crossover markers. */}
              {crossoverMarkers.map((m, i) => (
                <ReferenceDot
                  key={`cross-${i}`}
                  // AHORA el punto se ancla usando el timestamp exacto
                  x={m.timestamp}
                  y={m.y}
                  r={5}
                  fill="transparent"
                  stroke="transparent"
                  ifOverflow="visible"
                  shape={(props: { cx?: number; cy?: number }) =>
                    renderCrossoverMarker(
                      props.cx ?? 0,
                      props.cy ?? 0,
                      m.isBullish,
                      m.fastPeriod,
                      m.slowPeriod,
                      m.isRecent,
                    )
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