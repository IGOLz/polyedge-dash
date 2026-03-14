import { getCalibrationData, getStreakData, getTickRates } from "@/lib/queries";
import { SectionHeader } from "@/components/section-header";
import { WinRateChart } from "@/components/win-rate-chart";
import { StreakDetector } from "@/components/streak-detector";
import { CollectionHealth } from "@/components/collection-health";

const TIME_WINDOWS_5M = [30, 60, 150, 240];
const TIME_WINDOWS_15M = [90, 180, 450, 720];
const ALL_WINDOWS = [...TIME_WINDOWS_5M, ...TIME_WINDOWS_15M];

export async function AnalyticsSections() {
  const calibrationPromises = ALL_WINDOWS.map((s) => getCalibrationData(s));
  const [streaks, tickRates, ...calibrations] = await Promise.all([
    getStreakData(),
    getTickRates(),
    ...calibrationPromises,
  ]);

  const calibrationBySeconds: Record<number, typeof calibrations[0]> = {};
  ALL_WINDOWS.forEach((s, i) => {
    calibrationBySeconds[s] = calibrations[i];
  });

  return (
    <>
      {/* Win Rate by Price Bucket */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Win Rate by Price Bucket"
          description="Actual Up win rate grouped by price bucket at different time windows"
        />
        <WinRateChart
          dataBySeconds={calibrationBySeconds}
          timeWindows5m={TIME_WINDOWS_5M}
          timeWindows15m={TIME_WINDOWS_15M}
        />
      </section>

      {/* Streak Detector */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Streak Detector"
          description="Current consecutive outcome streaks per market"
        />
        <StreakDetector data={streaks} />
      </section>

      {/* Collection Health */}
      <section className="mt-8 md:mt-14">
        <SectionHeader
          title="Collection Health"
          description="Tick collection rate compared to expected throughput"
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
