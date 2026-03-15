"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  XAxis,
  YAxis,
  ReferenceLine,
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Line,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  X,
  AlertTriangle,
  Circle,
  SkipForward,
  Clock,
  Power,
  AlertCircle,
  Ghost,
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { DownloadButton } from "@/components/download-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  overall: {
    total_trades: string;
    wins: string;
    losses: string;
    pending: string;
    no_fills: string;
    skipped: string;
    total_pnl: string | null;
    total_bet: string | null;
    avg_pnl_per_trade: string | null;
  } | null;
  last24h: {
    trades_24h: string;
    wins_24h: string;
    losses_24h: string;
    pnl_24h: string | null;
    bet_24h: string | null;
  } | null;
  yesterday: {
    trades_yesterday: string;
    wins_yesterday: string;
    losses_yesterday: string;
    pnl_yesterday: string | null;
  } | null;
  strategies: {
    strategy_name: string;
    trades: string;
    wins: string;
    losses: string;
    total_pnl: string | null;
    avg_entry_price: string | null;
  }[];
  hourlySummary: {
    data: string;
    logged_at: string;
  } | null;
}

interface ActivityData {
  trades: {
    id: string;
    market_type: string;
    strategy_name: string;
    direction: string;
    entry_price: string;
    bet_size_usd: string;
    status: string;
    final_outcome: string | null;
    pnl: string | null;
    placed_at: string;
    resolved_at: string | null;
    data: string | null;
  }[];
  logs: {
    id: string;
    log_type: string;
    message: string;
    data: string | null;
    logged_at: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pf(val: string | null | undefined): number {
  if (val == null) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function fmtPnl(val: number): string {
  if (val === 0) return "$0.00";
  const prefix = val >= 0 ? "$" : "-$";
  return `${prefix}${Math.abs(val).toFixed(2)}`;
}

function fmtDollar(val: number): string {
  return `$${val.toFixed(2)}`;
}

function fmtPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

function fmtMarket(mt: string): string {
  const parts = mt.split("_");
  if (parts.length === 2) return `${parts[0].toUpperCase()} ${parts[1]}`;
  return mt;
}

function fmtPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `${Math.round(price * 100)}¢`;
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
}

function fmtDateTime(ts: string): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return `${time} ${date}`;
}

function parseJsonSafe(data: string | null | undefined): Record<string, unknown> | null {
  if (!data) return null;
  try {
    return typeof data === "object" ? data : JSON.parse(data);
  } catch {
    return null;
  }
}

function pnlColor(val: number): string {
  return val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "text-zinc-400";
}

const STRATEGY_COLORS: Record<string, { badge: string; border: string; glow: string }> = {
  momentum: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    border: "border-blue-500/20",
    glow: "via-blue-500/40",
  },
  farming: {
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    border: "border-purple-500/20",
    glow: "via-purple-500/40",
  },
  streak: {
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    border: "border-orange-500/20",
    glow: "via-orange-500/40",
  },
  calibration: {
    badge: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    border: "border-teal-500/20",
    glow: "via-teal-500/40",
  },
  late_dip_recovery: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    border: "border-rose-500/20",
    glow: "via-rose-500/40",
  },
};

function getStrategyStyle(name: string) {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(STRATEGY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { badge: "bg-primary/10 text-primary border-primary/20", border: "border-primary/20", glow: "via-primary/40" };
}

// ---------------------------------------------------------------------------
// Filter button row (matches strategy3 exactly)
// ---------------------------------------------------------------------------

function FilterRow({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            selected === opt.value
              ? "bg-primary/[0.12] text-primary border border-primary/30"
              : "bg-zinc-900/60 text-zinc-400 border border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart tooltip (matches strategy3 exactly)
// ---------------------------------------------------------------------------

function ChartTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-medium text-zinc-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className={cn("text-xs font-mono font-semibold", p.value >= 0 ? "text-emerald-400" : "text-red-400")}>
          {fmtPnl(p.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status dot for bot health
// ---------------------------------------------------------------------------

function BotStatusDot({ lastTradeAt }: { lastTradeAt: string | null }) {
  if (!lastTradeAt) return <span className="h-3 w-3 rounded-full bg-zinc-600" />;
  const diffMs = Date.now() - new Date(lastTradeAt).getTime();
  const diffMin = diffMs / 60000;

  if (diffMin <= 10) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
        <span className="relative h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" />
      </span>
    );
  }
  if (diffMin <= 60) {
    return <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/40" />;
  }
  return <span className="h-3 w-3 rounded-full bg-red-400 shadow-lg shadow-red-400/40" />;
}

// ---------------------------------------------------------------------------
// Log type icon
// ---------------------------------------------------------------------------

function LogIcon({ logType }: { logType: string }) {
  const size = 14;
  switch (logType) {
    case "trade_placed":
      return <ArrowUpRight size={size} className="text-emerald-400" />;
    case "trade_win":
      return <Trophy size={size} className="text-emerald-400" />;
    case "trade_loss":
      return <X size={size} className="text-red-400" />;
    case "trade_stop_loss":
      return <AlertTriangle size={size} className="text-yellow-400" />;
    case "trade_fok_no_fill":
      return <Circle size={size} className="text-zinc-500" />;
    case "trade_skipped":
      return <SkipForward size={size} className="text-zinc-500" />;
    case "hourly_summary":
      return <Clock size={size} className="text-blue-400" />;
    case "bot_start":
      return <Power size={size} className="text-zinc-300" />;
    case "bot_error":
      return <AlertCircle size={size} className="text-red-400" />;
    case "trade_dry_run":
      return <Ghost size={size} className="text-yellow-400" />;
    default:
      return <Circle size={size} className="text-zinc-500" />;
  }
}

function logRowBg(logType: string): string {
  switch (logType) {
    case "trade_win": return "bg-emerald-500/[0.04]";
    case "trade_loss": return "bg-red-500/[0.04]";
    case "trade_stop_loss": return "bg-yellow-500/[0.04]";
    case "hourly_summary": return "bg-blue-500/[0.04]";
    default: return "";
  }
}

// ---------------------------------------------------------------------------
// Section 1 — Overview Cards (dashboard grid style)
// ---------------------------------------------------------------------------

function OverviewCards({ overview }: { overview: OverviewData }) {
  const o = overview.overall;
  const h = overview.last24h;
  const y = overview.yesterday;

  const totalPnl = pf(o?.total_pnl);
  const wins = pf(o?.wins);
  const losses = pf(o?.losses);
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  // Balance from hourly summary
  const parsed = parseJsonSafe(overview.hourlySummary?.data ?? null);
  const balance = pf((parsed?.balance as string) || (parsed?.current_balance as string));

  // Today
  const pnl24h = pf(h?.pnl_24h);
  const trades24h = pf(h?.trades_24h);
  const wins24h = pf(h?.wins_24h);
  const losses24h = pf(h?.losses_24h);

  // Yesterday
  const pnlYesterday = pf(y?.pnl_yesterday);
  const tradesYesterday = pf(y?.trades_yesterday);
  const winsYesterday = pf(y?.wins_yesterday);
  const lossesYesterday = pf(y?.losses_yesterday);

  const topCards = [
    { label: "Total PnL", value: fmtPnl(totalPnl), color: pnlColor(totalPnl) },
    { label: "Win Rate", value: wins + losses > 0 ? fmtPercent(winRate) : "—", color: winRate > 55 ? "text-emerald-400" : winRate >= 45 ? "text-yellow-400" : wins + losses > 0 ? "text-red-400" : "text-zinc-50" },
    { label: "Total Trades", value: o ? parseInt(o.total_trades).toLocaleString("en-US") : "0", color: "text-zinc-50" },
    { label: "Balance", value: balance > 0 ? fmtDollar(balance) : "—", color: "text-zinc-50" },
  ];

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Bot Overview" />

      {/* Top row — 4 main stat cards */}
      <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.06] sm:grid-cols-4">
        <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        {topCards.map((card, i) => (
          <div
            key={card.label}
            className="group relative bg-zinc-950 p-4 md:p-6 transition-colors hover:bg-zinc-900/80 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute -top-10 -right-10 h-20 w-20 rounded-full bg-primary/[0.05] blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.15em] text-primary/60">
              {card.label}
            </p>
            <p className={cn("relative mt-2 font-mono text-2xl font-bold tabular-nums", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Today vs Yesterday comparison */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Today */}
        <GlassPanel variant="glow-tl">
          <div className="relative p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60 mb-4">Today (24h)</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">PnL</p>
                <p className={cn("mt-1 font-mono text-2xl font-bold tabular-nums", pnlColor(pnl24h))}>
                  {fmtPnl(pnl24h)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">Trades</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-200">{trades24h}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">W / L</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-200">
                  <span className="text-emerald-400">{wins24h}</span>
                  {" / "}
                  <span className="text-red-400">{losses24h}</span>
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Yesterday */}
        <GlassPanel variant="glow-tr">
          <div className="relative p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60 mb-4">Yesterday</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">PnL</p>
                <p className={cn("mt-1 font-mono text-2xl font-bold tabular-nums", pnlColor(pnlYesterday))}>
                  {fmtPnl(pnlYesterday)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">Trades</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-200">{tradesYesterday}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">W / L</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-200">
                  <span className="text-emerald-400">{winsYesterday}</span>
                  {" / "}
                  <span className="text-red-400">{lossesYesterday}</span>
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Strategy Cards (strategies-overview style)
// ---------------------------------------------------------------------------

function StrategyCards({ strategies }: { strategies: OverviewData["strategies"] }) {
  if (!strategies || strategies.length === 0) {
    return (
      <section className="mb-8 md:mb-14">
        <SectionHeader title="Strategy Breakdown" />
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950 p-8 text-center">
          <p className="text-sm text-muted-foreground">No strategy data yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Strategy Breakdown" description="Performance of each active trading strategy." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {strategies.map((s, i) => {
          const pnl = pf(s.total_pnl);
          const w = parseInt(s.wins);
          const l = parseInt(s.losses);
          const wr = w + l > 0 ? (w / (w + l)) * 100 : 0;
          const trades = parseInt(s.trades);
          const totalBet = pf(s.avg_entry_price) * trades;
          const roi = totalBet > 0 ? (pnl / totalBet) * 100 : 0;
          const isPositive = pnl > 0;
          const isNegative = pnl < 0;
          const style = getStrategyStyle(s.strategy_name);

          const borderColor = isPositive
            ? "border-green-500/20"
            : isNegative
              ? "border-red-500/20"
              : style.border;

          const glowColor = isPositive
            ? "via-green-500/40"
            : isNegative
              ? "via-red-500/40"
              : style.glow;

          return (
            <div
              key={s.strategy_name}
              className={`group relative overflow-hidden rounded-xl border ${borderColor} bg-zinc-950 p-5 md:p-8 transition-all duration-300 animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${glowColor} to-transparent`} />
              <div className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full bg-primary/[0.05] blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />

              {/* Header */}
              <div className="relative flex items-center justify-between">
                <span className={cn("rounded-md px-2 py-1 text-xs font-medium border", style.badge)}>
                  {s.strategy_name}
                </span>
                <span className={cn("font-mono text-sm font-semibold tabular-nums", wr > 55 ? "text-emerald-400" : wr >= 45 ? "text-yellow-400" : w + l > 0 ? "text-red-400" : "text-zinc-200")}>
                  {w + l > 0 ? fmtPercent(wr) : "—"} win rate
                </span>
              </div>

              {/* Main metric */}
              <div className="relative mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60 mb-1">Total PnL</p>
                <p className={cn("font-mono text-3xl font-bold tabular-nums", pnlColor(pnl))}>
                  {fmtPnl(pnl)}
                </p>
              </div>

              {/* Stats grid */}
              <div className="relative mt-5 pt-5 border-t border-zinc-800/60 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">Wins</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-400">
                    {w}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">Losses</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-red-400">
                    {l}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">Trades</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-200">
                    {trades}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400">Avg Entry</p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-200">
                    {fmtPrice(pf(s.avg_entry_price))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Hourly Summary (GlassPanel with stat cards)
// ---------------------------------------------------------------------------

function HourlySummary({ data }: { data: OverviewData["hourlySummary"] }) {
  if (!data) {
    return (
      <section className="mb-8 md:mb-14">
        <SectionHeader title="Last Hourly Report" />
        <GlassPanel variant="glow-tl">
          <div className="relative p-6">
            <p className="text-sm text-muted-foreground">
              First hourly report will appear after 1 hour of operation.
            </p>
          </div>
        </GlassPanel>
      </section>
    );
  }

  const parsed = parseJsonSafe(data.data);
  if (!parsed) {
    return (
      <section className="mb-8 md:mb-14">
        <SectionHeader title="Last Hourly Report" />
        <GlassPanel variant="glow-tl">
          <div className="relative p-6">
            <p className="text-sm text-muted-foreground">Unable to parse hourly summary data.</p>
          </div>
        </GlassPanel>
      </section>
    );
  }

  const reportTime = fmtDateTime(data.logged_at);
  const period = String(parsed.period ?? "—");
  const totalTrades = String(parsed.total_trades ?? parsed.trades ?? "—");
  const winsVal = String(parsed.wins ?? "—");
  const lossesVal = String(parsed.losses ?? "—");
  const stopLosses = String(parsed.stop_losses ?? "—");
  const periodPnl = pf(parsed.pnl as string);
  const roiVal = pf(parsed.roi as string);
  const balance = pf((parsed.balance as string) || (parsed.current_balance as string));
  const dailySpent = pf((parsed.daily_spent as string) || (parsed.daily_spent_today as string));
  const dailyLimit = pf(parsed.daily_limit as string);
  const pendingRedemption = pf(parsed.pending_redemption as string);
  const activeStrategies = (parsed.active_strategies as string[]) || [];
  const spentPercent = dailyLimit > 0 ? Math.min(100, (dailySpent / dailyLimit) * 100) : 0;

  const statCards = [
    { label: "Report Time", value: reportTime, color: "text-zinc-50" },
    { label: "Period", value: period, color: "text-zinc-50" },
    { label: "Trades", value: totalTrades, color: "text-zinc-50" },
    { label: "W / L / SL", value: `${winsVal} / ${lossesVal} / ${stopLosses}`, color: "text-zinc-50" },
    { label: "Period PnL", value: fmtPnl(periodPnl), color: pnlColor(periodPnl) },
    { label: "ROI", value: fmtPercent(roiVal), color: pnlColor(roiVal) },
    { label: "Balance", value: fmtDollar(balance), color: "text-zinc-50" },
    ...(pendingRedemption > 0 ? [{ label: "Pending Redemption", value: fmtDollar(pendingRedemption), color: "text-yellow-400" }] : []),
  ];

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Last Hourly Report" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <GlassPanel key={card.label} variant="subtle">
              <div className="relative p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60">{card.label}</p>
                <p className={cn("mt-1.5 font-mono text-lg tabular-nums font-bold", card.color)}>
                  {card.value}
                </p>
              </div>
            </GlassPanel>
          ))}
        </div>

        {dailyLimit > 0 && (
          <GlassPanel variant="subtle">
            <div className="relative p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold uppercase tracking-[0.15em] text-primary/60">Daily Spent</span>
                <span className="font-mono text-zinc-400">{fmtDollar(dailySpent)} / {fmtDollar(dailyLimit)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    spentPercent > 80 ? "bg-red-400" : spentPercent > 50 ? "bg-yellow-400" : "bg-emerald-400"
                  )}
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>
          </GlassPanel>
        )}

        {activeStrategies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60">Active Strategies</span>
            {activeStrategies.map((s) => {
              const style = getStrategyStyle(String(s));
              return (
                <span key={String(s)} className={cn("rounded-md px-2 py-0.5 text-xs font-medium border", style.badge)}>
                  {String(s)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Cumulative PnL Chart (GlassPanel)
// ---------------------------------------------------------------------------

function PnlChart({ trades }: { trades: ActivityData["trades"] }) {
  const chartData = useMemo(() => {
    const resolved = trades
      .filter((t) => t.final_outcome != null && t.pnl != null)
      .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

    if (resolved.length < 2) return null;

    let cumPnl = 0;
    return resolved.map((t) => {
      cumPnl += pf(t.pnl);
      return { time: fmtDateTime(t.placed_at), pnl: parseFloat(cumPnl.toFixed(2)) };
    });
  }, [trades]);

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Cumulative PnL" description="Running profit/loss across all resolved trades over time." />
      <GlassPanel variant="glow-center">
        <div className="relative p-4">
          {!chartData ? (
            <p className="text-sm text-zinc-500 text-center py-12">Not enough resolved trades yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="4 4" />
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartData[chartData.length - 1].pnl >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartData[chartData.length - 1].pnl >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="pnl" fill="url(#pnlGradient)" stroke="none" />
                <Line type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassPanel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Live Activity Feed (GlassPanel, fixed-height scroll)
// ---------------------------------------------------------------------------

const LOG_FILTERS = [
  { value: "all", label: "All" },
  { value: "trades", label: "Trades" },
  { value: "wins_losses", label: "Wins/Losses" },
  { value: "summaries", label: "Summaries" },
  { value: "errors", label: "Errors" },
];

const LOG_PAGE_SIZE = 50;
const LOG_MAX = 1000;

function ActivityFeed({ logs }: { logs: ActivityData["logs"] }) {
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(LOG_PAGE_SIZE);

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    if (filter === "trades")
      return logs.filter((l) =>
        ["trade_placed", "trade_win", "trade_loss", "trade_stop_loss", "trade_fok_no_fill", "trade_skipped", "trade_dry_run"].includes(l.log_type)
      );
    if (filter === "wins_losses")
      return logs.filter((l) => ["trade_win", "trade_loss", "trade_stop_loss"].includes(l.log_type));
    if (filter === "summaries")
      return logs.filter((l) => l.log_type === "hourly_summary");
    if (filter === "errors")
      return logs.filter((l) => l.log_type === "bot_error");
    return logs;
  }, [logs, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length && visibleCount < LOG_MAX;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount((c) => Math.min(c + LOG_PAGE_SIZE, LOG_MAX));
    }
  }, [hasMore]);

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Live Activity" description="Most recent bot log entries." />
      <GlassPanel variant="glow-tl">
        <div className="relative border-b border-zinc-800/60 px-6 py-3">
          <FilterRow options={LOG_FILTERS} selected={filter} onSelect={(v) => { setFilter(v); setVisibleCount(LOG_PAGE_SIZE); }} />
        </div>
        <div
          className="relative h-[480px] overflow-y-auto scrollbar-thin"
          onScroll={handleScroll}
        >
          {visible.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-12">No activity to show.</p>
          ) : (
            <div className="divide-y divide-zinc-800/20">
              {visible.map((log) => {
                const data = parseJsonSafe(log.data);
                const showBadge = ["trade_placed", "trade_win", "trade_loss"].includes(log.log_type) && data;

                return (
                  <div
                    key={log.id}
                    className={cn("flex items-start gap-3 px-6 py-3 transition-colors", logRowBg(log.log_type))}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <LogIcon logType={log.log_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 truncate">{log.message}</p>
                      {showBadge && data && (
                        <div className="mt-1 flex gap-1.5">
                          {typeof data.market_type === "string" && (
                            <Badge variant="default">{fmtMarket(data.market_type)}</Badge>
                          )}
                          {typeof data.direction === "string" && (
                            <Badge variant={data.direction === "up" ? "up" : "down"}>
                              {data.direction.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-zinc-500 tabular-nums">
                      {fmtTime(log.logged_at)}
                    </span>
                  </div>
                );
              })}
              {hasMore && (
                <div className="py-3 text-center">
                  <span className="text-xs text-zinc-600">Scroll for more...</span>
                </div>
              )}
              {visibleCount >= LOG_MAX && filtered.length > LOG_MAX && (
                <div className="py-3 text-center">
                  <span className="text-xs text-zinc-500">Showing max {LOG_MAX} entries</span>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — Trade History Table (GlassPanel, fixed-height scroll)
// ---------------------------------------------------------------------------

const TRADE_FILTERS = [
  { value: "all", label: "All" },
  { value: "wins", label: "Wins" },
  { value: "losses", label: "Losses" },
  { value: "live", label: "Live" },
];

const TRADE_PAGE_SIZE = 50;
const TRADE_MAX = 1000;

function TradeHistory({ trades }: { trades: ActivityData["trades"] }) {
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(TRADE_PAGE_SIZE);

  // Only show filled trades (won, lost, live) — exclude skipped and no-fill
  const filledTrades = useMemo(() => trades.filter((t) => t.status === "filled"), [trades]);

  const filtered = useMemo(() => {
    if (filter === "wins") return filledTrades.filter((t) => t.final_outcome === "win");
    if (filter === "losses") return filledTrades.filter((t) => t.final_outcome === "loss");
    if (filter === "live") return filledTrades.filter((t) => !t.final_outcome);
    return filledTrades;
  }, [filledTrades, filter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length && visibleCount < TRADE_MAX;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && hasMore) {
      setVisibleCount((c) => Math.min(c + TRADE_PAGE_SIZE, TRADE_MAX));
    }
  }, [hasMore]);

  return (
    <section className="mb-8 md:mb-14">
      <SectionHeader title="Trade History" description="All trades placed by the bot, most recent first." />
      <GlassPanel variant="glow-wide">
        <div className="relative border-b border-zinc-800/60 px-6 py-3">
          <FilterRow options={TRADE_FILTERS} selected={filter} onSelect={(v) => { setFilter(v); setVisibleCount(TRADE_PAGE_SIZE); }} />
        </div>
        {/* Sticky header + scrollable body */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="border-b border-zinc-800/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Time</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Market</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Strategy</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Dir</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Entry</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Outcome</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">PnL</th>
              </tr>
            </thead>
          </table>
        </div>
        <div
          className="h-[520px] overflow-y-auto overflow-x-auto scrollbar-thin"
          onScroll={handleScroll}
        >
          <table className="w-full">
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-zinc-500">
                    No trades to show.
                  </td>
                </tr>
              ) : (
                visible.map((t) => {
                  const tPnl = pf(t.pnl);
                  const style = getStrategyStyle(t.strategy_name);
                  return (
                    <tr key={t.id} className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3 text-sm tabular-nums text-zinc-400">{fmtDateTime(t.placed_at)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{fmtMarket(t.market_type)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium border", style.badge)}>
                          {t.strategy_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.direction === "up" ? (
                          <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <ArrowUpRight size={12} /> Up
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-red-400">
                            <ArrowDownRight size={12} /> Down
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm tabular-nums text-zinc-200">
                        {fmtPrice(pf(t.entry_price))}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm tabular-nums text-zinc-200">
                        {fmtDollar(pf(t.bet_size_usd))}
                      </td>
                      <td className="px-4 py-3">
                        {t.status === "filled" ? (
                          <Badge variant="up">Filled</Badge>
                        ) : t.status === "fok_no_fill" ? (
                          <Badge variant="default">No Fill</Badge>
                        ) : t.status.startsWith("skipped") ? (
                          <Badge variant="default">Skipped</Badge>
                        ) : t.status === "dry_run" ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Dry Run</span>
                        ) : (
                          <Badge variant="default">{t.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.status !== "filled" ? null : !t.final_outcome ? (
                          <span className="text-xs font-medium text-yellow-400">Pending...</span>
                        ) : t.final_outcome === "win" ? (
                          <span className="text-xs font-medium text-emerald-400">Win ✓</span>
                        ) : (
                          <span className="text-xs font-medium text-red-400">Loss ✗</span>
                        )}
                      </td>
                      <td className={cn("px-4 py-3 font-mono text-sm font-bold tabular-nums", !t.pnl || t.final_outcome == null ? "text-zinc-600" : pnlColor(tPnl))}>
                        {t.pnl && t.final_outcome != null ? fmtPnl(tPnl) : ""}
                      </td>
                    </tr>
                  );
                })
              )}
              {hasMore && (
                <tr>
                  <td colSpan={9} className="py-3 text-center">
                    <span className="text-xs text-zinc-600">Scroll for more...</span>
                  </td>
                </tr>
              )}
              {visibleCount >= TRADE_MAX && filtered.length > TRADE_MAX && (
                <tr>
                  <td colSpan={9} className="py-3 text-center">
                    <span className="text-xs text-zinc-500">Showing max {TRADE_MAX} trades</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton (matches dashboard patterns)
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <>
      {/* Overview skeleton */}
      <section className="mb-8 md:mb-14">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/60 to-transparent" />
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.06] sm:grid-cols-3 lg:grid-cols-6">
          <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-950 p-6">
              <div className="h-2.5 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="mt-3 h-8 w-20 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>

      {/* Strategy cards skeleton */}
      <section className="mb-8 md:mb-14">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-40 animate-pulse rounded bg-zinc-800" />
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/60 to-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 md:p-6">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-800" />
              </div>
              <div className="mt-4 h-8 w-24 animate-pulse rounded bg-zinc-800" />
              <div className="mt-4 flex items-center gap-4">
                <div className="h-8 w-14 animate-pulse rounded bg-zinc-800" />
                <div className="h-8 w-14 animate-pulse rounded bg-zinc-800" />
                <div className="h-8 w-10 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart skeleton */}
      <section className="mb-8 md:mb-14">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-36 animate-pulse rounded bg-zinc-800" />
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/60 to-transparent" />
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-zinc-950 p-6">
          <div className="h-[300px] animate-pulse rounded bg-zinc-800/30" />
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Bot Monitor Component
// ---------------------------------------------------------------------------

export function BotMonitor() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, actRes] = await Promise.all([
        fetch("/api/bot-overview"),
        fetch("/api/bot-activity?page=1&limit=200&type=all"),
      ]);
      const [ovData, actData] = await Promise.all([ovRes.json(), actRes.json()]);
      setOverview(ovData);
      setActivity(actData);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error("Failed to fetch bot data:", err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, router]);

  // Seconds-ago counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Detect bot mode
  const botMode = useMemo(() => {
    if (!activity?.logs) return null;
    for (const log of activity.logs) {
      if (log.log_type === "trade_dry_run") return "DRY RUN";
      if (log.log_type === "trade_placed") return "LIVE";
    }
    return null;
  }, [activity]);

  // Last trade timestamp
  const lastTradeAt = useMemo(() => {
    if (!activity?.trades || activity.trades.length === 0) return null;
    return activity.trades[0].placed_at;
  }, [activity]);

  const loading = !overview || !activity;

  return (
    <>
      {/* Hero-style header (matches dashboard hero) */}
      <div className="mb-8 md:mb-14 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
          <BotStatusDot lastTradeAt={lastTradeAt} />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Bot Monitor
          </h1>
          {botMode && (
            <span className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium border",
              botMode === "LIVE"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            )}>
              {botMode}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-zinc-500">
          Live trading activity — auto-refreshes every 30 seconds
        </p>
        <p className="mt-1 text-xs text-zinc-600 tabular-nums">
          Updated {secondsAgo}s ago
        </p>
        <div className="mt-4 flex items-center gap-2">
          <DownloadButton label="Export Trades" href="/api/bot-export-trades" iconSize={12} />
          <DownloadButton label="Export Activity" href="/api/bot-export-activity" iconSize={12} />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <OverviewCards overview={overview} />
          <StrategyCards strategies={overview.strategies} />
          <HourlySummary data={overview.hourlySummary} />
          <PnlChart trades={activity.trades} />
          <ActivityFeed logs={activity.logs} />
          <TradeHistory trades={activity.trades} />
        </>
      )}
    </>
  );
}
