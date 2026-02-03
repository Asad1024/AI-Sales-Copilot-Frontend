"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useNotification } from "@/context/NotificationContext";
import { onNotification, offNotification } from "@/lib/websocketClient";
import { apiRequest } from "@/lib/apiClient";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/apiClient";
import { LeadsToolbar } from "@/app/leads/components/LeadsToolbar";
import { BulkActionsMenu } from "@/app/leads/components/BulkActionsMenu";
import { DynamicLeadsTable } from "@/app/leads/components/DynamicLeadsTable";
import { useViewStore } from "@/stores/useViewStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { Icons } from "@/components/ui/Icons";

// Lazy load heavy modals/components
const CsvImportModal = dynamic(() => import("@/components/leads/CsvImportModal"), { ssr: false });
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
    filters,
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
    clearCache
  } = useLeadStore();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { fetchViews, activeViewId } = useViewStore();
  const { permissions } = useBasePermissions(baseId || activeBaseId);
  
  const [importOpen, setImportOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [airtableImportOpen, setAirtableImportOpen] = useState(false);
  const [showAllBases, setShowAllBases] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showSchemaSidebar, setShowSchemaSidebar] = useState(false);

  // Sync base ID from URL to store
  useEffect(() => {
    const syncBaseFromUrl = async () => {
      if (!baseId) {
        // No base ID in URL - redirect to bases list or first base
        if (activeBaseId) {
          router.replace(`/bases/${activeBaseId}/leads`);
        } else if (bases.length > 0) {
          router.replace(`/bases/${bases[0].id}/leads`);
        } else {
          router.replace('/bases');
        }
        return;
      }

      // Verify base exists
      if (bases.length === 0) {
        await refreshBases();
      }

      const baseExists = bases.find(b => b.id === baseId);
      if (!baseExists && bases.length > 0) {
        // Base doesn't exist - redirect to bases list
        router.replace('/bases');
        return;
      }

      // Update store if base ID changed
      if (baseId !== activeBaseId) {
        setActiveBaseId(baseId);
      }
    };

    syncBaseFromUrl();
  }, [baseId, activeBaseId, bases, setActiveBaseId, router, refreshBases]);

  // Fetch leads and views when base changes
  useEffect(() => {
    const currentBaseId = baseId || activeBaseId;
    if (currentBaseId) {
      fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
      fetchViews(currentBaseId);
    }
  }, [baseId, activeBaseId, pagination.currentPage, pagination.leadsPerPage, fetchLeads, fetchViews]);

  // Listen for enrichment completion notifications via WebSocket
  useEffect(() => {
    const currentBaseId = baseId || activeBaseId;
    if (!currentBaseId) {
      console.log('[Leads Page] No base ID, skipping enrichment notification listener');
      return;
    }

    console.log('[Leads Page] Setting up enrichment notification listener for base:', currentBaseId);

    const handleEnrichmentCompleted = (notification: any) => {
      console.log('[Leads Page] Received notification:', notification.type, notification.metadata);
      
      // Check if notification is for the current base
      const notificationBaseId = notification.metadata?.base_id;
      const notificationBaseIds = notification.metadata?.base_ids || [];
      const isForCurrentBase = notificationBaseId === currentBaseId || 
                               notificationBaseIds.includes(currentBaseId);

      console.log('[Leads Page] Notification check:', {
        type: notification.type,
        notificationBaseId,
        notificationBaseIds,
        currentBaseId,
        isForCurrentBase
      });

      if (notification.type === 'enrichment_completed' && isForCurrentBase) {
        console.log('[Leads Page] ✅ Enrichment completed for base:', currentBaseId, 'Refreshing leads...');

        // Clear cache and refresh leads data with a small delay to ensure backend has updated
        clearCache(currentBaseId);
        setTimeout(() => {
          fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage, true);
        }, 500);

        // Show success message (enriched_count from contacts webhook, updated_count from main FullEnrich webhook)
        const count = notification.metadata?.enriched_count ?? notification.metadata?.updated_count ?? 0;
        showSuccess(
          'Contact Enrichment Complete',
          `Successfully enriched ${count} leads with contact information.`
        );
      }
    };

    // Set up WebSocket listener
    onNotification(handleEnrichmentCompleted);

    // Cleanup
    return () => {
      console.log('[Leads Page] Cleaning up enrichment notification listener for base:', currentBaseId);
      offNotification(handleEnrichmentCompleted);
    };
  }, [baseId, activeBaseId, fetchLeads, pagination.currentPage, pagination.leadsPerPage, clearCache, showSuccess]);

  const filteredLeads = getFilteredLeads();
  const currentBaseId = baseId || activeBaseId;

  const handleEnrich = async () => {
    if (!currentBaseId) {
      showWarning('Action Required', 'Please select a base first');
      return;
    }
    if (leads.length === 0) {
      showInfo('No Leads', 'No leads to enrich. Please add leads first.');
      return;
    }
    setShowEnrichModal(true);
  };

  const handleScore = async () => {
    if (!currentBaseId) {
      showWarning('Action Required', 'Please select a base first');
      return;
    }
    if (leads.length === 0) {
      showInfo('No Leads', 'No leads to score. Please add leads first.');
      return;
    }
    setShowScoreModal(true);
  };

  const handleExportCSV = async () => {
    if (!currentBaseId) {
      showWarning('Action Required', 'Please select a base first');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        showError('Export Failed', 'Please log in to export leads');
        return;
      }

      const response = await fetch(`${API_BASE}/api/leads/export?base_id=${currentBaseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || errorData.message || 'Export failed');
      }

      // Get CSV content
      const csvContent = await response.text();
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${currentBaseId}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Export Successful', 'Leads exported to CSV successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      showError('Export Failed', error?.message || 'Failed to export leads. Please try again.');
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (ids.length === 0) return;
    // No confirm dialog - BulkActionsMenu handles the UI confirmation
    setDeleting(true);
    try {
      await bulkDeleteLeads(ids);
      setSelectedLeads([]); // Clear selection after delete
      await fetchLeads(currentBaseId!, pagination.currentPage, pagination.leadsPerPage);
      showSuccess('Deleted', `${ids.length} lead(s) deleted successfully.`);
    } catch (error: any) {
      showError('Delete Failed', `Failed to delete leads: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkUpdate = async (ids: number[], updates: any) => {
    if (ids.length === 0) return;
    
    setBulkUpdating(true);
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
      
      setSelectedLeads([]); // Clear selection after update
      await fetchLeads(currentBaseId!, pagination.currentPage, pagination.leadsPerPage);
      
      if (errorCount > 0) {
        showWarning('Bulk Update Completed', `Updated ${successCount} lead(s), but ${errorCount} failed.`);
      } else {
        showSuccess('Bulk Update Successful', `Successfully updated ${successCount} lead(s).`);
      }
    } catch (error: any) {
      showError('Bulk Update Failed', `Failed to update leads: ${error?.message || 'Unknown error'}`);
    } finally {
      setBulkUpdating(false);
    }
  };

  // Show loading/redirect state while syncing base
  if (!baseId || (bases.length > 0 && !bases.find(b => b.id === baseId))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="text-hint">Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden', background: 'var(--color-background)', width: '100%' }}>
      {/* Toolbar */}
      <LeadsToolbar
        onEnrich={handleEnrich}
        onScore={handleScore}
        onImportCSV={() => setImportOpen(true)}
        onImportAirtable={() => setAirtableImportOpen(true)}
        onGenerateAI={() => setGenOpen(true)}
        onSchemaClick={() => setShowSchemaSidebar(true)}
        onExportCSV={handleExportCSV}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', padding: '16px 0' }}>
        {/* Grid View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div className="text-hint">Loading leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1, 
              textAlign: 'center', 
              padding: '60px 20px' 
            }}>
              <div style={{
                background: 'var(--color-surface)',
                borderRadius: 20,
                padding: '48px 40px',
                border: '1px dashed var(--color-border)',
                maxWidth: 500
              }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 16,
                  background: 'rgba(76, 103, 255, 0.1)',
                  border: '1px solid rgba(76, 103, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Icons.Users size={28} style={{ color: '#4C67FF', opacity: 0.7 }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No leads yet</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                  Get started by generating leads with AI, importing a CSV file, or connecting your CRM.
                </p>
                {permissions.canCreateLeads && (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary ms-hover-scale ms-press" onClick={() => setGenOpen(true)}>
                      Generate with AI
                    </button>
                    <button className="btn-ghost ms-hover-scale ms-press" onClick={() => setImportOpen(true)}>
                      Import CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <DynamicLeadsTable 
              leads={filteredLeads}
              onLeadClick={(lead) => {
                setDrawerLead(lead);
                setDrawerOpen(true);
              }}
            />
          )}
        </div>

        {/* Schema Sidebar */}
        <SchemaSidebar
          isOpen={showSchemaSidebar}
          onClose={() => setShowSchemaSidebar(false)}
        />
      </div>

      {/* Bulk Actions Menu */}
      {selectedLeads.length > 0 && (
        <BulkActionsMenu
          selectedCount={selectedLeads.length}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
          onClose={() => setSelectedLeads([])}
        />
      )}

      {/* Modals */}
      <EnhancedCsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          if (currentBaseId) {
            // Cache is already cleared in the modal, but ensure refresh happens
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
            fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
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
            if (currentBaseId) {
              fetchLeads(currentBaseId, pagination.currentPage, pagination.leadsPerPage);
            }
          }}
          targetBaseId={currentBaseId}
        />
      )}
      {drawerOpen && drawerLead && (
        <LeadDrawer 
          lead={drawerLead}
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

      {/* Enrich and Score Modals */}
      <EnrichModal
        open={showEnrichModal}
        onClose={() => setShowEnrichModal(false)}
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

