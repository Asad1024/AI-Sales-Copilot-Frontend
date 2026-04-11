"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";

interface BulkActionsMenuProps {
  /** Workspace base being viewed (e.g. from URL). Prefer over store `activeBaseId` so permissions load immediately. */
  baseId?: number | null;
  selectedCount: number;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onBulkUpdate: (ids: number[], updates: any) => Promise<void>;
  onClose: () => void;
}

export function BulkActionsMenu({
  baseId: baseIdProp,
  selectedCount,
  onBulkDelete,
  onBulkUpdate,
  onClose,
}: BulkActionsMenuProps) {
  const { selectedLeads, setSelectedLeads } = useLeadStore();
  const { activeBaseId } = useBaseStore();
  const contextBaseId = baseIdProp ?? activeBaseId;
  const { permissions } = useBasePermissions(contextBaseId);
  const { showSuccess, showError, showWarning } = useNotification();
  const [actionType, setActionType] = useState<'assign' | 'update' | 'tag' | 'delete' | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [bulkOwnerId, setBulkOwnerId] = useState<number | null>(null);
  const [bulkUpdateField, setBulkUpdateField] = useState<string>('tier');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!contextBaseId) return;
      try {
        const data = await apiRequest(`/bases/${contextBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        setTeamMembers(members.map((m: any) => ({
          id: m.user?.id || m.User?.id,
          name: m.user?.name || m.User?.name || m.user?.email || m.User?.email,
          email: m.user?.email || m.User?.email
        })).filter((m: any) => m.id));
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      }
    };
    fetchMembers();
  }, [contextBaseId]);

  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0) return;
    setProcessing(true);
    try {
      await onBulkUpdate(selectedLeads, { owner_id: bulkOwnerId ?? null });
      showSuccess("Assigned", `${selectedLeads.length} lead(s) assigned.`);
      setActionType(null);
      setBulkOwnerId(null);
      setSelectedLeads([]);
      onClose();
    } catch (error: any) {
      showError("Failed", error?.message || "Assignment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkUpdateField = async () => {
    if (selectedLeads.length === 0 || !bulkUpdateValue.trim()) return;
    setProcessing(true);
    try {
      const updates: any = {};
      if (bulkUpdateField === 'score') {
        updates.score = Number(bulkUpdateValue);
      } else {
        updates[bulkUpdateField] = bulkUpdateValue;
      }
      await onBulkUpdate(selectedLeads, updates);
      showSuccess("Updated", `${selectedLeads.length} lead(s) updated.`);
      setActionType(null);
      setBulkUpdateValue('');
      setSelectedLeads([]);
      onClose();
    } catch (error: any) {
      showError("Failed", error?.message || "Update failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkTag = async () => {
    if (selectedLeads.length === 0 || !bulkTagValue.trim()) return;
    setProcessing(true);
    try {
      await onBulkUpdate(selectedLeads, { tags: { [bulkTagValue]: true } });
      showSuccess("Tagged", `${selectedLeads.length} lead(s) tagged.`);
      setActionType(null);
      setBulkTagValue('');
      setSelectedLeads([]);
      onClose();
    } catch (error: any) {
      showError("Failed", error?.message || "Tagging failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    // No confirm dialog - use inline confirmation via actionType state
    setProcessing(true);
    try {
      await onBulkDelete(selectedLeads);
      // Success notification is shown by the parent
      setSelectedLeads([]);
      setActionType(null);
      onClose();
    } catch (error: any) {
      showError("Delete Failed", error?.message || "Delete failed");
    } finally {
      setProcessing(false);
    }
  };

  const ActionButton = ({ 
    icon, 
    label, 
    onClick, 
    disabled, 
    danger 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void; 
    disabled?: boolean; 
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "transparent",
        border: "none",
        borderRadius: "6px",
        color: danger ? "#dc2626" : "var(--color-text)",
        fontSize: "13px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger 
            ? "rgba(220, 38, 38, 0.1)" 
            : "var(--color-surface-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        padding: "8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        zIndex: 1000,
      }}
    >
      {/* Selection count */}
      <div style={{ 
        padding: "8px 12px", 
        fontSize: "13px", 
        fontWeight: 600,
        color: "#2563eb",
        background: "rgba(37, 99, 235, 0.1)",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <Icons.CheckCircle size={14} />
        {selectedCount} selected
      </div>

      <div style={{ width: "1px", height: "24px", background: "var(--color-border)", margin: "0 4px" }} />

      {!actionType ? (
        <>
          <ActionButton
            icon={<Icons.User size={14} />}
            label="Assign"
            onClick={() => setActionType('assign')}
            disabled={!permissions.canUpdateLeads}
          />
          <ActionButton
            icon={<Icons.FileEdit size={14} />}
            label="Update"
            onClick={() => setActionType('update')}
            disabled={!permissions.canUpdateLeads}
          />
          <ActionButton
            icon={<Icons.Tag size={14} />}
            label="Tag"
            onClick={() => setActionType('tag')}
            disabled={!permissions.canUpdateLeads}
          />
          {permissions.canDeleteLeads && (
            <>
              <div style={{ width: "1px", height: "24px", background: "var(--color-border)", margin: "0 4px" }} />
              <ActionButton
                icon={<Icons.Trash size={14} />}
                label="Delete"
                onClick={() => setActionType('delete')}
                disabled={processing}
                danger
              />
            </>
          )}
        </>
      ) : actionType === 'assign' ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px" }}>
          <select
            value={bulkOwnerId || ''}
            onChange={(e) => setBulkOwnerId(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "13px",
              minWidth: "150px",
            }}
          >
            <option value="">Unassign</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={processing}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: processing ? "not-allowed" : "pointer",
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? "..." : "Apply"}
          </button>
          <button
            onClick={() => setActionType(null)}
            style={{
              padding: "6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            <Icons.X size={16} />
          </button>
        </div>
      ) : actionType === 'update' ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px" }}>
          <select
            value={bulkUpdateField}
            onChange={(e) => setBulkUpdateField(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "13px",
            }}
          >
            <option value="tier">Tier</option>
            <option value="score">Score</option>
            <option value="industry">Industry</option>
            <option value="region">Region</option>
          </select>
          <input
            type="text"
            placeholder={bulkUpdateField === 'score' ? '0-100' : `${bulkUpdateField}...`}
            value={bulkUpdateValue}
            onChange={(e) => setBulkUpdateValue(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "13px",
              width: "100px",
            }}
          />
          <button
            onClick={handleBulkUpdateField}
            disabled={processing || !bulkUpdateValue.trim()}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: processing || !bulkUpdateValue.trim() ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: processing || !bulkUpdateValue.trim() ? "not-allowed" : "pointer",
            }}
          >
            {processing ? "..." : "Apply"}
          </button>
          <button
            onClick={() => { setActionType(null); setBulkUpdateValue(''); }}
            style={{
              padding: "6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            <Icons.X size={16} />
          </button>
        </div>
      ) : actionType === 'tag' ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px" }}>
          <input
            type="text"
            placeholder="Tag name..."
            value={bulkTagValue}
            onChange={(e) => setBulkTagValue(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "13px",
              width: "120px",
            }}
          />
          <button
            onClick={handleBulkTag}
            disabled={processing || !bulkTagValue.trim()}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: processing || !bulkTagValue.trim() ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: processing || !bulkTagValue.trim() ? "not-allowed" : "pointer",
            }}
          >
            {processing ? "..." : "Apply"}
          </button>
          <button
            onClick={() => { setActionType(null); setBulkTagValue(''); }}
            style={{
              padding: "6px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            <Icons.X size={16} />
          </button>
        </div>
      ) : actionType === 'delete' ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 8px" }}>
          <span style={{ 
            fontSize: "13px", 
            color: "#dc2626",
            fontWeight: 500,
          }}>
            Delete {selectedCount} lead{selectedCount > 1 ? 's' : ''}?
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={processing}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              background: processing ? "rgba(220, 38, 38, 0.5)" : "#dc2626",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: processing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {processing ? (
              <>Deleting...</>
            ) : (
              <>
                <Icons.Trash size={14} />
                Yes, Delete
              </>
            )}
          </button>
          <button
            onClick={() => setActionType(null)}
            disabled={processing}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: processing ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div style={{ width: "1px", height: "24px", background: "var(--color-border)", margin: "0 4px" }} />

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          padding: "8px",
          background: "transparent",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-secondary)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        title="Clear selection"
      >
        <Icons.X size={16} />
      </button>
    </div>
  );
}
