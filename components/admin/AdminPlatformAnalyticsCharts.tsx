"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminAnalyticsPayload, AdminStatusSlice, AdminWorkspaceLeadRow } from "@/lib/adminAnalyticsTypes";

const CHART_MUTED = "var(--color-text-muted, #64748b)";
const CHART_GRID = "var(--color-border, #e2e8f0)";
const PALETTE = ["#7C3AED", "#A94CFF", "#f97316", "#14b8a6", "#ec4899", "#eab308", "#6366f1"];

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function OverviewTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 12px var(--color-shadow, rgba(0,0,0,0.08))",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={String(p.name)} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function FullTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        maxWidth: 280,
        boxShadow: "0 8px 24px var(--color-shadow, rgba(0,0,0,0.1))",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--color-text)" }}>{label}</div>
      {payload.map((p) => (
        <div key={String(p.name)} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  compact,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: compact ? 14 : 16,
        padding: compact ? 14 : 20,
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px var(--color-shadow)",
        minHeight: compact ? 240 : 320,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: compact ? 8 : 12 }}>
        <h3 style={{ fontSize: compact ? 14 : 16, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>{title}</h3>
        {subtitle ? (
          <p style={{ fontSize: 12, color: CHART_MUTED, margin: "4px 0 0", lineHeight: 1.4 }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={{ flex: 1, minHeight: compact ? 160 : 220 }}>{children}</div>
    </div>
  );
}

function pieData(status: AdminStatusSlice[]) {
  return status.map((s) => ({ name: s.status, value: s.count }));
}

function workspaceBarData(rows: AdminWorkspaceLeadRow[]) {
  return rows.map((r) => ({
    name: r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name,
    leads: r.leadCount,
  }));
}

export function AdminOverviewCharts({ data, loading }: { data: AdminAnalyticsPayload | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ marginBottom: 24, color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading charts…
      </div>
    );
  }
  if (!data?.growthTimeseries?.length) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        Charts could not be loaded. Check that the API exposes <code style={{ fontSize: 12 }}>/admin/analytics</code> and try again.
      </div>
    );
  }

  const lineData = data.growthTimeseries.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));
  const pieRows = pieData(data.campaignStatusBreakdown);
  const pieSafe = pieRows.length > 0 ? pieRows : [{ name: "No campaigns", value: 1 }];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <ChartCard
        title="Daily activity"
        subtitle={`New users, leads, and campaigns per day · last ${data.days} days`}
        compact
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_MUTED }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
            <YAxis tick={{ fontSize: 10, fill: CHART_MUTED }} width={32} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<OverviewTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="users" name="Users" stroke={PALETTE[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="leads" name="Leads" stroke={PALETTE[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="campaigns" name="Campaigns" stroke={PALETTE[2]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Campaign status" subtitle="All campaigns grouped by status" compact>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieSafe}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={{ stroke: CHART_MUTED }}
            >
              {pieSafe.map((_, i) => (
                <Cell key={String(i)} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<OverviewTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export function AdminAnalyticsDashboard({
  data,
  loading,
  days,
  onDaysChange,
}: {
  data: AdminAnalyticsPayload | null;
  loading: boolean;
  days: number;
  onDaysChange: (d: number) => void;
}) {
  if (loading && !data) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)" }}>
        Loading analytics…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)" }}>
        No analytics data available.
      </div>
    );
  }

  const lineData = data.growthTimeseries.map((p) => ({
    ...p,
    label: formatShortDate(p.date),
  }));
  const pieRows = pieData(data.campaignStatusBreakdown);
  const pieSafe = pieRows.length > 0 ? pieRows : [{ name: "No campaigns", value: 1 }];
  const wsBars = workspaceBarData(data.topWorkspacesByLeads);

  const dayOptions = [7, 14, 30, 60, 90];

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
          Reported from your connected database. Times are grouped by calendar day in the server timezone. Totals below are all-time;
          series charts use the selected window only.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: CHART_MUTED }}>Range</span>
          <select
            className="input"
            aria-label="Analytics date range"
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            style={{ minWidth: 100, fontSize: 13 }}
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Users (all-time)", value: data.totals.users, color: PALETTE[0] },
          { label: "Leads (all-time)", value: data.totals.leads, color: PALETTE[1] },
          { label: "Campaigns (all-time)", value: data.totals.campaigns, color: PALETTE[2] },
          { label: "Workspaces (all-time)", value: data.totals.bases, color: PALETTE[3] },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              borderRadius: 12,
              padding: "12px 14px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <div style={{ fontSize: 11, color: CHART_MUTED, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: CHART_MUTED, margin: "0 0 16px" }}>
        Generated {new Date(data.generatedAt).toLocaleString()} · window: {data.days} days · {lineData.length} buckets
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap: 20,
        }}
      >
        <ChartCard
          title="Growth (multi-series)"
          subtitle="Daily new users, leads, and campaigns in the selected range"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_MUTED }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_MUTED }} width={40} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<FullTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="users" name="New users" stroke={PALETTE[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" name="New leads" stroke={PALETTE[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="campaigns" name="New campaigns" stroke={PALETTE[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="New leads (cumulative in range)"
          subtitle="Running sum of daily new leads across the window — not total database size"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="adminCumLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[1]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PALETTE[1]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_MUTED }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
              <YAxis tick={{ fontSize: 11, fill: CHART_MUTED }} width={44} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<FullTooltip />} />
              <Area type="monotone" dataKey="cumulativeLeads" name="Cumulative new leads" stroke={PALETTE[1]} fill="url(#adminCumLeads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Campaign status distribution" subtitle="Share of all campaigns by current status">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieSafe}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieSafe.map((_, i) => (
                  <Cell key={String(i)} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<FullTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top workspaces by lead volume" subtitle="Lead count per workspace (all-time), top 12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wsBars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: CHART_MUTED }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: CHART_MUTED }} tickLine={false} axisLine={false} />
              <Tooltip content={<FullTooltip />} />
              <Bar dataKey="leads" name="Leads" fill={PALETTE[3]} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {data.leadsByTier.length > 0 ? (
        <div
          style={{
            marginTop: 28,
            padding: 20,
            borderRadius: 16,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text)" }}>
            Lead tier breakdown (all-time)
          </h3>
          <p style={{ fontSize: 13, color: CHART_MUTED, margin: "0 0 16px", lineHeight: 1.5 }}>
            Raw counts by tier label stored on leads. Empty or whitespace tiers are grouped as “(none)”.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: `1px solid ${CHART_GRID}` }}>
                  <th style={{ padding: "10px 8px", fontWeight: 700, color: "var(--color-text)" }}>Tier</th>
                  <th style={{ padding: "10px 8px", fontWeight: 700, color: "var(--color-text)" }}>Leads</th>
                  <th style={{ padding: "10px 8px", fontWeight: 700, color: "var(--color-text)" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const total = data.leadsByTier.reduce((s, r) => s + r.count, 0) || 1;
                  return data.leadsByTier.map((row) => (
                    <tr key={row.tier} style={{ borderBottom: `1px solid var(--color-border)` }}>
                      <td style={{ padding: "10px 8px", color: "var(--color-text)" }}>{row.tier}</td>
                      <td style={{ padding: "10px 8px", fontVariantNumeric: "tabular-nums" }}>{row.count.toLocaleString()}</td>
                      <td style={{ padding: "10px 8px", color: CHART_MUTED, fontVariantNumeric: "tabular-nums" }}>
                        {((row.count / total) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
