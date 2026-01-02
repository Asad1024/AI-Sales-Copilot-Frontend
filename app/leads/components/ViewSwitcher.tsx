"use client";
import { useState, useEffect } from "react";
import { useViewStore } from "@/stores/useViewStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

export function ViewSwitcher() {
  const { activeBaseId } = useBaseStore();
  const { views, activeViewId, loading, fetchViews, createView, updateView, deleteView, setActiveView, getActiveView } = useViewStore();
  const { filters, setFilters, fetchLeads, pagination } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (activeBaseId) {
      fetchViews(activeBaseId);
    }
  }, [activeBaseId, fetchViews]);

  useEffect(() => {
    const activeView = getActiveView();
    if (activeView) {
      const viewFilters = activeView.filters || {};
      // Restore all filters from the view, including groupBy, sortBy, sortOrder, search, etc.
      setFilters({
        search: viewFilters.search ?? '',
        segment: viewFilters.segment ?? 'All',
        groupBy: viewFilters.groupBy,
        sortBy: viewFilters.sortBy,
        sortOrder: viewFilters.sortOrder,
        colorBy: viewFilters.colorBy,
        aiFilters: {
          highIntent: viewFilters.aiFilters?.highIntent ?? false,
          recentlyActive: viewFilters.aiFilters?.recentlyActive ?? false,
          needsFollowUp: viewFilters.aiFilters?.needsFollowUp ?? false,
        }
      });
    }
  }, [activeViewId]);

  const handleCreateView = async () => {
    if (!viewName.trim() || !activeBaseId) return;

    try {
      const newView = await createView({
        base_id: activeBaseId,
        name: viewName.trim(),
        filters: filters,
        is_shared: isShared,
        is_default: views.length === 0
      });

      if (newView) {
        setActiveView(newView.id);
        setShowCreateModal(false);
        setViewName("");
        const wasShared = isShared;
        setIsShared(false);
        showSuccess(
          'View Created', 
          wasShared 
            ? `"${newView.name}" saved and shared with team` 
            : `"${newView.name}" saved`
        );
      }
    } catch (error: any) {
      showError('Failed', error?.message || 'Could not create view');
    }
  };

  const handleSelectView = (viewId: number | null) => {
    setActiveView(viewId);
    setShowDropdown(false);
    
    if (viewId) {
      const view = views.find(v => v.id === viewId);
      if (view && activeBaseId) {
        const viewFilters = view.filters || {};
        // Restore all filters from the view, including groupBy, sortBy, sortOrder, search, etc.
        setFilters({
          search: viewFilters.search ?? '',
          segment: viewFilters.segment ?? 'All',
          groupBy: viewFilters.groupBy,
          sortBy: viewFilters.sortBy,
          sortOrder: viewFilters.sortOrder,
          colorBy: viewFilters.colorBy,
          aiFilters: {
            highIntent: viewFilters.aiFilters?.highIntent ?? false,
            recentlyActive: viewFilters.aiFilters?.recentlyActive ?? false,
            needsFollowUp: viewFilters.aiFilters?.needsFollowUp ?? false,
          }
        });
        fetchLeads(activeBaseId, pagination.currentPage, pagination.leadsPerPage);
      }
    } else {
      // Reset to default "All Leads" view
      setFilters({
        search: '',
        segment: 'All',
        groupBy: undefined,
        sortBy: undefined,
        sortOrder: 'asc',
        colorBy: undefined,
        aiFilters: {
          highIntent: false,
          recentlyActive: false,
          needsFollowUp: false,
        }
      });
      if (activeBaseId) {
        fetchLeads(activeBaseId, pagination.currentPage, pagination.leadsPerPage);
      }
    }
  };

  const handleDeleteView = async (e: React.MouseEvent, viewId: number) => {
    e.stopPropagation();
    if (!confirm('Delete this view?')) return;

    try {
      await deleteView(viewId);
      showSuccess('Deleted', 'View removed');
    } catch (error: any) {
      showError('Failed', error?.message || 'Could not delete');
    }
  };

  const activeView = getActiveView();

  if (!activeBaseId) return null;

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text)',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Icons.List size={14} />
          <span>{activeView?.name || 'All Leads'}</span>
          <Icons.ChevronDown size={12} style={{ opacity: 0.5 }} />
        </button>

        {showDropdown && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000
              }}
              onClick={() => setShowDropdown(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: '200px',
                zIndex: 1001,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ 
                padding: '8px 12px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                Views
              </div>

              {/* Options */}
              <div style={{ padding: '4px' }}>
                <button
                  onClick={() => handleSelectView(null)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: !activeViewId ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: !activeViewId ? 600 : 400,
                    color: !activeViewId ? '#2563eb' : 'var(--color-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (activeViewId) e.currentTarget.style.background = 'var(--color-surface-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeViewId) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {!activeViewId && <Icons.Check size={14} />}
                  <span style={{ marginLeft: activeViewId ? 22 : 0 }}>All Leads</span>
                </button>
                
                {views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => handleSelectView(view.id)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      background: activeViewId === view.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: activeViewId === view.id ? 600 : 400,
                      color: activeViewId === view.id ? '#2563eb' : 'var(--color-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (activeViewId !== view.id) e.currentTarget.style.background = 'var(--color-surface-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeViewId !== view.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeViewId === view.id && <Icons.Check size={14} />}
                      <span style={{ marginLeft: activeViewId === view.id ? 0 : 22 }}>{view.name}</span>
                      {view.is_shared && <Icons.Users size={12} style={{ opacity: 0.5 }} />}
                    </div>
                    <button
                      onClick={(e) => handleDeleteView(e, view.id)}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: 0,
                        color: 'var(--color-text-muted)',
                      }}
                      className="view-delete-btn"
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <Icons.X size={12} />
                    </button>
                  </button>
                ))}
              </div>

              {/* Create new */}
              <div style={{ padding: '4px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Icons.Plus size={14} />
                  Save current view
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create View Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              padding: '20px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
              Save View
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                Name
              </label>
              <input
                type="text"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="e.g., Hot Leads"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateView();
                  if (e.key === 'Escape') setShowCreateModal(false);
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer', 
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: isShared ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                border: isShared ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <Icons.Users size={14} style={{ opacity: isShared ? 1 : 0.5 }} />
                  <span style={{ fontWeight: isShared ? 500 : 400 }}>
                    Share with team
                  </span>
                </div>
                {isShared && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#2563eb',
                    fontWeight: 500
                  }}>
                    Visible to all team members
                  </span>
                )}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: 'var(--color-text)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateView}
                disabled={!viewName.trim()}
                style={{
                  padding: '8px 14px',
                  background: viewName.trim() ? '#2563eb' : '#93c5fd',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#fff',
                  cursor: viewName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
