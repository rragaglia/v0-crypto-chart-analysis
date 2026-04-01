import { NextRequest, NextResponse } from "next/server";
import { fetchPriceDataWithFallback } from "@/lib/price-fetcher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinIds = searchParams.get("coinIds")?.split(",") || [];
  const days = searchParams.get("days") || "365";

  if (coinIds.length === 0) {
    return NextResponse.json({ results: {} });
  }

  const results: Record<
    string,
    { prices: [number, number][]; error?: string; source?: string }
  > = {};

  // Fetch sequentially to avoid rate limits
  for (const coinId of coinIds) {
    try {
      const result = await fetchPriceDataWithFallback(coinId, days);

      if (!result.success || !result.data) {
        results[coinId] = { 
          prices: [], 
          error: result.error || "No data available" 
        };
      } else {
        results[coinId] = { 
          prices: result.data.prices,
          source: result.data.source
        };
      }
    } catch (error) {
      results[coinId] = { 
        prices: [], 
        error: error instanceof Error ? error.message : "Failed to fetch" 
      };
    }

    // Small delay between requests to be respectful to APIs
    if (coinIds.indexOf(coinId) < coinIds.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({ results });
}
