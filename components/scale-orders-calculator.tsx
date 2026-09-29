"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Copy, Check, BookmarkPlus, Trash2, ArrowDownUp } from "lucide-react";

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

const parseNum = (val: string, fallback: number = 0) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

// Filtro de texto para inputs (Convierte comas a puntos y limpia ceros a la izquierda)
const cleanInput = (val: string) => {
  return val.replace(/,/g, '.').replace(/^0+(?=\d)/, '');
};

export function ScaleOrdersCalculator() {
  const [totalCollateralStr, setTotalCollateralStr] = useState("1000");
  const [totalOrdersStr, setTotalOrdersStr] = useState("100");
  const [strategySizeSkewStr, setStrategySizeSkewStr] = useState("2.0");
  const [startPriceStr, setStartPriceStr] = useState("20");
  const [endPriceStr, setEndPriceStr] = useState("10");
  const [totalSegmentsStr, setTotalSegmentsStr] = useState("4");
  const [currentPriceStr, setCurrentPriceStr] = useState("18");
  
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
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

  const handleOrdersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = cleanInput(e.target.value);
    if (parseInt(val) > 100) val = "100";
    setTotalOrdersStr(val);
  };

  const { segments, allOrders, chartOrders, maxPnL, priceSpan } = useMemo(() => {
    const totalCollateral = parseNum(totalCollateralStr);
    const rawOrders = Math.floor(parseNum(totalOrdersStr));
    const totalOrders = Math.min(Math.max(rawOrders, 1), 100); 
    
    const strategySizeSkew = parseNum(strategySizeSkewStr, 1);
    const startPrice = parseNum(startPriceStr);
    const endPrice = parseNum(endPriceStr);
    const totalSegments = Math.floor(parseNum(totalSegmentsStr, 1));
    const currentPrice = parseNum(currentPriceStr);

    if (
      totalCollateral <= 0 ||
      totalOrders <= 0 ||
      totalSegments <= 0 ||
      startPrice <= 0 ||
      endPrice <= 0
    ) {
      return { segments: [], allOrders: [], chartOrders: [], maxPnL: 0, priceSpan: 0 };
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
    const globalOrders: Order[] = [];
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

        const newOrder: Order = {
          orderNum: globalOrderIndex + 1,
          price: orderPrice,
          collateral,
          relativeSize: finalDistribution[globalOrderIndex],
          status,
        };

        segmentOrders.push(newOrder);
        globalOrders.push(newOrder);
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

    const priceSpan = ((endPrice - startPrice) / startPrice) * 100;
    
    // Cálculo del PnL Máximo (Si llega hasta la orden Final)
    let maxPnLCalc = 0;
    globalOrders.forEach(o => {
      const tokens = o.collateral / o.price;
      if (orderType === "buy") {
        // En Buy, si llegamos a EndPrice, el valor es (endPrice - PrecioEntrada) * tokens (Pérdida)
        maxPnLCalc += (endPrice - o.price) * tokens;
      } else {
        // En Sell, si vendimos todo, la ganancia es (PrecioVenta - PrecioInicio) * tokens (Ganancia)
        maxPnLCalc += (o.price - startPrice) * tokens;
      }
    });

    // Ordenamos SIEMPRE el gráfico de mayor precio a menor precio (Top a Bottom)
    const sortedChartOrders = [...globalOrders].sort((a, b) => b.price - a.price);

    return { segments: resultSegments, allOrders: globalOrders, chartOrders: sortedChartOrders, maxPnL: maxPnLCalc, priceSpan };
  }, [
    totalCollateralStr,
    totalOrdersStr,
    strategySizeSkewStr,
    startPriceStr,
    endPriceStr,
    totalSegmentsStr,
    currentPriceStr,
    orderType,
  ]);

  const activeSegment = segments[selectedSegmentIdx] || segments[0];

  const copySegmentParams = (seg: Segment, index: number) => {
    if (!seg) return;
    const text = `Segmento ${seg.segmentNum}:
Colateral: $${seg.collateral.toFixed(2)}
Desde: $${seg.startPrice.toFixed(5)}
Hasta: $${seg.endPrice.toFixed(5)}
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
        totalCollateral: parseNum(totalCollateralStr),
        totalOrders: Math.min(parseNum(totalOrdersStr), 100),
        strategySizeSkew: parseNum(strategySizeSkewStr),
        startPrice: parseNum(startPriceStr),
        endPrice: parseNum(endPriceStr),
        orderType,
        totalSegments: parseNum(totalSegmentsStr),
        currentPrice: parseNum(currentPriceStr),
      },
    };
    const updated = [newConfig, ...savedConfigs.filter((c) => c.name !== newConfig.name)];
    setSavedConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setConfigName("");
  };

  const handleLoadConfig = (cfg: SavedConfig) => {
    setTotalCollateralStr(cfg.parameters.totalCollateral.toString());
    setTotalOrdersStr(cfg.parameters.totalOrders.toString());
    setStrategySizeSkewStr(cfg.parameters.strategySizeSkew.toString());
    setStartPriceStr(cfg.parameters.startPrice.toString());
    setEndPriceStr(cfg.parameters.endPrice.toString());
    setOrderType(cfg.parameters.orderType);
    setTotalSegmentsStr(cfg.parameters.totalSegments.toString());
    setCurrentPriceStr(cfg.parameters.currentPrice.toString());
  };

  const handleDeleteConfig = (name: string) => {
    const updated = savedConfigs.filter((c) => c.name !== name);
    setSavedConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const maxOrderCollateral = allOrders.length > 0 ? Math.max(...allOrders.map(o => o.collateral)) : 1;
  const isBuy = orderType === "buy";
  
  // Como el gráfico está ordenado de Mayor Precio a Menor Precio:
  const topPriceStr = chartOrders.length > 0 ? chartOrders[0].price : 0;
  const bottomPriceStr = chartOrders.length > 0 ? chartOrders[chartOrders.length - 1].price : 0;
  
  // Verificamos cuál extremo del gráfico es el "Inicio" según el tipo de orden y los precios
  const topIsStart = chartOrders[0]?.price === parseNum(startPriceStr);
  const topLabel = topIsStart ? "Inicio" : "Fin";
  const bottomLabel = topIsStart ? "Fin" : "Inicio";

  return (
    <div className="flex flex-col gap-4">
      {/* TARJETA SUPERIOR: CONFIGURACIÓN PRINCIPAL COMPACTA */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            <CardTitle className="text-sm">Configuración de Scale Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalCollateral" className="text-[10px] uppercase font-bold text-muted-foreground">Colateral ($)</Label>
              <Input id="totalCollateral" type="text" className="h-8 text-xs font-mono" value={totalCollateralStr} onChange={(e) => setTotalCollateralStr(cleanInput(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalOrders" className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                Órdenes <span className="text-[9px] opacity-60 font-normal">(Max 100)</span>
              </Label>
              <Input id="totalOrders" type="text" className="h-8 text-xs font-mono" value={totalOrdersStr} onChange={handleOrdersChange} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="strategySizeSkew" className="text-[10px] uppercase font-bold text-muted-foreground">Size Skew</Label>
              <Input id="strategySizeSkew" type="text" className="h-8 text-xs font-mono" value={strategySizeSkewStr} onChange={(e) => setStrategySizeSkewStr(cleanInput(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="orderType" className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
              <Select value={orderType} onValueChange={(v: "buy" | "sell") => setOrderType(v)}>
                <SelectTrigger id="orderType" className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy" className="text-xs text-success font-bold">BUY</SelectItem>
                  <SelectItem value="sell" className="text-xs text-danger font-bold">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="startPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Inicio ($)</Label>
              <Input id="startPrice" type="text" className="h-8 text-xs font-mono" value={startPriceStr} onChange={(e) => setStartPriceStr(cleanInput(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="endPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Fin ($)</Label>
              <Input id="endPrice" type="text" className="h-8 text-xs font-mono" value={endPriceStr} onChange={(e) => setEndPriceStr(cleanInput(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="totalSegments" className="text-[10px] uppercase font-bold text-muted-foreground">Segmentos</Label>
              <Input id="totalSegments" type="text" className="h-8 text-xs font-mono" value={totalSegmentsStr} onChange={(e) => setTotalSegmentsStr(cleanInput(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="currentPrice" className="text-[10px] uppercase font-bold text-muted-foreground">Actual ($)</Label>
              <Input id="currentPrice" type="text" className={`h-8 text-xs font-mono border-primary/50 bg-primary/5 ${!isBuy ? "border-danger/50 bg-danger/5" : "border-success/50 bg-success/5"}`} value={currentPriceStr} onChange={(e) => setCurrentPriceStr(cleanInput(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIRÁMIDE DE RIESGO Y COLATERAL */}
      {allOrders.length > 0 && (
        <Card className="bg-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="size-4 text-primary" />
              <CardTitle className="text-sm">Pirámide de Riesgo y Distribución</CardTitle>
            </div>
            <Badge variant="outline" className={`font-mono ${maxPnL >= 0 ? "text-success border-success/30 bg-success/10" : "text-danger border-danger/30 bg-danger/10"}`}>
              PnL Latente al llegar a fin: {maxPnL >= 0 ? "+" : "-"}${Math.abs(maxPnL).toFixed(2)}
            </Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-4 items-stretch h-[280px] bg-secondary/20 p-4 rounded-lg border border-border/50">
              
              {/* Etiquetas de Precios Izquierda */}
              <div className="flex flex-col justify-between items-end font-mono text-[11px] text-muted-foreground h-full py-1 pr-2 border-r border-border/50">
                <span>${topPriceStr.toPrecision(5)}</span>
                <div className="flex items-center gap-1 opacity-50">
                  <span>{Math.abs(priceSpan).toFixed(1)}% Rango</span>
                </div>
                <span>${bottomPriceStr.toPrecision(5)}</span>
              </div>

              {/* Contenedor Flex Dinámico para el Gráfico */}
              <div className="flex-1 flex flex-col justify-between h-full">
                {chartOrders.map((order) => {
                  const widthPct = (order.collateral / maxOrderCollateral) * 100;
                  const isExecuted = order.status === "Ejecutable";
                  const spacing = chartOrders.length > 50 ? '0' : '1px';
                  
                  const colorClass = isBuy 
                    ? (isExecuted ? "bg-success" : "bg-success/30 group-hover:bg-success/60")
                    : (isExecuted ? "bg-danger"  : "bg-danger/30 group-hover:bg-danger/60");

                  return (
                    <div 
                      key={`bar-${order.orderNum}`} 
                      className="w-full flex items-center group relative flex-1"
                      style={{ marginBottom: spacing }}
                    >
                      <div 
                        className={`h-full rounded-r-sm transition-all duration-300 ${colorClass}`}
                        style={{ width: `${widthPct}%` }}
                      />
                      <div className="hidden group-hover:flex absolute left-1/2 -translate-x-1/2 -top-8 z-10 bg-popover border border-border text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        Ord #{order.orderNum} | Precio: ${order.price.toPrecision(5)} \vert{} Colateral:${order.collateral.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicador Skew Derecha */}
              <div className="flex flex-col justify-between items-start text-[11px] text-muted-foreground h-full py-1 pl-2 border-l border-border/50">
                <span>{topLabel}</span>
                <div className="flex flex-col items-center opacity-50">
                  <span className="text-[10px] uppercase font-bold">Skew</span>
                  <span className="font-mono font-bold text-foreground">{parseNum(strategySizeSkewStr).toFixed(1)}x</span>
                </div>
                <span>{bottomLabel}</span>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

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
                    const currentPr = parseNum(currentPriceStr);
                    const sp = parseNum(startPriceStr);
                    
                    seg.orders.forEach((order) => {
                      if (order.status === "Ejecutable") {
                        const tokens = order.collateral / order.price;
                        if (isBuy) {
                          segmentPnL += (currentPr - order.price) * tokens;
                        } else {
                          segmentPnL += (order.price - sp) * tokens;
                        }
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
                          ${seg.startPrice.toPrecision(5)} →${seg.endPrice.toPrecision(5)}
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
                      <TableHead className="text-right text-[10px] h-6">PnL Estimado</TableHead>
                      <TableHead className="text-center text-[10px] h-6">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSegment.orders.map((order, i) => {
                      const segmentPercentage = ((order.collateral / activeSegment.collateral) * 100).toFixed(1);
                      let orderPnL = 0;
                      const currentPr = parseNum(currentPriceStr);
                      const sp = parseNum(startPriceStr);
                      
                      if (order.status === "Ejecutable") {
                        const tokens = order.collateral / order.price;
                        if (isBuy) {
                          orderPnL = (currentPr - order.price) * tokens;
                        } else {
                          orderPnL = (order.price - sp) * tokens;
                        }
                      }
                      
                      const isPos = orderPnL >= 0;
                      const pnlText = orderPnL === 0 ? "$0.00" : `${isPos ? "+" : "-"}$${Math.abs(orderPnL).toFixed(2)}`;

                      return (
                        <TableRow key={`order-${i}`} className="border-border/30 hover:bg-secondary/10">
                          <TableCell className="text-muted-foreground font-mono text-[11px] py-1.5">{order.orderNum}</TableCell>
                          <TableCell className="font-mono text-[11px] font-semibold py-1.5">${order.price.toPrecision(5)}</TableCell>
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
                  <div key={cfg.name} className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors">
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