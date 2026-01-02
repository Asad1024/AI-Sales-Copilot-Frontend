"use client";
import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { useColumnStore, BaseColumn } from "@/stores/useColumnStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { useNotification } from "@/context/NotificationContext";
import { ColumnEditorModal } from "@/app/bases/[id]/schema/components/ColumnEditorModal";
import { StatusFieldHelper } from "@/app/bases/[id]/schema/components/StatusFieldHelper";

interface SchemaSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return <Icons.FileText size={14} />;
    case 'number': return <span style={{ fontSize: 11, fontWeight: 600 }}>123</span>;
    case 'date': return <Icons.Calendar size={14} />;
    case 'email': return <Icons.Mail size={14} />;
    case 'phone': return <Icons.Phone size={14} />;
    case 'url': return <Icons.ExternalLink size={14} />;
    case 'select': return <Icons.ChevronDown size={14} />;
    case 'status': return <Icons.Circle size={14} />;
    case 'multiselect': return <Icons.CheckCircle size={14} />;
    case 'checkbox': return <Icons.Check size={14} />;
    case 'rating': return <Icons.Star size={14} />;
    case 'formula': return <Icons.Sparkles size={14} />;
    default: return <Icons.FileText size={14} />;
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    email: 'Email',
    phone: 'Phone',
    url: 'URL',
    select: 'Select',
    status: 'Status',
    multiselect: 'Multi-select',
    checkbox: 'Checkbox',
    rating: 'Rating',
    formula: 'Formula',
  };
  return labels[type] || type;
};

export function SchemaSidebar({ isOpen, onClose }: SchemaSidebarProps) {
  const { activeBaseId } = useBaseStore();
  const { columns, loading, fetchColumns, deleteColumn } = useColumnStore();
  const { permissions } = useBasePermissions(activeBaseId);
  const { showSuccess, showError } = useNotification();
  const [editingColumn, setEditingColumn] = useState<BaseColumn | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusHelper, setShowStatusHelper] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && activeBaseId) {
      fetchColumns(activeBaseId);
    }
  }, [isOpen, activeBaseId, fetchColumns]);

  const handleDelete = async (columnId: number) => {
    if (!confirm('Delete this column? This cannot be undone.')) return;
    setDeletingId(columnId);
    try {
      await deleteColumn(columnId);
      showSuccess('Deleted', 'Column removed');
      if (activeBaseId) fetchColumns(activeBaseId);
    } catch (error: any) {
      showError('Failed', error?.message || 'Could not delete column');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  if (!permissions.canEditSchema) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "360px",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.1)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>Schema</h3>
            <button 
              onClick={onClose} 
              style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <Icons.Lock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            You don't have permission to manage schema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 999,
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          maxWidth: "100vw",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0 }}>Manage Schema</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                {columns.length} column{columns.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              onClick={onClose} 
              style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              flex: 1,
              padding: "10px 14px",
              background: "#2563eb",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Icons.Plus size={14} />
            Add Column
          </button>
          {activeBaseId && (
            <button
              onClick={() => setShowStatusHelper(true)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                color: "var(--color-text)",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="Quick add a status field with common options"
            >
              <Icons.Zap size={14} />
              Quick Status
            </button>
          )}
        </div>

        {/* Columns List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div className="loading-skeleton" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px' }} />
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Loading columns...</div>
            </div>
          ) : columns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'var(--color-surface-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Icons.Columns size={24} style={{ opacity: 0.4 }} />
              </div>
              <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>No custom columns</h4>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
                Add columns to track additional data like deal stage, company size, or custom fields.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  color: "#2563eb",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Create your first column
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {columns.map((column) => (
                <div
                  key={column.id}
                  style={{
                    padding: "10px 12px",
                    background: "var(--color-surface)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Type Icon */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--color-surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}>
                    {getTypeIcon(column.type)}
                  </div>

                  {/* Column Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: "13px", 
                      fontWeight: "500", 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {column.name}
                      {!column.visible && (
                        <span style={{ 
                          fontSize: 10, 
                          padding: '2px 6px', 
                          background: 'var(--color-surface-secondary)', 
                          borderRadius: 4,
                          color: 'var(--color-text-muted)',
                        }}>
                          Hidden
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {getTypeLabel(column.type)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setEditingColumn(column)}
                      style={{
                        padding: 6,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-secondary)';
                        e.currentTarget.style.color = 'var(--color-text)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                      title="Edit column"
                    >
                      <Icons.FileEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(column.id)}
                      disabled={deletingId === column.id}
                      style={{
                        padding: 6,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        cursor: deletingId === column.id ? 'not-allowed' : 'pointer',
                        color: 'var(--color-text-muted)',
                        opacity: deletingId === column.id ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (deletingId !== column.id) {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                          e.currentTarget.style.color = '#dc2626';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                      title="Delete column"
                    >
                      <Icons.Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddModal && activeBaseId && (
        <ColumnEditorModal
          baseId={activeBaseId}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchColumns(activeBaseId);
            showSuccess("Added", "Column created successfully");
          }}
        />
      )}

      {/* Edit Column Modal */}
      {editingColumn && activeBaseId && (
        <ColumnEditorModal
          baseId={activeBaseId}
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
          onSave={() => {
            setEditingColumn(null);
            fetchColumns(activeBaseId);
            showSuccess("Updated", "Column saved successfully");
          }}
        />
      )}

      {/* Status Field Helper */}
      {showStatusHelper && activeBaseId && (
        <div 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.5)", 
            zIndex: 2000, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowStatusHelper(false)}
        >
          <div 
            style={{ 
              background: "var(--color-surface)", 
              borderRadius: "12px", 
              padding: "20px", 
              width: "100%",
              maxWidth: "480px", 
              maxHeight: "80vh", 
              overflowY: "auto",
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>Quick Status Field</h3>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                  Create a status column with preset options
                </p>
              </div>
              <button 
                onClick={() => setShowStatusHelper(false)} 
                style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-muted)' }}
              >
                <Icons.X size={18} />
              </button>
            </div>
            <StatusFieldHelper
              baseId={activeBaseId}
              onCreated={() => {
                setShowStatusHelper(false);
                fetchColumns(activeBaseId);
                showSuccess("Added", "Status column created");
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
