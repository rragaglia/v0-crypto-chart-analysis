"use client";

import type { CrossoverConclusion, EmaCrossover, MarketSummary } from "@/lib/ema";
import { TrendingUp, TrendingDown, AlertTriangle, Minus } from "lucide-react";

interface EmaCrossoverPanelProps {
  data: CrossoverConclusion | null;
  summary: MarketSummary | null;
}

const EMA_COLORS: Record<number, string> = {
  20:  "oklch(0.72 0.19 165)",
  50:  "oklch(0.7  0.15 250)",
  100: "oklch(0.75 0.18  55)",
  200: "oklch(0.65 0.2   25)",
};

function severityColors(severity: string) {
  switch (severity) {
    case "bullish": return {
      bg:     "oklch(0.72 0.19 165 / 0.08)",
      border: "oklch(0.72 0.19 165 / 0.28)",
      icon:   "var(--color-success, #22c55e)",
      text:   "var(--color-success, #22c55e)",
    };
    case "bearish": return {
      bg:     "oklch(0.65 0.2 25 / 0.08)",
      border: "oklch(0.65 0.2 25 / 0.28)",
      icon:   "var(--color-danger, #ef4444)",
      text:   "var(--color-danger, #ef4444)",
    };
    case "warning": return {
      bg:     "oklch(0.75 0.18 55 / 0.08)",
      border: "oklch(0.75 0.18 55 / 0.28)",
      icon:   "var(--color-warning, #f59e0b)",
      text:   "var(--color-warning, #f59e0b)",
    };
    default: return {
      bg:     "oklch(0.6 0 0 / 0.06)",
      border: "oklch(0.4 0 0 / 0.25)",
      icon:   "oklch(0.6 0 0)",
      text:   "oklch(0.6 0 0)",
    };
  }
}

function SeverityIcon({ severity, size = 15 }: { severity: string; size?: number }) {
  const colors = severityColors(severity);
  const style = { color: colors.icon, flexShrink: 0 as const };
  switch (severity) {
    case "bullish": return <TrendingUp  size={size} style={style} />;
    case "bearish": return <TrendingDown size={size} style={style} />;
    case "warning": return <AlertTriangle size={size} style={style} />;
    default:        return <Minus size={size} style={style} />;
  }
}

function CrossTag({ period }: { period: number }) {
  return (
    <span style={{ color: EMA_COLORS[period] ?? "currentColor", fontWeight: 600, fontSize: 12 }}>
      EMA {period}
    </span>
  );
}

function CrossCard({ cross }: { cross: EmaCrossover }) {
  const isBullish = cross.direction === "bullish";
  const c = severityColors(isBullish ? "bullish" : "bearish");
  const whenStr =
    cross.daysAgo === 0 ? "Hoy"
    : cross.daysAgo === 1 ? "Hace 1 día"
    : `Hace ${cross.daysAgo} días`;

  return (
    <div style={{
      border: `1px solid ${c.border}`,
      background: c.bg,
      borderRadius: 8,
      padding: "10px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isBullish
          ? <TrendingUp  size={13} style={{ color: c.icon, flexShrink: 0 }} />
          : <TrendingDown size={13} style={{ color: c.icon, flexShrink: 0 }} />}
        <span style={{ color: c.text, fontSize: 12, fontWeight: 600 }}>
          {isBullish ? "Cruce alcista" : "Cruce bajista"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "oklch(0.7 0 0)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <CrossTag period={cross.fastPeriod} />
        <span style={{ color: "oklch(0.5 0 0)" }}>{isBullish ? "↑ sobre" : "↓ bajo"}</span>
        <CrossTag period={cross.slowPeriod} />
      </div>
      <div style={{ fontSize: 11, color: "oklch(0.5 0 0)", marginTop: 2 }}>
        {cross.date} · {whenStr}
      </div>
    </div>
  );
}

const SECTION_DIVIDER = (borderColor: string) => ({
  borderTop: `1px solid ${borderColor}`,
  paddingTop: 12,
  marginTop: 0,
});

export function EmaCrossoverPanel({ data, summary }: EmaCrossoverPanelProps) {
  if (!data && !summary) return null;

  // Use summary severity as the panel's color if available, else use crossover severity
  const dominantSeverity = summary?.severity ?? data?.severity ?? "neutral";
  const c = severityColors(dominantSeverity);

  return (
    <div style={{
      border: `1px solid ${c.border}`,
      background: c.bg,
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
    }}>

      {/* ── Section 1: Resumen General ─────────────────────────────────────── */}
      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "oklch(0.55 0 0)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              Resumen General
            </span>
            {/* Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 20,
              border: `1px solid ${c.border}`,
              background: c.bg,
              fontSize: 12,
              fontWeight: 600,
              color: c.text,
            }}>
              <SeverityIcon severity={dominantSeverity} size={13} />
              {summary.label}
            </div>
          </div>
          {/* Description */}
          <p style={{ fontSize: 13, color: "oklch(0.72 0 0)", margin: 0, lineHeight: 1.6 }}>
            {summary.description}
          </p>
        </div>
      )}

      {/* ── Section 2: Cruces ──────────────────────────────────────────────── */}
      {data && (
        <div style={{ ...SECTION_DIVIDER(c.border), display: "flex", flexDirection: "column", gap: 10, paddingBottom: data.conclusion ? 14 : 0 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: "oklch(0.55 0 0)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Último{data.crossovers.length > 1 ? "s 2 cruces" : " cruce"} de EMAs
          </span>

          {data.crossovers.length > 0 ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.crossovers.map((cross, i) => <CrossCard key={i} cross={cross} />)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "oklch(0.55 0 0)", margin: 0 }}>
              Sin cruces detectados en el período seleccionado.
            </p>
          )}
        </div>
      )}

      {/* ── Section 3: Conclusión del cruce ───────────────────────────────── */}
      {data?.conclusion && (
        <div style={{
          ...SECTION_DIVIDER(c.border),
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}>
          <SeverityIcon severity={data.severity} size={15} />
          <p style={{ fontSize: 13, color: "oklch(0.75 0 0)", margin: 0, lineHeight: 1.55 }}>
            {data.conclusion}
          </p>
        </div>
      )}
    </div>
  );
}
