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
  Legend,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoinSelector } from "@/components/coin-selector";
import { Loader2, ArrowRightLeft, X, Plus, Info } from "lucide-react";
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

const COLORS = ["#a3e635", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

export function RelativeStrength({ coins }: { coins: any[] }) {
  const [baseCoins, setBaseCoins] = useState<string[]>(["hyperliquid"]);
  const [quoteCoin, setQuoteCoin] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("30d");
  const [addValue, setAddValue] = useState("");
  
  // NUEVO: Estado para guardar la fecha donde el usuario hace clic (el nuevo 0%)
  const [rebaseDate, setRebaseDate] = useState<number | null>(null);

  const handleSwap = () => {
    if (baseCoins.length === 1) {
      const oldBase = baseCoins[0];
      setBaseCoins([quoteCoin]);
      setQuoteCoin(oldBase);
      setRebaseDate(null); // Reseteamos el rebase al invertir
    }
  };

  const handleTimeframeChange = (val: string) => {
    setTimeframe(val);
    setRebaseDate(null); // Reseteamos el rebase al cambiar de tiempo
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

  const tfConfig = TIMEFRAMES.find((t) => t.value === timeframe) || TIMEFRAMES[3];
  const allCoinsToFetch = Array.from(new Set([...baseCoins, quoteCoin])).join(",");

  const { data, isLoading } = useSWR(
    `/api/crypto/batch?coinIds=${allCoinsToFetch}&days=${tfConfig.days}`,
    batchFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const chartData = useMemo(() => {
    if (!data?.results || !data.results[quoteCoin]) return [];
    
    const quotePrices = data.results[quoteCoin].prices;
    if (!quotePrices || quotePrices.length === 0) return [];

    const rawMerged = [];
    const now = Date.now();
    const cutoff = timeframe === "4h" ? now - 4 * 3600 * 1000 : 0;

    // 1. PRIMER PASO: Agrupar los ratios crudos por cada fecha
    for (const [tsQ, priceQ] of quotePrices) {
      if (tsQ < cutoff) continue;
      
      const dataPoint: any = { timestamp: tsQ, ratios: {} };
      let hasData = false;

      for (const bc of baseCoins) {
        const bPrices = data.results[bc]?.prices;
        if (!bPrices || bPrices.length === 0) continue;

        let closestPrice = bPrices[0][1];
        let minDiff = Math.abs(bPrices[0][0] - tsQ);

        for (let i = 1; i < bPrices.length; i++) {
          const diff = Math.abs(bPrices[i][0] - tsQ);
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = bPrices[i][1];
          }
        }

        const tolerance = tfConfig.days === "1" ? 3600 * 1000 : 12 * 3600 * 1000;
        if (minDiff <= tolerance) {
          dataPoint.ratios[bc] = closestPrice / priceQ;
          hasData = true;
        }
      }

      if (hasData) {
        rawMerged.push(dataPoint);
      }
    }

    if (rawMerged.length === 0) return [];

    // 2. SEGUNDO PASO: Buscar los ratios "Base" (el 0%) según si el usuario hizo clic o no
    const baseRatios: Record<string, number> = {};
    const targetTs = rebaseDate || rawMerged[0].timestamp;

    for (const bc of baseCoins) {
      // Buscamos el punto de datos más cercano a la fecha clickeada (o la primera)
      let refPoint = rawMerged.find(d => d.timestamp >= targetTs && d.ratios[bc] !== undefined);
      
      // Si no encuentra hacia adelante (ej. hizo clic muy al final), busca hacia atrás
      if (!refPoint) {
        refPoint = [...rawMerged].reverse().find(d => d.timestamp <= targetTs && d.ratios[bc] !== undefined);
      }
      
      if (refPoint) {
        baseRatios[bc] = refPoint.ratios[bc];
      }
    }

    // 3. TERCER PASO: Calcular porcentajes relativos usando la nueva base
    const finalMerged = rawMerged.map(d => {
      const point: any = { timestamp: d.timestamp };
      for (const bc of baseCoins) {
        if (d.ratios[bc] !== undefined && baseRatios[bc] !== undefined) {
          point[bc] = ((d.ratios[bc] - baseRatios[bc]) / baseRatios[bc]) * 100;
        }
      }
      return point;
    });

    return finalMerged;
  }, [data, baseCoins, quoteCoin, timeframe, tfConfig.days, rebaseDate]);

  const quoteData = coins?.find((c) => c.id === quoteCoin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 p-4 border border-border bg-card rounded-lg shadow-sm">
        
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Activos Base (Max 5)</span>
          <div className="flex flex-wrap items-center gap-2">
            {baseCoins.map((bc, i) => {
              const c = coins.find((x: any) => x.id === bc);
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
                  {coins.filter((c: any) => !baseCoins.includes(c.id) && c.id !== quoteCoin).map((c: any) => (
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
          <CoinSelector coins={coins} selectedCoinId={quoteCoin} onSelect={setQuoteCoin} />
        </div>

        <div className="flex flex-col gap-2 min-w-[140px]">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Temporalidad</span>
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-full bg-background border-border h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="text-lg font-semibold flex flex-wrap items-center gap-2">
              Rendimiento Relativo vs {quoteData?.name}
              
              {/* Etiqueta interactiva para mostrar que se reestableció el 0% y permitir borrarlo */}
              {rebaseDate && (
                <Badge 
                  variant="outline" 
                  className="bg-primary/10 text-primary hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors cursor-pointer ml-2" 
                  onClick={() => setRebaseDate(null)} 
                  title="Restaurar a inicio de periodo"
                >
                  Desde: {new Date(rebaseDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: timeframe === "4h" || timeframe === "1d" ? "2-digit" : undefined, minute: timeframe === "4h" || timeframe === "1d" ? "2-digit" : undefined })}
                  <X className="size-3 ml-1.5" />
                </Badge>
              )}
            </CardTitle>
            
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5" />
              Haz clic en el gráfico para reestablecer el punto 0%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin" /> Calculando rendimiento...
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  // EVENTO CLIC PARA FIJAR EL NUEVO CERO
                  onClick={(e) => {
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
                    formatter={(value: number, name: string) => {
                      const symbol = coins.find((c: any) => c.id === name)?.symbol.toUpperCase() || name;
                      return [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, `${symbol} / ${quoteData?.symbol.toUpperCase()}`];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    formatter={(value) => {
                      const symbol = coins.find((c: any) => c.id === value)?.symbol.toUpperCase() || value;
                      return <span style={{ color: "var(--foreground)", fontWeight: 500, fontSize: "13px", cursor: "pointer" }}>{symbol} / {quoteData?.symbol.toUpperCase()}</span>;
                    }}
                  />
                  
                  {/* Línea horizontal en 0% para referencia */}
                  <ReferenceLine y={0} stroke="oklch(0.6 0 0)" strokeDasharray="3 3" opacity={0.6} />

                  {/* Línea vertical para mostrar dónde está fijado el nuevo 0% */}
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