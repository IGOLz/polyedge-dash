import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { OverviewCards, OverviewCardsSkeleton } from "@/components/overview-cards";
import { MarketsGrid, MarketsGridSkeleton } from "@/components/markets-grid";
import { SectionHeader } from "@/components/section-header";
import { REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = REVALIDATE_SECONDS;

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {/* Hero */}
        <div className="mb-14 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative h-3 w-3 rounded-full bg-primary shadow-lg shadow-primary/40 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            PolyEdge
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Polymarket prediction analytics
          </p>
        </div>

        {/* Stats */}
        <section className="mb-14">
          <Suspense fallback={<OverviewCardsSkeleton />}>
            <OverviewCards />
          </Suspense>
        </section>

        {/* Markets */}
        <section>
          <SectionHeader title="Markets" />
          <Suspense fallback={<MarketsGridSkeleton />}>
            <MarketsGrid />
          </Suspense>
        </section>
      </main>

      <footer className="border-t border-zinc-800/30 py-6">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            <span className="text-xs font-medium text-zinc-500">PolyEdge</span>
          </div>
          <span className="text-xs text-zinc-500">Data refreshes every 60s</span>
        </div>
      </footer>
    </div>
  );
}
