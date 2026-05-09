"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertTriangle, TrendingDown, Search, RefreshCw, ExternalLink, Info } from "lucide-react";
import { COIN_MANIFEST, type CoinMeta } from "@/lib/coin-manifest";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

// Cohorts available in HyperTracker
const COHORTS = [
  { id: "1", name: "Shrimp", description: "< $1K" },
  { id: "2", name: "Crab", description: "$1K - $10K" },
  { id: "3", name: "Fish", description: "$10K - $100K" },
  { id: "4", name: "Dolphin", description: "$100K - $500K" },
  { id: "5", name: "Shark", description: "$500K - $1M" },
  { id: "6", name: "Whale", description: "$1M - $10M" },
  { id: "7", name: "Megalodon", description: "> $10M" },
];

interface LiquidationAsset {
  coin: string;
  liquidationRiskPercent: number;
  openInterest: number;
  valueAtRisk: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function getRiskLevel(percent: number): { label: string; color: string } {
  if (percent >= 20) return { label: "Critico", color: "bg-danger text-danger-foreground" };
  if (percent >= 10) return { label: "Alto", color: "bg-warning text-warning-foreground" };
  if (percent >= 5) return { label: "Moderado", color: "bg-chart-3/20 text-chart-3" };
  return { label: "Bajo", color: "bg-muted text-muted-foreground" };
}

function getCoinMeta(symbol: string): CoinMeta | undefined {
  return COIN_MANIFEST.find(
    (c) => c.symbol.toUpperCase() === symbol.toUpperCase() ||
           c.hyperliquidSymbol.toUpperCase() === symbol.toUpperCase()
  );
}

export function LiquidationsPanel() {
  const [selectedCohort, setSelectedCohort] = useState("5"); // Default to Shark
  const [searchQuery, setSearchQuery] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    `/api/liquidations?segmentId=${selectedCohort}&limit=100`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      refreshInterval: 300000, // 5 minutes auto-refresh
    }
  );

  const filteredAssets = useMemo(() => {
    if (!data?.data) return [];
    
    let assets: LiquidationAsset[] = data.data;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter((a) => a.coin.toLowerCase().includes(query));
    }
    
    // Sort by risk percent descending
    return assets.sort((a, b) => b.liquidationRiskPercent - a.liquidationRiskPercent);
  }, [data?.data, searchQuery]);

  const cohortInfo = COHORTS.find((c) => c.id === selectedCohort);

  // Check if API key needs setup
  if (data?.requiresSetup) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Info className="size-5 text-warning" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-foreground">Configuracion requerida</h3>
              <p className="text-sm text-muted-foreground">
                {data.message || "Para ver datos de liquidaciones de Hyperliquid, necesitas configurar tu API key de HyperTracker."}
              </p>
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  1. Obtene tu API key en{" "}
                  <a
                    href="https://hypertracker.coinmarketman.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    HyperTracker <ExternalLink className="size-3" />
                  </a>
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Agrega la variable de entorno <code className="rounded bg-muted px-1.5 py-0.5 text-xs">HYPERTRACKER_API_KEY</code> en la configuracion del proyecto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Riesgo de Liquidacion por Asset
          </h2>
          <p className="text-sm text-muted-foreground">
            Porcentaje de interes abierto cerca de liquidacion en Hyperliquid
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cohort selector */}
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Seleccionar cohort" />
            </SelectTrigger>
            <SelectContent>
              {COHORTS.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  <span className="flex items-center gap-2">
                    {cohort.name}
                    <span className="text-xs text-muted-foreground">
                      {cohort.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[180px] pl-9 bg-card border-border"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => mutate()}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Refrescar datos"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Cohort info badge */}
      {cohortInfo && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-card">
            Cohort: {cohortInfo.name} ({cohortInfo.description})
          </Badge>
          {data?.timestamp && (
            <span className="text-xs text-muted-foreground">
              Actualizado: {new Date(data.timestamp).toLocaleTimeString("es-ES")}
            </span>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger text-sm">
          Error al cargar datos de liquidacion. Intenta de nuevo.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Data table */}
      {!isLoading && filteredAssets.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[200px]">Asset</TableHead>
                <TableHead className="text-right">Riesgo Liq. %</TableHead>
                <TableHead className="text-right">Open Interest</TableHead>
                <TableHead className="text-right">Valor en Riesgo</TableHead>
                <TableHead className="text-center">Nivel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => {
                const coinMeta = getCoinMeta(asset.coin);
                const riskLevel = getRiskLevel(asset.liquidationRiskPercent);
                
                return (
                  <TableRow key={asset.coin} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {coinMeta?.image ? (
                          <img
                            src={coinMeta.image}
                            alt={asset.coin}
                            className="size-7 rounded-full"
                          />
                        ) : (
                          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {asset.coin.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground">
                            {asset.coin}
                          </span>
                          {coinMeta?.name && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {coinMeta.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono font-semibold ${
                          asset.liquidationRiskPercent >= 20
                            ? "text-danger"
                            : asset.liquidationRiskPercent >= 10
                            ? "text-warning"
                            : asset.liquidationRiskPercent >= 5
                            ? "text-chart-3"
                            : "text-muted-foreground"
                        }`}
                      >
                        {asset.liquidationRiskPercent.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(asset.openInterest)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(asset.valueAtRisk)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${riskLevel.color} text-xs`}>
                        {asset.liquidationRiskPercent >= 10 && (
                          <AlertTriangle className="size-3 mr-1" />
                        )}
                        {riskLevel.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredAssets.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <TrendingDown className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {searchQuery
              ? "No se encontraron assets con ese nombre."
              : "No hay datos de liquidacion disponibles."}
          </p>
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Riesgo de Liquidacion:</strong>{" "}
              Porcentaje del interes abierto que esta dentro del 25% de su precio de liquidacion.
            </p>
            <p>
              <strong className="text-foreground">Cohorts:</strong>{" "}
              Grupos de traders segmentados por tamano de cuenta (equity).
            </p>
            <p>
              Datos exclusivos de{" "}
              <a
                href="https://hypertracker.coinmarketman.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                HyperTracker
              </a>{" "}
              para el ecosistema Hyperliquid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
