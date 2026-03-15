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
};

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    const trades = await query<BotTrade>(
      `SELECT id, market_type, strategy_name, direction, entry_price, bet_size_usd, status, final_outcome, pnl, placed_at, resolved_at
       FROM bot_trades
       ORDER BY placed_at DESC`
    );

    const headers = [
      "ID", "Market Type", "Strategy", "Direction", "Entry Price",
      "Bet Size (USD)", "Status", "Outcome", "PnL", "Placed At", "Resolved At",
    ];

    const rows = trades.map((t) =>
      [
        t.id, t.market_type, t.strategy_name, t.direction, t.entry_price,
        t.bet_size_usd, t.status, t.final_outcome, t.pnl, t.placed_at, t.resolved_at,
      ].map(escapeCsv).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bot-trades-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export trades:", error);
    return NextResponse.json({ error: "Failed to export trades" }, { status: 500 });
  }
}
