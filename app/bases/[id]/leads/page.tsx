"use client";

import { useState, useEffect, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { onNotification, offNotification } from "@/lib/websocketClient";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/apiClient";
import { LeadsToolbar } from "@/app/leads/components/LeadsToolbar";
import { BulkActionsMenu } from "@/app/leads/components/BulkActionsMenu";
import { DynamicLeadsTable } from "@/app/leads/components/DynamicLeadsTable";
import { useViewStore } from "@/stores/useViewStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { LeadsTableSkeleton } from "@/components/ui/TableSkeleton";

const EnhancedCsvImportModal = dynamic(() => import("@/components/leads/EnhancedCsvImportModal").then(m => ({ default: m.EnhancedCsvImportModal })), { ssr: false });
const AIGenerateModal = dynamic(() => import("@/components/leads/AIGenerateModal"), { ssr: false });
const CRMImportModal = dynamic(() => import("@/components/leads/CRMImportModal"), { ssr: false });
const AirtableImportModal = dynamic(() => import("@/components/leads/AirtableImportModal").then(m => ({ default: m.AirtableImportModal })), { ssr: false });
const LeadDrawer = dynamic(() => import("@/components/leads/LeadDrawer"), { ssr: false });
const SchemaSidebar = dynamic(() => import("@/app/leads/components/SchemaSidebar").then(m => ({ default: m.SchemaSidebar })), { ssr: false });
const EnrichModal = dynamic(() => import("@/components/leads/EnrichModal").then(m => ({ default: m.EnrichModal })), { ssr: false });
const ScoreModal = dynamic(() => import("@/components/leads/ScoreModal").then(m => ({ default: m.ScoreModal })), { ssr: false });

export default function BaseLeadsPage() {
  const router = useRouter();
  const params = useParams();
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
  } = useLeadStore();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { fetchViews } = useViewStore();
  const { permissions, loading: permissionsLoading } = useBasePermissions(baseId || activeBaseId);
  
  const [importOpen, setImportOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [airtableImportOpen, setAirtableImportOpen] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showSchemaSidebar, setShowSchemaSidebar] = useState(false);
  const [pendingEnrichmentLeadIds, setPendingEnrichmentLeadIds] = useState<number[]>([]);
  const [pendingEnrichmentStartedAt, setPendingEnrichmentStartedAt] = useState<number | null>(null);
  const [pendingElapsedSeconds, setPendingElapsedSeconds] = useState(0);

  const filteredLeads = getFilteredLeads();
  const currentBaseId = baseId || activeBaseId;

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
        setActiveBaseId(baseId);
      }
    };

    syncBaseFromUrl();
  }, [baseId, activeBaseId, bases, setActiveBaseId, router, refreshBases]);

  useEffect(() => {
    if (currentBaseId) {
      fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
      fetchViews(currentBaseId);
    }
  }, [currentBaseId, pagination.currentPage, pagination.leadsPerPage, fetchLeads, fetchViews]);

  useEffect(() => {
    if (!currentBaseId) return;

    const handleEnrichmentCompleted = (notification: any) => {
      const notificationBaseId = notification.metadata?.base_id;
      const notificationBaseIds = notification.metadata?.base_ids || [];
      const isForCurrentBase =
        notificationBaseId === currentBaseId || notificationBaseIds.includes(currentBaseId);

      if (notification.type === "enrichment_completed" && isForCurrentBase) {
        setPendingEnrichmentLeadIds([]);
        setPendingEnrichmentStartedAt(null);
        setPendingElapsedSeconds(0);

        clearCache(currentBaseId);
        setTimeout(() => {
          fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage, true);
        }, 500);

        const count =
          notification.metadata?.enriched_count ?? notification.metadata?.updated_count ?? 0;
        showSuccess(
          "Contact details updated",
          count > 0
            ? `${count} lead(s) now have updated contact information.`
            : "Your leads have been refreshed with the latest contact details."
        );
      }
    };

    onNotification(handleEnrichmentCompleted);
    return () => offNotification(handleEnrichmentCompleted);
  }, [
    currentBaseId,
    fetchLeads,
    pagination.currentPage,
    pagination.leadsPerPage,
    clearCache,
    showSuccess,
  ]);

  useEffect(() => {
    setPendingEnrichmentLeadIds([]);
    setPendingEnrichmentStartedAt(null);
    setPendingElapsedSeconds(0);
  }, [currentBaseId]);

  useEffect(() => {
    if (pendingEnrichmentLeadIds.length === 0 || !pendingEnrichmentStartedAt) return;
    const interval = window.setInterval(() => {
      setPendingElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - pendingEnrichmentStartedAt) / 1000))
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pendingEnrichmentLeadIds.length, pendingEnrichmentStartedAt]);

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

  const handleScore = () => {
    if (!currentBaseId) {
      showWarning("Select a workspace", "Choose a base first.");
      return;
    }
    if (leads.length === 0) {
      showInfo("No leads", "Add leads before scoring.");
      return;
    }
    setShowScoreModal(true);
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
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

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
                background: "rgba(76, 103, 255, 0.12)",
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
            border: "1px solid rgba(76, 103, 255, 0.35)",
            background: "linear-gradient(135deg, rgba(76, 103, 255, 0.14) 0%, rgba(169, 76, 255, 0.08) 100%)",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            boxShadow: "0 8px 30px rgba(76, 103, 255, 0.12)",
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
            <Icons.Sparkles size={20} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
              Finding contact details
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 6, lineHeight: 1.5 }}>
              {pendingEnrichmentLeadIds.length} lead(s) are being updated. Your table will refresh automatically when each
              one is ready—no need to reload the page.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              padding: "6px 12px",
              borderRadius: 10,
              background: "var(--color-surface-secondary)",
              border: "1px solid var(--color-border-light)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                border: "2px solid rgba(76, 103, 255, 0.3)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.75s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
              {pendingElapsedSeconds}s
            </span>
          </div>
        </div>
      )}

      {/* Main workspace card */}
      <div style={{ ...cardStyle, flex: 1 }}>
      <LeadsToolbar
        variant="embedded"
        onEnrich={handleEnrich}
        onScore={handleScore}
        onImportAirtable={() => setAirtableImportOpen(true)}
        onGenerateAI={() => setGenOpen(true)}
        onSchemaClick={() => setShowSchemaSidebar(true)}
        onExportCSV={handleExportCSV}
        onImportCSV={() => setImportOpen(true)}
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
            <div style={{ flex: 1, minHeight: 0, padding: "0 4px" }}>
              <LeadsTableSkeleton />
            </div>
          ) : leads.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
              <EmptyStateBanner
                style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}
                icon={<Icons.Users size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
                title="No leads yet"
                description="Generate with AI, import CSV, or connect your CRM to fill this workspace."
                actions={
                  permissions.canCreateLeads ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ borderRadius: 10, padding: "10px 18px", fontWeight: 600 }}
                        onClick={() => setGenOpen(true)}
                      >
                        Generate with AI
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ borderRadius: 10, padding: "10px 18px", border: "1px solid var(--color-border)" }}
                        onClick={() => setImportOpen(true)}
                      >
                        Import CSV
                      </button>
                    </>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, padding: "0 4px" }}>
            <DynamicLeadsTable 
                embedded
              leads={filteredLeads}
                pendingLeadIds={pendingEnrichmentLeadIds}
                onLeadClick={lead => {
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
          if (currentBaseId) {
            fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage, true);
          }
        }}
      />
      <AIGenerateModal 
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onGenerated={() => {
          setGenOpen(false);
          if (currentBaseId) {
            clearCache(currentBaseId);
            fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage, true);
          }
        }}
      />
      <CRMImportModal 
        open={crmOpen}
        onClose={() => setCrmOpen(false)}
        onImported={() => {
          setCrmOpen(false);
          if (currentBaseId) {
            fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
          }
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
              fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
          }}
          targetBaseId={currentBaseId}
        />
      )}
      {drawerOpen && drawerLead && (
        <LeadDrawer 
          lead={drawerLead}
          contactEnrichmentPending={pendingEnrichmentLeadIds.includes(drawerLead.id)}
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
          setPendingEnrichmentLeadIds(current => {
            const next = new Set(current);
            leadIds.forEach(id => next.add(id));
            return Array.from(next);
          });
          setPendingEnrichmentStartedAt(Date.now());
          setPendingElapsedSeconds(0);
        }}
        onEnriched={async () => {
          if (currentBaseId) {
            await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
          }
        }}
      />
      <ScoreModal
        open={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        onScored={async () => {
          if (currentBaseId) {
            await fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
          }
        }}
      />
    </div>
  );
}
