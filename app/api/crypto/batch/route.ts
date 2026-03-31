import { NextRequest, NextResponse } from "next/server";
import { fetchPriceDataWithFallback } from "@/lib/price-fetcher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinIds = searchParams.get("coinIds")?.split(",") || [];
  const days = parseInt(searchParams.get("days") || "365", 10);

  if (coinIds.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const results: Record<
    string,
    {
      prices: [number, number][];
      source?: string;
      symbol?: string;
      error?: string;
    }
  > = {};

  // Fetch sequentially to avoid rate limits
  for (const coinId of coinIds) {
    const result = await fetchPriceDataWithFallback(coinId, days);

    if (result.success && result.data) {
      results[coinId] = {
        prices: result.data.prices,
        source: result.data.source,
        symbol: result.data.symbol,
      };
    } else {
      results[coinId] = {
        prices: [],
        error: result.error || "Failed to fetch",
      };
    }

    // Small delay between requests if not last item
    if (coinIds.indexOf(coinId) < coinIds.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({ results });
}
