"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { BaseCard } from "./components/BaseCard";
import { Icons } from "@/components/ui/Icons";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";

export default function BasesPage() {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const confirm = useConfirm();
  const { bases, refreshBases, setActiveBaseId } = useBase();
  const basesLoading = useBaseStore((s) => s.loading);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [baseQuickStats, setBaseQuickStats] = useState<{ [key: number]: { leads: number; campaigns: number; enriched: number; scored: number } }>({});
  const [loadingStats, setLoadingStats] = useState<{ [key: number]: boolean }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "with-leads" | "with-campaigns">("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    const openCreate = () => setShowCreateModal(true);
    window.addEventListener("app:bases-new-workspace", openCreate as EventListener);
    return () => window.removeEventListener("app:bases-new-workspace", openCreate as EventListener);
  }, []);

  async function createBase() {
    if (!name.trim()) return;
    try {
      setLoadingCreate(true);
      const data = await apiRequest("/bases", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, name: name.trim() }),
      });
      setName("");
      setShowCreateModal(false);
      await refreshBases();
      const newId = data?.base?.id;
      if (typeof newId === "number" && newId > 0) {
        setActiveBaseId(newId);
        showSuccess("Workspace created", "Opening Leads — add your first contacts here.");
        router.push(`/bases/${newId}/leads?welcome=1`);
      } else {
        showSuccess("Workspace created", "Your new workspace is ready. Open it below to add leads.");
      }
    } catch (e: any) {
      showError("Could not create workspace", e?.message || "Failed to create workspace.");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function renameBase(id: number, newName: string) {
    try {
      await apiRequest(`/bases/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      await refreshBases();
      showSuccess("Workspace updated", "Workspace name changed successfully.");
    } catch (e: any) {
      showError("Rename failed", e?.message || "Failed to rename workspace.");
    }
  }

  async function deleteBase(id: number) {
    const ok = await confirm({
      title: "Delete workspace?",
      message: "This removes the workspace and related data you are allowed to delete. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/bases/${id}`, { method: 'DELETE' });
      await refreshBases();
      showSuccess("Workspace removed", "The workspace was deleted.");
    } catch (e: any) {
      showError("Delete failed", e?.message || "Failed to delete workspace.");
    }
  }

  useEffect(() => {
    const fetchBaseStats = async () => {
      if (bases.length === 0) return;
      const loadingState: { [key: number]: boolean } = {};
      bases.forEach(b => { loadingState[b.id] = true; });
      setLoadingStats(loadingState);
      try {
        const response = await apiRequest('/bases/quick-stats');
        const stats = response?.stats || {};
        bases.forEach(base => { if (!stats[base.id]) stats[base.id] = { leads: 0, campaigns: 0, enriched: 0, scored: 0 }; });
        setBaseQuickStats(stats);
      } catch {
        const emptyStats: any = {};
        bases.forEach(base => { emptyStats[base.id] = { leads: 0, campaigns: 0, enriched: 0, scored: 0 }; });
        setBaseQuickStats(emptyStats);
      } finally {
        const doneLoading: { [key: number]: boolean } = {};
        bases.forEach(b => { doneLoading[b.id] = false; });
        setLoadingStats(doneLoading);
      }
    };
    fetchBaseStats();
  }, [bases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = q
      ? bases.filter((b: any) => String(b.name).toLowerCase().includes(q))
      : bases;
    if (filter === "with-leads") {
      return searched.filter((b: any) => (baseQuickStats[b.id]?.leads || 0) > 0);
    }
    if (filter === "with-campaigns") {
      return searched.filter((b: any) => (baseQuickStats[b.id]?.campaigns || 0) > 0);
    }
    return searched;
  }, [bases, search, filter, baseQuickStats]);

  const allVisibleEmpty =
    filtered.length > 0 &&
    filtered.every((b: { id: number }) => {
      const s = baseQuickStats[b.id];
      return s !== undefined && s.leads === 0 && s.campaigns === 0;
    });

  /** True until quick-stats exist for each visible workspace (avoids empty cards before the fetch runs). */
  const statsLoadingAny =
    filtered.length > 0 &&
    filtered.some(
      (b: { id: number }) => loadingStats[b.id] === true || baseQuickStats[b.id] === undefined
    );

  if (basesLoading && bases.length === 0) {
    return <GlobalPageLoader layout="page" ariaLabel="Loading workspaces" />;
  }

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
      {/* Main content */}
      <div style={{ width: "100%" }}>
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
              placeholder="Search workspaces"
              style={{ minWidth: 280, maxWidth: 640, flex: 1 }}
              aria-label="Search workspaces"
            />
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ToolbarFilterButton variant="minimal" open={showFilterMenu} onClick={() => setShowFilterMenu((v) => !v)} />
              {showFilterMenu && (
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 90 }}
                  onClick={() => setShowFilterMenu(false)}
                  aria-hidden="true"
                />
              )}
              {showFilterMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    minWidth: 180,
                    zIndex: 100,
                    borderRadius: 10,
                    border: "1px solid var(--elev-border)",
                    background: "var(--elev-bg)",
                    boxShadow: "var(--elev-shadow-lg)",
                    padding: 6,
                  }}
                >
                  {[
                    { id: "all", label: "All Workspaces" },
                    { id: "with-leads", label: "With Leads" },
                    { id: "with-campaigns", label: "With Campaigns" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilter(item.id as "all" | "with-leads" | "with-campaigns");
                        setShowFilterMenu(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "none",
                        background: filter === item.id ? "rgba(124, 58, 237,0.12)" : "transparent",
                        color: "var(--color-text)",
                        padding: "9px 10px",
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span>{item.label}</span>
                      {filter === item.id && <Icons.Check size={14} strokeWidth={1.5} style={{ color: "#818cf8" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn-dashboard-outline"
            onClick={() => setShowCreateModal(true)}
          >
            <Icons.Plus size={16} strokeWidth={1.5} />
            New Workspace
          </button>
        </div>

        {allVisibleEmpty && (
          <div className="bases-onboarding-hint" role="status">
            <Icons.Folder size={20} strokeWidth={1.5} className="bases-onboarding-hint-icon" />
            <div>
              <p className="bases-onboarding-hint-body">
                Your workspace is ready. Use <strong>Add leads</strong> on a card to import contacts, then{" "}
                <strong>Create campaign</strong> to start outreach. The dashboard checklist also tracks these steps.
              </p>
              <button type="button" className="bases-onboarding-hint-link" onClick={() => router.push("/dashboard")}>
                Go to dashboard
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {bases.length === 0 && (
          <EmptyStateBanner
            icon={<Icons.Folder size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
            title="No workspaces yet"
            description="Workspaces help you organize your leads and campaigns. Create your first one to get started."
            actions={
              <button type="button" onClick={() => setShowCreateModal(true)} className="btn-dashboard-outline">
                Create a workspace
              </button>
            }
          />
        )}

        {/* No results */}
        {filtered.length === 0 && bases.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <Icons.Search size={18} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No workspaces matching "{search}"</p>
          </div>
        )}

        {/* Grid — single central loader while workspace stats load (same pattern as Dashboard) */}
        {filtered.length > 0 &&
          (statsLoadingAny ? (
            <GlobalPageLoader layout="embedded" minHeight={480} ariaLabel="Loading workspaces" />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                gap: 14,
              }}
            >
              {filtered.map((b: any) => (
                <BaseCard
                  key={b.id}
                  base={b}
                  stats={baseQuickStats[b.id] || { leads: 0, campaigns: 0, enriched: 0, scored: 0 }}
                  isLoading={false}
                  onRename={renameBase}
                  onDelete={deleteBase}
                  onSetActive={(id) => {
                    setActiveBaseId(id);
                  }}
                />
              ))}
            </div>
          ))}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.48)', 
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100 
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{ 
              background: 'var(--elev-bg)', 
              borderRadius: 14, 
              padding: '24px', 
              border: '1px solid var(--elev-border)',
              width: '100%', 
              maxWidth: '420px', 
              margin: '20px',
              boxShadow: 'var(--elev-shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: 'var(--color-text)' }}>
              Create a workspace
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
              A workspace is a collection of leads, campaigns, and analytics.
            </p>
            
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)', marginBottom: '6px' }}>
              Workspace name
            </label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Q4 Sales Outreach" 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                fontSize: '14px', 
                border: '1px solid var(--color-border)', 
                borderRadius: '6px', 
                marginBottom: '20px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none'
              }}
              autoFocus
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && name.trim()) createBase(); 
                if (e.key === 'Escape') setShowCreateModal(false); 
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCreateModal(false)} 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '14px', 
                  background: 'var(--color-surface)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  color: 'var(--color-text)' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={createBase} 
                disabled={loadingCreate || !name.trim()}
                style={{ 
                  padding: '8px 20px', 
                  fontSize: '14px', 
                  background: loadingCreate || !name.trim() ? 'rgba(124, 58, 237,0.45)' : 'var(--color-primary)', 
                  color: 'var(--color-text-inverse)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: loadingCreate || !name.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingCreate ? 'Creating...' : 'Create workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
