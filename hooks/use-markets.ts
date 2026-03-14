"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Market, TimeGroup } from "@/types/market";

export function useMarkets(initialAsset: string, initialInterval: string) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState(initialAsset);
  const [intervalFilter, setIntervalFilter] = useState(initialInterval);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data: Market[]) => setMarkets(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredMarkets = useMemo(
    () =>
      markets.filter((m) => {
        if (!m.resolved) return false;
        const [mAsset, mInterval] = m.market_type?.split("_") || [];
        if (assetFilter !== "all" && mAsset !== assetFilter) return false;
        if (mInterval !== intervalFilter) return false;
        return true;
      }),
    [markets, assetFilter, intervalFilter]
  );

  const isAllAssets = assetFilter === "all";

  const timeGroups = useMemo<TimeGroup[]>(() => {
    if (!isAllAssets) return [];
    const groups = new Map<string, Market[]>();
    for (const m of filteredMarkets) {
      const key = m.started_at;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return Array.from(groups.entries()).map(([key, mkts]) => ({
      key,
      markets: mkts,
      started_at: mkts[0].started_at,
      ended_at: mkts[0].ended_at,
    }));
  }, [isAllAssets, filteredMarkets]);

  // Auto-select first item when filter changes
  useEffect(() => {
    const items = isAllAssets ? timeGroups : filteredMarkets;
    const getId = isAllAssets
      ? (item: TimeGroup) => item.key
      : (item: Market) => item.market_id;

    if (items.length > 0) {
      const exists = items.some((item: any) => getId(item) === selectedId);
      if (!selectedId || !exists) {
        setSelectedId(getId(items[0] as any));
      }
    } else {
      setSelectedId(null);
    }
  }, [filteredMarkets, timeGroups, selectedId, isAllAssets]);

  const selectedMarket = !isAllAssets
    ? markets.find((m) => m.market_id === selectedId) || null
    : null;

  const selectedGroup = isAllAssets
    ? timeGroups.find((g) => g.key === selectedId) || null
    : null;

  const handleAssetFilter = useCallback((f: string) => {
    setAssetFilter(f);
    setSelectedId(null);
  }, []);

  const handleIntervalFilter = useCallback((f: string) => {
    setIntervalFilter(f);
    setSelectedId(null);
  }, []);

  return {
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
  };
}
