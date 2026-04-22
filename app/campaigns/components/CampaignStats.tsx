"use client";

import { useEffect, useState } from "react";
import { useBaseStore } from "@/stores/useBaseStore";
import { apiRequest } from "@/lib/apiClient";
import { PremiumKpiCard, PREMIUM_KPI_GRID_STYLE } from "@/components/ui/PremiumKpiCard";
import { resolveKpiChartValues, type CampaignsStatsResponse } from "@/lib/kpiStatsApi";
import { getPremiumKpiOverviewChartVariant } from "@/lib/kpiDashboardChartBatches";

const emptyCampaignsStats = (): CampaignsStatsResponse => ({
  totalCampaigns: { current: 0, snapshots: [] },
  avgOpenRate: { current: 0, snapshots: [] },
  workspaceLeads: { current: 0, snapshots: [] },
  totalSent: { current: 0, snapshots: [] },
});

export function CampaignStats() {
  const { activeBaseId } = useBaseStore();
  const [stats, setStats] = useState<CampaignsStatsResponse | null>(null);

  useEffect(() => {
    if (activeBaseId == null) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = (await apiRequest(`/campaigns/stats?base_id=${activeBaseId}`)) as CampaignsStatsResponse;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      }
    };
    void load();
    const id = window.setInterval(load, 25000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeBaseId]);

  if (activeBaseId == null) return null;

  const s = stats ?? emptyCampaignsStats();

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
  );
}
