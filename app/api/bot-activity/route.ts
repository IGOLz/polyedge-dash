export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type BotTrade = {
  id: string;
  market_type: string;
  strategy_name: string;
  direction: string;
  entry_price: string;
  bet_size_usd: string;
  status: string;
  final_outcome: string | null;
  pnl: string | null;
  placed_at: string;
  resolved_at: string | null;
  data: string | null;
};

type BotLog = {
  id: string;
  log_type: string;
  message: string;
  data: string | null;
  logged_at: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const type = searchParams.get("type") || "all";
  const offset = (page - 1) * limit;

  try {
    let tradesQuery = `SELECT * FROM bot_trades`;
    const tradeParams: (string | number)[] = [];
    let paramIdx = 1;

    if (type === "filled") {
      tradesQuery += ` WHERE status = 'filled'`;
    } else if (type === "wins") {
      tradesQuery += ` WHERE final_outcome = 'win'`;
    } else if (type === "losses") {
      tradesQuery += ` WHERE final_outcome = 'loss'`;
    } else if (type === "pending") {
      tradesQuery += ` WHERE status = 'filled' AND final_outcome IS NULL`;
    } else if (type === "nofill") {
      tradesQuery += ` WHERE status = 'fok_no_fill'`;
    }

    tradesQuery += ` ORDER BY placed_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    tradeParams.push(limit, offset);

    let logsQuery = `SELECT * FROM bot_logs`;

    if (type === "trades") {
      logsQuery += ` WHERE log_type IN ('trade_placed', 'trade_win', 'trade_loss', 'trade_stop_loss', 'trade_fok_no_fill', 'trade_skipped', 'trade_dry_run')`;
    } else if (type === "wins_losses") {
      logsQuery += ` WHERE log_type IN ('trade_win', 'trade_loss', 'trade_stop_loss')`;
    } else if (type === "summaries") {
      logsQuery += ` WHERE log_type = 'hourly_summary'`;
    } else if (type === "errors") {
      logsQuery += ` WHERE log_type = 'bot_error'`;
    }

    logsQuery += ` ORDER BY logged_at DESC LIMIT 100`;

    const [trades, logs] = await Promise.all([
      query<BotTrade>(tradesQuery, tradeParams),
      query<BotLog>(logsQuery),
    ]);

    return NextResponse.json({ trades, logs });
  } catch (error) {
    console.error("Failed to fetch bot activity:", error);
    return NextResponse.json({ trades: [], logs: [] }, { status: 500 });
  }
}
