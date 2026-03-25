"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";

const inputBase = {
  width: "100%" as const,
  borderRadius: 8,
  background: "var(--elev-bg)",
  color: "var(--color-text)",
  outline: "none" as const,
};

type ToolbarSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** minimal = h-10, slate-200 border, dashboard-style row (Workspaces / Campaigns) */
  variant?: "default" | "compact" | "slim" | "minimal";
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  "aria-label"?: string;
  suppressFocusRing?: boolean;
};

/**
 * Unified search field: icon + input styling used on Workspaces and across the app.
 */
export default function ToolbarSearchField({
  value,
  onChange,
  placeholder = "Search…",
  variant = "default",
  className,
  style,
  id,
  "aria-label": ariaLabel,
  suppressFocusRing = false,
}: ToolbarSearchFieldProps) {
  const isMinimal = variant === "minimal";
  const isSlim = variant === "slim";
  const isCompact = variant === "compact" || isSlim;
  const iconSize = isMinimal ? 14 : isSlim ? 15 : isCompact ? 16 : 18;
  const iconLeft = isMinimal ? 10 : isSlim ? 9 : 10;
  const padLeft = isMinimal ? 34 : isSlim ? 30 : isCompact ? 32 : 34;
  const padY = isMinimal ? "0" : isSlim ? "5px" : isCompact ? "6px" : "9px";
  const padRight = isMinimal ? "12px" : isSlim ? "10px" : isCompact ? "10px" : "12px";
  const fontSize = isMinimal ? 14 : 13;
  const minH = isMinimal ? 40 : isSlim ? 32 : undefined;
  const defaultBorder = isMinimal ? "1px solid #e2e8f0" : "1px solid var(--color-border)";

  return (
    <div
      className={`${isMinimal ? "toolbar-search-minimal-wrap " : ""}${className || ""}`}
      style={{ position: "relative", minWidth: isMinimal ? 220 : isSlim ? 200 : isCompact ? 180 : 200, ...style }}
    >
      <Icons.Search
        size={iconSize}
        strokeWidth={1.75}
        style={{
          position: "absolute",
          left: iconLeft,
          top: "50%",
          transform: "translateY(-50%)",
          color: isMinimal ? "#475569" : "var(--color-text-muted)",
          pointerEvents: "none",
        }}
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={isMinimal ? "toolbar-search-minimal-input" : undefined}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        onFocus={(e) => {
          if (!suppressFocusRing && !isMinimal) return;
          e.currentTarget.style.outline = "none";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.border = isMinimal ? "1px solid #cbd5e1" : "1px solid var(--color-border)";
        }}
        onBlur={(e) => {
          if (!suppressFocusRing && !isMinimal) return;
          e.currentTarget.style.outline = "none";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.border = defaultBorder;
        }}
        style={{
          ...inputBase,
          border: defaultBorder,
          boxSizing: "border-box",
          padding: isMinimal ? `0 ${padRight} 0 ${padLeft}px` : `${padY} ${padRight} ${padY} ${padLeft}px`,
          fontSize,
          minHeight: minH,
          height: isMinimal ? 40 : undefined,
          lineHeight: isMinimal ? "40px" : isSlim ? 1.25 : undefined,
          background: isMinimal ? "#ffffff" : undefined,
        }}
      />
    </div>
  );
}
