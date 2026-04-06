"use client";

import type { CSSProperties } from "react";
import { BookOpen, Coins } from "lucide-react";

/** Hardcoded UI matching design reference; wire to real credits/tutorial later. */
const HARDCODED_CREDITS = 498;

/** Same outer height for tutorial pill and credits / upgrade pill */
const HEADER_PILL_HEIGHT = 40;
const headerPillBox: CSSProperties = {
  boxSizing: "border-box",
  minHeight: HEADER_PILL_HEIGHT,
  height: HEADER_PILL_HEIGHT,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fafafa",
  fontFamily: "Inter, -apple-system, sans-serif",
};

export default function HeaderTopRightPills() {
  return (
    <div
      className="header-top-right-pills"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        className="header-top-right-pills__tutorial"
        style={{
          ...headerPillBox,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fafafa";
        }}
      >
        <BookOpen size={18} strokeWidth={1.75} color="#374151" aria-hidden />
        <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>Tutorial</span>
      </button>

      <div
        className="header-top-right-pills__credits"
        style={{
          ...headerPillBox,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px 0 8px",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <Coins size={15} strokeWidth={1.75} color="#d97706" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#b45309", minWidth: 28, lineHeight: 1 }}>{HARDCODED_CREDITS}</span>
        <div
          style={{
            width: 1,
            height: 18,
            background: "#e5e7eb",
            flexShrink: 0,
          }}
          aria-hidden
        />
        <button
          type="button"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "0 2px",
            fontSize: 13,
            fontWeight: 600,
            color: "#6366f1",
            fontFamily: "inherit",
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6366f1";
          }}
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}
