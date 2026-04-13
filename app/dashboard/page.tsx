"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import DashboardOnboardingSteppers from "@/components/ui/DashboardOnboardingSteppers";
import DashboardGetStartedChecklist from "@/components/ui/DashboardGetStartedChecklist";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import { useSparkBarStore } from "@/stores/useSparkBarStore";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

type StatMetric = {
  title: string;
  value: string;
  showTrend: boolean;
  trendPositive: boolean;
  trendValue: string;
  trendSuffix: "%" | "pp";
  subline?: string | null;
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 500 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#9CA3AF",
};

/** Stat grid labels — stronger hierarchy than section rails */
const metricLabelStyle = {
  fontSize: 12,
  fontWeight: 600 as const,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#4B5563",
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

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copilotBannerDismissed, setCopilotBannerDismissed] = useState(false);
  const [invitationSuccess, setInvitationSuccess] = useState<{
    baseName: string;
    role: string;
    message: string;
    baseId?: number;
  } | null>(null);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const { activeBaseId, bases, setActiveBaseId, refreshBases } = useBase();
  const activeBase = bases.find((b) => b.id === activeBaseId);
  const { campaigns, fetchCampaigns, loading: campaignsLoading } = useCampaignStore();
  const hasLeads = Number(analyticsData?.totalLeads || 0) > 0;
  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  const setupStepperVisible = useSparkBarStore((s) => s.setupStepperVisible);
  const toggleSetupStepper = useSparkBarStore((s) => s.toggleSetupStepper);
  const setSetupStepperVisible = useSparkBarStore((s) => s.setSetupStepperVisible);

  /** Once there is at least one campaign (same condition as hiding “Get started”), collapse the stepper. Users can reopen via “Setup steps”. */
  useEffect(() => {
    if (hasCampaigns) {
      setSetupStepperVisible(false);
    }
  }, [hasCampaigns, setSetupStepperVisible]);

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
      setAnalyticsData(null);
      setAnalyticsLoading(false);
      return;
    }
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    (async () => {
      try {
        const data = await apiRequest(`/analytics?base_id=${activeBaseId}`);
        if (!cancelled) setAnalyticsData(data);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        if (!cancelled) setAnalyticsData(null);
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

  const tourSteps = [
    {
      id: "welcome",
      title: "Welcome to Sales Co-Pilot!",
      description:
        "Let's take a quick tour to help you get started. We'll show you the key features in just a few steps. You can skip anytime.",
      position: "center" as const,
    },
    {
      id: "goal-input",
      title: "1. Set Your Growth Goal",
      description:
        'Start here! Enter what you want to achieve, like "Get 50 demos with SaaS founders in 30 days". The AI will analyze your goal and create a personalized outreach plan.',
      target: '[data-tour="goal-input"]',
      position: "bottom" as const,
      action: () => {
        const element = document.querySelector('[data-tour="goal-input"]');
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    },
    {
      id: "bases-selector",
      title: "2. Organize with Bases",
      description:
        "Bases are workspaces for organizing your leads and campaigns. Create different bases for different audiences, regions, or projects.",
      target: '[data-tour="bases-selector"]',
      position: "bottom" as const,
    },
    {
      id: "campaigns-link",
      title: "3. View Campaigns",
      description: "Once you create a campaign, track its performance here. See opens, replies, and conversions in real-time.",
      target: '[data-tour="campaigns-link"]',
      position: "left" as const,
    },
    {
      id: "leads-link",
      title: "4. Manage Leads",
      description: "Import leads from CSV, CRM, or generate them using AI. All your leads are organized here with scoring and enrichment.",
      target: '[data-tour="leads-link"]',
      position: "left" as const,
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "Ready to grow? Enter a goal in the input field above and watch the AI create your complete outreach strategy.",
      position: "center" as const,
    },
  ];

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
      showTrend: false,
      trendPositive: true,
      trendValue: "0",
      trendSuffix: "%",
      subline: activeBaseId ? "Current workspace" : "Create or select one",
    },
    {
      title: "Total leads",
      value: analyticsData?.totalLeads?.toLocaleString?.() ?? "0",
      showTrend: !Number.isNaN(leadChange),
      trendPositive: leadChange >= 0,
      trendValue: Number.isNaN(leadChange) ? "0" : Math.abs(leadChange).toFixed(1),
      trendSuffix: "%",
    },
    {
      title: "Active campaigns",
      value: analyticsData?.activeCampaigns?.toString?.() ?? "0",
      showTrend: !Number.isNaN(campaignChange),
      trendPositive: campaignChange >= 0,
      trendValue: Number.isNaN(campaignChange) ? "0" : Math.abs(campaignChange).toFixed(1),
      trendSuffix: "%",
      subline: analyticsData?.hotLeads ? `${analyticsData.hotLeads} hot leads ready` : hasLeads ? "No hot leads yet" : null,
    },
    {
      title: "Reply rate",
      value: typeof analyticsData?.replyRate === "number" ? `${analyticsData.replyRate.toFixed(1)}%` : "0%",
      showTrend: !Number.isNaN(replyChange),
      trendPositive: replyChange >= 0,
      trendValue: Number.isNaN(replyChange) ? "0" : Math.abs(replyChange).toFixed(1),
      trendSuffix: "pp",
    },
  ];

  const quickActions = [
    {
      key: "leads",
      title: "Manage leads",
      desc: "Import, enrich, and score your pipeline",
      icon: <Icons.Users size={20} strokeWidth={1.5} style={{ color: "#6B7280" }} />,
      onClick: goToLeads,
    },
    {
      key: "campaigns",
      title: "Campaigns",
      desc: "Launch and track outreach",
      icon: <Icons.Rocket size={20} strokeWidth={1.5} style={{ color: "#6B7280" }} />,
      onClick: () => router.push("/campaigns"),
    },
    {
      key: "workspaces",
      title: "Workspaces",
      desc: "Switch organization context",
      icon: <Icons.Folder size={20} strokeWidth={1.5} style={{ color: "#6B7280" }} />,
      onClick: () => router.push("/bases"),
    },
    {
      key: "templates",
      title: "Templates",
      desc: "Reusable message blocks",
      icon: <Icons.FileText size={20} strokeWidth={1.5} style={{ color: "#6B7280" }} />,
      onClick: () => router.push("/templates"),
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
      icon: <Icons.Rocket size={16} strokeWidth={1.5} />,
      onClick: goToCreateCampaign,
    };
  })();

  const greetingText = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const userName = getUser()?.name || "User";

  const setupStepsDone =
    (activeBaseId ? 1 : 0) + (hasLeads ? 1 : 0) + (hasCampaigns ? 1 : 0);
  const setupStepsTotal = 3;
  const setupProgressPct = Math.round((setupStepsDone / setupStepsTotal) * 100);

  const filteredCampaigns = [...(campaigns || [])].sort((a, b) => {
    const aTime = a.updated_at || a.created_at || "";
    const bTime = b.updated_at || b.created_at || "";
    if (aTime && bTime) return bTime.localeCompare(aTime);
    if (aTime && !bTime) return -1;
    if (!aTime && bTime) return 1;
    return (b.id || 0) - (a.id || 0);
  });
  const recentCampaigns = filteredCampaigns.slice(0, 3);

  const dashboardBody =
    activeBaseId && (analyticsLoading || campaignsLoading) ? (
    <GlobalPageLoader layout="embedded" minHeight={480} ariaLabel="Loading dashboard" />
  ) : (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#9CA3AF",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {greetingText}
            </span>
            <button
              type="button"
              onClick={toggleSetupStepper}
              aria-label={
                setupStepperVisible
                  ? "Hide getting started steps (workspace, leads, campaign)"
                  : "Show getting started steps (workspace, leads, campaign)"
              }
              aria-pressed={setupStepperVisible}
              title={
                setupStepperVisible
                  ? "Hide the getting started stepper below"
                  : "Show the getting started stepper: workspace → leads → campaign"
              }
              style={{
                height: 24,
                padding: "0 10px 0 12px",
                borderRadius: 9999,
                border: setupStepperVisible ? "1px solid transparent" : "1px solid #C7D2FE",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                background: setupStepperVisible ? "#4F46E5" : "#EEF2FF",
                color: setupStepperVisible ? "#FFFFFF" : "#4F46E5",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "Inter, -apple-system, sans-serif",
                transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
              }}
            >
              Setup steps
              {setupStepperVisible ? (
                <ChevronUp size={12} strokeWidth={2.25} aria-hidden />
              ) : (
                <ChevronDown size={12} strokeWidth={2.25} aria-hidden />
              )}
            </button>
          </div>
          <span
            style={{
              fontSize: 22,
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
        className="dashboard-stepper-panel-wrap"
        style={{
          overflow: setupStepperVisible ? "visible" : "hidden",
          maxHeight: setupStepperVisible ? 3200 : 0,
          opacity: setupStepperVisible ? 1 : 0,
          transition:
            "max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
          pointerEvents: setupStepperVisible ? "auto" : "none",
        }}
        aria-hidden={!setupStepperVisible}
      >
        <div style={{ paddingBottom: setupStepperVisible ? 2 : 0 }}>
          <DashboardOnboardingSteppers
            activeBaseId={activeBaseId}
            hasLeads={hasLeads}
            hasCampaigns={hasCampaigns}
            onGoWorkspace={() => router.push("/bases")}
            onGoLeads={goToLeads}
            onGoCampaign={goToCreateCampaign}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {overviewMetrics.map((card) => {
          const valueMuted = isMutedMetricValue(String(card.value));
          return (
          <div key={card.title} className="dashboard-stat-card" style={{ padding: "14px 16px 16px" }}>
            <div style={{ marginBottom: 8 }}>
              <span className="dashboard-metric-label" style={{ ...metricLabelStyle, display: "block" }}>
                {card.title}
              </span>
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.12,
                color: valueMuted ? "#64748B" : "#0F172A",
                fontFamily: "Inter, -apple-system, sans-serif",
                wordBreak: "break-word",
              }}
            >
              {card.value}
            </div>
            <div style={{ marginTop: 10, minHeight: 28 }}>
              {card.showTrend ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 8,
                    background: "rgba(243, 244, 246, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.8)",
                    color: card.trendPositive ? "#059669" : "#DC2626",
                  }}
                >
                  {card.trendPositive ? "↑" : "↓"}
                  {card.trendValue}
                  {card.trendSuffix === "pp" ? "pp" : "%"}
                  <span style={{ fontWeight: 500, color: "#6B7280" }}>vs last month</span>
                </span>
              ) : (
                <span
                  className="dashboard-stat-trend-neutral"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 8,
                    background: "rgba(248, 250, 252, 0.95)",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    color: "#64748B",
                  }}
                >
                  <span style={{ opacity: 0.85 }} aria-hidden>
                    →
                  </span>
                  Baseline
                  <span style={{ fontWeight: 500, color: "#94A3B8" }}>· no prior period</span>
                </span>
              )}
            </div>
            {card.subline ? (
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 8, lineHeight: 1.35 }}>{card.subline}</div>
            ) : null}
          </div>
          );
        })}
      </div>

      {invitationSuccess && (
        <div
          className="dashboard-surface-card"
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
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icons.Check size={18} strokeWidth={1.5} style={{ color: "#059669" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Welcome to {invitationSuccess.baseName}</div>
            <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
              You&apos;ve been added as <strong style={{ textTransform: "capitalize", color: "#374151" }}>{invitationSuccess.role}</strong>. This workspace is
              open now — use the workspace switcher anytime to move between this team and your personal one.
            </div>
          </div>
          <button
            type="button"
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
              color: "#9CA3AF",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.background = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9CA3AF";
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="Dismiss"
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div style={sectionLabelStyle}>Campaigns & activity</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: hasCampaigns
            ? "minmax(0, 1fr)"
            : "minmax(260px, 0.95fr) minmax(0, 1.15fr)",
          gap: 14,
          alignItems: "stretch",
        }}
        className="dashboard-campaigns-grid"
      >
        {!hasCampaigns ? (
          <DashboardGetStartedChecklist
            activeBaseId={activeBaseId}
            hasLeads={hasLeads}
            hasCampaigns={hasCampaigns}
            setupStepsDone={setupStepsDone}
            setupStepsTotal={setupStepsTotal}
            setupProgressPct={setupProgressPct}
            onCreateWorkspace={() => router.push("/bases")}
            onAddLeads={goToLeads}
            onCreateCampaign={goToCreateCampaign}
          />
        ) : null}

        <div className="dashboard-surface-card dashboard-recent-activity-panel">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: recentCampaigns.length === 0 ? 0 : 14,
              gap: 10,
              width: "100%",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "#111827" }}>Recent activity</span>
            <button
              type="button"
              className="dashboard-demo-toggle-badge"
              onClick={() => router.push("/campaigns")}
            >
              View all
            </button>
          </div>
          {recentCampaigns.length === 0 ? (
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>No recent campaigns</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, maxWidth: 260 }}>Runs, opens, and replies will appear here once you launch.</div>
            </div>
          ) : (
            <div className="campaigns-page-grid">
              {recentCampaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  baseName={bases.find((b) => b.id === c.base_id)?.name || "Workspace"}
                  onView={() => router.push(`/campaigns/${c.id}`)}
                  showDeleteAction={false}
                  workspaceStyle
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={sectionLabelStyle}>Quick actions</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
        className="quick-actions-row dashboard-quick-actions"
      >
        {quickActions.map((action) => (
          <button key={action.key} type="button" className="dashboard-qa-card" onClick={action.onClick}>
            <span className="dashboard-qa-card-arrow" aria-hidden>
              <ArrowUpRight size={16} strokeWidth={2} />
            </span>
            <div style={{ display: "flex", marginBottom: 8 }}>{action.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "#111827", marginBottom: 4 }}>{action.title}</div>
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>{action.desc}</div>
          </button>
        ))}
      </div>

      {activeBase && !copilotBannerDismissed && analyticsData && analyticsData.hotLeads > 0 && (
        <div
          className="dashboard-surface-card"
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            transition: "box-shadow 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Zap size={18} strokeWidth={1.5} style={{ color: "#4F46E5" }} />
              <div style={{ ...sectionLabelStyle, textTransform: "uppercase" }}>Suggestion</div>
            </div>
            <button
              type="button"
              onClick={() => setCopilotBannerDismissed(true)}
              className="icon-btn"
              style={{ width: 28, height: 28, borderRadius: 8, transition: "background 0.15s ease" }}
              aria-label="Dismiss"
            >
              <Icons.X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
            {analyticsData?.hotLeads || 0} hot leads are ready. Launch a short LinkedIn + Email sequence for faster replies.
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ borderRadius: 8, width: "100%", transition: "background 0.15s ease" }}
            onClick={goToCreateCampaign}
          >
            Use suggestion
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <ProductTour steps={tourSteps} />
      <div className="dashboard-shell" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {dashboardBody}
      </div>
    </>
  );
}
