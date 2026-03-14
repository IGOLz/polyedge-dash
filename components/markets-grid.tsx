import Link from "next/link";
import { getMarketsByType } from "@/lib/queries";
import { parseMarketType } from "@/lib/formatters";

export async function MarketsGrid() {
  const markets = await getMarketsByType();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {markets.map((market, i) => {
        const { asset, interval } = parseMarketType(market.marketType);
        const { upWinRate24h: winRate24h, upWinRate: winRateAll } = market;
        const barWidth = Math.max(5, Math.min(95, winRate24h));

        return (
          <Link
            key={market.marketType}
            href={`/markets?type=${market.marketType}`}
            className="group relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-zinc-900 animate-slide-up cursor-pointer"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl" />

            <div className="absolute top-4 right-4 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
              {interval}
            </div>

            <div className="relative">
              <span className="text-2xl font-bold tracking-tight text-primary">
                {asset}
              </span>
            </div>

            <p className="relative mt-4 text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
              Resolved up · last 24h
            </p>

            <div className="relative mt-1 flex items-baseline gap-2">
              {market.resolved24h > 0 ? (
                <>
                  <span className={`font-mono text-3xl font-bold tabular-nums ${winRate24h >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                    {winRate24h.toFixed(1)}%
                  </span>
                  <span className="text-sm text-zinc-500">
                    of {market.resolved24h.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="font-mono text-3xl font-bold tabular-nums text-zinc-500">—</span>
              )}
            </div>

            <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
              {market.resolved24h > 0 && (
                <div
                  className={`h-full rounded-full transition-all duration-700 ${winRate24h >= 50 ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                  style={{ width: `${barWidth}%` }}
                />
              )}
            </div>

            <div className="relative mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                <span className="text-zinc-500" title="All-time win rate">
                  All: {winRateAll.toFixed(0)}% of {market.resolved.toLocaleString()}
                </span>
              </div>
              {market.active > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function MarketsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6"
        >
          <div className="h-7 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="mt-5 h-9 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="mt-4 h-4 w-28 animate-pulse rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
