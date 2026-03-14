import { query } from "./db";
import { MARKET_TYPES } from "./constants";

export async function getOverviewStats() {
  const [totalMarkets] = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM market_outcomes"
  );

  const [approxTicks] = await query<{ reltuples: number }>(
    "SELECT reltuples FROM pg_class WHERE relname = 'market_ticks'"
  );

  // reltuples is -1 when table hasn't been analyzed yet; fall back to a fast count
  let totalTicks = Math.round(approxTicks.reltuples);
  if (totalTicks < 0) {
    const [counted] = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM market_ticks WHERE time > NOW() - INTERVAL '24 hours'"
    );
    totalTicks = parseInt(counted.count);
  }

  const [startDate] = await query<{ min_start: string }>(
    "SELECT MIN(started_at) as min_start FROM market_outcomes"
  );

  return {
    totalMarkets: parseInt(totalMarkets.count),
    totalTicks,
    startDate: startDate.min_start,
    hoursCollected: startDate.min_start
      ? Math.round(
          (Date.now() - new Date(startDate.min_start).getTime()) /
            (1000 * 60 * 60)
        )
      : 0,
  };
}

export async function getMarketsByType() {
  const marketTypes = [...MARKET_TYPES];

  const outcomes = await query<{
    market_type: string;
    total: string;
    resolved: string;
    active: string;
    up_wins: string;
    down_wins: string;
    unknown_outcome: string;
  }>(`
    SELECT
      market_type,
      COUNT(*) as total,
      SUM(CASE WHEN resolved = TRUE THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN resolved = FALSE AND ended_at > NOW() THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN resolved = FALSE AND ended_at < NOW() THEN 1 ELSE 0 END) as unknown_outcome,
      SUM(CASE WHEN final_outcome = 'Up' THEN 1 ELSE 0 END) as up_wins,
      SUM(CASE WHEN final_outcome = 'Down' THEN 1 ELSE 0 END) as down_wins
    FROM market_outcomes
    GROUP BY market_type
    ORDER BY market_type
  `);

  const ticks = await query<{ market_type: string; tick_count: string }>(`
    SELECT market_type, COUNT(*) as tick_count
    FROM market_ticks
    WHERE time > NOW() - INTERVAL '24 hours'
    GROUP BY market_type
  `);

  const last24h = await query<{
    market_type: string;
    resolved_24h: string;
    up_wins_24h: string;
    down_wins_24h: string;
  }>(`
    SELECT
      market_type,
      COUNT(*) as resolved_24h,
      SUM(CASE WHEN final_outcome = 'Up' THEN 1 ELSE 0 END) as up_wins_24h,
      SUM(CASE WHEN final_outcome = 'Down' THEN 1 ELSE 0 END) as down_wins_24h
    FROM market_outcomes
    WHERE resolved = TRUE
      AND ended_at > NOW() - INTERVAL '24 hours'
      AND final_outcome IN ('Up', 'Down')
    GROUP BY market_type
  `);

  const tickMap = new Map(
    ticks.map((t) => [t.market_type, parseInt(t.tick_count)])
  );
  const last24hMap = new Map(last24h.map((r) => [r.market_type, r]));
  const outcomeMap = new Map(outcomes.map((o) => [o.market_type, o]));

  return marketTypes.map((type) => {
    const o = outcomeMap.get(type);
    const resolved = o ? parseInt(o.resolved) : 0;
    const upWins = o ? parseInt(o.up_wins) : 0;
    const downWins = o ? parseInt(o.down_wins) : 0;
    const unknownOutcome = o ? parseInt(o.unknown_outcome) : 0;
    const knownOutcomes = upWins + downWins;
    const winRate = knownOutcomes > 0 ? (upWins / knownOutcomes) * 100 : 0;

    const r24 = last24hMap.get(type);
    const upWins24h = r24 ? parseInt(r24.up_wins_24h) : 0;
    const downWins24h = r24 ? parseInt(r24.down_wins_24h) : 0;
    const known24h = upWins24h + downWins24h;
    const winRate24h = known24h > 0 ? (upWins24h / known24h) * 100 : 0;

    return {
      marketType: type,
      resolved,
      active: o ? parseInt(o.active) : 0,
      upWins,
      downWins,
      unknownOutcome,
      ticks24h: tickMap.get(type) || 0,
      upWinRate: winRate,
      upWinRate24h: winRate24h,
      resolved24h: known24h,
    };
  });
}

export async function getRecentActivity() {
  return query<{
    market_type: string;
    market_id: string;
    started_at: string;
    ended_at: string;
    final_outcome: string;
    final_up_price: string;
    tick_count: string;
  }>(`
    SELECT
      mo.market_type,
      mo.market_id,
      mo.started_at,
      mo.ended_at,
      mo.final_outcome,
      mo.final_up_price,
      COALESCE(tc.tick_count, 0) as tick_count
    FROM market_outcomes mo
    LEFT JOIN (
      SELECT market_id, COUNT(*) as tick_count
      FROM market_ticks
      WHERE time > NOW() - INTERVAL '24 hours'
      GROUP BY market_id
    ) tc ON mo.market_id = tc.market_id
    WHERE mo.resolved = true
    ORDER BY mo.ended_at DESC
    LIMIT 20
  `);
}

export async function getTickRates() {
  const rates = await query<{
    market_type: string;
    last_5m: string;
    last_1h: string;
    last_24h: string;
  }>(`
    SELECT
      market_type,
      COUNT(*) FILTER (WHERE time > NOW() - INTERVAL '5 minutes') as last_5m,
      COUNT(*) FILTER (WHERE time > NOW() - INTERVAL '1 hour') as last_1h,
      COUNT(*) as last_24h
    FROM market_ticks
    WHERE time > NOW() - INTERVAL '24 hours'
      AND market_type IS NOT NULL
    GROUP BY market_type
    ORDER BY market_type
  `);

  return rates.map((r) => ({
    marketType: r.market_type,
    last5m: parseInt(r.last_5m),
    last1h: parseInt(r.last_1h),
    last24h: parseInt(r.last_24h),
    collecting: parseInt(r.last_5m) > 0,
  }));
}
