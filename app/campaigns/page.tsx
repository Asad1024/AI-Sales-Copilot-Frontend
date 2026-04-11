"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
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

export default function CampaignsPage() {
  const router = useRouter();
  const { activeBaseId, bases, refreshBases } = useBaseStore();
  const { pagination, fetchLeads } = useLeadStore();
  const { 
    loading, 
    fetchCampaigns, 
    filters,
    setFilters,
    getFilteredCampaigns,
    refreshCampaign 
  } = useCampaignStore();
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const socket = useSocket();

  useEffect(() => {
    if (!activeBaseId && bases.length === 0) {
      refreshBases();
    }
  }, [activeBaseId, bases.length, refreshBases]);

  // Fetch campaigns when base changes
  useEffect(() => {
    fetchCampaigns(activeBaseId);
  }, [activeBaseId, fetchCampaigns]);

  // Ensure lead totals are available for "add leads first" guidance.
  useEffect(() => {
    if (!activeBaseId) return;
    fetchLeads(activeBaseId, 1, 1);
  }, [activeBaseId, fetchLeads]);

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
  const showNoLeadsBanner = Boolean(activeBaseId) && totalLeads === 0;

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
                      background: filters.status === item.id ? "rgba(124, 58, 237,0.12)" : "transparent",
                      color: "var(--color-text)",
                      padding: "9px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{item.label}</span>
                    {filters.status === item.id && <Icons.Check size={14} strokeWidth={1.5} style={{ color: "#818cf8" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn-dashboard-outline"
          onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
        >
          <Icons.Plus size={16} strokeWidth={1.5} />
          Create Campaign
        </button>
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
      {activeBaseId && loading ? (
        <GlobalPageLoader layout="embedded" minHeight={520} ariaLabel="Loading campaigns" />
      ) : (
        <>
          <CampaignStats />
          <TierBreakdown />
          <CampaignGrid campaigns={filteredCampaigns} />
        </>
      )}
    </div>
  );
}
