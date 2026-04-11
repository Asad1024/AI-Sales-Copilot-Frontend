"use client";
import { useMemo, useEffect, useState } from "react";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";

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
  const { pagination, fetchLeads } = useLeadStore();
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

  useEffect(() => {
    if (activeBaseId && pagination.totalLeads === 0) {
      fetchLeads(activeBaseId, 1, 50);
    }
  }, [activeBaseId, fetchLeads, pagination.totalLeads]);

  if (activeBaseId == null) return null;

  if (loading) return null;

  const b = baseline;
  const trendTotal = b ? trendFromBaseline(b.total, stats.total) : { show: false, trendPositive: true, trendValue: "0" };
  const trendRunning = b ? trendFromBaseline(b.running, stats.running) : { show: false, trendPositive: true, trendValue: "0" };
  const trendLeads = b ? trendFromBaseline(b.totalLeads, stats.totalLeads) : { show: false, trendPositive: true, trendValue: "0" };
  const trendSent = b ? trendFromBaseline(b.totalSent, stats.totalSent) : { show: false, trendPositive: true, trendValue: "0" };
  const trendOpen = b ? trendFromBaseline(b.avgOpen, stats.avgOpenNum) : { show: false, trendPositive: true, trendValue: "0" };
  const trendReply = b ? trendFromBaseline(b.avgReply, stats.avgReplyNum) : { show: false, trendPositive: true, trendValue: "0" };

  const items: Array<{
    title: string;
    value: string;
    showTrend: boolean;
    trendPositive: boolean;
    trendValue: string;
    trendSuffix: "%";
    subline?: string | null;
  }> = [
    {
      title: "Total campaigns",
      value: String(stats.total),
      showTrend: trendTotal.show,
      trendPositive: trendTotal.trendPositive,
      trendValue: trendTotal.trendValue,
      trendSuffix: "%",
    },
    {
      title: "Running",
      value: String(stats.running),
      showTrend: trendRunning.show,
      trendPositive: trendRunning.trendPositive,
      trendValue: trendRunning.trendValue,
      trendSuffix: "%",
    },
    {
      title: "Avg open",
      value: `${stats.avgOpenRate}%`,
      showTrend: trendOpen.show,
      trendPositive: trendOpen.trendPositive,
      trendValue: trendOpen.trendValue,
      trendSuffix: "%",
    },
    {
      title: "Avg reply",
      value: `${stats.avgReplyRate}%`,
      showTrend: trendReply.show,
      trendPositive: trendReply.trendPositive,
      trendValue: trendReply.trendValue,
      trendSuffix: "%",
    },
    {
      title: "Workspace leads",
      value: stats.totalLeads.toLocaleString(),
      showTrend: trendLeads.show,
      trendPositive: trendLeads.trendPositive,
      trendValue: trendLeads.trendValue,
      trendSuffix: "%",
    },
    {
      title: "Total sent",
      value: stats.totalSent.toLocaleString(),
      showTrend: trendSent.show,
      trendPositive: trendSent.trendPositive,
      trendValue: trendSent.trendValue,
      trendSuffix: "%",
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
            {card.showTrend && (
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#F3F4F6",
                    color: card.trendPositive ? "#059669" : "#DC2626",
                  }}
                >
                  {card.trendPositive ? "↑" : "↓"}
                  {card.trendValue}
                  %
                  <span style={{ fontWeight: 500, color: "#6B7280" }}>vs last month</span>
                </span>
              </div>
            )}
            {card.subline ? <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, lineHeight: 1.35 }}>{card.subline}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
