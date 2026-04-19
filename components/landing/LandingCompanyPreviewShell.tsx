"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, Building2, Calendar, MapPin, RotateCcw, SquareArrowOutUpRight } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import {
  api,
  APIError,
  type CompanyEmployeePreview,
  type CompanyPreviewRecord,
  type CompanyPreviewTries,
} from "@/lib/api";
import { mergeCompanyPreview } from "@/lib/companyPreviewMerge";
import {
  companyAvatarUrl,
  companyPreviewMeta,
  formatPreviewEmployeeLine,
  LandingCompanyDetailRow,
  LandingTeamPreviewEmailPill,
  LandingTeamPreviewPhonePill,
  previewCompanyWebsiteHref,
} from "@/components/landing/LandingCompanyPreviewParts";

type Ctx = {
  companyQuery: string;
  setCompanyQuery: (v: string) => void;
  setPreviewError: (v: string | null) => void;
  companySuggestions: CompanyPreviewRecord[];
  companySearchLoading: boolean;
  previewCompany: CompanyPreviewRecord | null;
  previewLoading: boolean;
  previewError: string | null;
  previewEmployees: CompanyEmployeePreview[];
  previewLoadingName: string | null;
  teamPreviewSeeFullArrowRevealed: boolean;
  setTeamPreviewSeeFullArrowRevealed: (v: boolean) => void;
  loadCompanyPreview: (company: CompanyPreviewRecord) => Promise<void>;
  resetCompanySearch: () => void;
  /** `hero` matches marketing hero (transparent suggestion panel). `app` uses app theme borders. */
  variant: "hero" | "app";
};

const LandingCompanyPreviewContext = createContext<Ctx | null>(null);

export function useLandingCompanyPreview(): Ctx {
  const v = useContext(LandingCompanyPreviewContext);
  if (!v) throw new Error("useLandingCompanyPreview must be used within LandingCompanyPreviewProvider");
  return v;
}

export function LandingCompanyPreviewProvider({
  children,
  variant = "hero",
}: {
  children: ReactNode;
  variant?: "hero" | "app";
}) {
  const [companyQuery, setCompanyQuery] = useState("");
  const [companySuggestions, setCompanySuggestions] = useState<CompanyPreviewRecord[]>([]);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<CompanyPreviewRecord | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [, setPreviewTries] = useState<CompanyPreviewTries | null>(null);
  const [previewEmployees, setPreviewEmployees] = useState<CompanyEmployeePreview[]>([]);
  const [previewLoadingName, setPreviewLoadingName] = useState<string | null>(null);
  const [teamPreviewSeeFullArrowRevealed, setTeamPreviewSeeFullArrowRevealed] = useState(false);

  useEffect(() => {
    setTeamPreviewSeeFullArrowRevealed(false);
  }, [previewCompany?.id]);

  useEffect(() => {
    const q = companyQuery.trim();
    if (q.length < 2) {
      setCompanySuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setCompanySearchLoading(true);
      try {
        const result = await api.getLandingCompanySuggestions(q, 10);
        if (cancelled) return;
        setCompanySuggestions(Array.isArray(result?.companies) ? result.companies : []);
        if (result?.tries) {
          setPreviewTries(result.tries);
        }
      } catch {
        if (cancelled) return;
        setCompanySuggestions([]);
      } finally {
        if (!cancelled) {
          setCompanySearchLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyQuery]);

  const loadCompanyPreview = useCallback(async (company: CompanyPreviewRecord) => {
    setCompanySuggestions([]);
    setCompanySearchLoading(false);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewCompany(null);
    setPreviewEmployees([]);
    setPreviewLoadingName(company.name?.trim() || null);
    try {
      const result = await api.getLandingCompanyDetails({
        company_id: company.id,
        domain: company.domain || undefined,
        name: company.name || undefined,
      });
      setPreviewCompany(mergeCompanyPreview(company, result.company));
      setPreviewEmployees(Array.isArray(result.employees_preview) ? result.employees_preview : []);
      if (result.tries) {
        setPreviewTries(result.tries);
      }
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 429) {
          setPreviewError("Free preview limit reached for today. Sign up to unlock full company search.");
          const details = error.details as { tries?: CompanyPreviewTries } | undefined;
          if (details?.tries) {
            setPreviewTries(details.tries);
          }
        } else {
          setPreviewError(error.message || "Could not load company profile.");
        }
      } else if (error instanceof Error) {
        setPreviewError(error.message);
      } else {
        setPreviewError("Could not load company profile.");
      }
    } finally {
      setPreviewLoading(false);
      setPreviewLoadingName(null);
    }
  }, []);

  const resetCompanySearch = useCallback(() => {
    setCompanyQuery("");
    setCompanySuggestions([]);
    setPreviewCompany(null);
    setPreviewEmployees([]);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewLoadingName(null);
    setCompanySearchLoading(false);
    setTeamPreviewSeeFullArrowRevealed(false);
  }, []);

  const value = useMemo(
    () =>
      ({
        companyQuery,
        setCompanyQuery,
        setPreviewError,
        companySuggestions,
        companySearchLoading,
        previewCompany,
        previewLoading,
        previewError,
        previewEmployees,
        previewLoadingName,
        teamPreviewSeeFullArrowRevealed,
        setTeamPreviewSeeFullArrowRevealed,
        loadCompanyPreview,
        resetCompanySearch,
        variant,
      }) satisfies Ctx,
    [
      companyQuery,
      companySuggestions,
      companySearchLoading,
      previewCompany,
      previewLoading,
      previewError,
      previewEmployees,
      previewLoadingName,
      teamPreviewSeeFullArrowRevealed,
      loadCompanyPreview,
      resetCompanySearch,
      variant,
    ]
  );

  return <LandingCompanyPreviewContext.Provider value={value}>{children}</LandingCompanyPreviewContext.Provider>;
}

/** Same 4-up pill row as `LandingHero` (between search input and suggestions). */
export function LandingCompanyPreviewHeroPills() {
  return (
    <ul
      className="landing-hero-preview-pills mt-6 grid w-full min-w-0 grid-cols-4 list-none gap-1 p-0 sm:gap-1.5"
      aria-label="What you get in this preview"
    >
      {["Match in seconds", "Full firmographics", "Privacy-first", "Free to try"].map((label) => (
        <li key={label} className="min-w-0">
          <span className="flex min-h-[2.25rem] items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-surface)_98%,var(--color-primary))] px-1 py-1.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:min-h-0 sm:rounded-xl sm:px-1.5 sm:py-2">
            <span className="text-[9px] font-semibold leading-tight text-[color:var(--color-text)] sm:text-[10px]">
              {label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LandingCompanyPreviewSearchInput({ className }: { className?: string }) {
  const { companyQuery, setCompanyQuery, setPreviewError } = useLandingCompanyPreview();
  return (
    <div
      className={
        className ??
        "landing-hero-search flex w-full min-w-0 items-center overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      }
    >
      <span className="flex shrink-0 items-center justify-center pl-3 pr-1" aria-hidden>
        <Icons.Search size={18} strokeWidth={2} className="block shrink-0 text-[color:var(--color-text-muted)]" />
      </span>
      <input
        type="text"
        value={companyQuery}
        onChange={(event) => {
          setCompanyQuery(event.target.value);
          setPreviewError(null);
        }}
        placeholder="Company name, domain, or link — e.g. Stripe, sparkai.ae, https://acme.com"
        className="landing-hero-search-input min-w-0 flex-1 rounded-none border-0 bg-transparent py-3.5 pr-4 pl-0 text-[15px] leading-normal text-[color:var(--color-text)] !shadow-none outline-none ring-0 placeholder:text-[color:var(--color-text-muted)] focus:!border-0 focus:!bg-transparent focus:!shadow-none focus:outline-none focus-visible:outline-none focus:ring-0"
        aria-label="Search for a company to preview"
      />
    </div>
  );
}

export function LandingCompanyPreviewBody() {
  const {
    companyQuery,
    companySuggestions,
    companySearchLoading,
    previewCompany,
    previewLoading,
    previewError,
    previewEmployees,
    previewLoadingName,
    teamPreviewSeeFullArrowRevealed,
    setTeamPreviewSeeFullArrowRevealed,
    loadCompanyPreview,
    resetCompanySearch,
    variant,
  } = useLandingCompanyPreview();

  const suggestionPanelStyle =
    variant === "hero"
      ? {
          marginTop: 10,
          border: "none",
          borderRadius: 12,
          maxHeight: 210,
          overflowY: "auto" as const,
          background: "transparent",
        }
      : {
          marginTop: 10,
          borderRadius: 12,
          maxHeight: 210,
          overflowY: "auto" as const,
          border: "1px solid var(--color-border)",
          background: "var(--color-background)",
        };

  const suggestionBorder = variant === "hero" ? "1px solid var(--color-border-light)" : "1px solid var(--color-border)";

  return (
    <>
      {!previewLoading &&
        !previewCompany &&
        (companySearchLoading || companySuggestions.length > 0 || companyQuery.trim().length >= 2) && (
          <div style={suggestionPanelStyle}>
            {companySearchLoading ? (
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
                <Icons.Loader size={14} className="animate-spin" />
                Searching companies...
              </div>
            ) : companySuggestions.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>
                No company suggestions found.
              </div>
            ) : (
              companySuggestions.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => void loadCompanyPreview(company)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: suggestionBorder,
                    background: "transparent",
                    color: "var(--color-text)",
                    padding: "11px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {companyAvatarUrl(company) ? (
                    <img
                      src={companyAvatarUrl(company) || ""}
                      alt={`${company.name} avatar`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        objectFit: "cover",
                        border: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
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

      {previewLoading ? (
        <div
          style={{
            marginTop: 14,
            minHeight: 148,
            borderRadius: 12,
            border: "none",
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "22px 16px",
            textAlign: "center",
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <Icons.Loader size={22} className="animate-spin text-[color:var(--color-primary)]" />
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>
            {previewLoadingName ? `Loading ${previewLoadingName}…` : "Loading company…"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", maxWidth: 280, lineHeight: 1.45 }}>
            Fetching firmographics and team preview
          </div>
        </div>
      ) : null}

      {previewError ? (
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
          {previewError}
        </div>
      ) : null}

      {previewCompany ? (
        <>
          <div className="landing-company-preview-card" style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#1d4ed8",
                  background: "rgba(219, 234, 254, 0.85)",
                  border: "1px solid rgba(147, 197, 253, 0.85)",
                  borderRadius: 9999,
                  padding: "6px 12px",
                }}
              >
                Company information
              </span>
              <button
                type="button"
                onClick={resetCompanySearch}
                className="landing-company-preview-reset"
                title="Clear search and company preview"
                aria-label="Clear search and company preview"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(255, 255, 255, 0.65)",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                }}
              >
                <RotateCcw size={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            <div className="landing-company-preview-split">
              <div className="landing-company-preview-split__left">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {companyAvatarUrl(previewCompany) ? (
                    <img
                      src={companyAvatarUrl(previewCompany) || ""}
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
                      {previewCompany.name.slice(0, 1).toUpperCase()}
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
                      {previewCompany.name}
                    </div>
                    {previewCompanyWebsiteHref(previewCompany) || previewCompany.linkedin_url ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        {previewCompanyWebsiteHref(previewCompany) ? (
                          <a
                            href={previewCompanyWebsiteHref(previewCompany)!}
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
                        {previewCompany.linkedin_url ? (
                          <a
                            href={previewCompany.linkedin_url}
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
                      {formatPreviewEmployeeLine(previewCompany)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                      {previewCompany.location || "Location not available"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-company-preview-split__divider" aria-hidden />

              <div className="landing-company-preview-split__right">
                <LandingCompanyDetailRow icon={Building2} label="Industry" value={previewCompany.industry || "N/A"} />
                <LandingCompanyDetailRow
                  icon={Calendar}
                  label="Founded in"
                  value={previewCompany.founded_year != null ? String(previewCompany.founded_year) : "—"}
                />
                <LandingCompanyDetailRow icon={MapPin} label="Location" value={previewCompany.location || "—"} />
              </div>
            </div>
          </div>

          {previewEmployees.length > 0 ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                background: "var(--color-surface)",
                overflow: "hidden",
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
                  borderBottom: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                }}
              >
                Team preview
              </div>
              {previewEmployees.map((emp, idx) => (
                <div
                  key={`${emp.full_name}-${idx}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1.15fr)",
                    gap: 8,
                    padding: "10px 12px",
                    borderBottom:
                      idx === previewEmployees.length - 1
                        ? "none"
                        : `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
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
                    <LandingTeamPreviewEmailPill />
                  </div>
                  <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                    <LandingTeamPreviewPhonePill />
                  </div>
                </div>
              ))}
              <div
                style={{
                  borderTop: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                  padding: "12px 14px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "var(--color-surface)",
                }}
              >
                <Link
                  href="/auth/signup"
                  className="landing-team-results-link"
                  data-arrow-revealed={teamPreviewSeeFullArrowRevealed ? "true" : "false"}
                  onMouseEnter={() => setTeamPreviewSeeFullArrowRevealed(true)}
                >
                  <span className="landing-team-results-text">See the full results</span>
                  <span className="landing-team-results-arrow" aria-hidden>
                    <ArrowRight size={16} strokeWidth={2} />
                  </span>
                </Link>
                <Link
                  href="/auth/signup"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 18px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#ffffff",
                    background: "#2563eb",
                    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  Sign-up for free
                </Link>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
