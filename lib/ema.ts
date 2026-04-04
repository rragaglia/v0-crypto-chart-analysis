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
  // Agregamos los campos de pendiente (slope)
  slope: number;
  slopePercentage: number;
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

      // Calculamos la pendiente (Slope) comparando el último valor con el anterior
      const currentValue = emaValues[emaValues.length - 1] || 0;
      const prevValue = emaValues[emaValues.length - 2] || currentValue;
      const slope = currentValue - prevValue;
      const slopePercentage = prevValue > 0 ? (slope / prevValue) * 100 : 0;

      return {
        period: config.period,
        values,
        currentValue,
        label: config.label,
        color: config.color,
        type: config.type,
        slope,
        slopePercentage,
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
  if (analyses.length === 0) {
    return {
      label: "Datos insuficientes",
      description: "No hay suficientes datos historicos para calcular EMAs.",
      severity: "neutral",
    };
  }

  const ema20 = analyses.find((a) => a.ema.period === 20);
  const ema50 = analyses.find((a) => a.ema.period === 50);
  const ema100 = analyses.find((a) => a.ema.period === 100);
  const ema200 = analyses.find((a) => a.ema.period === 200);

  // If we only have fast EMAs (not enough data for slow ones)
  if (!ema100 && !ema200) {
    if (!ema20 && !ema50) {
      return {
        label: "Datos insuficientes",
        description: "No hay suficientes datos historicos para calcular ninguna EMA.",
        severity: "neutral",
      };
    }

    const available = analyses;
    const allAbove = available.every((a) => a.position === "above");
    const allBelow = available.every((a) => a.position === "below");

    if (allAbove) {
      return {
        label: "Tendencia alcista (corto plazo)",
        description:
          "Precio sobre EMAs rapidas disponibles. Sin datos suficientes para EMAs lentas.",
        severity: "bullish",
      };
    }
    if (allBelow) {
      return {
        label: "Tendencia bajista (corto plazo)",
        description:
          "Precio bajo EMAs rapidas disponibles. Sin datos suficientes para EMAs lentas.",
        severity: "bearish",
      };
    }
    return {
      label: "Mixto (datos limitados)",
      description:
        "Senales mixtas con los datos disponibles. Necesitas mas datos historicos para un analisis completo.",
      severity: "neutral",
    };
  }

  // Full analysis with all 4 EMAs available
  if (ema20 && ema50 && ema100 && ema200) {
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

  // Partial analysis (have some slow EMAs but not all 4)
  const aboveCount = analyses.filter((a) => a.position === "above").length;
  const belowCount = analyses.filter((a) => a.position === "below").length;

  if (aboveCount > belowCount) {
    return {
      label: "Tendencia alcista (parcial)",
      description: `Precio sobre ${aboveCount} de ${analyses.length} EMAs disponibles. Tendencia mayormente alcista.`,
      severity: "bullish",
    };
  }
  if (belowCount > aboveCount) {
    return {
      label: "Tendencia bajista (parcial)",
      description: `Precio bajo ${belowCount} de ${analyses.length} EMAs disponibles. Tendencia mayormente bajista.`,
      severity: "bearish",
    };
  }

  return {
    label: "Mercado mixto",
    description:
      "Senales mixtas entre las EMAs disponibles. Esperar mas datos o confirmacion de tendencia.",
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

// ─── EMA Crossover detection ─────────────────────────────────────────────────

export type CrossoverDirection = "bullish" | "bearish";

export interface EmaCrossover {
  /** The faster EMA (lower period) */
  fastPeriod: number;
  /** The slower EMA (higher period) */
  slowPeriod: number;
  /** "bullish" = fast crossed ABOVE slow (golden), "bearish" = fast crossed BELOW slow (death) */
  direction: CrossoverDirection;
  /** Human-readable date of the cross */
  date: string;
  /** Timestamp of the cross */
  timestamp: number;
  /** Price at the moment of the cross */
  price: number;
  /** Days ago */
  daysAgo: number;
}

export interface CrossoverConclusion {
  crossovers: EmaCrossover[];
  /** Short conclusion text derived from last cross + current price-EMA gap */
  conclusion: string;
  severity: "bullish" | "bearish" | "warning" | "neutral";
}

/**
 * Scan all pairs of EMAs and find the last 2 crossover events across the
 * entire dataset, ordered from most recent to oldest.
 */
export function detectEmaCrossovers(
  pricePoints: PricePoint[],
  emas: EmaData[]
): CrossoverConclusion {
  if (emas.length < 2 || pricePoints.length === 0) {
    return { crossovers: [], conclusion: "Datos insuficientes para detectar cruces.", severity: "neutral" };
  }

  // Build timestamp→value maps for every EMA period
  const emaByPeriod = new Map<number, Map<number, number>>();
  for (const ema of emas) {
    const m = new Map<number, number>();
    for (const v of ema.values) m.set(v.timestamp, v.value);
    emaByPeriod.set(ema.period, m);
  }

  const sortedPeriods = emas.map((e) => e.period).sort((a, b) => a - b);
  const allCrossovers: EmaCrossover[] = [];
  const now = Date.now();

  // Compare every fast/slow pair
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    for (let j = i + 1; j < sortedPeriods.length; j++) {
      const fastPeriod = sortedPeriods[i];
      const slowPeriod = sortedPeriods[j];
      const fastMap = emaByPeriod.get(fastPeriod)!;
      const slowMap = emaByPeriod.get(slowPeriod)!;

      // Walk through pricePoints in order and detect sign changes
      let prevDiff: number | null = null;

      for (const point of pricePoints) {
        const fast = fastMap.get(point.timestamp);
        const slow = slowMap.get(point.timestamp);
        if (fast === undefined || slow === undefined || fast === 0 || slow === 0) continue;

        const diff = fast - slow;
        if (prevDiff !== null && Math.sign(diff) !== Math.sign(prevDiff) && diff !== 0) {
          const direction: CrossoverDirection = diff > 0 ? "bullish" : "bearish";
          const daysAgo = Math.round((now - point.timestamp) / 86_400_000);
          allCrossovers.push({
            fastPeriod,
            slowPeriod,
            direction,
            date: point.date,
            timestamp: point.timestamp,
            price: point.price,
            daysAgo,
          });
        }
        if (diff !== 0) prevDiff = diff;
      }
    }
  }

  if (allCrossovers.length === 0) {
    return {
      crossovers: [],
      conclusion: "No se detectaron cruces de EMAs en el período seleccionado.",
      severity: "neutral",
    };
  }

  // Sort most recent first, keep last 2
  allCrossovers.sort((a, b) => b.timestamp - a.timestamp);
  const last2 = allCrossovers.slice(0, 2);

  // Build conclusion from the most recent cross + current price-EMA gap
  const latest = last2[0];
  const fastEma = emas.find((e) => e.period === latest.fastPeriod);
  const slowEma = emas.find((e) => e.period === latest.slowPeriod);
  const currentPrice = pricePoints[pricePoints.length - 1]?.price ?? 0;

  let conclusion = "";
  let severity: CrossoverConclusion["severity"] = "neutral";

  const crossName =
    latest.direction === "bullish"
      ? `Cruce alcista (EMA ${latest.fastPeriod} sobre EMA ${latest.slowPeriod})`
      : `Cruce bajista (EMA ${latest.fastPeriod} bajo EMA ${latest.slowPeriod})`;

  const whenStr =
    latest.daysAgo === 0
      ? "hoy"
      : latest.daysAgo === 1
        ? "hace 1 día"
        : `hace ${latest.daysAgo} días`;

  // Gap between current price and the faster EMA of the latest cross
  let gapText = "";
  if (fastEma && fastEma.currentValue > 0) {
    const gapPct = ((currentPrice - fastEma.currentValue) / fastEma.currentValue) * 100;
    const sign = gapPct >= 0 ? "+" : "";
    gapText = ` El precio está ${sign}${gapPct.toFixed(1)}% respecto a la EMA ${latest.fastPeriod} actualmente.`;
  }

  if (latest.direction === "bullish") {
    severity = "bullish";
    if (fastEma && currentPrice > fastEma.currentValue && slowEma && currentPrice > slowEma.currentValue) {
      conclusion = `${crossName} confirmado ${whenStr}.${gapText} La tendencia continúa alcista: precio sobre ambas EMAs.`;
    } else if (fastEma && currentPrice < fastEma.currentValue) {
      conclusion = `${crossName} ocurrió ${whenStr}, pero el precio ya perdió la EMA ${latest.fastPeriod}.${gapText} Señal alcista debilitada.`;
      severity = "warning";
    } else {
      conclusion = `${crossName} ocurrió ${whenStr}.${gapText} Monitorear si el precio sostiene el nivel.`;
      severity = "warning";
    }
  } else {
    severity = "bearish";
    if (fastEma && currentPrice < fastEma.currentValue && slowEma && currentPrice < slowEma.currentValue) {
      conclusion = `${crossName} confirmado ${whenStr}.${gapText} La presión bajista continúa activa.`;
    } else if (fastEma && currentPrice > fastEma.currentValue) {
      conclusion = `${crossName} ocurrió ${whenStr}, pero el precio ya recuperó la EMA ${latest.fastPeriod}.${gapText} Señal bajista debilitada, posible recuperación.`;
      severity = "warning";
    } else {
      conclusion = `${crossName} ocurrió ${whenStr}.${gapText} Observar si la presión bajista persiste.`;
      severity = "warning";
    }
  }

  return { crossovers: last2, conclusion, severity };
}