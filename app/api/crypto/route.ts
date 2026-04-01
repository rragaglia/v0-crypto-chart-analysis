import { NextRequest, NextResponse } from "next/server";
import { fetchPriceDataWithFallback } from "@/lib/price-fetcher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinId = searchParams.get("coinId") || "bitcoin";
  const days = searchParams.get("days") || "365";

  try {
    const result = await fetchPriceDataWithFallback(coinId, days);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { 
          prices: [], 
          error: result.error || "Failed to fetch price data",
          rateLimited: result.rateLimited 
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      prices: result.data.prices,
      source: result.data.source,
      symbol: result.data.symbol,
    });
  } catch (error) {
    console.error("Error fetching crypto data:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch crypto data";
    return NextResponse.json(
      { prices: [], error: message },
      { status: 200 }
    );
  }
}
