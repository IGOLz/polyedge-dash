import Link from "next/link";
import { getMarketsByType } from "@/lib/queries";
import { parseMarketType } from "@/lib/formatters";

const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
};

type MarketData = Awaited<ReturnType<typeof getMarketsByType>>[number];

function MarketCard({ market, index }: { market: MarketData; index: number }) {
  const { asset, interval } = parseMarketType(market.marketType);
  const total = market.resolved + market.active + market.unknownOutcome;

  return (
    <Link
      href={`/markets?type=${market.marketType}`}
      className="group relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-4 md:p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-zinc-900 animate-slide-up cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl" />

      <div className="relative">
        <span className="text-2xl font-bold tracking-tight text-zinc-100">
          {ASSET_NAMES[asset] || asset}
        </span>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Resolved
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-200">
            {market.resolved.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Total
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-200">
            {total.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Ticks 24h
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-200">
            {market.ticks24h.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Outcomes
          </p>
          <p className="mt-0.5 flex items-center gap-1.5">
            <span className="font-mono text-sm tabular-nums text-emerald-400">{market.upWins.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-600">/</span>
            <span className="font-mono text-sm tabular-nums text-red-400">{market.downWins.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export async function MarketsGrid() {
  const markets = await getMarketsByType();

  const markets5m = markets.filter((m) => m.marketType.endsWith("_5m"));
  const markets15m = markets.filter((m) => m.marketType.endsWith("_15m"));

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-zinc-300">5m Markets</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {markets5m.map((market, i) => (
            <MarketCard key={market.marketType} market={market} index={i} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-zinc-300">15m Markets</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {markets15m.map((market, i) => (
            <MarketCard key={market.marketType} market={market} index={i + markets5m.length} />
          ))}
        </div>
      </div>
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
