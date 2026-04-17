"use client";

import type { CSSProperties } from "react";
import { Icons } from "@/components/ui/Icons";

/** Full-width area below the main nav (matches list pages canvas). */
const PAGE_CANVAS: CSSProperties = {
  minHeight: "calc(100vh - 56px)",
  width: "100%",
  background: "var(--color-canvas)",
  display: "flex",
  flexDirection: "column",
  padding: "8px clamp(10px, 1.25vw, 20px) 14px",
  boxSizing: "border-box",
};

const LOADER_GLYPH_SIZE = 28;

export type GlobalPageLoaderProps = {
  /** Accessible status label */
  ariaLabel?: string;
  /** Visible line under the spinner (default: “Loading…”) */
  message?: string;
  /**
   * `page` — full content region under the nav (e.g. workspaces first paint, campaign detail).
   * `embedded` — inside a page section (dashboard analytics, grids, a single workspace card).
   */
  layout?: "page" | "embedded";
  /** Used when `layout` is `embedded` and `fill` is false */
  minHeight?: number;
  className?: string;
  /** Embedded only: grow to fill a flex parent (e.g. leads table area) */
  fill?: boolean;
};

/**
 * Central loading UI used app-wide: smooth plane loader + styled status text.
 * Animation is defined in `globals.css` (`.global-page-loader-plane*`).
 */
export function GlobalPageLoader({
  ariaLabel = "Loading",
  message = "Loading...",
  layout = "page",
  minHeight = 320,
  className,
  fill = false,
}: GlobalPageLoaderProps) {
  const innerClass =
    layout === "page"
      ? "global-page-loader-root global-page-loader-root--page"
      : "global-page-loader-root global-page-loader-root--embedded";

  const label = <span className="global-page-loader-label">{message}</span>;

  if (layout === "page") {
    return (
      <div style={PAGE_CANVAS} className={className} aria-busy="true" aria-live="polite" role="status" aria-label={ariaLabel}>
        <div className={innerClass}>
          <span className="global-page-loader-plane" aria-hidden>
            <span className="global-page-loader-plane-trail" />
            <span className="global-page-loader-plane-glyph">
              <Icons.Send size={LOADER_GLYPH_SIZE} strokeWidth={2} />
            </span>
          </span>
          {label}
        </div>
      </div>
    );
  }

  const embeddedOuterStyle: CSSProperties = fill
    ? { width: "100%", flex: 1, minHeight: 0, boxSizing: "border-box" }
    : { width: "100%", minHeight, boxSizing: "border-box" };

  return (
    <div
      className={[innerClass, className].filter(Boolean).join(" ")}
      style={embeddedOuterStyle}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label={ariaLabel}
    >
      <span className="global-page-loader-plane" aria-hidden>
        <span className="global-page-loader-plane-trail" />
        <span className="global-page-loader-plane-glyph">
          <Icons.Send size={LOADER_GLYPH_SIZE} strokeWidth={2} />
        </span>
      </span>
      {label}
    </div>
  );
}
