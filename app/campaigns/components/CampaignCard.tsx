"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoreVertical, Share2, Trash2, Eye } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import BaseCard from "@/components/ui/BaseCard";
import { PORTAL_ACTION_ICON } from "@/components/ui/actionIcons";
import { useNotification } from "@/context/NotificationContext";
import type { Campaign } from "@/stores/useCampaignStore";
import type { ChannelType } from "@/app/campaigns/new/channelConfig";
import type { CSSProperties, ReactNode } from "react";

/** Wizard review / step-14 overview — same colors & glyphs as `REVIEW_OVERVIEW_CHANNEL_META` in campaign wizard */
const WIZ_REVIEW_CHANNEL_COLORS: Record<ChannelType, string> = {
  email: "var(--color-primary)",
  linkedin: "#0077B5",
  whatsapp: "#25D366",
  call: "#0d9488",
};

const WIZ_REVIEW_CHANNEL_ICON: Record<ChannelType, typeof Icons.Mail> = {
  email: Icons.Mail,
  linkedin: Icons.Linkedin,
  whatsapp: Icons.WhatsApp,
  call: Icons.Phone,
};

const CHANNEL_DISPLAY_ORDER: ChannelType[] = ["email", "linkedin", "whatsapp", "call"];

function orderedCampaignChannels(campaign: Campaign): ChannelType[] {
  const raw: string[] =
    Array.isArray(campaign.channels) && campaign.channels.length > 0
      ? campaign.channels.map((c) => String(c))
      : campaign.channel
        ? [String(campaign.channel)]
        : [];
  const allowed = new Set<string>(CHANNEL_DISPLAY_ORDER);
  const seen = new Set<ChannelType>();
  for (const c of raw) {
    const low = c.toLowerCase();
    if (allowed.has(low)) seen.add(low as ChannelType);
  }
  return CHANNEL_DISPLAY_ORDER.filter((ch) => seen.has(ch));
}

function formatCampaignWhatsAppReplyRate(campaign: Campaign): string {
  const r = campaign.whatsapp_reply_rate;
  if (typeof r === "string" && r.trim() !== "") {
    const t = r.trim();
    return t.includes("%") ? t : `${t}%`;
  }
  const s = Number(campaign.whatsapp_sent ?? 0);
  const rep = Number(campaign.whatsapp_replied ?? 0);
  if (!s) return "—";
  return `${((rep / s) * 100).toFixed(1)}%`;
}

function CampaignChannelGlyphs({
  channels,
  size = 16,
}: {
  channels: ChannelType[];
  size?: number;
}) {
  if (!channels.length) return null;
  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}
      aria-label={`Channels: ${channels.join(", ")}`}
    >
      {channels.map((ch) => {
        const I = WIZ_REVIEW_CHANNEL_ICON[ch];
        const color = WIZ_REVIEW_CHANNEL_COLORS[ch];
        const useStroke = ch === "email" || ch === "linkedin";
        return (
          <span key={ch} title={ch} style={{ display: "inline-flex", alignItems: "center" }}>
            {useStroke ? (
              <I size={size} strokeWidth={1.75} style={{ color }} aria-hidden />
            ) : (
              <I size={size} style={{ color }} aria-hidden />
            )}
          </span>
        );
      })}
    </div>
  );
}

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
      return Icons.Send;
  }
};

const getStatusMeta = (status: string) => {
  switch (status) {
    case "running":
      return { dot: "#10b981", bg: "rgba(16,185,129,0.12)", fg: "#34d399" };
    case "paused":
      return { dot: "#ea580c", bg: "rgba(234,88,12,0.14)", fg: "#fb923c" };
    case "draft":
      return { dot: "#ca8a04", bg: "rgba(250,204,21,0.28)", fg: "#a16207" };
    case "completed":
      return { dot: "#16a34a", bg: "rgba(34,197,94,0.14)", fg: "#22c55e" };
    default:
      return { dot: "#64748b", bg: "rgba(100,116,139,0.12)", fg: "#94a3b8" };
  }
};

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
  onToggleSave?: () => void;
  isSaved?: boolean;
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
  onToggleSave,
  isSaved = false,
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
  const calculatedClickRate =
    campaign.sent && (campaign.clicked ?? 0) > 0
      ? (((campaign.clicked ?? 0) / campaign.sent) * 100).toFixed(1)
      : null;
  const ChannelIcon = getChannelIcon(campaign.channel);
  const openDisplay = calculatedOpenRate ? `${calculatedOpenRate}%` : campaign.openRate ? `${campaign.openRate}%` : "—";
  const clickDisplay = calculatedClickRate
    ? `${calculatedClickRate}%`
    : campaign.clickRate != null && Number.isFinite(Number(campaign.clickRate))
      ? `${Number(campaign.clickRate).toFixed(1)}%`
      : "—";

  const waSentCount = Number(campaign.whatsapp_sent ?? campaign.sent ?? 0);
  const waDelivered = Number(campaign.whatsapp_delivered ?? 0);
  const waSeen = Number(campaign.whatsapp_seen ?? 0);

  const campaignChannelsOrdered = orderedCampaignChannels(campaign);
  const includesWhatsapp = campaign.channel === "whatsapp" || campaignChannelsOrdered.includes("whatsapp");
  const waReplyRateDisplay = formatCampaignWhatsAppReplyRate(campaign);

  if (workspaceStyle) {
    const hasHotLeads = campaign.tier_filter === "Hot";
    const metricItems: Array<{ label: string; value: ReactNode }> =
      campaign.channel === "whatsapp"
        ? [
            {
              label: "Leads",
              value: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {hasHotLeads ? (
                    <Icons.Flame size={12} strokeWidth={1.5} style={{ color: "#f87171", opacity: 0.95 }} aria-label="Includes hot leads" />
                  ) : null}
                  <span>{actualLeadCount ? String(actualLeadCount) : "—"}</span>
                </span>
              ),
            },
            { label: "Sent", value: waSentCount ? String(waSentCount) : "—" },
            { label: "Delivered", value: String(waDelivered) },
            { label: "Seen", value: String(waSeen) },
            { label: "Reply rate", value: waReplyRateDisplay },
          ]
        : [
            {
              label: "Leads",
              value: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {hasHotLeads ? (
                    <Icons.Flame size={12} strokeWidth={1.5} style={{ color: "#f87171", opacity: 0.95 }} aria-label="Includes hot leads" />
                  ) : null}
                  <span>{actualLeadCount ? String(actualLeadCount) : "—"}</span>
                </span>
              ),
            },
            { label: "Sent", value: String(campaign.sent ?? 0) },
            { label: "Open", value: openDisplay },
            { label: "Click", value: clickDisplay },
            ...(includesWhatsapp ? ([{ label: "WA reply rate", value: waReplyRateDisplay }] as const) : []),
          ];
    const metricGridCols = "repeat(2, minmax(0, 1fr))";

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
                  marginBottom: 6,
                  color: "#94a3b8",
                }}
              >
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
                  gap: 10,
                  flexWrap: "wrap",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, flex: "0 1 auto" }}>
                  <Icons.Folder size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} aria-hidden />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {baseName}
                  </span>
                </div>
                {campaignChannelsOrdered.length > 0 ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        color: "var(--color-text-muted, #64748b)",
                        fontSize: 16,
                        fontWeight: 800,
                        lineHeight: 1,
                        flexShrink: 0,
                        userSelect: "none",
                        opacity: 0.95,
                      }}
                    >
                      ·
                    </span>
                    <CampaignChannelGlyphs channels={campaignChannelsOrdered} size={16} />
                  </>
                ) : null}
              </div>
              {campaign.updated_at && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.85 }}>
                  Updated {new Date(campaign.updated_at).toLocaleDateString()}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
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
              <div ref={menuWrapRef} onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
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
                  {onToggleSave && (
                    <button
                      type="button"
                      role="menuitem"
                      style={campaignWorkspaceMenuItemBase}
                      className="bases-workspace-card-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onToggleSave();
                      }}
                    >
                      <Icons.Star size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
                      {isSaved ? "Remove from saved" : "Save campaign"}
                    </button>
                  )}
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
          </div>

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

  const metricCell = (icon: ReactNode, label: string, value: ReactNode) => (
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
  const hasHotLeads = campaign.tier_filter === "Hot";
  const leadsMetricValue: ReactNode = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {hasHotLeads ? (
        <Icons.Flame size={compact ? 11 : 12} strokeWidth={1.5} style={{ color: "#f87171", opacity: 0.95 }} aria-label="Includes hot leads" />
      ) : null}
      <span>{actualLeadCount ? String(actualLeadCount) : "—"}</span>
    </span>
  );

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
              minWidth: sc.avatar,
              minHeight: sc.avatar,
              padding: "6px 8px",
              borderRadius: sc.avatarRadius,
              background: "rgba(99,102,241,0.08)",
              border: "0.5px solid rgba(99,102,241,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            {campaignChannelsOrdered.length > 0 ? (
              <CampaignChannelGlyphs channels={campaignChannelsOrdered} size={compact ? 13 : 14} />
            ) : (
              <ChannelIcon size={sc.channelIcon} strokeWidth={1.5} style={{ color: "#f6b68b" }} />
            )}
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
                gap: 8,
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, flex: "0 1 auto" }}>
                <Icons.Folder size={sc.metaIcon} strokeWidth={1.5} style={{ flexShrink: 0 }} aria-hidden />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{baseName}</span>
              </div>
              {campaignChannelsOrdered.length > 0 ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      color: "var(--color-text-muted, #64748b)",
                      fontSize: compact ? 15 : 16,
                      fontWeight: 800,
                      lineHeight: 1,
                      flexShrink: 0,
                      userSelect: "none",
                      opacity: 0.95,
                    }}
                  >
                    ·
                  </span>
                  <CampaignChannelGlyphs channels={campaignChannelsOrdered} size={compact ? 14 : 15} />
                </>
              ) : null}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: sc.metricGap,
        }}
      >
        {metricCell(<Icons.Users size={sc.metricIconGlyph} strokeWidth={1.5} />, "Leads", leadsMetricValue)}
        {metricCell(
          <Icons.Send size={sc.metricIconGlyph} strokeWidth={1.5} />,
          "Sent",
          campaign.channel === "whatsapp" ? (waSentCount ? String(waSentCount) : "—") : String(campaign.sent ?? 0)
        )}
        {campaign.channel === "whatsapp" ? (
          <>
            {metricCell(
              <Icons.CheckCircle size={sc.metricIconGlyph} strokeWidth={1.5} />,
              "Delivered",
              String(waDelivered)
            )}
            {metricCell(<Icons.Eye size={sc.metricIconGlyph} strokeWidth={1.5} />, "Seen", String(waSeen))}
          </>
        ) : (
          <>
            {metricCell(<Icons.Mail size={sc.metricIconGlyph} strokeWidth={1.5} />, "Open", openDisplay)}
            {metricCell(<Icons.ExternalLink size={sc.metricIconGlyph} strokeWidth={1.5} />, "Click", clickDisplay)}
          </>
        )}
        {includesWhatsapp ? (
          <div style={{ gridColumn: "1 / -1" }}>
            {metricCell(
              <Icons.WhatsApp size={sc.metricIconGlyph} strokeWidth={1.5} />,
              "WhatsApp reply rate",
              waReplyRateDisplay
            )}
          </div>
        ) : null}
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

