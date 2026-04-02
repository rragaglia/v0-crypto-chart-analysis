"use client";

import type { CrossoverConclusion, EmaCrossover } from "@/lib/ema";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EmaCrossoverPanelProps {
  data: CrossoverConclusion | null;
}

const EMA_COLORS: Record<number, string> = {
  20:  "oklch(0.72 0.19 165)", // green
  50:  "oklch(0.7  0.15 250)", // blue
  100: "oklch(0.75 0.18  55)", // orange
  200: "oklch(0.65 0.2   25)", // red
};

function CrossTag({ period }: { period: number }) {
  return (
    <span
      style={{
        color: EMA_COLORS[period] ?? "currentColor",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      EMA {period}
    </span>
  );
}

function CrossCard({ cross }: { cross: EmaCrossover }) {
  const isBullish = cross.direction === "bullish";
  const borderColor = isBullish
    ? "oklch(0.72 0.19 165 / 0.4)"
    : "oklch(0.65 0.2 25 / 0.4)";
  const bgColor = isBullish
    ? "oklch(0.72 0.19 165 / 0.06)"
    : "oklch(0.65 0.2 25 / 0.06)";
  const textColor = isBullish ? "var(--color-success, #22c55e)" : "var(--color-danger, #ef4444)";

  const whenStr =
    cross.daysAgo === 0
      ? "Hoy"
      : cross.daysAgo === 1
      ? "Hace 1 día"
      : `Hace ${cross.daysAgo} días`;

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Direction badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isBullish ? (
          <TrendingUp size={14} style={{ color: textColor, flexShrink: 0 }} />
        ) : (
          <TrendingDown size={14} style={{ color: textColor, flexShrink: 0 }} />
        )}
        <span style={{ color: textColor, fontSize: 12, fontWeight: 600 }}>
          {isBullish ? "Cruce alcista" : "Cruce bajista"}
        </span>
      </div>

      {/* EMA pair */}
      <div style={{ fontSize: 12, color: "oklch(0.7 0 0)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <CrossTag period={cross.fastPeriod} />
        <span style={{ color: "oklch(0.5 0 0)" }}>
          {isBullish ? "↑ sobre" : "↓ bajo"}
        </span>
        <CrossTag period={cross.slowPeriod} />
      </div>

      {/* Date + price */}
      <div style={{ fontSize: 11, color: "oklch(0.55 0 0)", marginTop: 2 }}>
        {cross.date} · {whenStr}
      </div>
    </div>
  );
}

export function EmaCrossoverPanel({ data }: EmaCrossoverPanelProps) {
  if (!data) return null;

  const severityBg =
    data.severity === "bullish"
      ? "oklch(0.72 0.19 165 / 0.08)"
      : data.severity === "bearish"
      ? "oklch(0.65 0.2 25 / 0.08)"
      : "oklch(0.6 0 0 / 0.06)";

  const severityBorder =
    data.severity === "bullish"
      ? "oklch(0.72 0.19 165 / 0.25)"
      : data.severity === "bearish"
      ? "oklch(0.65 0.2 25 / 0.25)"
      : "oklch(0.4 0 0 / 0.3)";

  const ConclusionIcon =
    data.severity === "bullish"
      ? TrendingUp
      : data.severity === "bearish"
      ? TrendingDown
      : Minus;

  const iconColor =
    data.severity === "bullish"
      ? "var(--color-success, #22c55e)"
      : data.severity === "bearish"
      ? "var(--color-danger, #ef4444)"
      : "oklch(0.6 0 0)";

  return (
    <div
      style={{
        border: `1px solid ${severityBorder}`,
        background: severityBg,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "oklch(0.55 0 0)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Último{data.crossovers.length > 1 ? "s 2 cruces" : " cruce"} de EMAs
        </span>
      </div>

      {/* Cross cards */}
      {data.crossovers.length > 0 ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {data.crossovers.map((cross, i) => (
            <CrossCard key={i} cross={cross} />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "oklch(0.55 0 0)", margin: 0 }}>
          Sin cruces detectados en el período seleccionado.
        </p>
      )}

      {/* Conclusion */}
      {data.conclusion && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            borderTop: `1px solid ${severityBorder}`,
            paddingTop: 10,
          }}
        >
          <ConclusionIcon
            size={15}
            style={{ color: iconColor, flexShrink: 0, marginTop: 1 }}
          />
          <p
            style={{
              fontSize: 13,
              color: "oklch(0.75 0 0)",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {data.conclusion}
          </p>
        </div>
      )}
    </div>
  );
}
