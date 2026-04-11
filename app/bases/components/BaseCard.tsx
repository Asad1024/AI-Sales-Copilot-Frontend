"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

interface BaseCardProps {
  base: any;
  stats: { leads: number; campaigns: number; enriched: number; scored: number };
  isLoading: boolean;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSetActive: (id: number) => void;
}

const BASE_COLORS = [
  { bg: "#ffeee0", icon: "#f97316" },
  { bg: "#e0f2fe", icon: "#0ea5e9" },
  { bg: "#dcfce7", icon: "#22c55e" },
  { bg: "#f3e8ff", icon: "#a855f7" },
  { bg: "#fce7f3", icon: "#ec4899" },
  { bg: "#fef3c7", icon: "#eab308" },
  { bg: "#e0e7ff", icon: "#6366f1" },
  { bg: "#ccfbf1", icon: "#14b8a6" },
];

export function BaseCard({ base, stats, isLoading, onRename, onDelete, onSetActive }: BaseCardProps) {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const { permissions, loading: permissionsLoading } = useBasePermissions(base.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState<string>(base?.name ?? "");
  const [renameSaving, setRenameSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const colorIndex = base.id % BASE_COLORS.length;
  const colors = BASE_COLORS[colorIndex];

  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = menuWrapRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleOpen = () => {
    if (isRenaming) return;
    setMenuOpen(false);
    onSetActive(base.id);
    router.push(`/bases/${base.id}/leads`);
  };

  const startRename = () => {
    setRenameValue(base?.name ?? "");
    setIsRenaming(true);
    setMenuOpen(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameSaving(false);
    setRenameValue(base?.name ?? "");
  };

  const saveRename = async () => {
    const next = renameValue.trim();
    if (!next || next === (base?.name ?? "")) {
      setIsRenaming(false);
      return;
    }
    try {
      setRenameSaving(true);
      await onRename(base.id, next);
      setIsRenaming(false);
    } finally {
      setRenameSaving(false);
    }
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuOpen(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/bases/${base.id}/leads`;
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Link copied", "Workspace link copied to clipboard.");
    } catch {
      showError("Copy failed", "Could not copy link to clipboard.");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(base.id);
  };

  const menuItemBase: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 11px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "Inter, -apple-system, sans-serif",
    color: "var(--color-text)",
    textAlign: "left",
    boxSizing: "border-box",
  };

  if (isLoading && !isRenaming) {
    return (
      <div
        className="skeleton-page-card bases-workspace-card"
        style={{
          minHeight: 200,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxSizing: "border-box",
          pointerEvents: "none",
          cursor: "default",
        }}
        aria-busy="true"
        aria-label="Loading workspace"
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="ui-skeleton" style={{ height: 10, width: 80, borderRadius: 4 }} />
            <div className="ui-skeleton" style={{ height: 22, width: "72%", borderRadius: 8 }} />
          </div>
          <div className="ui-skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "18px 20px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="ui-skeleton" style={{ height: 10, width: "58%", borderRadius: 4 }} />
              <div className="ui-skeleton" style={{ height: 16, width: "42%", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Leads", value: stats.leads },
    { label: "Campaigns", value: stats.campaigns },
    { label: "Enriched", value: stats.enriched },
    { label: "Scored", value: stats.scored },
  ];

  const isEmptyWorkspace = stats.leads === 0 && stats.campaigns === 0;
  const showNextSteps = !isLoading && !isRenaming && isEmptyWorkspace;
  const showAddLeadsCta = permissionsLoading || permissions.canReadLeads;
  /** Campaigns need recipients — only show after at least one lead exists */
  const showCreateCampaignCta =
    !permissionsLoading && permissions.canCreateCampaigns && stats.leads > 0;

  const goLeads = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetActive(base.id);
    router.push(`/bases/${base.id}/leads`);
  };

  const goNewCampaign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetActive(base.id);
    router.push("/campaigns/new");
  };

  return (
    <div className="bases-workspace-card" onClick={handleOpen} style={{ cursor: "pointer", position: "relative" }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
                color: "#94a3b8",
              }}
            >
              <Icons.Folder size={14} strokeWidth={1.5} style={{ color: colors.icon }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workspace</span>
            </div>
            {isRenaming ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  onClick={(e) => e.stopPropagation()}        
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid var(--elev-border, #e2e8f0)",
                    background: "var(--color-surface, #fff)",
                    color: "var(--color-text)",
                    padding: "9px 10px",
                    fontSize: 15,
                    fontWeight: 700,
                    outline: "none",
                    letterSpacing: "-0.01em",
                  }}
                />
                <button
                  type="button"
                  title="Save"
                  onClick={(e) => {
                    e.stopPropagation();
                    saveRename();
                  }}
                  disabled={renameSaving}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "0.5px solid rgba(16,185,129,0.35)",
                    background: renameSaving ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.12)",
                    cursor: renameSaving ? "not-allowed" : "pointer",
                    color: "#10b981",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: renameSaving ? 0.6 : 1,
                  }}
                >
                  <Icons.Check size={16} strokeWidth={1.7} />
                </button>
                <button
                  type="button"
                  title="Cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelRename();
                  }}
                  disabled={renameSaving}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid var(--elev-border, #e2e8f0)",
                    background: "var(--color-surface-secondary, #f8fafc)",
                    cursor: renameSaving ? "not-allowed" : "pointer",
                    color: "var(--color-text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    opacity: renameSaving ? 0.6 : 1,
                  }}
                >
                  <Icons.X size={16} strokeWidth={1.7} />
                </button>
              </div>
            ) : (
              <h3
                className="bases-workspace-card-title"
                style={{
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.02em",
                }}
              >
                {base.name}
              </h3>
            )}
          </div>

          <div ref={menuWrapRef} onClick={(e) => e.stopPropagation()} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              className="bases-workspace-card-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Workspace actions"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
              }}
            >
              <MoreVertical size={18} strokeWidth={2} />
            </button>
            {menuOpen && (
              <div
                className="bases-workspace-card-menu-panel"
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  zIndex: 40,
                  minWidth: 176,
                  padding: 4,
                  borderRadius: 12,
                  border: "1px solid var(--elev-border, #e2e8f0)",
                  background: "var(--elev-bg, #ffffff)",
                  boxShadow: "0 10px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.06)",
                }}
              >
                {permissions.canManageSettings && (
                  <button
                    type="button"
                    role="menuitem"
                    style={menuItemBase}
                    className="bases-workspace-card-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename();
                    }}
                  >
                    <Pencil size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  style={menuItemBase}
                  className="bases-workspace-card-menu-item"
                  onClick={handleShare}
                >
                  <Share2 size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                  Share
                </button>
                {permissions.canDeleteBase && (
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...menuItemBase, color: "#dc2626" }}
                    className="bases-workspace-card-menu-item bases-workspace-card-menu-item--danger"
                    onClick={handleDelete}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            columnGap: 24,
            rowGap: 18,
          }}
        >
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="bases-workspace-card-metric-label">{m.label}</div>
              <div className="bases-workspace-card-metric-value">{m.value}</div>
            </div>
          ))}
        </div>

        {showNextSteps && (
          <div className="bases-workspace-card-next" onClick={(e) => e.stopPropagation()}>
            <p className="bases-workspace-card-next-label">
              Next: add people to reach out to, then launch a campaign. You can also open the card to go to Leads.
            </p>
            {showAddLeadsCta || showCreateCampaignCta ? (
              <div className="bases-workspace-card-next-actions">
                {showAddLeadsCta && (
                  <button type="button" className="bases-workspace-next-cta-primary" onClick={goLeads}>
                    Add leads
                  </button>
                )}
                {showCreateCampaignCta && (
                  <button type="button" className="dashboard-demo-toggle-badge" onClick={goNewCampaign}>
                    Create campaign
                  </button>
                )}
              </div>
            ) : (
              <p className="bases-workspace-card-next-hint">
                You have view-only access. Ask a workspace admin to add leads or create campaigns.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Alias for documentation / imports that refer to workspace cards */
export const WorkspaceCard = BaseCard;
