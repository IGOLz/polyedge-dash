export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";

type OverallStats = {
  total_trades: string;
  wins: string;
  losses: string;
  pending: string;
  no_fills: string;
  skipped: string;
  total_pnl: string | null;
  total_bet: string | null;
  avg_pnl_per_trade: string | null;
};

type Last24hStats = {
  trades_24h: string;
  wins_24h: string;
  losses_24h: string;
  pnl_24h: string | null;
  bet_24h: string | null;
};

type StrategyStats = {
  strategy_name: string;
  trades: string;
  wins: string;
  losses: string;
  total_pnl: string | null;
  avg_entry_price: string | null;
};

type YesterdayStats = {
  trades_yesterday: string;
  wins_yesterday: string;
  losses_yesterday: string;
  pnl_yesterday: string | null;
};

type HourlySummary = {
  data: string;
  logged_at: string;
};

async function fetchBotOverview() {
  try {
    const [overall, last24h, yesterday, strategies, hourly] = await Promise.all([
      query<OverallStats>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'filled') as total_trades,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'win') as wins,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'loss') as losses,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome IS NULL) as pending,
          COUNT(*) FILTER (WHERE status = 'fok_no_fill') as no_fills,
          COUNT(*) FILTER (WHERE status LIKE 'skipped%') as skipped,
          SUM(pnl) FILTER (WHERE pnl IS NOT NULL) as total_pnl,
          SUM(bet_size_usd) FILTER (WHERE status = 'filled') as total_bet,
          AVG(pnl) FILTER (WHERE final_outcome IS NOT NULL) as avg_pnl_per_trade
        FROM bot_trades
      `),
      query<Last24hStats>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'filled') as trades_24h,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'win') as wins_24h,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'loss') as losses_24h,
          SUM(pnl) FILTER (WHERE pnl IS NOT NULL) as pnl_24h,
          SUM(bet_size_usd) FILTER (WHERE status = 'filled') as bet_24h
        FROM bot_trades
        WHERE placed_at > NOW() - INTERVAL '24 hours'
      `),
      query<YesterdayStats>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'filled') as trades_yesterday,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'win') as wins_yesterday,
          COUNT(*) FILTER (WHERE status = 'filled' AND final_outcome = 'loss') as losses_yesterday,
          SUM(pnl) FILTER (WHERE pnl IS NOT NULL) as pnl_yesterday
        FROM bot_trades
        WHERE placed_at > NOW() - INTERVAL '48 hours'
          AND placed_at <= NOW() - INTERVAL '24 hours'
      `),
      query<StrategyStats>(`
        SELECT
          strategy_name,
          COUNT(*) FILTER (WHERE status = 'filled') as trades,
          COUNT(*) FILTER (WHERE final_outcome = 'win') as wins,
          COUNT(*) FILTER (WHERE final_outcome = 'loss') as losses,
          SUM(pnl) FILTER (WHERE pnl IS NOT NULL) as total_pnl,
          AVG(entry_price) as avg_entry_price
        FROM bot_trades
        WHERE status = 'filled'
        GROUP BY strategy_name
      `),
      query<HourlySummary>(`
        SELECT data, logged_at
        FROM bot_logs
        WHERE log_type = 'hourly_summary'
        ORDER BY logged_at DESC LIMIT 1
      `),
    ]);

    return {
      overall: overall[0] || null,
      last24h: last24h[0] || null,
      yesterday: yesterday[0] || null,
      strategies,
      hourlySummary: hourly[0] || null,
    };
  } catch (error) {
    console.error("Failed to fetch bot overview:", error);
    return { overall: null, last24h: null, yesterday: null, strategies: [], hourlySummary: null };
  }
}

const getCachedBotOverview = unstable_cache(fetchBotOverview, ["bot-overview"], {
  revalidate: 60,
});

export async function GET() {
  try {
    const data = await getCachedBotOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch bot overview:", error);
    return NextResponse.json(
      { overall: null, last24h: null, yesterday: null, strategies: [], hourlySummary: null }
    );
  }
}
