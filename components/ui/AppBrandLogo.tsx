"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { APP_BRAND_NAME } from "@/lib/brand";

export { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";

/** Full wordmarks in `public/` — theme + sidebar variants. */
export const APP_BRAND_LOGO_LIGHT = "/light_logo.png";
export const APP_BRAND_LOGO_DARK = "/dark_logo.png";
/** Collapsed sidebar rail (light theme). */
export const APP_BRAND_LOGO_LIGHT_COLLAPSE = "/light_collapse.png";
/** Collapsed sidebar rail (dark theme). */
export const APP_BRAND_LOGO_DARK_COLLAPSE = "/dark_collapse.png";
/** @deprecated Use `APP_BRAND_LOGO_LIGHT_COLLAPSE`. */
export const APP_BRAND_LOGO_COLLAPSE = APP_BRAND_LOGO_LIGHT_COLLAPSE;
/** @deprecated Use `APP_BRAND_LOGO_DARK_COLLAPSE`. */
export const APP_BRAND_LOGO_COLLAPSE_DARK = APP_BRAND_LOGO_DARK_COLLAPSE;

/** @deprecated Use theme-specific assets via `AppBrandLogoLockup`. */
export const APP_BRAND_LOGO_PATH = APP_BRAND_LOGO_LIGHT;

/** Same gradient as landing `app/page.tsx` (`--gradient-primary`). */
export const APP_BRAND_GRADIENT = "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)";

/** Lightning path inside the mark — matches landing `logo-icon` SVG. */
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

function resolveBrandLogoSrc(collapsed: boolean, theme: "light" | "dark"): string {
  if (collapsed) {
    return theme === "dark" ? APP_BRAND_LOGO_DARK_COLLAPSE : APP_BRAND_LOGO_LIGHT_COLLAPSE;
  }
  return theme === "dark" ? APP_BRAND_LOGO_DARK : APP_BRAND_LOGO_LIGHT;
}

export type AppBrandLogoLockupProps = {
  /** CSS height in px; width follows aspect ratio. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Desktop sidebar collapsed rail — `light_collapse.png` or `dark_collapse.png` by theme. */
  collapsed?: boolean;
  /**
   * Override automatic `document.documentElement[data-theme]` (e.g. landing page local light/dark).
   * When omitted, follows global app theme.
   */
  theme?: "light" | "dark";
};

/**
 * Raster logos from `public/light_logo.png`, `dark_logo.png`, `light_collapse.png`, `dark_collapse.png`.
 */
export function AppBrandLogoLockup({
  height = 40,
  className,
  style,
  collapsed = false,
  theme: themeOverride,
}: AppBrandLogoLockupProps) {
  const [domTheme, setDomTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (themeOverride != null) return;
    const read = () => {
      const t = document.documentElement.getAttribute("data-theme");
      setDomTheme(t === "dark" ? "dark" : "light");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [themeOverride]);

  const effectiveTheme = themeOverride ?? domTheme;
  const src = resolveBrandLogoSrc(collapsed, effectiveTheme);

  return (
    <img
      src={src}
      alt={APP_BRAND_NAME}
      className={className}
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        ...style,
      }}
    />
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
