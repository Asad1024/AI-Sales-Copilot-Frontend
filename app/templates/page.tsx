"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { MoreVertical, Pencil, Copy, Trash2, Eye } from "lucide-react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { useNotification } from "@/context/NotificationContext";
import { useBase } from "@/context/BaseContext";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { PORTAL_ACTION_ICON } from "@/components/ui/actionIcons";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

/** Same glyphs & colors as campaign wizard / `CampaignCard` (`WIZ_REVIEW_*`), plus SMS for templates */
const TEMPLATE_CHANNEL_ROW_META: Record<
  string,
  { Icon: typeof Icons.Mail; color: string; label: string; useStroke: boolean }
> = {
  email: { Icon: Icons.Mail, color: "#2563eb", label: "Email", useStroke: true },
  linkedin: { Icon: Icons.Linkedin, color: "#0077B5", label: "LinkedIn", useStroke: true },
  whatsapp: { Icon: Icons.WhatsApp, color: "#25D366", label: "WhatsApp", useStroke: false },
  call: { Icon: Icons.Phone, color: "#0d9488", label: "Call", useStroke: false },
  sms: { Icon: Icons.MessageCircle, color: "#7c3aed", label: "SMS", useStroke: true },
};

function getTemplateChannelRowMeta(channelOrType: string) {
  const key = String(channelOrType || "email").toLowerCase();
  const meta = TEMPLATE_CHANNEL_ROW_META[key];
  if (meta) return meta;
  const cap = key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : "Channel";
  return { Icon: Icons.Mail, color: "#64748b", label: cap, useStroke: true };
}

const templateCardSnippetText: CSSProperties = {
  marginTop: 2,
  fontSize: 12,
  lineHeight: 1.45,
  fontWeight: 500,
  color: "var(--color-text)",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  wordBreak: "break-word",
};

const templateMenuItemBase: CSSProperties = {
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

function TemplateWorkspaceCard({
  template,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  duplicating,
  deleting,
}: {
  template: any;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  duplicating: boolean;
  deleting: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

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

  const vars =
    template.variables && typeof template.variables === "object" && !Array.isArray(template.variables)
      ? (template.variables as Record<string, unknown>)
      : {};
  const title = String(vars.name ?? "Untitled template");
  const category = String(vars.category ?? "Outreach");
  const subjectRaw = vars.subject != null && String(vars.subject).trim() !== "" ? String(vars.subject) : null;
  const channelMeta = getTemplateChannelRowMeta(String(template.channel || template.type || "email"));
  const ChannelGlyph = channelMeta.Icon;

  return (
    <div className="bases-workspace-card" style={{ position: "relative" }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ marginBottom: 6 }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Template
              </span>
            </div>
            <h3
              className="bases-workspace-card-title"
              style={{
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
              title={title}
            >
              {title}
            </h3>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <span>{category}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {channelMeta.useStroke ? (
                  <ChannelGlyph size={12} strokeWidth={1.75} style={{ color: channelMeta.color, flexShrink: 0 }} aria-hidden />
                ) : (
                  <ChannelGlyph size={12} style={{ color: channelMeta.color, flexShrink: 0 }} aria-hidden />
                )}
                <span>{channelMeta.label}</span>
              </span>
              {template.visibility === "workspace" && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>Shared</span>
                </>
              )}
            </div>
          </div>

          <div
            ref={menuWrapRef}
            style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <button
              type="button"
              className="bases-workspace-card-menu-trigger"
              title="Preview template"
              aria-label="Preview template"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
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
              <Eye size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="bases-workspace-card-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Template actions"
              onClick={() => setMenuOpen((v) => !v)}
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
                <button
                  type="button"
                  role="menuitem"
                  style={templateMenuItemBase}
                  className="bases-workspace-card-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onPreview();
                  }}
                >
                  <Eye size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                  Preview
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={templateMenuItemBase}
                  className="bases-workspace-card-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  <Pencil size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={templateMenuItemBase}
                  className="bases-workspace-card-menu-item"
                  disabled={duplicating}
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                >
                  {duplicating ? (
                    <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden />
                  ) : (
                    <Copy size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                  )}
                  Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={{ ...templateMenuItemBase, color: "#dc2626" }}
                  className="bases-workspace-card-menu-item bases-workspace-card-menu-item--danger"
                  disabled={deleting}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  {deleting ? (
                    <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden />
                  ) : (
                    <Trash2 size={16} strokeWidth={2} />
                  )}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: 14 }}>
          <div>
            <div className="bases-workspace-card-metric-label">Subject</div>
            <div
              style={{
                ...templateCardSnippetText,
                WebkitLineClamp: 2,
              }}
              title={subjectRaw ?? undefined}
            >
              {subjectRaw ?? "—"}
            </div>
          </div>
          <div>
            <div className="bases-workspace-card-metric-label">Body</div>
            <div
              style={{
                ...templateCardSnippetText,
                WebkitLineClamp: 3,
              }}
            >
              {template.content?.trim() ? template.content : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { activeBaseId } = useBase();
  const { showSuccess, showError, showWarning } = useNotification();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTemplateList = useCallback(async () => {
    const data = await apiRequest(activeBaseId != null ? `/templates?base_id=${activeBaseId}` : "/templates");
    setTemplates(data.templates || []);
  }, [activeBaseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await refreshTemplateList();
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBaseId, refreshTemplateList]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof templates[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'linkedin' | 'whatsapp' | 'sms',
    subject: '',
    content: '',
    category: 'Outreach',
    visibility: 'private' as 'private' | 'workspace',
  });

  useEffect(() => {
    if (!previewTemplate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewTemplate(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewTemplate]);

  const categories = ["All", "Outreach", "Follow-up", "Social", "Meeting", "Proposal"];

  const filteredTemplates = templates.filter((t) => {
    const templateCategory = (t.variables as any)?.category || "Outreach";
    const categoryMatch = selectedCategory === "All" || templateCategory === selectedCategory;
    const query = search.trim().toLowerCase();
    const name = String((t.variables as any)?.name || "").toLowerCase();
    const content = String(t.content || "").toLowerCase();
    const channel = String(t.channel || "").toLowerCase();
    const subjectLine = String((t.variables as any)?.subject || "").toLowerCase();
    const searchMatch =
      !query ||
      name.includes(query) ||
      content.includes(query) ||
      channel.includes(query) ||
      subjectLine.includes(query);
    return categoryMatch && searchMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return Icons.Mail;
      case "linkedin":
        return Icons.Linkedin;
      case "whatsapp":
        return Icons.WhatsApp;
      case "call":
        return Icons.Phone;
      case "sms":
        return Icons.MessageCircle;
      default:
        return Icons.FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "email":
        return "#2563eb";
      case "linkedin":
        return "#0077B5";
      case "whatsapp":
        return "#25D366";
      case "call":
        return "#0d9488";
      case "sms":
        return "#7c3aed";
      default:
        return "#888";
    }
  };

  const handleSaveTemplate = async () => {
    if (formData.visibility === "workspace" && activeBaseId == null) {
      showWarning("Workspace", "Select a workspace to save this as shared template.");
      return;
    }
    if (!formData.name.trim() || !formData.content.trim()) {
      showError("Validation", "Please fill in template name and content.");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await apiRequest(`/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            channel: formData.type,
            content: formData.content,
            subject: formData.subject,
            category: formData.category,
            visibility: formData.visibility,
            ...(formData.visibility === "workspace" && activeBaseId != null ? { base_id: activeBaseId } : { base_id: null }),
            variables: {
              name: formData.name,
              category: formData.category
            }
          })
        });
        showSuccess("Saved", "Template updated.");
      } else {
        await apiRequest('/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            channel: formData.type,
            content: formData.content,
            subject: formData.subject,
            category: formData.category,
            visibility: formData.visibility,
            ...(formData.visibility === "workspace" && activeBaseId != null ? { base_id: activeBaseId } : { base_id: null }),
            variables: {
              name: formData.name,
              category: formData.category
            }
          })
        });
        showSuccess("Created", "Template created.");
      }
      
      await refreshTemplateList();

      setFormData({ name: '', type: 'email', subject: '', content: '', category: 'Outreach', visibility: 'private' });
      setShowCreateModal(false);
      setEditingTemplate(null);
    } catch (error: any) {
      console.error('Failed to save template:', error);
      showError("Save failed", error?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteTemplate = (template: { id: number; variables?: any }) => {
    const name = (template.variables as any)?.name || "Template";
    setDeleteTarget({ id: template.id, name });
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await apiRequest(`/templates/${deleteTarget.id}`, { method: 'DELETE' });
      showSuccess("Deleted", "Template removed.");
      await refreshTemplateList();
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      showError("Delete failed", error?.message || 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: (template.variables as any)?.name || '',
      type: template.channel || 'email',
      subject: (template.variables as any)?.subject || '',
      content: template.content || '',
      category: (template.variables as any)?.category || 'Outreach',
      visibility: (template.visibility as 'private' | 'workspace') || 'private',
    });
    setShowCreateModal(true);
  };

  const handleDuplicateTemplate = async (template: any) => {
    const allowedChannels = ["email", "linkedin", "whatsapp", "sms", "call"] as const;
    const rawCh = template.channel || "email";
    const channel = allowedChannels.includes(rawCh) ? rawCh : "email";
    const prevVars =
      template.variables && typeof template.variables === "object" && !Array.isArray(template.variables)
        ? { ...(template.variables as Record<string, unknown>) }
        : {};
    const prevName = String((prevVars as any).name || "Template");
    const newName = `${prevName} (Copy)`;
    const templateCampaignId = template.campaign_id;
    const campaign_id =
      typeof templateCampaignId === "number" && templateCampaignId > 0 ? templateCampaignId : undefined;

    setDuplicatingId(template.id);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await apiRequest("/templates", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          channel,
          content: template.content || "",
          subject: (prevVars as any).subject ?? "",
          category: (prevVars as any).category ?? "Outreach",
          variables: {
            ...prevVars,
            name: newName,
          },
          ...(campaign_id !== undefined ? { campaign_id } : {}),
          visibility: template.visibility || "private",
          ...(template.visibility === "workspace" ? { base_id: template.base_id || activeBaseId || undefined } : {}),
        }),
      });
      showSuccess("Duplicated", "A copy was added to your library.");
      await refreshTemplateList();
    } catch (error: any) {
      console.error("Failed to duplicate template:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to duplicate template";
      showError("Duplicate failed", msg);
    } finally {
      setDuplicatingId(null);
    }
  };

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
      <p
        style={{
          margin: 0,
          width: "100%",
          minWidth: 0,
          fontSize: 11,
          lineHeight: 1.35,
          color: "var(--color-text-muted)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title="Reusable messages for your workspace. When you create a campaign, open My saved templates on the email, LinkedIn, or WhatsApp steps to pull from this library—or use AI drafts there instead."
      >
        Reusable messages for your workspace. When you create a campaign, open{" "}
        <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>My saved templates</strong> on the email,
        LinkedIn, or WhatsApp steps to pull from this library—or use AI drafts there instead.
      </p>
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
            placeholder="Search templates"
            style={{ minWidth: 260, maxWidth: 640, flex: 1 }}
            aria-label="Search templates"
          />
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ToolbarFilterButton
              variant="minimal"
              label="Category"
              open={showCategoryMenu}
              onClick={() => setShowCategoryMenu((v) => !v)}
            />
            {showCategoryMenu && (
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowCategoryMenu(false)} aria-hidden="true" />
            )}
            {showCategoryMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  minWidth: 210,
                  zIndex: 100,
                  borderRadius: 10,
                  border: "1px solid var(--elev-border)",
                  background: "var(--elev-bg)",
                  boxShadow: "var(--elev-shadow-lg)",
                  padding: 6,
                }}
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryMenu(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "none",
                      background: selectedCategory === category ? "rgba(124, 58, 237,0.12)" : "transparent",
                      color: "var(--color-text)",
                      padding: "9px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{category === "All" ? "All categories" : category}</span>
                    {selectedCategory === category && <Icons.Check size={14} strokeWidth={1.5} style={{ color: "#818cf8" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn-dashboard-outline focus-ring"
          aria-label="Create new template"
          onClick={() => {
            setFormData({ name: "", type: "email", subject: "", content: "", category: "Outreach", visibility: "private" });
            setEditingTemplate(null);
            setShowCreateModal(true);
          }}
        >
          <Icons.Plus size={16} strokeWidth={1.5} />
          New Template
        </button>
      </div>

      {loading && <GlobalPageLoader layout="embedded" minHeight={520} ariaLabel="Loading templates" />}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <EmptyStateBanner
          icon={<Icons.FileText size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
          title="No templates yet"
          description="Create reusable message templates for email, LinkedIn, and more. To try email, LinkedIn, WhatsApp, or call integrations, use Settings → Test Configuration."
          actions={
            <button
              type="button"
              onClick={() => {
                setFormData({ name: "", type: "email", subject: "", content: "", category: "Outreach", visibility: "private" });
                setEditingTemplate(null);
                setShowCreateModal(true);
              }}
              className="btn-dashboard-outline focus-ring"
            >
              <Icons.Plus size={16} strokeWidth={1.5} />
              Create a template
            </button>
          }
        />
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
            gap: 14,
          }}
        >
          {filteredTemplates.map((template) => {
            return (
              <div key={template.id} style={{ position: "relative" }}>
                <TemplateWorkspaceCard
                  template={template}
                  onEdit={() => handleEditTemplate(template)}
                  onPreview={() => setPreviewTemplate(template)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onDelete={() => openDeleteTemplate(template)}
                  duplicating={duplicatingId === template.id}
                  deleting={deletingId === template.id}
                />
                {duplicatingId === template.id && (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.4)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      backdropFilter: "blur(3px)",
                      zIndex: 50,
                    }}
                  >
                    <span className="ui-spinner-ring" style={{ width: 28, height: 28 }} aria-hidden />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Duplicating…</span>
                    <span
                      style={{
                        position: "absolute",
                        width: 1,
                        height: 1,
                        padding: 0,
                        margin: -1,
                        overflow: "hidden",
                        clip: "rect(0,0,0,0)",
                        whiteSpace: "nowrap",
                        border: 0,
                      }}
                    >
                      Duplicating template, please wait
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!loading && templates.length > 0 && filteredTemplates.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--color-text-muted)" }}>
          No templates match your search or category filter.
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--elev-bg)',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid var(--elev-border)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icons.FileText size={22} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                margin: 0,
                background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
              <input
                type="text"
                placeholder="Template name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              
              <div style={{ position: 'relative' }}>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={{
                    padding: '12px 16px 12px 44px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}>
                  {(() => {
                    const IconComponent = getTypeIcon(formData.type);
                    return <IconComponent size={18} style={{ color: getTypeColor(formData.type) }} />;
                  })()}
                </div>
              </div>

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'workspace' })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="private">Private (only me)</option>
                <option value="workspace">Workspace shared</option>
              </select>

              <input
                type="text"
                placeholder="Subject line (for email)"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              <textarea
                placeholder="Message content (use {{variable_name}} for personalization)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />

              <div style={{ 
                background: 'rgba(124, 58, 237, 0.1)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '12px', 
                color: 'var(--color-text-muted)',
                border: '1px solid rgba(124, 58, 237, 0.3)'
              }}>
                <strong>Tip:</strong> Use variables like {`{{first_name}}`}, {`{{company_name}}`}, {`{{industry}}`} to personalize your messages. AI will automatically fill these in based on lead data.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleSaveTemplate}
                disabled={saving || !formData.name.trim() || !formData.content.trim()}
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (saving || !formData.name.trim() || !formData.content.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !formData.name.trim() || !formData.content.trim()) ? 0.6 : 1,
                  flex: 1
                }}
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'} Template
              </button>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  setFormData({ name: '', type: 'email', subject: '', content: '', category: 'Outreach', visibility: 'private' });
                }}
                disabled={saving}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(10px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setPreviewTemplate(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-preview-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "min(85vh, 720px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--elev-bg)",
              border: "1px solid var(--elev-border)",
              borderRadius: 20,
              boxShadow: "var(--elev-shadow-lg)",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "24px 28px 16px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                borderBottom: "1px solid var(--elev-border)",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="bases-workspace-card-metric-label" style={{ marginBottom: 6 }}>
                  Preview
                </div>
                <h2
                  id="template-preview-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.25,
                  }}
                >
                  {String(
                    (previewTemplate.variables as any)?.name ||
                      previewTemplate.name ||
                      "Untitled template"
                  )}
                </h2>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>
                    {(previewTemplate.variables as any)?.category || "Outreach"}
                  </span>
                  <span style={{ opacity: 0.45 }}>·</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {previewTemplate.channel || previewTemplate.type || "email"}
                  </span>
                  {previewTemplate.visibility === "workspace" && (
                    <>
                      <span style={{ opacity: 0.45 }}>·</span>
                      <span style={{ color: "#818cf8", fontWeight: 600 }}>Shared</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="bases-workspace-card-menu-trigger"
                aria-label="Close preview"
                onClick={() => setPreviewTemplate(null)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Icons.X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                padding: "20px 28px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div className="bases-workspace-card-metric-label">Subject</div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {(previewTemplate.variables as any)?.subject != null &&
                    String((previewTemplate.variables as any).subject).trim() !== ""
                      ? String((previewTemplate.variables as any).subject)
                      : "—"}
                  </p>
                </div>
                <div>
                  <div className="bases-workspace-card-metric-label">Body</div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 14,
                      borderRadius: 12,
                      background: "var(--color-surface-secondary)",
                      border: "1px solid var(--elev-border)",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--color-text)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {previewTemplate.content?.trim() ? previewTemplate.content : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: "16px 28px 24px",
                display: "flex",
                justifyContent: "flex-end",
                borderTop: "1px solid var(--elev-border)",
              }}
            >
              <button type="button" className="btn-dashboard-outline focus-ring" onClick={() => setPreviewTemplate(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => !deletingId && setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-template-title"
            style={{
              width: "min(400px, 100%)",
              background: "#111113",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div id="delete-template-title" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Delete template?
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 18, lineHeight: 1.5 }}>
              Remove &quot;{deleteTarget.name}&quot;. This cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-ghost" style={{ borderRadius: 8, padding: "9px 16px" }} disabled={!!deletingId} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={confirmDeleteTemplate}
                style={{
                  borderRadius: 8,
                  padding: "9px 16px",
                  fontWeight: 600,
                  border: "none",
                  background: deletingId ? "rgba(220,38,38,0.5)" : "#dc2626",
                  color: "#fff",
                  cursor: deletingId ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {deletingId ? (
                  <>
                    <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden />
                  </>
                ) : (
                  <>
                    <Icons.Trash {...PORTAL_ACTION_ICON} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
