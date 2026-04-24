import type { EnterpriseChartVariant } from "@/components/dashboard/KpiEnterpriseChart";

type KpiTriple = readonly [EnterpriseChartVariant, EnterpriseChartVariant, EnterpriseChartVariant];

export type KpiOverviewChartQuad = readonly [
  EnterpriseChartVariant,
  EnterpriseChartVariant,
  EnterpriseChartVariant,
  EnterpriseChartVariant,
];

/**
 * User-approved (Total leads, Contacted, Campaigns) triples — reference only.
 */
export const KPI_DASHBOARD_CHART_LIKED_TRIPLES = {
  /** Liked all three on this batch. */
  batch2_bubblePieScatter: ["miniBubble", "miniPie", "miniScatter"] as const satisfies KpiTriple,
} as const;

/** Single variants to reuse later (e.g. pin one card to this style). */
export const KPI_DASHBOARD_CHART_FAVORITE_VARIANTS = {
  /** User asked to remember bar + line combo. */
  comboBarLine: "miniComboBarLine",
} as const satisfies Record<string, EnterpriseChartVariant>;

/**
 * Default order for overview KPI cards (workspaces list, campaigns stats, leads):
 * area → bubble → candlestick → combo bar+line (matches dashboard’s first three chart types + fourth).
 */
export const KPI_OVERVIEW_CARD_CHART_VARIANTS = [
  "areaTrend",
  "miniBubble",
  "miniCandlestick",
  "miniComboBarLine",
] as const satisfies KpiOverviewChartQuad;

/** First dashboard KPI (active workspace) — combo bar+line from the gallery; avoids the three used on leads/contacted/campaigns. */
export const KPI_DASHBOARD_WORKSPACE_CHART_VARIANT: EnterpriseChartVariant = KPI_OVERVIEW_CARD_CHART_VARIANTS[3]!;

export function getPremiumKpiOverviewChartVariant(cardIndex: number): EnterpriseChartVariant {
  const list = KPI_OVERVIEW_CARD_CHART_VARIANTS;
  const i = ((cardIndex % list.length) + list.length) % list.length;
  return list[i]!;
}

/**
 * Each row maps (Total leads, Contacted leads, third KPI) mini-charts — dashboard’s fourth card is Open rate.
 * Bump `KPI_DASHBOARD_CHART_BATCH_INDEX` to try the next trio when iterating through chart styles.
 */
export const KPI_DASHBOARD_CHART_BATCHES: readonly KpiTriple[] = [
  // Batch 0 — taxonomy #1 Line, #2 Area, #3 Bar
  ["lineTrend", "areaTrend", "dailyBars"],
  // Batch 1 — taxonomy #4 Stacked bar, #5 Histogram, #6 Scatter
  ["stackedBarShare", "histogramBars", "miniScatter"],
  // Batch 2 — #7 Bubble, #8 Pie; campaigns stay #6 Scatter (preferred)
  ["miniBubble", "miniPie", "miniScatter"],
  // Batch 3 — skipped gauge / radar / parallel; #19 Sankey-style, #20 graph/chord-like, #22 combo
  ["miniSankeyChain", "miniGraphRing", "miniComboBarLine"],
  // Batch 4 — #9 Treemap, dashed line, polar bars
  ["miniTreemapDays", "miniDashedTrend", "miniPolarBars"],
] as const;

/** For trying other rows locally (experimental batches). */
export const KPI_DASHBOARD_CHART_BATCH_INDEX = 2;
