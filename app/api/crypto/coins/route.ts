import { NextResponse } from "next/server";
import { COIN_MANIFEST } from "@/lib/coin-manifest";

/**
 * Returns the coin list from the static manifest.
 * No external API calls needed - avoids CoinGecko rate limits entirely.
 */
export async function GET() {
  try {
    const coins = COIN_MANIFEST.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
    }));

    return NextResponse.json(coins);
  } catch (error) {
    console.error("Error getting coin list:", error);
    return NextResponse.json(
      { error: "Failed to get coin list" },
      { status: 500 }
    );
  }
}
