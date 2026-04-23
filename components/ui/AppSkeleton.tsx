"use client";

import type { CSSProperties } from "react";

type UiSkeletonProps = {
  height?: number;
  width?: string | number;
  className?: string;
  style?: CSSProperties;
  radius?: number;
};

/** Theme-aware pulse block (uses `.ui-skeleton` from `globals.css`). */
export function UiSkeleton({ height = 14, width = "100%", className, style, radius = 10 }: UiSkeletonProps) {
  return (
    <div
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

/** Placeholder row matching `campaigns-page-grid` min card width. */
export function CampaignGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="campaigns-page-grid" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-page-card"
          style={{ minHeight: 168, display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}
        >
          <UiSkeleton height={14} width="55%" />
          <UiSkeleton height={10} width="40%" />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <UiSkeleton height={22} width={72} radius={8} />
            <UiSkeleton height={22} width={72} radius={8} />
          </div>
          <UiSkeleton height={36} width="100%" style={{ marginTop: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 8px" }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <UiSkeleton key={i} height={40} width="100%" radius={8} />
      ))}
    </div>
  );
}
