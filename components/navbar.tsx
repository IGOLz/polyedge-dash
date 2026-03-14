"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveClock } from "@/hooks/use-live-clock";
import { DownloadButton } from "./download-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/analysis", label: "Lab Analysis" },
  { href: "/strategy", label: "Strategy" },
];

export function Navbar() {
  const pathname = usePathname();
  const time = useLiveClock();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/40 bg-zinc-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-12 md:h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/" className="flex items-center gap-2 md:gap-2.5 group">
            <div className="relative h-2 w-2 md:h-2.5 md:w-2.5">
              <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
              <div className="relative h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-primary">
              PolyEdge
            </span>
          </Link>

          <div className="h-4 w-px bg-zinc-800/60" />

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative px-2.5 md:px-3 py-3 md:py-4 text-sm font-medium transition-colors duration-200",
                  pathname === href
                    ? "text-primary"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                {label}
                {pathname === href && (
                  <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <DownloadButton label="Export Summary" href="/api/export" iconSize={12} />
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
            <span className="font-mono text-sm tabular-nums text-zinc-400">
              {time}
            </span>
            <span className="text-xs text-zinc-500 font-medium">UTC</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
