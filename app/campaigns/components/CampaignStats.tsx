"use client";
import { useMemo, useEffect, useState } from "react";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { PremiumKpiSparkline } from "@/components/ui/PremiumKpiSparkline";

const SLATE_400 = "#94A3B8";

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 500 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#9CA3AF",
};

function isMutedMetricValue(value: string): boolean {
  const t = value.trim();
  if (t === "—" || t === "") return false;
  if (t === "0" || t === "0%") return true;
  if (/^0\.0+%$/.test(t)) return true;
  const normalized = t.replace(/,/g, "");
  if (normalized === "0%") return true;
  const n = parseFloat(normalized.replace("%", ""));
  if (!Number.isNaN(n) && n === 0) return true;
  return false;
}

type BaselineSnap = {
  total: number;
  running: number;
  totalLeads: number;
  totalSent: number;
  avgOpen: number;
  avgReply: number;
};

function baselineKey(baseId: number | null) {
  return baseId != null ? `sparkai:campaigns-stat-baseline:${baseId}` : "";
}

function trendFromBaseline(prev: number, curr: number): { show: boolean; trendPositive: boolean; trendValue: string } {
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return { show: false, trendPositive: true, trendValue: "0" };
  if (prev === 0 && curr === 0) return { show: false, trendPositive: true, trendValue: "0" };
  if (prev === 0 && curr > 0) return { show: true, trendPositive: true, trendValue: "100.0" };
  const raw = ((curr - prev) / prev) * 100;
  return { show: true, trendPositive: raw >= 0, trendValue: Math.abs(raw).toFixed(1) };
}

export function CampaignStats() {
  const { campaigns, loading } = useCampaignStore();
  const { pagination } = useLeadStore();
  const { activeBaseId } = useBaseStore();
  const [baseline, setBaseline] = useState<BaselineSnap | null>(null);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const running = campaigns.filter((c) => c.status === "running").length;
    const totalLeads = pagination.totalLeads;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
    const totalReplied = campaigns.reduce((sum, c) => sum + (c.replied || 0), 0);
    const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
    const avgReplyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";
    return {
      total,
      running,
      totalLeads,
      totalSent,
      avgOpenRate,
      avgReplyRate,
      avgOpenNum: parseFloat(avgOpenRate),
      avgReplyNum: parseFloat(avgReplyRate),
    };
  }, [campaigns, pagination.totalLeads]);

  useEffect(() => {
    if (activeBaseId == null) {
      setBaseline(null);
      return;
    }
    const key = baselineKey(activeBaseId);
    try {
      const raw = localStorage.getItem(key);
      setBaseline(raw ? (JSON.parse(raw) as BaselineSnap) : null);
    } catch {
      setBaseline(null);
    }
  }, [activeBaseId]);

  useEffect(() => {
    if (activeBaseId == null || loading || campaigns.length === 0) return;
    const key = baselineKey(activeBaseId);
    const snap: BaselineSnap = {
      total: stats.total,
      running: stats.running,
      totalLeads: stats.totalLeads,
      totalSent: stats.totalSent,
      avgOpen: stats.avgOpenNum,
      avgReply: stats.avgReplyNum,
    };
    return () => {
      try {
        localStorage.setItem(key, JSON.stringify(snap));
      } catch {
        /* ignore */
      }
    };
  }, [
    activeBaseId,
    loading,
    campaigns.length,
    stats.total,
    stats.running,
    stats.totalLeads,
    stats.totalSent,
    stats.avgOpenNum,
    stats.avgReplyNum,
  ]);

  if (activeBaseId == null) return null;

  if (loading) return null;

  const b = baseline;
  const trendTotal = b ? trendFromBaseline(b.total, stats.total) : { show: false, trendPositive: true, trendValue: "0" };
  const trendRunning = b ? trendFromBaseline(b.running, stats.running) : { show: false, trendPositive: true, trendValue: "0" };
  const trendLeads = b ? trendFromBaseline(b.totalLeads, stats.totalLeads) : { show: false, trendPositive: true, trendValue: "0" };
  const trendSent = b ? trendFromBaseline(b.totalSent, stats.totalSent) : { show: false, trendPositive: true, trendValue: "0" };
  const trendOpen = b ? trendFromBaseline(b.avgOpen, stats.avgOpenNum) : { show: false, trendPositive: true, trendValue: "0" };
  const trendReply = b ? trendFromBaseline(b.avgReply, stats.avgReplyNum) : { show: false, trendPositive: true, trendValue: "0" };

  const buildSeries = (values: number[], fallback: number): number[] => {
    const cleaned = values.filter((n) => Number.isFinite(n) && n >= 0);
    if (cleaned.length >= 2) return cleaned.slice(-12);
    if (cleaned.length === 1) return [Math.max(0, Math.round(cleaned[0] * 0.8)), cleaned[0]];
    return [0, fallback];
  };

  const campaignsByTime = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const at = new Date(a.updated_at || a.created_at || 0).getTime();
      const bt = new Date(b.updated_at || b.created_at || 0).getTime();
      return at - bt;
    });
  }, [campaigns]);

  const sparklineSeries = useMemo(() => {
    const statusCounts = {
      running: campaignsByTime.filter((c) => c.status === "running").length,
      draft: campaignsByTime.filter((c) => c.status === "draft").length,
      paused: campaignsByTime.filter((c) => c.status === "paused").length,
      completed: campaignsByTime.filter((c) => c.status === "completed").length,
    };
    const totalCampaignsSeries = buildSeries(
      [statusCounts.running, statusCounts.draft, statusCounts.paused, statusCounts.completed, stats.total],
      stats.total
    );
    const runningCampaignsSeries = buildSeries(
      campaignsByTime.map((_, idx) => campaignsByTime.slice(0, idx + 1).filter((c) => c.status === "running").length),
      stats.running
    );
    const openRateSeries = buildSeries(
      campaignsByTime.map((c) => {
        const sent = Number(c.sent || 0);
        const opened = Number(c.opened || 0);
        return sent > 0 ? (opened / sent) * 100 : 0;
      }),
      stats.avgOpenNum
    );
    const replyRateSeries = buildSeries(
      campaignsByTime.map((c) => {
        const sent = Number(c.sent || 0);
        const replied = Number(c.replied || 0);
        return sent > 0 ? (replied / sent) * 100 : 0;
      }),
      stats.avgReplyNum
    );
    const leadsSeries = buildSeries(
      campaignsByTime.map((c) => Number(c.leads || 0)),
      stats.totalLeads
    );
    const sentSeries = buildSeries(
      campaignsByTime.map((c) => Number(c.sent || 0)),
      stats.totalSent
    );
    return {
      totalCampaignsSeries,
      runningCampaignsSeries,
      openRateSeries,
      replyRateSeries,
      leadsSeries,
      sentSeries,
    };
  }, [campaignsByTime, stats.total, stats.running, stats.avgOpenNum, stats.avgReplyNum, stats.totalLeads, stats.totalSent]);

  const items: Array<{
    title: string;
    value: string;
    showTrend: boolean;
    trendPositive: boolean;
    trendValue: string;
    trendSuffix: "%";
    subline?: string | null;
    sparkline: number[];
    chartType: "step" | "bars" | "areaPulse" | "radial";
  }> = [
    {
      title: "Total campaigns",
      value: String(stats.total),
      showTrend: trendTotal.show,
      trendPositive: trendTotal.trendPositive,
      trendValue: trendTotal.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.totalCampaignsSeries,
      chartType: "step",
    },
    {
      title: "Running",
      value: String(stats.running),
      showTrend: trendRunning.show,
      trendPositive: trendRunning.trendPositive,
      trendValue: trendRunning.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.runningCampaignsSeries,
      chartType: "bars",
    },
    {
      title: "Avg open",
      value: `${stats.avgOpenRate}%`,
      showTrend: trendOpen.show,
      trendPositive: trendOpen.trendPositive,
      trendValue: trendOpen.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.openRateSeries,
      chartType: "radial",
    },
    {
      title: "Avg reply",
      value: `${stats.avgReplyRate}%`,
      showTrend: trendReply.show,
      trendPositive: trendReply.trendPositive,
      trendValue: trendReply.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.replyRateSeries,
      chartType: "areaPulse",
    },
    {
      title: "Workspace leads",
      value: stats.totalLeads.toLocaleString(),
      showTrend: trendLeads.show,
      trendPositive: trendLeads.trendPositive,
      trendValue: trendLeads.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.leadsSeries,
      chartType: "bars",
    },
    {
      title: "Total sent",
      value: stats.totalSent.toLocaleString(),
      showTrend: trendSent.show,
      trendPositive: trendSent.trendPositive,
      trendValue: trendSent.trendValue,
      trendSuffix: "%",
      sparkline: sparklineSeries.sentSeries,
      chartType: "step",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gap: 12,
        width: "100%",
        minWidth: 0,
      }}
    >
      {items.map((card) => {
        const valueMuted = isMutedMetricValue(String(card.value));
        return (
          <div key={card.title} className="dashboard-stat-card" style={{ padding: "12px 14px 14px", minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ ...sectionLabelStyle, display: "block" }}>{card.title}</span>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: valueMuted ? 600 : 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                color: valueMuted ? SLATE_400 : "var(--color-text, #111827)",
                fontFamily: "Inter, -apple-system, sans-serif",
                wordBreak: "break-word",
              }}
            >
              {card.value}
            </div>
            <div style={{ marginTop: 8 }}>
              <PremiumKpiSparkline points={card.sparkline} positive={card.trendPositive} chartType={card.chartType} height={76} />
            </div>
            <div style={{ marginTop: 2, minHeight: 2 }} />
          </div>
        );
      })}
    </div>
  );
}
