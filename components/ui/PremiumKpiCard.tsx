"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  KpiEnterpriseChart,
  type EnterpriseChartVariant,
} from "@/components/dashboard/KpiEnterpriseChart";
import { computeSparklineTrendPct } from "@/lib/kpiStatsApi";

const KPI_CARD_MIN_HEIGHT = 118;
const KPI_CARD_MIN_HEIGHT_WITH_CHART = 162;
/** ECharts canvas height (axes + plot) inside the chart well — room for 3 X + 3 Y tick labels. */
const KPI_CHART_HEIGHT = 62;
/** Matches the ~single-line 32px KPI headline so workspace + chart cards share the same chart offset. */
const KPI_HEADLINE_SLOT_PX = 38;
const KPI_TREND_ROW_MIN_PX = 16;

type WorkspaceCardLayout = {
  /** Large centered label (active workspace name). */
  activeName: string;
  /** Total workspace count shown at the bottom (plain text, no chart well). */
  total: string;
};

type PremiumKpiCardProps = {
  title: string;
  value: string | number;
  valueMuted?: boolean;
  valueTitle?: string;
  valueKind?: "number" | "text";
  note?: string;
  /** Active workspace card: large name in the middle, total at bottom — no chart-style well. */
  workspaceLayout?: WorkspaceCardLayout;
  footer?: string;
  icon?: ReactNode;
  /** Series values (oldest → newest) for Apache ECharts mini chart. */
  sparklineValues?: number[];
  /**
   * ERP-style chart look (Apache ECharts). Defaults to `lineSmoothDots` when omitted.
   * There is no `proerp` npm package — ECharts is the standard for this layout.
   */
  echartsVariant?: EnterpriseChartVariant;
};

export const PREMIUM_KPI_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
  alignItems: "stretch",
};

export function PremiumKpiCard({
  title,
  value,
  valueMuted = false,
  valueTitle,
  valueKind = "number",
  note,
  workspaceLayout,
  footer,
  icon,
  sparklineValues,
  echartsVariant = "lineSmoothDots",
}: PremiumKpiCardProps) {
  const hasSparkline = Array.isArray(sparklineValues) && sparklineValues.length >= 2;
  const kpiTrendBlock =
    hasSparkline && (valueKind === "number" || Boolean(workspaceLayout));
  const chartNumericMax = kpiTrendBlock
    ? Math.max(...sparklineValues!.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0)))
    : 0;
  const showChartPlot = kpiTrendBlock && chartNumericMax > 0;
  const trend = kpiTrendBlock ? computeSparklineTrendPct(sparklineValues) : null;

  const hasWorkspaceLayout = Boolean(workspaceLayout);
  const useTallCardLayout = kpiTrendBlock;

  const valueAlign: "left" | "center" =
    valueKind === "text" ? "left" : kpiTrendBlock ? "center" : "left";
  const showHeaderNote = Boolean(note);

  const wellShellStyle: CSSProperties = {
    width: "100%",
    maxWidth: 196,
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: 6,
    boxSizing: "border-box",
    borderRadius: 10,
    alignSelf: "center",
    background:
      "linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.22) 0%, rgba(var(--color-primary-rgb), 0.1) 45%, rgba(var(--color-primary-rgb), 0.05) 100%)",
    border: "1px solid rgba(var(--color-primary-rgb), 0.28)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)",
    backgroundImage:
      "radial-gradient(rgba(var(--color-primary-rgb), 0.14) 1px, transparent 1px), radial-gradient(rgba(var(--color-primary-rgb), 0.08) 1px, transparent 1px)",
    backgroundSize: "10px 10px, 10px 10px",
    backgroundPosition: "0 0, 5px 5px",
  };

  return (
    <div
      className="dashboard-stat-card"
      style={{
        minHeight: useTallCardLayout ? KPI_CARD_MIN_HEIGHT_WITH_CHART : KPI_CARD_MIN_HEIGHT,
        padding: "8px 10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
        borderRadius: 14,
        border: "1px solid rgba(var(--color-primary-rgb), 0.18)",
        background:
          "linear-gradient(160deg, rgba(var(--color-primary-rgb), 0.1) 0%, rgba(var(--color-primary-rgb), 0.045) 48%, var(--color-surface) 100%)",
      }}
    >
      <div style={{ minHeight: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {icon ? (
            <span
              aria-hidden
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                background: "rgba(var(--color-primary-rgb), 0.16)",
                color: "var(--color-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          ) : null}
          <span
            className="dashboard-metric-label"
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              display: "block",
              minWidth: 0,
            }}
          >
            {title}
          </span>
        </div>
        {showHeaderNote ? (
          <div
            style={{
              marginTop: 2,
              fontSize: 11,
              color: "var(--color-text-muted)",
              letterSpacing: "0.01em",
              minHeight: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {note}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: "0 0 auto",
          minWidth: 0,
          gap: 2,
          width: "100%",
        }}
      >
        {!hasWorkspaceLayout ? (
          <div
            title={valueTitle}
            style={{
              minHeight: kpiTrendBlock ? KPI_HEADLINE_SLOT_PX : undefined,
              maxHeight: kpiTrendBlock ? KPI_HEADLINE_SLOT_PX : undefined,
              display: kpiTrendBlock ? "flex" : undefined,
              alignItems: kpiTrendBlock ? "center" : undefined,
              fontSize: valueKind === "text" ? 20 : kpiTrendBlock ? 32 : 36,
              fontWeight: valueMuted ? 600 : 800,
              letterSpacing: valueKind === "text" ? "-0.02em" : "-0.035em",
              lineHeight: 1.08,
              color: valueMuted ? "var(--color-text-muted)" : "var(--color-text)",
              fontFamily: "Inter, -apple-system, sans-serif",
              width: "100%",
              minWidth: 0,
              textAlign: valueAlign,
              whiteSpace: valueKind === "text" ? "nowrap" : "normal",
              overflow: valueKind === "text" ? "hidden" : "visible",
              textOverflow: valueKind === "text" ? "ellipsis" : "clip",
              wordBreak: valueKind === "text" ? "normal" : "break-word",
            }}
          >
            {value}
          </div>
        ) : null}

        {hasWorkspaceLayout && workspaceLayout ? (
          <div
            style={{
              boxSizing: "border-box",
              minHeight: KPI_HEADLINE_SLOT_PX,
              maxHeight: KPI_HEADLINE_SLOT_PX,
              minWidth: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <div
              title={valueTitle ?? workspaceLayout.activeName}
              style={{
                minWidth: 0,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "var(--color-text)",
                  fontFamily: "Inter, -apple-system, sans-serif",
                  display: "block",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {workspaceLayout.activeName}
              </span>
            </div>
            <div
              style={{
                flexShrink: 0,
                paddingTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                width: "100%",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                Total workspaces
              </span>
              <span
                title="Total workspaces"
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.03em",
                  color: "var(--color-text)",
                  fontFamily: "Inter, -apple-system, sans-serif",
                  minWidth: 0,
                  textAlign: "right",
                }}
              >
                {workspaceLayout.total}
              </span>
            </div>
          </div>
        ) : null}

        {trend ? (
          <div
            style={{
              minHeight: KPI_TREND_ROW_MIN_PX,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              color:
                trend.tone === "up"
                  ? "#16a34a"
                  : trend.tone === "down"
                    ? "#dc2626"
                    : "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            {trend.label}
          </div>
        ) : null}

        {kpiTrendBlock && sparklineValues ? (
          <div
            style={{
              ...wellShellStyle,
              padding: showChartPlot ? "6px 8px 4px" : "10px 10px",
            }}
          >
            {showChartPlot ? (
              <KpiEnterpriseChart
                values={sparklineValues}
                title={title}
                variant={echartsVariant}
                height={KPI_CHART_HEIGHT}
                compact
              />
            ) : (
              <div
                style={{
                  minHeight: KPI_CHART_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  textAlign: "center",
                }}
              >
                No trend data yet
              </div>
            )}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            letterSpacing: "0.01em",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
