"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
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
import { PremiumKpiCard, PREMIUM_KPI_GRID_STYLE } from "@/components/ui/PremiumKpiCard";
import type { EnterpriseChartVariant } from "@/components/dashboard/KpiEnterpriseChart";
import { KPI_DASHBOARD_WORKSPACE_CHART_VARIANT } from "@/lib/kpiDashboardChartBatches";
import { resolveKpiChartValues, type DashboardStatsResponse } from "@/lib/kpiStatsApi";

const DASHBOARD_ANALYTICS_CACHE_TTL_MS = 2 * 60 * 1000;

type StatMetric = {
  title: string;
  value: string;
  note?: string;
  /** First KPI: large name + total count, no chart well. */
  workspaceLayout?: { activeName: string; total: string };
  valueKind?: "text" | "number";
  sparkline?: number[];
  /** Apache ECharts mini chart style. */
  echartsVariant?: EnterpriseChartVariant;
};

function isMutedMetricValue(value: string): boolean {
  const t = value.trim();
  if (t === "-" || t === "") return false;
  if (t === "0" || t === "0%") return true;
  if (/^0\.0+%$/.test(t)) return true;
  const normalized = t.replace(/,/g, "");
  if (normalized === "0%") return true;
  const n = parseFloat(normalized.replace("%", ""));
  if (!Number.isNaN(n) && n === 0) return true;
  return false;
}

type LeadTrendPoint = {
  day: string;
  leads: number;
  conversions: number;
};

type ChannelOutcomeRow = {
  channel: string;
  sent: number;
  engaged: number;
  rate: number;
};

type TopCampaignRow = {
  name: string;
  sent: number;
  replies: number;
  rate: number;
};

const CHANNEL_SENT_BAR_COLOR = "#93C5FD";
const CHANNEL_ENGAGED_BAR_COLOR = "#F29F67";

export default function Dashboard() {
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
  const [dashboardInitialLoadPending, setDashboardInitialLoadPending] = useState(true);
  const [dashboardAnalyticsReady, setDashboardAnalyticsReady] = useState(false);
  const [dashboardCampaignsReady, setDashboardCampaignsReady] = useState(false);
  const [campaignListTab, setCampaignListTab] = useState<"recent" | "saved">("recent");
  const [savedCampaignIds, setSavedCampaignIds] = useState<number[]>([]);
  const [dashboardKpiStats, setDashboardKpiStats] = useState<DashboardStatsResponse | null>(null);

  const { activeBaseId, bases, setActiveBaseId, refreshBases } = useBase();
  const activeBase = bases.find((b) => b.id === activeBaseId);
  const { campaigns, fetchCampaigns, hasCacheForBase } = useCampaignStore();
  const isBootstrappingWorkspace = !activeBaseId && bases.length === 0;
  const hasLeads =
    Number(
      dashboardKpiStats?.totalLeads?.current ??
        analyticsData?.funnel?.totalLeads ??
        analyticsData?.totalLeads ??
        0
    ) > 0;
  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  const getCachedAnalytics = (baseId: number | null): { data: any; timestamp: number } | null => {
    if (!baseId || typeof window === "undefined") return null;
    const inMemory = analyticsCacheRef.current[baseId];
    const now = Date.now();
    if (inMemory && (now - inMemory.timestamp) < DASHBOARD_ANALYTICS_CACHE_TTL_MS) return inMemory;
    try {
      const raw = window.sessionStorage.getItem(`sparkai:dashboard:analytics:${baseId}`);
      if (!raw) return inMemory ?? null;
      const parsed = JSON.parse(raw) as { data?: any; timestamp?: number };
      if (!parsed || typeof parsed.timestamp !== "number") return inMemory ?? null;
      if ((now - parsed.timestamp) > DASHBOARD_ANALYTICS_CACHE_TTL_MS) return inMemory ?? null;
      const cached = { data: parsed.data ?? null, timestamp: parsed.timestamp };
      analyticsCacheRef.current[baseId] = cached;
      return cached;
    } catch {
      return inMemory ?? null;
    }
  };
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
      setDashboardAnalyticsReady(true);
      setDashboardCampaignsReady(true);
      setAnalyticsData(null);
      return;
    }
    const cachedAnalytics = getCachedAnalytics(activeBaseId);
    const hasCampaignCache = hasCacheForBase(activeBaseId);
    if (cachedAnalytics?.data) {
      setAnalyticsData(cachedAnalytics.data);
      setDashboardAnalyticsReady(true);
    } else {
      setDashboardAnalyticsReady(false);
    }
    setDashboardCampaignsReady(hasCampaignCache);
    setDashboardInitialLoadPending(!(Boolean(cachedAnalytics?.data) && hasCampaignCache));
  }, [activeBaseId, hasCacheForBase]);

  useEffect(() => {
    if (!activeBaseId) return;
    setDashboardInitialLoadPending(!(dashboardAnalyticsReady && dashboardCampaignsReady));
  }, [activeBaseId, dashboardAnalyticsReady, dashboardCampaignsReady]);

  useEffect(() => {
    if (!activeBaseId) {
      setAnalyticsData(null);
      setAnalyticsLoading(false);
      setDashboardAnalyticsReady(true);
      return;
    }
    let cancelled = false;
    const cached = getCachedAnalytics(activeBaseId);
    const hasCached = Boolean(cached?.data);
    if (cached?.data) setAnalyticsData(cached.data);
    setDashboardAnalyticsReady(hasCached);
    setAnalyticsLoading(!hasCached);
    (async () => {
      try {
        const data = await apiRequest(`/analytics?base_id=${activeBaseId}`);
        if (!cancelled) {
          setAnalyticsData(data);
          const nextCache = {
            data,
            timestamp: Date.now(),
          };
          analyticsCacheRef.current[activeBaseId] = nextCache;
          try {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(`sparkai:dashboard:analytics:${activeBaseId}`, JSON.stringify(nextCache));
            }
          } catch {
            // ignore cache write failures
          }
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        if (!cancelled && !hasCached) setAnalyticsData(null);
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
          setDashboardAnalyticsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBaseId]);

  useEffect(() => {
    if (!activeBaseId) return;
    const id = window.setInterval(async () => {
      try {
        const latest = await apiRequest(`/analytics?base_id=${activeBaseId}`);
        setAnalyticsData(latest);
        const nextCache = { data: latest, timestamp: Date.now() };
        analyticsCacheRef.current[activeBaseId] = nextCache;
        try {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(`sparkai:dashboard:analytics:${activeBaseId}`, JSON.stringify(nextCache));
          }
        } catch {
          // ignore cache write failures
        }
      } catch {
        // keep last visible values if polling fails
      }
    }, 20000);
    return () => window.clearInterval(id);
  }, [activeBaseId]);

  useEffect(() => {
    if (!activeBaseId) {
      setDashboardCampaignsReady(true);
      return;
    }
    let cancelled = false;
    const hasCampaignCache = hasCacheForBase(activeBaseId);
    setDashboardCampaignsReady(hasCampaignCache);
    void (async () => {
      try {
        await fetchCampaigns(activeBaseId);
      } catch (error) {
        console.error("Failed to fetch campaigns for dashboard:", error);
      } finally {
        if (!cancelled) setDashboardCampaignsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBaseId, fetchCampaigns, hasCacheForBase]);

  useEffect(() => {
    if (!activeBaseId) {
      setDashboardKpiStats(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = (await apiRequest(`/dashboard/stats?base_id=${activeBaseId}`)) as DashboardStatsResponse;
        if (!cancelled) setDashboardKpiStats(data);
      } catch {
        if (!cancelled) setDashboardKpiStats(null);
      }
    };
    void load();
    const id = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeBaseId]);

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
          "Follow workspace -> leads -> first campaign from the Get started panel on the dashboard (shown until your first campaign). The vertical timeline matches that order.",
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
        title: "You're ready",
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
  const funnelTotalLeads = Number(analyticsData?.funnel?.totalLeads ?? analyticsData?.totalLeads ?? 0);
  const contactedLeadsFunnel = Number(analyticsData?.funnel?.contacted ?? 0);
  const totalCampaignsInWorkspace = Number(campaigns?.length ?? 0);

  const overviewMetrics: StatMetric[] = useMemo(() => {
    const k = dashboardKpiStats;
    const tw = Math.max(0, bases.length);
    const flatZero: number[] = Array.from({ length: 7 }, () => 0);
    if (!activeBaseId) {
      return [
        {
          title: "Active workspace",
          value: "",
          valueKind: "text",
          workspaceLayout: {
            activeName: "No workspace selected",
            total: String(Math.max(0, tw)),
          },
          sparkline: resolveKpiChartValues(undefined, undefined, Math.max(0, tw)),
          echartsVariant: KPI_DASHBOARD_WORKSPACE_CHART_VARIANT,
        },
        {
          title: "Total leads",
          value: "0",
          sparkline: flatZero,
          echartsVariant: "areaTrend",
        },
        {
          title: "Contacted leads",
          value: "0",
          sparkline: flatZero,
          echartsVariant: "miniBubble",
        },
        {
          title: "Total campaigns in workspace",
          value: "0",
          sparkline: flatZero,
          echartsVariant: "miniCandlestick",
        },
      ];
    }
    const wsName = k?.activeWorkspace?.name ?? activeBase?.name ?? "Workspace";
    const totalWs = k?.activeWorkspace?.totalWorkspaces ?? tw;
    const tlCurrent = k?.totalLeads?.current ?? funnelTotalLeads;
    const clCurrent = k?.contactedLeads?.current ?? contactedLeadsFunnel;
    const tcCurrent = k?.totalCampaigns?.current ?? totalCampaignsInWorkspace;
    return [
      {
        title: "Active workspace",
        value: "",
        valueKind: "text",
        workspaceLayout: {
          activeName: wsName,
          total: Math.round(totalWs).toLocaleString(),
        },
        sparkline: resolveKpiChartValues(
          undefined,
          k?.activeWorkspace?.countSnapshots,
          Math.round(totalWs)
        ),
        echartsVariant: KPI_DASHBOARD_WORKSPACE_CHART_VARIANT,
      },
      {
        title: "Total leads",
        value: Math.round(tlCurrent).toLocaleString(),
        sparkline: resolveKpiChartValues(k?.totalLeads?.chartSeries, k?.totalLeads?.snapshots, tlCurrent),
        echartsVariant: "areaTrend",
      },
      {
        title: "Contacted leads",
        value: Math.round(clCurrent).toLocaleString(),
        sparkline: resolveKpiChartValues(k?.contactedLeads?.chartSeries, k?.contactedLeads?.snapshots, clCurrent),
        echartsVariant: "miniBubble",
      },
      {
        title: "Total campaigns in workspace",
        value: Math.round(tcCurrent).toLocaleString(),
        sparkline: resolveKpiChartValues(k?.totalCampaigns?.chartSeries, k?.totalCampaigns?.snapshots, tcCurrent),
        echartsVariant: "miniCandlestick",
      },
    ];
  }, [
    activeBaseId,
    activeBase?.name,
    bases.length,
    dashboardKpiStats,
    analyticsData,
    funnelTotalLeads,
    contactedLeadsFunnel,
    totalCampaignsInWorkspace,
  ]);

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

  const toSafeNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const periodLabel = (() => {
    const p = String(analyticsData?.period || "30d").toLowerCase();
    if (p === "7d") return "Last 7 days";
    if (p === "90d") return "Last 90 days";
    return "Last 30 days";
  })();
  const dailyPerformanceData = useMemo<LeadTrendPoint[]>(() => {
    const rows = Array.isArray(analyticsData?.dailyTrends) ? analyticsData.dailyTrends : [];
    return rows.map((row: any) => {
      const d = new Date(String(row?.date || ""));
      return {
        day: Number.isNaN(d.getTime())
          ? String(row?.date || "")
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        leads: toSafeNumber(row?.leads),
        conversions: toSafeNumber(row?.conversions),
      };
    });
  }, [analyticsData?.dailyTrends]);
  const fallbackLeadTrendData = useMemo<LeadTrendPoint[]>(() => {
    const snaps = dashboardKpiStats?.totalLeads?.snapshots;
    if (!Array.isArray(snaps) || snaps.length === 0) return [];
    return snaps.map((s) => {
      const d = new Date(s.recordedAt);
      return {
        day: Number.isNaN(d.getTime())
          ? String(s.recordedAt)
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        leads: toSafeNumber(s.value),
        conversions: 0,
      };
    });
  }, [dashboardKpiStats?.totalLeads?.snapshots]);
  const hasDailyActivityData = dailyPerformanceData.some((row) => row.leads > 0 || row.conversions > 0);
  const hasFallbackLeadData = fallbackLeadTrendData.some((row) => row.leads > 0);
  const resolvedLeadTrendData = hasDailyActivityData ? dailyPerformanceData : fallbackLeadTrendData;
  const hasAnyLeadTrendRows = resolvedLeadTrendData.length > 0;
  const leadTrendSubtitle = hasDailyActivityData
    ? `New leads and conversions over time (${periodLabel})`
    : hasFallbackLeadData
      ? `Lead totals from saved server snapshots`
      : `No activity data yet (${periodLabel})`;
  const funnelChartData = useMemo(() => {
    const funnel = analyticsData?.funnel || {};
    return [
      { stage: "Total", value: toSafeNumber(funnel?.totalLeads), color: "#F5B78F" },
      { stage: "Contacted", value: toSafeNumber(funnel?.contacted), color: "#EAA46B" },
      { stage: "Replied", value: toSafeNumber(funnel?.replied), color: "#1F2937" },
      { stage: "Converted", value: toSafeNumber(funnel?.converted), color: "var(--color-primary)" },
    ];
  }, [analyticsData?.funnel]);
  const channelResultsData = useMemo<ChannelOutcomeRow[]>(() => {
    const metrics = analyticsData?.channelMetrics || {};
    const emailSent = toSafeNumber(metrics?.email?.sent);
    const emailEngaged = toSafeNumber(metrics?.email?.replied);
    const linkedInSent = toSafeNumber(metrics?.linkedin?.sent);
    const linkedInEngaged = toSafeNumber(metrics?.linkedin?.replied);
    const whatsappSent = toSafeNumber(metrics?.whatsapp?.sent);
    const whatsappEngaged = toSafeNumber(metrics?.whatsapp?.replied);
    const callSent = toSafeNumber(metrics?.call?.initiated);
    const callEngaged = toSafeNumber(metrics?.call?.answered);
    const rows = [
      { channel: "Email", sent: emailSent, engaged: emailEngaged },
      { channel: "LinkedIn", sent: linkedInSent, engaged: linkedInEngaged },
      { channel: "WhatsApp", sent: whatsappSent, engaged: whatsappEngaged },
      { channel: "Calls", sent: callSent, engaged: callEngaged },
    ];
    return rows.map((row) => ({
      ...row,
      rate: row.sent > 0 ? Math.round((row.engaged / row.sent) * 100) : 0,
    }));
  }, [analyticsData?.channelMetrics]);
  const hasChannelOutcomeData = channelResultsData.some((row) => row.sent > 0 || row.engaged > 0);
  const topCampaignsData = useMemo<TopCampaignRow[]>(() => {
    const rowsFromAnalytics = Array.isArray(analyticsData?.topCampaigns) ? analyticsData.topCampaigns : [];
    const fallbackRows = filteredCampaigns.slice(0, 6).map((row: any) => ({
      name: String(row?.name || `Campaign #${row?.id ?? ""}`),
      sent_count: toSafeNumber(row?.sent_count),
      reply_count: toSafeNumber(row?.reply_count),
      reply_rate: toSafeNumber(row?.reply_rate),
    }));
    const rows = rowsFromAnalytics.length > 0 ? rowsFromAnalytics : fallbackRows;
    return rows
      .slice(0, 6)
      .map((row: any) => ({
        name: String(row?.name || `Campaign #${row?.id ?? ""}`),
        sent: toSafeNumber(row?.sent_count),
        replies: toSafeNumber(row?.reply_count),
        rate: Number(toSafeNumber(row?.reply_rate).toFixed(1)),
      }))
      .sort((a: { sent: number }, b: { sent: number }) => b.sent - a.sent);
  }, [analyticsData?.topCampaigns, filteredCampaigns]);
  const hasTopCampaignData = topCampaignsData.some((row) => row.sent > 0 || row.replies > 0);
  const hasTopCampaignReplySignal = topCampaignsData.some((row) => row.replies > 0 || row.rate > 0);
  const topCampaignMaxSent = Math.max(1, ...topCampaignsData.map((row) => row.sent));
  const tooltipSharedStyle = {
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    background: "var(--color-surface)",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    fontSize: 12,
  };

  const dashboardBody =
    isBootstrappingWorkspace || (activeBaseId && dashboardInitialLoadPending) ? (
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
        <button type="button" className="btn-dashboard-outline dashboard-header-primary-btn" onClick={dashboardPrimaryAction.onClick}>
          {dashboardPrimaryAction.icon}
          {dashboardPrimaryAction.label}
        </button>
      </div>

      <div style={PREMIUM_KPI_GRID_STYLE}>
        {overviewMetrics.map((card) => {
          const valueMuted = isMutedMetricValue(String(card.value));
          const isWorkspaceCard = card.title === "Active workspace";

          return (
            <PremiumKpiCard
              key={card.title}
              title={card.title}
              value={card.value}
              valueKind={card.valueKind ?? "number"}
              valueMuted={valueMuted}
              valueTitle={isWorkspaceCard ? card.workspaceLayout?.activeName : undefined}
              note={card.note}
              workspaceLayout={isWorkspaceCard ? card.workspaceLayout : undefined}
              sparklineValues={card.sparkline}
              echartsVariant={card.echartsVariant}
            />
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
              open now - use the workspace switcher anytime to move between this team and your personal one.
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
                  border: campaignListTab === "recent" ? "1px solid var(--color-primary)" : "1px solid transparent",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  lineHeight: 1,
                  cursor: "pointer",
                  background: campaignListTab === "recent" ? "var(--color-primary)" : "transparent",
                  color: campaignListTab === "recent" ? "#ffffff" : "var(--color-text-muted)",
                  boxShadow: campaignListTab === "recent" ? "0 6px 14px rgba(var(--color-primary-rgb), 0.24)" : "none",
                  transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
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
                  border: campaignListTab === "saved" ? "1px solid var(--color-primary)" : "1px solid transparent",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  lineHeight: 1,
                  cursor: "pointer",
                  background: campaignListTab === "saved" ? "var(--color-primary)" : "transparent",
                  color: campaignListTab === "saved" ? "#ffffff" : "var(--color-text-muted)",
                  boxShadow: campaignListTab === "saved" ? "0 6px 14px rgba(var(--color-primary-rgb), 0.24)" : "none",
                  transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        <div className="dashboard-surface-card" style={{ gridColumn: "span 7", padding: "14px 16px", minHeight: 260 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 2 }}>Lead activity trend</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{leadTrendSubtitle}</div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#EAA46B" }} />
                Leads added
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#1F2937" }} />
                Conversions
              </span>
            </div>
          </div>
          {hasAnyLeadTrendRows ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={resolvedLeadTrendData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboard-daily-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F4C995" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#F4C995" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip contentStyle={tooltipSharedStyle} />
                <Area type="monotone" dataKey="leads" stroke="#EAA46B" fill="url(#dashboard-daily-area)" strokeWidth={2.2} />
                <Line type="monotone" dataKey="conversions" stroke="#1F2937" strokeWidth={2} dot={{ r: 2.6, strokeWidth: 1.2, fill: "#1F2937", stroke: "#FFFFFF" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 190,
                borderRadius: 12,
                border: "1px dashed var(--color-border)",
                background: "var(--color-surface-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              No lead activity to chart yet
            </div>
          )}
        </div>

        <div className="dashboard-surface-card" style={{ gridColumn: "span 5", padding: "14px 16px", minHeight: 260 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>Funnel stages</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Total to Contacted to Replied to Converted ({periodLabel})
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={funnelChartData} margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={tooltipSharedStyle} />
              <Bar dataKey="value" radius={[7, 7, 0, 0]}>
                {funnelChartData.map((entry, index) => (
                  <Cell key={`${entry.stage}-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-muted)" }}>
            Shows unique leads at each funnel stage from analytics API.
          </div>
        </div>

        <div className="dashboard-surface-card" style={{ gridColumn: "span 8", padding: "14px 16px", minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>Channel outcomes</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Sent vs engaged by channel ({periodLabel})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text)" }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: CHANNEL_SENT_BAR_COLOR,
                  border: "1px solid rgba(59,130,246,0.28)",
                }}
              />
              Sent
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text)" }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: CHANNEL_ENGAGED_BAR_COLOR,
                  border: "1px solid rgba(249,115,22,0.28)",
                }}
              />
              Engaged
            </div>
          </div>
          {hasChannelOutcomeData ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={channelResultsData} margin={{ top: 0, right: 8, left: -14, bottom: 0 }} barGap={8}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipSharedStyle}
                    cursor={{ fill: "rgba(148, 163, 184, 0.14)" }}
                    labelStyle={{ color: "var(--color-text)", fontWeight: 700 }}
                    itemStyle={{ color: "var(--color-text)", fontWeight: 600, textTransform: "capitalize" }}
                  />
                  <Bar dataKey="sent" fill={CHANNEL_SENT_BAR_COLOR} radius={[6, 6, 0, 0]} barSize={16} />
                  <Bar dataKey="engaged" fill={CHANNEL_ENGAGED_BAR_COLOR} radius={[6, 6, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {channelResultsData.map((row) => (
                  <div
                    key={row.channel}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "var(--color-surface-secondary)",
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {row.channel}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{row.rate}%</div>
                    <div style={{ fontSize: 11, color: "var(--color-text)" }}>
                      {row.engaged}/{row.sent} engaged
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                height: 184,
                borderRadius: 12,
                border: "1px dashed var(--color-border)",
                background: "var(--color-surface-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              No channel activity to compare yet
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-muted)" }}>For calls, engagement = answered calls.</div>
        </div>

        <div className="dashboard-surface-card" style={{ gridColumn: "span 4", padding: "14px 16px", minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>Top campaigns</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Ranked by sent volume ({periodLabel})
          </div>
          {hasTopCampaignData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 2 }}>
              {topCampaignsData.slice(0, 5).map((row, index) => (
                <div key={`${row.name}-${index}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text)",
                        maxWidth: "70%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={row.name}
                    >
                      {index + 1}. {row.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {hasTopCampaignReplySignal
                        ? `${row.sent} sent - ${row.replies} replies - ${row.rate}%`
                        : `${row.sent} sent`}
                    </div>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      borderRadius: 999,
                      background: "rgba(var(--color-primary-rgb), 0.14)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(8, Math.round((row.sent / topCampaignMaxSent) * 100))}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.62) 0%, var(--color-primary) 100%)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                height: 170,
                borderRadius: 12,
                border: "1px dashed var(--color-border)",
                background: "var(--color-surface-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              No campaign send data yet
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-muted)" }}>
            {hasTopCampaignReplySignal
              ? "Showing sent, replies, and reply-rate."
              : "Showing sent volume only. Reply metrics are hidden until reply tracking data is available."}
          </div>
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
