"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, getUser } from "@/lib/apiClient";
import { shouldRestrictWorkspaceManagement } from "@/lib/billingUi";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { UiSkeleton } from "@/components/ui/AppSkeleton";
import { useWorkspacesStatsQuery, useBasesQuickStatsQuery } from "@/hooks/queries/workspaceQueries";
import { DataRefreshIndicator } from "@/components/ui/DataRefreshIndicator";
import { BaseCard } from "./components/BaseCard";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { PremiumKpiCard, PREMIUM_KPI_GRID_STYLE } from "@/components/ui/PremiumKpiCard";
import type { EnterpriseChartVariant } from "@/components/dashboard/KpiEnterpriseChart";
import { resolveKpiChartValues, type WorkspacesStatsResponse } from "@/lib/kpiStatsApi";
import { getPremiumKpiOverviewChartVariant } from "@/lib/kpiDashboardChartBatches";

type OverviewMetric = {
  title: string;
  value: string;
  note?: string;
  sparkline: number[];
  echartsVariant: EnterpriseChartVariant;
};

function isMutedMetricValue(value: string): boolean {
  const t = value.trim();
  if (t === "—" || t === "") return false;
  if (t === "0" || t === "0%") return true;
  if (/^0\.0+%$/.test(t)) return true;
  const normalized = t.replace(/,/g, "");
  if (normalized === "0%") return true;
  const n = parseFloat(normalized.replace("%", ""));
  return !Number.isNaN(n) && n === 0;
}

export default function BasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const { refreshBases, setActiveBaseId } = useBase();
  const basesFromStore = useBaseStore((s) => s.bases);
  const basesLoading = useBaseStore((s) => s.loading);
  const bases = basesFromStore;
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "with-leads" | "with-campaigns">("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [userRev, setUserRev] = useState(0);
  const workspacesStatsQuery = useWorkspacesStatsQuery();
  const quickStatsQuery = useBasesQuickStatsQuery(bases.length > 0 && !basesLoading);
  const workspaceStats = workspacesStatsQuery.data ?? null;
  const baseQuickStats = useMemo(() => {
    const raw = quickStatsQuery.data?.stats ?? {};
    const out: { [key: number]: { leads: number; campaigns: number; enriched: number; scored: number } } = {};
    for (const b of bases) {
      out[b.id] = raw[b.id] ?? { leads: 0, campaigns: 0, enriched: 0, scored: 0 };
    }
    return out;
  }, [quickStatsQuery.data?.stats, bases]);
  const quickStatsLoading = Boolean(bases.length > 0 && quickStatsQuery.isPending && !quickStatsQuery.data);
  const showWorkspacesRefreshing =
    (workspacesStatsQuery.isFetching && !workspacesStatsQuery.isPending) ||
    (quickStatsQuery.isFetching && !quickStatsQuery.isPending);
  const showWorkspacesKpiSkeleton = Boolean(
    bases.length > 0 && workspacesStatsQuery.isPending && !workspacesStatsQuery.data
  );

  useEffect(() => {
    const sync = () => setUserRev((n) => n + 1);
    window.addEventListener("sparkai:user-changed", sync);
    return () => window.removeEventListener("sparkai:user-changed", sync);
  }, []);

  const restrictWorkspace = useMemo(() => {
    const u = getUser();
    return u ? shouldRestrictWorkspaceManagement(u, basesFromStore, basesLoading) : false;
  }, [userRev, basesFromStore, basesLoading]);

  useEffect(() => {
    const openCreate = () => {
      const u = getUser();
      if (u && shouldRestrictWorkspaceManagement(u, useBaseStore.getState().bases, useBaseStore.getState().loading)) return;
      setShowCreateModal(true);
    };
    window.addEventListener("app:bases-new-workspace", openCreate as EventListener);
    return () => window.removeEventListener("app:bases-new-workspace", openCreate as EventListener);
  }, []);

  async function createBase() {
    const u = getUser();
    if (u && shouldRestrictWorkspaceManagement(u, useBaseStore.getState().bases, useBaseStore.getState().loading)) {
      showError("Not available", "Only a workspace owner can create workspaces.");
      return;
    }
    if (!name.trim()) return;
    const isFirstWorkspace = basesFromStore.length === 0;
    try {
      setLoadingCreate(true);
      const data = await apiRequest("/bases", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, name: name.trim() }),
      });
      setName("");
      setShowCreateModal(false);
      await refreshBases();
      void queryClient.invalidateQueries({ queryKey: ["bases-quick-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces-stats"] });
      const newId = data?.base?.id;
      if (typeof newId === "number" && newId > 0) {
        const nm = typeof data?.base?.name === "string" ? data.base.name.trim() : "";
        setActiveBaseId(newId, nm ? { name: nm } : undefined);
        if (isFirstWorkspace) {
          showSuccess("Workspace created", "Here's what to do next.");
          router.push(`/bases/${newId}/leads?welcome=1&first_workspace=1`);
        } else {
          showSuccess("Workspace created", "Opening Leads — add your contacts here.");
          router.push(`/bases/${newId}/leads?welcome=1`);
        }
      } else {
        showSuccess("Workspace created", "Your new workspace is ready. Open it below to add leads.");
      }
    } catch (e: any) {
      showError("Could not create workspace", e?.message || "Failed to create workspace.");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function renameBase(id: number, newName: string) {
    const u = getUser();
    if (u && shouldRestrictWorkspaceManagement(u, useBaseStore.getState().bases, useBaseStore.getState().loading)) {
      showError("Not available", "You can’t rename workspaces with your account.");
      return;
    }
    try {
      await apiRequest(`/bases/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      await refreshBases();
      void queryClient.invalidateQueries({ queryKey: ["bases-quick-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces-stats"] });
      showSuccess("Workspace updated", "Workspace name changed successfully.");
    } catch (e: any) {
      showError("Rename failed", e?.message || "Failed to rename workspace.");
    }
  }

  async function deleteBase(id: number) {
    const u = getUser();
    if (u && shouldRestrictWorkspaceManagement(u, useBaseStore.getState().bases, useBaseStore.getState().loading)) {
      showError("Not available", "You can’t delete workspaces with your account.");
      return;
    }
    const ok = await confirm({
      title: "Delete workspace?",
      message: "This removes the workspace and related data you are allowed to delete. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/bases/${id}`, { method: 'DELETE' });
      await refreshBases();
      void queryClient.invalidateQueries({ queryKey: ["bases-quick-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces-stats"] });
      showSuccess("Workspace removed", "The workspace was deleted.");
    } catch (e: any) {
      showError("Delete failed", e?.message || "Failed to delete workspace.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = q
      ? bases.filter((b: any) => String(b.name).toLowerCase().includes(q))
      : bases;
    if (filter === "with-leads") {
      return searched.filter((b: any) => (baseQuickStats[b.id]?.leads || 0) > 0);
    }
    if (filter === "with-campaigns") {
      return searched.filter((b: any) => (baseQuickStats[b.id]?.campaigns || 0) > 0);
    }
    return searched;
  }, [bases, search, filter, baseQuickStats]);

  /** Do not use placeholder zeros before quick-stats loads — that falsely showed the onboarding banner. */
  const allVisibleEmpty =
    quickStatsQuery.isSuccess &&
    filtered.length > 0 &&
    filtered.every((b: { id: number }) => {
      const s = baseQuickStats[b.id];
      return s !== undefined && s.leads === 0 && s.campaigns === 0;
    });

  const totals = useMemo(() => {
    let leads = 0;
    let campaigns = 0;
    let enriched = 0;
    let scored = 0;
    for (const b of filtered) {
      const s = baseQuickStats[b.id] || { leads: 0, campaigns: 0, enriched: 0, scored: 0 };
      leads += Number(s.leads || 0);
      campaigns += Number(s.campaigns || 0);
      enriched += Number(s.enriched || 0);
      scored += Number(s.scored || 0);
    }
    return { leads, campaigns, enriched, scored };
  }, [filtered, baseQuickStats]);

  const overviewMetrics: OverviewMetric[] = useMemo(() => {
    const flat = Array.from({ length: 7 }, () => 0);
    const s = workspaceStats;
    if (!s) {
      return [
        {
          title: "Total workspaces",
          value: "—",
          note: "Loading…",
          sparkline: flat,
          echartsVariant: getPremiumKpiOverviewChartVariant(0),
        },
        {
          title: "Workspace leads",
          value: "—",
          note: "Loading…",
          sparkline: flat,
          echartsVariant: getPremiumKpiOverviewChartVariant(1),
        },
        {
          title: "Active campaigns",
          value: "—",
          note: "Loading…",
          sparkline: flat,
          echartsVariant: getPremiumKpiOverviewChartVariant(2),
        },
        {
          title: "Enriched leads",
          value: "—",
          note: "Loading…",
          sparkline: flat,
          echartsVariant: getPremiumKpiOverviewChartVariant(3),
        },
      ];
    }
    return [
      {
        title: "Total workspaces",
        value: String(Math.round(s.totalWorkspaces.current)),
        note: "Workspaces you can access",
        sparkline: resolveKpiChartValues(
          s.totalWorkspaces.chartSeries,
          s.totalWorkspaces.snapshots,
          s.totalWorkspaces.current
        ),
        echartsVariant: getPremiumKpiOverviewChartVariant(0),
      },
      {
        title: "Workspace leads",
        value: Math.round(s.workspaceLeads.current).toLocaleString(),
        note: "Leads across those workspaces",
        sparkline: resolveKpiChartValues(
          s.workspaceLeads.chartSeries,
          s.workspaceLeads.snapshots,
          s.workspaceLeads.current
        ),
        echartsVariant: getPremiumKpiOverviewChartVariant(1),
      },
      {
        title: "Active campaigns",
        value: Math.round(s.activeCampaigns.current).toLocaleString(),
        note: "Running or active campaigns",
        sparkline: resolveKpiChartValues(
          s.activeCampaigns.chartSeries,
          s.activeCampaigns.snapshots,
          s.activeCampaigns.current
        ),
        echartsVariant: getPremiumKpiOverviewChartVariant(2),
      },
      {
        title: "Enriched leads",
        value: Math.round(s.enrichedLeads.current).toLocaleString(),
        note: "Contacts with enrichment data",
        sparkline: resolveKpiChartValues(
          s.enrichedLeads.chartSeries,
          s.enrichedLeads.snapshots,
          s.enrichedLeads.current
        ),
        echartsVariant: getPremiumKpiOverviewChartVariant(3),
      },
    ];
  }, [workspaceStats]);

  if (basesLoading && bases.length === 0) {
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
        aria-busy="true"
        aria-label="Loading workspaces"
      >
        <UiSkeleton height={44} width="100%" style={{ maxWidth: 420 }} radius={10} />
        <div style={{ ...PREMIUM_KPI_GRID_STYLE, marginTop: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-page-card" style={{ minHeight: 118, display: "flex", flexDirection: "column", gap: 8 }}>
              <UiSkeleton height={10} width="50%" />
              <UiSkeleton height={22} width="35%" />
              <UiSkeleton height={40} width="100%" style={{ marginTop: "auto" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-page-card" style={{ minHeight: 200, display: "flex", flexDirection: "column", gap: 12 }}>
              <UiSkeleton height={16} width="70%" />
              <UiSkeleton height={12} width="45%" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 8 }}>
                <UiSkeleton height={48} />
                <UiSkeleton height={48} />
                <UiSkeleton height={48} />
                <UiSkeleton height={48} />
              </div>
            </div>
          ))}
        </div>
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
      {/* Main content */}
      <div style={{ width: "100%" }}>
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
              value={search}
              onChange={setSearch}
              placeholder="Search workspaces"
              style={{ minWidth: 280, maxWidth: 640, flex: 1 }}
              aria-label="Search workspaces"
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
                    minWidth: 180,
                    zIndex: 100,
                    borderRadius: 10,
                    border: "1px solid var(--elev-border)",
                    background: "var(--elev-bg)",
                    boxShadow: "var(--elev-shadow-lg)",
                    padding: 6,
                  }}
                >
                  {[
                    { id: "all", label: "All Workspaces" },
                    { id: "with-leads", label: "With Leads" },
                    { id: "with-campaigns", label: "With Campaigns" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilter(item.id as "all" | "with-leads" | "with-campaigns");
                        setShowFilterMenu(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "none",
                        background: filter === item.id ? "rgba(var(--color-primary-rgb), 0.2)" : "transparent",
                        color: "var(--color-text)",
                        padding: "9px 10px",
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{item.label}</span>
                      {filter === item.id && <Icons.Check size={14} strokeWidth={1.5} style={{ color: "#eeab7a" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <DataRefreshIndicator show={showWorkspacesRefreshing} />
            {!restrictWorkspace ? (
              <button
                type="button"
                className="btn-dashboard-outline"
                onClick={() => setShowCreateModal(true)}
              >
                <Icons.Plus size={16} strokeWidth={1.5} />
                New Workspace
              </button>
            ) : null}
          </div>
        </div>

        {allVisibleEmpty && (
          <div className="bases-onboarding-hint" role="status">
            <Icons.Folder size={20} strokeWidth={1.5} className="bases-onboarding-hint-icon" />
            <div>
              <p className="bases-onboarding-hint-body">
                Your workspace is ready. Use <strong>Add leads</strong> on a card to import contacts, then{" "}
                <strong>Create campaign</strong> to start outreach. The dashboard checklist also tracks these steps.
              </p>
              <button type="button" className="bases-onboarding-hint-link" onClick={() => router.push("/dashboard")}>
                Go to dashboard
              </button>
            </div>
          </div>
        )}

        {filtered.length > 0 &&
          (showWorkspacesKpiSkeleton ? (
            <div style={{ ...PREMIUM_KPI_GRID_STYLE, marginBottom: 12 }} aria-busy="true" aria-label="Loading workspace metrics">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-page-card" style={{ minHeight: 118, display: "flex", flexDirection: "column", gap: 8 }}>
                  <UiSkeleton height={10} width="50%" />
                  <UiSkeleton height={22} width="35%" />
                  <UiSkeleton height={40} width="100%" style={{ marginTop: "auto" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...PREMIUM_KPI_GRID_STYLE, marginBottom: 12 }}>
              {overviewMetrics.map((card) => {
                const valueMuted = isMutedMetricValue(String(card.value));
                return (
                  <PremiumKpiCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    valueMuted={valueMuted}
                    note={card.note}
                    sparklineValues={card.sparkline}
                    echartsVariant={card.echartsVariant}
                  />
                );
              })}
            </div>
          ))}

        {/* Empty state */}
        {bases.length === 0 && (
          <EmptyStateBanner
            icon={<Icons.Folder size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
            title="No workspaces yet"
            description="Workspaces help you organize your leads and campaigns. Create your first one to get started."
            actions={
              !restrictWorkspace ? (
                <button type="button" onClick={() => setShowCreateModal(true)} className="btn-dashboard-outline">
                  Create a workspace
                </button>
              ) : undefined
            }
          />
        )}

        {/* No results */}
        {filtered.length === 0 && bases.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <Icons.Search size={18} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No workspaces matching "{search}"</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((b: any) => (
              <BaseCard
                key={b.id}
                base={b}
                stats={baseQuickStats[b.id] || { leads: 0, campaigns: 0, enriched: 0, scored: 0 }}
                isLoading={quickStatsLoading}
                onRename={renameBase}
                onDelete={deleteBase}
                restrictWorkspaceChrome={restrictWorkspace}
                onSetActive={(id) => {
                  const b = bases.find((x) => x.id === id);
                  setActiveBaseId(id, b ? { name: b.name } : undefined);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && !restrictWorkspace && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: "rgba(0,0,0,0.48)",
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: "center",
            /* Above PageHeader (z-index 450) so title bar is covered by the overlay */
            zIndex: 5000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{ 
              background: 'var(--elev-bg)', 
              borderRadius: 14, 
              padding: '24px', 
              border: '1px solid var(--elev-border)',
              width: '100%', 
              maxWidth: '420px', 
              margin: '20px',
              boxShadow: 'var(--elev-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: 'var(--color-text)' }}>
              Create a workspace
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
              A workspace is a collection of leads, campaigns, and analytics.
            </p>
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)', marginBottom: '6px' }}>
              Workspace name
            </label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Q4 Sales Outreach" 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                fontSize: '14px', 
                border: '1px solid var(--color-border)', 
                borderRadius: '6px', 
                marginBottom: '20px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none'
              }}
              autoFocus
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && name.trim()) createBase(); 
                if (e.key === 'Escape') setShowCreateModal(false); 
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCreateModal(false)} 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px', 
                  background: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  color: 'var(--color-text)' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={createBase} 
                disabled={loadingCreate || !name.trim()}
                style={{ 
                  padding: '8px 20px', 
                  fontSize: '14px', 
                  background: loadingCreate || !name.trim() ? 'rgba(var(--color-primary-rgb), 0.2)' : 'var(--color-primary)', 
                  color: 'var(--color-text-inverse)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: loadingCreate || !name.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingCreate ? 'Creating...' : 'Create workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
