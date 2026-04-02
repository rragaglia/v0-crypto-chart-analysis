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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricePoint, EmaData } from "@/lib/ema";
import { formatPrice } from "@/lib/ema";

interface PriceChartProps {
  pricePoints: PricePoint[];
  emas: EmaData[];
  coinName: string;
}

interface ChartDataPoint {
  date: string;
  price: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
}

export function PriceChart({ pricePoints, emas, coinName }: PriceChartProps) {
  const chartData = useMemo(() => {
    const emaMap: Record<number, Map<number, number>> = {};
    emas.forEach((ema) => {
      const map = new Map<number, number>();
      ema.values.forEach((v) => map.set(v.timestamp, v.value));
      emaMap[ema.period] = map;
    });

    return pricePoints.map((point): ChartDataPoint => {
      const entry: ChartDataPoint = { date: point.date, price: point.price };
      if (emaMap[20]?.get(point.timestamp))  entry.ema20  = emaMap[20].get(point.timestamp);
      if (emaMap[50]?.get(point.timestamp))  entry.ema50  = emaMap[50].get(point.timestamp);
      if (emaMap[100]?.get(point.timestamp)) entry.ema100 = emaMap[100].get(point.timestamp);
      if (emaMap[200]?.get(point.timestamp)) entry.ema200 = emaMap[200].get(point.timestamp);
      return entry;
    });
  }, [pricePoints, emas]);

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
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                    price: "Precio", ema20: "EMA 20", ema50: "EMA 50",
                    ema100: "EMA 100", ema200: "EMA 200",
                  };
                  return labels[value] || value;
                }}
              />
              <Line type="monotone" dataKey="price"  stroke="oklch(0.95 0 0)"      strokeWidth={2}   dot={false} name="price"  />
              <Line type="monotone" dataKey="ema20"  stroke="oklch(0.72 0.19 165)" strokeWidth={1.5} dot={false} name="ema20"  />
              <Line type="monotone" dataKey="ema50"  stroke="oklch(0.7 0.15 250)"  strokeWidth={1.5} dot={false} name="ema50"  />
              <Line type="monotone" dataKey="ema100" stroke="oklch(0.75 0.18 55)"  strokeWidth={1.5} dot={false} name="ema100" />
              <Line type="monotone" dataKey="ema200" stroke="oklch(0.65 0.2 25)"   strokeWidth={1.5} dot={false} name="ema200" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
