"use client";

import type { ReactNode } from "react";
import type { CompanyPreviewRecord } from "@/lib/api";
import { Icons } from "@/components/ui/Icons";
import type { LucideIcon } from "lucide-react";

export function companyPreviewMeta(company: CompanyPreviewRecord): string {
  const parts: string[] = [];
  if (company.industry) parts.push(company.industry);
  if (company.estimated_num_employees && company.estimated_num_employees > 0) {
    parts.push(`${company.estimated_num_employees.toLocaleString()} employees`);
  } else if (company.employee_range) {
    parts.push(company.employee_range);
  }
  if (company.location) parts.push(company.location);
  return parts.join(" - ");
}

function domainFromWebsiteUrl(websiteUrl?: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    const candidate = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
    const host = new URL(candidate).hostname.replace(/^www\./i, "").toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

export function companyAvatarUrl(company: CompanyPreviewRecord | null): string | null {
  if (!company) return null;
  if (company.avatar_url) return company.avatar_url;
  const domain = company.domain || domainFromWebsiteUrl(company.website_url);
  return domain ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}` : null;
}

export function formatPreviewEmployeeLine(company: CompanyPreviewRecord): string {
  if (company.estimated_num_employees != null && company.estimated_num_employees > 0) {
    return `${company.estimated_num_employees.toLocaleString()} employees`;
  }
  if (company.employee_range?.trim()) return company.employee_range.trim();
  return "Company size unavailable";
}

export function previewCompanyWebsiteHref(company: CompanyPreviewRecord): string | null {
  const raw = company.website_url?.trim();
  if (raw) {
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }
  const d = company.domain?.trim();
  return d ? `https://${d.replace(/^www\./i, "")}` : null;
}

type LandingCompanyDetailRowProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
};

export function LandingCompanyDetailRow({ icon: Icon, label, value }: LandingCompanyDetailRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "color-mix(in srgb, var(--color-surface-secondary) 88%, var(--color-text) 6%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
        }}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div style={{ fontSize: 14, lineHeight: 1.45, minWidth: 0, paddingTop: 2 }}>
        <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>{label}: </span>
        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{value}</span>
      </div>
    </div>
  );
}

const LANDING_PREVIEW_SAMPLE_EMAIL = "contact@example.com";
const LANDING_PREVIEW_SAMPLE_PHONE = "+1 (555) 000-0000";

export function LandingTeamPreviewEmailPill() {
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
        <span
          style={{
            position: "absolute",
            right: -3,
            bottom: -2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--color-surface)",
            boxSizing: "border-box",
          }}
          title="Sample placeholder"
        >
          <Icons.Check size={7} strokeWidth={3} style={{ color: "#ffffff" }} />
        </span>
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
        {LANDING_PREVIEW_SAMPLE_EMAIL}
      </span>
    </div>
  );
}

export function LandingTeamPreviewPhonePill() {
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
      <Icons.Phone size={16} strokeWidth={1.75} className="shrink-0 text-[color:var(--color-text-muted)]" aria-hidden />
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
        {LANDING_PREVIEW_SAMPLE_PHONE}
      </span>
    </div>
  );
}
