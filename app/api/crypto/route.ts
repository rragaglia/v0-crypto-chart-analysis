import { NextRequest, NextResponse } from "next/server";
import { fetchPriceDataWithFallback } from "@/lib/price-fetcher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinId = searchParams.get("coinId") || "bitcoin";
  const days = parseInt(searchParams.get("days") || "365", 10);

  const result = await fetchPriceDataWithFallback(coinId, days);

  if (!result.success || !result.data) {
    return NextResponse.json(
      {
        prices: [],
        error: result.error || "Failed to fetch price data",
        rateLimited: result.rateLimited,
      },
      { status: 200 } // Return 200 so SWR handles error gracefully
    );
  }

  return NextResponse.json({
    prices: result.data.prices,
    source: result.data.source,
    symbol: result.data.symbol,
  });
}
