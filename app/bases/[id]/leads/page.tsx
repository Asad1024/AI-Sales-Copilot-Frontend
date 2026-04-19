"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { API_BASE } from "@/lib/api";
import { getToken, apiRequest } from "@/lib/apiClient";
import { FirstWorkspaceSuccessModal } from "@/components/ui/FirstWorkspaceSuccessModal";
import { LeadsToolbar } from "@/app/leads/components/LeadsToolbar";
import { BulkActionsMenu } from "@/app/leads/components/BulkActionsMenu";
import { DynamicLeadsTable } from "@/app/leads/components/DynamicLeadsTable";
import { useViewStore } from "@/stores/useViewStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";
import { LeadsImportEmptyGrid } from "@/app/leads/components/LeadsImportEmptyGrid";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { leadHasAsyncContactEnrichResult } from "@/lib/contactEnrichmentStatus";

const EnhancedCsvImportModal = dynamic(() => import("@/components/leads/EnhancedCsvImportModal").then(m => ({ default: m.EnhancedCsvImportModal })), { ssr: false });
const AIGenerateModal = dynamic(() => import("@/components/leads/AIGenerateModal"), { ssr: false });
const CRMImportModal = dynamic(() => import("@/components/leads/CRMImportModal"), { ssr: false });
const AirtableImportModal = dynamic(() => import("@/components/leads/AirtableImportModal").then(m => ({ default: m.AirtableImportModal })), { ssr: false });
const GoogleSheetsImportModal = dynamic(
  () => import("@/components/leads/GoogleSheetsImportModal").then((m) => ({ default: m.GoogleSheetsImportModal })),
  { ssr: false },
);
const LeadDrawer = dynamic(() => import("@/components/leads/LeadDrawer"), { ssr: false });
const SchemaSidebar = dynamic(() => import("@/app/leads/components/SchemaSidebar").then(m => ({ default: m.SchemaSidebar })), { ssr: false });
const EnrichModal = dynamic(() => import("@/components/leads/EnrichModal").then(m => ({ default: m.EnrichModal })), { ssr: false });
const AddLinkedInLeadModal = dynamic(
  () => import("@/components/leads/AddLinkedInLeadModal").then((m) => ({ default: m.AddLinkedInLeadModal })),
  { ssr: false },
);
export default function BaseLeadsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const baseId = params?.id ? parseInt(params.id as string) : null;
  const { bases, setActiveBaseId, refreshBases } = useBaseStore();
  const { activeBaseId } = useBaseStore();
  const { 
    leads, 
    loading, 
    selectedLeads,
    pagination,
    drawerLead,
    drawerOpen,
    fetchLeads,
    getFilteredLeads,
    setDrawerLead,
    setDrawerOpen,
    setSelectedLeads,
    bulkDeleteLeads,
    updateLead,
    clearCache,
    setPagination,
    filters: leadFilters,
  } = useLeadStore();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { fetchViews } = useViewStore();
  const { permissions, loading: permissionsLoading } = useBasePermissions(baseId || activeBaseId);
  
  const [importOpen, setImportOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [airtableImportOpen, setAirtableImportOpen] = useState(false);
  const [sheetsImportOpen, setSheetsImportOpen] = useState(false);
  const [connectorImportMeta, setConnectorImportMeta] = useState<{ airtable: boolean; sheets: boolean }>({
    airtable: false,
    sheets: false,
  });
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [linkedInOpen, setLinkedInOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [showSchemaSidebar, setShowSchemaSidebar] = useState(false);
  const [pendingEnrichmentLeadIds, setPendingEnrichmentLeadIds] = useState<number[]>([]);
  /** Shown only after FullEnrich webhook (socket): refresh grid + workspace credits once. */
  const [enrichmentRefreshing, setEnrichmentRefreshing] = useState(false);
  /** Dedupe rapid duplicate socket + window events for the same completion. */
  const lastEnrichmentEventAtRef = useRef(0);
  /** Debounced toolbar search — server GET /leads?search=… searches all rows, not only the current page. */
  const [debouncedLeadSearch, setDebouncedLeadSearch] = useState(
    () => useLeadStore.getState().filters.search?.trim() || ""
  );
  const prevDebouncedSearchRef = useRef<string | null>(null);
  /** Wall-clock seconds while any contact enrichment is pending (resets when queue empties). */
  const enrichmentBannerStartedAtRef = useRef<number | null>(null);
  const [enrichmentBannerElapsedSec, setEnrichmentBannerElapsedSec] = useState(0);
  const [firstWorkspaceModalOpen, setFirstWorkspaceModalOpen] = useState(false);

  const enrichmentQueueProgress = useMemo(() => {
    const ids = pendingEnrichmentLeadIds;
    if (ids.length === 0) return null;
    let done = 0;
    for (const pid of ids) {
      const row = leads.find((r) => Number(r.id) === Number(pid));
      if (row && leadHasAsyncContactEnrichResult(row.enrichment)) done += 1;
    }
    const total = ids.length;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    return { done, total, pct, remaining: total - done };
  }, [pendingEnrichmentLeadIds, leads]);

  const enrichmentBannerActive = pendingEnrichmentLeadIds.length > 0;
  useEffect(() => {
    if (!enrichmentBannerActive) {
      enrichmentBannerStartedAtRef.current = null;
      setEnrichmentBannerElapsedSec(0);
      return;
    }
    if (enrichmentBannerStartedAtRef.current == null) {
      enrichmentBannerStartedAtRef.current = Date.now();
    }
    const tick = () => {
      const start = enrichmentBannerStartedAtRef.current;
      if (start == null) return;
      setEnrichmentBannerElapsedSec(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enrichmentBannerActive]);

  const filteredLeads = getFilteredLeads();
  const currentBaseId = baseId || activeBaseId;
  const showWelcomeHint = searchParams.get("welcome") === "1";
  const firstWorkspaceCelebration = searchParams.get("first_workspace") === "1";

  useEffect(() => {
    if (!baseId || !firstWorkspaceCelebration) return;
    setFirstWorkspaceModalOpen(true);
  }, [baseId, firstWorkspaceCelebration]);

  const handleFirstWorkspaceModalAddLeads = () => {
    setFirstWorkspaceModalOpen(false);
    if (!baseId) return;
    const p = new URLSearchParams(searchParams.toString());
    p.delete("first_workspace");
    const next = p.toString();
    router.replace(`/bases/${baseId}/leads${next ? `?${next}` : ""}`, { scroll: false });
  };

  const handleFirstWorkspaceModalDashboard = () => {
    setFirstWorkspaceModalOpen(false);
    if (baseId) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("first_workspace");
      const next = p.toString();
      router.replace(`/bases/${baseId}/leads${next ? `?${next}` : ""}`, { scroll: false });
    }
    router.push("/dashboard");
  };
  const workspaceName = bases.find((b) => b.id === currentBaseId)?.name ?? "";
  const showZeroLeadsBanner =
    Boolean(baseId) && !loading && !permissionsLoading && pagination.totalLeads === 0;

  useEffect(() => {
    const syncBaseFromUrl = async () => {
      if (!baseId) {
        if (activeBaseId) {
          router.replace(`/bases/${activeBaseId}/leads`);
        } else if (bases.length > 0) {
          router.replace(`/bases/${bases[0].id}/leads`);
        } else {
          router.replace("/bases");
        }
        return;
      }

      if (bases.length === 0) {
        await refreshBases();
      }

      const baseExists = bases.find(b => b.id === baseId);
      if (!baseExists && bases.length > 0) {
        router.replace("/bases");
        return;
      }

      if (baseId !== activeBaseId) {
        const b = useBaseStore.getState().bases.find((x) => x.id === baseId);
        setActiveBaseId(baseId, b ? { name: b.name } : undefined);
      }
    };

    syncBaseFromUrl();
  }, [baseId, activeBaseId, bases, setActiveBaseId, router, refreshBases]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedLeadSearch((leadFilters.search || "").trim());
    }, 400);
    return () => window.clearTimeout(id);
  }, [leadFilters.search]);

  useEffect(() => {
    if (!currentBaseId) return;
    if (prevDebouncedSearchRef.current === null) {
      prevDebouncedSearchRef.current = debouncedLeadSearch;
      return;
    }
    if (prevDebouncedSearchRef.current !== debouncedLeadSearch) {
      prevDebouncedSearchRef.current = debouncedLeadSearch;
      setPagination({ currentPage: 1 });
    }
  }, [currentBaseId, debouncedLeadSearch, setPagination]);

  useEffect(() => {
    if (!currentBaseId) return;
    fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage, false, {
      search: debouncedLeadSearch,
    });
  }, [currentBaseId, pagination.currentPage, pagination.leadsPerPage, debouncedLeadSearch, fetchLeads]);

  useEffect(() => {
    if (currentBaseId) {
      fetchViews(currentBaseId);
    }
  }, [currentBaseId, fetchViews]);

  /** After connector imports, read fresh pagination from the store (avoids stale closure) and force-fetch page 1 when the table was empty. */
  const refreshLeadsAfterImport = useCallback(async () => {
    if (!currentBaseId) return;
    clearCache(currentBaseId);
    const { pagination: pag, setPagination: setPag, fetchLeads: fetchL } = useLeadStore.getState();
    const targetPage = pag.totalLeads === 0 ? 1 : pag.currentPage;
    if (pag.totalLeads === 0) setPag({ currentPage: 1 });
    await fetchL(currentBaseId, targetPage, pag.leadsPerPage, true);
  }, [currentBaseId, clearCache]);

  const loadImportConnectors = useCallback(async () => {
    if (!currentBaseId) {
      setConnectorImportMeta({ airtable: false, sheets: false });
      return;
    }
    const qs = `?base_id=${encodeURIComponent(String(currentBaseId))}`;
    try {
      const [intRes, vaultRes] = await Promise.all([
        apiRequest(`/integrations${qs}`),
        apiRequest(`/me/connector-vault${qs}`),
      ]);
      const integrations = intRes?.integrations || [];
      const airtable = integrations.some(
        (i: { provider?: string; config?: { api_key?: string } }) =>
          i.provider === "airtable" && Boolean(i.config?.api_key),
      );
      const gs = vaultRes?.vault?.googleSheets;
      const sheets = Boolean(
        (gs?.spreadsheetId || "").trim() &&
          (gs?.sheetName || "").trim() &&
          (gs?.apiKey || "").includes("***"),
      );
      setConnectorImportMeta({ airtable, sheets });
    } catch {
      setConnectorImportMeta({ airtable: false, sheets: false });
    }
  }, [currentBaseId]);

  useEffect(() => {
    if (!currentBaseId) return;
    void loadImportConnectors();
  }, [currentBaseId, loadImportConnectors]);

  useEffect(() => {
    if (!currentBaseId) return;

    const onEnrichmentCompleted = (ev: Event) => {
      const notification = (ev as CustomEvent<{ type?: string; metadata?: Record<string, unknown> }>).detail;
      if (!notification || notification.type !== "enrichment_completed") return;

      const notificationBaseId = notification.metadata?.base_id;
      const notificationBaseIds = notification.metadata?.base_ids;
      const cur = Number(currentBaseId);
      const isForCurrentBase =
        Number(notificationBaseId) === cur ||
        (Array.isArray(notificationBaseIds) &&
          notificationBaseIds.some((bid: unknown) => Number(bid) === cur));

      if (!isForCurrentBase) return;

      const now = Date.now();
      if (now - lastEnrichmentEventAtRef.current < 1200) return;
      lastEnrichmentEventAtRef.current = now;

      const count =
        Number(notification.metadata?.enriched_count) ||
        Number(notification.metadata?.updated_count) ||
        0;

      clearCache(currentBaseId);

      void (async () => {
        setEnrichmentRefreshing(true);
        try {
          const { pagination: pag } = useLeadStore.getState();
          await fetchLeads(currentBaseId, pag.currentPage, pag.leadsPerPage, true, { quiet: true });
          useLeadStore.getState().syncDrawerLeadFromRows();
          setPendingEnrichmentLeadIds([]);
          await refreshBases();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sparkai:active-base-changed"));
          }
        } finally {
          setEnrichmentRefreshing(false);
        }
        showSuccess(
          "Enrich successfully",
          count > 0
            ? `${count} lead(s) now have updated contact details.`
            : "Your lead list has been refreshed."
        );
      })();
    };

    window.addEventListener("sparkai:enrichment-completed", onEnrichmentCompleted as EventListener);
    return () => {
      window.removeEventListener("sparkai:enrichment-completed", onEnrichmentCompleted as EventListener);
    };
  }, [currentBaseId, fetchLeads, clearCache, showSuccess, refreshBases]);

  useEffect(() => {
    setPendingEnrichmentLeadIds([]);
    setEnrichmentRefreshing(false);
  }, [currentBaseId]);

  /**
   * If the realtime notification was missed, drop pending rows once fetched leads show a webhook completion stamp.
   * If a pending id is not on the current page, remove it so "Processing" badges do not stick when paginated.
   */
  useEffect(() => {
    setPendingEnrichmentLeadIds((prev) => {
      if (prev.length === 0) return prev;
      const rows = useLeadStore.getState().leads;
      const next = prev.filter((pid) => {
        const row = rows.find((r) => Number(r.id) === Number(pid));
        if (!row) return false;
        return !leadHasAsyncContactEnrichResult(row.enrichment);
      });
      return next.length === prev.length ? prev : next;
    });
  }, [leads]);

  const handleEnrich = () => {
    if (!currentBaseId) {
      showWarning("Select a workspace", "Choose a base first.");
      return;
    }
    if (leads.length === 0) {
      showInfo("No leads", "Add or generate leads before enriching.");
      return;
    }
    setShowEnrichModal(true);
  };

  const handleExportCSV = async () => {
    if (!currentBaseId) {
      showWarning("Select a workspace", "Choose a base first.");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError("Export failed", "Please sign in to export.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/leads/export?base_id=${currentBaseId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.error || errorData.message || "Export failed");
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `leads_export_${currentBaseId}_${Date.now()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess("Export ready", "CSV downloaded.");
    } catch (error: any) {
      console.error("Export error:", error);
      showError("Export failed", error?.message || "Could not export leads.");
    }
  };

  useEffect(() => {
    const handleImportCsv = () => setImportOpen(true);
    const handleAddLead = () => setGenOpen(true);
    window.addEventListener("app:leads-import-csv", handleImportCsv as EventListener);
    window.addEventListener("app:leads-add", handleAddLead as EventListener);
    return () => {
      window.removeEventListener("app:leads-import-csv", handleImportCsv as EventListener);
      window.removeEventListener("app:leads-add", handleAddLead as EventListener);
    };
  });

  const handleBulkDelete = async (ids: number[]) => {
    if (ids.length === 0 || !currentBaseId) return;
    try {
      await bulkDeleteLeads(ids);
      setSelectedLeads([]);
      await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
      showSuccess("Deleted", `${ids.length} lead(s) removed.`);
    } catch (error: any) {
      showError("Delete failed", error?.message || "Could not delete leads.");
    }
  };

  const handleBulkUpdate = async (ids: number[], updates: any) => {
    if (ids.length === 0 || !currentBaseId) return;
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const leadId of ids) {
        try {
          await updateLead(leadId, updates);
          successCount++;
        } catch (error) {
          console.error(`Failed to update lead ${leadId}:`, error);
          errorCount++;
        }
      }
      
      setSelectedLeads([]);
      await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
      
      if (errorCount > 0) {
        showWarning("Partial update", `${successCount} updated, ${errorCount} failed.`);
      } else {
        showSuccess("Updated", `${successCount} lead(s) updated.`);
      }
    } catch (error: any) {
      showError("Bulk update failed", error?.message || "Could not update leads.");
    }
  };

  if (!baseId || (bases.length > 0 && !bases.find(b => b.id === baseId))) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "var(--color-canvas)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--color-text-muted)" }}>
          <Icons.Loader size={20} strokeWidth={1.5} style={{ animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading workspace…</span>
        </div>
      </div>
    );
  }

  const cardStyle: CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    boxShadow: "0 4px 24px var(--color-shadow)",
    /** Let toolbar menus/panels paint outside; table area clips below. */
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  };

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
      <FirstWorkspaceSuccessModal
        open={firstWorkspaceModalOpen && Boolean(baseId)}
        workspaceName={workspaceName}
        onAddLeads={handleFirstWorkspaceModalAddLeads}
        onViewDashboard={handleFirstWorkspaceModalDashboard}
      />
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {showZeroLeadsBanner && (
        <div className="bases-onboarding-hint" role="status">
          <Icons.Users size={20} strokeWidth={1.5} className="bases-onboarding-hint-icon" aria-hidden />
          <div>
            <p className="bases-onboarding-hint-body">
              {showWelcomeHint ? (
                <>
                  Welcome — add people to <strong>{workspaceName || "this workspace"}</strong> to run campaigns and
                  enrichment. Use <strong>Add</strong> in the toolbar for generate, import, or LinkedIn.
                </>
              ) : (
                <>
                  Your workspace is selected, but there are no leads yet. Add or import contacts first — use{" "}
                  <strong>Add</strong> in the toolbar (Generate with AI, CSV, Sheets, and more).
                </>
              )}
            </p>
            {permissions.canCreateLeads ? (
              <button type="button" className="bases-onboarding-hint-link" onClick={() => setGenOpen(true)}>
                Add leads
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "In workspace",
            value: pagination.totalLeads,
            hint: "Total records",
            icon: <Icons.Users size={18} strokeWidth={1.5} />,
          },
          {
            label: "On this page",
            value: filteredLeads.length,
            hint: "After filters",
            icon: <Icons.List size={18} strokeWidth={1.5} />,
          },
          {
            label: "Selected",
            value: selectedLeads.length,
            hint: "Bulk actions",
            icon: <Icons.CheckCircle size={18} strokeWidth={1.5} />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              boxShadow: "0 1px 2px var(--color-shadow)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(37, 99, 235, 0.12)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", marginTop: 4, lineHeight: 1 }}>
                {stat.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{stat.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Enrichment in progress */}
      {pendingEnrichmentLeadIds.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            borderRadius: 14,
            padding: "14px 18px",
            border: "1px solid rgba(37, 99, 235, 0.35)",
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, rgba(6, 182, 212, 0.08) 100%)",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            boxShadow: "0 8px 30px rgba(37, 99, 235, 0.12)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icons.Loader size={22} strokeWidth={2} style={{ color: "var(--color-primary)", animation: "spin 0.9s linear infinite" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
              Finding contact details
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              {enrichmentQueueProgress
                ? `${enrichmentQueueProgress.remaining} lead(s) still updating. Results appear as each row finishes (table may refresh briefly when all complete).`
                : `${pendingEnrichmentLeadIds.length} lead(s) are being updated.`}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {enrichmentBannerElapsedSec}s
            </div>
          </div>
        </div>
      )}

      {/* Main workspace card */}
      <div style={{ ...cardStyle, flex: 1 }}>
      <LeadsToolbar
        variant="embedded"
        onEnrich={handleEnrich}
        onImportSheets={
          permissions.canCreateLeads && connectorImportMeta.sheets ? () => setSheetsImportOpen(true) : undefined
        }
        onImportAirtable={
          permissions.canCreateLeads && connectorImportMeta.airtable ? () => setAirtableImportOpen(true) : undefined
        }
        onGenerateAI={() => setGenOpen(true)}
        onSchemaClick={() => setShowSchemaSidebar(true)}
        onExportCSV={handleExportCSV}
        onImportCSV={() => setImportOpen(true)}
        onAddFromLinkedIn={permissions.canCreateLeads ? () => setLinkedInOpen(true) : undefined}
      />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            padding: "0 0 10px",
            overflow: "hidden",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          {loading || permissionsLoading ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 4px" }}>
              <GlobalPageLoader layout="embedded" fill ariaLabel="Loading leads" />
            </div>
          ) : enrichmentRefreshing ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 4px" }}>
              <GlobalPageLoader layout="embedded" fill ariaLabel="Loading leads" />
            </div>
          ) : leads.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 16px" }}>
              <LeadsImportEmptyGrid
                canCreateLeads={permissions.canCreateLeads}
                sheetsConnected={connectorImportMeta.sheets}
                airtableConnected={connectorImportMeta.airtable}
                onGenerateAI={() => setGenOpen(true)}
                onImportCSV={() => setImportOpen(true)}
                onImportSheets={
                  permissions.canCreateLeads && connectorImportMeta.sheets ? () => setSheetsImportOpen(true) : undefined
                }
                onImportAirtable={
                  permissions.canCreateLeads && connectorImportMeta.airtable ? () => setAirtableImportOpen(true) : undefined
                }
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                padding: "0 4px",
                position: "relative",
              }}
            >
              <DynamicLeadsTable
                embedded
                leads={filteredLeads}
                pendingLeadIds={pendingEnrichmentLeadIds}
                onLeadClick={(lead) => {
                  setDrawerLead(lead);
                  setDrawerOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <SchemaSidebar isOpen={showSchemaSidebar} onClose={() => setShowSchemaSidebar(false)} />

      {selectedLeads.length > 0 && (
        <BulkActionsMenu
          baseId={currentBaseId}
          selectedCount={selectedLeads.length}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
          onClose={() => setSelectedLeads([])}
        />
      )}

      <EnhancedCsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          void refreshLeadsAfterImport();
        }}
      />
      {currentBaseId && (
        <AddLinkedInLeadModal
          open={linkedInOpen}
          onClose={() => setLinkedInOpen(false)}
          baseId={currentBaseId}
          onCreated={async (lead) => {
            await refreshLeadsAfterImport();
            setDrawerLead(lead as any);
            setDrawerOpen(true);
          }}
        />
      )}
      <AIGenerateModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onGenerated={() => {
          setGenOpen(false);
          void refreshLeadsAfterImport();
        }}
        onAsyncEnrichmentStarted={({ leadIds }) => {
          setPendingEnrichmentLeadIds((current) => {
            const next = new Set(current);
            leadIds.forEach((id) => next.add(id));
            return Array.from(next);
          });
        }}
      />
      <CRMImportModal 
        open={crmOpen}
        onClose={() => setCrmOpen(false)}
        onImported={() => {
          setCrmOpen(false);
          void refreshLeadsAfterImport();
        }}
        onOpenAirtableImport={() => setAirtableImportOpen(true)}
        targetBaseId={currentBaseId || undefined}
      />
      {currentBaseId && (
        <AirtableImportModal
          open={airtableImportOpen}
          onClose={() => setAirtableImportOpen(false)}
          onImported={() => {
            setAirtableImportOpen(false);
            void loadImportConnectors();
            void refreshLeadsAfterImport();
          }}
          targetBaseId={currentBaseId}
        />
      )}
      {currentBaseId && (
        <GoogleSheetsImportModal
          open={sheetsImportOpen}
          onClose={() => setSheetsImportOpen(false)}
          onImported={() => {
            setSheetsImportOpen(false);
            void loadImportConnectors();
            void refreshLeadsAfterImport();
          }}
          targetBaseId={currentBaseId}
        />
      )}
      {drawerOpen && drawerLead && (
        <LeadDrawer 
          lead={drawerLead}
          contactEnrichmentPending={(() => {
            const id = Number(drawerLead.id);
            const inPending = pendingEnrichmentLeadIds.some((x) => Number(x) === id);
            const row = leads.find((l) => Number(l.id) === id);
            const enrichment = (row ?? drawerLead).enrichment;
            return inPending && !leadHasAsyncContactEnrichResult(enrichment);
          })()}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerLead(null);
          }}
          onEnrich={async () => {
            if (drawerLead && currentBaseId) {
              await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
            }
          }}
        />
      )}

      <EnrichModal
        open={showEnrichModal}
        onClose={() => setShowEnrichModal(false)}
        pendingLeadIds={pendingEnrichmentLeadIds}
        onAsyncEnrichmentStarted={({ leadIds }) => {
          setPendingEnrichmentLeadIds((current) => {
            const next = new Set(current);
            leadIds.forEach((id) => next.add(id));
            return Array.from(next);
          });
        }}
        onEnriched={async () => {
          if (currentBaseId) {
            await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
          }
        }}
      />
    </div>
  );
}
