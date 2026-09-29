"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CoinSelector } from "@/components/coin-selector";
import { Calculator, Copy, Check, Info, Layers, BookmarkPlus, Trash2, ArrowDownUp, RefreshCw } from "lucide-react";

interface Order {
  orderNum: number;
  price: number;
  collateral: number;
  relativeSize: number;
  status: "Ejecutable" | "Pendiente";
}

interface Segment {
  segmentNum: number;
  startPrice: number;
  endPrice: number;
  collateral: number;
  orderCount: number;
  sizeSkew: number;
  percentage: string;
  status: string;
  orders: Order[];
}

interface SavedConfig {
  name: string;
  date: string;
  timestamp: number;
  parameters: {
    totalCollateral: number;
    totalOrders: number;
    strategySizeSkew: number;
    startPrice: number;
    endPrice: number;
    orderType: "buy" | "sell";
    totalSegments: number;
    currentPrice: number;
  };
}

const STORAGE_KEY = "crypto-scale-configurations";

function calculateSizeDistribution(numOrders: number, sizeSkew: number): number[] {
  if (numOrders <= 0) return [];
  const sizes: number[] = [];
  if (Math.abs(sizeSkew - 1) < 0.001 || numOrders === 1) {
    for (let i = 0; i < numOrders; i++) sizes.push(1);
  } else {
    const growthFactor = Math.pow(sizeSkew, 1 / (numOrders - 1));
    for (let i = 0; i < numOrders; i++) {
      sizes.push(Math.pow(growthFactor, i));
    }
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  return sizes.map((size) => size / total);
}

export function ScaleOrdersCalculator({ coins }: { coins: any[] }) {
  const [selectedCoinId, setSelectedCoinId] = useState("bitcoin");
  const [totalCollateral, setTotalCollateral] = useState<number>(1000);
  const [totalOrders, setTotalOrders] = useState<number>(100);
  const [strategySizeSkew, setStrategySizeSkew] = useState<number>(2.0);
  const [startPrice, setStartPrice] = useState<number>(20);
  const [endPrice, setEndPrice] = useState<number>(10);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [totalSegments, setTotalSegments] = useState<number>(4);
  const [currentPrice, setCurrentPrice] = useState<number>(18);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(0);

  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [configName, setConfigName] = useState("");
  const [copied, setCopied] = useState(false);

  // Cargar configuraciones guardadas
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedConfigs(JSON.parse(stored));
    } catch {
      // Ignorar errores en localStorage
    }
  }, []);

  // Al elegir cripto, actualizar precio actual y sugerir rangos
  const handleCoinChange = (coinId: string) => {
    setSelectedCoinId(coinId);
    const coin = coins?.find((c) => c.id === coinId);
    if (coin && coin.current_price > 0) {
      const p = coin.current_price;
      setCurrentPrice(p);
      if (orderType === "buy") {
        setStartPrice(Number((p * 0.98).toPrecision(5)));
        setEndPrice(Number((p * 0.75).toPrecision(5)));
      } else {
        setStartPrice(Number((p * 1.02).toPrecision(5)));
        setEndPrice(Number((p * 1.30).toPrecision(5)));
      }
    }
  };

  // Cálculo de segmentos y órdenes
  const { segments, totalCalculatedCollateral } = useMemo(() => {
    if (
      totalCollateral <= 0 ||
      totalOrders <= 0 ||
      totalSegments <= 0 ||
      startPrice <= 0 ||
      endPrice <= 0
    ) {
      return { segments: [], totalCalculatedCollateral: 0 };
    }

    const fullSizeDistribution = calculateSizeDistribution(totalOrders, strategySizeSkew);
    const minCollateralPerOrder = totalCollateral * 0.001;
    const adjustedDistribution = fullSizeDistribution.map((size) => {
      const collateral = totalCollateral * size;
      return collateral < minCollateralPerOrder ? minCollateralPerOrder / totalCollateral : size;
    });
    const adjustedTotal = adjustedDistribution.reduce((a, b) => a + b, 0);
    const finalDistribution = adjustedDistribution.map((size) => size / adjustedTotal);

    const ordersPerSegment = Math.floor(totalOrders / totalSegments);
    const extraOrders = totalOrders % totalSegments;

    const resultSegments: Segment[] = [];
    let orderIndex = 0;
    let runningCollateral = 0;

    for (let segmentNum = 1; segmentNum <= totalSegments; segmentNum++) {
      let segmentOrderCount = ordersPerSegment;
      if (segmentNum <= extraOrders) segmentOrderCount += 1;

      const priceRange = Math.abs(endPrice - startPrice);
      const segmentPriceRange = priceRange / totalSegments;

      let segStartPrice: number;
      let segEndPrice: number;
      if (startPrice > endPrice) {
        segStartPrice = startPrice - (segmentNum - 1) * segmentPriceRange;
        segEndPrice = startPrice - segmentNum * segmentPriceRange;
      } else {
        segStartPrice = startPrice + (segmentNum - 1) * segmentPriceRange;
        segEndPrice = startPrice + segmentNum * segmentPriceRange;
      }

      let segmentCollateral = 0;
      const segmentOrders: Order[] = [];

      for (let i = 0; i < segmentOrderCount; i++) {
        const globalOrderIndex = orderIndex + i;
        let collateral = totalCollateral * finalDistribution[globalOrderIndex];
        collateral = Math.max(collateral, 1.0);
        segmentCollateral += collateral;

        const orderPriceStep =
          segmentOrderCount === 1 ? 0 : (segEndPrice - segStartPrice) / (segmentOrderCount - 1);
        const orderPrice = segStartPrice + orderPriceStep * i;

        let status: "Ejecutable" | "Pendiente" = "Pendiente";
        if (orderType === "buy" && currentPrice <= orderPrice) {
          status = "Ejecutable";
        } else if (orderType === "sell" && currentPrice >= orderPrice) {
          status = "Ejecutable";
        }

        segmentOrders.push({
          orderNum: globalOrderIndex + 1,
          price: orderPrice,
          collateral,
          relativeSize: finalDistribution[globalOrderIndex],
          status,
        });
      }

      const executableOrders = segmentOrders.filter((o) => o.status === "Ejecutable").length;
      const segmentStatus =
        executableOrders > 0
          ? `${executableOrders}/${segmentOrderCount} Listas`
          : "Pendiente";

      let segmentSizeSkew = 1;
      if (segmentOrderCount > 1) {
        const firstOrderCollateral = segmentOrders[0].collateral;
        const lastOrderCollateral = segmentOrders[segmentOrderCount - 1].collateral;
        segmentSizeSkew = lastOrderCollateral / firstOrderCollateral;
      }

      runningCollateral += segmentCollateral;

      resultSegments.push({
        segmentNum,
        startPrice: segStartPrice,
        endPrice: segEndPrice,
        collateral: segmentCollateral,
        orderCount: segmentOrderCount,
        sizeSkew: segmentSizeSkew,
        percentage: ((segmentCollateral / totalCollateral) * 100).toFixed(1),
        status: segmentStatus,
        orders: segmentOrders,
      });

      orderIndex += segmentOrderCount;
    }

    return { segments: resultSegments, totalCalculatedCollateral: runningCollateral };
  }, [
    totalCollateral,
    totalOrders,
    strategySizeSkew,
    startPrice,
    endPrice,
    totalSegments,
    currentPrice,
    orderType,
  ]);

  const activeSegment = segments[selectedSegmentIdx] || segments[0];

  const copySegmentParams = (seg: Segment) => {
    if (!seg) return;
    const text = `Segmento ${seg.segmentNum}:
Colateral: $${seg.collateral.toFixed(2)}
Desde: $${seg.startPrice.toFixed(4)}
Hasta: $${seg.endPrice.toFixed(4)}
Órdenes: ${seg.orderCount}
Size Skew: ${seg.sizeSkew.toFixed(3)}
Tipo: ${orderType.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    if (!configName.trim()) return;
    const newConfig: SavedConfig = {
      name: configName.trim(),
      date: new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      parameters: {
        totalCollateral,
        totalOrders,
        strategySizeSkew,
        startPrice,
        endPrice,
        orderType,
        totalSegments,
        currentPrice,
      },
    };
    const updated = [newConfig, ...savedConfigs.filter((c) => c.name !== newConfig.name)];
    setSavedConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setConfigName("");
  };

  const handleLoadConfig = (cfg: SavedConfig) => {
    setTotalCollateral(cfg.parameters.totalCollateral);
    setTotalOrders(cfg.parameters.totalOrders);
    setStrategySizeSkew(cfg.parameters.strategySizeSkew);
    setStartPrice(cfg.parameters.startPrice);
    setEndPrice(cfg.parameters.endPrice);
    setOrderType(cfg.parameters.orderType);
    setTotalSegments(cfg.parameters.totalSegments);
    setCurrentPrice(cfg.parameters.currentPrice);
  };

  const handleDeleteConfig = (name: string) => {
    const updated = savedConfigs.filter((c) => c.name !== name);
    setSavedConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* TARJETA SUPERIOR: CONFIGURACIÓN PRINCIPAL */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            <CardTitle className="text-lg">Calculadora Scale por Segmentos</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Autocompletar con:</span>
            {coins && (
              <div className="w-[180px]">
                <CoinSelector coins={coins} selectedCoinId={selectedCoinId} onSelect={handleCoinChange} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalCollateral" className="text-xs font-semibold">Colateral Total ($)</Label>
              <Input
                id="totalCollateral"
                type="number"
                step="10"
                value={totalCollateral}
                onChange={(e) => setTotalCollateral(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalOrders" className="text-xs font-semibold">Total Órdenes</Label>
              <Input
                id="totalOrders"
                type="number"
                min="1"
                value={totalOrders}
                onChange={(e) => setTotalOrders(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="strategySizeSkew" className="text-xs font-semibold">Size Skew</Label>
              <Input
                id="strategySizeSkew"
                type="number"
                step="0.1"
                min="0.1"
                value={strategySizeSkew}
                onChange={(e) => setStrategySizeSkew(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orderType" className="text-xs font-semibold">Tipo de Orden</Label>
              <Select value={orderType} onValueChange={(v: "buy" | "sell") => setOrderType(v)}>
                <SelectTrigger id="orderType" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">BUY (Long / Compra)</SelectItem>
                  <SelectItem value="sell">SELL (Short / Venta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startPrice" className="text-xs font-semibold">Precio Inicial ($)</Label>
              <Input
                id="startPrice"
                type="number"
                step="any"
                value={startPrice}
                onChange={(e) => setStartPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endPrice" className="text-xs font-semibold">Precio Final ($)</Label>
              <Input
                id="endPrice"
                type="number"
                step="any"
                value={endPrice}
                onChange={(e) => setEndPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalSegments" className="text-xs font-semibold">Segmentos</Label>
              <Input
                id="totalSegments"
                type="number"
                min="1"
                max="20"
                value={totalSegments}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setTotalSegments(val);
                  if (selectedSegmentIdx >= val) setSelectedSegmentIdx(0);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPrice" className="text-xs font-semibold">Precio Actual ($)</Label>
              <Input
                id="currentPrice"
                type="number"
                step="any"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Size Skew:</strong> Proporción entre el tamaño de la última orden vs la primera. Un Skew de 2.0 hace que la orden final sea el doble de grande que la inicial. Skew 1.0 reparte el capital uniformemente.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESQUEMA VISUAL DE DISTRIBUCIÓN POR SEGMENTOS */}
      {segments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <CardTitle className="text-base">Esquema Visual de Segmentos</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                Colateral total distribuido: ${totalCalculatedCollateral.toFixed(2)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {segments.map((seg, idx) => {
                const isSelected = selectedSegmentIdx === idx;
                const isExecutable = seg.status.includes("Listas");
                return (
                  <div
                    key={`seg-box-${seg.segmentNum}`}
                    onClick={() => setSelectedSegmentIdx(idx)}
                    className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/60 bg-card hover:border-border hover:bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">
                        Segmento {seg.segmentNum}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          isExecutable
                            ? "bg-success/15 text-success border-success/30 text-[10px]"
                            : "bg-muted/30 text-muted-foreground text-[10px]"
                        }
                      >
                        {seg.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground font-mono">
                      ${seg.startPrice.toFixed(2)} →${seg.endPrice.toFixed(2)}
                    </div>

                    <div className="flex items-center justify-between text-xs mt-1 pt-2 border-t border-border/40">
                      <span className="font-bold text-foreground">${seg.collateral.toFixed(2)}</span>
                      <span className="text-muted-foreground">{seg.percentage}%</span>
                      <span className="text-muted-foreground">{seg.orderCount} ord.</span>
                    </div>

                    {/* Barra de progreso de colateral */}
                    <div className="w-full bg-secondary/60 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${Math.min(100, parseFloat(seg.percentage) * 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETALLE Y PARÁMETROS PARA LA PLATAFORMA DEL SEGMENTO SELECCIONADO */}
      {activeSegment && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Parámetros para la Plataforma — Segmento {activeSegment.segmentNum}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copia estos valores directamente en tu exchange (Hyperliquid, Binance, etc.)
              </p>
            </div>
            <button
              onClick={() => copySegmentParams(activeSegment)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-fit"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar Parámetros"}
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Colateral</span>
                <span className="text-base font-black text-foreground font-mono mt-0.5">
                  ${activeSegment.collateral.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Desde</span>
                <span className="text-base font-black text-foreground font-mono mt-0.5">
                  ${activeSegment.startPrice.toFixed(4)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Hasta</span>
                <span className="text-base font-black text-foreground font-mono mt-0.5">
                  ${activeSegment.endPrice.toFixed(4)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Órdenes</span>
                <span className="text-base font-black text-foreground font-mono mt-0.5">
                  {activeSegment.orderCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Size Skew</span>
                <span className="text-base font-black text-foreground font-mono mt-0.5">
                  {activeSegment.sizeSkew.toFixed(3)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Tipo</span>
                <span className={`text-base font-black uppercase mt-0.5 ${orderType === "buy" ? "text-success" : "text-danger"}`}>
                  {orderType}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABLA RESUMEN DE TODOS LOS SEGMENTOS */}
      {segments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tabla General de Segmentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-12 font-bold">Seg.</TableHead>
                    <TableHead>Rango Precios</TableHead>
                    <TableHead className="text-right">Colateral</TableHead>
                    <TableHead className="text-center">Órdenes</TableHead>
                    <TableHead className="text-center">Size Skew</TableHead>
                    <TableHead className="text-center">% Total</TableHead>
                    <TableHead className="text-right">PnL Estimado</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right w-24">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((seg, idx) => {
                    let segmentPnL = 0;
                    seg.orders.forEach((order) => {
                      if (order.status === "Ejecutable") {
                        const priceDiff =
                          orderType === "buy" ? currentPrice - order.price : order.price - currentPrice;
                        const tokens = order.collateral / order.price;
                        segmentPnL += tokens * priceDiff;
                      }
                    });

                    const isPos = segmentPnL >= 0;
                    const pnlText = `${isPos ? "+" : "-"}$${Math.abs(segmentPnL).toFixed(2)}`;
                    const isSelected = selectedSegmentIdx === idx;

                    return (
                      <TableRow
                        key={`seg-row-${seg.segmentNum}`}
                        className={`border-border/30 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <TableCell className="font-bold">{seg.segmentNum}</TableCell>
                        <TableCell className="font-mono text-xs">
                          ${seg.startPrice.toFixed(2)} →${seg.endPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${seg.collateral.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">{seg.orderCount}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{seg.sizeSkew.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold text-xs">{seg.percentage}%</TableCell>
                        <TableCell className={`text-right font-mono font-bold text-xs ${isPos ? "text-success" : "text-danger"}`}>
                          {pnlText}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              seg.status.includes("Listas")
                                ? "bg-success/15 text-success border-success/30 text-xs"
                                : "bg-muted/40 text-muted-foreground text-xs"
                            }
                          >
                            {seg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => setSelectedSegmentIdx(idx)}
                            className="px-2.5 py-1 text-xs rounded border border-border bg-card text-foreground hover:bg-accent transition-colors"
                          >
                            Ver
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETALLES DE LAS ÓRDENES DEL SEGMENTO SELECCIONADO */}
      {activeSegment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Órdenes Individuales del Segmento {activeSegment.segmentNum}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Precio Orden</TableHead>
                    <TableHead className="text-right">Colateral</TableHead>
                    <TableHead className="text-center">% Seg.</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSegment.orders.map((order, i) => {
                    const segmentPercentage = (
                      (order.collateral / activeSegment.collateral) * 100
                    ).toFixed(1);

                    let orderPnL = 0;
                    if (order.status === "Ejecutable") {
                      const priceDiff =
                        orderType === "buy" ? currentPrice - order.price : order.price - currentPrice;
                      const tokens = order.collateral / order.price;
                      orderPnL = tokens * priceDiff;
                    }
                    const isPos = orderPnL >= 0;
                    const pnlText =
                      orderPnL === 0 ? "$0.00" : `${isPos ? "+" : "-"}$${Math.abs(orderPnL).toFixed(2)}`;

                    return (
                      <TableRow key={`order-${i}`} className="border-border/30">
                        <TableCell className="text-muted-foreground font-mono text-xs">{order.orderNum}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">${order.price.toFixed(4)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">${order.collateral.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">{segmentPercentage}%</TableCell>
                        <TableCell className={`text-right font-mono text-xs font-bold ${orderPnL === 0 ? "text-muted-foreground" : isPos ? "text-success" : "text-danger"}`}>
                          {pnlText}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              order.status === "Ejecutable"
                                ? "bg-success/15 text-success border-success/30 text-[11px]"
                                : "bg-muted/30 text-muted-foreground text-[11px]"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GUARDAR Y CARGAR CONFIGURACIONES */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="size-4 text-primary" />
            <CardTitle className="text-base">Guardar y Cargar Configuraciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nombre de la estrategia..."
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="max-w-xs"
            />
            <button
              onClick={handleSaveConfig}
              className="px-3 py-2 text-xs font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Guardar
            </button>
          </div>

          {savedConfigs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedConfigs.map((cfg) => (
                <div
                  key={cfg.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/20"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground">{cfg.name}</span>
                    <span className="text-[10px] text-muted-foreground">{cfg.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadConfig(cfg)}
                      className="px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      Cargar
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(cfg.name)}
                      className="p-1 text-muted-foreground hover:text-danger transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No hay configuraciones guardadas aún.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}