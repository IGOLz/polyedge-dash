"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { MarketChart } from "@/components/market-chart";
import { MultiMarketChart } from "@/components/multi-market-chart";
import { FilterButton } from "@/components/filter-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SectionHeader } from "@/components/section-header";
import { useMarkets } from "@/hooks/use-markets";
import type { DateOption } from "@/hooks/use-markets";
import { ASSET_FILTERS, INTERVAL_FILTERS } from "@/lib/constants";
import { formatUTCTime } from "@/lib/formatters";
import type { Market } from "@/types/market";
import { cn } from "@/lib/utils";

const CHIP_LIMIT = 48;

function getChipDotClass(market: Market): string {
  if (!market.resolved) return "bg-amber-400";
  if (market.final_outcome === "Up") return "bg-emerald-400";
  if (market.final_outcome === "Down") return "bg-red-400";
  return "bg-zinc-500";
}

function DateButton({
  option,
  active,
  onClick,
}: {
  option: DateOption;
  active: boolean;
  onClick: () => void;
}) {
  const disabled = option.count === 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
        disabled && "opacity-40 cursor-not-allowed",
        active
          ? "bg-primary/15 text-primary border border-primary/25"
          : "text-zinc-300 border border-transparent hover:bg-zinc-800/50 hover:text-zinc-300"
      )}
    >
      {option.label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
          active
            ? "bg-primary/20 text-primary"
            : "bg-zinc-800 text-zinc-400"
        )}
      >
        {option.count}
      </span>
    </button>
  );
}

function CustomDateButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200",
        active
          ? "bg-primary/15 text-primary border border-primary/25"
          : "text-zinc-300 border border-transparent hover:bg-zinc-800/50 hover:text-zinc-300"
      )}
    >
      Custom
    </button>
  );
}

function TimeChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex-shrink-0 rounded-lg px-4 py-2.5 text-left transition-all duration-200",
        selected
          ? "bg-primary/[0.08] border border-primary/30"
          : "bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 hover:bg-zinc-900/80"
      )}
    >
      {children}
    </button>
  );
}

export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner label="Loading markets..." />
          </div>
        </div>
      }
    >
      <MarketsContent />
    </Suspense>
  );
}

function MarketsContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "all";
  const initialAsset =
    initialType !== "all" ? initialType.split("_")[0] : "btc";
  const initialInterval =
    initialType !== "all" ? initialType.split("_")[1] : "5m";

  const {
    loading,
    filteredMarkets,
    timeGroups,
    isAllAssets,
    selectedId,
    setSelectedId,
    selectedMarket,
    selectedGroup,
    assetFilter,
    intervalFilter,
    handleAssetFilter,
    handleIntervalFilter,
    dateOptions,
    selectedDate,
    handleDateSelect,
    customDate,
    handleCustomDate,
    customDateCount,
  } = useMarkets(initialAsset, initialInterval);

  const [showAllChips, setShowAllChips] = useState(false);

  // Reset showAll when date changes
  const handleDateChange = (key: string) => {
    setShowAllChips(false);
    handleDateSelect(key);
  };

  const handleCustomDateChange = (date: string) => {
    setShowAllChips(false);
    handleCustomDate(date);
  };

  // Determine chips to display
  const chips: { id: string; time: string; dots: string[] }[] = isAllAssets
    ? timeGroups.map((g) => ({
        id: g.key,
        time: formatUTCTime(g.started_at),
        dots: g.markets.map((m) => getChipDotClass(m)),
      }))
    : filteredMarkets.map((m) => ({
        id: m.market_id,
        time: formatUTCTime(m.started_at),
        dots: [getChipDotClass(m)],
      }));

  const visibleChips =
    !showAllChips && chips.length > CHIP_LIMIT
      ? chips.slice(0, CHIP_LIMIT)
      : chips;

  const itemCount = chips.length;
  const itemLabel = isAllAssets ? "time slot" : "market";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <SectionHeader title="Market Browser" />

          {/* Asset + Interval filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {ASSET_FILTERS.map((f) => (
                <FilterButton
                  key={f.value}
                  label={f.label}
                  active={assetFilter === f.value}
                  onClick={() => handleAssetFilter(f.value)}
                />
              ))}
            </div>

            <div className="hidden md:block h-4 w-px bg-zinc-800/60" />

            <div className="flex items-center gap-1.5">
              {INTERVAL_FILTERS.map((f) => (
                <FilterButton
                  key={f.value}
                  label={f.label}
                  active={intervalFilter === f.value}
                  onClick={() => handleIntervalFilter(f.value)}
                />
              ))}
            </div>

            <span className="ml-auto text-xs font-medium text-zinc-400">
              {itemCount} {itemLabel}
              {itemCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner label="Loading markets..." />
          </div>
        ) : (
          <>
            {/* Level 1 — Date selector */}
            <div className="mb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {dateOptions.map((opt) => (
                  <DateButton
                    key={opt.key}
                    option={opt}
                    active={selectedDate === opt.key}
                    onClick={() => handleDateChange(opt.key)}
                  />
                ))}
                <div className="h-4 w-px bg-zinc-800/60 mx-1" />
                <CustomDateButton
                  active={selectedDate === "custom"}
                  onClick={() => handleDateChange("custom")}
                />
              </div>
            </div>

            {/* Custom date input */}
            {selectedDate === "custom" && (
              <div className="mb-3 flex items-center gap-3">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => handleCustomDateChange(e.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 [color-scheme:dark]"
                />
                {customDate && (
                  <span className="text-xs text-zinc-400">
                    {customDateCount} {customDateCount === 1 ? "market" : "markets"}
                  </span>
                )}
              </div>
            )}

            {/* Level 2 — Time chips */}
            <div className="mb-4">
              {chips.length === 0 ? (
                <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-400">
                  {selectedDate === "custom" && customDate
                    ? "No markets found for this date"
                    : "No markets for this date"}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 pb-2">
                    {visibleChips.map((chip) => (
                      <TimeChip
                        key={chip.id}
                        selected={chip.id === selectedId}
                        onClick={() => setSelectedId(chip.id)}
                      >
                        <div className="flex items-center gap-2">
                          {chip.dots.map((dotClass, i) => (
                            <span
                              key={i}
                              className={cn("h-2 w-2 rounded-full", dotClass)}
                            />
                          ))}
                          <span
                            className={cn(
                              "font-mono text-sm font-semibold tabular-nums",
                              chip.id === selectedId
                                ? "text-primary"
                                : "text-zinc-300"
                            )}
                          >
                            {chip.time}
                          </span>
                        </div>
                      </TimeChip>
                    ))}
                  </div>
                  {chips.length > CHIP_LIMIT && !showAllChips && (
                    <button
                      onClick={() => setShowAllChips(true)}
                      className="mt-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Show all {chips.length} chips
                    </button>
                  )}
                  {showAllChips && chips.length > CHIP_LIMIT && (
                    <button
                      onClick={() => setShowAllChips(false)}
                      className="mt-1 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Chart */}
            <GlassPanel
              variant="glow-center"
              className="flex flex-col p-6"
              style={{ height: "calc(100vh - 460px)", minHeight: "300px" }}
            >
              {isAllAssets ? (
                selectedGroup ? (
                  <MultiMarketChart markets={selectedGroup.markets} />
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
                    {timeGroups.length === 0
                      ? "No markets match this filter"
                      : "Select a time slot above"}
                  </div>
                )
              ) : selectedMarket ? (
                <MarketChart market={selectedMarket} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
                  {filteredMarkets.length === 0
                    ? "No markets match this filter"
                    : "Select a market above"}
                </div>
              )}
            </GlassPanel>
          </>
        )}
      </main>
    </div>
  );
}
