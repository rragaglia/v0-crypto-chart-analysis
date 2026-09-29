"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CoinSelector } from "@/components/coin-selector";
import { Calculator, Copy, Check, Info, BookmarkPlus, Trash2 } from "lucide-react";

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
  const [copiedSegment, setCopiedSegment] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedConfigs(JSON.parse(stored));
    } catch {
      // Ignorar errores en localStorage
    }
  }, []);

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

  const { segments } = useMemo(() => {
    if (
      totalCollateral <= 0 ||
      totalOrders <= 0 ||
      totalSegments <= 0 ||
      startPrice <= 0 ||
      endPrice <= 0
    ) {
      return { segments: [] };
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

    return { segments: resultSegments };
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

  const copySegmentParams = (seg: Segment, index: number) => {
    if (!seg) return;
    const text = `Segmento ${seg.segmentNum}:
Colateral: $${seg.collateral.toFixed(2)}
Desde: $${seg.startPrice.toFixed(4)}
Hasta: $${seg.endPrice.toFixed(4)}
Órdenes: ${seg.orderCount}
Size Skew: ${seg.sizeSkew.toFixed(3)}
Tipo: ${orderType.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedSegment(index);
    setTimeout(() => setCopiedSegment(null), 2000);
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
    <div className="flex flex-col gap-4">
      {/* TARJETA SUPERIOR: CONFIGURACIÓN PRINCIPAL COMPACTA */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            <CardTitle className="text-sm">Configuración de Scale</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {coins && (
              <div className="w-[160px]">
                <CoinSelector coins={coins} selectedCoinId={selectedCoinId} onSelect={handleCoinChange} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalCollateral" className="text-[10px] uppercase font-bold text-muted-foreground">Colateral ($)</Label>
              <Input id="totalCollateral" type="number" className="h-8 text-xs font-mono" step="10" value={totalCollateral} onChange={(e) => setTotalCollateral(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalOrders" className="text-[10px] uppercase font-bold text-muted-foreground">Órdenes</Label>
              <Input id="totalOrders" type="number" className="h-8 text-xs font-mono" min="1" value={totalOrders} onChange={(e) => setTotalOrders(parseInt(e.target.value) || 1)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="strategySizeSkew" className="text-[10px] uppercase font-bold text-muted-foreground">Size Skew</Label>
              <Input id="strategySizeSkew" type="number" className="h-8 text-xs font-mono" step="0.1" min="0.1" value={strategySizeSkew} onChange={(e) => setStrategySizeSkew(parseFloat(e.target.value) || 1)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="orderType" className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
              <Select value={orderType} onValueChange={(v: "buy" | "sell") => setOrderType(v)}>
                <SelectTrigger id="orderType" className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy" className="text-xs">BUY</SelectItem>
                  <SelectItem value="sell" className="text-xs">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="startPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Inicio ($)</Label>
              <Input id="startPrice" type="number" className="h-8 text-xs font-mono" step="any" value={startPrice} onChange={(e) => setStartPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="endPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Fin ($)</Label>
              <Input id="endPrice" type="number" className="h-8 text-xs font-mono" step="any" value={endPrice} onChange={(e) => setEndPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalSegments" className="text-[10px] uppercase font-bold text-muted-foreground">Segmentos</Label>
              <Input id="totalSegments" type="number" className="h-8 text-xs font-mono" min="1" max="20" value={totalSegments} onChange={(e) => { const val = parseInt(e.target.value) || 1; setTotalSegments(val); if (selectedSegmentIdx >= val) setSelectedSegmentIdx(0); }} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="currentPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Actual ($)</Label>
              <Input id="currentPrice" type="number" className="h-8 text-xs font-mono border-primary/50 bg-primary/5" step="any" value={currentPrice} onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <Info className="size-3 text-primary shrink-0" />
            <span><strong>Size Skew:</strong> Proporción de tamaño entre la última orden y la primera (ej. 2.0 = el doble de grande).</span>
          </div>
        </CardContent>
      </Card>

      {/* TABLA GENERAL DE SEGMENTOS */}
      {segments.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Tabla General de Segmentos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-12 font-bold text-xs h-8">Seg.</TableHead>
                    <TableHead className="text-xs h-8">Rango Precios</TableHead>
                    <TableHead className="text-right text-xs h-8">Colateral</TableHead>
                    <TableHead className="text-center text-xs h-8">Órdenes</TableHead>
                    <TableHead className="text-center text-xs h-8">Skew</TableHead>
                    <TableHead className="text-center text-xs h-8">% Total</TableHead>
                    <TableHead className="text-right text-xs h-8">PnL Estimado</TableHead>
                    <TableHead className="text-center text-xs h-8">Estado</TableHead>
                    <TableHead className="text-right w-[140px] text-xs h-8">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((seg, idx) => {
                    let segmentPnL = 0;
                    seg.orders.forEach((order) => {
                      if (order.status === "Ejecutable") {
                        const priceDiff = orderType === "buy" ? currentPrice - order.price : order.price - currentPrice;
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
                        className={`border-border/30 transition-colors ${isSelected ? "bg-primary/10" : ""}`}
                      >
                        <TableCell className="font-bold text-xs py-2">{seg.segmentNum}</TableCell>
                        <TableCell className="font-mono text-xs py-2">
                          ${seg.startPrice.toFixed(4)} →${seg.endPrice.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-xs py-2">
                          ${seg.collateral.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center text-xs py-2">{seg.orderCount}</TableCell>
                        <TableCell className="text-center font-mono text-xs py-2">{seg.sizeSkew.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold text-xs py-2">{seg.percentage}%</TableCell>
                        <TableCell className={`text-right font-mono font-bold text-xs py-2 ${isPos ? "text-success" : "text-danger"}`}>
                          {pnlText}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge variant="outline" className={seg.status.includes("Listas") ? "bg-success/15 text-success border-success/30 text-[10px]" : "bg-muted/40 text-muted-foreground text-[10px]"}>
                            {seg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-2 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copySegmentParams(seg, idx)}
                            className="inline-flex items-center justify-center size-6 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Copiar parámetros al exchange"
                          >
                            {copiedSegment === idx ? <Check className="size-3" /> : <Copy className="size-3" />}
                          </button>
                          <button
                            onClick={() => setSelectedSegmentIdx(idx)}
                            className="px-2 py-1 text-[10px] rounded border border-border bg-card text-foreground hover:bg-accent transition-colors"
                          >
                            Ver Órdenes
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DETALLES DE LAS ÓRDENES DEL SEGMENTO SELECCIONADO */}
        {activeSegment && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Desglose Segmento {activeSegment.segmentNum}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="overflow-x-auto max-h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-12 text-[10px] h-6">#</TableHead>
                      <TableHead className="text-[10px] h-6">Precio</TableHead>
                      <TableHead className="text-right text-[10px] h-6">Colateral</TableHead>
                      <TableHead className="text-center text-[10px] h-6">% Seg.</TableHead>
                      <TableHead className="text-right text-[10px] h-6">PnL</TableHead>
                      <TableHead className="text-center text-[10px] h-6">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSegment.orders.map((order, i) => {
                      const segmentPercentage = ((order.collateral / activeSegment.collateral) * 100).toFixed(1);
                      let orderPnL = 0;
                      if (order.status === "Ejecutable") {
                        const priceDiff = orderType === "buy" ? currentPrice - order.price : order.price - currentPrice;
                        const tokens = order.collateral / order.price;
                        orderPnL = tokens * priceDiff;
                      }
                      const isPos = orderPnL >= 0;
                      const pnlText = orderPnL === 0 ? "$0.00" : `${isPos ? "+" : "-"}$${Math.abs(orderPnL).toFixed(2)}`;

                      return (
                        <TableRow key={`order-${i}`} className="border-border/30">
                          <TableCell className="text-muted-foreground font-mono text-[11px] py-1.5">{order.orderNum}</TableCell>
                          <TableCell className="font-mono text-[11px] font-semibold py-1.5">${order.price.toFixed(4)}</TableCell>
                          <TableCell className="text-right font-mono text-[11px] py-1.5">${order.collateral.toFixed(2)}</TableCell>
                          <TableCell className="text-center font-mono text-[11px] text-muted-foreground py-1.5">{segmentPercentage}%</TableCell>
                          <TableCell className={`text-right font-mono text-[11px] font-bold py-1.5 ${orderPnL === 0 ? "text-muted-foreground" : isPos ? "text-success" : "text-danger"}`}>
                            {pnlText}
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Badge variant="outline" className={order.status === "Ejecutable" ? "bg-success/15 text-success border-success/30 text-[9px] py-0 leading-tight" : "bg-muted/30 text-muted-foreground text-[9px] py-0 leading-tight"}>
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
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="size-4 text-primary" />
              <CardTitle className="text-sm">Configuraciones Guardadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nombre..."
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="h-8 text-xs"
              />
              <button
                onClick={handleSaveConfig}
                className="px-3 h-8 text-xs font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Guardar
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {savedConfigs.length > 0 ? (
                savedConfigs.map((cfg) => (
                  <div key={cfg.name} className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-secondary/20">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[120px]">{cfg.name}</span>
                      <span className="text-[9px] text-muted-foreground">{cfg.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleLoadConfig(cfg)} className="px-2 py-1 text-[10px] rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                        Cargar
                      </button>
                      <button onClick={() => handleDeleteConfig(cfg.name)} className="p-1 text-muted-foreground hover:text-danger transition-colors">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground italic mt-2">No hay estrategias guardadas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}