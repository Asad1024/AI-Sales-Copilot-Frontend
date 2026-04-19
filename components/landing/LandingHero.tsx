"use client";

import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import Link from "next/link";
import type { ReactNode } from "react";

export type LandingHeroProps = {
  onStartTrial: () => void;
  /** Search field + icon (placed after headline, before feature pills). */
  inputSlot: ReactNode;
  /** Suggestions list, loading, errors, company preview — below pills. */
  belowInputSlot: ReactNode;
  /** Stats row (e.g. AnimatedCounter strip). */
  footerSlot: ReactNode;
};

export default function LandingHero({ onStartTrial, inputSlot, belowInputSlot, footerSlot }: LandingHeroProps) {
  return (
    <section
      className="landing-hero-marketing relative flex min-h-screen flex-col justify-start overflow-hidden pb-12 pt-[var(--landing-nav-clearance,8rem)] [padding-left:var(--landing-gutter)] [padding-right:var(--landing-gutter)] sm:pb-16"
      aria-label="Marketing hero"
    >
      {/* Single soft wash — avoids stacked grids + competing glows */}
      <div className="landing-hero-bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-[1] mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-[clamp(40px,6vw,72px)]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-4 py-2 text-sm font-medium text-spark-green shadow-[0_1px_0_rgba(255,255,255,0.6)]">
            <span className="h-2 w-2 rounded-full bg-spark-green" aria-hidden />
            AI-Powered Outreach
          </div>

          <h1 className="landing-hero-title max-w-[22ch] text-5xl font-bold leading-[1.08] tracking-tight text-[color:var(--color-text)] sm:text-6xl">
            Turn Your Sales Goals Into <span className="text-spark-green">Revenue</span>
          </h1>

          <p className="landing-hero-subtitle mt-6 max-w-md text-base leading-[1.65] text-[color:var(--color-text-muted)] sm:mt-7 sm:text-lg">
            Plan, launch, and optimize omni-channel campaigns in minutes. Generate leads, enrich data, and automate
            follow-ups with AI — all in one platform.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              type="button"
              variant="primary"
              className="!min-h-[52px] !rounded-full !border-0 !px-8 !text-base !font-medium !shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition hover:!shadow-[0_6px_20px_rgba(37,99,235,0.32)]"
              onClick={onStartTrial}
            >
              <Icons.Rocket size={20} className="shrink-0" />
              Start Free Trial
            </Button>
            <Link
              href="#demo"
              className="btn-secondary-outline inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-[color:color-mix(in_srgb,var(--color-border)_92%,var(--color-primary))] px-8 text-base font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)] no-underline transition hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            >
              <Icons.Play size={18} className="shrink-0 text-[color:var(--color-primary)]" aria-hidden />
              See How It Works
            </Link>
          </div>

          <p className="mt-5 text-sm text-[color:var(--color-text-muted)]">
            No credit card required · Free plan available
          </p>

          <p className="mt-6 text-sm leading-snug text-[color:var(--color-text-muted)]">
            <span className="font-medium text-[color:var(--color-text)]">500+</span> teams already growing with Outriva
          </p>
        </div>

        {/* Right column — preview card */}
        <div className="relative min-w-0 w-full">
          <div className="landing-hero-preview-shell relative max-w-full overflow-x-clip overflow-hidden rounded-[1.5rem] border border-[color:color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color:var(--color-surface)] p-7 shadow-[0_12px_40px_rgba(15,23,42,0.07),0_1px_0_rgba(255,255,255,0.65)_inset] sm:rounded-[1.65rem] sm:p-10">
            <div className="mb-2 flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">
                Try it live
              </span>
              <span className="landing-live-preview-badge inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-gradient-to-r from-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] to-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-primary)] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="landing-live-preview-ping absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-primary)] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_8px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]" />
                </span>
                Live preview
              </span>
            </div>

            <h2 className="mt-3 max-w-full text-[clamp(12px,3.1vw,15px)] font-semibold leading-snug tracking-tight text-balance text-[color:var(--color-text)]">
              Search any company — see enriched intel before you sign up
            </h2>

            <div className="mt-6 min-w-0">{inputSlot}</div>

            <ul
              className="landing-hero-preview-pills mt-6 grid w-full min-w-0 grid-cols-4 list-none gap-1 p-0 sm:gap-1.5"
              aria-label="What you get in this preview"
            >
              {["Match in seconds", "Full firmographics", "Privacy-first", "Free to try"].map((label) => (
                <li key={label} className="min-w-0">
                  <span className="flex min-h-[2.25rem] items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-surface)_98%,var(--color-primary))] px-1 py-1.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:min-h-0 sm:rounded-xl sm:px-1.5 sm:py-2">
                    <span className="text-[9px] font-semibold leading-tight text-[color:var(--color-text)] sm:text-[10px]">
                      {label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 min-w-0">{belowInputSlot}</div>
          </div>
        </div>
      </div>

      <div className="relative z-[1] mt-12 w-full sm:mt-14 lg:mt-16">{footerSlot}</div>
    </section>
  );
}
