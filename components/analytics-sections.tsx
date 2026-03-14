import { unstable_cache } from "next/cache";
import {
  getCalibrationData,
  getStreakData,
  getTickRates,
  getCalibrationHeatmapData,
  getEdgeScannerData,
  getTimeOfDayData,
  getCrossAssetCorrelation,
} from "@/lib/queries";
import { ANALYTICS_CACHE_SECONDS } from "@/lib/constants";
import { SectionHeader } from "@/components/section-header";
import { WinRateChart } from "@/components/win-rate-chart";
import { StreakDetector } from "@/components/streak-detector";
import { CollectionHealth } from "@/components/collection-health";
import { CalibrationHeatmap } from "@/components/calibration-heatmap";
import { EdgeScanner } from "@/components/edge-scanner";
import { TimeOfDay } from "@/components/time-of-day";
import { CrossAssetCorrelation } from "@/components/cross-asset-correlation";
const getCachedCalibrationData = (seconds: number) =>
  unstable_cache(
    () => getCalibrationData(seconds),
    [`calibration-${seconds}`],
    { revalidate: ANALYTICS_CACHE_SECONDS }
  )();

const getCachedEdgeScannerData = unstable_cache(
  getEdgeScannerData,
  ["edge-scanner"],
  { revalidate: ANALYTICS_CACHE_SECONDS }
);

const getCachedCalibrationHeatmapData = unstable_cache(
  getCalibrationHeatmapData,
  ["calibration-heatmap"],
  { revalidate: ANALYTICS_CACHE_SECONDS }
);

const getCachedTimeOfDayData = unstable_cache(
  getTimeOfDayData,
  ["time-of-day"],
  { revalidate: ANALYTICS_CACHE_SECONDS }
);

const getCachedCrossAssetCorrelation = unstable_cache(
  getCrossAssetCorrelation,
  ["cross-asset-correlation"],
  { revalidate: ANALYTICS_CACHE_SECONDS }
);

const TIME_WINDOWS_5M = [30, 60, 150, 240];
const TIME_WINDOWS_15M = [90, 180, 450, 720];
const ALL_WINDOWS = [...TIME_WINDOWS_5M, ...TIME_WINDOWS_15M];

export async function AnalyticsSections() {
  const calibrationPromises = ALL_WINDOWS.map((s) => getCachedCalibrationData(s));
  const [
    streaks,
    tickRates,
    heatmapData,
    edgeScannerData,
    timeOfDayData,
    correlationData,
    ...calibrations
  ] = await Promise.all([
    getStreakData(),
    getTickRates(),
    getCachedCalibrationHeatmapData(),
    getCachedEdgeScannerData(),
    getCachedTimeOfDayData(),
    getCachedCrossAssetCorrelation(),
    ...calibrationPromises,
  ]);

  const calibrationBySeconds: Record<number, typeof calibrations[0]> = {};
  ALL_WINDOWS.forEach((s, i) => {
    calibrationBySeconds[s] = calibrations[i];
  });

  return (
    <>
      {/* Edge Scanner — High Value */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Edge Scanner"
          description="Price buckets where actual win rate deviates from implied probability — sorted by edge size"
          exportData={edgeScannerData}
        />
        <EdgeScanner data={edgeScannerData} />
      </section>

      {/* Calibration Heatmap — High Value */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Calibration Heatmap"
          description="2D grid of actual win rate by price bucket and time into window — find where the edge is strongest"
          exportData={heatmapData}
        />
        <CalibrationHeatmap data={heatmapData} />
      </section>

      {/* Win Rate by Price Bucket */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Win Rate by Price Bucket"
          description="Actual Up win rate grouped by price bucket at different time windows"
          exportData={calibrationBySeconds}
        />
        <WinRateChart
          dataBySeconds={calibrationBySeconds}
          timeWindows5m={TIME_WINDOWS_5M}
          timeWindows15m={TIME_WINDOWS_15M}
        />
      </section>

      {/* Time of Day Analysis — Medium Value */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Time of Day Analysis"
          description="Does Up win more at specific hours of the day?"
          exportData={timeOfDayData}
        />
        <TimeOfDay data={timeOfDayData} />
      </section>

      {/* Cross-Asset Correlation — Medium Value */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Cross-Asset Correlation"
          description="When one asset resolves Up, how often does another follow? Shows if assets move together or independently"
          exportData={correlationData}
        />
        <CrossAssetCorrelation data={correlationData} />
      </section>

      {/* Streak Detector */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Streak Detector"
          description="Current consecutive outcome streaks per market"
          exportData={streaks}
        />
        <StreakDetector data={streaks} />
      </section>

      {/* Collection Health */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Collection Health"
          description="Tick collection rate compared to expected throughput"
          exportData={tickRates}
        />
        <CollectionHealth tickRates={tickRates} />
      </section>
    </>
  );
}

export function AnalyticsSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <section key={i} className="mt-8 md:mt-14">
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/60 to-transparent" />
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-5 animate-pulse rounded bg-zinc-800" />
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
