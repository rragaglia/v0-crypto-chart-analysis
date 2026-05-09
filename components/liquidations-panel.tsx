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

// Coin selector specific to Hyperliquid assets, same UX as Analysis tab
function HyperliquidCoinSelector({
  selectedSymbol,
  onSelect,
}: {
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return HYPERLIQUID_COINS;
    const q = search.toLowerCase();
    return HYPERLIQUID_COINS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = selectedSymbol
    ? HYPERLIQUID_COINS.find((c) => c.hyperliquidSymbol === selectedSymbol)
    : null;

  return (
    <Select value={selectedSymbol || ""} onValueChange={onSelect}>
      <SelectTrigger className="w-full md:w-[280px] bg-card border-border">
        <SelectValue>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.image && (
                <img
                  src={selected.image}
                  alt={selected.name}
                  className="size-5 rounded-full"
                />
              )}
              <span className="font-medium">{selected.name}</span>
              <span className="text-muted-foreground text-xs">
                {selected.symbol}
              </span>
            </span>
          ) : (
            "Seleccionar asset..."
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <div className="sticky top-0 bg-popover p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-secondary/50"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filtered.map((coin) => (
          <SelectItem key={coin.id} value={coin.hyperliquidSymbol}>
            <div className="flex items-center gap-2">
              {coin.image && (
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="size-5 rounded-full"
                />
              )}
              <span className="font-medium">{coin.name}</span>
              <span className="text-muted-foreground text-xs">{coin.symbol}</span>
            </div>
          </SelectItem>
        ))}
        {filtered.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No se encontraron resultados
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

// Main Liquidations Data View
function LiquidationsDataView({
  apiKey,
  onDisconnect,
}: {
  apiKey: string;
  onDisconnect: () => void;
}) {
  const [selectedCohort, setSelectedCohort] = useState("5");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const fetcher = useMemo(() => createFetcher(apiKey), [apiKey]);

  // Fetch heatmap when a coin is selected
  const {
    data: heatmapData,
    error: heatmapError,
    isLoading: heatmapLoading,
    mutate: mutateHeatmap,
  } = useSWR(
    selectedSymbol
      ? `/api/liquidations/heatmap?coin=${selectedSymbol}&segmentId=${selectedCohort}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: false }
  );

  // Disconnect if API key is invalid
  useEffect(() => {
    if (heatmapData?.error?.toLowerCase().includes("invalid") ||
        heatmapData?.error?.toLowerCase().includes("unauthorized") ||
        heatmapData?.status === 401) {
      onDisconnect();
    }
  }, [heatmapData, onDisconnect]);

  const selectedCoinMeta = selectedSymbol ? getCoinMeta(selectedSymbol) : null;
  const cohortInfo = COHORTS.find((c) => c.id === selectedCohort);

  return (
    <div className="flex flex-col gap-6">
      {/* Controls bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Liquidaciones Hyperliquid
          </h2>
          <p className="text-sm text-muted-foreground">
            Mapa de liquidaciones por asset y cohort de traders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Asset selector — same UX as Analysis tab */}
          <HyperliquidCoinSelector
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />

          {/* Cohort selector */}
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Cohort" />
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

          {/* Refresh */}
          <button
            onClick={() => mutateHeatmap()}
            disabled={!selectedSymbol}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Refrescar datos"
          >
            <RefreshCw className={`size-4 ${heatmapLoading ? "animate-spin" : ""}`} />
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

      {/* Active filters badge */}
      {(selectedSymbol || cohortInfo) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedCoinMeta && (
            <Badge variant="outline" className="bg-card gap-1.5">
              {selectedCoinMeta.image && (
                <img
                  src={selectedCoinMeta.image}
                  alt={selectedCoinMeta.name}
                  className="size-3.5 rounded-full"
                />
              )}
              {selectedCoinMeta.name}
            </Badge>
          )}
          {cohortInfo && (
            <Badge variant="outline" className="bg-card">
              Cohort: {cohortInfo.name} ({cohortInfo.description})
            </Badge>
          )}
          {heatmapData?.timestamp && (
            <span className="text-xs text-muted-foreground">
              Actualizado: {new Date(heatmapData.timestamp).toLocaleTimeString("es-ES")}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {heatmapError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger text-sm">
          Error al cargar datos. Intenta de nuevo.
        </div>
      )}

      {/* Empty state — no coin selected */}
      {!selectedSymbol && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <TrendingDown className="mx-auto size-12 text-muted-foreground/30" />
          <p className="mt-4 font-medium text-foreground">Selecciona un asset</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige una criptomoneda del selector para ver su mapa de liquidaciones.
          </p>
        </div>
      )}

      {/* Loading */}
      {selectedSymbol && heatmapLoading && (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Heatmap table */}
      {selectedSymbol && !heatmapLoading && heatmapData?.data && (
        <div className="space-y-4">
          {/* Asset header card */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              {selectedCoinMeta?.image && (
                <img
                  src={selectedCoinMeta.image}
                  alt={selectedSymbol}
                  className="size-12 rounded-full"
                />
              )}
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {selectedCoinMeta?.name || selectedSymbol}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedSymbol} &mdash; Mapa de liquidaciones en Hyperliquid
                </p>
              </div>
            </div>
          </div>

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
                No hay datos de liquidacion disponibles para este asset.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Mapa de liquidaciones:</strong>{" "}
              Niveles de precio donde se concentran liquidaciones de longs y shorts.
            </p>
            <p>
              <strong className="text-foreground">Cohorts:</strong>{" "}
              Traders segmentados por tamano de cuenta en Hyperliquid.
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
              &mdash; exclusivo para Hyperliquid.
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
