"use client";

import type { CSSProperties } from "react";

/** Same gradient as landing `app/page.tsx` (`--gradient-primary`). */
export const APP_BRAND_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)";

/** Lightning path inside the mark — matches landing header `logo-icon` SVG. */
const LIGHTNING_PATH = "M13 2L3 14h7l-1 8 10-12h-7l1-8z";

export type AppBrandLogoMarkProps = {
  /** Outer box width/height in px (landing header uses 44). */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Product mark: gradient tile + filled lightning — same asset as the landing page header.
 * Scales geometry proportionally when `size` is not 44.
 */
export function AppBrandLogoMark({ size = 44, className, style }: AppBrandLogoMarkProps) {
  const radius = Math.max(8, Math.round((12 * size) / 44));
  const svgSize = Math.round((24 * size) / 44);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: APP_BRAND_GRADIENT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "none",
        ...style,
      }}
      aria-hidden
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
        <path d={LIGHTNING_PATH} />
      </svg>
    </div>
  );
}

/** Wordmark style matching landing `.logo-text` (gradient fill). */
export function appBrandWordmarkStyle(fontSizePx: number): CSSProperties {
  return {
    fontSize: fontSizePx,
    fontWeight: 800,
    letterSpacing: "-0.5px",
    fontFamily: "Inter, sans-serif",
    background: APP_BRAND_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
}
