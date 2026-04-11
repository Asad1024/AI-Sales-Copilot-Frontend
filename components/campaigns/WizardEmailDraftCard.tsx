"use client";

import type { CSSProperties } from "react";
import { Pencil, Eye } from "lucide-react";
import { Icons } from "@/components/ui/Icons";

/** Same snippet styling as `/templates` `TemplateWorkspaceCard` */
const DRAFT_SNIPPET_TEXT: CSSProperties = {
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

/** Channel row: same glyphs & colors as template page / campaign wizard */
function channelMetaFromLayout(layout: "email" | "linkedin_note" | "whatsapp") {
  if (layout === "linkedin_note") {
    return { Icon: Icons.Linkedin, color: "#0077B5", label: "LinkedIn", useStroke: true as const };
  }
  if (layout === "whatsapp") {
    return { Icon: Icons.WhatsApp, color: "#25D366", label: "WhatsApp", useStroke: false as const };
  }
  return { Icon: Icons.Mail, color: "#2563eb", label: "Email", useStroke: true as const };
}

export type WizardEmailDraftCardProps = {
  variant: "library" | "ai";
  /** When variant is "ai", whether this slot came from AI or was filled from a saved template (usually slot 0). */
  draftSource?: "ai" | "library";
  title: string;
  category: string;
  workspaceShared?: boolean;
  subjectDisplay: string;
  bodyPreview: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onEdit: () => void;
  /** Email vs LinkedIn note vs WhatsApp message (single body, no subject for the latter two). */
  layout?: "email" | "linkedin_note" | "whatsapp";
};

export function WizardEmailDraftCard({
  variant,
  draftSource = "ai",
  title,
  category,
  workspaceShared = false,
  subjectDisplay,
  bodyPreview,
  isSelected,
  onToggleSelect,
  onPreview,
  onEdit,
  layout = "email",
}: WizardEmailDraftCardProps) {
  const isLinkedIn = layout === "linkedin_note";
  const isWhatsApp = layout === "whatsapp";
  const isSingleBody = isLinkedIn || isWhatsApp;
  const subjectRaw =
    isSingleBody ? null : subjectDisplay.trim() !== "" ? subjectDisplay : null;

  const aiUsesLibrary = variant === "ai" && draftSource === "library";
  const channelMeta = channelMetaFromLayout(layout);
  const ChannelGlyph = channelMeta.Icon;

  const typeLabel =
    variant === "library"
      ? "Template"
      : aiUsesLibrary
        ? "From template"
        : channelMeta.label;

  return (
    <div
      className="bases-workspace-card"
      style={{
        position: "relative",
        WebkitFontSmoothing: "antialiased",
        ...(isSelected ? { border: "2px solid #818cf8" } : {}),
      }}
    >
      <div style={{ padding: "16px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ marginBottom: 6 }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {typeLabel}
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
              {workspaceShared ? (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>Shared</span>
                </>
              ) : null}
            </div>
          </div>

          <div
            style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <button
              type="button"
              className="bases-workspace-card-menu-trigger"
              title={
                isLinkedIn
                  ? "Preview connection note"
                  : isWhatsApp
                    ? "Preview WhatsApp message"
                    : "Preview email"
              }
              aria-label={
                isLinkedIn
                  ? "Preview connection note"
                  : isWhatsApp
                    ? "Preview WhatsApp message"
                    : "Preview email"
              }
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
              title={
                isLinkedIn
                  ? "Edit connection note"
                  : isWhatsApp
                    ? "Edit WhatsApp message"
                    : "Edit email"
              }
              aria-label={
                isLinkedIn
                  ? "Edit connection note"
                  : isWhatsApp
                    ? "Edit WhatsApp message"
                    : "Edit email"
              }
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
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
              <Pencil size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={isSelected ? "Deselect" : "Select for campaign"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: isSelected ? "2px solid var(--color-primary, #7C3AED)" : "2px solid var(--color-border)",
                background: isSelected ? "var(--color-primary, #7C3AED)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {isSelected ? <Icons.Check size={14} style={{ color: "#fff" }} /> : null}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: 14 }}>
          {!isSingleBody ? (
            <div>
              <div className="bases-workspace-card-metric-label">Subject</div>
              <div
                style={{
                  ...DRAFT_SNIPPET_TEXT,
                  WebkitLineClamp: 2,
                }}
                title={subjectRaw ?? undefined}
              >
                {subjectRaw ?? "—"}
              </div>
            </div>
          ) : null}
          <div>
            <div className="bases-workspace-card-metric-label">
              {isLinkedIn ? "Connection note" : isWhatsApp ? "Message" : "Body"}
            </div>
            <div
              style={{
                ...DRAFT_SNIPPET_TEXT,
                WebkitLineClamp: 3,
              }}
            >
              {bodyPreview.trim() ? bodyPreview : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
