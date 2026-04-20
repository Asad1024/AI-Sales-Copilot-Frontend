"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import {
  clearRememberedTeamWorkspace,
  readRememberedTeamWorkspaceId,
} from "@/lib/focusTeamWorkspace";
import ProductTour from "@/components/ui/ProductTour";
import { apiRequest, getUser } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore } from "@/stores/useCampaignStore";
import CampaignCard from "@/app/campaigns/components/CampaignCard";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import DashboardGetStartedChecklist from "@/components/ui/DashboardGetStartedChecklist";
import { Sunrise, Sun, Moon } from "lucide-react";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

type StatMetric = {
  title: string;
  value: string;
  trendPositive: boolean;
  sparkline: number[];
  note?: string;
};

/** Stat grid labels — stronger hierarchy than section rails (color from .dashboard-metric-label) */
const metricLabelStyle = {
  fontSize: 12,
  fontWeight: 600 as const,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
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

type SparklineChartProps = {
  points: number[];
  positive: boolean;
};

function SparklineChart({ points, positive }: SparklineChartProps) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const isFlat = points.every((p) => Math.abs(p - points[0]) < 0.001);
  // Fixed "Total Tickets" signature shape used by all cards.
  // Repeated values create short straight runs; monotone keeps soft transitions elsewhere.
  const ticketShapeTemplate = [0.22, 0.10, 0.46, 0.46, 0.66, 0.22, 0.50, 0.18, 0.48, 0.28, 0.42];
  const shapedPoints = isFlat
    ? ticketShapeTemplate.map(() => points[0])
    : ticketShapeTemplate.map((ratio) => min + ratio * span);
  const data = shapedPoints.map((value, index) => ({ index, value }));
  const lineColor = "#2563EB";
  const areaGradientId = `sparkline-area-${positive ? "positive" : "negative"}`;

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

export default function Dashboard() {
  const ANALYTICS_CACHE_TTL_MS = 2 * 60 * 1000;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitationSuccess, setInvitationSuccess] = useState<{
    baseName: string;
    role: string;
    message: string;
    baseId?: number;
  } | null>(null);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const analyticsCacheRef = useRef<Record<number, { data: any; timestamp: number }>>({});
  const [dashboardInitialLoadPending, setDashboardInitialLoadPending] = useState(false);
  const [campaignListTab, setCampaignListTab] = useState<"recent" | "saved">("recent");
  const [savedCampaignIds, setSavedCampaignIds] = useState<number[]>([]);

  const { activeBaseId, bases, setActiveBaseId, refreshBases } = useBase();
  const activeBase = bases.find((b) => b.id === activeBaseId);
  const { campaigns, fetchCampaigns, loading: campaignsLoading } = useCampaignStore();
  const hasLeads = Number(analyticsData?.totalLeads || 0) > 0;
  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  useEffect(() => {
    const invited = searchParams.get("invited");
    if (invited === "true") {
      const stored = sessionStorage.getItem("invitationAccepted");
      if (stored) {
        try {
          const data = JSON.parse(stored) as {
            baseName?: string;
            baseId?: number;
            role?: string;
            message?: string;
          };
          const baseId =
            typeof data.baseId === "number" && Number.isFinite(data.baseId)
              ? data.baseId
              : Number(data.baseId);
          setInvitationSuccess({
            baseName: String(data.baseName || "your team workspace"),
            role: String(data.role || "member"),
            message: String(data.message || ""),
            baseId: Number.isFinite(baseId) && baseId > 0 ? baseId : undefined,
          });
          router.replace("/dashboard", { scroll: false });
          setTimeout(() => {
            sessionStorage.removeItem("invitationAccepted");
          }, 5000);
        } catch (e) {
          console.error("Failed to parse invitation data:", e);
        }
      }
    }
  }, [searchParams, router]);

  /** Open the invited team workspace (not the personal default) once bases are known. */
  useEffect(() => {
    const fromSession = readRememberedTeamWorkspaceId();
    const fromInvite = invitationSuccess?.baseId ?? null;
    const targetId = fromSession ?? fromInvite ?? null;
    if (!targetId) return;
    if (!bases.length) return;
    if (!bases.some((b) => b.id === targetId)) return;
    if (activeBaseId === targetId) {
      clearRememberedTeamWorkspace();
      return;
    }
    let cancelled = false;
    (async () => {
      await refreshBases();
      if (cancelled) return;
      const list = useBaseStore.getState().bases;
      if (!list.some((b) => b.id === targetId)) return;
      const targetBase = list.find((b) => b.id === targetId);
      setActiveBaseId(targetId, targetBase ? { name: targetBase.name } : undefined);
      clearRememberedTeamWorkspace();
    })();
    return () => {
      cancelled = true;
    };
  }, [bases, activeBaseId, invitationSuccess?.baseId, refreshBases, setActiveBaseId]);

  useEffect(() => {
    if (!activeBaseId) {
      setDashboardInitialLoadPending(false);
      return;
    }
    setDashboardInitialLoadPending(true);
  }, [activeBaseId]);

  useEffect(() => {
    if (!activeBaseId) return;
    if (analyticsLoading || campaignsLoading) return;
    setDashboardInitialLoadPending(false);
  }, [activeBaseId, analyticsLoading, campaignsLoading]);

  useEffect(() => {
    if (!activeBaseId) {
      setAnalyticsData(null);
      setAnalyticsLoading(false);
      return;
    }
    let cancelled = false;
    const cached = analyticsCacheRef.current[activeBaseId];
    const hasCached = Boolean(cached?.data);
    if (hasCached) {
      setAnalyticsData(cached.data);
    } else {
      setAnalyticsData(null);
    }
    const isFresh = hasCached && (Date.now() - cached.timestamp) < ANALYTICS_CACHE_TTL_MS;
    if (isFresh) {
      setAnalyticsLoading(false);
      return;
    }
    // If cached data exists, refresh silently in background.
    setAnalyticsLoading(!hasCached);
    (async () => {
      try {
        const data = await apiRequest(`/analytics?base_id=${activeBaseId}`);
        if (!cancelled) {
          setAnalyticsData(data);
          analyticsCacheRef.current[activeBaseId] = {
            data,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        if (!cancelled && !hasCached) setAnalyticsData(null);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBaseId]);

  useEffect(() => {
    fetchCampaigns(activeBaseId ?? null);
  }, [activeBaseId, fetchCampaigns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("dashboard:saved-campaign-ids");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0);
        setSavedCampaignIds(normalized);
      }
    } catch {
      // ignore invalid persisted values
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("dashboard:saved-campaign-ids", JSON.stringify(savedCampaignIds));
  }, [savedCampaignIds]);

  const tourSteps = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome to your dashboard",
        description:
          "This short tour covers the essentials: choosing a workspace, following setup, and opening Leads and Campaigns from the sidebar. You can skip anytime.",
        position: "center" as const,
      },
      {
        id: "workspace",
        title: "Pick your workspace",
        description:
          "Everything runs inside a workspace. Switch here before importing leads or launching campaigns so activity lands in the right place.",
        target: '[data-tour="bases-selector"]',
        position: "right" as const,
      },
      {
        id: "setup-steps",
        title: "Setup checklist",
        description:
          "Follow workspace → leads → first campaign from the Get started panel on the dashboard (shown until your first campaign). The vertical timeline matches that order.",
        target: '[data-tour="dashboard-get-started"]',
        position: "bottom" as const,
        action: () => {
          const el = document.querySelector('[data-tour="dashboard-get-started"]');
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      },
      {
        id: "leads",
        title: "Leads first",
        description:
          "Add or import leads for the active workspace. Use Campaigns in the same sidebar block when you are ready to launch outreach.",
        target: '[data-tour="leads-link"]',
        position: "right" as const,
      },
      {
        id: "complete",
        title: "You’re ready",
        description:
          "That is the core loop: choose a workspace, add leads, then open Campaigns to build and run sequences. Replay this tour anytime from Tutorial in the header.",
        position: "center" as const,
      },
    ],
    []
  );

  const goToLeads = () => {
    if (activeBaseId) {
      router.push(`/bases/${activeBaseId}/leads`);
    } else {
      router.push("/bases");
    }
  };
  const goToCreateCampaign = () => {
    goToNewCampaignOrWorkspaces(router, activeBaseId);
  };
  const leadChange = Number(analyticsData?.leadChange ?? NaN);
  const campaignChange = Number(analyticsData?.campaignChange ?? NaN);
  const replyChange = Number(analyticsData?.replyChange ?? NaN);

  const overviewMetrics: StatMetric[] = [
    {
      title: "Active workspace",
      value: activeBase?.name ?? "—",
      trendPositive: true,
      sparkline: activeBaseId ? [42, 43, 41, 45, 42, 46, 44, 47] : [40, 41, 39, 41, 39, 42, 40, 41],
      note: activeBaseId ? "Current workspace" : "Create or select one",
    },
    {
      title: "Total leads",
      value: analyticsData?.totalLeads?.toLocaleString?.() ?? "0",
      trendPositive: leadChange >= 0,
      sparkline:
        Number(analyticsData?.totalLeads || 0) > 0
          ? [19, 20, 24, 22, 27, 21, 29, 25]
          : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Active campaigns",
      value: analyticsData?.activeCampaigns?.toString?.() ?? "0",
      trendPositive: campaignChange >= 0,
      sparkline:
        Number(analyticsData?.activeCampaigns || 0) > 0
          ? [8, 9, 12, 10, 14, 9, 13, 11]
          : [0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Reply rate",
      value: typeof analyticsData?.replyRate === "number" ? `${analyticsData.replyRate.toFixed(1)}%` : "0%",
      trendPositive: replyChange >= 0,
      sparkline:
        typeof analyticsData?.replyRate === "number" && analyticsData.replyRate > 0
          ? [10, 11, 8, 12, 9, 11, 8, 10]
          : [0, 0, 0, 0, 0, 0, 0, 0],
    },
  ];

  const dashboardPrimaryAction = (() => {
    if (!activeBaseId) {
      return {
        label: "Create workspace",
        icon: <Icons.Folder size={16} strokeWidth={1.5} />,
        onClick: () => router.push("/bases"),
      };
    }
    if (!hasLeads) {
      return {
        label: "Add leads",
        icon: <Icons.UserPlus size={16} strokeWidth={1.5} />,
        onClick: goToLeads,
      };
    }
    return {
      label: "Create Campaign",
      icon: <Icons.Send size={16} strokeWidth={1.5} />,
      onClick: goToCreateCampaign,
    };
  })();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return { label: "Good morning", Icon: Sunrise };
    if (hour < 18) return { label: "Good afternoon", Icon: Sun };
    return { label: "Good evening", Icon: Moon };
  })();
  const GreetingIcon = greeting.Icon;
  const userName = getUser()?.name || "User";

  const setupStepsDone =
    (activeBaseId ? 1 : 0) + (hasLeads ? 1 : 0) + (hasCampaigns ? 1 : 0);
  const setupStepsTotal = 3;

  const filteredCampaigns = [...(campaigns || [])].sort((a, b) => {
    const aTime = a.updated_at || a.created_at || "";
    const bTime = b.updated_at || b.created_at || "";
    if (aTime && bTime) return bTime.localeCompare(aTime);
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;
    return (b.id || 0) - (a.id || 0);
  });
  const recentCampaigns = filteredCampaigns.slice(0, 3);
  const savedCampaigns = filteredCampaigns.filter((c) => savedCampaignIds.includes(Number(c.id))).slice(0, 3);
  const visibleCampaigns = campaignListTab === "recent" ? recentCampaigns : savedCampaigns;

  const toggleSavedCampaign = (campaignId: number) => {
    setSavedCampaignIds((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId]
    );
  };

  const dashboardBody =
    activeBaseId && dashboardInitialLoadPending && (analyticsLoading || campaignsLoading) ? (
    <GlobalPageLoader layout="embedded" minHeight={480} ariaLabel="Loading dashboard" />
  ) : (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <GreetingIcon size={15} strokeWidth={2} aria-hidden style={{ flexShrink: 0, opacity: 0.92 }} />
              {greeting.label}
            </span>
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              color: "var(--color-text)",
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          >
            {userName}
          </span>
        </div>
        <button type="button" className="btn-dashboard-outline" onClick={dashboardPrimaryAction.onClick}>
          {dashboardPrimaryAction.icon}
          {dashboardPrimaryAction.label}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {overviewMetrics.map((card) => {
          const valueMuted = isMutedMetricValue(String(card.value));
          return (
          <div key={card.title} className="dashboard-stat-card" style={{ padding: "10px 12px 12px" }}>
            <div style={{ marginBottom: 6 }}>
              <span className="dashboard-metric-label" style={{ ...metricLabelStyle, display: "block" }}>
                {card.title}
              </span>
            </div>
            <div
              className="dashboard-stat-value"
              style={{
                fontSize: 28,
                fontWeight: card.title === "Active workspace" || card.title === "Total leads" ? 600 : 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.12,
                color: valueMuted ? "var(--color-text-muted)" : "var(--color-text)",
                fontFamily: "Inter, -apple-system, sans-serif",
                wordBreak: "break-word",
              }}
            >
              {card.value}
            </div>
            {card.title === "Active workspace" ? (
              <div
                style={{
                  marginTop: 12,
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  lineHeight: 1.35,
                }}
              >
                {card.note}
              </div>
            ) : (
              <>
                <div style={{ marginTop: 8 }}>
                  <SparklineChart points={card.sparkline} positive={card.trendPositive} />
                </div>
                <div style={{ marginTop: 2, minHeight: 2 }} />
              </>
            )}
          </div>
          );
        })}
      </div>

      {invitationSuccess && (
        <div
          className="dashboard-surface-card dashboard-invite-success-banner"
          style={{
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            position: "relative",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <div
            className="dashboard-invite-success-icon-wrap"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icons.Check size={18} strokeWidth={1.5} style={{ color: "#059669" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
              Welcome to {invitationSuccess.baseName}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              You&apos;ve been added as{" "}
              <strong style={{ textTransform: "capitalize", color: "var(--color-text)" }}>{invitationSuccess.role}</strong>. This workspace is
              open now — use the workspace switcher anytime to move between this team and your personal one.
            </div>
          </div>
          <button
            type="button"
            className="dashboard-invite-dismiss"
            onClick={() => setInvitationSuccess(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted)",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            aria-label="Dismiss"
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div
        style={
          hasCampaigns
            ? {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 12,
                alignItems: "stretch",
              }
            : undefined
        }
        className={
          hasCampaigns
            ? "dashboard-campaigns-grid"
            : "dashboard-campaigns-grid dashboard-campaigns-grid--stat-aligned"
        }
      >
        {!hasCampaigns ? (
          <div className="dashboard-get-started-slot">
            <DashboardGetStartedChecklist
              activeBaseId={activeBaseId}
              hasLeads={hasLeads}
              hasCampaigns={hasCampaigns}
              setupStepsDone={setupStepsDone}
              setupStepsTotal={setupStepsTotal}
              onCreateWorkspace={() => router.push("/bases")}
              onAddLeads={goToLeads}
              onCreateCampaign={goToCreateCampaign}
            />
          </div>
        ) : null}

        <div className="dashboard-recent-activity-panel">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: visibleCampaigns.length === 0 ? 0 : 14,
              gap: 10,
              width: "100%",
              flexShrink: 0,
            }}
          >
            <div
              role="tablist"
              aria-label="Campaign list mode"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={campaignListTab === "recent"}
                onClick={() => setCampaignListTab("recent")}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  lineHeight: 1,
                  cursor: "pointer",
                  background: campaignListTab === "recent" ? "rgba(37, 99, 235, 0.08)" : "transparent",
                  color: campaignListTab === "recent" ? "var(--color-primary)" : "var(--color-text-muted)",
                }}
              >
                Recent Campaigns
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={campaignListTab === "saved"}
                onClick={() => setCampaignListTab("saved")}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  lineHeight: 1,
                  cursor: "pointer",
                  background: campaignListTab === "saved" ? "rgba(37, 99, 235, 0.08)" : "transparent",
                  color: campaignListTab === "saved" ? "var(--color-primary)" : "var(--color-text-muted)",
                }}
              >
                Saved Campaigns
              </button>
            </div>
          </div>
          {visibleCampaigns.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "8px 16px 16px",
                color: "var(--color-text-muted)",
                gap: 10,
                width: "100%",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--color-surface-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--elev-border, var(--color-border))",
                }}
              >
                <Icons.Clock size={22} strokeWidth={1.5} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                {campaignListTab === "recent" ? "No recent campaigns" : "No saved campaigns"}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, maxWidth: 280 }}>
                {campaignListTab === "recent"
                  ? "Runs, opens, and replies will appear here once you launch."
                  : "Save campaigns to pin them here for quick access."}
              </div>
            </div>
          ) : (
            <div className="campaigns-page-grid">
              {visibleCampaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  baseName={bases.find((b) => b.id === c.base_id)?.name || "Workspace"}
                  onView={() => router.push(`/campaigns/${c.id}`)}
                  onToggleSave={() => toggleSavedCampaign(Number(c.id))}
                  isSaved={savedCampaignIds.includes(Number(c.id))}
                  showDeleteAction={false}
                  workspaceStyle
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <ProductTour steps={tourSteps} />
      <div className="dashboard-shell" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {dashboardBody}
      </div>
    </>
  );
}
