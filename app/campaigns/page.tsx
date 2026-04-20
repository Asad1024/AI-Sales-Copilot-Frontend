"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { apiRequest } from "@/lib/apiClient";
import { useSocket } from "@/hooks/useSocket";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { CampaignStats } from "./components/CampaignStats";
import { CampaignGrid } from "./components/CampaignGrid";
import { TierBreakdown } from "./components/TierBreakdown";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

const CAMPAIGNS_TIER_INSIGHTS_CACHE_TTL_MS = 2 * 60 * 1000;

export default function CampaignsPage() {
  const router = useRouter();
  const { activeBaseId, bases, refreshBases } = useBaseStore();
  const isBootstrappingWorkspace = !activeBaseId && bases.length === 0;
  const { pagination, setPagination } = useLeadStore();
  const {
    fetchCampaigns,
    hasCacheForBase,
    campaigns,
    filters,
    setFilters,
    getFilteredCampaigns,
    refreshCampaign,
  } = useCampaignStore();
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  /**
   * Gate only first paint when there is no cached campaigns data.
   * If cache exists, render instantly and revalidate in background.
   */
  const [campaignsPageReady, setCampaignsPageReady] = useState(
    () => !activeBaseId || hasCacheForBase(activeBaseId) || campaigns.some((c) => Number(c.base_id) === Number(activeBaseId))
  );
  /** Tier/lead insights should never block initial campaigns render when cached data exists. */
  const [leadsReady, setLeadsReady] = useState(() => !activeBaseId);
  const [tierLeadsForInsights, setTierLeadsForInsights] = useState<any[]>([]);
  
  const socket = useSocket();

  useEffect(() => {
    if (!activeBaseId && bases.length === 0) {
      refreshBases();
    }
  }, [activeBaseId, bases.length, refreshBases]);

  useEffect(() => {
    if (!activeBaseId) {
      setCampaignsPageReady(true);
      setLeadsReady(true);
      setTierLeadsForInsights([]);
      return;
    }
    let cancelled = false;
    const hasCampaignsCache = hasCacheForBase(activeBaseId);
    const hasInMemoryRowsForBase = campaigns.some((c) => Number(c.base_id) === Number(activeBaseId));
    // Instant paint when cache exists; otherwise show loader until first fetch resolves.
    setCampaignsPageReady(hasCampaignsCache || hasInMemoryRowsForBase);

    // Campaigns: stale-while-revalidate via store cache.
    void (async () => {
      try {
        await fetchCampaigns(activeBaseId);
      } catch (e) {
        console.error("[CampaignsPage] campaigns load:", e);
      } finally {
        if (!cancelled) setCampaignsPageReady(true);
      }
    })();

    const insightsCacheKey = `sparkai:campaigns:tier-insights:${activeBaseId}`;
    const now = Date.now();
    let hasFreshInsightsCache = false;
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(insightsCacheKey) : null;
      if (raw) {
        const cached = JSON.parse(raw) as { timestamp?: number; leads?: any[]; totalLeads?: number };
        if (cached?.timestamp && (now - Number(cached.timestamp)) < CAMPAIGNS_TIER_INSIGHTS_CACHE_TTL_MS) {
          const list = Array.isArray(cached?.leads) ? cached.leads : [];
          setTierLeadsForInsights(list);
          if (typeof cached?.totalLeads === "number") {
            const perPage = useLeadStore.getState().pagination.leadsPerPage || 30;
            setPagination({
              totalLeads: cached.totalLeads,
              totalPages: Math.max(1, Math.ceil(cached.totalLeads / perPage)),
            });
          }
          hasFreshInsightsCache = true;
          setLeadsReady(true);
        }
      }
    } catch {
      // ignore cache parsing/storage errors
    }
    if (!hasFreshInsightsCache) setLeadsReady(false);

    // Leads/tier insights: refresh in background (non-blocking for page render).
    void (async () => {
      try {
        const leadsPayload = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
        if (cancelled) return;
        const list = Array.isArray(leadsPayload?.leads)
          ? leadsPayload.leads
          : Array.isArray(leadsPayload)
            ? leadsPayload
            : [];
        setTierLeadsForInsights(list);
        const p = leadsPayload?.pagination;
        if (p && typeof p.total === "number") {
          const perPage = useLeadStore.getState().pagination.leadsPerPage || 30;
          setPagination({
            totalLeads: p.total,
            totalPages: Math.max(1, Math.ceil(p.total / perPage)),
          });
          try {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(
                insightsCacheKey,
                JSON.stringify({
                  timestamp: Date.now(),
                  leads: list,
                  totalLeads: p.total,
                })
              );
            }
          } catch {
            // ignore cache write failures
          }
        }
      } catch (e) {
        console.error("[CampaignsPage] leads insights load:", e);
        if (!cancelled) setTierLeadsForInsights([]);
      } finally {
        if (!cancelled) setLeadsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBaseId, campaigns, fetchCampaigns, hasCacheForBase, setPagination]);

  // Listen for real-time campaign metrics updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleCampaignMetricsUpdate = (data: {
      campaign_id: number;
      event_type: string;
      lead_id?: number;
      timestamp: string;
    }) => {
      console.log('[WebSocket] Campaign metrics updated:', data);
      // Refresh the specific campaign to get updated metrics
      refreshCampaign(data.campaign_id);
    };

    socket.on('campaign:metrics:update', handleCampaignMetricsUpdate);

    return () => {
      socket.off('campaign:metrics:update', handleCampaignMetricsUpdate);
    };
  }, [socket, refreshCampaign]);

  const filteredCampaigns = getFilteredCampaigns();
  const totalLeads = pagination?.totalLeads ?? 0;
  const showNoLeadsBanner = Boolean(activeBaseId) && campaignsPageReady && leadsReady && totalLeads === 0;

  if (isBootstrappingWorkspace) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          width: "100%",
          background: "var(--color-canvas)",
          display: "flex",
          flexDirection: "column",
          padding: "8px clamp(10px, 1.25vw, 20px) 14px",
          gap: 12,
          boxSizing: "border-box",
        }}
      >
        <GlobalPageLoader layout="embedded" minHeight={520} ariaLabel="Loading campaigns" />
      </div>
    );
  }

  if (!activeBaseId) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          width: "100%",
          background: "var(--color-canvas)",
          display: "flex",
          flexDirection: "column",
          padding: "8px clamp(10px, 1.25vw, 20px) 14px",
          gap: 16,
          boxSizing: "border-box",
        }}
      >
        <EmptyStateBanner
          icon={<Icons.Folder size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No Active Workspace"
          description="Please create a workspace to launch and manage campaigns."
          actions={
            <button className="btn-primary" style={{ borderRadius: 8 }} onClick={() => router.push("/bases")}>
              Create a workspace
            </button>
          }
        />
      </div>
    );
  }

  if (!campaignsPageReady) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px)",
          width: "100%",
          background: "var(--color-canvas)",
          display: "flex",
          flexDirection: "column",
          padding: "8px clamp(10px, 1.25vw, 20px) 14px",
          gap: 12,
          boxSizing: "border-box",
        }}
      >
        <GlobalPageLoader layout="embedded" minHeight={520} ariaLabel="Loading campaigns" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 56px)",
      width: "100%",
      background: "var(--color-canvas)",
      display: "flex",
      flexDirection: "column",
      padding: "8px clamp(10px, 1.25vw, 20px) 14px",
      gap: 12,
      boxSizing: "border-box",
    }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260, flexWrap: "wrap" }}>
          <ToolbarSearchField
            variant="minimal"
            value={filters.search}
            onChange={(v) => setFilters({ search: v })}
            placeholder="Search campaigns"
            style={{ minWidth: 260, maxWidth: 640, flex: 1 }}
            aria-label="Search campaigns"
          />
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ToolbarFilterButton variant="minimal" open={showFilterMenu} onClick={() => setShowFilterMenu((v) => !v)} />
            {showFilterMenu && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 90 }}
                onClick={() => setShowFilterMenu(false)}
                aria-hidden="true"
              />
            )}
            {showFilterMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  minWidth: 190,
                  zIndex: 100,
                  borderRadius: 10,
                  border: "1px solid var(--elev-border)",
                  background: "var(--elev-bg)",
                  boxShadow: "var(--elev-shadow-lg)",
                  padding: 6,
                }}
              >
                {[
                  { id: "all", label: "All Status" },
                  { id: "running", label: "Running" },
                  { id: "paused", label: "Paused" },
                  { id: "draft", label: "Draft" },
                  { id: "completed", label: "Completed" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilters({ status: item.id as "all" | "running" | "paused" | "draft" | "completed" });
                      setShowFilterMenu(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "none",
                      background: filters.status === item.id ? "rgba(var(--color-primary-rgb), 0.2)" : "transparent",
                      color: "var(--color-text)",
                      padding: "9px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{item.label}</span>
                    {filters.status === item.id && <Icons.Check size={14} strokeWidth={1.5} style={{ color: "#eeab7a" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!showNoLeadsBanner ? (
          <button
            type="button"
            className="btn-dashboard-outline"
            onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
          >
            <Icons.Plus size={16} strokeWidth={1.5} />
            Create Campaign
          </button>
        ) : null}
      </div>
      {showNoLeadsBanner && (
        <div className="bases-onboarding-hint" role="status">
          <Icons.Users size={20} strokeWidth={1.5} className="bases-onboarding-hint-icon" />
          <div>
            <p className="bases-onboarding-hint-body">
              Your workspace is selected, but there are no leads yet. Add or import leads first, then create
              campaigns from this page.
            </p>
            <button
              type="button"
              className="bases-onboarding-hint-link"
              onClick={() => router.push(`/bases/${activeBaseId}/leads?welcome=1`)}
            >
              Add leads
            </button>
          </div>
        </div>
      )}
      <CampaignStats />
      <TierBreakdown leadsForTiers={tierLeadsForInsights} />
      <CampaignGrid campaigns={filteredCampaigns} allowCreateCampaign={!showNoLeadsBanner} />
    </div>
  );
}
