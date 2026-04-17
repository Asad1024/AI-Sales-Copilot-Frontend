"use client";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icons } from "@/components/ui/Icons";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";

interface OwnerAssignmentCellProps {
  lead: {
    id: number;
    owner_id?: number | null;
    owner?: { id: number; name: string; email: string; avatar_url?: string | null } | null;
  };
  editable?: boolean;
}

type TeamMemberRow = { id: number; name: string; email: string; avatar_url?: string | null };

function OwnerAvatar({
  name,
  avatarUrl,
  size = 28,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : "";
  const initial = (name || "U").trim().charAt(0).toUpperCase() || "U";
  const showImg = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
      aria-hidden
    >
      {showImg ? (
        <img
          src={url}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span style={{ color: "#0f172a", fontSize: size >= 28 ? 12 : 10, fontWeight: 700, lineHeight: 1 }}>
          {initial}
        </span>
      )}
    </div>
  );
}

export function OwnerAssignmentCell({ lead, editable = true }: OwnerAssignmentCellProps) {
  const { activeBaseId } = useBaseStore();
  const { updateLead, fetchLeads, pagination } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minW = 220;
    const width = Math.max(minW, r.width);
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const maxHeight = Math.min(300, Math.max(120, spaceBelow > 160 ? spaceBelow - 4 : spaceAbove - 4));
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const top = openUp ? Math.max(margin, r.top - maxHeight - 4) : r.bottom + 4;
    setMenuPos({ top, left: r.left, width, maxHeight });
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeBaseId) return;
      setLoading(true);
      try {
        const data = await apiRequest(`/bases/${activeBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        setTeamMembers(
          members
            .map((m: any) => ({
              id: m.user?.id || m.User?.id,
              name: m.user?.name || m.User?.name || m.user?.email || m.User?.email,
              email: m.user?.email || m.User?.email,
              avatar_url: m.user?.avatar_url ?? m.User?.avatar_url ?? null,
            }))
            .filter((m: TeamMemberRow) => m.id)
        );
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [activeBaseId]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuPortalRef.current?.contains(t)) return;
      setIsOpen(false);
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        <OwnerAvatar name={lead.owner.name} avatarUrl={lead.owner.avatar_url} size={28} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            color: "var(--color-text)",
            lineHeight: 1.3,
          }}
        >
          {lead.owner.name}
        </span>
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

  const menuPortal =
    isOpen &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <div
          role="presentation"
          style={{ position: "fixed", inset: 0, zIndex: 998, background: "transparent" }}
          onClick={() => setIsOpen(false)}
        />
        <div
          ref={menuPortalRef}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 1000,
            minWidth: menuPos.width,
            maxHeight: menuPos.maxHeight,
            overflowY: "auto",
            background: "var(--color-surface)",
            border: "1px solid var(--elev-border)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: 4,
            boxSizing: "border-box",
          }}
          onClick={stopRowClick}
          onMouseDown={stopRowClick}
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
                  background: !lead.owner_id ? "rgba(37, 99, 235, 0.1)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!assigning) e.currentTarget.style.background = "rgba(37, 99, 235, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = !lead.owner_id ? "rgba(37, 99, 235, 0.1)" : "transparent";
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
                    gap: 10,
                    opacity: assigning ? 0.6 : 1,
                    background: lead.owner_id === member.id ? "rgba(37, 99, 235, 0.1)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!assigning) e.currentTarget.style.background = "rgba(37, 99, 235, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = lead.owner_id === member.id ? "rgba(37, 99, 235, 0.1)" : "transparent";
                  }}
                >
                  <OwnerAvatar name={member.name} avatarUrl={member.avatar_url} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: lead.owner_id === member.id ? "600" : "500" }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{member.email}</div>
                  </div>
                  {lead.owner_id === member.id && <Icons.Check size={14} style={{ color: "#2563EB" }} />}
                </div>
              ))}
            </>
          )}
        </div>
      </>,
      document.body
    );

  return (
    <div
      style={{ position: "relative" }}
      onClick={stopRowClick}
      onMouseDown={stopRowClick}
      onPointerDown={stopRowClick}
    >
      <div
        ref={triggerRef}
        onClick={() => !assigning && setIsOpen(!isOpen)}
        style={{
          cursor: "pointer",
          padding: "6px 10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 36,
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(37, 99, 235, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {lead.owner ? (
          <>
            <OwnerAvatar name={lead.owner.name} avatarUrl={lead.owner.avatar_url} size={28} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
                flex: 1,
                color: "var(--color-text)",
                lineHeight: 1.3,
              }}
            >
              {lead.owner.name}
            </span>
            <Icons.ChevronDown
              size={12}
              className="owner-cell-chevron"
              style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
              aria-hidden
            />
          </>
        ) : (
          <>
            <span className="text-xs italic text-slate-400 dark:text-slate-500">Unassigned</span>
            <Icons.ChevronDown size={12} className="owner-cell-chevron" style={{ color: "var(--color-text-muted)", marginLeft: "auto" }} />
          </>
        )}
      </div>
      {menuPortal}
    </div>
  );
}

