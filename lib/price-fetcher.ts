/**
 * Cascading Price Fetcher
 * Priority 1: Hyperliquid API (perps/spot)
 * Priority 2: Binance API (klines with USDT/USDC normalization)
 * Priority 3: CoinGecko API (last resort)
 */

export type PriceData = {
  prices: [number, number][]; // [timestamp, price]
  source: "hyperliquid" | "binance" | "coingecko";
  symbol: string;
};

export type FetchResult = {
  success: boolean;
  data?: PriceData;
  error?: string;
  rateLimited?: boolean;
};

// Common symbol mappings for cross-exchange compatibility
const SYMBOL_MAPPINGS: Record<string, { hyperliquid: string; binance: string }> = {
  bitcoin: { hyperliquid: "BTC", binance: "BTC" },
  ethereum: { hyperliquid: "ETH", binance: "ETH" },
  solana: { hyperliquid: "SOL", binance: "SOL" },
  dogecoin: { hyperliquid: "DOGE", binance: "DOGE" },
  cardano: { hyperliquid: "ADA", binance: "ADA" },
  ripple: { hyperliquid: "XRP", binance: "XRP" },
  polkadot: { hyperliquid: "DOT", binance: "DOT" },
  "avalanche-2": { hyperliquid: "AVAX", binance: "AVAX" },
  chainlink: { hyperliquid: "LINK", binance: "LINK" },
  "matic-network": { hyperliquid: "MATIC", binance: "MATIC" },
  litecoin: { hyperliquid: "LTC", binance: "LTC" },
  uniswap: { hyperliquid: "UNI", binance: "UNI" },
  stellar: { hyperliquid: "XLM", binance: "XLM" },
  cosmos: { hyperliquid: "ATOM", binance: "ATOM" },
  monero: { hyperliquid: "XMR", binance: "XMR" },
  binancecoin: { hyperliquid: "BNB", binance: "BNB" },
  "binance-coin": { hyperliquid: "BNB", binance: "BNB" },
  tron: { hyperliquid: "TRX", binance: "TRX" },
  "shiba-inu": { hyperliquid: "SHIB", binance: "SHIB" },
  "near-protocol": { hyperliquid: "NEAR", binance: "NEAR" },
  near: { hyperliquid: "NEAR", binance: "NEAR" },
  arbitrum: { hyperliquid: "ARB", binance: "ARB" },
  optimism: { hyperliquid: "OP", binance: "OP" },
  aptos: { hyperliquid: "APT", binance: "APT" },
  sui: { hyperliquid: "SUI", binance: "SUI" },
  pepe: { hyperliquid: "PEPE", binance: "PEPE" },
  "internet-computer": { hyperliquid: "ICP", binance: "ICP" },
  filecoin: { hyperliquid: "FIL", binance: "FIL" },
  injective: { hyperliquid: "INJ", binance: "INJ" },
  "injective-protocol": { hyperliquid: "INJ", binance: "INJ" },
  render: { hyperliquid: "RNDR", binance: "RNDR" },
  "render-token": { hyperliquid: "RNDR", binance: "RNDR" },
  immutable: { hyperliquid: "IMX", binance: "IMX" },
  "immutable-x": { hyperliquid: "IMX", binance: "IMX" },
  "the-graph": { hyperliquid: "GRT", binance: "GRT" },
  aave: { hyperliquid: "AAVE", binance: "AAVE" },
  maker: { hyperliquid: "MKR", binance: "MKR" },
  fantom: { hyperliquid: "FTM", binance: "FTM" },
  algorand: { hyperliquid: "ALGO", binance: "ALGO" },
  flow: { hyperliquid: "FLOW", binance: "FLOW" },
  "axie-infinity": { hyperliquid: "AXS", binance: "AXS" },
  sandbox: { hyperliquid: "SAND", binance: "SAND" },
  "the-sandbox": { hyperliquid: "SAND", binance: "SAND" },
  decentraland: { hyperliquid: "MANA", binance: "MANA" },
  eos: { hyperliquid: "EOS", binance: "EOS" },
  "theta-network": { hyperliquid: "THETA", binance: "THETA" },
  tezos: { hyperliquid: "XTZ", binance: "XTZ" },
  iota: { hyperliquid: "IOTA", binance: "IOTA" },
  neo: { hyperliquid: "NEO", binance: "NEO" },
  kava: { hyperliquid: "KAVA", binance: "KAVA" },
  zilliqa: { hyperliquid: "ZIL", binance: "ZIL" },
  enjincoin: { hyperliquid: "ENJ", binance: "ENJ" },
  "basic-attention-token": { hyperliquid: "BAT", binance: "BAT" },
  "1inch": { hyperliquid: "1INCH", binance: "1INCH" },
  curve: { hyperliquid: "CRV", binance: "CRV" },
  "curve-dao-token": { hyperliquid: "CRV", binance: "CRV" },
  compound: { hyperliquid: "COMP", binance: "COMP" },
  "compound-governance-token": { hyperliquid: "COMP", binance: "COMP" },
  yearn: { hyperliquid: "YFI", binance: "YFI" },
  "yearn-finance": { hyperliquid: "YFI", binance: "YFI" },
  sushi: { hyperliquid: "SUSHI", binance: "SUSHI" },
  "pancakeswap-token": { hyperliquid: "CAKE", binance: "CAKE" },
  gala: { hyperliquid: "GALA", binance: "GALA" },
  "lido-dao": { hyperliquid: "LDO", binance: "LDO" },
  rocketpool: { hyperliquid: "RPL", binance: "RPL" },
  blur: { hyperliquid: "BLUR", binance: "BLUR" },
  worldcoin: { hyperliquid: "WLD", binance: "WLD" },
  "worldcoin-wld": { hyperliquid: "WLD", binance: "WLD" },
  "sei-network": { hyperliquid: "SEI", binance: "SEI" },
  sei: { hyperliquid: "SEI", binance: "SEI" },
  celestia: { hyperliquid: "TIA", binance: "TIA" },
  jupiter: { hyperliquid: "JUP", binance: "JUP" },
  "jupiter-exchange-solana": { hyperliquid: "JUP", binance: "JUP" },
  jito: { hyperliquid: "JTO", binance: "JTO" },
  "jito-governance-token": { hyperliquid: "JTO", binance: "JTO" },
  bonk: { hyperliquid: "BONK", binance: "BONK" },
  wif: { hyperliquid: "WIF", binance: "WIF" },
  dogwifcoin: { hyperliquid: "WIF", binance: "WIF" },
  dogwifhat: { hyperliquid: "WIF", binance: "WIF" },
  pendle: { hyperliquid: "PENDLE", binance: "PENDLE" },
  pyth: { hyperliquid: "PYTH", binance: "PYTH" },
  "pyth-network": { hyperliquid: "PYTH", binance: "PYTH" },
  starknet: { hyperliquid: "STRK", binance: "STRK" },
  ethena: { hyperliquid: "ENA", binance: "ENA" },
  ondo: { hyperliquid: "ONDO", binance: "ONDO" },
  "ondo-finance": { hyperliquid: "ONDO", binance: "ONDO" },
};

// ─── Days helper ─────────────────────────────────────────────────────────────

/**
 * "max" → 1825 days (5 years) for exchanges that need a numeric range.
 * CoinGecko accepts the string "max" directly.
 */
function resolveDays(days: number | string): number {
  if (days === "max") return 1825;
  const n = typeof days === "string" ? parseInt(days, 10) : days;
  return isNaN(n) || n <= 0 ? 365 : n;
}

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function getIntervalForDays(days: number): { hyperliquid: string; binance: string } {
  if (days <= 7)  return { hyperliquid: "1h",  binance: "1h"  };
  if (days <= 30) return { hyperliquid: "4h",  binance: "4h"  };
  return              { hyperliquid: "1d",  binance: "1d"  };
}

// ─── Priority 1: Hyperliquid ─────────────────────────────────────────────────
async function fetchFromHyperliquid(
  symbol: string,
  days: number | string
): Promise<FetchResult> {
  const mapping = SYMBOL_MAPPINGS[symbol.toLowerCase()];
  const coin = mapping?.hyperliquid || symbol.toUpperCase();
  const numDays = resolveDays(days);
  const interval = getIntervalForDays(numDays);

  const endTime = Date.now();
  const startTime = endTime - daysToMs(numDays);

  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: { coin, interval: interval.hyperliquid, startTime, endTime },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, error: `Hyperliquid HTTP ${response.status}` };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "Asset not found on Hyperliquid" };
    }

    const prices: [number, number][] = data.map(
      (candle: { t: number; c: string }) => [candle.t, parseFloat(candle.c)]
    );
    prices.sort((a, b) => a[0] - b[0]);

    return { success: true, data: { prices, source: "hyperliquid", symbol: coin } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hyperliquid fetch failed",
    };
  }
}

// ─── Priority 2: Binance ─────────────────────────────────────────────────────
async function fetchFromBinance(
  symbol: string,
  days: number | string
): Promise<FetchResult> {
  const mapping = SYMBOL_MAPPINGS[symbol.toLowerCase()];
  const baseSymbol = mapping?.binance || symbol.toUpperCase();
  const numDays = resolveDays(days);
  const interval = getIntervalForDays(numDays);

  const endTime = Date.now();
  const startTime = endTime - daysToMs(numDays);

  const quoteCurrencies = ["USDT", "USDC", "BUSD"];

  for (const quote of quoteCurrencies) {
    const pair = `${baseSymbol}${quote}`;
    try {
      const url = new URL("https://api.binance.com/api/v3/klines");
      url.searchParams.set("symbol", pair);
      url.searchParams.set("interval", interval.binance);
      url.searchParams.set("startTime", startTime.toString());
      url.searchParams.set("endTime", endTime.toString());
      url.searchParams.set("limit", "1000");

      const response = await fetch(url.toString(), { cache: "no-store" });

      if (response.status === 429) {
        return { success: false, error: "Binance rate limit", rateLimited: true };
      }
      // 451 = Unavailable For Legal Reasons (geo-blocked)
      // 418 = I'm a teapot (Binance uses this for blocked IPs)
      // Skip to next quote currency or fallback source
      if (!response.ok) continue;

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const prices: [number, number][] = data.map(
        (candle: (string | number)[]) => [
          candle[0] as number,
          parseFloat(candle[4] as string),
        ]
      );

      return { success: true, data: { prices, source: "binance", symbol: pair } };
    } catch {
      continue;
    }
  }

  return { success: false, error: "Asset not found on Binance with any quote currency" };
}

// ─── Priority 3: CoinGecko (last resort) ─────────────────────────────────────
async function fetchFromCoinGecko(
  coinId: string,
  days: number | string
): Promise<FetchResult> {
  // CoinGecko accepts "max" natively; for numeric values pass as-is
  const daysParam = days === "max" ? "max" : resolveDays(days).toString();

  // For "max" or long periods CoinGecko auto-selects daily interval.
  // For shorter periods we request daily to keep data consistent.
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}&interval=daily`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 429) {
      console.warn("ALERTA: Límite de API de CoinGecko alcanzado.");
      return { success: false, error: "CoinGecko rate limit exceeded", rateLimited: true };
    }
    if (!response.ok) {
      return { success: false, error: `CoinGecko HTTP ${response.status}` };
    }

    const data = await response.json();

    if (!data.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
      return { success: false, error: "No price data from CoinGecko" };
    }

    return { success: true, data: { prices: data.prices, source: "coingecko", symbol: coinId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "CoinGecko fetch failed",
    };
  }
}

// ─── Main cascade ─────────────────────────────────────────────────────────────
export async function fetchPriceDataWithFallback(
  coinId: string,
  days: number | string
): Promise<FetchResult> {
  // Priority 1: Hyperliquid
  const hlResult = await fetchFromHyperliquid(coinId, days);
  if (hlResult.success) {
    console.log(`[Price Fetcher] ${coinId}: Using Hyperliquid data`);
    return hlResult;
  }
  console.log(`[Price Fetcher] ${coinId}: Hyperliquid failed — ${hlResult.error}`);

  // Priority 2: Binance
  const bnResult = await fetchFromBinance(coinId, days);
  if (bnResult.success) {
    console.log(`[Price Fetcher] ${coinId}: Using Binance data`);
    return bnResult;
  }
  console.log(`[Price Fetcher] ${coinId}: Binance failed — ${bnResult.error}`);

  // Priority 3: CoinGecko
  const cgResult = await fetchFromCoinGecko(coinId, days);
  if (cgResult.success) {
    console.log(`[Price Fetcher] ${coinId}: Using CoinGecko data`);
    return cgResult;
  }
  console.log(`[Price Fetcher] ${coinId}: CoinGecko failed — ${cgResult.error}`);

  return {
    success: false,
    error: `All price sources failed for ${coinId}`,
    rateLimited: cgResult.rateLimited || bnResult.rateLimited,
  };
}

export function getSourceDisplayName(source: PriceData["source"]): string {
  switch (source) {
    case "hyperliquid": return "Hyperliquid";
    case "binance":     return "Binance";
    case "coingecko":   return "CoinGecko";
  }
}
