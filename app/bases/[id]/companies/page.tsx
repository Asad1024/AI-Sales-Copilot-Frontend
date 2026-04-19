"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBaseStore } from "@/stores/useBaseStore";
import { api, type CompanyEmployeePreview, type CompanyPreviewRecord } from "@/lib/api";
import { Icons } from "@/components/ui/Icons";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { useNotification } from "@/context/NotificationContext";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { WorkspaceCompanyFullPreview } from "@/components/companies/WorkspaceCompanyFullPreview";
import { Building2, Download, RotateCcw } from "lucide-react";

const PORTAL_COMPANY_CREDITS = 30;

function companyPreviewMeta(company: CompanyPreviewRecord): string {
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

function companyAvatarUrl(company: CompanyPreviewRecord): string | null {
  if (company.avatar_url) return company.avatar_url;
  const domain = company.domain || domainFromWebsiteUrl(company.website_url);
  return domain ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}` : null;
}

function csvEscape(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function downloadEmployeesCsv(companyName: string, rows: CompanyEmployeePreview[]) {
  const header = ["Full name", "Title", "Email", "Phone", "LinkedIn URL"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.full_name),
        csvEscape(r.title || ""),
        csvEscape((r.email ?? r.email_masked) || ""),
        csvEscape((r.phone ?? r.phone_masked) || ""),
        csvEscape(r.linkedin_url || ""),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const safe = companyName.replace(/[^\w\-]+/g, "_").slice(0, 60) || "company";
  a.href = URL.createObjectURL(blob);
  a.download = `${safe}_employees.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function BaseCompaniesPage() {
  const router = useRouter();
  const params = useParams();
  const baseId = params?.id ? parseInt(params.id as string, 10) : null;
  const { bases, setActiveBaseId, refreshBases } = useBaseStore();
  const { activeBaseId } = useBaseStore();
  const { permissions, loading: permissionsLoading } = useBasePermissions(baseId || activeBaseId);
  const { showError, showSuccess } = useNotification();

  const [pageReady, setPageReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CompanyPreviewRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [resultCompany, setResultCompany] = useState<CompanyPreviewRecord | null>(null);
  const [resultEmployees, setResultEmployees] = useState<CompanyEmployeePreview[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [creditsAfter, setCreditsAfter] = useState<number | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  const currentBaseId = baseId || activeBaseId;
  const workspaceName = bases.find((b) => b.id === currentBaseId)?.name ?? "";

  const loadCredits = useCallback(async () => {
    if (!currentBaseId) return;
    try {
      const data = await api.getWorkspaceCreditsSummary(currentBaseId);
      setCreditsBalance(Number(data?.credits_balance ?? 0));
    } catch {
      setCreditsBalance(null);
    }
  }, [currentBaseId]);

  useEffect(() => {
    const sync = async () => {
      if (!baseId) {
        if (activeBaseId) router.replace(`/bases/${activeBaseId}/companies`);
        else if (bases.length > 0) router.replace(`/bases/${bases[0].id}/companies`);
        else router.replace("/bases");
        return;
      }
      if (bases.length === 0) await refreshBases();
      setActiveBaseId(baseId);
      setPageReady(true);
    };
    void sync();
  }, [baseId, activeBaseId, bases.length, refreshBases, router, setActiveBaseId]);

  useEffect(() => {
    if (currentBaseId) void loadCredits();
  }, [currentBaseId, loadCredits]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !currentBaseId) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.searchCompanies(currentBaseId, q, 10);
        if (cancelled) return;
        setSuggestions(Array.isArray(res?.companies) ? res.companies : []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, currentBaseId]);

  const resetAll = () => {
    setQuery("");
    setSuggestions([]);
    setPortalError(null);
    setResultCompany(null);
    setResultEmployees([]);
    setDisplayName("");
    setCreditsAfter(null);
    setPortalLoading(false);
  };

  const runPortalPreview = async (pick: CompanyPreviewRecord) => {
    if (!currentBaseId || permissions.canReadLeads === false) return;
    if (creditsBalance !== null && creditsBalance < PORTAL_COMPANY_CREDITS) {
      showError("Not enough credits", `You need at least ${PORTAL_COMPANY_CREDITS} credits.`);
      return;
    }
    setSuggestions([]);
    setSearchLoading(false);
    setPortalError(null);
    setResultCompany(null);
    setResultEmployees([]);
    setDisplayName("");
    setPortalLoading(true);
    try {
      const data = await api.fetchCompanyEmployeesPreview(currentBaseId, {
        name: pick.name?.trim() || query.trim(),
        company_id: pick.id || null,
        domain: pick.domain || null,
      });
      setDisplayName(data?.company_name?.trim() || pick.name?.trim() || query.trim());
      setResultCompany(data?.company ?? null);
      setResultEmployees(Array.isArray(data?.employees) ? data.employees : []);
      setCreditsAfter(typeof data?.credits_balance === "number" ? data.credits_balance : null);
      if (typeof data?.credits_balance === "number") {
        setCreditsBalance(data.credits_balance);
      }
      showSuccess(
        "Company loaded",
        `${PORTAL_COMPANY_CREDITS} credits applied. Remaining: ${data?.credits_balance ?? "—"}.`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sparkai:user-changed"));
        window.dispatchEvent(new Event("sparkai:active-base-changed"));
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 402) {
        showError("Insufficient credits", err.message || `Add credits (${PORTAL_COMPANY_CREDITS} required).`);
      } else {
        showError("Could not load company", err?.message || "Try again.");
      }
      setPortalError(err?.message || "Could not load company.");
      setDisplayName("");
      setResultCompany(null);
      setResultEmployees([]);
    } finally {
      setPortalLoading(false);
    }
  };

  if (!baseId || !currentBaseId || !pageReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          background: "var(--color-canvas)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--color-text-muted)" }}>
          <Icons.Loader size={20} strokeWidth={1.5} style={{ animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading…</span>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const insufficient = creditsBalance !== null && creditsBalance < PORTAL_COMPANY_CREDITS;
  const canRunPortal = !insufficient && permissions.canReadLeads !== false;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        width: "100%",
        background: "var(--color-canvas)",
        padding: "clamp(16px, 3vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {permissionsLoading ? (
        <GlobalPageLoader layout="embedded" fill minHeight={400} ariaLabel="Loading" />
      ) : (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-primary)",
              }}
              aria-hidden
            >
              <Building2 size={22} strokeWidth={1.75} />
            </span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text)",
                }}
              >
                Companies
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                {workspaceName ? (
                  <>
                    Search like the homepage — pick a company to load{" "}
                    <strong>full firmographics + team list</strong> in this workspace ({PORTAL_COMPANY_CREDITS} credits
                    each time; nothing is saved).
                  </>
                ) : (
                  <>
                    Full company + employee list ({PORTAL_COMPANY_CREDITS} credits). Results stay only in this session
                    until you reset.
                  </>
                )}
              </p>
            </div>
          </div>

          {creditsBalance != null ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
                marginBottom: 20,
              }}
            >
              <strong style={{ color: "var(--color-text)" }}>Credits:</strong> {creditsBalance} · Each lookup uses{" "}
              {PORTAL_COMPANY_CREDITS} credits.
              {insufficient ? (
                <span style={{ marginLeft: 8, color: "#b45309" }}>Add credits in Billing to run a search.</span>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              borderRadius: "1.25rem",
              border: "1px solid color-mix(in srgb, var(--color-border) 88%, transparent)",
              background: "var(--color-surface)",
              padding: "clamp(20px, 4vw, 36px)",
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.07), 0 1px 0 rgba(255, 255, 255, 0.65) inset",
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">
                Try it
              </span>
            </div>
            <h2
              className="mt-1 max-w-full text-[clamp(13px,3.1vw,15px)] font-semibold leading-snug tracking-tight text-balance text-[color:var(--color-text)]"
              style={{ margin: "8px 0 0" }}
            >
              Search any company — enriched intel and full team list
            </h2>

            <label
              htmlFor="company-search-input"
              style={{
                display: "block",
                marginTop: 20,
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text)",
              }}
            >
              Company name
            </label>
            <div
              className="landing-hero-search flex w-full min-w-0 items-center overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              style={{ marginBottom: 10 }}
            >
              <span className="flex shrink-0 items-center justify-center pl-3 pr-1" aria-hidden>
                <Icons.Search size={18} strokeWidth={2} className="block shrink-0 text-[color:var(--color-text-muted)]" />
              </span>
              <input
                id="company-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPortalError(null);
                }}
                placeholder="Company name, domain, or link — e.g. Stripe, sparkai.ae, https://acme.com"
                disabled={!canRunPortal}
                className="min-w-0 flex-1 rounded-none border-0 bg-transparent py-3.5 pr-4 pl-0 text-[15px] leading-normal text-[color:var(--color-text)] shadow-none outline-none ring-0 placeholder:text-[color:var(--color-text-muted)] focus:border-0 focus:bg-transparent focus:shadow-none focus:outline-none focus:ring-0"
                aria-label="Search for a company"
              />
            </div>

            {!portalLoading &&
              !resultCompany &&
              resultEmployees.length === 0 &&
              !displayName &&
              (searchLoading || suggestions.length > 0 || query.trim().length >= 2) && (
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 12,
                    maxHeight: 210,
                    overflowY: "auto",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-background)",
                  }}
                >
                  {searchLoading ? (
                    <div
                      style={{
                        padding: "12px 14px",
                        fontSize: 13,
                        color: "var(--color-text-muted)",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Icons.Loader size={14} style={{ animation: "spin 0.9s linear infinite" }} />
                      Searching companies…
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      No company suggestions found.
                    </div>
                  ) : (
                    suggestions.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        disabled={!canRunPortal}
                        onClick={() => void runPortalPreview(company)}
                        style={{
                          width: "100%",
                          border: "none",
                          borderBottom: "1px solid var(--color-border)",
                          background: "transparent",
                          color: "var(--color-text)",
                          padding: "11px 14px",
                          textAlign: "left",
                          cursor: canRunPortal ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          opacity: canRunPortal ? 1 : 0.5,
                        }}
                      >
                        {companyAvatarUrl(company) ? (
                          <img
                            src={companyAvatarUrl(company) || ""}
                            alt=""
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              objectFit: "cover",
                              border: "1px solid var(--color-border)",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              border: "1px solid var(--color-border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--color-text-muted)",
                              fontSize: 12,
                              fontWeight: 500,
                              flexShrink: 0,
                            }}
                          >
                            {company.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{company.name}</span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {companyPreviewMeta(company) || company.domain || "Company profile"}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

            {portalLoading ? (
              <div
                style={{
                  marginTop: 16,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 24,
                  textAlign: "center",
                }}
              >
                <Icons.Loader size={22} strokeWidth={1.5} style={{ animation: "spin 0.9s linear infinite" }} />
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>Loading company…</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", maxWidth: 280, lineHeight: 1.45 }}>
                  Fetching full firmographics and team ({PORTAL_COMPANY_CREDITS} credits)
                </div>
              </div>
            ) : null}

            {portalError ? (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(220, 38, 38, 0.28)",
                  background: "rgba(220, 38, 38, 0.08)",
                  color: "var(--color-text)",
                  padding: "10px 12px",
                  fontSize: 13,
                }}
              >
                {portalError}
              </div>
            ) : null}

            {(resultCompany || resultEmployees.length > 0 || displayName) && !portalLoading ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={resetAll}
                    title="Clear and search again"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-text-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} />
                    Reset
                  </button>
                </div>
                {creditsAfter != null ? (
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--color-text-muted)" }}>
                    Credits after load: <strong style={{ color: "var(--color-text)" }}>{creditsAfter}</strong> (−
                    {PORTAL_COMPANY_CREDITS})
                  </p>
                ) : null}
                <WorkspaceCompanyFullPreview
                  displayName={displayName}
                  company={resultCompany}
                  employees={resultEmployees}
                />
                <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      border: "none",
                      cursor: resultEmployees.length === 0 ? "not-allowed" : "pointer",
                      opacity: resultEmployees.length === 0 ? 0.45 : 1,
                    }}
                    disabled={resultEmployees.length === 0}
                    onClick={() => downloadEmployeesCsv(displayName || "company", resultEmployees)}
                  >
                    <Download size={16} strokeWidth={2} />
                    Download employee list
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
