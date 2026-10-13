export function getSourceDisplayName(source: string) {
  switch (source) {
    case "hyperliquid": return "Hyperliquid";
    case "binance": return "Binance";
    case "coingecko": return "CoinGecko";
    default: return "Desconocido";
  }
}

export async function fetchPricesForCoin(coin: any, days: string, interval?: string) {
  const daysNum = parseInt(days) || 30;
  const endTime = Date.now();
  const startTime = endTime - daysNum * 24 * 60 * 60 * 1000;

  // Si el frontend envía un intervalo (ej: "15m"), lo usamos.
  // Si no, calculamos uno por defecto según la cantidad de días solicitados.
  const targetInterval = interval || (daysNum <= 1 ? "15m" : daysNum <= 7 ? "1h" : daysNum <= 30 ? "4h" : "1d");

  // 1. INTENTO PRINCIPAL: HYPERLIQUID (Ideal para Strict Spot)
  if (coin.hyperliquidSymbol) {
    try {
      const res = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "candleSnapshot",
          req: {
            coin: coin.hyperliquidSymbol,
            interval: targetInterval,
            startTime: startTime,
            endTime: endTime
          }
        })
      });
      const data = await res.json();
      if (data && Array.isArray(data) && data.length > 0) {
        // Hyperliquid devuelve un array de objetos con 't' (timestamp) y 'c' (close price)
        const prices = data.map((c: any) => [c.t, parseFloat(c.c)]);
        return { prices, source: "hyperliquid" };
      }
    } catch (e) {
      console.warn(`Falló Hyperliquid para ${coin.symbol}:`, e);
    }
  }

  // 2. INTENTO SECUNDARIO: BINANCE (Si tiene el símbolo cargado)
  if (coin.binanceSymbol) {
    try {
      // Binance usa la misma nomenclatura de intervalos que Hyperliquid (15m, 1h, 4h, 1d)
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${coin.binanceSymbol}USDT&interval=${targetInterval}&startTime=${startTime}&endTime=${endTime}&limit=1000`);
      const data = await res.json();
      if (data && Array.isArray(data) && data.length > 0) {
        // Binance devuelve arrays donde el índice 0 es timestamp y 4 es el precio de cierre
        const prices = data.map((k: any) => [k[0], parseFloat(k[4])]);
        return { prices, source: "binance" };
      }
    } catch (e) {
      console.warn(`Falló Binance para ${coin.symbol}:`, e);
    }
  }

  // 3. RESPALDO FINAL: COINGECKO
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=${days}`);
    const data = await res.json();
    if (data && data.prices && data.prices.length > 0) {
      return { prices: data.prices, source: "coingecko" };
    }
  } catch (e) {
    console.warn(`Falló CoinGecko para ${coin.id}:`, e);
  }

  // Si fallan todas las fuentes, devolvemos un array vacío para no romper la app
  return { prices: [], source: "error" };
}