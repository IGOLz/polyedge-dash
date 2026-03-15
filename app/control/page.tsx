"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { LogOut, AlertTriangle } from "lucide-react";

interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
}

const STRATEGY_TOGGLES = [
  { key: "strategy_farming_enabled", label: "Farming" },
  { key: "strategy_momentum_enabled", label: "Momentum" },
  { key: "strategy_streak_enabled", label: "Streak" },
  { key: "strategy_calibration_enabled", label: "Calibration" },
  { key: "strategy_late_dip_recovery_enabled", label: "Late Dip Recovery" },
  { key: "strategy_momentum_broad_enabled", label: "Momentum — Broad Tier" },
  { key: "strategy_momentum_filtered_enabled", label: "Momentum — Filtered Tier" },
  { key: "strategy_momentum_aggressive_enabled", label: "Momentum — Aggressive Tier" },
];

interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  type: "number" | "select" | "toggle";
  options?: string[];
  defaultValue?: string;
  /** For toggle params: key(s) of child params to show when toggle is on */
  childKey?: string;
  childKeys?: string[];
  /** Hint text shown below the label */
  hint?: string;
  /** Visual subgroup divider label — rendered before this param */
  subgroup?: string;
}

const PARAM_GROUPS: { group: string; params: ParamDef[] }[] = [
  {
    group: "Global",
    params: [
      { key: "bet_size_usd", label: "Bet Size USD", min: 0.01, max: 10000, step: 0.01, type: "number", defaultValue: "1.50" },
      { key: "daily_loss_limit", label: "Daily Loss Limit", min: 0.01, max: 100000, step: 0.01, type: "number", defaultValue: "30.00" },
    ],
  },
  {
    group: "Farming",
    params: [
      { key: "farming_trigger_point", label: "Trigger Point", min: 0.50, max: 0.95, step: 0.01, type: "number", defaultValue: "0.70" },
      { key: "farming_exit_point", label: "Exit Point", min: 0.10, max: 0.50, step: 0.01, type: "number", defaultValue: "0.30" },
      { key: "farming_max_entry_minutes", label: "Max Entry Minutes", min: 1, max: 14, step: 1, type: "number", defaultValue: "3" },
      { key: "farming_use_stop_loss", label: "Use Stop Loss", min: 0, max: 0, step: 0, type: "toggle", defaultValue: "true", childKey: "farming_stop_loss_exit_point" },
      { key: "farming_stop_loss_exit_point", label: "Stop Loss Exit Point", min: 0.10, max: 0.50, step: 0.01, type: "number", defaultValue: "0.30" },
    ],
  },
  {
    group: "Momentum",
    params: [
      { key: "momentum_min_threshold", label: "Min Momentum Threshold", min: 0.01, max: 0.20, step: 0.01, type: "number", defaultValue: "0.02" },
      { key: "momentum_min_shares", label: "Min Shares (0 = disabled)", min: 0, max: 20, step: 1, type: "number", defaultValue: "0", hint: "Minimum shares per trade. Ensures stop-loss meets Polymarket minimum order size of 5. Set to 0 to disable." },
      { key: "momentum_use_stop_loss", label: "Use Stop Loss", min: 0, max: 0, step: 0, type: "toggle", defaultValue: "true", childKey: "momentum_stop_loss_exit_point" },
      { key: "momentum_stop_loss_exit_point", label: "Stop Loss Exit Point", min: 0.30, max: 0.70, step: 0.01, type: "number", defaultValue: "0.50" },
      // Bet Size Multipliers subgroup
      { key: "momentum_multiplier_weak_threshold", label: "Weak Signal Threshold", min: 0.01, max: 0.10, step: 0.01, type: "number", defaultValue: "0.03", subgroup: "Bet Size Multipliers", hint: "Below this momentum = weak signal" },
      { key: "momentum_multiplier_strong_threshold", label: "Strong Signal Threshold", min: 0.03, max: 0.15, step: 0.01, type: "number", defaultValue: "0.07", hint: "Above this momentum = strong signal" },
      { key: "momentum_multiplier_weak", label: "Weak Multiplier", min: 0.25, max: 1.0, step: 0.25, type: "number", defaultValue: "0.67", hint: "Weak signal bet multiplier (e.g. 0.67 = $1.00 on $1.50 base)" },
      { key: "momentum_multiplier_base", label: "Base Multiplier", min: 0.5, max: 1.5, step: 0.25, type: "number", defaultValue: "1.0", hint: "Normal signal bet multiplier" },
      { key: "momentum_multiplier_strong", label: "Strong Multiplier", min: 1.0, max: 3.0, step: 0.25, type: "number", defaultValue: "1.5", hint: "Strong signal bet multiplier" },
      { key: "momentum_multiplier_very_strong", label: "Very Strong Multiplier", min: 1.5, max: 4.0, step: 0.25, type: "number", defaultValue: "2.0", hint: "Very strong signal bet multiplier" },
      { key: "momentum_multiplier_price_penalty", label: "Apply Price Penalty", min: 0, max: 0, step: 0, type: "toggle", defaultValue: "true", childKeys: ["momentum_multiplier_price_penalty_threshold", "momentum_multiplier_price_penalty_factor"], hint: "Reduce bet size at extreme prices (above threshold)" },
      { key: "momentum_multiplier_price_penalty_threshold", label: "Penalty Threshold", min: 0.55, max: 0.85, step: 0.01, type: "number", defaultValue: "0.70", hint: "Apply penalty when price is beyond this distance from center" },
      { key: "momentum_multiplier_price_penalty_factor", label: "Penalty Factor", min: 0.25, max: 0.75, step: 0.25, type: "number", defaultValue: "0.5", hint: "Multiply the bet multiplier by this factor at extreme prices" },
    ],
  },
  {
    group: "Streak",
    params: [
      { key: "streak_length", label: "Streak Length", min: 2, max: 5, step: 1, type: "number", defaultValue: "3" },
      { key: "streak_direction", label: "Streak Direction", min: 0, max: 0, step: 0, type: "select", options: ["Up", "Down", "both"], defaultValue: "both" },
    ],
  },
  {
    group: "Calibration",
    params: [
      { key: "calibration_max_entry_seconds", label: "Max Entry Seconds", min: 30, max: 120, step: 1, type: "number", defaultValue: "60" },
      { key: "calibration_entry_price_low", label: "Entry Price Low", min: 0.30, max: 0.60, step: 0.01, type: "number", defaultValue: "0.48" },
      { key: "calibration_entry_price_high", label: "Entry Price High", min: 0.40, max: 0.70, step: 0.01, type: "number", defaultValue: "0.58" },
      { key: "calibration_min_deviation", label: "Min Deviation", min: 0.05, max: 0.20, step: 0.01, type: "number", defaultValue: "0.10" },
    ],
  },
  {
    group: "Late Dip Recovery",
    params: [
      { key: "late_dip_min_avg_price", label: "Min Avg Price (min 5-10)", min: 0.55, max: 0.85, step: 0.01, type: "number", defaultValue: "0.65" },
      { key: "late_dip_min_drop_required", label: "Min Drop Required", min: 0.10, max: 0.40, step: 0.01, type: "number", defaultValue: "0.20" },
      { key: "late_dip_use_stop_loss", label: "Use Stop Loss", min: 0, max: 0, step: 0, type: "toggle", defaultValue: "true", childKey: "late_dip_stop_loss_exit_point" },
      { key: "late_dip_stop_loss_exit_point", label: "Stop Loss Exit Point", min: 0.10, max: 0.50, step: 0.01, type: "number", defaultValue: "0.35" },
    ],
  },
];

/** Keys that are child params of a toggle — used to determine visibility */
const TOGGLE_CHILD_MAP: Record<string, string> = {};
PARAM_GROUPS.forEach(({ params }) => {
  params.forEach((p) => {
    if (p.type === "toggle") {
      if (p.childKey) TOGGLE_CHILD_MAP[p.childKey] = p.key;
      if (p.childKeys) p.childKeys.forEach((ck) => { TOGGLE_CHILD_MAP[ck] = p.key; });
    }
  });
});

// ---------------------------------------------------------------------------
// Momentum tier configuration
// ---------------------------------------------------------------------------

const MOMENTUM_TIERS = ["broad", "filtered", "aggressive"] as const;
type MomentumTier = (typeof MOMENTUM_TIERS)[number];

const TIER_LABELS: Record<MomentumTier, string> = {
  broad: "Broad",
  filtered: "Filtered",
  aggressive: "Aggressive",
};

interface TierParamDef {
  param: string;
  label: string;
  type: "number" | "decimal" | "select" | "toggle";
  options?: { value: string; label: string }[];
  defaultValue: string;
  hint?: string;
  subgroup?: string;
  min?: number;
  max?: number;
  step?: number;
  childParam?: string;
}

const TIER_PARAMS: TierParamDef[] = [
  // Signal timing
  { param: "price_a_seconds", label: "Price Sample A", type: "number", defaultValue: "45", hint: "First price snapshot (seconds)", subgroup: "Signal Timing", min: 1, max: 300, step: 1 },
  { param: "price_b_seconds", label: "Price Sample B", type: "number", defaultValue: "90", hint: "Second snapshot (seconds). Must be > A", min: 1, max: 300, step: 1 },
  { param: "entry_after_seconds", label: "Enter After", type: "number", defaultValue: "95", hint: "Don't fire before this second", min: 1, max: 300, step: 1 },
  { param: "entry_until_seconds", label: "Enter Until", type: "number", defaultValue: "120", hint: "Stop firing after this second", min: 1, max: 300, step: 1 },
  // Signal strength
  { param: "threshold", label: "Momentum Threshold", type: "decimal", defaultValue: "0.03", hint: "Min price delta to trigger (e.g. 0.03 = 3¢)", subgroup: "Signal Strength", min: 0.001, max: 1, step: 0.001 },
  // Entry price filter
  { param: "price_min", label: "Min Entry Price", type: "decimal", defaultValue: "0.40", hint: "Don't enter below this price", subgroup: "Entry Price Filter", min: 0.01, max: 0.99, step: 0.01 },
  { param: "price_max", label: "Max Entry Price", type: "decimal", defaultValue: "0.75", hint: "Don't enter above this price", min: 0.01, max: 0.99, step: 0.01 },
  // Direction & Market filters
  { param: "direction", label: "Direction", type: "select", options: [{ value: "both", label: "Both" }, { value: "up_only", label: "Up Only" }, { value: "down_only", label: "Down Only" }], defaultValue: "both", subgroup: "Direction & Market Filters" },
  { param: "markets", label: "Markets", type: "select", options: [{ value: "all", label: "All (BTC, ETH, XRP, SOL)" }, { value: "no_btc", label: "No BTC" }, { value: "xrp_sol_only", label: "XRP & SOL Only" }], defaultValue: "all" },
  // Hour filter
  { param: "hours_start", label: "Active From (UTC)", type: "number", defaultValue: "8", hint: "Hour to start, inclusive", subgroup: "Hour Filter", min: 0, max: 23, step: 1 },
  { param: "hours_end", label: "Active Until (UTC)", type: "number", defaultValue: "24", hint: "Hour to stop, exclusive", min: 1, max: 24, step: 1 },
  // Bet sizing
  { param: "bet_size", label: "Bet Size (USD)", type: "decimal", defaultValue: "1.00", hint: "Fixed dollar amount per trade", subgroup: "Bet Sizing", min: 0.01, max: 10000, step: 0.01 },
  // Stop-loss
  { param: "stop_loss_enabled", label: "Enable Stop-Loss", type: "toggle", defaultValue: "false", childParam: "stop_loss_price", subgroup: "Stop-Loss" },
  { param: "stop_loss_price", label: "Stop-Loss Price", type: "decimal", defaultValue: "0.35", hint: "GTC sell price if token drops", min: 0.01, max: 0.99, step: 0.01 },
];

/** Build the full DB key for a tier param */
function tierKey(tier: MomentumTier, param: string): string {
  return `momentum_${tier}_${param}`;
}

function formatTimestamp(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Toggle switch component
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-zinc-950 shadow-lg transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Saved indicator
// ---------------------------------------------------------------------------

function SavedIndicator({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-xs font-medium text-emerald-400 animate-fade-in">
      Saved ✓
    </span>
  );
}

// ---------------------------------------------------------------------------
// Control page
// ---------------------------------------------------------------------------

export default function ControlPage() {
  const [config, setConfig] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [activeTier, setActiveTier] = useState<MomentumTier>("broad");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/bot-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        const vals: Record<string, string> = {};
        data.forEach((row: ConfigRow) => {
          vals[row.key] = row.value;
        });
        setParamValues(vals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  function getConfigValue(key: string, fallback?: string): string {
    const row = config.find((r) => r.key === key);
    return row?.value ?? fallback ?? "";
  }

  function getConfigTimestamp(key: string): string {
    const row = config.find((r) => r.key === key);
    return row?.updated_at ?? "";
  }

  async function saveKey(key: string, value: string) {
    const res = await fetch("/api/bot-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      setSavedKeys((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSavedKeys((prev) => ({ ...prev, [key]: false }));
      }, 2000);
      // Refresh config to get updated timestamps
      fetchConfig();
    }
  }

  async function handleToggle(key: string, enabled: boolean) {
    await saveKey(key, enabled ? "true" : "false");
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-50">Bot Control</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {/* Warning banner */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm font-medium text-amber-300">
            Changes take effect within 5 seconds — the bot reads configuration on every loop.
          </p>
        </div>

        {/* Section 1 — Strategy Toggles */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Strategy Toggles
          </h2>
          <div className="space-y-2">
            {STRATEGY_TOGGLES.map(({ key, label }) => {
              const enabled = getConfigValue(key) === "true";
              const ts = getConfigTimestamp(key);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={enabled}
                      onChange={(v) => handleToggle(key, v)}
                    />
                    <span className="text-sm font-medium text-zinc-200">
                      {label}
                    </span>
                    <SavedIndicator show={!!savedKeys[key]} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        enabled
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                    {ts && (
                      <span className="text-xs text-muted-foreground">
                        Updated {formatTimestamp(ts)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2 — Momentum Tiers */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Momentum Tiers
          </h2>

          {/* Tier tabs */}
          <div className="flex gap-1 mb-4 rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-1">
            {MOMENTUM_TIERS.map((tier) => {
              const isActive = activeTier === tier;
              const enabledKey = `strategy_momentum_${tier}_enabled`;
              const tierEnabled = getConfigValue(enabledKey) === "true";
              return (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {TIER_LABELS[tier]}
                  <span
                    className={`ml-2 inline-block h-1.5 w-1.5 rounded-full ${
                      tierEnabled ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Active tier params */}
          <div className="space-y-2">
            {TIER_PARAMS.map((tp) => {
              const dbKey = tierKey(activeTier, tp.param);

              // Hide child params when parent toggle is off
              if (tp.param === "stop_loss_price") {
                const parentKey = tierKey(activeTier, "stop_loss_enabled");
                const parentVal = paramValues[parentKey] ?? "false";
                if (parentVal !== "true") return null;
              }

              const ts = getConfigTimestamp(dbKey);
              const currentValue = paramValues[dbKey] ?? tp.defaultValue;

              // Subgroup divider
              const subgroupEl = tp.subgroup ? (
                <div className="flex items-center gap-3 pt-3 pb-1">
                  <div className="h-px flex-1 bg-zinc-800/60" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {tp.subgroup}
                  </span>
                  <div className="h-px flex-1 bg-zinc-800/60" />
                </div>
              ) : null;

              // Stop-loss warning: bet_size < $5
              const stopLossWarning =
                tp.param === "stop_loss_enabled" &&
                parseFloat(paramValues[tierKey(activeTier, "bet_size")] ?? "1.00") < 5;

              if (tp.type === "toggle") {
                const checked = (paramValues[dbKey] ?? tp.defaultValue) === "true";
                return (
                  <div key={dbKey}>
                    {subgroupEl}
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3">
                      <div className="min-w-[180px]">
                        <label className="text-sm text-zinc-300">{tp.label}</label>
                        {tp.hint && <p className="text-xs text-muted-foreground mt-0.5">{tp.hint}</p>}
                      </div>
                      <div className="flex flex-1 items-center gap-2">
                        <ToggleSwitch
                          checked={checked}
                          onChange={(v) => {
                            const val = v ? "true" : "false";
                            setParamValues((prev) => ({ ...prev, [dbKey]: val }));
                            saveKey(dbKey, val);
                          }}
                        />
                        <span className={`text-xs font-medium ${checked ? "text-emerald-400" : "text-zinc-500"}`}>
                          {checked ? "On" : "Off"}
                        </span>
                        <SavedIndicator show={!!savedKeys[dbKey]} />
                      </div>
                      {ts && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Updated {formatTimestamp(ts)}
                        </span>
                      )}
                    </div>
                    {stopLossWarning && (
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        <p className="text-xs font-medium text-amber-300">
                          Stop-loss inactive — minimum bet size is $5
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              if (tp.type === "select") {
                return (
                  <div key={dbKey}>
                    {subgroupEl}
                    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3">
                      <div className="min-w-[180px]">
                        <label htmlFor={dbKey} className="text-sm text-zinc-300">{tp.label}</label>
                        {tp.hint && <p className="text-xs text-muted-foreground mt-0.5">{tp.hint}</p>}
                      </div>
                      <div className="flex flex-1 items-center gap-2">
                        <select
                          id={dbKey}
                          value={currentValue}
                          onChange={(e) =>
                            setParamValues((prev) => ({ ...prev, [dbKey]: e.target.value }))
                          }
                          className="w-48 rounded-lg border border-zinc-800/60 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                        >
                          {tp.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveKey(dbKey, paramValues[dbKey] ?? tp.defaultValue)}
                          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          Save
                        </button>
                        <SavedIndicator show={!!savedKeys[dbKey]} />
                      </div>
                      {ts && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Updated {formatTimestamp(ts)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              // number / decimal input
              return (
                <div key={dbKey}>
                  {subgroupEl}
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3">
                    <div className="min-w-[180px]">
                      <label htmlFor={dbKey} className="text-sm text-zinc-300">{tp.label}</label>
                      {tp.hint && <p className="text-xs text-muted-foreground mt-0.5">{tp.hint}</p>}
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        id={dbKey}
                        type="number"
                        min={tp.min}
                        max={tp.max}
                        step={tp.step}
                        value={currentValue}
                        onChange={(e) =>
                          setParamValues((prev) => ({ ...prev, [dbKey]: e.target.value }))
                        }
                        className="w-32 rounded-lg border border-zinc-800/60 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                      />
                      <button
                        onClick={() => saveKey(dbKey, paramValues[dbKey] ?? tp.defaultValue)}
                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        Save
                      </button>
                      <SavedIndicator show={!!savedKeys[dbKey]} />
                    </div>
                    {ts && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Updated {formatTimestamp(ts)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross-tier comparison */}
          <div className="mt-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Tier Comparison
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {MOMENTUM_TIERS.map((tier) => {
                const bet = paramValues[tierKey(tier, "bet_size")] ?? "1.00";
                const thresh = paramValues[tierKey(tier, "threshold")] ?? "0.03";
                const dir = paramValues[tierKey(tier, "direction")] ?? "both";
                const mkts = paramValues[tierKey(tier, "markets")] ?? "all";
                const enabled = getConfigValue(`strategy_momentum_${tier}_enabled`) === "true";
                return (
                  <div key={tier} className={`${!enabled ? "opacity-40" : ""}`}>
                    <p className="text-xs font-semibold text-zinc-400 mb-1">
                      {TIER_LABELS[tier]}
                      {!enabled && <span className="ml-1 text-zinc-600">(off)</span>}
                    </p>
                    <p className="text-zinc-300">Bet: <span className="font-medium">${parseFloat(bet).toFixed(2)}</span></p>
                    <p className="text-zinc-300">Threshold: <span className="font-medium">{thresh}</span></p>
                    <p className="text-zinc-300">Direction: <span className="font-medium">{dir}</span></p>
                    <p className="text-zinc-300">Markets: <span className="font-medium">{mkts}</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3 — Parameters */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Parameters
          </h2>
          <div className="space-y-6">
            {PARAM_GROUPS.map(({ group, params }) => {
              // Compute momentum preview values for the Momentum group
              const isMomentum = group === "Momentum";
              const baseBet = parseFloat(paramValues["bet_size_usd"] ?? "1.50") || 1.50;
              const multWeak = parseFloat(paramValues["momentum_multiplier_weak"] ?? "0.67") || 0.67;
              const multBase = parseFloat(paramValues["momentum_multiplier_base"] ?? "1.0") || 1.0;
              const multStrong = parseFloat(paramValues["momentum_multiplier_strong"] ?? "1.5") || 1.5;
              const multVeryStrong = parseFloat(paramValues["momentum_multiplier_very_strong"] ?? "2.0") || 2.0;

              return (
              <div key={group}>
                <h3 className="text-base font-semibold text-zinc-300 mb-3">
                  {group}
                </h3>
                <div className="space-y-2">
                  {params.map((param) => {
                    // Hide child params when their parent toggle is off
                    const parentToggleKey = TOGGLE_CHILD_MAP[param.key];
                    if (parentToggleKey) {
                      const parentVal = paramValues[parentToggleKey] ?? getConfigValue(parentToggleKey, "true");
                      if (parentVal !== "true") return null;
                    }

                    const ts = getConfigTimestamp(param.key);
                    const currentValue = paramValues[param.key] ?? param.defaultValue ?? "";

                    // Subgroup divider
                    const subgroupEl = param.subgroup ? (
                      <div className="flex items-center gap-3 pt-3 pb-1">
                        <div className="h-px flex-1 bg-zinc-800/60" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          {param.subgroup}
                        </span>
                        <div className="h-px flex-1 bg-zinc-800/60" />
                      </div>
                    ) : null;

                    if (param.type === "toggle") {
                      const checked = (paramValues[param.key] ?? getConfigValue(param.key, param.defaultValue)) === "true";
                      return (
                        <div key={param.key}>
                          {subgroupEl}
                          <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3">
                            <div className="min-w-[180px]">
                              <label className="text-sm text-zinc-300">
                                {param.label}
                              </label>
                              {param.hint && (
                                <p className="text-xs text-muted-foreground mt-0.5">{param.hint}</p>
                              )}
                            </div>
                            <div className="flex flex-1 items-center gap-2">
                              <ToggleSwitch
                                checked={checked}
                                onChange={(v) => {
                                  const val = v ? "true" : "false";
                                  setParamValues((prev) => ({ ...prev, [param.key]: val }));
                                  saveKey(param.key, val);
                                }}
                              />
                              <span className={`text-xs font-medium ${checked ? "text-emerald-400" : "text-zinc-500"}`}>
                                {checked ? "On" : "Off"}
                              </span>
                              <SavedIndicator show={!!savedKeys[param.key]} />
                            </div>
                            {ts && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Updated {formatTimestamp(ts)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={param.key}>
                        {subgroupEl}
                        <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-4 py-3">
                          <div className="min-w-[180px]">
                            <label
                              htmlFor={param.key}
                              className="text-sm text-zinc-300"
                            >
                              {param.label}
                            </label>
                            {param.hint && (
                              <p className="text-xs text-muted-foreground mt-0.5">{param.hint}</p>
                            )}
                          </div>
                          <div className="flex flex-1 items-center gap-2">
                            {param.type === "select" ? (
                              <select
                                id={param.key}
                                value={currentValue}
                                onChange={(e) =>
                                  setParamValues((prev) => ({
                                    ...prev,
                                    [param.key]: e.target.value,
                                  }))
                                }
                                className="w-32 rounded-lg border border-zinc-800/60 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                              >
                                {param.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={param.key}
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={currentValue}
                                onChange={(e) =>
                                  setParamValues((prev) => ({
                                    ...prev,
                                    [param.key]: e.target.value,
                                  }))
                                }
                                className="w-32 rounded-lg border border-zinc-800/60 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                              />
                            )}
                            <button
                              onClick={() =>
                                saveKey(param.key, paramValues[param.key] ?? param.defaultValue ?? "")
                              }
                              className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                            >
                              Save
                            </button>
                            <SavedIndicator show={!!savedKeys[param.key]} />
                          </div>
                          {ts && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Updated {formatTimestamp(ts)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Momentum bet sizing preview */}
                {isMomentum && (
                  <div className="mt-3 rounded-lg border border-zinc-800/40 bg-zinc-950/50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                      Preview (base ${baseBet.toFixed(2)})
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-sm text-zinc-400">
                        Weak: <span className="font-medium text-zinc-200">${Math.max(baseBet * multWeak, 1.00).toFixed(2)}</span>
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-sm text-zinc-400">
                        Base: <span className="font-medium text-zinc-200">${Math.max(baseBet * multBase, 1.00).toFixed(2)}</span>
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-sm text-zinc-400">
                        Strong: <span className="font-medium text-zinc-200">${Math.max(baseBet * multStrong, 1.00).toFixed(2)}</span>
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-sm text-zinc-400">
                        Very Strong: <span className="font-medium text-zinc-200">${Math.max(baseBet * multVeryStrong, 1.00).toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
