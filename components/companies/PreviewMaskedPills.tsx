"use client";

import { Icons } from "@/components/ui/Icons";
import { Phone } from "lucide-react";

/** Same chrome as landing `LandingTeamPreviewEmailPill` / `LandingTeamPreviewPhonePill`, but shows API masked values. */
export function PreviewMaskedEmailPill({ value }: { value: string | null | undefined }) {
  const text = (value ?? "").trim() || "—";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 9999,
        border: "1px solid color-mix(in srgb, var(--color-border) 85%, transparent)",
        background: "var(--color-surface)",
        boxShadow: "0 1px 2px color-mix(in srgb, var(--color-text) 4%, transparent)",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          width: 18,
          height: 18,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-hidden
      >
        <Icons.Mail size={16} strokeWidth={1.75} className="text-[color:var(--color-text-muted)]" />
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text)",
          letterSpacing: "0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export function PreviewMaskedPhonePill({ value }: { value: string | null | undefined }) {
  const text = (value ?? "").trim() || "—";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 9999,
        border: "none",
        background: "color-mix(in srgb, var(--color-surface-secondary) 92%, var(--color-text) 8%)",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <Phone size={16} strokeWidth={1.75} className="shrink-0 text-[color:var(--color-text-muted)]" aria-hidden />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text)",
          letterSpacing: "0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}
