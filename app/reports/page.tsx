"use client";

import { useEffect, useMemo, useState } from "react";
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
  email?: { sent?: number; replied?: number; replyRate?: number };
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

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function formatCompact(v: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function formatWhole(v: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
}

function formatDelta(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
] as const;

function KpiCard({
  title,
  value,
  hint,
  accent,
  delta,
}: {
  title: string;
  value: string;
  hint: string;
  accent: string;
  delta?: string;
}) {
  return (
    <BaseCard
      style={{
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(var(--color-primary-rgb),0.06) 100%)",
        boxShadow: "var(--elev-shadow)",
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          padding: "4px 10px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent,
          border: `1px solid ${accent}33`,
          background: `${accent}14`,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 10, fontSize: 34, fontWeight: 800, lineHeight: 1, color: "var(--color-text)" }}>
        {value}
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{hint}</span>
        {delta ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: delta.startsWith("+") ? "#15803d" : delta.startsWith("-") ? "#dc2626" : "var(--color-text-muted)",
            }}
          >
            {delta}
          </span>
        ) : null}
      </div>
    </BaseCard>
  );
}

function TrendChart({ trends }: { trends: TrendRow[] }) {
  if (!trends.length) {
    return <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No trend data available yet.</div>;
  }

  const values = trends.map((t) => num(t.leads));
  const max = Math.max(...values, 1);
  const min = 0;
  const w = 100;
  const h = 38;
  const topPad = 3;
  const bottomPad = 5;

  const points = trends.map((row, i) => {
    const x = (i / Math.max(trends.length - 1, 1)) * w;
    const y = topPad + (1 - (num(row.leads) - min) / Math.max(max - min, 1)) * (h - topPad - bottomPad);
    return { x, y, v: num(row.leads), date: row.date };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L ${w},${h - bottomPad} L 0,${h - bottomPad} Z`;
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;
  const peak = Math.max(...values);
  const startLabel = new Date(trends[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = new Date(trends[trends.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Total</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{formatWhole(total)}</div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Daily Avg</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{avg.toFixed(1)}</div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Peak Day</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{formatWhole(peak)}</div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(var(--color-primary-rgb),0.24)",
          background:
            "linear-gradient(180deg, rgba(var(--color-primary-rgb),0.12) 0%, rgba(var(--color-primary-rgb),0.03) 100%)",
          padding: "10px 12px",
        }}
      >
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 170, display: "block" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lead-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#lead-trend-fill)" />
          <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="1.4" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="0.85" fill="var(--color-primary)" />
          ))}
        </svg>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)" }}>
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      </div>
    </div>
  );
}

function FunnelView({
  total,
  contacted,
  qualified,
  converted,
}: {
  total: number;
  contacted: number;
  qualified: number;
  converted: number;
}) {
  const stages = [
    { label: "Total Leads", value: total, color: "var(--color-primary)" },
    { label: "Contacted", value: contacted, color: "#F29F67" },
    { label: "Qualified", value: qualified, color: "#10b981" },
    { label: "Converted", value: converted, color: "#0ea5e9" },
  ];

  const top = Math.max(total, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {stages.map((s, idx) => {
        const width = Math.max((s.value / top) * 100, s.value > 0 ? 18 : 6);
        const conversionFromPrev = idx > 0 ? pct(s.value, Math.max(stages[idx - 1].value, 1)) : 100;
        return (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "96px 1fr 64px", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{s.label}</div>
            <div style={{ height: 30, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${s.color} 0%, ${s.color}CC 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {formatWhole(s.value)}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: idx === 0 ? "var(--color-text-muted)" : "var(--color-text)" }}>
              {idx === 0 ? "base" : `${conversionFromPrev.toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoverageMeter({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(value, 100))}%`, height: "100%", background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)` }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{detail}</span>
    </div>
  );
}

function statusTone(status: string | null | undefined): { bg: string; fg: string; bd: string } {
  const s = String(status || "").toLowerCase();
  if (s === "running" || s === "active") return { bg: "#dcfce7", fg: "#166534", bd: "#bbf7d0" };
  if (s === "completed") return { bg: "#e0f2fe", fg: "#075985", bd: "#bae6fd" };
  if (s === "draft") return { bg: "#fef3c7", fg: "#92400e", bd: "#fde68a" };
  return { bg: "var(--color-surface-secondary)", fg: "var(--color-text-muted)", bd: "var(--color-border)" };
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
  const qualified = num(data?.hotLeads);
  const converted = num(funnel.converted ?? data?.conversions);
  const activeCampaigns = num(data?.activeCampaigns);
  const conversionRate = num(data?.conversionRate);

  const channelRows = useMemo(() => {
    const cm = data?.channelMetrics;
    return [
      {
        key: "email",
        label: "Email",
        icon: <Icons.Mail size={16} style={{ color: "var(--color-primary)" }} />,
        primary: num(cm?.email?.sent),
        secondaryLabel: "Replies",
        secondary: num(cm?.email?.replied),
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        icon: <Icons.WhatsApp size={16} style={{ color: "#22c55e" }} />,
        primary: num(cm?.whatsapp?.sent),
        secondaryLabel: "Replies",
        secondary: num(cm?.whatsapp?.replied),
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        icon: <Icons.Linkedin size={16} style={{ color: "#0a66c2" }} />,
        primary: num(cm?.linkedin?.sent),
        secondaryLabel: "Replies",
        secondary: num(cm?.linkedin?.replied),
      },
      {
        key: "call",
        label: "Calls",
        icon: <Icons.Phone size={16} style={{ color: "#0d9488" }} />,
        primary: num(cm?.call?.initiated),
        secondaryLabel: "Answered",
        secondary: num(cm?.call?.answered),
        tertiaryLabel: "Completed",
        tertiary: num(cm?.call?.completed),
      },
    ];
  }, [data?.channelMetrics]);

  const insights = useMemo(() => {
    const items: string[] = [];
    const contactRate = pct(contacted, Math.max(totalLeads, 1));
    const convertFromContact = pct(converted, Math.max(contacted, 1));
    if (totalLeads > 0) {
      items.push(`${contactRate.toFixed(1)}% of leads were contacted in this period.`);
    }
    if (contacted > 0) {
      items.push(`${convertFromContact.toFixed(1)}% of contacted leads reached conversion.`);
    }
    if (num(data?.enrichmentRate) < 50) {
      items.push("Data enrichment is under 50%; increasing enrichment will improve routing and personalization quality.");
    }
    if (activeCampaigns === 0 && totalLeads > 0) {
      items.push("No active campaigns detected. Launching at least one campaign will unlock engagement signals.");
    }
    if (!items.length) {
      items.push("Activity is stable. Keep campaign cadence consistent and monitor contacted-to-converted movement.");
    }
    return items.slice(0, 4);
  }, [activeCampaigns, contacted, converted, data?.enrichmentRate, totalLeads]);

  return (
    <div className="dashboard-shell" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <BaseCard
        style={{
          borderRadius: 14,
          border: "1px solid rgba(var(--color-primary-rgb),0.24)",
          background:
            "radial-gradient(circle at top right, rgba(var(--color-primary-rgb),0.22), transparent 60%), var(--color-surface)",
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
              Performance cockpit focused on reliable activity and conversion signals.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", padding: 4, borderRadius: 999, background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", gap: 4 }}>
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
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
            Analytics are calculated per workspace.
          </div>
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

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[1, 2, 3, 4].map((k) => (
            <BaseCard key={k} style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-surface)", padding: 18 }}>
              <div className="loading-skeleton" style={{ height: 12, width: "58%", marginBottom: 12 }} />
              <div className="loading-skeleton" style={{ height: 34, width: "45%", marginBottom: 10 }} />
              <div className="loading-skeleton" style={{ height: 10, width: "70%" }} />
            </BaseCard>
          ))}
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <KpiCard
              title="Total Leads"
              value={formatCompact(totalLeads)}
              hint={`${formatWhole(totalLeads)} leads in workspace`}
              accent="var(--color-primary)"
              delta={formatDelta(num(data.leadChange))}
            />
            <KpiCard
              title="Active Campaigns"
              value={formatWhole(activeCampaigns)}
              hint="Campaigns currently running"
              accent="#0ea5e9"
            />
            <KpiCard
              title="Leads Contacted"
              value={formatWhole(contacted)}
              hint={`${pct(contacted, Math.max(totalLeads, 1)).toFixed(1)}% of workspace leads`}
              accent="#F29F67"
            />
            <KpiCard
              title="Conversions"
              value={formatWhole(converted)}
              hint={`${conversionRate.toFixed(1)}% conversion rate`}
              accent="#10b981"
              delta={formatDelta(num(data.conversionChange))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icons.TrendingUp size={16} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Lead Velocity Trend</h3>
              </div>
              <TrendChart trends={Array.isArray(data.dailyTrends) ? data.dailyTrends : []} />
            </BaseCard>

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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icons.Target size={16} style={{ color: "#F29F67" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Pipeline Funnel</h3>
              </div>
              <FunnelView total={totalLeads} contacted={contacted} qualified={qualified} converted={converted} />
            </BaseCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icons.Radio size={16} style={{ color: "#0ea5e9" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Channel Activity</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                {channelRows.map((ch) => (
                  <div
                    key={ch.key}
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-secondary)",
                      padding: "12px 12px 10px",
                      minHeight: 110,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
                        {ch.icon}
                        {ch.label}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Activity</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{formatWhole(ch.primary)}</div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                      <span>{ch.secondaryLabel}: {formatWhole(ch.secondary)}</span>
                      {typeof ch.tertiary === "number" ? (
                        <span>
                          {ch.tertiaryLabel}: {formatWhole(ch.tertiary)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--color-text-muted)" }}>
                Reply metrics are shown when replies are tracked; call metrics show initiated, answered, and completed activity.
              </div>
            </BaseCard>

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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icons.CheckCircle size={16} style={{ color: "#10b981" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Data Readiness</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <CoverageMeter
                  label="Enrichment Coverage"
                  value={num(data.enrichmentRate)}
                  detail={`${formatWhole(num(data.enrichedLeads))} enriched of ${formatWhole(totalLeads)} leads`}
                  color="#F29F67"
                />
                <CoverageMeter
                  label="Email Availability"
                  value={num(data.emailRate)}
                  detail={`${formatWhole(num(data.leadsWithEmail))} leads with email`}
                  color="#2563eb"
                />
                <CoverageMeter
                  label="Phone Availability"
                  value={num(data.phoneRate)}
                  detail={`${formatWhole(num(data.leadsWithPhone))} leads with phone`}
                  color="#0ea5e9"
                />
              </div>
            </BaseCard>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icons.Rocket size={16} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Campaign Ranking</h3>
              </div>
              {Array.isArray(data.topCampaigns) && data.topCampaigns.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.topCampaigns.slice(0, 5).map((c, idx) => {
                    const status = statusTone(c.status);
                    return (
                      <div key={c.id || idx} style={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.name || `Campaign ${c.id}`}
                          </div>
                          <span style={{ borderRadius: 999, border: `1px solid ${status.bd}`, background: status.bg, color: status.fg, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                            {String(c.status || "unknown")}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 11 }}>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Sent</div>
                            <div style={{ marginTop: 2, fontWeight: 700 }}>{formatWhole(num(c.sent_count))}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Replies</div>
                            <div style={{ marginTop: 2, fontWeight: 700 }}>{formatWhole(num(c.reply_count))}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--color-text-muted)" }}>Rate</div>
                            <div style={{ marginTop: 2, fontWeight: 700 }}>{num(c.reply_rate).toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No campaign analytics yet.</div>
              )}
            </BaseCard>

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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icons.Star size={16} style={{ color: "#eab308" }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Top Lead Scores</h3>
              </div>
              {Array.isArray(data.topLeads) && data.topLeads.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.topLeads.slice(0, 5).map((lead, idx) => {
                    const score = num(lead.score);
                    const chipColor = score >= 80 ? "#16a34a" : score >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={lead.id || idx} style={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name || `Lead ${lead.id}`}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lead.company || "No company"} {lead.tier ? `- ${lead.tier}` : ""}
                          </div>
                        </div>
                        <span style={{ borderRadius: 999, border: `1px solid ${chipColor}66`, background: `${chipColor}1A`, color: chipColor, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No scored leads available yet.</div>
              )}
            </BaseCard>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icons.Lightbulb size={16} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Actionable Insights</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {insights.map((text, i) => (
                <div key={i} style={{ borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", padding: "10px 12px", fontSize: 12.5, color: "var(--color-text)" }}>
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
