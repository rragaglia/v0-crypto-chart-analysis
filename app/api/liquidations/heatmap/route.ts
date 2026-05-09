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

  // Get API key from client header or fallback to env var
  const clientApiKey = request.headers.get("x-api-key");
  const apiKey = clientApiKey || process.env.HYPERTRACKER_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: "API key required",
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

    console.log("[v0] HyperTracker response status:", response.status);
    console.log("[v0] HyperTracker response headers:", Object.fromEntries(response.headers.entries()));

    // The API returns a redirect to S3
    if (response.status === 302 || response.status === 307) {
      const downloadUrl = response.headers.get("location");
      console.log("[v0] Redirect URL:", downloadUrl);
      if (downloadUrl) {
        // Fetch the actual data from S3
        const dataResponse = await fetch(downloadUrl);
        console.log("[v0] S3 response status:", dataResponse.status);
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          console.log("[v0] S3 data sample:", JSON.stringify(data).slice(0, 500));
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
      console.log("[v0] Direct response data:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json({
        status: "success",
        coin: coin.toUpperCase(),
        data: data.data || data,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log error response body
    const errorText = await response.text();
    console.log("[v0] Error response:", errorText.slice(0, 500));

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
