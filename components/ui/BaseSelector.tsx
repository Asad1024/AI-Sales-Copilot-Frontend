"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useBase } from "@/context/BaseContext";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "./Icons";
import { useNotification } from "@/context/NotificationContext";
import { ChevronDown, Plus, Check, FolderKanban } from "lucide-react";

interface BaseSelectorProps {
  variant?: "default" | "sidebar" | "sidebar-premium";
  /** Icon-only trigger when sidebar collapsed */
  collapsed?: boolean;
}

function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const n = name.trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  return n ? n.slice(0, 1).toUpperCase() : "W";
}

function workspaceAvatarColor(name: string): string {
  let h = 0;
  const s = name || "x";
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  h = Math.abs(h % 360);
  return `hsl(${h} 58% 46%)`;
}

export default function BaseSelector({ variant = "default", collapsed = false }: BaseSelectorProps) {
  const router = useRouter();
  const { showError } = useNotification();
  const { bases, activeBaseId, setActiveBaseId, refreshBases } = useBase();
  const activeBase = bases.find((b) => b.id === activeBaseId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [baseName, setBaseName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateBase = async () => {
    if (!baseName.trim()) return;
    try {
      setLoading(true);
      const data = await apiRequest("/bases", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, name: baseName.trim() }),
      });
      await refreshBases();
      if (data?.base?.id) {
        setActiveBaseId(data.base.id);
        router.push(`/bases/${data.base.id}/leads?welcome=1`);
      }
      setBaseName("");
      setModalOpen(false);
    } catch (error: any) {
      showError("Could not create workspace", error?.message || "Failed to create workspace.");
    } finally {
      setLoading(false);
    }
  };

  const selectBase = (baseId: number) => {
    setActiveBaseId(baseId);
    setDropdownOpen(false);
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/bases/")) {
      const pathParts = currentPath.split("/");
      const route = pathParts.slice(3).join("/");
      router.push(`/bases/${baseId}${route ? `/${route}` : "/leads"}`);
    }
  };

  if (variant === "sidebar-premium") {
    const label = activeBase?.name || "Select workspace";
    const initials = workspaceInitials(activeBase?.name || "");
    const bg = workspaceAvatarColor(activeBase?.name || "workspace");

    return (
      <>
        <div style={{ position: "relative", width: "100%" }}>
          <button
            type="button"
            data-tour="bases-selector"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 10,
              height: collapsed ? 36 : 40,
              maxHeight: collapsed ? 36 : 40,
              width: "100%",
              padding: collapsed ? 0 : "0 10px",
              borderRadius: 8,
              border: collapsed ? "none" : "1px solid #E5E7EB",
              background: collapsed ? "transparent" : "#FFFFFF",
              color: "#111827",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
              fontFamily: "Inter, sans-serif",
              boxShadow: "none",
            }}
            onMouseEnter={(e) => {
              if (!collapsed) e.currentTarget.style.background = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              if (!collapsed) e.currentTarget.style.background = "#FFFFFF";
            }}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            title={collapsed ? label : undefined}
          >
            <span
              style={{
                width: collapsed ? 32 : 28,
                height: collapsed ? 32 : 28,
                borderRadius: 8,
                background: bg,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: collapsed ? 10 : 11,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {initials}
            </span>
            {!collapsed && (
              <>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                  }}
                >
                  {label}
                </span>
                <ChevronDown size={16} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.45, color: "#6B7280" }} />
              </>
            )}
          </button>

          {dropdownOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 45 }}
                aria-hidden
                onClick={() => setDropdownOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: collapsed ? "100%" : 0,
                  right: collapsed ? "auto" : 0,
                  marginLeft: collapsed ? 8 : 0,
                  minWidth: collapsed ? 232 : undefined,
                  width: collapsed ? 252 : undefined,
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  boxShadow: "0 10px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
                  zIndex: 50,
                  overflow: "hidden",
                }}
                role="listbox"
              >
                <div style={{ maxHeight: 240, overflowY: "auto", padding: 4 }}>
                  {bases.length === 0 ? (
                    <div style={{ padding: "12px 10px", fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                      No workspaces yet
                    </div>
                  ) : (
                    bases.map((base) => (
                      <button
                        key={base.id}
                        type="button"
                        onClick={() => selectBase(base.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: base.id === activeBaseId ? "rgba(124, 58, 237, 0.1)" : "transparent",
                          color: base.id === activeBaseId ? "#7C3AED" : "#111827",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          if (base.id !== activeBaseId) e.currentTarget.style.background = "#F3F4F6";
                        }}
                        onMouseLeave={(e) => {
                          if (base.id !== activeBaseId) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <FolderKanban size={16} strokeWidth={1.5} style={{ opacity: 0.7, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {base.name}
                        </span>
                        {base.id === activeBaseId && <Check size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: "#7C3AED" }} />}
                      </button>
                    ))
                  )}
                </div>
                <div style={{ borderTop: "1px solid #E5E7EB", padding: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setModalOpen(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      color: "#7C3AED",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Plus size={16} strokeWidth={1.5} />
                    New workspace
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {modalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setModalOpen(false)}
          >
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 24,
                width: "100%",
                maxWidth: 400,
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                border: "1px solid #E5E7EB",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>New workspace</h3>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Name</label>
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="e.g., Q4 Outreach"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  background: "#FFFFFF",
                  color: "#111827",
                  marginBottom: 20,
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && baseName.trim()) handleCreateBase();
                  if (e.key === "Escape") setModalOpen(false);
                }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    background: "transparent",
                    color: "#374151",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBase}
                  disabled={loading || !baseName.trim()}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    border: "none",
                    borderRadius: 8,
                    background: loading || !baseName.trim() ? "#C4B5FD" : "#7C3AED",
                    color: "#fff",
                    cursor: loading || !baseName.trim() ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {loading ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: variant === "sidebar" ? "10px 12px" : "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: variant === "sidebar" ? "transparent" : "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            minWidth: variant === "sidebar" ? undefined : 140,
            width: variant === "sidebar" ? "100%" : undefined,
            justifyContent: "space-between",
            boxShadow: "none",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 120,
            }}
          >
            {activeBase?.name || "Select workspace"}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: variant === "sidebar" ? 0 : "calc(100% + 4px)",
              left: variant === "sidebar" ? "100%" : 0,
              marginLeft: variant === "sidebar" ? 8 : 0,
              minWidth: 200,
              background: "var(--color-surface-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              boxShadow: "var(--elev-shadow-lg)",
              zIndex: 1000,
              overflow: "hidden",
            }}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Workspaces
              </div>
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto", padding: 4 }}>
              {bases.length === 0 ? (
                <div style={{ padding: 12, fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                  No workspaces yet
                </div>
              ) : (
                bases.map((base) => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() => selectBase(base.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 4,
                      border: "none",
                      background: base.id === activeBaseId ? "rgba(124, 58, 237,0.08)" : "transparent",
                      color: "var(--color-text)",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (base.id !== activeBaseId) e.currentTarget.style.background = "var(--color-surface-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (base.id !== activeBaseId) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icons.Folder size={14} style={{ opacity: 0.6 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{base.name}</span>
                    {base.id === activeBaseId && <Icons.CheckCircle size={14} style={{ marginLeft: "auto", color: "#2563eb" }} />}
                  </button>
                ))
              )}
            </div>

            <div style={{ padding: 4, borderTop: "1px solid var(--color-border)" }}>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setModalOpen(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37, 99, 235, 0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icons.Plus size={14} />
                New workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>New workspace</h3>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", marginBottom: 6 }}>Name</label>
            <input
              type="text"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="e.g., Q4 Outreach"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                marginBottom: 20,
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && baseName.trim()) handleCreateBase();
                if (e.key === "Escape") setModalOpen(false);
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  background: "transparent",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBase}
                disabled={loading || !baseName.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  border: "none",
                  borderRadius: 6,
                  background: loading || !baseName.trim() ? "#93c5fd" : "#2563eb",
                  color: "#fff",
                  cursor: loading || !baseName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
