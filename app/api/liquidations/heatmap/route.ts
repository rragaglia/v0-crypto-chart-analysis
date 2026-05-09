import { NextRequest, NextResponse } from "next/server";

const HYPERTRACKER_BASE = "https://ht-api.coinmarketman.com/api/external";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coin = searchParams.get("coin");

  if (!coin) {
    return NextResponse.json(
      { error: "Coin parameter is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.HYPERTRACKER_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: "HYPERTRACKER_API_KEY not configured",
        requiresSetup: true,
      },
      { status: 200 }
    );
  }

  try {
    // First get the download URL
    const url = `${HYPERTRACKER_BASE}/exports/coins/${coin.toUpperCase()}/liquidation-heatmap`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      redirect: "manual", // Don't auto-follow redirect
      cache: "no-store",
    });

    if (response.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key", requiresSetup: true },
        { status: 200 }
      );
    }

    // The API returns a redirect to S3
    if (response.status === 302 || response.status === 307) {
      const downloadUrl = response.headers.get("location");
      if (downloadUrl) {
        // Fetch the actual data from S3
        const dataResponse = await fetch(downloadUrl);
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          return NextResponse.json({
            status: "success",
            coin: coin.toUpperCase(),
            data,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // If it's a direct JSON response
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: "success",
        coin: coin.toUpperCase(),
        data: data.data || data,
        timestamp: new Date().toISOString(),
      });
    }

    throw new Error(`HyperTracker API error: ${response.status}`);

  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch heatmap data",
        data: null
      },
      { status: 200 }
    );
  }
}
