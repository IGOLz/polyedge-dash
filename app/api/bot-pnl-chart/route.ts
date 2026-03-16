export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type PnlRow = {
  placed_at: string;
  pnl: string;
};

export async function GET() {
  try {
    const rows = await query<PnlRow>(`
      SELECT placed_at, pnl
      FROM bot_trades
      WHERE pnl IS NOT NULL
        AND final_outcome IN ('win', 'loss', 'stop_loss')
      ORDER BY placed_at ASC
    `);
    return NextResponse.json({ trades: rows });
  } catch (error) {
    console.error("Failed to fetch PnL chart data:", error);
    return NextResponse.json({ trades: [] });
  }
}
