"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import BaseCard from "@/components/ui/BaseCard";
import { useNotificationStore, type Notification } from "@/stores/useNotificationStore";
import { useNotification as useToast } from "@/context/NotificationContext";
import { Search, Check, CheckCheck, Trash2, RefreshCw, Filter } from "lucide-react";

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "system", label: "Account & system" },
  { value: "invite", label: "Invites" },
  { value: "role_change", label: "Role changes" },
  { value: "base_access", label: "Workspace access" },
  { value: "campaign_complete", label: "Campaigns" },
  { value: "lead_assigned", label: "Leads" },
  { value: "enrichment_completed", label: "Enrichment" },
];

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function typeLabel(t: Notification["type"]) {
  const row = TYPE_FILTER_OPTIONS.find((o) => o.value === t);
  return row?.label ?? t;
}

export default function NotificationsPage() {
  const { showError, showSuccess } = useToast();
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const reload = useCallback(() => {
    fetchNotifications({
      search: debouncedSearch || undefined,
      type: typeFilter,
      unreadOnly: unreadOnly || undefined,
      limit: 100,
    });
    refreshUnreadCount();
  }, [fetchNotifications, refreshUnreadCount, debouncedSearch, typeFilter, unreadOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onMarkOne = async (id: number) => {
    setBusyId(id);
    try {
      await markAsRead(id);
      await refreshUnreadCount();
    } catch {
      showError("Update failed", "Could not mark notification as read.");
    } finally {
      setBusyId(null);
    }
  };

  const onMarkAll = async () => {
    setMarkAllBusy(true);
    try {
      await markAllAsRead();
      showSuccess("Notifications", "All notifications marked as read.");
      reload();
    } catch {
      showError("Update failed", "Could not mark all as read.");
    } finally {
      setMarkAllBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    setBusyId(id);
    try {
      await deleteNotification(id);
      await refreshUnreadCount();
    } catch {
      showError("Delete failed", "Could not delete notification.");
    } finally {
      setBusyId(null);
    }
  };

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notifications]
  );

  return (
    <div style={{ padding: "20px 24px 48px", maxWidth: 920, margin: "0 auto" }}>
      <BaseCard style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div style={{ flex: "1 1 220px", minWidth: 0, position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              placeholder="Search title or message…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px 10px 40px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text)",
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Filter size={16} style={{ color: "var(--color-text-muted)" }} aria-hidden />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: 14,
                minWidth: 160,
              }}
            >
              {TYPE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "var(--color-text-muted)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
              Unread only
            </label>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onMarkAll}
            disabled={markAllBusy || unreadCount === 0}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <CheckCheck size={18} />
            {markAllBusy ? "Marking…" : "Mark all as read"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => reload()}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--color-text-muted)" }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </span>
        </div>
      </BaseCard>

      {loading && sorted.length === 0 ? (
        <div className="text-hint" style={{ padding: 40, textAlign: "center" }}>
          Loading notifications…
        </div>
      ) : sorted.length === 0 ? (
        <BaseCard style={{ padding: 48, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, color: "var(--color-text-muted)" }}>
            No notifications match your filters.
          </p>
        </BaseCard>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((n) => {
            const unread = !n.read_at;
            return (
              <li key={n.id}>
                <BaseCard
                  style={{
                    padding: "16px 18px",
                    opacity: busyId === n.id ? 0.65 : 1,
                    borderLeft: unread ? "3px solid #2563EB" : undefined,
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "#2563EB",
                            background: "rgba(37, 99, 235, 0.08)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {typeLabel(n.type)}
                        </span>
                        {unread && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>Unread</span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>{n.title}</div>
                      <div style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {n.message}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      {unread && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => onMarkOne(n.id)}
                          disabled={busyId === n.id}
                          title="Mark as read"
                          style={{ borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <Check size={16} />
                          Read
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => onDelete(n.id)}
                        disabled={busyId === n.id}
                        title="Delete"
                        style={{ borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, color: "#b91c1c" }}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </BaseCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
