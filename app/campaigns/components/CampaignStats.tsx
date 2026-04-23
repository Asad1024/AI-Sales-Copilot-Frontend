"use client";

import { useBaseStore } from "@/stores/useBaseStore";
import { PremiumKpiCard, PREMIUM_KPI_GRID_STYLE } from "@/components/ui/PremiumKpiCard";
import { resolveKpiChartValues, type CampaignsStatsResponse } from "@/lib/kpiStatsApi";

const emptyCampaignsStats = (): CampaignsStatsResponse => ({
  totalCampaigns: { current: 0, snapshots: [] },
  avgOpenRate: { current: 0, snapshots: [] },
  workspaceLeads: { current: 0, snapshots: [] },
  totalSent: { current: 0, snapshots: [] },
});
import { getPremiumKpiOverviewChartVariant } from "@/lib/kpiDashboardChartBatches";
import { useCampaignsStatsQuery } from "@/hooks/queries/campaignStatsQuery";
import { UiSkeleton } from "@/components/ui/AppSkeleton";
import { DataRefreshIndicator } from "@/components/ui/DataRefreshIndicator";

export function CampaignStats() {
  const { activeBaseId } = useBaseStore();
  const q = useCampaignsStatsQuery(activeBaseId);

  if (activeBaseId == null) return null;

  const showSkeleton = q.isPending && !q.data;
  const showRefreshing = q.isFetching && !q.isPending;

  if (showSkeleton) {
    return (
      <div style={{ width: "100%", minWidth: 0 }} aria-busy="true" aria-label="Loading campaign metrics">
        <div style={{ ...PREMIUM_KPI_GRID_STYLE, width: "100%", minWidth: 0 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-page-card" style={{ minHeight: 118, display: "flex", flexDirection: "column", gap: 8 }}>
              <UiSkeleton height={10} width="50%" />
              <UiSkeleton height={22} width="35%" />
              <UiSkeleton height={40} width="100%" style={{ marginTop: "auto" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = q.data ?? emptyCampaignsStats();

  const cards = [
    {
      title: "Total campaigns",
      display: String(Math.round(s.totalCampaigns.current)),
      series: s.totalCampaigns,
      current: s.totalCampaigns.current,
    },
    {
      title: "Avg open",
      display: `${s.avgOpenRate.current.toFixed(1)}%`,
      series: s.avgOpenRate,
      current: s.avgOpenRate.current,
    },
    {
      title: "Workspace leads",
      display: Math.round(s.workspaceLeads.current).toLocaleString(),
      series: s.workspaceLeads,
      current: s.workspaceLeads.current,
    },
    {
      title: "Total sent",
      display: Math.round(s.totalSent.current).toLocaleString(),
      series: s.totalSent,
      current: s.totalSent.current,
    },
  ];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {showRefreshing ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <DataRefreshIndicator show />
        </div>
      ) : null}
      <div style={{ ...PREMIUM_KPI_GRID_STYLE, width: "100%", minWidth: 0 }}>
        {cards.map((card, i) => {
          const normalizedValue = String(card.display).replace(/,/g, "").trim();
          const valueMuted =
            normalizedValue === "0" || normalizedValue === "0%" || normalizedValue === "0.0%";
          return (
            <PremiumKpiCard
              key={card.title}
              title={card.title}
              value={card.display}
              valueMuted={valueMuted}
              sparklineValues={resolveKpiChartValues(card.series.chartSeries, card.series.snapshots, card.current)}
              echartsVariant={getPremiumKpiOverviewChartVariant(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
