"use client";

import { ASSET_COLORS } from "@/lib/constants";

interface CorrelationRow {
  asset_a: string;
  asset_b: string;
  interval: string;
  total_pairs: string;
  both_up: string;
  both_down: string;
  a_up_b_down: string;
  a_down_b_up: string;
  correlation_pct: string;
}

interface CrossAssetCorrelationProps {
  data: CorrelationRow[];
}

function getCorrelationColor(pct: number): string {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 60) return "text-emerald-300";
  if (pct >= 55) return "text-zinc-200";
  if (pct >= 45) return "text-zinc-400";
  return "text-red-400";
}

function getCorrelationLabel(pct: number): string {
  if (pct >= 70) return "Strongly correlated";
  if (pct >= 60) return "Moderately correlated";
  if (pct >= 55) return "Weakly correlated";
  if (pct >= 45) return "Independent";
  return "Inversely correlated";
}

export function CrossAssetCorrelation({ data }: CrossAssetCorrelationProps) {
  if (data.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-8 text-center text-sm text-zinc-500 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        Not enough data yet
      </div>
    );
  }

  // Group by interval
  const byInterval = new Map<string, CorrelationRow[]>();
  for (const row of data) {
    const list = byInterval.get(row.interval) || [];
    list.push(row);
    byInterval.set(row.interval, list);
  }

  const intervals = [...byInterval.keys()].sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-8">
      {intervals.map((interval) => {
        const rows = byInterval.get(interval) || [];
        return (
          <div key={interval}>
            <p className="mb-4 text-sm font-semibold text-zinc-300">{interval} Markets</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((row) => {
                const corr = parseFloat(row.correlation_pct);
                const total = parseInt(row.total_pairs);
                const bothUp = parseInt(row.both_up);
                const bothDown = parseInt(row.both_down);
                const sameDir = bothUp + bothDown;
                const colorA = ASSET_COLORS[row.asset_a] || "#e4f600";
                const colorB = ASSET_COLORS[row.asset_b] || "#e4f600";

                return (
                  <div key={`${row.asset_a}_${row.asset_b}`} className="relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-6 backdrop-blur-sm">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl" />

                    <div className="relative">
                      {/* Asset pair */}
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorA }} />
                          <span className="text-lg font-bold text-zinc-100">{row.asset_a.toUpperCase()}</span>
                        </div>
                        <span className="text-zinc-600">×</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorB }} />
                          <span className="text-lg font-bold text-zinc-100">{row.asset_b.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Correlation percentage */}
                      <div className="mb-3 flex items-baseline gap-2">
                        <span className={`font-mono text-3xl font-bold tabular-nums ${getCorrelationColor(corr)}`}>
                          {corr.toFixed(1)}%
                        </span>
                        <span className="text-xs text-zinc-500">{getCorrelationLabel(corr)}</span>
                      </div>

                      {/* Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">Both Up</span>
                          <span className="font-mono text-xs font-medium text-emerald-400">{bothUp} ({(bothUp / total * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">Both Down</span>
                          <span className="font-mono text-xs font-medium text-red-400">{bothDown} ({(bothDown / total * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">Opposite</span>
                          <span className="font-mono text-xs font-medium text-zinc-400">{total - sameDir} ({((total - sameDir) / total * 100).toFixed(0)}%)</span>
                        </div>

                        {/* Visual bar */}
                        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full">
                          <div className="bg-emerald-400" style={{ width: `${(bothUp / total) * 100}%` }} />
                          <div className="bg-red-400" style={{ width: `${(bothDown / total) * 100}%` }} />
                          <div className="bg-zinc-600" style={{ width: `${((total - sameDir) / total) * 100}%` }} />
                        </div>

                        <p className="text-[10px] text-zinc-500 text-right">{total} pairs analyzed</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
