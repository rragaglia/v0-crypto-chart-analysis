"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmaAnalysis, MarketSummary } from "@/lib/ema";
import { formatPrice } from "@/lib/ema";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Minus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface EmaTableProps {
  analyses: EmaAnalysis[];
  summary: MarketSummary;
}

function SeverityBadge({ severity, label }: { severity: string; label: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    bullish: {
      className: "bg-success/15 text-success border-success/30",
      icon: <TrendingUp className="size-3" />,
    },
    bearish: {
      className: "bg-danger/15 text-danger border-danger/30",
      icon: <TrendingDown className="size-3" />,
    },
    warning: {
      className: "bg-warning/15 text-warning border-warning/30",
      icon: <AlertTriangle className="size-3" />,
    },
    neutral: {
      className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
      icon: <Minus className="size-3" />,
    },
  };

  const c = config[severity] || config.neutral;

  return (
    <Badge variant="outline" className={c.className}>
      {c.icon}
      {label}
    </Badge>
  );
}

export function EmaTable({ analyses, summary }: EmaTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Analisis EMA vs Precio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>EMA</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor EMA</TableHead>
                <TableHead className="text-right">Precio Actual</TableHead>
                <TableHead className="text-center">Posicion</TableHead>
                <TableHead className="text-right">Diferencia %</TableHead>
                <TableHead>Caracteristica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow key={analysis.ema.period} className="border-border/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: analysis.ema.color }}
                      />
                      {analysis.ema.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        analysis.ema.type === "rapida"
                          ? "border-chart-1/40 bg-chart-1/10 text-chart-1"
                          : "border-chart-4/40 bg-chart-4/10 text-chart-4"
                      }
                    >
                      {analysis.ema.type === "rapida" ? "Rapida" : "Lenta"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(analysis.ema.currentValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(analysis.currentPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    {analysis.position === "above" ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <ArrowUp className="size-3.5" />
                        Encima
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-danger">
                        <ArrowDown className="size-3.5" />
                        Debajo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        analysis.position === "above"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {analysis.position === "above" ? "+" : ""}
                      {analysis.percentageDiff.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge
                      severity={analysis.severity}
                      label={analysis.characteristic}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card
        className={`border-2 ${
          summary.severity === "bullish"
            ? "border-success/30"
            : summary.severity === "bearish"
            ? "border-danger/30"
            : summary.severity === "warning"
            ? "border-warning/30"
            : "border-muted-foreground/30"
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Resumen General
            </CardTitle>
            <SeverityBadge severity={summary.severity} label={summary.label} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {summary.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
