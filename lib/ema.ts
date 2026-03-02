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
}

export interface EmaAnalysis {
  ema: EmaData;
  currentPrice: number;
  difference: number;
  percentageDiff: number;
  position: "above" | "below";
  characteristic: string;
  severity: "bullish" | "warning" | "bearish" | "neutral";
}

export interface MarketSummary {
  label: string;
  description: string;
  severity: "bullish" | "warning" | "bearish" | "neutral";
}

export function calculateEMA(
  prices: number[],
  period: number
): number[] {
  if (prices.length < period) return [];

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
    ema.push(0); // placeholder
  }
  ema[period - 1] = sum / period;

  // EMA calculation
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

export function processEmaData(
  priceData: [number, number][]
): { pricePoints: PricePoint[]; emas: EmaData[] } {
  const pricePoints: PricePoint[] = priceData.map(([timestamp, price]) => ({
    timestamp,
    price,
    date: new Date(timestamp).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
  }));

  const rawPrices = pricePoints.map((p) => p.price);

  const emas: EmaData[] = EMA_CONFIGS.map((config) => {
    const emaValues = calculateEMA(rawPrices, config.period);
    const values = pricePoints
      .map((p, i) => ({
        timestamp: p.timestamp,
        value: emaValues[i] || 0,
      }))
      .filter((v) => v.value > 0);

    return {
      period: config.period,
      values,
      currentValue: emaValues[emaValues.length - 1] || 0,
      label: config.label,
      color: config.color,
      type: config.type,
    };
  });

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
    let severity: "bullish" | "warning" | "bearish" | "neutral";

    const absPct = Math.abs(percentageDiff);

    if (ema.type === "lenta") {
      // EMA lenta (100, 200)
      if (position === "above") {
        if (absPct > 30) {
          characteristic = "Mercado sobrecalentado";
          severity = "warning";
        } else if (absPct > 10) {
          characteristic = "Tendencia alcista fuerte";
          severity = "bullish";
        } else {
          characteristic = "Soporte en EMA lenta";
          severity = "bullish";
        }
      } else {
        if (absPct > 30) {
          characteristic = "Bear market profundo";
          severity = "bearish";
        } else if (absPct > 10) {
          characteristic = "Bear market";
          severity = "bearish";
        } else {
          characteristic = "Zona de indecision";
          severity = "warning";
        }
      }
    } else {
      // EMA rapida (20, 50)
      if (position === "above") {
        if (absPct > 20) {
          characteristic = "Sobrecompra extrema";
          severity = "warning";
        } else if (absPct > 5) {
          characteristic = "Momentum alcista";
          severity = "bullish";
        } else {
          characteristic = "Tendencia neutral-alcista";
          severity = "neutral";
        }
      } else {
        if (absPct > 20) {
          characteristic = "Caida plena / Crash";
          severity = "bearish";
        } else if (absPct > 5) {
          characteristic = "Correccion activa";
          severity = "bearish";
        } else {
          characteristic = "Retroceso leve";
          severity = "warning";
        }
      }
    }

    return {
      ema,
      currentPrice,
      difference,
      percentageDiff,
      position,
      characteristic,
      severity,
    };
  });
}

export function getMarketSummary(analyses: EmaAnalysis[]): MarketSummary {
  const ema20 = analyses.find((a) => a.ema.period === 20);
  const ema50 = analyses.find((a) => a.ema.period === 50);
  const ema100 = analyses.find((a) => a.ema.period === 100);
  const ema200 = analyses.find((a) => a.ema.period === 200);

  if (!ema20 || !ema50 || !ema100 || !ema200) {
    return {
      label: "Datos insuficientes",
      description: "No hay suficientes datos para generar un resumen.",
      severity: "neutral",
    };
  }

  const allAbove = analyses.every((a) => a.position === "above");
  const allBelow = analyses.every((a) => a.position === "below");
  const fastAbove = ema20.position === "above" && ema50.position === "above";
  const slowBelow = ema100.position === "below" && ema200.position === "below";
  const slowAbove = ema100.position === "above" && ema200.position === "above";
  const fastBelow = ema20.position === "below" && ema50.position === "below";

  if (allAbove && ema200.percentageDiff > 30) {
    return {
      label: "Euforia / Techo potencial",
      description:
        "Precio muy por encima de todas las EMAs. Mercado sobrecalentado, posible correccion inminente.",
      severity: "warning",
    };
  }

  if (allAbove) {
    return {
      label: "Bull Market",
      description:
        "Precio por encima de todas las EMAs. Tendencia alcista confirmada en todos los marcos temporales.",
      severity: "bullish",
    };
  }

  if (allBelow && Math.abs(ema200.percentageDiff) > 30) {
    return {
      label: "Capitulacion / Bear Market extremo",
      description:
        "Precio muy por debajo de todas las EMAs. Zona de capitulacion, posible suelo de mercado.",
      severity: "bearish",
    };
  }

  if (allBelow) {
    return {
      label: "Bear Market",
      description:
        "Precio por debajo de todas las EMAs. Tendencia bajista dominante.",
      severity: "bearish",
    };
  }

  if (fastAbove && slowBelow) {
    return {
      label: "Recuperacion temprana",
      description:
        "Precio sobre EMAs rapidas pero bajo EMAs lentas. Posible inicio de recuperacion, pero aun no confirmada.",
      severity: "warning",
    };
  }

  if (fastBelow && slowAbove) {
    return {
      label: "Correccion en tendencia alcista",
      description:
        "Precio bajo EMAs rapidas pero sobre EMAs lentas. Correccion temporal dentro de tendencia alcista mayor.",
      severity: "warning",
    };
  }

  if (ema20.position === "above" && ema50.position === "below" && slowBelow) {
    return {
      label: "Rebote tecnico",
      description:
        "Solo EMA 20 superada. Posible rebote de gato muerto o inicio de recuperacion. Precaucion.",
      severity: "warning",
    };
  }

  if (ema20.position === "below" && ema50.position === "above") {
    return {
      label: "Pullback leve",
      description:
        "Precio bajo EMA 20 pero sobre EMA 50. Retroceso menor, puede ser oportunidad de compra si la tendencia se mantiene.",
      severity: "neutral",
    };
  }

  return {
    label: "Mercado mixto",
    description:
      "Senales mixtas entre EMAs rapidas y lentas. Zona de transicion, esperar confirmacion de tendencia.",
    severity: "neutral",
  };
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}
