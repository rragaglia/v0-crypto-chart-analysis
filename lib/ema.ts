export interface PricePoint {
  timestamp: number;
  price: number;
  date: string;
}

export interface EmaData {
  period: number;
  values: { timestamp: number; value: number }[];
  currentValue: number;
  label: string;
  color: string;
  type: "rapida" | "lenta";
  slopeDailyPct: number; // NUEVO: % de cambio diario suavizado
  score: number;         // NUEVO: Puntaje basado en la matriz
}

export interface EmaAnalysis {
  ema: EmaData;
  currentPrice: number;
  difference: number;
  percentageDiff: number;
  position: "above" | "below";
  characteristic: string;
  severity: "bullish" | "neutral-bullish" | "warning" | "bearish" | "neutral";
}

export interface MarketSummary {
  label: string;
  description: string;
  severity: "bullish" | "neutral-bullish" | "warning" | "bearish" | "neutral";
}

export function calculateEMA(
  prices: number[],
  period: number
): number[] {
  if (prices.length < period) return [];

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
    ema.push(0);
  }
  ema[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    const value = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(value);
  }

  return ema;
}

const EMA_CONFIGS = [
  { period: 20, label: "EMA 20", color: "var(--chart-1)", type: "rapida" as const },
  { period: 50, label: "EMA 50", color: "var(--chart-2)", type: "rapida" as const },
  { period: 100, label: "EMA 100", color: "var(--chart-3)", type: "lenta" as const },
  { period: 200, label: "EMA 200", color: "var(--chart-4)", type: "lenta" as const },
];

// ─── MATRIZ DE PUNTAJES ──────────────────────────────────────────────────────
// Ajusta los valores de "return" y los umbrales para que coincidan 
// exactamente con los de tu imagen.
function getEmaScore(period: number, slopePct: number): number {
  if (period === 20) {
    if (slopePct >= 1) return 10;
    if (slopePct >= 0.4) return 5;
    if (slopePct > 0) return 2;
    if (slopePct <= -1) return -10;
    if (slopePct <= -0.4) return -5;
    return -2; // slope < 0
  }
  else if (period === 50) {
    if (slopePct >= 0.75) return 15;
    if (slopePct >= 0.28) return 8;
    if (slopePct > 0) return 3;
    if (slopePct <= -0.75) return -15;
    if (slopePct <= -0.28) return -8;
    return -3;
  }
  else if (period === 100) {
    if (slopePct >= 0.55) return 20;
    if (slopePct >= 0.2) return 10;
    if (slopePct > 0) return 4;
    if (slopePct <= -0.55) return -20;
    if (slopePct <= -0.2) return -10;
    return -4;
  }
  else if (period === 200) {
    if (slopePct >= 0.42) return 25;
    if (slopePct >= 0.15) return 15;
    if (slopePct > 0) return 5;
    if (slopePct <= -0.42) return -25;
    if (slopePct <= -0.15) return -15;
    return -5;
  }
  return 0;
}

export function processEmaData(
  priceData: [number, number][]
): { pricePoints: PricePoint[]; emas: EmaData[] } {
  if (!priceData || priceData.length === 0) {
    return { pricePoints: [], emas: [] };
  }

  const pricePoints: PricePoint[] = priceData.map(([timestamp, price]) => ({
    timestamp,
    price,
    date: new Date(timestamp).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));

  const rawPrices = pricePoints.map((p) => p.price);
  const currentPrice = rawPrices[rawPrices.length - 1] || 0;

  const emas: EmaData[] = EMA_CONFIGS
    .filter((config) => rawPrices.length >= config.period)
    .map((config) => {
      const emaValues = calculateEMA(rawPrices, config.period);
      const values = pricePoints
        .map((p, i) => ({
          timestamp: p.timestamp,
          value: emaValues[i] || 0,
        }))
        .filter((v) => v.value > 0);

      const emaCurrent = emaValues[emaValues.length - 1] || 0;

      // Suavizado de 5 barras
      const lookback = 5;
      const pastIndex = Math.max(0, emaValues.length - 1 - lookback);
      const emaPast = emaValues[pastIndex] || emaCurrent;

      // FÓRMULA: [(EMA_actual - EMA_hace_5_barras) / 5] / precio_actual * 100
      const slopeDailyPct = currentPrice > 0
        ? (((emaCurrent - emaPast) / lookback) / currentPrice) * 100
        : 0;

      const score = getEmaScore(config.period, slopeDailyPct);

      return {
        period: config.period,
        values,
        currentValue: emaCurrent,
        label: config.label,
        color: config.color,
        type: config.type,
        slopeDailyPct,
        score,
      };
    })
    .filter((ema) => ema.currentValue > 0);

  return { pricePoints, emas };
}

export function analyzeEmas(
  currentPrice: number,
  emas: EmaData[]
): EmaAnalysis[] {
  return emas.map((ema) => {
    const difference = currentPrice - ema.currentValue;
    const percentageDiff = ((currentPrice - ema.currentValue) / ema.currentValue) * 100;
    const position = currentPrice >= ema.currentValue ? "above" : "below";

    let characteristic: string;
    let severity: "bullish" | "neutral-bullish" | "warning" | "bearish" | "neutral";
    const absPct = Math.abs(percentageDiff);

    if (ema.type === "lenta") {
      if (position === "above") {
        if (absPct > 30) { characteristic = "Mercado sobrecalentado"; severity = "warning"; }
        else if (absPct > 10) { characteristic = "Tendencia alcista fuerte"; severity = "bullish"; }
        else { characteristic = "Soporte en EMA lenta"; severity = "bullish"; }
      } else {
        if (absPct > 30) { characteristic = "Bear market profundo"; severity = "bearish"; }
        else if (absPct > 10) { characteristic = "Bear market"; severity = "bearish"; }
        else { characteristic = "Zona de indecision"; severity = "warning"; }
      }
    } else {
      if (position === "above") {
        if (absPct > 20) { characteristic = "Sobrecompra extrema"; severity = "warning"; }
        else if (absPct > 5) { characteristic = "Momentum alcista"; severity = "bullish"; }
        else {
          characteristic = "Tendencia neutral-alcista";
          severity = "neutral-bullish"; // <-- NUEVA SEVERIDAD APLICADA AQUÍ
        }
      } else {
        if (absPct > 20) { characteristic = "Caida plena / Crash"; severity = "bearish"; }
        else if (absPct > 5) { characteristic = "Correccion activa"; severity = "bearish"; }
        else { characteristic = "Retroceso leve"; severity = "warning"; }
      }
    }

    return { ema, currentPrice, difference, percentageDiff, position, characteristic, severity };
  });
}

export function getMarketSummary(analyses: EmaAnalysis[]): MarketSummary {
  if (analyses.length === 0) return { label: "Datos insuficientes", description: "No hay suficientes datos", severity: "neutral" };
  const [ema20, ema50, ema100, ema200] = [20, 50, 100, 200].map(p => analyses.find((a) => a.ema.period === p));

  if (!ema100 && !ema200) {
    if (!ema20 && !ema50) return { label: "Datos insuficientes", description: "Sin datos", severity: "neutral" };
    const allAbove = analyses.every((a) => a.position === "above");
    if (allAbove) return { label: "Tendencia alcista (corto plazo)", description: "Precio sobre EMAs", severity: "bullish" };
    return { label: "Tendencia bajista (corto plazo)", description: "Precio bajo EMAs", severity: "bearish" };
  }

  if (ema20 && ema50 && ema100 && ema200) {
    const allAbove = analyses.every((a) => a.position === "above");
    const allBelow = analyses.every((a) => a.position === "below");
    const fastAbove = ema20.position === "above" && ema50.position === "above";
    const slowBelow = ema100.position === "below" && ema200.position === "below";

    if (allAbove && ema200.percentageDiff > 30) return { label: "Euforia", description: "Sobrecalentado", severity: "warning" };
    if (allAbove) return { label: "Bull Market", description: "Tendencia alcista confirmada", severity: "bullish" };
    if (allBelow && Math.abs(ema200.percentageDiff) > 30) return { label: "Capitulacion", description: "Suelo posible", severity: "bearish" };
    if (allBelow) return { label: "Bear Market", description: "Tendencia bajista", severity: "bearish" };
    if (fastAbove && slowBelow) return { label: "Recuperacion", description: "Posible inicio", severity: "warning" };
    return { label: "Mercado mixto", description: "Señales mixtas", severity: "neutral" };
  }

  const aboveCount = analyses.filter((a) => a.position === "above").length;
  if (aboveCount > analyses.length / 2) return { label: "Tendencia alcista (parcial)", description: "Alcista", severity: "bullish" };
  return { label: "Tendencia bajista (parcial)", description: "Bajista", severity: "bearish" };
}

export function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export type CrossoverDirection = "bullish" | "bearish";

export interface EmaCrossover {
  fastPeriod: number;
  slowPeriod: number;
  direction: CrossoverDirection;
  date: string;
  timestamp: number;
  price: number;
  daysAgo: number;
}

export interface CrossoverConclusion {
  crossovers: EmaCrossover[];
  conclusion: string;
  severity: "bullish" | "bearish" | "warning" | "neutral";
}

export function detectEmaCrossovers(pricePoints: PricePoint[], emas: EmaData[]): CrossoverConclusion {
  if (emas.length < 2 || pricePoints.length === 0) return { crossovers: [], conclusion: "Datos insuficientes.", severity: "neutral" };

  const emaByPeriod = new Map<number, Map<number, number>>();
  for (const ema of emas) {
    const m = new Map<number, number>();
    for (const v of ema.values) m.set(v.timestamp, v.value);
    emaByPeriod.set(ema.period, m);
  }

  const sortedPeriods = emas.map((e) => e.period).sort((a, b) => a - b);
  const allCrossovers: EmaCrossover[] = [];
  const now = Date.now();

  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    for (let j = i + 1; j < sortedPeriods.length; j++) {
      const [fastPeriod, slowPeriod] = [sortedPeriods[i], sortedPeriods[j]];
      const [fastMap, slowMap] = [emaByPeriod.get(fastPeriod)!, emaByPeriod.get(slowPeriod)!];
      let prevDiff: number | null = null;

      for (const point of pricePoints) {
        const [fast, slow] = [fastMap.get(point.timestamp), slowMap.get(point.timestamp)];
        if (!fast || !slow) continue;

        const diff = fast - slow;
        if (prevDiff !== null && Math.sign(diff) !== Math.sign(prevDiff) && diff !== 0) {
          allCrossovers.push({
            fastPeriod, slowPeriod,
            direction: diff > 0 ? "bullish" : "bearish",
            date: point.date, timestamp: point.timestamp, price: point.price,
            daysAgo: Math.round((now - point.timestamp) / 86_400_000),
          });
        }
        if (diff !== 0) prevDiff = diff;
      }
    }
  }

  if (allCrossovers.length === 0) return { crossovers: [], conclusion: "No se detectaron cruces.", severity: "neutral" };

  allCrossovers.sort((a, b) => b.timestamp - a.timestamp);
  const last2 = allCrossovers.slice(0, 2);
  const latest = last2[0];

  return {
    crossovers: last2,
    conclusion: latest.direction === "bullish" ? "Cruce alcista reciente." : "Cruce bajista reciente.",
    severity: latest.direction
  };
}