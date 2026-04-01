import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 1500
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.ok) return response;

    // Rate limited or unauthorized - wait and retry
    if (response.status === 429 || response.status === 401) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
        continue;
      }
    }

    // Other errors - don't retry
    if (response.status !== 429 && response.status !== 401) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
  }
  throw new Error("CoinGecko API rate limit exceeded after retries");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinId = searchParams.get("coinId") || "bitcoin";
  const days = searchParams.get("days") || "365";

  try {
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );

    const data = await response.json();

    // Validate that we got price data
    if (!data.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
      return NextResponse.json(
        { prices: [], error: "No price data available for this period" },
        { status: 200 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching crypto data:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch crypto data";
    return NextResponse.json(
      { prices: [], error: message },
      { status: 200 } // Return 200 so SWR doesn't throw - we handle the error in the UI
    );
  }
}
