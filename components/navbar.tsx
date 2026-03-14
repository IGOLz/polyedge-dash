"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveClock } from "@/hooks/use-live-clock";
import { DownloadButton } from "./download-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/analysis", label: "Lab Analysis" },
];

const STRATEGY_LINKS = [
  { href: "/strategy", label: "Strategy 1 — Farming" },
  { href: "/strategy2", label: "Strategy 2 — Calibration" },
];

// ---------------------------------------------------------------------------
// Strategies dropdown (desktop: hover, mobile: tap)
// ---------------------------------------------------------------------------

function StrategiesDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStrategyActive = STRATEGY_LINKS.some((s) => pathname === s.href);

  // Close on outside click (mobile tap-away)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleMouseEnter = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center gap-1 px-2.5 md:px-3 py-3 md:py-4 text-sm font-medium transition-colors duration-200",
          isStrategyActive ? "text-primary" : "text-zinc-500 hover:text-zinc-200"
        )}
      >
        Strategies
        <svg
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            open && "rotate-180"
          )}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5l3 3 3-3" />
        </svg>
        {isStrategyActive && (
          <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[220px] pt-1">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/95 backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden">
            {STRATEGY_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                  pathname === href
                    ? "bg-primary/[0.08] text-primary"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                {pathname === href && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                <span className={pathname !== href ? "pl-4" : ""}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile menu
// ---------------------------------------------------------------------------

function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [strategiesOpen, setStrategiesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setStrategiesOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const isStrategyActive = STRATEGY_LINKS.some((s) => pathname === s.href);

  return (
    <div ref={ref} className="md:hidden">
      {/* Hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        aria-label="Menu"
      >
        {open ? (
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-xl shadow-xl shadow-black/40">
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/[0.08] text-primary"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                {pathname === href && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                <span className={pathname !== href ? "pl-4" : ""}>{label}</span>
              </Link>
            ))}

            {/* Strategies accordion */}
            <button
              onClick={() => setStrategiesOpen((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isStrategyActive
                  ? "bg-primary/[0.08] text-primary"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <span className="flex items-center gap-2.5">
                {isStrategyActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                <span className={!isStrategyActive ? "pl-4" : ""}>Strategies</span>
              </span>
              <svg
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  strategiesOpen && "rotate-180"
                )}
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>

            {strategiesOpen && (
              <div className="ml-4 space-y-1 border-l border-zinc-800/40 pl-3">
                {STRATEGY_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === href
                        ? "bg-primary/[0.08] text-primary"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    )}
                  >
                    {pathname === href && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className={pathname !== href ? "pl-4" : ""}>{label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
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
            <StrategiesDropdown />
          </div>

          {/* Mobile hamburger */}
          <MobileMenu />
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
