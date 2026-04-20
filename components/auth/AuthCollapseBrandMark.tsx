"use client";

import type { CSSProperties } from "react";
import { AppBrandLogoLockup } from "@/components/ui/AppBrandLogo";

type AuthCollapseBrandMarkProps = {
  /** Space below the mark in px */
  marginBottom?: number;
  style?: CSSProperties;
};

/**
 * `public/collapse_logo.png` — same asset as the collapsed sidebar rail.
 * Use on OAuth and other auth transitional screens for consistent branding.
 */
export function AuthCollapseBrandMark({ marginBottom = 24, style }: AuthCollapseBrandMarkProps) {
  return (
    <div
      style={{
        margin: `0 auto ${marginBottom}px`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      <AppBrandLogoLockup
        collapsed
        height={64}
        style={{
          height: 64,
          maxWidth: 64,
          width: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 12px 28px rgba(37, 99, 235, 0.22))",
        }}
      />
    </div>
  );
}
