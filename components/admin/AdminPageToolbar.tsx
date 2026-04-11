"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

export default function AdminPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  right,
  resultHint,
  maxWidth = 1400,
  showSearch = true,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  right?: ReactNode;
  /** e.g. "12 of 48" shown under the bar on the right */
  resultHint?: string;
  maxWidth?: number;
  /** When false, hides the search field (e.g. analytics dashboard). */
  showSearch?: boolean;
}) {
  return (
    <div className="admin-toolbar-wrap" style={{ maxWidth, margin: "0 auto 16px" }}>
      <div
        className="admin-toolbar-inner"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: "var(--color-surface)",
          boxShadow: "0 1px 2px var(--color-shadow)",
        }}
      >
        {showSearch ? (
        <div style={{ flex: "1 1 200px", minWidth: 0, position: "relative" }}>
          <Search
            size={18}
            strokeWidth={1.75}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }}
            aria-hidden
          />
          <input
            type="search"
            className="input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            style={{
              width: "100%",
              boxSizing: "border-box",
              paddingLeft: 40,
              paddingTop: 9,
              paddingBottom: 9,
            }}
          />
        </div>
        ) : (
          <div style={{ flex: "1 1 120px", minWidth: 0 }} />
        )}
        {filters ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>{filters}</div>
        ) : null}
        {right ? (
          <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            {right}
          </div>
        ) : null}
      </div>
      {resultHint ? (
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, textAlign: "right" }}>{resultHint}</div>
      ) : null}
    </div>
  );
}
