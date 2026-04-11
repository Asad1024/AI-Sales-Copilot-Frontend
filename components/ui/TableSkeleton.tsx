"use client";

import type { CSSProperties } from "react";

function CellBar({ style, className }: { style?: CSSProperties; className?: string }) {
  return <div className={className ? `ui-skeleton ${className}` : "ui-skeleton"} style={style} aria-hidden />;
}

export type TableSkeletonProps = {
  /** Data columns (excluding optional leading narrow / avatar column). */
  columns: number;
  rows?: number;
  /** Wrap in surface card (admin-style). */
  withCard?: boolean;
  /** First column: avatar + two lines (team roster). */
  leadingAvatar?: boolean;
  /** Sticky index + checkbox columns before data (leads table). */
  leadingIndexCheckbox?: boolean;
  /** Last column visually action-oriented (narrower bar, right-aligned header). */
  trailingActions?: boolean;
  className?: string;
  style?: CSSProperties;
  tableMinWidth?: number | string;
  ariaLabel?: string;
  /** Only the `<table>` — parent supplies scroll/aria (e.g. leads grid). */
  bareTable?: boolean;
};

/**
 * Generic table-shaped skeleton using theme-aware `ui-skeleton` (light/dark).
 */
export function TableSkeleton({
  columns,
  rows = 8,
  withCard = true,
  leadingAvatar = false,
  leadingIndexCheckbox = false,
  trailingActions = false,
  className,
  style,
  tableMinWidth,
  ariaLabel = "Loading table",
  bareTable = false,
}: TableSkeletonProps) {
  const shell = (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        minWidth: tableMinWidth,
      }}
    >
      <thead>
        <tr style={{ background: "var(--color-surface-secondary)", borderBottom: "1px solid var(--color-border)" }}>
          {leadingIndexCheckbox && (
            <>
              <th style={{ padding: "12px 6px", width: 36, minWidth: 36 }}>
                <CellBar style={{ height: 7, width: 14, borderRadius: 3, margin: "0 auto" }} />
              </th>
              <th style={{ padding: "12px 6px", width: 50, minWidth: 50 }}>
                <CellBar style={{ height: 12, width: 12, borderRadius: 4, margin: "0 auto" }} />
              </th>
            </>
          )}
          {leadingAvatar && (
            <th style={{ padding: 16, textAlign: "left", minWidth: 220 }}>
              <CellBar style={{ height: 12, width: "30%", borderRadius: 6 }} />
            </th>
          )}
          {Array.from({ length: columns }).map((_, i) => {
            const isLast = trailingActions && i === columns - 1;
            const widths = ["52%", "48%", "44%", "40%", "36%", "50%"];
            return (
              <th key={i} style={{ padding: 16, textAlign: isLast ? "right" : "left" }}>
                <CellBar
                  style={{
                    height: 12,
                    width: isLast ? 72 : widths[i % widths.length],
                    maxWidth: "100%",
                    borderRadius: 6,
                    marginLeft: isLast ? "auto" : undefined,
                  }}
                />
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, ri) => (
          <tr key={ri} style={{ borderBottom: "1px solid var(--color-border)" }}>
            {leadingIndexCheckbox && (
              <>
                <td style={{ padding: "12px 6px", textAlign: "center" }}>
                  <CellBar style={{ height: 7, width: 14, borderRadius: 3, margin: "0 auto" }} />
                </td>
                <td style={{ padding: "12px 6px", textAlign: "center", width: 50, minWidth: 50 }}>
                  <CellBar style={{ height: 12, width: 12, borderRadius: 3, margin: "0 auto" }} />
                </td>
              </>
            )}
            {leadingAvatar && (
              <td style={{ padding: "14px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CellBar style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    <CellBar style={{ height: 14, width: "72%", borderRadius: 6 }} />
                    <CellBar style={{ height: 12, width: "88%", borderRadius: 6 }} />
                  </div>
                </div>
              </td>
            )}
            {Array.from({ length: columns }).map((_, ci) => {
              const isLast = trailingActions && ci === columns - 1;
              return (
                <td key={ci} style={{ padding: "14px 16px", textAlign: isLast ? "right" : "left" }}>
                  <CellBar
                    style={{
                      height: 14,
                      width: isLast ? 80 : ci % 3 === 0 ? "92%" : "76%",
                      borderRadius: 6,
                      marginLeft: isLast ? "auto" : undefined,
                    }}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (bareTable) {
    return shell;
  }

  const inner = (
    <div style={{ overflowX: "auto" }} className={className}>
      {shell}
    </div>
  );

  if (!withCard) {
    return (
      <div style={style} aria-busy="true" aria-label={ariaLabel}>
        {inner}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: 16,
        border: "1px solid var(--color-border)",
        overflow: "hidden",
        ...style,
      }}
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {inner}
    </div>
  );
}

/** Matches DynamicLeadsTable layout: scroll shell + wizard-style card + # / checkbox + data columns. */
export function LeadsTableSkeleton({ rows = 12, dataColumns = 8 }: { rows?: number; dataColumns?: number }) {
  const card: CSSProperties = {
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    overflow: "visible",
    background: "var(--color-surface)",
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minHeight: 0,
        maxHeight: "100%",
        position: "relative",
      }}
      aria-busy="true"
      aria-label="Loading leads"
    >
      <div
        className="leads-table-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <style>{`
          .leads-table-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
          }
          .leads-table-scroll::-webkit-scrollbar {
            height: 4px;
            width: 4px;
          }
          .leads-table-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .leads-table-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.45);
            border-radius: 999px;
          }
        `}</style>
        <div style={card}>
          <div style={{ overflowX: "auto" }}>
            <TableSkeleton
              columns={dataColumns}
              rows={rows}
              withCard={false}
              bareTable
              leadingIndexCheckbox
              trailingActions={false}
              tableMinWidth={Math.max(720, 36 + 50 + dataColumns * 132)}
              ariaLabel="Loading leads"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
