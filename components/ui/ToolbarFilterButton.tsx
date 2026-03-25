"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";

type ToolbarFilterButtonProps = {
  onClick: () => void;
  label?: string;
  open?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  /** If true, shows only the filter icon (bases-style icon-only control) */
  iconOnly?: boolean;
  /** Shorter control to pair with slim search fields */
  slim?: boolean;
  /** h-10 row with slate-200 border + slate-600 label (Workspaces / Campaigns) */
  variant?: "default" | "minimal";
};

/** Unified filter trigger: outline secondary (white / light border). */
export default function ToolbarFilterButton({
  onClick,
  label = "Filter",
  open,
  disabled,
  "aria-label": ariaLabel,
  iconOnly = false,
  slim = false,
  variant = "default",
}: ToolbarFilterButtonProps) {
  const isMinimal = variant === "minimal";
  const minHeight = isMinimal ? 40 : slim ? 32 : 36;
  const padding = isMinimal
    ? iconOnly
      ? "0 12px"
      : "0 14px"
    : slim
      ? iconOnly
        ? "5px 8px"
        : "5px 10px"
      : iconOnly
        ? "8px 10px"
        : "8px 12px";
  const iconSize = isMinimal ? 15 : slim ? 16 : 18;
  return (
    <button
      type="button"
      className={`btn-secondary-outline${isMinimal ? " toolbar-filter-minimal" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      aria-expanded={open}
      style={{
        borderRadius: 8,
        padding,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: isMinimal ? 6 : slim ? 6 : 8,
        minHeight,
      }}
    >
      <Icons.Filter size={iconSize} strokeWidth={1.5} />
      {!iconOnly ? <span style={{ fontSize: isMinimal ? 14 : slim ? 12 : 13, fontWeight: 500 }}>{label}</span> : null}
    </button>
  );
}
