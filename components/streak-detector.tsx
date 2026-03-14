import { Badge } from "@/components/ui/badge";

const ASSET_NAMES: Record<string, string> = {
  btc: "Bitcoin",
  eth: "Ethereum",
  sol: "Solana",
  xrp: "XRP",
};

function assetLabel(marketType: string): string {
  const asset = marketType.split("_")[0];
  return ASSET_NAMES[asset] || asset.toUpperCase();
}

interface StreakData {
  marketType: string;
  streakLength: number;
  streakDirection: string;
  lastTen: string[];
}

interface StreakDetectorProps {
  data: StreakData[];
}

function StreakCard({ streak }: { streak: StreakData }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-6 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-zinc-100">
            {assetLabel(streak.marketType)}
          </span>
          <Badge variant={streak.streakDirection === "Up" ? "up" : "down"}>
            {streak.streakLength}x {streak.streakDirection}
          </Badge>
        </div>

        <div className="mt-5 flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"
            title="Live"
          />
          {streak.lastTen.map((outcome, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                outcome === "Up" ? "bg-emerald-400" : "bg-red-400"
              }`}
              title={outcome}
            />
          ))}
          {streak.lastTen.length === 0 && (
            <span className="text-xs text-zinc-500">No data</span>
          )}
        </div>

        <p className="mt-2 text-[10px] text-zinc-400">
          Last {streak.lastTen.length} outcomes (newest first)
        </p>
      </div>
    </div>
  );
}

export function StreakDetector({ data }: StreakDetectorProps) {
  if (data.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-zinc-900/80 p-8 text-center text-sm text-zinc-500 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        Not enough data yet
      </div>
    );
  }

  const data5m = data.filter((d) => d.marketType.endsWith("_5m"));
  const data15m = data.filter((d) => d.marketType.endsWith("_15m"));

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-zinc-300">5m Markets</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data5m.map((streak) => (
            <StreakCard key={streak.marketType} streak={streak} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-zinc-300">15m Markets</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data15m.map((streak) => (
            <StreakCard key={streak.marketType} streak={streak} />
          ))}
        </div>
      </div>
    </div>
  );
}
