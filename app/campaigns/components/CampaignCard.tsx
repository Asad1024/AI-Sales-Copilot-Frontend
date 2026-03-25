"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoreVertical, Share2, Trash2, Eye } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import BaseCard from "@/components/ui/BaseCard";
import { PORTAL_ACTION_ICON } from "@/components/ui/actionIcons";
import { useNotification } from "@/context/NotificationContext";
import type { Campaign } from "@/stores/useCampaignStore";
import type { CSSProperties, ReactNode } from "react";

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case "email":
      return Icons.Mail;
    case "linkedin":
      return Icons.Linkedin;
    case "whatsapp":
      return Icons.MessageCircle;
    case "call":
      return Icons.Phone;
    default:
      return Icons.Rocket;
  }
};

const getStatusMeta = (status: string) => {
  switch (status) {
    case "running":
      return { dot: "#10b981", bg: "rgba(16,185,129,0.12)", fg: "#34d399" };
    case "paused":
      return { dot: "#f59e0b", bg: "rgba(245,158,11,0.12)", fg: "#fbbf24" };
    case "draft":
      return { dot: "#94a3b8", bg: "rgba(148,163,184,0.12)", fg: "#cbd5e1" };
    case "completed":
      return { dot: "#6366f1", bg: "rgba(99,102,241,0.12)", fg: "#a5b4fc" };
    default:
      return { dot: "#64748b", bg: "rgba(100,116,139,0.12)", fg: "#94a3b8" };
  }
};

const CAMPAIGN_ACCENT_COLORS = [
  { bg: "#ffeee0", icon: "#f97316" },
  { bg: "#e0f2fe", icon: "#0ea5e9" },
  { bg: "#dcfce7", icon: "#22c55e" },
  { bg: "#f3e8ff", icon: "#a855f7" },
  { bg: "#fce7f3", icon: "#ec4899" },
  { bg: "#fef3c7", icon: "#eab308" },
  { bg: "#e0e7ff", icon: "#6366f1" },
  { bg: "#ccfbf1", icon: "#14b8a6" },
];

const campaignWorkspaceMenuItemBase: CSSProperties = {
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

interface CampaignCardProps {
  campaign: Campaign;
  baseName: string;
  onView: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  showDeleteAction?: boolean;
  /** Smaller padding/type for dense grids (e.g. dashboard) */
  compact?: boolean;
  /** Workspaces-style shell: typography metrics + ⋮ menu (campaigns list) */
  workspaceStyle?: boolean;
}

const cardScale = {
  default: {
    cardPadding: "16px 18px",
    cardGap: 14,
    headerGap: 12,
    avatar: 40,
    avatarRadius: 10,
    channelIcon: 18,
    titleSize: 15,
    metaSize: 11,
    metaIcon: 12,
    updatedSize: 10,
    statusPad: "4px 10px",
    statusFont: 11,
    statusDot: 6,
    tierFont: 11,
    tierIcon: 12,
    metricGap: 10,
    metricPad: "10px 10px",
    metricIconBox: 30,
    metricIconRadius: 8,
    metricIconGlyph: 14,
    metricLabel: 10,
    metricValue: 15,
    footerGap: 6,
    footerPadTop: 6,
    actionBtn: 38,
    actionRadius: 8,
    actionIcon: 16,
  },
  compact: {
    cardPadding: "12px 14px",
    cardGap: 10,
    headerGap: 10,
    avatar: 34,
    avatarRadius: 8,
    channelIcon: 16,
    titleSize: 13,
    metaSize: 10,
    metaIcon: 11,
    updatedSize: 9,
    statusPad: "3px 8px",
    statusFont: 10,
    statusDot: 5,
    tierFont: 10,
    tierIcon: 11,
    metricGap: 8,
    metricPad: "8px 8px",
    metricIconBox: 26,
    metricIconRadius: 7,
    metricIconGlyph: 13,
    metricLabel: 9,
    metricValue: 13,
    footerGap: 5,
    footerPadTop: 4,
    actionBtn: 34,
    actionRadius: 7,
    actionIcon: 14,
  },
} as const;

export default function CampaignCard({
  campaign,
  baseName,
  onView,
  onDelete,
  deleting = false,
  showDeleteAction = true,
  compact = false,
  workspaceStyle = false,
}: CampaignCardProps) {
  const { showSuccess, showError } = useNotification();
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

  const sc = compact ? cardScale.compact : cardScale.default;
  const statusMeta = getStatusMeta(campaign.status);
  const actualLeadCount = campaign.leads || 0;
  const calculatedOpenRate = campaign.sent && campaign.opened ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : null;
  const calculatedReplyRate = campaign.sent && campaign.replied ? ((campaign.replied / campaign.sent) * 100).toFixed(1) : null;
  const ChannelIcon = getChannelIcon(campaign.channel);
  const openDisplay = calculatedOpenRate ? `${calculatedOpenRate}%` : campaign.openRate ? `${campaign.openRate}%` : "—";
  const replyDisplay =
    campaign.channel === "whatsapp"
      ? campaign.replied && calculatedReplyRate
        ? `${calculatedReplyRate}%`
        : "—"
      : calculatedReplyRate
        ? `${calculatedReplyRate}%`
        : campaign.replyRate
          ? `${campaign.replyRate}%`
          : "—";

  const accentIndex = Math.abs(Number(campaign.id)) % CAMPAIGN_ACCENT_COLORS.length;
  const channelTint = CAMPAIGN_ACCENT_COLORS[accentIndex].icon;

  if (workspaceStyle) {
    const metricItems = [
      { label: "Leads", value: actualLeadCount ? String(actualLeadCount) : "—" },
      {
        label: "Sent",
        value: campaign.channel === "whatsapp" ? String(campaign.sent ?? "—") : String(campaign.sent ?? 0),
      },
      ...(campaign.channel !== "whatsapp" ? [{ label: "Open", value: openDisplay }] : []),
      { label: "Reply", value: replyDisplay },
    ];
    const metricGridCols =
      campaign.channel === "whatsapp" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))";

    const handleCardClick = () => {
      setMenuOpen(false);
      onView();
    };

    const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setMenuOpen(false);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/campaigns/${campaign.id}`;
      try {
        await navigator.clipboard.writeText(url);
        showSuccess("Link copied", "Campaign link copied to clipboard.");
      } catch {
        showError("Copy failed", "Could not copy link to clipboard.");
      }
    };

    const handleDeleteMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpen(false);
      onDelete?.();
    };

    const handleViewMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpen(false);
      onView();
    };

    return (
      <div className="bases-workspace-card" onClick={handleCardClick} style={{ cursor: "pointer", position: "relative" }}>
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
                <ChannelIcon size={14} strokeWidth={1.5} style={{ color: channelTint }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Campaign</span>
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
              >
                {campaign.name}
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
                <Icons.Folder size={12} strokeWidth={1.5} />
                {baseName}
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ textTransform: "capitalize" }}>{campaign.channel}</span>
                {campaign.channels && campaign.channels.length > 1 && (
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>+{campaign.channels.length - 1}</span>
                )}
              </div>
              {campaign.updated_at && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.85 }}>
                  Updated {new Date(campaign.updated_at).toLocaleDateString()}
                </div>
              )}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  background: statusMeta.bg,
                  color: statusMeta.fg,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: statusMeta.dot }} />
                {campaign.status}
              </div>
            </div>

            <div ref={menuWrapRef} onClick={(e) => e.stopPropagation()} style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                className="bases-workspace-card-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Campaign actions"
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
                  <button
                    type="button"
                    role="menuitem"
                    style={campaignWorkspaceMenuItemBase}
                    className="bases-workspace-card-menu-item"
                    onClick={handleViewMenu}
                  >
                    <Eye size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                    View
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={campaignWorkspaceMenuItemBase}
                    className="bases-workspace-card-menu-item"
                    onClick={handleShare}
                  >
                    <Share2 size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                    Share
                  </button>
                  {showDeleteAction && onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      style={{ ...campaignWorkspaceMenuItemBase, color: "#dc2626" }}
                      className="bases-workspace-card-menu-item bases-workspace-card-menu-item--danger"
                      onClick={handleDeleteMenu}
                      disabled={deleting}
                    >
                      {deleting ? <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden /> : <Trash2 size={16} strokeWidth={2} />}
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {campaign.tier_filter && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {campaign.tier_filter === "Hot" && <Icons.Flame size={12} strokeWidth={1.5} style={{ color: "#f87171", opacity: 0.9 }} />}
              {campaign.tier_filter === "Warm" && <Icons.Thermometer size={12} strokeWidth={1.5} style={{ color: "#fbbf24", opacity: 0.9 }} />}
              {(campaign.tier_filter === "Cold" || !["Hot", "Warm"].includes(campaign.tier_filter)) && (
                <Icons.Snowflake size={12} strokeWidth={1.5} style={{ color: "#94a3b8" }} />
              )}
              <span style={{ letterSpacing: "0.02em" }}>{campaign.tier_filter} tier</span>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: metricGridCols,
              columnGap: 24,
              rowGap: 18,
            }}
          >
            {metricItems.map((m) => (
              <div key={m.label}>
                <div className="bases-workspace-card-metric-label">{m.label}</div>
                <div className="bases-workspace-card-metric-value">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metricCell = (icon: ReactNode, label: string, value: string) => (
    <div
      key={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 10,
        padding: sc.metricPad,
        borderRadius: compact ? 8 : 10,
        background: "var(--color-surface-secondary)",
        border: "0.5px solid var(--color-border-light)",
      }}
    >
      <div
        style={{
          width: sc.metricIconBox,
          height: sc.metricIconBox,
          borderRadius: sc.metricIconRadius,
          background: "var(--color-surface)",
          border: "0.5px solid var(--color-border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: sc.metricLabel,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "Inter, -apple-system, sans-serif",
            fontSize: sc.metricValue,
            fontWeight: 600,
            color: "var(--color-text)",
            marginTop: 2,
            letterSpacing: "-0.03em",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );

  const actionIcon = { ...PORTAL_ACTION_ICON, size: sc.actionIcon };

  return (
    <BaseCard
      style={{
        padding: sc.cardPadding,
        display: "flex",
        flexDirection: "column",
        gap: sc.cardGap,
        transition: "border-color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: sc.headerGap }}>
        <div style={{ display: "flex", gap: sc.headerGap, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: sc.avatar,
              height: sc.avatar,
              borderRadius: sc.avatarRadius,
              background: "rgba(99,102,241,0.08)",
              border: "0.5px solid rgba(99,102,241,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChannelIcon size={sc.channelIcon} strokeWidth={1.5} style={{ color: "#a5b4fc" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Link
              href={`/campaigns/${campaign.id}`}
              style={{
                fontSize: sc.titleSize,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "var(--color-text)",
                textDecoration: "none",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {campaign.name}
            </Link>
            <div
              style={{
                marginTop: 4,
                fontSize: sc.metaSize,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <Icons.Folder size={sc.metaIcon} strokeWidth={1.5} />
              {baseName}
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ textTransform: "capitalize" }}>{campaign.channel}</span>
              {campaign.channels && campaign.channels.length > 1 && (
                <span style={{ color: "#818cf8", fontWeight: 600 }}>+{campaign.channels.length - 1}</span>
              )}
            </div>
            {campaign.updated_at && (
              <div style={{ fontSize: sc.updatedSize, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.85 }}>
                Updated {new Date(campaign.updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? 5 : 6,
            padding: sc.statusPad,
            borderRadius: 999,
            fontSize: sc.statusFont,
            fontWeight: 600,
            textTransform: "capitalize",
            background: statusMeta.bg,
            color: statusMeta.fg,
            flexShrink: 0,
          }}
        >
          <span style={{ width: sc.statusDot, height: sc.statusDot, borderRadius: 999, background: statusMeta.dot }} />
          {campaign.status}
        </div>
      </div>

      {campaign.tier_filter && (
        <div
          style={{
            fontSize: sc.tierFont,
            fontWeight: 500,
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 0 0",
          }}
        >
          {campaign.tier_filter === "Hot" && <Icons.Flame size={sc.tierIcon} strokeWidth={1.5} style={{ color: "#f87171", opacity: 0.9 }} />}
          {campaign.tier_filter === "Warm" && <Icons.Thermometer size={sc.tierIcon} strokeWidth={1.5} style={{ color: "#fbbf24", opacity: 0.9 }} />}
          {(campaign.tier_filter === "Cold" || !["Hot", "Warm"].includes(campaign.tier_filter)) && (
            <Icons.Snowflake size={sc.tierIcon} strokeWidth={1.5} style={{ color: "#94a3b8" }} />
          )}
          <span style={{ letterSpacing: "0.02em" }}>{campaign.tier_filter} tier</span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: campaign.channel === "whatsapp" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: sc.metricGap,
        }}
      >
        {metricCell(<Icons.Users size={sc.metricIconGlyph} strokeWidth={1.5} />, "Leads", actualLeadCount ? String(actualLeadCount) : "—")}
        {metricCell(<Icons.Send size={sc.metricIconGlyph} strokeWidth={1.5} />, "Sent", campaign.channel === "whatsapp" ? String(campaign.sent ?? "—") : String(campaign.sent ?? 0))}
        {campaign.channel !== "whatsapp" && metricCell(<Icons.Mail size={sc.metricIconGlyph} strokeWidth={1.5} />, "Open", openDisplay)}
        {metricCell(<Icons.MessageCircle size={sc.metricIconGlyph} strokeWidth={1.5} />, "Reply", replyDisplay)}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: sc.footerGap,
          paddingTop: sc.footerPadTop,
          marginTop: "auto",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={onView}
          className="btn-ghost header-utility-btn"
          aria-label="View campaign"
          style={{
            borderRadius: sc.actionRadius,
            width: sc.actionBtn,
            height: sc.actionBtn,
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "0.5px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <Icons.Eye {...actionIcon} />
        </button>
        {showDeleteAction && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="btn-ghost header-utility-btn"
            aria-label="Delete campaign"
            style={{
              borderRadius: sc.actionRadius,
              width: sc.actionBtn,
              height: sc.actionBtn,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "0.5px solid rgba(248,113,113,0.25)",
              background: "rgba(248,113,113,0.06)",
              color: "#f87171",
              opacity: deleting ? 0.6 : 1,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? <span className="ui-spinner-ring ui-spinner-ring--sm" aria-hidden /> : <Icons.Trash {...actionIcon} />}
          </button>
        )}
      </div>
    </BaseCard>
  );
}

