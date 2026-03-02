import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 2000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (response.ok) return response;
    if (response.status === 429 || response.status === 401) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
        continue;
      }
    }
    if (response.status !== 429 && response.status !== 401) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
  }
  throw new Error("Rate limit exceeded");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinIds = searchParams.get("coinIds")?.split(",") || [];
  const days = searchParams.get("days") || "365";

  if (coinIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results: Record<
    string,
    { prices: [number, number][]; error?: string }
  > = {};

  // Fetch sequentially to avoid CoinGecko rate limits on free tier
  for (const coinId of coinIds) {
    try {
      const response = await fetchWithRetry(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );
      const data = await response.json();

      if (
        !data.prices ||
        !Array.isArray(data.prices) ||
        data.prices.length === 0
      ) {
        results[coinId] = { prices: [], error: "No data available" };
      } else {
        results[coinId] = { prices: data.prices };
      }
    } catch {
      results[coinId] = { prices: [], error: "Failed to fetch" };
    }

    // Small delay between requests to respect rate limits
    if (coinIds.indexOf(coinId) < coinIds.length - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return NextResponse.json({ results });
}
