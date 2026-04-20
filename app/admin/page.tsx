"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { AdminOverviewCharts } from "@/components/admin/AdminPlatformAnalyticsCharts";
import type { AdminAnalyticsPayload } from "@/lib/adminAnalyticsTypes";

type Stats = {
  totalUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  totalBases: number;
  activeUsers: number;
  adminCount: number;
};

type MetricKey = "all" | "users" | "leads" | "campaigns" | "bases";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiRequest("/admin/stats");
        setStats(data as Stats);
      } catch (e) {
        console.error(e);
        setStats({
          totalUsers: 0,
          totalLeads: 0,
          totalCampaigns: 0,
          totalBases: 0,
          activeUsers: 0,
          adminCount: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      setAnalyticsLoading(true);
      try {
        const data = (await apiRequest("/admin/analytics?days=14")) as AdminAnalyticsPayload;
        setAnalytics(data);
      } catch (e) {
        console.error(e);
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    run();
  }, []);

  const maxBar = Math.max(
    1,
    stats?.totalUsers ?? 0,
    stats?.totalLeads ?? 0,
    stats?.totalCampaigns ?? 0,
    stats?.totalBases ?? 0
  );

  const bar = (value: number, color: string) => (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        background: "var(--color-surface-secondary)",
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.round((value / maxBar) * 100))}%`,
          height: "100%",
          borderRadius: 999,
          background: color,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );

  const { cards, filteredSnapshot } = useMemo(() => {
    if (!stats) {
      return { cards: [] as Array<{
        key: MetricKey;
        label: string;
        value: number;
        hint: string;
        color: string;
        menu: { key: string; label: string; onClick: () => void }[];
      }>, filteredSnapshot: [] as Array<{ label: string; value: number; color: string; key: MetricKey }> };
    }
    const baseCards = [
      {
        key: "users" as const,
        label: "Users",
        value: stats.totalUsers,
        hint: `${stats.activeUsers} app users · ${stats.adminCount} admins`,
        color: "var(--color-primary)",
        menu: [
          { key: "open", label: "Open users", onClick: () => router.push("/admin/users") },
          { key: "bases", label: "Workspaces", onClick: () => router.push("/admin/bases") },
        ],
      },
      {
        key: "leads" as const,
        label: "Leads",
        value: stats.totalLeads,
        hint: "All workspaces",
        color: "#F29F67",
        menu: [{ key: "open", label: "Open leads", onClick: () => router.push("/admin/leads") }],
      },
      {
        key: "campaigns" as const,
        label: "Campaigns",
        value: stats.totalCampaigns,
        hint: "Across all bases",
        color: "#f97316",
        menu: [{ key: "open", label: "Open campaigns", onClick: () => router.push("/admin/campaigns") }],
      },
      {
        key: "bases" as const,
        label: "Workspaces",
        value: stats.totalBases,
        hint: "Registered bases",
        color: "#14b8a6",
        menu: [{ key: "open", label: "Manage workspaces", onClick: () => router.push("/admin/bases") }],
      },
    ];
    const snap = [
      { label: "Users", value: stats.totalUsers, color: "var(--color-primary)", key: "users" as const },
      { label: "Leads", value: stats.totalLeads, color: "#F29F67", key: "leads" as const },
      { label: "Campaigns", value: stats.totalCampaigns, color: "#f97316", key: "campaigns" as const },
      { label: "Workspaces", value: stats.totalBases, color: "#14b8a6", key: "bases" as const },
    ];
    return { cards: baseCards, filteredSnapshot: snap };
  }, [stats, router]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)" }}>Loading metrics…</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {cards.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", color: "var(--color-text-muted)" }}>
                No metrics to display.
              </div>
            ) : (
              cards.map((c) => (
                <div
                  key={c.key}
                  style={{
                    background: "var(--color-surface)",
                    borderRadius: 16,
                    padding: 20,
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 1px 3px var(--color-shadow)",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{c.hint}</div>
                  {bar(c.value, c.color)}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {c.menu.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        className="btn-ghost admin-tool-ghost"
                        onClick={m.onClick}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8 }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 16,
              padding: 20,
              border: "1px solid var(--color-border)",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Trends</h2>
              <button
                type="button"
                className="btn-primary"
                onClick={() => router.push("/admin/analytics")}
                style={{ fontSize: 13 }}
              >
                Full analytics
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
              Last 14 days of signups, leads, and campaigns — plus campaign status mix.
            </p>
            <AdminOverviewCharts data={analytics} loading={analyticsLoading} />
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 16,
              padding: 20,
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Volume snapshot</h2>
              <button
                type="button"
                className="btn-ghost admin-tool-ghost"
                onClick={() => router.push("/admin/subscriptions")}
                style={{ fontSize: 13 }}
              >
                Subscriptions
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
              Relative scale of major entities on the platform (updates on each load).
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {filteredSnapshot.length === 0 ? (
                <div className="text-hint" style={{ fontSize: 14 }}>
                  No rows match your search or filter.
                </div>
              ) : (
                filteredSnapshot.map((row) => (
                  <div key={row.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{row.label}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>{row.value}</span>
                    </div>
                    {bar(row.value, row.color)}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
