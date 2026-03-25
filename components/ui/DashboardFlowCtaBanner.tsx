"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Zap } from "lucide-react";
import { useSparkBarStore } from "@/stores/useSparkBarStore";

const LS_EXPANDED = "sparkai:dashboard-flow-cta-expanded";

type DashboardFlowCtaBannerProps = {
  leadsOptimizedK: string;
  replyRatePct: string;
  aiScorePct: string;
};

const ghostSm: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  background: "#FFFFFF",
  color: "#374151",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "Inter, sans-serif",
  cursor: "pointer",
  transition: "background 150ms ease, border-color 150ms ease",
  whiteSpace: "nowrap",
};

export default function DashboardFlowCtaBanner({
  leadsOptimizedK,
  replyRatePct,
  aiScorePct,
}: DashboardFlowCtaBannerProps) {
  const router = useRouter();
  const visible = useSparkBarStore((s) => s.visible);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("sparkai:dashboard-flow-cta-dismissed") === "1") {
        useSparkBarStore.getState().setVisible(false);
        localStorage.removeItem("sparkai:dashboard-flow-cta-dismissed");
      }
      setExpanded(localStorage.getItem(LS_EXPANDED) === "true");
    }
    setReady(true);
  }, []);

  const setExpandedPersist = (next: boolean) => {
    setExpanded(next);
    localStorage.setItem(LS_EXPANDED, String(next));
  };

  if (!ready || !visible) return null;

  return (
    <div
      data-tour="dashboard-flow-cta-banner"
      style={{
        maxHeight: expanded ? 300 : 48,
        transition: "max-height 200ms ease",
        overflow: "hidden",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        fontFamily: "Inter, sans-serif",
        fontSize: 14,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div
        style={{
          minHeight: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "0 12px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedPersist(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
          }}
          aria-expanded={expanded}
        >
          <span style={{ display: "flex", color: "#6B7280", flexShrink: 0 }}>
            <Zap size={15} strokeWidth={1.5} />
          </span>
          <span
            style={{
              fontWeight: 500,
              color: "#111827",
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Accelerate outreach with Spark AI
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!expanded && (
            <>
              <button
                type="button"
                style={ghostSm}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F9FAFB";
                  e.currentTarget.style.borderColor = "#D1D5DB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.borderColor = "#E5E7EB";
                }}
                onClick={() => router.push("/flow/new-goal")}
              >
                <Zap size={13} strokeWidth={1.5} />
                Start New Flow
              </button>
              <button
                type="button"
                style={ghostSm}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F9FAFB";
                  e.currentTarget.style.borderColor = "#D1D5DB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FFFFFF";
                  e.currentTarget.style.borderColor = "#E5E7EB";
                }}
                onClick={() => router.push("/demo")}
              >
                <PlayCircle size={13} strokeWidth={1.5} />
                Watch Demo
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px 4px",
              fontSize: 12,
              fontWeight: 500,
              color: "#4B5563",
            }}
          >
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
              }}
            >
              Leads Optimized: {leadsOptimizedK}
            </span>
            <span style={{ color: "#D1D5DB", userSelect: "none" }} aria-hidden>
              ·
            </span>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
              }}
            >
              Reply Rate: {replyRatePct}
            </span>
            <span style={{ color: "#D1D5DB", userSelect: "none" }} aria-hidden>
              ·
            </span>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
              }}
            >
              AI Score: {aiScorePct}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#6B7280" }}>
            Plan, launch and optimize omni-channel campaigns in minutes.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              style={{ ...ghostSm, padding: "6px 12px" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F9FAFB";
                e.currentTarget.style.borderColor = "#D1D5DB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
              onClick={() => router.push("/flow/new-goal")}
            >
              <Zap size={14} strokeWidth={1.5} />
              Start New Flow
            </button>
            <button
              type="button"
              style={{ ...ghostSm, padding: "6px 12px" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F9FAFB";
                e.currentTarget.style.borderColor = "#D1D5DB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.borderColor = "#E5E7EB";
              }}
              onClick={() => router.push("/demo")}
            >
              <PlayCircle size={14} strokeWidth={1.5} />
              Watch Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
