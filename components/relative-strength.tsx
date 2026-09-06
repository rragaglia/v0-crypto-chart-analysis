"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoinSelector } from "@/components/coin-selector";
import { Loader2, ArrowRightLeft } from "lucide-react";

const batchFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return data;
};

const TIMEFRAMES = [
  { value: "1h", label: "1 Hora", days: "1" },
  { value: "4h", label: "4 Horas", days: "1" },
  { value: "1d", label: "1 Día", days: "1" },
  { value: "7d", label: "7 Días", days: "7" },
  { value: "30d", label: "30 Días", days: "30" },
  { value: "180d", label: "6 Meses", days: "180" },
  { value: "365d", label: "1 Año", days: "365" },
];

export function RelativeStrength({ coins }: { coins: any[] }) {
  const [baseCoin, setBaseCoin] = useState("hyperliquid");
  const [quoteCoin, setQuoteCoin] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("30d");

  // Invertir monedas rápidamente
  const handleSwap = () => {
    setBaseCoin(quoteCoin);
    setQuoteCoin(baseCoin);
  };

  const tfConfig = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[4];

  const { data, isLoading } = useSWR(
    `/api/crypto/batch?coinIds=${baseCoin},${quoteCoin}&days=${tfConfig.days}`,
    batchFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const chartData = useMemo(() => {
    if (!data?.results || !data.results[baseCoin] || !data.results[quoteCoin]) return [];
    
    const pricesA = data.results[baseCoin].prices;
    const pricesB = data.results[quoteCoin].prices;
    
    if (!pricesA || !pricesB || pricesA.length === 0 || pricesB.length === 0) return [];

    const merged = [];
    const now = Date.now();
    
    // Filtrar por tiempo real si es 1h o 4h
    const cutoff = timeframe === "1h" ? now - 3600 * 1000 : 
                   timeframe === "4h" ? now - 4 * 3600 * 1000 : 0;

    // Sincronizar datos: por cada punto de A, buscamos el punto más cercano en B
    for (const [tsA, priceA] of pricesA) {
      if (tsA < cutoff) continue;

      let closestB = pricesB[0];
      let minDiff = Math.abs(pricesB[0][0] - tsA);

      for (let i = 1; i < pricesB.length; i++) {
        const diff = Math.abs(pricesB[i][0] - tsA);
        if (diff < minDiff) {
          minDiff = diff;
          closestB = pricesB[i];
        }
      }

      // Solo si la diferencia de tiempo es aceptable (ej. menos de 4 horas de desfase)
      if (minDiff < 4 * 3600 * 1000) {
        merged.push({
          timestamp: tsA,
          ratio: priceA / closestB[1],
        });
      }
    }

    return merged;
  }, [data, baseCoin, quoteCoin, timeframe]);

  const baseData = coins?.find((c) => c.id === baseCoin);
  const quoteData = coins?.find((c) => c.id === quoteCoin);

  // Calcular variación del ratio
  const firstRatio = chartData[0]?.ratio || 0;
  const lastRatio = chartData[chartData.length - 1]?.ratio || 0;
  const variation = firstRatio > 0 ? ((lastRatio - firstRatio) / firstRatio) * 100 : 0;
  const isPositive = variation >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 p-4 border border-border bg-card rounded-lg">
        <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Activo Base</span>
          {coins && <CoinSelector coins={coins} selectedCoinId={baseCoin} onSelect={setBaseCoin} />}
        </div>

        <button 
          onClick={handleSwap}
          className="mt-5 p-2 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Invertir pares"
        >
          <ArrowRightLeft className="size-4" />
        </button>

        <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Activo Comparativo</span>
          {coins && <CoinSelector coins={coins} selectedCoinId={quoteCoin} onSelect={setQuoteCoin} />}
        </div>

        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Temporalidad</span>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px] bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Fortaleza Relativa: {baseData?.symbol.toUpperCase()} / {quoteData?.symbol.toUpperCase()}
            </CardTitle>
            {!isLoading && chartData.length > 0 && (
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${isPositive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                {isPositive ? "+" : ""}{variation.toFixed(2)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin" /> Calculando ratio...
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="timestamp" 
                    type="number" 
                    domain={['dataMin', 'dataMax']}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      if (timeframe === "1h" || timeframe === "4h" || timeframe === "1d") {
                        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                      }
                      return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
                    }}
                    minTickGap={40}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    width={75}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                    tickFormatter={(val) => val.toPrecision(4)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "oklch(0.17 0.005 260)", borderColor: "oklch(0.25 0.005 260)", borderRadius: "8px" }}
                    labelFormatter={(label) => new Date(label as number).toLocaleString("es-ES")}
                    formatter={(value: number) => [value.toPrecision(6), "Ratio"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ratio" 
                    stroke="var(--primary)" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No hay suficientes datos para comparar estos dos activos.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}