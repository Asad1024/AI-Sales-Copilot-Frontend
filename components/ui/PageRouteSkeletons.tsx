"use client";

import type { CSSProperties } from "react";

const pageShell: CSSProperties = {
  minHeight: "calc(100vh - 56px)",
  width: "100%",
  background: "var(--color-canvas)",
  display: "flex",
  flexDirection: "column",
  padding: "8px clamp(10px, 1.25vw, 20px) 14px",
  gap: 12,
  boxSizing: "border-box",
};

function Bar({ style, className }: { style?: CSSProperties; className?: string }) {
  return <div className={className ? `ui-skeleton ${className}` : "ui-skeleton"} style={style} aria-hidden />;
}

/** Toolbar row + workspace grid (full cards). */
export function WorkspacePageSkeleton() {
  return (
    <div style={pageShell} aria-busy="true" aria-label="Loading workspaces">
      <div className="skeleton-page-card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Bar style={{ height: 40, flex: 1, minWidth: 200, maxWidth: 640, borderRadius: 10 }} />
        <Bar style={{ width: 44, height: 40, borderRadius: 10 }} />
        <Bar style={{ width: 130, height: 40, borderRadius: 10 }} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
          gap: 14,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-page-card" style={{ minHeight: 232, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Bar style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <Bar style={{ height: 18, width: "72%", borderRadius: 8 }} />
                <Bar style={{ height: 14, width: "45%", borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <Bar style={{ height: 56, borderRadius: 10 }} />
              <Bar style={{ height: 56, borderRadius: 10 }} />
            </div>
            <Bar style={{ height: 40, width: "100%", borderRadius: 10, marginTop: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Toolbar + stats strip + tier block + campaign cards. */
export function CampaignsPageSkeleton() {
  return (
    <div style={pageShell} aria-busy="true" aria-label="Loading campaigns">
      <div className="skeleton-page-card" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Bar style={{ height: 40, flex: 1, minWidth: 200, maxWidth: 640, borderRadius: 10 }} />
        <Bar style={{ width: 44, height: 40, borderRadius: 10 }} />
        <Bar style={{ width: 150, height: 40, borderRadius: 10 }} />
      </div>
      <div className="skeleton-page-card" style={{ display: "flex", flexDirection: "row", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              minWidth: 136,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "4px 0",
            }}
          >
            <Bar style={{ height: 12, width: "75%", borderRadius: 6 }} />
            <Bar style={{ height: 36, width: "55%", borderRadius: 8 }} />
          </div>
        ))}
      </div>
      <div className="skeleton-page-card" style={{ minHeight: 140, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
            <Bar style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div style={{ flex: 1, maxWidth: 320 }}>
              <Bar style={{ height: 16, width: "70%", borderRadius: 8, marginBottom: 8 }} />
              <Bar style={{ height: 12, width: "90%", borderRadius: 6 }} />
            </div>
          </div>
          <Bar style={{ width: 160, height: 36, borderRadius: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <Bar style={{ height: 88, borderRadius: 12 }} />
          <Bar style={{ height: 88, borderRadius: 12 }} />
          <Bar style={{ height: 88, borderRadius: 12 }} />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-page-card" style={{ minHeight: 300, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                <Bar style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Bar style={{ height: 16, width: "78%", borderRadius: 6 }} />
                  <Bar style={{ height: 12, width: "48%", borderRadius: 6 }} />
                </div>
              </div>
              <Bar style={{ width: 76, height: 26, borderRadius: 999 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[0, 1, 2, 3].map((j) => (
                <Bar key={j} style={{ height: 52, borderRadius: 10 }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid var(--elev-border)" }}>
              <Bar style={{ width: 40, height: 40, borderRadius: 10 }} />
              <Bar style={{ width: 40, height: 40, borderRadius: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Template card grid only (toolbar stays real on the page). */
export function TemplatesCardsSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
        gap: 14,
      }}
      aria-busy="true"
      aria-label="Loading templates"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="skeleton-page-card" style={{ minHeight: 220, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Bar style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Bar style={{ height: 16, width: "85%", borderRadius: 8, marginBottom: 10 }} />
              <Bar style={{ height: 12, width: "55%", borderRadius: 6 }} />
            </div>
          </div>
          <Bar style={{ height: 72, width: "100%", borderRadius: 10 }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Bar style={{ width: 40, height: 40, borderRadius: 10 }} />
            <Bar style={{ width: 40, height: 40, borderRadius: 10 }} />
            <Bar style={{ width: 40, height: 40, borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard: header + compact onboarding + 4 stats + 2-col campaigns + quick actions. */
export function DashboardPageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true" aria-label="Loading dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bar style={{ height: 12, width: 160, borderRadius: 6 }} />
          <Bar style={{ height: 32, width: 200, borderRadius: 8 }} />
        </div>
        <Bar style={{ height: 42, width: 148, borderRadius: 12 }} />
      </div>
      <div className="skeleton-page-card" style={{ maxHeight: 80, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <Bar style={{ height: 10, width: 100, borderRadius: 4 }} />
        <Bar style={{ height: 28, width: 90, borderRadius: 999 }} />
        <Bar style={{ height: 28, width: 72, borderRadius: 999 }} />
        <Bar style={{ height: 12, width: 36, borderRadius: 4, marginLeft: "auto" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-page-card" style={{ minHeight: 96, padding: "12px 14px" }}>
            <Bar style={{ height: 10, width: "55%", borderRadius: 4, marginBottom: 8 }} />
            <Bar style={{ height: 28, width: "42%", borderRadius: 8, marginBottom: 8 }} />
            <Bar style={{ height: 22, width: "70%", borderRadius: 999 }} />
          </div>
        ))}
      </div>
      <Bar style={{ height: 12, width: 140, borderRadius: 4 }} />
      <div className="dashboard-campaigns-grid" style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.95fr) minmax(0, 1.15fr)", gap: 14 }}>
        <div className="skeleton-page-card" style={{ minHeight: 180, padding: 20 }} />
        <div className="skeleton-page-card" style={{ minHeight: 180, padding: 18 }} />
      </div>
      <Bar style={{ height: 12, width: 120, borderRadius: 4 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }} className="quick-actions-row dashboard-quick-actions">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-page-card" style={{ minHeight: 148, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <Bar style={{ width: 48, height: 48, borderRadius: 12 }} />
            <Bar style={{ height: 14, width: "72%", borderRadius: 6 }} />
            <Bar style={{ height: 12, width: "100%", borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
