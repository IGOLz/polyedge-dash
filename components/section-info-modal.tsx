"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SectionInfo {
  title: string;
  sections: {
    heading: string;
    content: string;
    bullets?: string[];
  }[];
}

const SECTION_INFO: Record<string, SectionInfo> = {
  "Edge Scanner": {
    title: "Edge Scanner",
    sections: [
      {
        heading: "What is this?",
        content:
          "The Edge Scanner identifies price buckets where the actual historical win rate significantly deviates from the implied probability. In prediction markets, the price of a contract reflects the market's implied probability of an outcome. When historical data shows a different reality, that gap is an \"edge\".",
      },
      {
        heading: "How to read it",
        content: "Each row represents a specific combination of market, time window, and price bucket where an edge was detected.",
        bullets: [
          "Market — The asset and interval (e.g., BTC 5m)",
          "Time — How far into the market window the snapshot was taken (e.g., 30s, 1m, 2m30s)",
          "Price — The contract price bucket at that moment (e.g., 35\u00a2)",
          "Implied Prob — What the market price suggests the probability is (35\u00a2 = 35%)",
          "Actual Win Rate — What historically happened at that price level",
          "Edge — The difference: Actual Win Rate minus Implied Probability",
        ],
      },
      {
        heading: "Example",
        content:
          "If BTC 5m is priced at 30\u00a2 (implying 30% chance of Up), but historically Up wins 48% of the time at that price, there is a +18% edge on Up. This means the market is underpricing the Up outcome at that level.",
      },
      {
        heading: "What makes a strong edge?",
        content: "Edges are categorized by size:",
        bullets: [
          "Strong (\u226515%) \u2014 Large deviation, high confidence if sample size is big enough",
          "Moderate (8\u201315%) \u2014 Meaningful deviation worth paying attention to",
          "Slight (<8%) \u2014 Small deviation, could be noise",
        ],
      },
      {
        heading: "Important note",
        content:
          "Edges are based on historical data and do not guarantee future results. Always consider the sample count \u2014 a 20% edge from 10 samples is far less reliable than a 10% edge from 500 samples. Market conditions change, and edges can disappear over time as the market adjusts.",
      },
    ],
  },
  "Calibration Heatmap": {
    title: "Calibration Heatmap",
    sections: [
      {
        heading: "What is this?",
        content:
          "The Calibration Heatmap is a 2D visualization that shows how the actual Up win rate varies across two dimensions simultaneously: the contract price (columns) and how much time has elapsed in the market window (rows). It helps you find the intersection of time and price where edges are strongest.",
      },
      {
        heading: "How to read it",
        content: "Each cell in the grid represents a specific combination of price and time:",
        bullets: [
          "Columns (left to right) \u2014 Price buckets from 5\u00a2 to 95\u00a2 in 5\u00a2 increments",
          "Rows (top to bottom) \u2014 Time elapsed since the market opened",
          "Cell color \u2014 Green = Up wins more than 50%, Red = Down wins more than 50%, Gray = roughly 50/50",
          "Cell value \u2014 The actual Up win rate percentage",
        ],
      },
      {
        heading: "Color intensity",
        content: "Darker/brighter colors indicate stronger edges:",
        bullets: [
          "Strong green (>65% Up) \u2014 Significant Up edge",
          "Light green (55\u201365%) \u2014 Moderate Up edge",
          "Gray (45\u201355%) \u2014 No clear edge, roughly 50/50",
          "Light red (35\u201345%) \u2014 Moderate Down edge",
          "Strong red (<35%) \u2014 Significant Down edge",
        ],
      },
      {
        heading: "Hover tooltip",
        content:
          "Hover over any cell to see detailed information: the exact win rate, edge size (deviation from 50%), price bucket, time offset, and number of samples used to calculate that value.",
      },
      {
        heading: "Practical use",
        content:
          "Look for clusters of green or red cells. A single bright cell might be noise, but a cluster of green cells in the same price range across multiple time offsets suggests a real pattern. Pay attention to sample sizes \u2014 cells with more samples are more reliable.",
      },
    ],
  },
  "Win Rate by Price Bucket": {
    title: "Win Rate by Price Bucket",
    sections: [
      {
        heading: "What is this?",
        content:
          "This section shows bar charts of the actual Up win rate grouped by price bucket, for each asset at a specific time snapshot. It answers the question: \"At a given point in time, if the contract is priced at X\u00a2, how often does Up actually win?\"",
      },
      {
        heading: "How to read it",
        content: "Each chart represents one asset (BTC, ETH, SOL, XRP):",
        bullets: [
          "X-axis \u2014 Price buckets (e.g., 10%, 20%, ..., 90%)",
          "Y-axis \u2014 Actual Up win rate (0\u2013100%)",
          "Dashed line at 50% \u2014 The baseline. Bars above = Up bias, bars below = Down bias",
          "Bar height \u2014 How far the actual win rate deviates from 50%",
        ],
      },
      {
        heading: "Time window selector",
        content:
          "The buttons at the top let you switch between different time snapshots. For 5m markets: 30s, 1m, 2m30s, 4m. For 15m markets: 1m30s, 3m, 7m30s, 12m. Earlier snapshots show how the market behaves shortly after opening, later snapshots show behavior closer to resolution.",
      },
      {
        heading: "What to look for",
        content:
          "In a perfectly calibrated market, all bars would sit at exactly 50% regardless of price. If you see that low-priced contracts (e.g., 20\u00a2) have an Up win rate of 60%, it means the market is systematically underpricing Up at that level. That's a potential edge.",
      },
    ],
  },
  "Time of Day Analysis": {
    title: "Time of Day Analysis",
    sections: [
      {
        heading: "What is this?",
        content:
          "This chart shows whether the time of day (in UTC) has any influence on whether markets resolve Up or Down. It breaks down the Up win rate by hour across the full 24-hour day.",
      },
      {
        heading: "How to read it",
        content: "Each bar represents one hour of the day:",
        bullets: [
          "Green bars (above 50%) \u2014 Up wins more often during this hour",
          "Red bars (below 50%) \u2014 Down wins more often during this hour",
          "Dashed line at 50% \u2014 The baseline of no edge",
        ],
      },
      {
        heading: "Why it matters",
        content:
          "If a specific hour consistently shows an Up or Down bias, it could reflect patterns in how market participants behave during those periods. For example, certain hours might see more buying or selling pressure due to global activity patterns.",
      },
    ],
  },
  "Cross-Asset Correlation": {
    title: "Cross-Asset Correlation",
    sections: [
      {
        heading: "What is this?",
        content:
          "Cross-Asset Correlation measures how often pairs of crypto assets move in the same direction within the same time window. When one asset resolves Up, does the other also resolve Up? This helps understand whether markets are moving together or independently.",
      },
      {
        heading: "How to read it",
        content: "Each card shows one pair of assets (e.g., BTC \u00d7 ETH):",
        bullets: [
          "Correlation % \u2014 How often both assets resolve in the same direction (both Up or both Down)",
          "Both Up \u2014 Number and percentage of times both went Up",
          "Both Down \u2014 Number and percentage of times both went Down",
          "Opposite \u2014 Times one went Up while the other went Down",
          "Color bar \u2014 Visual breakdown of green (both Up), red (both Down), and gray (opposite)",
        ],
      },
      {
        heading: "Correlation strength",
        content: "The percentage is color-coded:",
        bullets: [
          "Strongly correlated (\u226570%) \u2014 Assets almost always move together",
          "Moderately correlated (60\u201370%) \u2014 Strong tendency to move together",
          "Weakly correlated (55\u201360%) \u2014 Slight tendency to move together",
          "Independent (45\u201355%) \u2014 No meaningful relationship",
          "Inversely correlated (<45%) \u2014 Assets tend to move in opposite directions",
        ],
      },
      {
        heading: "Practical use",
        content:
          "High correlation means you're taking similar risk if you trade both assets. If BTC and ETH are 75% correlated, buying Up on both is almost like doubling your bet on a single outcome. Low correlation means the assets provide diversification \u2014 their outcomes are more independent of each other.",
      },
    ],
  },
  "Streak Detector": {
    title: "Streak Detector",
    sections: [
      {
        heading: "What is this?",
        content:
          "The Streak Detector shows the current consecutive outcome streak for each market. A streak is when the same outcome (Up or Down) happens multiple times in a row. This is live data that updates in real time.",
      },
      {
        heading: "How to read it",
        content: "Each card represents one market:",
        bullets: [
          "Badge (e.g., \"5x Up\") \u2014 The current streak length and direction",
          "Dot trail \u2014 The last 10 outcomes shown as colored dots (green = Up, red = Down), newest first",
          "Pulsing dot \u2014 Indicates this is live data",
        ],
      },
      {
        heading: "Does a streak mean anything?",
        content:
          "This is important to understand: in truly random 50/50 outcomes, streaks are completely normal and expected. A 5-game winning streak happens about 3% of the time, which is rare but not unusual across thousands of markets. The Streak Detector is useful for tracking what's happening right now, but a long streak does NOT mean the next outcome is more likely to be the opposite (that's the gambler's fallacy).",
      },
      {
        heading: "When streaks matter",
        content:
          "Streaks become interesting when combined with other data. If a market has a 7x Up streak AND the Edge Scanner shows an Up edge for that market, the streak might be reflecting a real underlying bias rather than random chance.",
      },
    ],
  },
  "Collection Health": {
    title: "Collection Health",
    sections: [
      {
        heading: "What is this?",
        content:
          "Collection Health monitors the data pipeline \u2014 the system that collects price ticks from Polymarket. Every market window generates price updates (ticks) at regular intervals. This section checks whether the pipeline is receiving the expected number of ticks.",
      },
      {
        heading: "How to read it",
        content: "Each card represents one market's data collection status:",
        bullets: [
          "Healthy (green, \u226590%) \u2014 Pipeline is collecting data at or near the expected rate",
          "Degraded (yellow, 70\u201390%) \u2014 Some data is being missed, but most is still collected",
          "Critical (red, <70%) \u2014 Significant data loss, analysis may be unreliable",
          "Progress bar \u2014 Shows actual vs expected tick count as a percentage",
        ],
      },
      {
        heading: "Expected tick rates",
        content: "The system expects a specific number of ticks per market window:",
        bullets: [
          "5m markets \u2014 300 ticks per window (1 per second for 5 minutes)",
          "15m markets \u2014 900 ticks per window (1 per second for 15 minutes)",
        ],
      },
      {
        heading: "Why it matters",
        content:
          "All analytics on this dashboard depend on the quality of collected data. If Collection Health shows degraded or critical status, the data behind edge calculations, win rates, and other metrics may be incomplete or skewed. Always check this section if numbers in other sections seem unusual.",
      },
    ],
  },
  Markets: {
    title: "Markets Overview",
    sections: [
      {
        heading: "What is this?",
        content:
          "The Markets section provides a high-level overview of all tracked prediction markets, organized by asset (BTC, ETH, SOL, XRP) and interval (5m, 15m). Each card shows key metrics for that market type.",
      },
      {
        heading: "Card metrics",
        content: "Each market card displays:",
        bullets: [
          "Resolved \u2014 Number of markets that have reached their final outcome (Up or Down)",
          "Total \u2014 Total number of markets including active and resolved",
          "Ticks 24h \u2014 Price data points collected in the last 24 hours",
          "Outcomes \u2014 Count of Up wins (green) vs Down wins (red) across all resolved markets",
        ],
      },
      {
        heading: "Clicking a card",
        content:
          "Click any market card to open the detailed Markets page, filtered to that specific market type. There you can browse individual markets, view price charts, and replay market histories.",
      },
    ],
  },
};

function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface SectionInfoButtonProps {
  sectionTitle: string;
  exportData?: unknown;
}

export function SectionInfoButton({ sectionTitle, exportData }: SectionInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const info = SECTION_INFO[sectionTitle];

  if (!info) return null;

  const filename = sectionTitle.toLowerCase().replace(/\s+/g, "-") + ".json";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-800/60 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-primary/40 hover:text-primary hover:bg-primary/10"
          aria-label={`Learn more about ${sectionTitle}`}
        >
          i
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-primary/20 bg-zinc-950 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-100">
            {info.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {info.sections.map((section, i) => (
            <div key={i}>
              <h3 className="mb-2 text-sm font-semibold text-primary/80">
                {section.heading}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {section.content}
              </p>
              {section.bullets && (
                <ul className="mt-2 space-y-1.5">
                  {section.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-sm leading-relaxed text-zinc-400"
                    >
                      <span className="text-primary/40 shrink-0">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {!!exportData && (
          <div className="mt-6 border-t border-zinc-800/60 pt-4">
            <button
              onClick={() => downloadJSON(exportData, filename)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export data as JSON
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
