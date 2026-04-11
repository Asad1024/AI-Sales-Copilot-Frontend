"use client";

import type { CSSProperties } from "react";
import { Pencil, Eye } from "lucide-react";
import { Icons } from "@/components/ui/Icons";

const TEMPLATE_CARD_ACCENTS = [
  { icon: "#f97316" },
  { icon: "#0ea5e9" },
  { icon: "#22c55e" },
  { icon: "#a855f7" },
  { icon: "#ec4899" },
  { icon: "#eab308" },
  { icon: "#6366f1" },
  { icon: "#14b8a6" },
] as const;

/** Official LinkedIn brand blue (logo on light backgrounds) */
const LINKEDIN_BRAND_BLUE = "#0077B5";

/** WhatsApp brand green (glyph on light backgrounds) */
const WHATSAPP_BRAND_GREEN = "#25D366";

/** Distinct mail glyph color on light surfaces (matches edit modals / channel affordance) */
const EMAIL_BRAND_BLUE = "#2563eb";

/** Lucide default-style stroke on light surfaces (slate-500) — same for preview + edit */
const ACTION_ICON_STYLE: CSSProperties = {
  color: "#64748b",
};

/** Subject + body preview: same small, smooth treatment */
const PREVIEW_PARAGRAPH_STYLE: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.55,
  letterSpacing: "0.01em",
  color: "#64748b",
  wordBreak: "break-word",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  textOverflow: "ellipsis",
};

export type WizardEmailDraftCardProps = {
  variant: "library" | "ai";
  /** When variant is "ai", whether this slot came from AI or was filled from a saved template (usually slot 0). */
  draftSource?: "ai" | "library";
  accentHash: number;
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
  accentHash,
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
  const accentIcon = TEMPLATE_CARD_ACCENTS[Math.abs(accentHash) % TEMPLATE_CARD_ACCENTS.length].icon;
  const channelTitle = isLinkedIn ? "LinkedIn" : isWhatsApp ? "WhatsApp" : "Email";
  const subjectRaw =
    isSingleBody ? null : subjectDisplay.trim() !== "" ? subjectDisplay : null;

  const aiUsesLibrary = variant === "ai" && draftSource === "library";

  return (
    <div
      className="bases-workspace-card"
      style={{
        position: "relative",
        WebkitFontSmoothing: "antialiased",
        ...(isSelected ? { border: "2px solid #818cf8" } : {}),
      }}
    >
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                color: "#94a3b8",
              }}
            >
              {variant === "library" ? (
                <>
                  <Icons.FileText size={13} strokeWidth={1.5} style={{ color: accentIcon }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Template
                  </span>
                </>
              ) : aiUsesLibrary ? (
                <>
                  <Icons.FileText size={13} strokeWidth={1.5} style={{ color: "#64748b" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    From template
                  </span>
                </>
              ) : (
                <>
                  {isWhatsApp ? (
                    <Icons.WhatsApp size={14} style={{ color: WHATSAPP_BRAND_GREEN, flexShrink: 0 }} />
                  ) : isLinkedIn ? (
                    <Icons.Linkedin size={14} style={{ color: LINKEDIN_BRAND_BLUE, flexShrink: 0 }} />
                  ) : (
                    <Icons.Mail size={14} strokeWidth={1.75} style={{ color: EMAIL_BRAND_BLUE, flexShrink: 0 }} />
                  )}
                  <span
                    className="text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {channelTitle}
                  </span>
                </>
              )}
            </div>
            <h3
              className="bases-workspace-card-title"
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 650,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
              title={title}
            >
              {title}
            </h3>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
                lineHeight: 1.35,
              }}
            >
              <span>{category}</span>
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
                width: 32,
                height: 32,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
              }}
            >
              <Eye size={16} strokeWidth={2} style={ACTION_ICON_STYLE} />
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
                width: 32,
                height: 32,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
              }}
            >
              <Pencil size={16} strokeWidth={2} style={ACTION_ICON_STYLE} />
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
                border: isSelected ? "2px solid #7c3aed" : "2px solid var(--color-border)",
                background: isSelected ? "#7c3aed" : "transparent",
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr", rowGap: 10 }}>
          {!isSingleBody ? (
            <div>
              <div className="bases-workspace-card-metric-label">Subject</div>
              <p
                style={{ ...PREVIEW_PARAGRAPH_STYLE, WebkitLineClamp: 3 }}
                className="dark:text-slate-400"
                title={subjectRaw ?? undefined}
              >
                {subjectRaw ?? "—"}
              </p>
            </div>
          ) : null}
          <div>
            <div className="bases-workspace-card-metric-label">
              {isLinkedIn ? "Connection note" : isWhatsApp ? "Message" : "Body"}
            </div>
            <p
              style={{ ...PREVIEW_PARAGRAPH_STYLE, WebkitLineClamp: isSingleBody ? 4 : 3 }}
              className="dark:text-slate-400"
            >
              {bodyPreview.trim() ? bodyPreview : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
