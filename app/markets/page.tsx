"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { MarketChart } from "@/components/market-chart";
import { MultiMarketChart } from "@/components/multi-market-chart";
import { FilterButton } from "@/components/filter-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { OutcomeDot } from "@/components/outcome-dot";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SectionHeader } from "@/components/section-header";
import { useMarkets } from "@/hooks/use-markets";
import { ASSET_FILTERS, INTERVAL_FILTERS } from "@/lib/constants";
import { formatUTCTime, formatUTCDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function MarketStripButton({
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
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner label="Loading markets..." />
        </div>
      </div>
    }>
      <MarketsContent />
    </Suspense>
  );
}

function MarketsContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "all";
  const initialAsset = initialType !== "all" ? initialType.split("_")[0] : "btc";
  const initialInterval = initialType !== "all" ? initialType.split("_")[1] : "5m";

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
  } = useMarkets(initialAsset, initialInterval);

  const itemCount = isAllAssets ? timeGroups.length : filteredMarkets.length;
  const itemLabel = isAllAssets ? "time slot" : "market";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-6 py-6 md:py-8">
        <div className="mb-6">
          <SectionHeader title="Market Browser" />

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
              {itemCount} {itemLabel}{itemCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner label="Loading markets..." />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {isAllAssets
                  ? timeGroups.map((group) => (
                      <MarketStripButton
                        key={group.key}
                        selected={group.key === selectedId}
                        onClick={() => setSelectedId(group.key)}
                      >
                        <div className="flex items-center gap-2">
                          {group.markets.map((m) => (
                            <OutcomeDot key={m.market_id} outcome={m.final_outcome} />
                          ))}
                          <span className={cn("font-mono text-sm font-semibold tabular-nums", group.key === selectedId ? "text-primary" : "text-zinc-300")}>
                            {formatUTCTime(group.started_at)}
                          </span>
                          <span className="text-xs font-medium text-zinc-300">
                            {formatUTCDate(group.started_at)}
                          </span>
                        </div>
                      </MarketStripButton>
                    ))
                  : filteredMarkets.map((market) => (
                      <MarketStripButton
                        key={market.market_id}
                        selected={market.market_id === selectedId}
                        onClick={() => setSelectedId(market.market_id)}
                      >
                        <div className="flex items-center gap-2">
                          <OutcomeDot outcome={market.final_outcome} />
                          <span className={cn("font-mono text-sm font-semibold tabular-nums", market.market_id === selectedId ? "text-primary" : "text-zinc-300")}>
                            {formatUTCTime(market.started_at)}
                          </span>
                          <span className="text-xs font-medium text-zinc-300">
                            {formatUTCDate(market.started_at)}
                          </span>
                        </div>
                      </MarketStripButton>
                    ))}
              </div>
            </div>

            <GlassPanel
              variant="glow-center"
              className="flex flex-col p-6"
              style={{ height: "calc(100vh - 380px)", minHeight: "300px" }}
            >

              {isAllAssets ? (
                selectedGroup ? (
                  <MultiMarketChart markets={selectedGroup.markets} />
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
                    {timeGroups.length === 0 ? "No markets match this filter" : "Select a time slot above"}
                  </div>
                )
              ) : selectedMarket ? (
                <MarketChart market={selectedMarket} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
                  {filteredMarkets.length === 0 ? "No markets match this filter" : "Select a market above"}
                </div>
              )}
            </GlassPanel>
          </>
        )}
      </main>
    </div>
  );
}
