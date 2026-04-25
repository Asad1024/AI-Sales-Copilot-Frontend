"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import BaseCard from "@/components/ui/BaseCard";
import { Icons } from "@/components/ui/Icons";

type TrendRow = {
  date: string;
  leads: number;
  conversions: number;
};

type CampaignRow = {
  id: number;
  name: string;
  channel?: string | null;
  status?: string | null;
  sent_count?: number;
  reply_count?: number;
  reply_rate?: number;
};

type TopLeadRow = {
  id: number;
  name: string;
  company?: string | null;
  score?: number | null;
  tier?: string | null;
};

type ChannelMetrics = {
  email?: { sent?: number; delivered?: number; deliveryRate?: number; replied?: number; replyRate?: number };
  whatsapp?: { sent?: number; replied?: number; replyRate?: number };
  linkedin?: { sent?: number; replied?: number; replyRate?: number };
  call?: {
    initiated?: number;
    answered?: number;
    completed?: number;
    answerRate?: number;
    completionRate?: number;
  };
};

type AnalyticsPayload = {
  totalLeads?: number;
  activeCampaigns?: number;
  hotLeads?: number;
  conversions?: number;
  conversionRate?: number;
  leadChange?: number;
  conversionChange?: number;
  replyRate?: number;
  replyChange?: number;
  funnel?: {
    totalLeads?: number;
    contacted?: number;
    replied?: number;
    converted?: number;
  };
  dailyTrends?: TrendRow[];
  topCampaigns?: CampaignRow[];
  topLeads?: TopLeadRow[];
  enrichmentRate?: number;
  phoneRate?: number;
  emailRate?: number;
  enrichedLeads?: number;
  leadsWithPhone?: number;
  leadsWithEmail?: number;
  channelMetrics?: ChannelMetrics;
  generated_at?: string;
};

type ChannelRow = {
  key: string;
  label: string;
  volume: number;
  outcome: number;
  rate: number;
  volumeLabel: string;
  outcomeLabel: string;
  rateLabel: string;
};

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
] as const;

const CHART_GRID = "rgba(148, 163, 184, 0.25)";
const CHART_TICK = "var(--color-text-muted)";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function formatWhole(v: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
}

function formatCompact(v: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function formatRate(v: number): string {
  return `${v.toFixed(1)}%`;
}

function formatDelta(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusTone(status: string | null | undefined): { bg: string; fg: string; bd: string } {
  const s = String(status || "").toLowerCase();
  if (s === "running" || s === "active") return { bg: "#dcfce7", fg: "#166534", bd: "#bbf7d0" };
  if (s === "completed") return { bg: "#e0f2fe", fg: "#075985", bd: "#bae6fd" };
  if (s === "draft") return { bg: "#fef3c7", fg: "#92400e", bd: "#fde68a" };
  if (s === "paused") return { bg: "#ede9fe", fg: "#5b21b6", bd: "#ddd6fe" };
  return { bg: "var(--color-surface-secondary)", fg: "var(--color-text-muted)", bd: "var(--color-border)" };
}

function AnalyticsTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "0 10px 24px rgba(15,23,42,0.16)",
        padding: "8px 10px",
      }}
    >
      {label ? (
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>{label}</div>
      ) : null}
      {payload.map((p, idx) => (
        <div key={`${p.name || idx}`} style={{ fontSize: 12, color: "var(--color-text)", lineHeight: 1.4 }}>
          <span style={{ color: p.color, fontWeight: 700 }}>{p.name}:</span>{" "}
          {typeof p.value === "number" ? p.value.toLocaleString() : String(p.value ?? "-")}
        </div>
      ))}
    </div>
  );
}

function KpiTile({
  title,
  value,
  subtitle,
  delta,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  delta?: string;
  accent: string;
}) {
  const tone =
    delta && delta.startsWith("+") ? "#15803d" : delta && delta.startsWith("-") ? "#dc2626" : "var(--color-text-muted)";

  return (
    <BaseCard
      style={{
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        background:
          "linear-gradient(165deg, rgba(255,255,255,0.98) 0%, rgba(var(--color-primary-rgb),0.05) 52%, rgba(241,245,249,0.65) 100%)",
        boxShadow: "var(--elev-shadow)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 0 6px ${accent}22`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 32, fontWeight: 800, lineHeight: 1.06, color: "var(--color-text)" }}>{value}</div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{subtitle}</div>
        {delta ? <div style={{ fontSize: 12, fontWeight: 700, color: tone, whiteSpace: "nowrap" }}>{delta}</div> : null}
      </div>
    </BaseCard>
  );
}

function SurfaceCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) {
  return (
    <BaseCard
      style={{
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--elev-shadow)",
        padding: 16,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{title}</h3>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>{subtitle}</div>
      {children}
    </BaseCard>
  );
}

function LoadingBlock() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <BaseCard
          key={k}
          style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-surface)", padding: 18 }}
        >
          <div className="loading-skeleton" style={{ height: 10, width: "45%", marginBottom: 12 }} />
          <div className="loading-skeleton" style={{ height: 30, width: "42%", marginBottom: 8 }} />
          <div className="loading-skeleton" style={{ height: 10, width: "72%" }} />
        </BaseCard>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { activeBaseId } = useBase();
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIODS)[number]["value"]>("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const loadAnalytics = async () => {
    if (!activeBaseId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const json = (await apiRequest(`/analytics?base_id=${activeBaseId}&period=${selectedPeriod}`)) as AnalyticsPayload;
      setData(json);
    } catch (e) {
      setData(null);
      setError((e as { message?: string })?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [activeBaseId, selectedPeriod]);

  const funnel = data?.funnel || {};
  const totalLeads = num(funnel.totalLeads ?? data?.totalLeads);
  const contacted = num(funnel.contacted);
  const replied = num(funnel.replied);
  const converted = num(funnel.converted ?? data?.conversions);
  const activeCampaigns = num(data?.activeCampaigns);
  const conversionRate = num(data?.conversionRate);
  const overallReplyRate = num(data?.replyRate);
  const enrichmentRate = num(data?.enrichmentRate);
  const phoneRate = num(data?.phoneRate);
  const emailRate = num(data?.emailRate);

  const trendData = useMemo(() => {
    const rows = Array.isArray(data?.dailyTrends) ? data.dailyTrends : [];
    const avgWindow = 4;

    return rows.map((row, idx) => {
      const leads = num(row.leads);
      const conversions = num(row.conversions);
      const sliceStart = Math.max(0, idx - avgWindow + 1);
      const rolling = rows.slice(sliceStart, idx + 1).reduce((sum, r) => sum + num(r.leads), 0) / (idx - sliceStart + 1);
      const convRateDay = leads > 0 ? (conversions / leads) * 100 : 0;

      return {
        label: dateLabel(row.date),
        leads,
        conversions,
        rollingLeads: Number.isFinite(rolling) ? Number(rolling.toFixed(2)) : 0,
        conversionRate: Number(convRateDay.toFixed(2)),
      };
    });
  }, [data?.dailyTrends]);

  const hasLeadMomentumSignal = useMemo(
    () => trendData.some((row) => row.leads > 0 || row.rollingLeads > 0 || row.conversions > 0),
    [trendData]
  );

  const leadInventorySnapshot = useMemo(
    () => [
      { metric: "Total Leads", value: totalLeads, color: "#E69A61" },
      { metric: "Enriched", value: num(data?.enrichedLeads), color: "#0EA5E9" },
      { metric: "With Email", value: num(data?.leadsWithEmail), color: "#2563EB" },
      { metric: "With Phone", value: num(data?.leadsWithPhone), color: "#14B8A6" },
    ],
    [totalLeads, data?.enrichedLeads, data?.leadsWithEmail, data?.leadsWithPhone]
  );

  const hasLeadInventorySignal = useMemo(
    () => leadInventorySnapshot.some((row) => row.value > 0),
    [leadInventorySnapshot]
  );

  const funnelRows = useMemo(() => {
    const rows = [
      { stage: "Total", value: totalLeads, color: "#E69A61" },
      { stage: "Contacted", value: contacted, color: "#F59E0B" },
      { stage: "Replied", value: replied, color: "#14B8A6" },
      { stage: "Converted", value: converted, color: "#2563EB" },
    ];

    return rows.map((row, idx) => ({
      ...row,
      retention: idx === 0 ? 100 : pct(row.value, Math.max(rows[idx - 1]?.value || 1, 1)),
      fromTop: pct(row.value, Math.max(totalLeads, 1)),
    }));
  }, [totalLeads, contacted, replied, converted]);

  const channelRows = useMemo<ChannelRow[]>(() => {
    const cm = data?.channelMetrics;

    return [
      {
        key: "email",
        label: "Email",
        volume: num(cm?.email?.sent),
        outcome: num(cm?.email?.delivered),
        rate: num(cm?.email?.replyRate),
        volumeLabel: "Sent",
        outcomeLabel: "Delivered",
        rateLabel: "Reply rate",
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        volume: num(cm?.whatsapp?.sent),
        outcome: num(cm?.whatsapp?.replied),
        rate: num(cm?.whatsapp?.replyRate),
        volumeLabel: "Sent",
        outcomeLabel: "Replied",
        rateLabel: "Reply rate",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        volume: num(cm?.linkedin?.sent),
        outcome: num(cm?.linkedin?.replied),
        rate: num(cm?.linkedin?.replyRate),
        volumeLabel: "Sent",
        outcomeLabel: "Replied",
        rateLabel: "Reply rate",
      },
      {
        key: "call",
        label: "Calls",
        volume: num(cm?.call?.initiated),
        outcome: num(cm?.call?.answered),
        rate: num(cm?.call?.answerRate),
        volumeLabel: "Initiated",
        outcomeLabel: "Answered",
        rateLabel: "Answer rate",
      },
    ];
  }, [data?.channelMetrics]);

  const channelChartData = useMemo(
    () =>
      channelRows.map((row) => ({
        channel: row.label,
        volume: row.volume,
        outcome: row.outcome,
        rate: Number(row.rate.toFixed(1)),
      })),
    [channelRows]
  );

  const topCampaigns = useMemo(() => {
    const rows = Array.isArray(data?.topCampaigns) ? [...data.topCampaigns] : [];
    return rows
      .sort((a, b) => num(b.sent_count) - num(a.sent_count))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        name: c.name || `Campaign ${c.id}`,
        status: c.status,
        sent: num(c.sent_count),
        replies: num(c.reply_count),
        rate: num(c.reply_rate),
      }));
  }, [data?.topCampaigns]);

  const topSentMax = useMemo(() => Math.max(1, ...topCampaigns.map((c) => c.sent)), [topCampaigns]);

  const topLeads = useMemo(() => {
    const rows = Array.isArray(data?.topLeads) ? [...data.topLeads] : [];
    return rows.slice(0, 6).map((lead) => ({
      id: lead.id,
      name: lead.name || `Lead ${lead.id}`,
      company: lead.company || "No company",
      tier: lead.tier || "-",
      score: num(lead.score),
    }));
  }, [data?.topLeads]);

  const readinessRadar = useMemo(
    () => [
      { metric: "Enrichment", value: Number(enrichmentRate.toFixed(1)) },
      { metric: "Email", value: Number(emailRate.toFixed(1)) },
      { metric: "Phone", value: Number(phoneRate.toFixed(1)) },
      { metric: "Contacted", value: Number(pct(contacted, Math.max(totalLeads, 1)).toFixed(1)) },
      { metric: "Converted", value: Number(conversionRate.toFixed(1)) },
    ],
    [enrichmentRate, emailRate, phoneRate, contacted, totalLeads, conversionRate]
  );

  const insights = useMemo(() => {
    const result: string[] = [];
    const contactRate = pct(contacted, Math.max(totalLeads, 1));
    const replyFromContact = pct(replied, Math.max(contacted, 1));
    const convertFromReply = pct(converted, Math.max(replied, 1));

    if (totalLeads > 0) {
      result.push(`${contactRate.toFixed(1)}% of your leads were contacted in the selected window.`);
    }
    if (contacted > 0) {
      result.push(`${replyFromContact.toFixed(1)}% of contacted leads replied.`);
    }
    if (replied > 0) {
      result.push(`${convertFromReply.toFixed(1)}% of replies moved to conversion.`);
    }
    if (enrichmentRate < 60) {
      result.push("Data readiness is below 60%. Increase enrichment to improve personalization quality.");
    }
    if (activeCampaigns === 0 && totalLeads > 0) {
      result.push("No active campaigns detected. Launch at least one campaign to unlock better trend signals.");
    }

    if (!result.length) {
      result.push("Performance is steady. Keep the same sending cadence and monitor channel response rates.");
    }

    return result.slice(0, 4);
  }, [activeCampaigns, contacted, replied, converted, totalLeads, enrichmentRate]);

  return (
    <div className="dashboard-shell" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BaseCard
        style={{
          borderRadius: 14,
          border: "1px solid rgba(var(--color-primary-rgb),0.24)",
          background:
            "radial-gradient(circle at top right, rgba(var(--color-primary-rgb),0.24), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
          boxShadow: "var(--elev-shadow)",
          padding: "16px 18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text)" }}>
              Analytics Intelligence
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              Advanced pipeline, channel, and conversion analytics for your active workspace.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                padding: 4,
                borderRadius: 999,
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                gap: 4,
              }}
            >
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPeriod(p.value)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 999,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: selectedPeriod === p.value ? "var(--color-primary)" : "transparent",
                    color: selectedPeriod === p.value ? "#fff" : "var(--color-text)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void loadAnalytics()}
              className="btn-ghost"
              disabled={loading || !activeBaseId}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icons.RefreshCw
                size={15}
                style={{
                  color: "var(--color-text-muted)",
                  animation: loading ? "spin 1s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
          </div>
        </div>
      </BaseCard>

      {!activeBaseId ? (
        <BaseCard
          style={{
            borderRadius: 14,
            border: "1px dashed var(--color-border)",
            background: "var(--color-surface)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <Icons.Folder size={30} style={{ color: "var(--color-text-muted)", opacity: 0.65 }} />
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Select a workspace to view analytics</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>Analytics are calculated per workspace.</div>
        </BaseCard>
      ) : null}

      {error ? (
        <BaseCard
          style={{
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 16,
            color: "#991b1b",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Unable to load analytics</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>{error}</div>
        </BaseCard>
      ) : null}

      {loading ? <LoadingBlock /> : null}

      {!loading && data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <KpiTile
              title="Total Leads"
              value={formatCompact(totalLeads)}
              subtitle={`${formatWhole(totalLeads)} leads in workspace`}
              delta={formatDelta(num(data.leadChange))}
              accent="#E77B3E"
            />
            <KpiTile
              title="Contacted"
              value={formatWhole(contacted)}
              subtitle={`${formatRate(pct(contacted, Math.max(totalLeads, 1)))} of total`}
              accent="#F59E0B"
            />
            <KpiTile
              title="Reply Rate"
              value={formatRate(overallReplyRate)}
              subtitle={`${formatWhole(replied)} replies captured`}
              delta={formatDelta(num(data.replyChange))}
              accent="#14B8A6"
            />
            <KpiTile
              title="Conversions"
              value={formatWhole(converted)}
              subtitle={`${formatRate(conversionRate)} conversion rate`}
              delta={formatDelta(num(data.conversionChange))}
              accent="#2563EB"
            />
            <KpiTile
              title="Active Campaigns"
              value={formatWhole(activeCampaigns)}
              subtitle="Running campaigns now"
              accent="#8B5CF6"
            />
            <KpiTile
              title="Enrichment"
              value={formatRate(enrichmentRate)}
              subtitle={`${formatWhole(num(data.enrichedLeads))} enriched leads`}
              accent="#0EA5E9"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            <SurfaceCard
              title="Lead Momentum"
              subtitle="Daily lead volume and rolling average"
              icon={<Icons.TrendingUp size={16} style={{ color: "var(--color-primary)" }} />}
            >
              {trendData.length > 0 && hasLeadMomentumSignal ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trendData} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reports-lead-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E69A61" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#E69A61" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#E69A61" fill="url(#reports-lead-area)" strokeWidth={2.2} />
                    <Line type="monotone" dataKey="rollingLeads" name="Rolling avg" stroke="#1E293B" strokeWidth={1.8} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : hasLeadInventorySignal ? (
                <>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={leadInventorySnapshot} layout="vertical" margin={{ top: 6, right: 8, left: 2, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="metric"
                        tick={{ fontSize: 11, fill: CHART_TICK }}
                        axisLine={false}
                        tickLine={false}
                        width={76}
                      />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="value" name="Leads" radius={[0, 8, 8, 0]}>
                        {leadInventorySnapshot.map((row) => (
                          <Cell key={row.metric} fill={row.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                    No new leads in this selected period. Showing current lead inventory instead.
                  </div>
                </>
              ) : (
                <div
                  style={{
                    height: 260,
                    borderRadius: 12,
                    border: "1px dashed var(--color-border)",
                    background: "var(--color-surface-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  No lead data available yet
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard
              title="Pipeline Progression"
              subtitle="Stage volume with retention from previous stage"
              icon={<Icons.Target size={16} style={{ color: "#F59E0B" }} />}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 12, alignItems: "stretch" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnelRows} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} width={34} allowDecimals={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {funnelRows.map((row) => (
                        <Cell key={row.stage} fill={row.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                  {funnelRows.map((row) => (
                    <div
                      key={row.stage}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        background: "var(--color-surface-secondary)",
                        padding: "8px 10px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {row.stage}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{formatWhole(row.value)}</div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-muted)" }}>
                        {row.stage === "Total" ? "Base stage" : `${row.retention.toFixed(1)}% from previous`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            <SurfaceCard
              title="Channel Performance"
              subtitle="Volume, outcomes, and efficiency by channel"
              icon={<Icons.Radio size={16} style={{ color: "#0EA5E9" }} />}
            >
              <ResponsiveContainer width="100%" height={258}>
                <ComposedChart data={channelChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="channel" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} width={34} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} width={36} unit="%" />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="volume" name="Volume" fill="#93C5FD" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="left" dataKey="outcome" name="Outcome" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" name="Rate" stroke="#1E293B" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {channelRows.map((row) => (
                  <div
                    key={row.key}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      background: "var(--color-surface-secondary)",
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>{row.label}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-muted)" }}>
                      {row.volumeLabel}: {formatWhole(row.volume)} | {row.outcomeLabel}: {formatWhole(row.outcome)}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>
                      {row.rateLabel}: {formatRate(row.rate)}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Campaign Leaderboard"
              subtitle="Top campaigns ranked by send volume"
              icon={<Icons.Rocket size={16} style={{ color: "var(--color-primary)" }} />}
            >
              {topCampaigns.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topCampaigns.map((c, idx) => {
                    const status = getStatusTone(c.status);
                    const width = Math.max(8, Math.round((c.sent / topSentMax) * 100));
                    return (
                      <div
                        key={`${c.id}-${idx}`}
                        style={{
                          borderRadius: 10,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-secondary)",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--color-text)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {idx + 1}. {c.name}
                            </div>
                          </div>
                          <span
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${status.bd}`,
                              background: status.bg,
                              color: status.fg,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {String(c.status || "unknown")}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(var(--color-primary-rgb),0.14)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${width}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: "linear-gradient(90deg, rgba(var(--color-primary-rgb),0.64), var(--color-primary))",
                            }}
                          />
                        </div>
                        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 11 }}>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Sent</div>
                            <div style={{ marginTop: 1, fontWeight: 700, color: "var(--color-text)" }}>{formatWhole(c.sent)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Replies</div>
                            <div style={{ marginTop: 1, fontWeight: 700, color: "var(--color-text)" }}>{formatWhole(c.replies)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Rate</div>
                            <div style={{ marginTop: 1, fontWeight: 700, color: "var(--color-text)" }}>{formatRate(c.rate)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No campaign analytics yet.</div>
              )}
            </SurfaceCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
            <SurfaceCard
              title="Data Readiness Profile"
              subtitle="Coverage and conversion health on a 0-100 scale"
              icon={<Icons.CheckCircle size={16} style={{ color: "#10B981" }} />}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "stretch" }}>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={readinessRadar} outerRadius={90}>
                    <PolarGrid stroke="rgba(148,163,184,0.28)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                    <Radar dataKey="value" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.35} strokeWidth={2} />
                    <Tooltip content={<AnalyticsTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                  {readinessRadar.map((row) => (
                    <div
                      key={row.metric}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        background: "var(--color-surface-secondary)",
                        padding: "8px 10px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {row.metric}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{formatRate(row.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              title="Top Lead Quality"
              subtitle="Highest scored leads available right now"
              icon={<Icons.Star size={16} style={{ color: "#EAB308" }} />}
            >
              {topLeads.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topLeads.map((lead, idx) => {
                    const score = lead.score;
                    const chipColor = score >= 80 ? "#16A34A" : score >= 60 ? "#F59E0B" : "#EF4444";
                    return (
                      <div
                        key={`${lead.id}-${idx}`}
                        style={{
                          borderRadius: 10,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-secondary)",
                          padding: "10px 12px",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {lead.name}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {lead.company} - {lead.tier}
                          </div>
                        </div>
                        <span
                          style={{
                            borderRadius: 999,
                            border: `1px solid ${chipColor}66`,
                            background: `${chipColor}1A`,
                            color: chipColor,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No scored leads available yet.</div>
              )}
            </SurfaceCard>
          </div>

          <BaseCard
            style={{
              borderRadius: 14,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              boxShadow: "var(--elev-shadow)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icons.Lightbulb size={16} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Actionable Insights</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {insights.map((text, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-secondary)",
                    padding: "10px 12px",
                    fontSize: 12.5,
                    color: "var(--color-text)",
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--color-text-muted)" }}>
              Last refreshed: {data.generated_at ? new Date(data.generated_at).toLocaleString() : "just now"}
            </div>
          </BaseCard>
        </>
      ) : null}
    </div>
  );
}
