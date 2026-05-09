"use client";

import { useState, useEffect, useMemo } from "react";
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
import { 
  AlertTriangle, 
  TrendingDown, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Info,
  Key,
  Eye,
  EyeOff,
  Check,
  X
} from "lucide-react";
import { COIN_MANIFEST, type CoinMeta } from "@/lib/coin-manifest";

const STORAGE_KEY = "hypertracker-api-key";

// Fetcher that includes API key from header
const createFetcher = (apiKey: string) => async (url: string) => {
  const res = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  });
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

// Get Hyperliquid-supported coins from manifest
const HYPERLIQUID_COINS = COIN_MANIFEST.filter(c => c.hyperliquidSymbol).sort((a, b) => 
  a.symbol.localeCompare(b.symbol)
);

interface LiquidationAsset {
  coin: string;
  liquidationRiskPercent: number;
  openInterest: number;
  valueAtRisk: number;
}

interface HeatmapData {
  price: number;
  longLiquidations: number;
  shortLiquidations: number;
  cumulativeLongs: number;
  cumulativeShorts: number;
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

// API Key Setup Component
function ApiKeySetup({ 
  onApiKeySet 
}: { 
  onApiKeySet: (key: string) => void 
}) {
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputKey.trim()) return;
    
    setIsValidating(true);
    setValidationError(null);
    
    try {
      // Test the API key
      const res = await fetch(`/api/liquidations?segmentId=5&limit=1`, {
        headers: {
          "x-api-key": inputKey.trim(),
        },
      });
      const data = await res.json();
      
      if (data.error?.includes("Invalid") || data.error?.includes("401")) {
        setValidationError("API key invalida. Verifica que la copiaste correctamente.");
        setIsValidating(false);
        return;
      }
      
      // Save to localStorage and notify parent
      localStorage.setItem(STORAGE_KEY, inputKey.trim());
      onApiKeySet(inputKey.trim());
    } catch {
      setValidationError("Error al validar la API key. Intenta de nuevo.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Key className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Conectar HyperTracker
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Para ver datos de liquidaciones de Hyperliquid, ingresa tu API key de HyperTracker.
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground mb-2">Como obtener tu API key:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>
                    Visita{" "}
                    <a
                      href="https://hypertracker.coinmarketman.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      hypertracker.coinmarketman.com <ExternalLink className="size-3" />
                    </a>
                  </li>
                  <li>Crea una cuenta o inicia sesion</li>
                  <li>Ve a Settings {">"} API Keys</li>
                  <li>Genera una nueva API key y copiala</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="Pega tu API key aqui..."
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="pr-10 bg-background"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!inputKey.trim() || isValidating}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        Conectar
                      </>
                    )}
                  </button>
                </div>
                {validationError && (
                  <p className="text-sm text-danger flex items-center gap-1">
                    <X className="size-3" />
                    {validationError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info about the data */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">HyperTracker</strong> provee datos exclusivos 
              de liquidaciones para Hyperliquid, incluyendo riesgo por asset, heatmaps de 
              liquidacion, y metricas por cohort de traders.
            </p>
            <p>
              Tu API key se guarda localmente en tu navegador y nunca se envia a nuestros servidores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Liquidations Data View
function LiquidationsDataView({ 
  apiKey,
  onDisconnect
}: { 
  apiKey: string;
  onDisconnect: () => void;
}) {
  const [selectedCohort, setSelectedCohort] = useState("5"); // Default to Shark
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"overview" | "asset">("overview");

  const fetcher = useMemo(() => createFetcher(apiKey), [apiKey]);

  // Fetch all assets liquidation risk
  const { 
    data: overviewData, 
    error: overviewError, 
    isLoading: overviewLoading, 
    mutate: mutateOverview 
  } = useSWR(
    viewMode === "overview" ? `/api/liquidations?segmentId=${selectedCohort}&limit=100` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch specific asset heatmap
  const { 
    data: heatmapData, 
    error: heatmapError, 
    isLoading: heatmapLoading,
    mutate: mutateHeatmap
  } = useSWR(
    viewMode === "asset" && selectedCoin ? `/api/liquidations/heatmap?coin=${selectedCoin}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Check if API key became invalid
  useEffect(() => {
    if (overviewData?.error?.includes("Invalid") || heatmapData?.error?.includes("Invalid")) {
      onDisconnect();
    }
  }, [overviewData, heatmapData, onDisconnect]);

  const filteredAssets = useMemo(() => {
    if (!overviewData?.data) return [];
    
    let assets: LiquidationAsset[] = overviewData.data;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter((a) => a.coin.toLowerCase().includes(query));
    }
    
    return assets.sort((a, b) => b.liquidationRiskPercent - a.liquidationRiskPercent);
  }, [overviewData?.data, searchQuery]);

  const cohortInfo = COHORTS.find((c) => c.id === selectedCohort);
  const selectedCoinMeta = selectedCoin ? getCoinMeta(selectedCoin) : null;

  const handleSelectAsset = (coin: string) => {
    setSelectedCoin(coin);
    setViewMode("asset");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedCoin(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {viewMode === "overview" 
                ? "Riesgo de Liquidacion" 
                : `Liquidaciones: ${selectedCoin}`}
            </h2>
            {viewMode === "asset" && (
              <button
                onClick={handleBackToOverview}
                className="text-sm text-primary hover:underline"
              >
                Volver al resumen
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {viewMode === "overview"
              ? "Porcentaje de OI cerca de liquidacion en Hyperliquid"
              : `Mapa de liquidaciones para ${selectedCoinMeta?.name || selectedCoin}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "overview" && (
            <>
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
                  className="w-[160px] pl-9 bg-card border-border"
                />
              </div>
            </>
          )}

          {viewMode === "asset" && (
            <Select value={selectedCoin || ""} onValueChange={handleSelectAsset}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue placeholder="Seleccionar asset" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {HYPERLIQUID_COINS.map((coin) => (
                  <SelectItem key={coin.id} value={coin.hyperliquidSymbol}>
                    <span className="flex items-center gap-2">
                      {coin.image && (
                        <img src={coin.image} alt={coin.symbol} className="size-4 rounded-full" />
                      )}
                      {coin.symbol}
                      <span className="text-xs text-muted-foreground">{coin.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Refresh */}
          <button
            onClick={() => viewMode === "overview" ? mutateOverview() : mutateHeatmap()}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Refrescar datos"
          >
            <RefreshCw className={`size-4 ${(overviewLoading || heatmapLoading) ? "animate-spin" : ""}`} />
          </button>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Key className="size-3" />
            Desconectar
          </button>
        </div>
      </div>

      {/* Cohort badge */}
      {viewMode === "overview" && cohortInfo && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-card">
            Cohort: {cohortInfo.name} ({cohortInfo.description})
          </Badge>
          {overviewData?.timestamp && (
            <span className="text-xs text-muted-foreground">
              Actualizado: {new Date(overviewData.timestamp).toLocaleTimeString("es-ES")}
            </span>
          )}
        </div>
      )}

      {/* Error states */}
      {(overviewError || heatmapError) && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger text-sm">
          Error al cargar datos de liquidacion. Intenta de nuevo.
        </div>
      )}

      {/* Overview Mode - All Assets Table */}
      {viewMode === "overview" && (
        <>
          {overviewLoading && (
            <div className="rounded-lg border border-border bg-card">
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          )}

          {!overviewLoading && filteredAssets.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[200px]">Asset</TableHead>
                    <TableHead className="text-right">Riesgo Liq. %</TableHead>
                    <TableHead className="text-right">Open Interest</TableHead>
                    <TableHead className="text-right">Valor en Riesgo</TableHead>
                    <TableHead className="text-center">Nivel</TableHead>
                    <TableHead className="text-center w-[100px]">Accion</TableHead>
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
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleSelectAsset(asset.coin)}
                            className="text-xs text-primary hover:underline"
                          >
                            Ver detalle
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!overviewLoading && !overviewError && filteredAssets.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <TrendingDown className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {searchQuery
                  ? "No se encontraron assets con ese nombre."
                  : "No hay datos de liquidacion disponibles."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Asset Mode - Heatmap View */}
      {viewMode === "asset" && selectedCoin && (
        <>
          {heatmapLoading && (
            <div className="rounded-lg border border-border bg-card p-8">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="size-8 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando datos de liquidacion...</p>
              </div>
            </div>
          )}

          {!heatmapLoading && heatmapData?.data && (
            <div className="space-y-4">
              {/* Asset header */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  {selectedCoinMeta?.image && (
                    <img 
                      src={selectedCoinMeta.image} 
                      alt={selectedCoin} 
                      className="size-12 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedCoinMeta?.name || selectedCoin}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCoin} - Mapa de liquidaciones Hyperliquid
                    </p>
                  </div>
                </div>
              </div>

              {/* Heatmap data table */}
              {Array.isArray(heatmapData.data) && heatmapData.data.length > 0 ? (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Precio</TableHead>
                        <TableHead className="text-right text-danger">Liq. Longs</TableHead>
                        <TableHead className="text-right text-success">Liq. Shorts</TableHead>
                        <TableHead className="text-right">Acum. Longs</TableHead>
                        <TableHead className="text-right">Acum. Shorts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(heatmapData.data as HeatmapData[]).slice(0, 50).map((row, i) => (
                        <TableRow key={i} className="hover:bg-muted/10">
                          <TableCell className="font-mono font-medium">
                            ${row.price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-danger">
                            {formatCurrency(row.longLiquidations)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatCurrency(row.shortLiquidations)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {formatCurrency(row.cumulativeLongs)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {formatCurrency(row.cumulativeShorts)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <Info className="mx-auto size-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No hay datos de heatmap disponibles para este asset.
                  </p>
                </div>
              )}
            </div>
          )}

          {!heatmapLoading && !heatmapData?.data && !heatmapError && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Info className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Selecciona un asset para ver su mapa de liquidaciones.
              </p>
            </div>
          )}
        </>
      )}

      {/* Info footer */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Riesgo de Liquidacion:</strong>{" "}
              Porcentaje del OI dentro del 25% de su precio de liquidacion.
            </p>
            <p>
              <strong className="text-foreground">Cohorts:</strong>{" "}
              Traders segmentados por tamano de cuenta.
            </p>
            <p>
              Datos de{" "}
              <a
                href="https://hypertracker.coinmarketman.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                HyperTracker
              </a>{" "}
              - exclusivo para Hyperliquid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function LiquidationsPanel() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setApiKey(stored);
    }
    setIsLoading(false);
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!apiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return (
    <LiquidationsDataView 
      apiKey={apiKey} 
      onDisconnect={handleDisconnect}
    />
  );
}
