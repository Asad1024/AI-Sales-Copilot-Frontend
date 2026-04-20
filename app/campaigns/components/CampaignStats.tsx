"use client";
import { useMemo, useEffect, useState } from "react";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { Area, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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

type SparklineChartProps = {
  points: number[];
  positive: boolean;
};

function SparklineChart({ points, positive }: SparklineChartProps) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const isFlat = points.every((p) => Math.abs(p - points[0]) < 0.001);
  const ticketShapeTemplate = [0.22, 0.10, 0.46, 0.46, 0.66, 0.22, 0.50, 0.18, 0.48, 0.28, 0.42];
  const shapedPoints = isFlat
    ? ticketShapeTemplate.map(() => points[0])
    : ticketShapeTemplate.map((ratio) => min + ratio * span);
  const data = shapedPoints.map((value, index) => ({ index, value }));
  const lineColor = "#2563EB";
  const areaGradientId = `campaigns-sparkline-area-${positive ? "positive" : "negative"}`;

  return (
    <div
      style={{
        width: "100%",
        height: 54,
        borderRadius: 8,
        background: isFlat
          ? "transparent"
          : "linear-gradient(180deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.03) 100%)",
        padding: "2px 0",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 3, right: 1, left: 1, bottom: 1 }}>
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis hide domain={[(dataMin: number) => dataMin - 0.05 * span, (dataMax: number) => dataMax + 0.02 * span]} />
          {!isFlat ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#${areaGradientId})`}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            type={isFlat ? "linear" : "monotone"}
            dataKey="value"
            stroke={lineColor}
            strokeOpacity={0.92}
            strokeWidth={1.9}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
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

  const items: Array<{
    title: string;
    value: string;
    showTrend: boolean;
    trendPositive: boolean;
    trendValue: string;
    trendSuffix: "%";
    subline?: string | null;
    sparkline: number[];
  }> = [
    {
      title: "Total campaigns",
      value: String(stats.total),
      showTrend: trendTotal.show,
      trendPositive: trendTotal.trendPositive,
      trendValue: trendTotal.trendValue,
      trendSuffix: "%",
      sparkline: stats.total > 0 ? [19, 20, 24, 22, 27, 21, 29, 25] : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Running",
      value: String(stats.running),
      showTrend: trendRunning.show,
      trendPositive: trendRunning.trendPositive,
      trendValue: trendRunning.trendValue,
      trendSuffix: "%",
      sparkline: stats.running > 0 ? [8, 9, 12, 10, 14, 9, 13, 11] : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Avg open",
      value: `${stats.avgOpenRate}%`,
      showTrend: trendOpen.show,
      trendPositive: trendOpen.trendPositive,
      trendValue: trendOpen.trendValue,
      trendSuffix: "%",
      sparkline: stats.avgOpenNum > 0 ? [10, 11, 8, 12, 9, 11, 8, 10] : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Avg reply",
      value: `${stats.avgReplyRate}%`,
      showTrend: trendReply.show,
      trendPositive: trendReply.trendPositive,
      trendValue: trendReply.trendValue,
      trendSuffix: "%",
      sparkline: stats.avgReplyNum > 0 ? [10, 11, 8, 12, 9, 11, 8, 10] : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Workspace leads",
      value: stats.totalLeads.toLocaleString(),
      showTrend: trendLeads.show,
      trendPositive: trendLeads.trendPositive,
      trendValue: trendLeads.trendValue,
      trendSuffix: "%",
      sparkline: stats.totalLeads > 0 ? [19, 20, 24, 22, 27, 21, 29, 25] : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Total sent",
      value: stats.totalSent.toLocaleString(),
      showTrend: trendSent.show,
      trendPositive: trendSent.trendPositive,
      trendValue: trendSent.trendValue,
      trendSuffix: "%",
      sparkline: stats.totalSent > 0 ? [19, 20, 24, 22, 27, 21, 29, 25] : [0, 0, 0, 0, 0, 0, 0, 0],
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
              <SparklineChart points={card.sparkline} positive={card.trendPositive} />
            </div>
            <div style={{ marginTop: 2, minHeight: 2 }} />
          </div>
        );
      })}
    </div>
  );
}
