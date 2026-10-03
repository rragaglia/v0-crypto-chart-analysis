"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoinSelector } from "@/components/coin-selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowRightLeft, X, Plus, Info, BarChart3, RefreshCw, ZoomIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const batchFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return data;
};

const TIMEFRAMES = [
  { value: "4h", label: "4 Horas", days: "1" },
  { value: "1d", label: "1 Día", days: "1" },
  { value: "7d", label: "7 Días", days: "7" },
  { value: "30d", label: "30 Días", days: "30" },
  { value: "180d", label: "6 Meses", days: "180" },
  { value: "365d", label: "1 Año", days: "365" },
  { value: "730d", label: "2 Años", days: "730" },
  { value: "1095d", label: "3 Años", days: "1095" },
];

const TIMEFRAMES_TABLE = [
  { key: "15m", ms: 15 * 60 * 1000, label: "15m%" },
  { key: "1h", ms: 60 * 60 * 1000, label: "1h%" },
  { key: "4h", ms: 4 * 60 * 60 * 1000, label: "4hs%" },
  { key: "12h", ms: 12 * 60 * 60 * 1000, label: "12hs%" },
  { key: "1d", ms: 24 * 60 * 60 * 1000, label: "1d%" },
  { key: "7d", ms: 7 * 24 * 60 * 60 * 1000, label: "7d%" },
  { key: "15d", ms: 15 * 24 * 60 * 60 * 1000, label: "15d%" },
  { key: "1m", ms: 30 * 24 * 60 * 60 * 1000, label: "1m%" },
  { key: "6m", ms: 180 * 24 * 60 * 60 * 1000, label: "6m%" },
  { key: "1y", ms: 365 * 24 * 60 * 60 * 1000, label: "1y%" },
];

const COLORS = ["#a3e635", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

const formatUsd = (price: number) => {
  if (price >= 1) return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6 });
};

export function RelativeStrength({ coins }: { coins: any[] }) {
  const extendedCoins = useMemo(() => {
    if (!coins) return [];
    if (coins.find(c => c.id === "usd")) return coins;
    const usdCoin = {
      id: "usd",
      symbol: "USD",
      name: "US Dollar",
      image: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
      current_price: 1,
    };
    return [usdCoin, ...coins];
  }, [coins]);

  // Persistencia de estados mediante localStorage
  const [baseCoins, setBaseCoins] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crypto-rs-baseCoins");
      if (saved) return JSON.parse(saved);
    }
    return ["hyperliquid"];
  });

  const [quoteCoin, setQuoteCoin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crypto-rs-quoteCoin") || "usd";
    }
    return "usd";
  });

  const [timeframe, setTimeframe] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crypto-rs-timeframe") || "30d";
    }
    return "30d";
  });

  const [rebaseDate, setRebaseDate] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crypto-rs-rebaseDate");
      if (saved) return JSON.parse(saved);
    }
    return null;
  });

  const [zoomDate, setZoomDate] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crypto-rs-zoomDate");
      if (saved) return JSON.parse(saved);
    }
    return null;
  });

  const [hiddenLines, setHiddenLines] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crypto-rs-hiddenLines");
      if (saved) return JSON.parse(saved);
    }
    return []; 
  });

  const [addValue, setAddValue] = useState("");

  // Guardar estados automáticamente
  useEffect(() => { localStorage.setItem("crypto-rs-baseCoins", JSON.stringify(baseCoins)); }, [baseCoins]);
  useEffect(() => { localStorage.setItem("crypto-rs-quoteCoin", quoteCoin); }, [quoteCoin]);
  useEffect(() => { localStorage.setItem("crypto-rs-timeframe", timeframe); }, [timeframe]);
  useEffect(() => { localStorage.setItem("crypto-rs-rebaseDate", JSON.stringify(rebaseDate)); }, [rebaseDate]);
  useEffect(() => { localStorage.setItem("crypto-rs-zoomDate", JSON.stringify(zoomDate)); }, [zoomDate]);
  useEffect(() => { localStorage.setItem("crypto-rs-hiddenLines", JSON.stringify(hiddenLines)); }, [hiddenLines]);

  const handleSwap = () => {
    if (baseCoins.length === 1) {
      const oldBase = baseCoins[0];
      setBaseCoins([quoteCoin]);
      setQuoteCoin(oldBase);
      setRebaseDate(null);
      setZoomDate(null);
    }
  };

  const handleTimeframeChange = (val: string) => {
    setTimeframe(val);
    setRebaseDate(null);
    setZoomDate(null);
  };

  const addBaseCoin = (id: string) => {
    if (baseCoins.length < 5 && !baseCoins.includes(id)) {
      setBaseCoins([...baseCoins, id]);
    }
  };

  const removeBaseCoin = (id: string) => {
    if (baseCoins.length > 1) {
      setBaseCoins(baseCoins.filter(c => c !== id));
    }
  };

  const toggleLine = (coinId: string, metric: 'avg' | 'median') => {
    const key = `${coinId}-${metric}`;
    setHiddenLines(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const tfConfig = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[3];
  
  const allCoinsToFetch = Array.from(new Set([...baseCoins, quoteCoin]))
    .filter(id => id !== "usd")
    .join(",");

  const { data, isLoading, mutate, isValidating } = useSWR(
    allCoinsToFetch.length > 0 ? `/api/crypto/batch?coinIds=${allCoinsToFetch}&days=${tfConfig.days}` : null,
    batchFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { chartData, segmentData, segmentTypeLabel, segmentMetrics } = useMemo(() => {
    if (!data?.results && allCoinsToFetch.length > 0) return { chartData: [], segmentData: [], segmentTypeLabel: "", segmentMetrics: {} };
    
    const timelineCoin = quoteCoin !== "usd" ? quoteCoin : baseCoins.find(c => c !== "usd");
    const timelinePrices = timelineCoin && data?.results[timelineCoin] ? data.results[timelineCoin].prices : [];
    
    if (!timelinePrices || timelinePrices.length === 0) return { chartData: [], segmentData: [], segmentTypeLabel: "", segmentMetrics: {} };

    const rawMerged = [];
    const now = Date.now();
    const cutoff = timeframe === "4h" ? now - 4 * 3600 * 1000 : 0;

    const getClosestPrice = (coinId: string, ts: number) => {
      if (coinId === "usd") return 1;
      const prices = data.results[coinId]?.prices;
      if (!prices || prices.length === 0) return null;
      
      let minDiff = Math.abs(prices[0][0] - ts);
      let closestPrice = prices[0][1];
      for (let i = 1; i < prices.length; i++) {
        const diff = Math.abs(prices[i][0] - ts);
        if (diff < minDiff) {
          minDiff = diff;
          closestPrice = prices[i][1];
        }
      }
      const tolerance = tfConfig.days === "1" ? 3600 * 1000 : 12 * 3600 * 1000;
      return minDiff <= tolerance ? closestPrice : null;
    };

    for (const [ts] of timelinePrices) {
      if (ts < cutoff) continue;
      if (zoomDate && ts < zoomDate) continue;
      
      const priceQ = getClosestPrice(quoteCoin, ts);
      if (priceQ === null) continue;

      const dataPoint: any = { timestamp: ts, ratios: {}, pricesUSD: {} };
      dataPoint.pricesUSD[quoteCoin] = priceQ;
      let hasData = false;

      for (const bc of baseCoins) {
        const priceB = getClosestPrice(bc, ts);
        if (priceB !== null) {
          dataPoint.ratios[bc] = priceB / priceQ;
          dataPoint.pricesUSD[bc] = priceB;
          hasData = true;
        }
      }

      if (hasData) {
        rawMerged.push(dataPoint);
      }
    }

    if (rawMerged.length === 0) return { chartData: [], segmentData: [], segmentTypeLabel: "", segmentMetrics: {} };

    const baseRatios: Record<string, number> = {};
    const targetTs = rebaseDate || rawMerged[0].timestamp;

    for (const bc of baseCoins) {
      let refPoint = rawMerged.find(d => d.timestamp >= targetTs && d.ratios[bc] !== undefined);
      if (!refPoint) {
        refPoint = [...rawMerged].reverse().find(d => d.timestamp <= targetTs && d.ratios[bc] !== undefined);
      }
      if (refPoint) {
        baseRatios[bc] = refPoint.ratios[bc];
      }
    }

    const finalMerged = rawMerged.map(d => {
      const point: any = { timestamp: d.timestamp, pricesUSD: d.pricesUSD };
      for (const bc of baseCoins) {
        if (d.ratios[bc] !== undefined && baseRatios[bc] !== undefined) {
          point[bc] = ((d.ratios[bc] - baseRatios[bc]) / baseRatios[bc]) * 100;
        }
      }
      return point;
    });

    let segmentType = "day";
    let segmentTypeLabel = "Día";
    if (["4h", "1d"].includes(timeframe)) { segmentType = "hour"; segmentTypeLabel = "Hora"; }
    else if (["7d", "30d"].includes(timeframe)) { segmentType = "day"; segmentTypeLabel = "Día"; }
    else if (["180d"].includes(timeframe)) { segmentType = "week"; segmentTypeLabel = "Semana"; }
    else { segmentType = "month"; segmentTypeLabel = "Mes"; }

    const getBucketLabel = (ts: number, type: string) => {
      const d = new Date(ts);
      if (type === "hour") return `${d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} ${d.getHours()}:00`;
      if (type === "day") return d.toLocaleDateString("es-ES", {day: "2-digit", month: "short"});
      if (type === "week") {
        const d2 = new Date(ts);
        const day = d2.getDay() || 7; 
        d2.setDate(d2.getDate() - day + 1);
        return `Sem ${d2.toLocaleDateString("es-ES", {day: "2-digit", month: "short"})}`;
      }
      if (type === "month") return d.toLocaleDateString("es-ES", {month: "short", year: "2-digit"});
      return "";
    };

    const buckets: Record<string, { start: any, end: any, ts: number }> = {};
    for (const pt of rawMerged) {
      const b = getBucketLabel(pt.timestamp, segmentType);
      if (!buckets[b]) buckets[b] = { start: pt, end: pt, ts: pt.timestamp };
      else buckets[b].end = pt;
    }

    const segData = Object.keys(buckets).map(b => {
      const res: any = { label: b, timestamp: buckets[b].ts };
      for (const bc of baseCoins) {
        const startVal = buckets[b].start.ratios[bc];
        const endVal = buckets[b].end.ratios[bc];
        if (startVal && endVal) {
          res[bc] = ((endVal - startVal) / startVal) * 100;
        } else {
          res[bc] = 0;
        }
      }
      return res;
    }).sort((a, b) => a.timestamp - b.timestamp);

    const metrics: Record<string, { avg: number, median: number }> = {};
    for (const bc of baseCoins) {
      const returns = segData.map(d => d[bc] as number).filter(v => v !== undefined && !isNaN(v));
      if (returns.length > 0) {
        const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
        const sorted = [...returns].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        metrics[bc] = { avg, median };
      }
    }

    return { chartData: finalMerged, segmentData: segData, segmentTypeLabel, segmentMetrics: metrics };
  }, [data, baseCoins, quoteCoin, timeframe, tfConfig.days, rebaseDate, zoomDate, allCoinsToFetch]);

  // Cálculos dinámicos para la tabla de rendimientos corrigiendo el problema de resolución
  const tableData = useMemo(() => {
    if (!data?.results) return [];
    
    // Buscar el timestamp MÁS RECIENTE disponible en los datos reales
    let currentTs = 0;
    baseCoins.forEach(bc => {
      const prices = data.results[bc]?.prices;
      if (prices && prices.length > 0) {
        const lastTs = prices[prices.length - 1][0];
        if (lastTs > currentTs) currentTs = lastTs;
      }
    });

    if (currentTs === 0) return [];

    const getClosestPriceInfo = (coinId: string, targetTs: number, maxTolerance: number) => {
      if (coinId === "usd") return { price: 1, ts: targetTs };
      const prices = data.results[coinId]?.prices;
      if (!prices || prices.length === 0) return null;
      
      let minDiff = Infinity;
      let closestPoint = null;
      for (let i = 0; i < prices.length; i++) {
        const diff = Math.abs(prices[i][0] - targetTs);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = { price: prices[i][1], ts: prices[i][0] };
        }
      }
      return minDiff <= maxTolerance ? closestPoint : null;
    };

    return baseCoins.map(bc => {
      // Precio actual con tolerancia alta para asegurar que tome el último disponible
      const currentQ = getClosestPriceInfo(quoteCoin, currentTs, 2 * 24 * 3600 * 1000); 
      const currentB = getClosestPriceInfo(bc, currentTs, 2 * 24 * 3600 * 1000);
      const currentRatio = (currentB !== null && currentQ !== null) ? currentB.price / currentQ.price : null;
      
      const currentUsdPrice = data.results[bc]?.prices?.slice(-1)[0]?.[1] || 0;
      
      const row: any = { coin: bc, priceUsd: currentUsdPrice };
      
      TIMEFRAMES_TABLE.forEach(tf => {
        // Tolerancia adaptativa: Mínimo 2hs para Timeframes grandes con datos horarios, Máximo 3 días para TF de años
        let tolerance = Math.max(2 * 3600 * 1000, tf.ms * 0.2); 
        if (tolerance > 3 * 24 * 3600 * 1000) tolerance = 3 * 24 * 3600 * 1000;

        const targetTs = currentTs - tf.ms;
        const pastQ = getClosestPriceInfo(quoteCoin, targetTs, tolerance);
        const pastB = getClosestPriceInfo(bc, targetTs, tolerance);
        
        if (currentRatio !== null && pastQ !== null && pastB !== null) {
          // Filtrar falso 0.00% cuando la API no tiene suficiente resolución temporal (es decir, agarra la misma vela de datos)
          if (currentB && pastB.ts === currentB.ts) {
            row[tf.key] = null;
          } else {
            const pastRatio = pastB.price / pastQ.price;
            row[tf.key] = ((currentRatio - pastRatio) / pastRatio) * 100;
          }
        } else {
          row[tf.key] = null;
        }
      });
      
      return row;
    });
  }, [data, baseCoins, quoteCoin]);

  const quoteData = extendedCoins?.find((c) => c.id === quoteCoin);

  const formatDateLabel = (ts: number) => {
    return new Date(ts).toLocaleDateString("es-ES", { 
      day: "2-digit", month: "short", 
      hour: timeframe === "4h" || timeframe === "1d" ? "2-digit" : undefined, 
      minute: timeframe === "4h" || timeframe === "1d" ? "2-digit" : undefined 
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 p-4 border border-border bg-card rounded-lg shadow-sm">
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Activos Base (Max 5)</span>
          <div className="flex flex-wrap items-center gap-2">
            {baseCoins.map((bc, i) => {
              const c = extendedCoins.find((x: any) => x.id === bc);
              return (
                <Badge key={bc} variant="outline" className="flex items-center gap-1.5 py-1.5 px-3 bg-secondary/50 text-sm">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="font-medium text-foreground">{c?.symbol.toUpperCase()}</span>
                  {baseCoins.length > 1 && (
                    <button 
                      onClick={() => removeBaseCoin(bc)} 
                      className="ml-1 text-muted-foreground hover:text-danger transition-colors"
                      title="Quitar activo"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </Badge>
              )
            })}
            
            {baseCoins.length < 5 && (
              <Select value={addValue} onValueChange={(id) => { addBaseCoin(id); setAddValue(""); }}>
                <SelectTrigger className="w-fit bg-transparent border-border border-dashed h-8 text-xs px-3 shadow-none hover:bg-secondary/50 transition-colors">
                  <Plus className="size-3.5 mr-1.5" /> Añadir 
                </SelectTrigger>
                <SelectContent>
                  {extendedCoins.filter((c: any) => !baseCoins.includes(c.id) && c.id !== quoteCoin).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {baseCoins.length === 1 && (
          <button 
            onClick={handleSwap}
            className="mb-1 p-2.5 rounded-full bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-transparent hover:border-border"
            title="Invertir par"
          >
            <ArrowRightLeft className="size-4" />
          </button>
        )}

        <div className="flex flex-col gap-2 min-w-[150px]">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Activo Comparativo</span>
          <CoinSelector coins={extendedCoins} selectedCoinId={quoteCoin} onSelect={setQuoteCoin} />
        </div>

        <div className="flex flex-col gap-2 min-w-[140px]">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Temporalidad</span>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-full bg-background border-border h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={() => mutate()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`size-4 ${isValidating || isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="text-lg font-semibold flex flex-wrap items-center gap-2">
              Rendimiento Relativo vs {quoteData?.name}
              
              {zoomDate && (
                <Badge 
                  variant="outline" 
                  className="bg-primary/20 text-primary hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors cursor-pointer ml-2" 
                  onClick={() => setZoomDate(null)} 
                  title="Quitar ampliación temporal"
                >
                  <ZoomIn className="size-3 mr-1.5" />
                  Zoom desde: {formatDateLabel(zoomDate)}
                  <X className="size-3 ml-1.5" />
                </Badge>
              )}

              {rebaseDate && (
                <Badge 
                  variant="outline" 
                  className="bg-secondary text-secondary-foreground hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors cursor-pointer ml-1" 
                  onClick={() => setRebaseDate(null)} 
                  title="Restaurar a inicio de periodo"
                >
                  Punto 0%: {formatDateLabel(rebaseDate)}
                  <X className="size-3 ml-1.5" />
                </Badge>
              )}

              {rebaseDate && rebaseDate !== zoomDate && (
                <button
                  onClick={() => {
                    setZoomDate(rebaseDate);
                    setRebaseDate(null);
                  }}
                  className="text-xs flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors ml-1 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 shadow-sm"
                >
                  <ZoomIn className="size-3" /> Ampliar vista desde aquí
                </button>
              )}
            </CardTitle>
            
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5" />
              Haz clic en el gráfico para fijar punto 0% o ampliar
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin" /> Calculando rendimiento...
            </div>
          ) : chartData.length > 0 ? (
            <>
              {/* GRÁFICO DE LÍNEAS (Acumulado) */}
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onClick={(e: any) => {
                      if (e && e.activeLabel) {
                        setRebaseDate(e.activeLabel as number);
                      }
                    }}
                    style={{ cursor: "crosshair" }}
                  >
                    <XAxis 
                      dataKey="timestamp" 
                      type="number" 
                      domain={['dataMin', 'dataMax']}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        if (timeframe === "4h" || timeframe === "1d") {
                          return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                        }
                        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: timeframe.includes("y") || timeframe === "730d" || timeframe === "1095d" ? "2-digit" : undefined });
                      }}
                      minTickGap={40}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      width={75}
                      tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                      tickFormatter={(val) => `${val > 0 ? "+" : ""}${val.toFixed(2)}%`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "oklch(0.17 0.005 260)", borderColor: "oklch(0.25 0.005 260)", borderRadius: "8px" }}
                      labelFormatter={(label) => new Date(label as number).toLocaleString("es-ES")}
                      formatter={(value: number, name: string, props: any) => {
                        const symbol = extendedCoins.find((c: any) => c.id === name)?.symbol.toUpperCase() || name;
                        const point = props.payload;
                        const usdPrice = point.pricesUSD?.[name];
                        const usdText = usdPrice ? ` (${formatUsd(usdPrice)})` : '';
                        return [`${value > 0 ? "+" : ""}${value.toFixed(2)}%${usdText}`, `${symbol} / ${quoteData?.symbol.toUpperCase()}`];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      formatter={(value) => {
                        const symbol = extendedCoins.find((c: any) => c.id === value)?.symbol.toUpperCase() || value;
                        return <span style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "13px", cursor: "pointer" }}>{symbol} / {quoteData?.symbol.toUpperCase()}</span>;
                      }}
                    />
                    
                    <ReferenceLine y={0} stroke="oklch(0.6 0 0)" strokeDasharray="3 3" opacity={0.6} />

                    {rebaseDate && (
                      <ReferenceLine x={rebaseDate} stroke="var(--primary)" strokeDasharray="4 4" opacity={0.5} />
                    )}

                    {baseCoins.map((bc, i) => (
                      <Line 
                        key={bc}
                        type="monotone" 
                        dataKey={bc} 
                        stroke={COLORS[i]} 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* TABLA DE RENDIMIENTOS (REEMPLAZA A LOS PILLS) */}
              {tableData.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/50 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs h-8">Token</TableHead>
                        <TableHead className="text-right text-xs h-8">Precio</TableHead>
                        {TIMEFRAMES_TABLE.map(tf => (
                          <TableHead key={tf.key} className="text-right text-xs h-8 text-muted-foreground">{tf.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, i) => {
                        const c = extendedCoins.find((x: any) => x.id === row.coin);
                        return (
                          <TableRow key={row.coin} className="border-border/30 hover:bg-secondary/10">
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                <span className="font-bold text-xs">{c?.symbol.toUpperCase()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground">
                              {formatUsd(row.priceUsd)}
                            </TableCell>
                            {TIMEFRAMES_TABLE.map(tf => {
                              const val = row[tf.key];
                              if (val === null || val === undefined) {
                                return <TableCell key={tf.key} className="py-2 text-right text-xs text-muted-foreground opacity-50">-</TableCell>;
                              }
                              const isPos = val >= 0;
                              return (
                                <TableCell key={tf.key} className={`py-2 text-right font-mono text-xs font-bold ${isPos ? 'text-success' : 'text-danger'}`}>
                                  {isPos ? "+" : ""}{val.toFixed(2)}%
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* GRÁFICO DE BARRAS (Desglose por Segmento) */}
              {segmentData.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold">Desglose de Rendimiento por {segmentTypeLabel}</h3>
                    </div>
                    
                    {/* ETIQUETAS DE MEDIANA Y PROMEDIO INTERACTIVAS */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {baseCoins.map((bc, i) => {
                        const metric = segmentMetrics[bc];
                        if (!metric) return null;
                        
                        const isAvgHidden = hiddenLines.includes(`${bc}-avg`);
                        const isMedHidden = hiddenLines.includes(`${bc}-median`);

                        const c = extendedCoins.find((x: any) => x.id === bc);
                        return (
                          <div key={`metrics-${bc}`} className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-secondary/20 border border-border/40 w-fit">
                            <div className="flex items-center gap-1.5">
                              <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                              <span className="text-xs font-bold text-foreground">{c?.symbol.toUpperCase()}</span>
                            </div>
                            
                            {/* Botón PROM */}
                            <div 
                              className={`flex items-center gap-1.5 text-[11px] cursor-pointer transition-opacity hover:opacity-80`}
                              onClick={() => toggleLine(bc, 'avg')}
                              title="Mostrar/Ocultar Promedio"
                            >
                              <span className={`uppercase tracking-wider border-b border-dashed border-muted-foreground ${isAvgHidden ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                                Prom:
                              </span>
                              <span className={`font-bold text-xs ${isAvgHidden ? 'text-muted-foreground line-through opacity-50' : (metric.avg >= 0 ? 'text-success' : 'text-danger')}`}>
                                {metric.avg >= 0 ? "+" : ""}{metric.avg.toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="w-px h-3 bg-border/80"></div>
                            
                            {/* Botón MED */}
                            <div 
                              className={`flex items-center gap-1.5 text-[11px] cursor-pointer transition-opacity hover:opacity-80`}
                              onClick={() => toggleLine(bc, 'median')}
                              title="Mostrar/Ocultar Mediana"
                            >
                              <span className={`uppercase tracking-wider border-b border-solid border-muted-foreground ${isMedHidden ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                                Med:
                              </span>
                              <span className={`font-bold text-xs ${isMedHidden ? 'text-muted-foreground line-through opacity-50' : (metric.median >= 0 ? 'text-success' : 'text-danger')}`}>
                                {metric.median >= 0 ? "+" : ""}{metric.median.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={segmentData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.2 0 0)" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                          minTickGap={20}
                        />
                        <YAxis 
                          width={75}
                          tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }}
                          tickFormatter={(val) => `${val > 0 ? "+" : ""}${val.toFixed(2)}%`}
                        />
                        <Tooltip 
                          cursor={{ fill: "oklch(0.15 0 0)" }}
                          contentStyle={{ backgroundColor: "oklch(0.17 0.005 260)", borderColor: "oklch(0.25 0.005 260)", borderRadius: "8px" }}
                          formatter={(value: number, name: string) => {
                            const symbol = extendedCoins.find((c: any) => c.id === name)?.symbol.toUpperCase() || name;
                            return [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, symbol];
                          }}
                        />
                        <ReferenceLine y={0} stroke="oklch(0.6 0 0)" />
                        
                        {/* Renderizado dinámico de las líneas de referencia */}
                        {baseCoins.map((bc, i) => {
                          const metric = segmentMetrics[bc];
                          if (!metric) return null;
                          const showAvg = !hiddenLines.includes(`${bc}-avg`);
                          const showMed = !hiddenLines.includes(`${bc}-median`);
                          
                          const lines = [];
                          if (showAvg) {
                            lines.push(
                              <ReferenceLine 
                                key={`avg-${bc}`} 
                                y={metric.avg} 
                                stroke={COLORS[i]} 
                                strokeDasharray="3 3" 
                                strokeOpacity={0.4} 
                              />
                            );
                          }
                          if (showMed) {
                            lines.push(
                              <ReferenceLine 
                                key={`med-${bc}`} 
                                y={metric.median} 
                                stroke={COLORS[i]} 
                                strokeOpacity={0.6} 
                              />
                            );
                          }
                          return lines;
                        })}

                        {baseCoins.map((bc, i) => (
                          <Bar 
                            key={`bar-${bc}`} 
                            dataKey={bc} 
                            fill={COLORS[i]} 
                            radius={[2, 2, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <ArrowRightLeft className="size-10 opacity-20 mb-4" />
              <p>No hay suficientes datos superpuestos para comparar estos activos.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}