import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

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
