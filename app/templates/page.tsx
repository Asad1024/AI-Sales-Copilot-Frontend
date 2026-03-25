"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { useNotification } from "@/context/NotificationContext";
import { useBase } from "@/context/BaseContext";
import BaseCard from "@/components/ui/BaseCard";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { PORTAL_ACTION_ICON } from "@/components/ui/actionIcons";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { TemplatesCardsSkeleton } from "@/components/ui/PageRouteSkeletons";

export default function TemplatesPage() {
  const router = useRouter();
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
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'linkedin' | 'whatsapp' | 'sms',
    subject: '',
    content: '',
    category: 'Outreach',
    visibility: 'private' as 'private' | 'workspace',
  });

  const categories = ["All", "Outreach", "Follow-up", "Social", "Meeting", "Proposal"];

  const filteredTemplates = templates.filter((t) => {
    const templateCategory = (t.variables as any)?.category || "Outreach";
    const categoryMatch = selectedCategory === "All" || templateCategory === selectedCategory;
    const query = search.trim().toLowerCase();
    const name = String((t.variables as any)?.name || "").toLowerCase();
    const content = String(t.content || "").toLowerCase();
    const channel = String(t.channel || "").toLowerCase();
    const searchMatch = !query || name.includes(query) || content.includes(query) || channel.includes(query);
    return categoryMatch && searchMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Icons.Mail;
      case 'linkedin': return Icons.Linkedin;
      case 'whatsapp': return Icons.MessageCircle;
      case 'sms': return Icons.MessageCircle;
      default: return Icons.FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return '#4C67FF';
      case 'linkedin': return '#0077B5';
      case 'whatsapp': return '#25D366';
      case 'sms': return '#A94CFF';
      default: return '#888';
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260, flexWrap: "wrap" }}>
          <ToolbarSearchField
            value={search}
            onChange={setSearch}
            placeholder="Search templates"
            style={{ minWidth: 220, maxWidth: 640, flex: 1 }}
            aria-label="Search templates"
          />
          <div style={{ position: "relative" }}>
            <ToolbarFilterButton label="Category" open={showCategoryMenu} onClick={() => setShowCategoryMenu((v) => !v)} />
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
                      background: selectedCategory === category ? "rgba(76,103,255,0.12)" : "transparent",
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
          onClick={() => {
            setFormData({ name: "", type: "email", subject: "", content: "", category: "Outreach", visibility: "private" });
            setEditingTemplate(null);
            setShowCreateModal(true);
          }}
          className="btn-primary shimmer-cta"
          aria-label="Create new template"
          style={{
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "var(--elev-shadow)",
          }}
        >
          <Icons.Plus size={16} strokeWidth={1.5} />
          New template
        </button>
      </div>

      {loading && <TemplatesCardsSkeleton />}

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
              className="btn-primary"
              style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600 }}
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
          {filteredTemplates.map((template) => (
            <div key={template.id} style={{ position: "relative" }}>
            <BaseCard
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                borderRadius: 14,
                border: "1px solid var(--elev-border, var(--color-border))",
                boxShadow: "var(--elev-shadow)",
              }}
            >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(99,102,241,0.08)",
                    border: "0.5px solid rgba(99,102,241,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(() => {
                    const IconComponent = getTypeIcon(template.channel || template.type);
                    return <IconComponent size={20} strokeWidth={1.5} style={{ color: "#a5b4fc" }} />;
                  })()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      margin: 0,
                      color: "var(--color-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(template.variables as any)?.name || "Untitled template"}
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                    {(template.variables as any)?.category || "Outreach"} · {Object.keys(template.variables || {}).length} fields
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                {template.channel || template.type}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                  marginLeft: 6,
                }}
              >
                {template.visibility === "workspace" ? "Shared" : "Private"}
              </span>
            </div>

            {(template.variables as any)?.subject && (
              <div
                style={{
                  background: "var(--color-surface-secondary)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "var(--color-text)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Icons.Mail size={14} strokeWidth={1.5} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Subject
                  </div>
                  <div style={{ fontWeight: 500, lineHeight: 1.4 }}>{(template.variables as any).subject}</div>
                </div>
              </div>
            )}

            <div
              style={{
                background: "var(--color-surface-secondary)",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                color: "var(--color-text-muted)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                maxHeight: 112,
                overflow: "hidden",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                fontFamily: "Inter, -apple-system, sans-serif",
              }}
            >
              {template.content}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => handleEditTemplate(template)}
                className="btn-ghost header-utility-btn"
                aria-label="Edit template"
                style={{
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <Icons.Edit {...PORTAL_ACTION_ICON} />
              </button>
              <button
                type="button"
                onClick={() => handleDuplicateTemplate(template)}
                disabled={duplicatingId === template.id}
                className="btn-ghost header-utility-btn"
                aria-label="Duplicate template"
                style={{
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  opacity: duplicatingId === template.id ? 0.5 : 1,
                  cursor: duplicatingId === template.id ? "not-allowed" : "pointer",
                }}
              >
                {duplicatingId === template.id ? (
                  <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden />
                ) : (
                  <Icons.Copy {...PORTAL_ACTION_ICON} />
                )}
              </button>
              <button
                type="button"
                onClick={() => openDeleteTemplate(template)}
                disabled={deletingId === template.id}
                className="header-utility-btn"
                aria-label="Delete template"
                style={{
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "0.5px solid rgba(248,113,113,0.25)",
                  background: "rgba(248,113,113,0.08)",
                  color: "#f87171",
                  cursor: deletingId === template.id ? "not-allowed" : "pointer",
                  opacity: deletingId === template.id ? 0.5 : 1,
                }}
              >
                {deletingId === template.id ? (
                  <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden />
                ) : (
                  <Icons.Trash {...PORTAL_ACTION_ICON} />
                )}
              </button>
            </div>
            </BaseCard>
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
                  zIndex: 3,
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
          ))}
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
                background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
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
                background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
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
                background: 'rgba(76, 103, 255, 0.1)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '12px', 
                color: 'var(--color-text-muted)',
                border: '1px solid rgba(76, 103, 255, 0.3)'
              }}>
                <strong>Tip:</strong> Use variables like {`{{first_name}}`}, {`{{company_name}}`}, {`{{industry}}`} to personalize your messages. AI will automatically fill these in based on lead data.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleSaveTemplate}
                disabled={saving || !formData.name.trim() || !formData.content.trim()}
                style={{
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
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
