"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  processEmaData,
  analyzeEmas,
  getMarketSummary,
  formatPrice,
} from "@/lib/ema";
import type { EmaAnalysis, MarketSummary } from "@/lib/ema";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Minus,
  Search,
  Star,
  X,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

const STORAGE_KEY = "crypto-ema-favorites";
const DEFAULT_FAVORITES: string[] = [];

const TIMEFRAMES = [
  { value: "90", label: "90d" },
  { value: "180", label: "180d" },
  { value: "365", label: "1A" },
  { value: "730", label: "2A" },
  { value: "max", label: "Max" },
];

function loadFavorites(): string[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_FAVORITES;
    }
  } catch {
    // ignore
  }
  return DEFAULT_FAVORITES;
}

function saveFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
}

interface CoinRowData {
  coinId: string;
  coin: Coin | null;
  price: number;
  ema20: EmaAnalysis | null;
  ema50: EmaAnalysis | null;
  ema100: EmaAnalysis | null;
  ema200: EmaAnalysis | null;
  summary: MarketSummary;
  error?: string;
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "bullish":
      return <TrendingUp className="size-3.5" />;
    case "bearish":
      return <TrendingDown className="size-3.5" />;
    case "warning":
      return <AlertTriangle className="size-3.5" />;
    default:
      return <Minus className="size-3.5" />;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case "bullish":
      return "bg-success/15 text-success border-success/30";
    case "bearish":
      return "bg-danger/15 text-danger border-danger/30";
    case "warning":
      return "bg-warning/15 text-warning border-warning/30";
    default:
      return "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30";
  }
}

function EmaCell({ analysis }: { analysis: EmaAnalysis | null }) {
  if (!analysis) {
    return (
      <span className="text-xs text-muted-foreground/50 italic">N/A</span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className={`text-[11px] leading-tight w-fit ${severityColor(analysis.severity)}`}
      >
        <SeverityIcon severity={analysis.severity} />
        <span className="ml-1">
          {analysis.position === "above" ? "+" : ""}
          {analysis.percentageDiff.toFixed(1)}%
        </span>
      </Badge>
      <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
        {analysis.characteristic}
      </span>
    </div>
  );
}

const batchFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  return data;
};

export function FavoritesWatchlist({ coins }: { coins: Coin[] | undefined }) {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [days, setDays] = useState("365");
  const [addSearch, setAddSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);

  const favoritesKey = favorites.join(",");

  const {
    data: batchData,
    isLoading,
    mutate,
  } = useSWR(
    favorites.length > 0
      ? `/api/crypto/batch?coinIds=${favoritesKey}&days=${days}`
      : null,
    batchFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
      keepPreviousData: false,
      errorRetryCount: 1,
    }
  );

  const removeFavorite = useCallback(
    (coinId: string) => {
      const next = favorites.filter((f) => f !== coinId);
      setFavorites(next);
      saveFavorites(next);
    },
    [favorites]
  );

  const addFavorite = useCallback(
    (coinId: string) => {
      if (favorites.includes(coinId)) return;
      const next = [...favorites, coinId];
      setFavorites(next);
      saveFavorites(next);
      setAddSearch("");
      setShowAddMenu(false);
    },
    [favorites]
  );

  const addSearchResults = useMemo(() => {
    if (!coins || !addSearch) return [];
    const q = addSearch.toLowerCase();
    return coins
      .filter(
        (c) =>
          !favorites.includes(c.id) &&
          (c.name.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [coins, addSearch, favorites]);

  const rows: CoinRowData[] = useMemo(() => {
    return favorites.map((coinId) => {
      const coin = coins?.find((c) => c.id === coinId) || null;
      const result = batchData?.results?.[coinId];

      if (!result || result.error || !result.prices || result.prices.length === 0) {
        return {
          coinId,
          coin,
          price: coin?.current_price || 0,
          ema20: null,
          ema50: null,
          ema100: null,
          ema200: null,
          summary: {
            label: result?.error || "Sin datos",
            description: "No hay datos disponibles para este periodo.",
            severity: "neutral" as const,
          },
          error: result?.error,
        };
      }

      const { pricePoints, emas } = processEmaData(result.prices);

      if (pricePoints.length === 0) {
        return {
          coinId,
          coin,
          price: coin?.current_price || 0,
          ema20: null,
          ema50: null,
          ema100: null,
          ema200: null,
          summary: {
            label: "Sin datos",
            description: "",
            severity: "neutral" as const,
          },
        };
      }

      const currentPrice = pricePoints[pricePoints.length - 1]?.price || 0;
      const analyses = analyzeEmas(currentPrice, emas);
      const summary = getMarketSummary(analyses);

      return {
        coinId,
        coin,
        price: currentPrice,
        ema20: analyses.find((a) => a.ema.period === 20) || null,
        ema50: analyses.find((a) => a.ema.period === 50) || null,
        ema100: analyses.find((a) => a.ema.period === 100) || null,
        ema200: analyses.find((a) => a.ema.period === 200) || null,
        summary,
      };
    });
  }, [favorites, batchData, coins]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {favorites.length} favoritas
          </span>
        </div>

        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[90px] bg-card border-border h-8 text-xs">
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
          onClick={() => mutate()}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Refrescar"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        {/* Add coin */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 h-8 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="size-3.5" />
            Agregar cripto
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-lg border border-border bg-card shadow-lg">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cripto..."
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-secondary/50"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {addSearchResults.length > 0 ? (
                  addSearchResults.map((coin) => (
                    <button
                      key={coin.id}
                      onClick={() => addFavorite(coin.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="size-5 rounded-full"
                      />
                      <span className="font-medium text-foreground">
                        {coin.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {coin.symbol.toUpperCase()}
                      </span>
                    </button>
                  ))
                ) : addSearch ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No encontrado
                  </div>
                ) : (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    Escribe para buscar...
                  </div>
                )}
              </div>
              <div className="border-t border-border p-1.5">
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    setAddSearch("");
                  }}
                  className="w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">
                Cargando datos de {favorites.length} criptos...
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {favorites.map((id) => (
                <Skeleton key={id} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Watchlist de Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Cripto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">EMA 20</TableHead>
                    <TableHead className="text-center">EMA 50</TableHead>
                    <TableHead className="text-center">EMA 100</TableHead>
                    <TableHead className="text-center">EMA 200</TableHead>
                    <TableHead className="text-center">Resumen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.coinId} className="border-border/30">
                      <TableCell>
                        <button
                          onClick={() => removeFavorite(row.coinId)}
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                          aria-label={`Quitar ${row.coin?.name || row.coinId} de favoritos`}
                        >
                          <X className="size-4" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.coin?.image && (
                            <img
                              src={row.coin.image}
                              alt={row.coin.name}
                              className="size-6 rounded-full"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm">
                              {row.coin?.name || row.coinId}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {row.coin?.symbol || ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.price > 0 ? formatPrice(row.price) : "--"}
                      </TableCell>
                      <TableCell className="text-center">
                        <EmaCell analysis={row.ema20} />
                      </TableCell>
                      <TableCell className="text-center">
                        <EmaCell analysis={row.ema50} />
                      </TableCell>
                      <TableCell className="text-center">
                        <EmaCell analysis={row.ema100} />
                      </TableCell>
                      <TableCell className="text-center">
                        <EmaCell analysis={row.ema200} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${severityColor(row.summary.severity)}`}
                        >
                          <SeverityIcon severity={row.summary.severity} />
                          <span className="ml-1 max-w-[120px] truncate">
                            {row.summary.label}
                          </span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && favorites.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="mx-auto size-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              No tienes criptomonedas favoritas. Agrega alguna para ver su
              analisis EMA aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
