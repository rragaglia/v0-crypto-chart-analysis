import { NextRequest, NextResponse } from "next/server";

const HYPERTRACKER_BASE = "https://ht-api.coinmarketman.com/api/external";

// Cohort IDs for HyperTracker segments
export const COHORTS = {
  ALL: 0,        // All traders
  SHRIMP: 1,     // < $1K
  CRAB: 2,       // $1K - $10K
  FISH: 3,       // $10K - $100K
  DOLPHIN: 4,    // $100K - $500K
  SHARK: 5,      // $500K - $1M
  WHALE: 6,      // $1M - $10M
  MEGALODON: 7,  // > $10M
  // PnL-based cohorts
  TOP_TRADERS: 8,
  PROFITABLE: 9,
  BREAKEVEN: 10,
  LOSING: 11,
  REKT: 12,
} as const;

interface LiquidationRiskAsset {
  coin: string;
  liquidationRiskPercent: number;
  openInterest: number;
  valueAtRisk: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const segmentId = searchParams.get("segmentId") || "5"; // Default to SHARK cohort
  const limit = searchParams.get("limit") || "50";

  // Get API key from client header or fallback to env var
  const clientApiKey = request.headers.get("x-api-key");
  const apiKey = clientApiKey || process.env.HYPERTRACKER_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: "API key required",
        requiresSetup: true,
        message: "Para ver datos de liquidaciones, ingresa tu API key de HyperTracker."
      },
      { status: 200 }
    );
  }

  try {
    const url = `${HYPERTRACKER_BASE}/${segmentId}/assets/liquidation-risk?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      return NextResponse.json(
        { 
          error: "Invalid API key",
          requiresSetup: true,
          message: "La API key de HyperTracker es invalida o ha expirado."
        },
        { status: 200 }
      );
    }

    if (!response.ok) {
      throw new Error(`HyperTracker API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the response to a consistent format
    const assets: LiquidationRiskAsset[] = (data.data || []).map((item: {
      coin?: string;
      symbol?: string;
      liquidationRiskPercent?: number;
      riskPercent?: number;
      openInterest?: number;
      totalOpenInterest?: number;
      valueAtRisk?: number;
      valueCloseToLiquidation?: number;
    }) => ({
      coin: item.coin || item.symbol,
      liquidationRiskPercent: item.liquidationRiskPercent || item.riskPercent || 0,
      openInterest: item.openInterest || item.totalOpenInterest || 0,
      valueAtRisk: item.valueAtRisk || item.valueCloseToLiquidation || 0,
    }));

    return NextResponse.json({
      status: "success",
      segmentId: parseInt(segmentId),
      data: assets,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error fetching liquidation data:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch liquidation data",
        data: []
      },
      { status: 200 }
    );
  }
}
