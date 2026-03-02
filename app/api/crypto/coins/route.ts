import { NextResponse } from "next/server";

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
  throw new Error("CoinGecko API rate limit exceeded after retries");
}

export async function GET() {
  try {
    const response = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`
    );

    const data = await response.json();

    const coins = data.map(
      (coin: { id: string; symbol: string; name: string; image: string; current_price: number }) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price,
      })
    );

    return NextResponse.json(coins);
  } catch (error) {
    console.error("Error fetching coin list:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin list" },
      { status: 500 }
    );
  }
}
