import type { FilterOption } from "@/types/market";

export const ASSET_FILTERS: FilterOption[] = [
  { value: "all", label: "All" },
  { value: "btc", label: "BTC" },
  { value: "eth", label: "ETH" },
  { value: "sol", label: "SOL" },
  { value: "xrp", label: "XRP" },
];

export const INTERVAL_FILTERS: FilterOption[] = [
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
];

export const MARKET_TYPES = [
  "btc_5m", "btc_15m",
  "eth_5m", "eth_15m",
  "xrp_5m", "xrp_15m",
  "sol_5m", "sol_15m",
] as const;

export const ASSET_COLORS: Record<string, string> = {
  btc: "#f59e0b",
  eth: "#3b82f6",
  sol: "#a855f7",
  xrp: "#06b6d4",
};

export const OUTCOME_COLORS = {
  Up: { text: "text-emerald-400", bg: "bg-emerald-400", line: "#4ade80" },
  Down: { text: "text-red-400", bg: "bg-red-400", line: "#f87171" },
  Unknown: { text: "text-zinc-300", bg: "bg-zinc-600", line: "#e4f600" },
} as const;

/** Stable base timestamp (midnight Jan 1 2024 UTC) for chart x-axis alignment */
export const CHART_BASE_TIME = 1704067200;

export const POLLING_INTERVAL_MS = 60_000;
export const REVALIDATE_SECONDS = 60;
