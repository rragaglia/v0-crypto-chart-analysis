import { NextResponse } from "next/server";
import { fetchPricesForCoin } from "@/lib/price-fetcher";
import { COIN_MANIFEST } from "@/lib/coin-manifest";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coinIds = searchParams.get("coinIds")?.split(",") || [];
    const days = searchParams.get("days") || "30";
    
    // 1. Capturamos el intervalo que pide el frontend (ej: "15m", "1h")
    const interval = searchParams.get("interval"); 

    const results: Record<string, any> = {};

    await Promise.all(
      coinIds.map(async (id) => {
        const coin = COIN_MANIFEST.find((c) => c.id === id);
        if (coin) {
          try {
            // 2. Se lo pasamos al fetcher como tercer parámetro
            const data = await fetchPricesForCoin(coin, days, interval || undefined);
            if (data && data.prices && data.prices.length > 0) {
              results[id] = data;
            }
          } catch (e) {
            console.error(`Error fetching ${id}:`, e);
          }
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Batch API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}