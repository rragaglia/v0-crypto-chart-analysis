"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { CoinSelector } from "@/components/coin-selector";
import { PriceChart } from "@/components/price-chart";
import { EmaTable } from "@/components/ema-table";
import { ChartSkeleton, TableSkeleton } from "@/components/loading-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processEmaData, analyzeEmas, getMarketSummary, formatPrice } from "@/lib/ema";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  // Even on 200, check for error field in response
  if (data.error && (!data.prices || data.prices.length === 0)) {
    throw new Error(data.error);
  }
  return data;
};

const TIMEFRAMES = [
  { value: "90", label: "90 dias" },
  { value: "180", label: "180 dias" },
  { value: "365", label: "1 ano" },
  { value: "730", label: "2 anos" },
  { value: "max", label: "Maximo" },
];

export function CryptoDashboard() {
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [days, setDays] = useState("365");

  const {
    data: coins,
    error: coinsError,
  } = useSWR("/api/crypto/coins", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000,
  });

  const {
    data: marketData,
    error: marketError,
    isLoading: isMarketLoading,
    mutate,
  } = useSWR(
    `/api/crypto?coinId=${selectedCoin}&days=${days}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      keepPreviousData: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  );

  const handleCoinChange = useCallback((coinId: string) => {
    setSelectedCoin(coinId);
  }, []);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const selectedCoinData = coins?.find?.(
    (c: { id: string }) => c.id === selectedCoin
  );

  const { pricePoints, emas, analyses, summary, currentPrice, dataWarning } = (() => {
    if (!marketData?.prices || !Array.isArray(marketData.prices) || marketData.prices.length === 0) {
      return {
        pricePoints: [],
        emas: [],
        analyses: [],
        summary: null,
        currentPrice: 0,
        dataWarning: marketData?.error || null,
      };
    }

    const { pricePoints, emas } = processEmaData(marketData.prices);

    if (pricePoints.length === 0) {
      return {
        pricePoints: [],
        emas: [],
        analyses: [],
        summary: null,
        currentPrice: 0,
        dataWarning: "No se pudieron procesar los datos de precio.",
      };
    }

    const currentPrice = pricePoints[pricePoints.length - 1]?.price || 0;
    const analyses = analyzeEmas(currentPrice, emas);
    const summary = getMarketSummary(analyses);

    const missingEmas = [20, 50, 100, 200].filter(
      (p) => !emas.find((e) => e.period === p)
    );
    const dataWarning =
      missingEmas.length > 0
        ? `Datos insuficientes para EMA ${missingEmas.join(", ")}. Intenta un periodo mas largo.`
        : null;

    return { pricePoints, emas, analyses, summary, currentPrice, dataWarning };
  })();

  const hasError = coinsError || marketError;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Crypto EMA Analyzer
                </h1>
                <p className="text-xs text-muted-foreground">
                  Analisis tecnico con medias moviles exponenciales
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {coins && !coinsError && (
                <CoinSelector
                  coins={coins}
                  selectedCoinId={selectedCoin}
                  onSelect={handleCoinChange}
                />
              )}

              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[140px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={handleRefresh}
                className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Refrescar datos"
              >
                <RefreshCw className={`size-4 ${isMarketLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-6">
        {/* Price banner */}
        {selectedCoinData && currentPrice > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={selectedCoinData.image}
                alt={selectedCoinData.name}
                className="size-10 rounded-full"
              />
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {formatPrice(currentPrice)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCoinData.name} ({selectedCoinData.symbol})
                </p>
              </div>
            </div>

            {summary && (
              <Badge
                variant="outline"
                className={`text-sm px-3 py-1.5 ${
                  summary.severity === "bullish"
                    ? "bg-success/10 text-success border-success/30"
                    : summary.severity === "bearish"
                    ? "bg-danger/10 text-danger border-danger/30"
                    : summary.severity === "warning"
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30"
                }`}
              >
                {summary.severity === "bullish" ? (
                  <TrendingUp className="size-4 mr-1" />
                ) : summary.severity === "bearish" ? (
                  <TrendingDown className="size-4 mr-1" />
                ) : null}
                {summary.label}
              </Badge>
            )}
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger text-sm">
            Error al cargar datos. Puede ser un limite de la API de CoinGecko (gratuita).
            Intenta de nuevo en unos segundos.
            <button
              onClick={handleRefresh}
              className="ml-2 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Data warning (missing EMAs) */}
        {dataWarning && !hasError && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-warning text-sm">
            {dataWarning}
          </div>
        )}

        {/* Chart */}
        {isMarketLoading ? (
          <ChartSkeleton />
        ) : pricePoints.length > 0 ? (
          <PriceChart
            pricePoints={pricePoints}
            emas={emas}
            coinName={selectedCoinData?.name || selectedCoin}
          />
        ) : null}

        {/* Table */}
        {isMarketLoading ? (
          <TableSkeleton />
        ) : analyses.length > 0 && summary ? (
          <EmaTable analyses={analyses} summary={summary} />
        ) : null}

        {/* EMA Legend / Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              EMAs Rapidas (corto plazo)
            </h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-chart-1" />
                <span>
                  <strong className="text-foreground">EMA 20:</strong> Tendencia
                  a muy corto plazo. Reacciona rapido a cambios de precio.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-chart-2" />
                <span>
                  <strong className="text-foreground">EMA 50:</strong> Tendencia
                  a corto-medio plazo. Referencia clasica para trading.
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              EMAs Lentas (largo plazo)
            </h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-chart-3" />
                <span>
                  <strong className="text-foreground">EMA 100:</strong>{" "}
                  Tendencia de medio plazo. Soporte/resistencia importante.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-chart-4" />
                <span>
                  <strong className="text-foreground">EMA 200:</strong>{" "}
                  Tendencia de largo plazo. La mas importante para identificar
                  bull/bear markets.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
