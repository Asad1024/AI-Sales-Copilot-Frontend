"use client";

import type { ReactNode } from "react";
import type { CompanyEmployeePreview, CompanyPreviewRecord } from "@/lib/api";
import { Icons } from "@/components/ui/Icons";
import { Building2, Calendar, Mail, MapPin, Phone, SquareArrowOutUpRight, type LucideIcon } from "lucide-react";
import { PreviewMaskedEmailPill, PreviewMaskedPhonePill } from "@/components/companies/PreviewMaskedPills";

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

function companyAvatarUrl(company: CompanyPreviewRecord | null): string | null {
  if (!company) return null;
  if (company.avatar_url) return company.avatar_url;
  const domain = company.domain || domainFromWebsiteUrl(company.website_url);
  return domain ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}` : null;
}

function formatCompanySizeLine(company: CompanyPreviewRecord | null): string {
  if (!company) return "Company size unavailable";
  if (company.estimated_num_employees != null && company.estimated_num_employees > 0) {
    return `${company.estimated_num_employees.toLocaleString()} employees`;
  }
  if (company.employee_range?.trim()) return company.employee_range.trim();
  return "Company size unavailable";
}

function previewCompanyWebsiteHref(company: CompanyPreviewRecord | null): string | null {
  if (!company) return null;
  const raw = company.website_url?.trim();
  if (raw) {
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }
  const d = company.domain?.trim();
  return d ? `https://${d.replace(/^www\./i, "")}` : null;
}

type DetailRowProps = { icon: LucideIcon; label: string; value: ReactNode };

function CompanyDetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
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

type Props = {
  displayName: string;
  company: CompanyPreviewRecord | null;
  employees: CompanyEmployeePreview[];
};

/**
 * Matches the landing hero company preview layout (`app/page.tsx` preview card + team grid).
 * Portal-only: company HQ phone / generic email when present on `CompanyPreviewRecord`.
 * Full employee list (scroll) vs landing’s short preview.
 */
export function WorkspaceCompanyFullPreview({ displayName, company, employees }: Props) {
  const title = company?.name?.trim() || displayName;
  const avatar = companyAvatarUrl(company);
  const website = previewCompanyWebsiteHref(company);
  const linkedin = company?.linkedin_url?.trim() || null;
  const companyEmail = company?.company_email?.trim() || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        className="landing-company-preview-card"
        style={{
          marginTop: 0,
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          padding: "18px 20px",
        }}
      >
        <div
          className="landing-company-preview-split"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <style jsx global>{`
            @media (min-width: 640px) {
              .landing-company-preview-split {
                flex-direction: row !important;
                align-items: stretch !important;
                gap: 0 !important;
              }
              .workspace-landing-split__left {
                flex: 1 1 0;
                min-width: 0;
                padding-right: 20px;
              }
              .workspace-landing-split__divider {
                flex: 0 0 1px;
                align-self: stretch;
                min-height: 120px;
                background: color-mix(in srgb, var(--color-border) 75%, transparent);
              }
              .workspace-landing-split__right {
                flex: 1 1 0;
                min-width: 0;
                padding-left: 20px;
              }
            }
            @media (max-width: 639px) {
              .workspace-landing-split__divider {
                display: none;
              }
              .workspace-landing-split__right {
                padding-top: 8px;
                border-top: 1px solid var(--color-border);
              }
            }
          `}</style>

          <div className="workspace-landing-split__left">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    objectFit: "contain",
                    border: "none",
                    flexShrink: 0,
                    background: "transparent",
                    padding: 0,
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-muted)",
                    fontSize: 18,
                    fontWeight: 600,
                    flexShrink: 0,
                    background: "transparent",
                  }}
                >
                  {title.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--color-text)",
                    lineHeight: 1.25,
                    marginBottom: 8,
                  }}
                >
                  {title}
                </div>
                {website || linkedin ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 4,
                          borderRadius: 8,
                          border: "none",
                          background: "transparent",
                          color: "var(--color-text-muted)",
                        }}
                        title="Company website"
                        aria-label="Open company website in a new tab"
                      >
                        <SquareArrowOutUpRight size={18} strokeWidth={1.75} aria-hidden />
                      </a>
                    ) : null}
                    {linkedin ? (
                      <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 4,
                          borderRadius: 8,
                          border: "none",
                          background: "transparent",
                          color: "#0077b5",
                        }}
                        title="LinkedIn"
                        aria-label="Open company LinkedIn in a new tab"
                      >
                        <Icons.Linkedin size={18} strokeWidth={1.75} aria-hidden />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 4 }}>
                  {formatCompanySizeLine(company)}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  {company?.location?.trim() || "Location not available"}
                </div>
              </div>
            </div>
          </div>

          <div className="workspace-landing-split__divider" aria-hidden />

          <div className="workspace-landing-split__right">
            <CompanyDetailRow icon={Building2} label="Industry" value={company?.industry?.trim() || "N/A"} />
            <CompanyDetailRow
              icon={Calendar}
              label="Founded in"
              value={company?.founded_year != null ? String(company.founded_year) : "—"}
            />
            <CompanyDetailRow icon={MapPin} label="Location" value={company?.location?.trim() || "—"} />
            {company?.phone?.trim() ? (
              <CompanyDetailRow icon={Phone} label="Phone" value={company.phone.trim()} />
            ) : null}
            {companyEmail ? (
              <CompanyDetailRow icon={Mail} label="Email" value={companyEmail} />
            ) : null}
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          No public employee rows were returned for this organization in Apollo (or the org has limited indexed contacts).
        </p>
      ) : null}

      {employees.length > 0 ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "min(60vh, 560px)",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
            }}
          >
            Team preview ({employees.length.toLocaleString()})
          </div>
          <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
            {employees.map((emp, idx) => (
              <div
                key={`${emp.full_name}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1.15fr)",
                  gap: 8,
                  padding: "10px 12px",
                  borderBottom: idx === employees.length - 1 ? "none" : "1px solid var(--color-border)",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: "var(--color-text)",
                    fontWeight: 500,
                    minWidth: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {emp.full_name}
                </div>
                <div style={{ color: "var(--color-text-muted)", minWidth: 0 }}>{emp.title || "Team member"}</div>
                <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                  <PreviewMaskedEmailPill value={(emp.email ?? emp.email_masked)?.trim() || null} />
                </div>
                <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                  <PreviewMaskedPhonePill value={(emp.phone ?? emp.phone_masked)?.trim() || null} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
