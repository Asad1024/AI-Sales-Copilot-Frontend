"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";

interface OwnerAssignmentCellProps {
  lead: {
    id: number;
    owner_id?: number | null;
    owner?: { id: number; name: string; email: string } | null;
  };
  editable?: boolean;
}

export function OwnerAssignmentCell({ lead, editable = true }: OwnerAssignmentCellProps) {
  const { activeBaseId } = useBaseStore();
  const { updateLead, fetchLeads, pagination } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeBaseId) return;
      setLoading(true);
      try {
        const data = await apiRequest(`/bases/${activeBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        setTeamMembers(members.map((m: any) => ({
          id: m.user?.id || m.User?.id,
          name: m.user?.name || m.User?.name || m.user?.email || m.User?.email,
          email: m.user?.email || m.User?.email
        })).filter((m: any) => m.id));
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [activeBaseId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleAssign = async (ownerId: number | null) => {
    if (!editable) return;

    setIsOpen(false);
    setAssigning(true);
    try {
      await updateLead(lead.id, { owner_id: ownerId === null ? undefined : ownerId });
      if (activeBaseId) {
        await fetchLeads(activeBaseId, pagination.currentPage, pagination.leadsPerPage);
      }
      showSuccess("Owner Updated", ownerId ? "Lead assigned successfully" : "Owner unassigned");
    } catch (error: any) {
      showError("Assignment Failed", error?.message || "Failed to assign owner");
    } finally {
      setAssigning(false);
    }
  };

  if (!editable) {
    return lead.owner ? (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000000",
          fontSize: "10px",
          fontWeight: "600"
        }}>
          {lead.owner.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <span style={{ fontSize: "11px", fontWeight: "500" }}>{lead.owner.name}</span>
      </div>
    ) : (
      <span className="text-xs italic text-slate-400 dark:text-slate-500">Unassigned</span>
    );
  }

  const stopRowClick = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  if (assigning) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          minHeight: 32,
          borderRadius: 6,
          background: "var(--color-surface-secondary)",
          border: "1px solid var(--color-border)",
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        onClick={stopRowClick}
        onMouseDown={stopRowClick}
        onPointerDown={stopRowClick}
      >
        <Icons.Loader size={16} strokeWidth={1.5} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500 }}>Updating owner…</span>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative" }}
      onClick={stopRowClick}
      onMouseDown={stopRowClick}
      onPointerDown={stopRowClick}
    >
      <div
        onClick={() => !assigning && setIsOpen(!isOpen)}
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minHeight: "32px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {lead.owner ? (
          <>
            <div style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000000",
              fontSize: "10px",
              fontWeight: "600"
            }}>
              {lead.owner.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: "11px", fontWeight: "500" }}>{lead.owner.name}</span>
            <Icons.ChevronDown size={12} className="owner-cell-chevron" style={{ color: "var(--color-text-muted)", marginLeft: "auto" }} />
          </>
        ) : (
          <>
            <span className="text-xs italic text-slate-400 dark:text-slate-500">Unassigned</span>
            <Icons.ChevronDown size={12} className="owner-cell-chevron" style={{ color: "var(--color-text-muted)", marginLeft: "auto" }} />
          </>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            background: "var(--color-surface)",
            border: "1px solid var(--elev-border)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "4px",
            minWidth: "220px",
            maxHeight: "300px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {loading ? (
            <div style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Loading...
            </div>
          ) : (
            <>
              <div
                onClick={() => handleAssign(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: assigning ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: assigning ? 0.6 : 1,
                  background: !lead.owner_id ? "rgba(76, 103, 255, 0.1)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!assigning) e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = !lead.owner_id ? "rgba(76, 103, 255, 0.1)" : "transparent";
                }}
              >
                <Icons.X size={14} style={{ color: "var(--color-text-muted)" }} />
                <span style={{ fontSize: "13px" }}>Unassign</span>
              </div>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleAssign(member.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: assigning ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: assigning ? 0.6 : 1,
                    background: lead.owner_id === member.id ? "rgba(76, 103, 255, 0.1)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!assigning) e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = lead.owner_id === member.id ? "rgba(76, 103, 255, 0.1)" : "transparent";
                  }}
                >
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000000",
                    fontSize: "10px",
                    fontWeight: "600"
                  }}>
                    {member.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: lead.owner_id === member.id ? "600" : "500" }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {member.email}
                    </div>
                  </div>
                  {lead.owner_id === member.id && (
                    <Icons.Check size={14} style={{ color: "#4C67FF" }} />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

