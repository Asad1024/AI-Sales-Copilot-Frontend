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
import { ArrowRight, Building2, Calendar, Download, Mail, MapPin, Phone, RotateCcw, Sparkles, SquareArrowOutUpRight } from "lucide-react";
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
  LandingTeamPreviewEmailPill,
  LandingTeamPreviewPhonePill,
  previewCompanyWebsiteHref,
} from "@/components/landing/LandingCompanyPreviewParts";

function emitWorkspaceCreditsChanged(baseId: number | null | undefined): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("sparkai:workspace-credits-changed", {
      detail: { baseId: typeof baseId === "number" ? baseId : null },
    })
  );
}

type Ctx = {
  baseId: number | null;
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
  employeeLimit = 5,
  baseId = null,
}: {
  children: ReactNode;
  variant?: "hero" | "app";
  employeeLimit?: number;
  baseId?: number | null;
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
        if (variant === "app" && baseId) {
          const result = await api.searchCompanies(baseId, q, 10);
          if (cancelled) return;
          setCompanySuggestions(Array.isArray(result?.companies) ? result.companies : []);
        } else {
          const result = await api.getLandingCompanySuggestions(q, 10);
          if (cancelled) return;
          setCompanySuggestions(Array.isArray(result?.companies) ? result.companies : []);
          if (result?.tries) {
            setPreviewTries(result.tries);
          }
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
  }, [baseId, companyQuery, variant]);

  const loadCompanyPreview = useCallback(async (company: CompanyPreviewRecord) => {
    setCompanySuggestions([]);
    setCompanySearchLoading(false);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewCompany(null);
    setPreviewEmployees([]);
    setPreviewLoadingName(company.name?.trim() || null);
    try {
      if (variant === "app" && baseId) {
        const result = await api.fetchCompanyProspeoPreview(baseId, {
          company_id: company.id,
          domain: company.domain || undefined,
          linkedin_url: company.linkedin_url || undefined,
          name: company.name,
          employee_limit: employeeLimit,
        });
        setPreviewCompany(result.company ? mergeCompanyPreview(company, result.company) : company);
        setPreviewEmployees(Array.isArray(result.employees_preview) ? result.employees_preview : []);
        if ((Number(result?.credits_charged || 0) > 0 || result?.credits_balance != null) && baseId) {
          emitWorkspaceCreditsChanged(baseId);
        }
      } else {
        const result = await api.getLandingCompanyDetails({
          company_id: company.id,
          domain: company.domain || undefined,
          name: company.name || undefined,
          employee_limit: employeeLimit,
        });
        setPreviewCompany(mergeCompanyPreview(company, result.company));
        setPreviewEmployees(Array.isArray(result.employees_preview) ? result.employees_preview : []);
        if (result.tries) {
          setPreviewTries(result.tries);
        }
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
  }, [baseId, employeeLimit, variant]);

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
        baseId,
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
      baseId,
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
        placeholder="Company name, domain, or link - e.g. Stripe, sparkai.ae, https://acme.com"
        className="landing-hero-search-input min-w-0 flex-1 rounded-none border-0 bg-transparent py-3.5 pr-4 pl-0 text-[15px] leading-normal text-[color:var(--color-text)] !shadow-none outline-none ring-0 placeholder:text-[color:var(--color-text-muted)] focus:!border-0 focus:!bg-transparent focus:!shadow-none focus:outline-none focus-visible:outline-none focus:ring-0"
        aria-label="Search for a company to preview"
      />
    </div>
  );
}

export function LandingCompanyPreviewBody({
  showSignupCtas = true,
  showEmployeeLinkedIn = false,
}: {
  showSignupCtas?: boolean;
  showEmployeeLinkedIn?: boolean;
}) {
  const APP_PREVIEW_PAGE_SIZE = 15;
  const {
    baseId,
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

  const [rowContactByKey, setRowContactByKey] = useState<Record<string, CompanyEmployeePreview>>({});
  const [rowEnrichingByKey, setRowEnrichingByKey] = useState<Record<string, boolean>>({});
  const [rowNoDataByKey, setRowNoDataByKey] = useState<Record<string, boolean>>({});
  const [rowEnrichStartedAtByKey, setRowEnrichStartedAtByKey] = useState<Record<string, number>>({});
  const [enrichTimerNow, setEnrichTimerNow] = useState<number>(Date.now());
  const [enrichSelectedRunning, setEnrichSelectedRunning] = useState(false);
  const [selectedRowByKey, setSelectedRowByKey] = useState<Record<string, boolean>>({});
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    setRowContactByKey({});
    setRowEnrichingByKey({});
    setRowNoDataByKey({});
    setRowEnrichStartedAtByKey({});
    setSelectedRowByKey({});
    setPreviewPage(1);
  }, [previewCompany?.id]);

  useEffect(() => {
    const hasActive = Object.values(rowEnrichingByKey).some(Boolean);
    if (!hasActive) return;
    const id = window.setInterval(() => setEnrichTimerNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [rowEnrichingByKey]);

  const employeeRowKey = useCallback((emp: CompanyEmployeePreview, idx: number) => {
    if (emp.person_id && emp.person_id.trim()) return `id:${emp.person_id.trim()}`;
    const li = emp.linkedin_url?.trim().toLowerCase();
    if (li) return `li:${li}`;
    return `idx:${idx}|${(emp.full_name || "").trim().toLowerCase()}|${(emp.title || "").trim().toLowerCase()}`;
  }, []);

  useEffect(() => {
    if (previewEmployees.length === 0) return;
    setRowContactByKey((prev) => {
      const next = { ...prev };
      previewEmployees.forEach((emp, idx) => {
        const rowKey = employeeRowKey(emp, idx);
        const email = String(emp.email || "").trim();
        const phone = String(emp.phone || "").trim();
        if (email || phone) {
          next[rowKey] = {
            ...emp,
            email: email || null,
            phone: phone || null,
          };
        }
      });
      return next;
    });
  }, [employeeRowKey, previewEmployees]);

  const enrichPreviewPerson = useCallback(async (emp: CompanyEmployeePreview, idx: number) => {
    if (variant !== "app" || !baseId || !previewCompany) return;
    const rowKey = employeeRowKey(emp, idx);
    if (rowEnrichingByKey[rowKey]) return;
    setRowEnrichingByKey((prev) => ({ ...prev, [rowKey]: true }));
    setRowEnrichStartedAtByKey((prev) => ({ ...prev, [rowKey]: Date.now() }));
    try {
      const start = await api.enrichCompanyPreviewPerson(baseId, {
        name: previewCompany.name,
        company_id: previewCompany.id || null,
        domain: previewCompany.domain || null,
        person_id: emp.person_id || null,
        linkedin_url: emp.linkedin_url || null,
        full_name: emp.full_name || null,
      });

      const maxAttempts = 60;
      const intervalMs = 2000;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        const status = await api.getCompanyPreviewEnrichPersonStatus(baseId, start.job_id);
        if (status.status === "queued" || status.status === "processing") {
          continue;
        }

        emitWorkspaceCreditsChanged(baseId);

        const contact = status.contact ?? null;
        if (contact) {
          setRowContactByKey((prev) => ({ ...prev, [rowKey]: contact }));
        }
        setRowNoDataByKey((prev) => ({ ...prev, [rowKey]: !status.found }));
        return;
      }

      // Timed out waiting for webhook completion - keep button available for retry.
      setRowNoDataByKey((prev) => ({ ...prev, [rowKey]: false }));
    } catch {
      setRowNoDataByKey((prev) => ({ ...prev, [rowKey]: false }));
    } finally {
      setRowEnrichingByKey((prev) => ({ ...prev, [rowKey]: false }));
      setRowEnrichStartedAtByKey((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  }, [baseId, employeeRowKey, previewCompany, rowEnrichingByKey, variant]);

  const contactNeedsReveal = useCallback((contact: CompanyEmployeePreview | null | undefined) => {
    const emailText = String(contact?.email || "").trim();
    const phoneText = String(contact?.phone || "").trim();
    const unavailableRegex = /(not available|unavailable|not found|no contact)/i;
    const emailNeedsReveal = !emailText || unavailableRegex.test(emailText) || /[*]/.test(emailText);
    const phoneNeedsReveal = !phoneText || unavailableRegex.test(phoneText) || /[*]/.test(phoneText);
    return emailNeedsReveal || phoneNeedsReveal;
  }, []);

  const enrichableRowCount = useMemo(() => {
    if (variant !== "app") return 0;
    return previewEmployees.reduce((count, emp, idx) => {
      const rowKey = employeeRowKey(emp, idx);
      const contact = rowContactByKey[rowKey] || emp;
      return contactNeedsReveal(contact) ? count + 1 : count;
    }, 0);
  }, [contactNeedsReveal, employeeRowKey, previewEmployees, rowContactByKey, variant]);

  const selectedRowCount = useMemo(
    () => Object.values(selectedRowByKey).filter(Boolean).length,
    [selectedRowByKey]
  );

  const employeeRows = useMemo(
    () => previewEmployees.map((emp, idx) => ({ emp, idx, rowKey: employeeRowKey(emp, idx) })),
    [employeeRowKey, previewEmployees]
  );
  const employeePageSize = variant === "app" ? APP_PREVIEW_PAGE_SIZE : Math.max(employeeRows.length, 1);
  const previewPageCount = Math.max(1, Math.ceil(employeeRows.length / employeePageSize));
  const previewPageStart = (previewPage - 1) * employeePageSize;
  const pagedEmployeeRows = useMemo(
    () => employeeRows.slice(previewPageStart, previewPageStart + employeePageSize),
    [employeePageSize, employeeRows, previewPageStart]
  );
  const previewRangeStart = employeeRows.length === 0 ? 0 : previewPageStart + 1;
  const previewRangeEnd = Math.min(previewPageStart + pagedEmployeeRows.length, employeeRows.length);

  useEffect(() => {
    setPreviewPage((current) => Math.min(Math.max(1, current), previewPageCount));
  }, [previewPageCount]);

  const allRowsSelected = useMemo(
    () =>
      pagedEmployeeRows.length > 0 &&
      pagedEmployeeRows.every((row) => selectedRowByKey[row.rowKey] === true),
    [pagedEmployeeRows, selectedRowByKey]
  );

  const toggleRowSelection = useCallback((rowKey: string, checked: boolean) => {
    setSelectedRowByKey((prev) => ({ ...prev, [rowKey]: checked }));
  }, []);

  const toggleAllSelection = useCallback((checked: boolean) => {
    setSelectedRowByKey((prev) => {
      const next: Record<string, boolean> = { ...prev };
      pagedEmployeeRows.forEach((row) => {
        next[row.rowKey] = checked;
      });
      return next;
    });
  }, [pagedEmployeeRows]);

  const enrichSelectedPreviewPeople = useCallback(async () => {
    if (variant !== "app" || enrichSelectedRunning) return;
    const targets = previewEmployees
      .map((emp, idx) => ({
        emp,
        idx,
        key: employeeRowKey(emp, idx),
        contact: rowContactByKey[employeeRowKey(emp, idx)] || emp
      }))
      .filter((item) => selectedRowByKey[item.key] === true)
      .filter((item) => contactNeedsReveal(item.contact));
    if (!targets.length) return;
    setEnrichSelectedRunning(true);
    try {
      await Promise.allSettled(
        targets.map((target) => enrichPreviewPerson(target.emp, target.idx))
      );
    } finally {
      setEnrichSelectedRunning(false);
    }
  }, [contactNeedsReveal, employeeRowKey, enrichPreviewPerson, enrichSelectedRunning, previewEmployees, rowContactByKey, selectedRowByKey, variant]);

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
  const previewWebsiteHref = previewCompany ? previewCompanyWebsiteHref(previewCompany) : null;
  const previewWebsiteLabel = previewWebsiteHref
    ? previewWebsiteHref.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
    : "";
  const previewIndustry = previewCompany ? String(previewCompany.industry || "").trim() : "";
  const previewFounded = previewCompany?.founded_year != null ? String(previewCompany.founded_year) : "";
  const previewLocation = previewCompany ? String(previewCompany.location || "").trim() : "";
  const previewPhone = previewCompany ? String(previewCompany.phone || "").trim() : "";
  const previewCompanyEmail = previewCompany ? String(previewCompany.company_email || "").trim() : "";
  const previewInfoItems = [
    previewIndustry ? { key: "industry", icon: Building2, label: "Industry", value: previewIndustry } : null,
    previewFounded ? { key: "founded", icon: Calendar, label: "Founded", value: previewFounded } : null,
    previewLocation ? { key: "location", icon: MapPin, label: "Location", value: previewLocation } : null,
    previewPhone ? { key: "phone", icon: Phone, label: "Phone", value: previewPhone } : null,
    previewCompanyEmail ? { key: "company_email", icon: Mail, label: "Email", value: previewCompanyEmail } : null,
  ].filter(
    (
      item
    ): item is { key: string; icon: typeof Building2; label: string; value: string } => Boolean(item)
  );
  const hasActiveRowReveal = useMemo(() => Object.values(rowEnrichingByKey).some(Boolean), [rowEnrichingByKey]);
  const downloadPreviewEmployees = useCallback(() => {
    if (!previewEmployees.length) return;
    const csvEscape = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const headers = ["Name", "Role", "LinkedIn", "Email", "Phone"];
    const rows = previewEmployees.map((emp, idx) => {
      const rowKey = employeeRowKey(emp, idx);
      const contact = rowContactByKey[rowKey] || emp;
      const email = String(contact.email || emp.email_masked || "").trim();
      const phone = String(contact.phone || emp.phone_masked || "").trim();
      return [
        emp.full_name || "",
        emp.title || "",
        emp.linkedin_url || "",
        email || "",
        phone || "",
      ];
    });
    const csv = [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = String(previewCompany?.name || "company")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    link.href = url;
    link.download = `${safeName || "company"}-employee-list.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [employeeRowKey, previewCompany?.name, previewEmployees, rowContactByKey]);

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
            {previewLoadingName ? `Loading ${previewLoadingName}...` : "Loading company..."}
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
                  color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
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

            <div
              style={{
                width: "100%",
              }}
            >
              <div
                style={{
                  width: "100%",
                  minWidth: 0,
                }}
              >
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
                    {previewWebsiteHref || previewCompany.linkedin_url ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        {previewWebsiteHref ? (
                          <a
                            href={previewWebsiteHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              gap: 6,
                              minHeight: 30,
                              padding: "0 10px",
                              borderRadius: 999,
                              border: "1px solid var(--color-border)",
                              background: "var(--color-surface-secondary)",
                              color: "var(--color-text-muted)",
                              textDecoration: "none",
                              maxWidth: "100%",
                            }}
                            title="Company website"
                            aria-label="Open company website in a new tab"
                          >
                            <SquareArrowOutUpRight size={18} strokeWidth={1.75} aria-hidden />
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--color-text)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 180,
                              }}
                            >
                              {previewWebsiteLabel}
                            </span>
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
                              justifyContent: "flex-start",
                              gap: 6,
                              minHeight: 30,
                              padding: "0 10px",
                              borderRadius: 999,
                              border: "1px solid color-mix(in srgb, #0077b5 30%, var(--color-border) 70%)",
                              background: "color-mix(in srgb, #0077b5 8%, var(--color-surface) 92%)",
                              color: "#0077b5",
                              textDecoration: "none",
                            }}
                            title="LinkedIn"
                            aria-label="Open company LinkedIn in a new tab"
                          >
                            <Icons.Linkedin size={18} strokeWidth={1.75} aria-hidden />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>LinkedIn</span>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                    {previewInfoItems.length > 0 ? (
                      <div
                        style={{
                          marginTop: 8,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                          gap: 10,
                          width: "100%",
                          maxWidth: "100%",
                        }}
                      >
                        {previewInfoItems.map((item) => {
                          const IconComp = item.icon;
                          return (
                            <div
                              key={item.key}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                minHeight: 36,
                                width: "100%",
                                padding: "0 12px",
                                borderRadius: 10,
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface-secondary)",
                                color: "var(--color-text)",
                                boxSizing: "border-box",
                              }}
                            >
                              <IconComp size={15} strokeWidth={1.9} color="var(--color-primary)" />
                              <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>{item.label}:</span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--color-text)",
                                  fontWeight: 700,
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={item.value}
                              >
                                {item.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
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
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  borderBottom: `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Team preview
                </span>
                {variant === "app" ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={downloadPreviewEmployees}
                      disabled={previewEmployees.length === 0}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-secondary)",
                        color: "var(--color-text)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: previewEmployees.length === 0 ? "not-allowed" : "pointer",
                        opacity: previewEmployees.length === 0 ? 0.65 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Download size={12} strokeWidth={2} />
                      Download Employee List
                    </button>
                    <button
                      type="button"
                      onClick={() => void enrichSelectedPreviewPeople()}
                      disabled={enrichSelectedRunning || selectedRowCount === 0}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "1px solid color-mix(in srgb, var(--color-primary) 36%, var(--color-border) 64%)",
                        background: "var(--color-primary)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: enrichSelectedRunning || selectedRowCount === 0 ? "not-allowed" : "pointer",
                        opacity: enrichSelectedRunning || selectedRowCount === 0 ? 0.65 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {enrichSelectedRunning ? (
                        <>
                          <Icons.Loader size={12} strokeWidth={2.1} className="animate-spin" />
                          Enriching selected...
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} strokeWidth={2} />
                          Enrich Selected ({selectedRowCount})
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
              {variant === "app" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1.2fr) minmax(0, 1fr) 64px minmax(0, 1.3fr) minmax(0, 1.15fr) 152px",
                    gap: 8,
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    background: "color-mix(in srgb, var(--color-surface-secondary) 65%, transparent)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <input
                      type="checkbox"
                      checked={allRowsSelected}
                      onChange={(e) => toggleAllSelection(e.target.checked)}
                      aria-label="Select all rows"
                    />
                  </span>
                  <span>Name</span>
                  <span>Role</span>
                  <span style={{ textAlign: "center" }}>LinkedIn</span>
                  <span>Email</span>
                  <span>Phone</span>
                  <span>Enrich</span>
                </div>
              ) : null}
              {pagedEmployeeRows.map(({ emp, idx, rowKey }, rowIndex) => {
                const enriching = rowEnrichingByKey[rowKey] === true;
                const enriched = rowContactByKey[rowKey];
                const emailText = String(enriched?.email || "").trim();
                const phoneText = String(enriched?.phone || "").trim();
                const hasAnyDisplayedContact = Boolean(emailText || phoneText);
                const unavailableRegex = /(not available|unavailable|not found|no contact)/i;
                const emailNeedsReveal = !emailText || unavailableRegex.test(emailText) || /[*]/.test(emailText);
                const phoneNeedsReveal = !phoneText || unavailableRegex.test(phoneText) || /[*]/.test(phoneText);
                const hasRevealedContact = Boolean((emailText && !emailNeedsReveal) || (phoneText && !phoneNeedsReveal));
                const shouldShowRevealButton = emailNeedsReveal || phoneNeedsReveal;
                const showNoData = rowNoDataByKey[rowKey] === true && !hasRevealedContact;
                const startedAt = rowEnrichStartedAtByKey[rowKey];
                const elapsedSeconds = enriching && startedAt ? Math.max(0, Math.floor((enrichTimerNow - startedAt) / 1000)) : 0;
                return (
                <div
                  key={rowKey}
                  style={{
                    display: "grid",
                    gridTemplateColumns: variant === "app"
                      ? "42px minmax(0, 1.2fr) minmax(0, 1fr) 64px minmax(0, 1.3fr) minmax(0, 1.15fr) 152px"
                      : showEmployeeLinkedIn
                      ? "minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.05fr) minmax(0, 1.05fr)"
                      : "minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1.15fr)",
                    gap: 8,
                    padding: "12px 16px",
                    borderBottom:
                      rowIndex === pagedEmployeeRows.length - 1
                        ? "none"
                        : `1px solid ${variant === "hero" ? "var(--color-border-light)" : "var(--color-border)"}`,
                    fontSize: 13,
                    alignItems: "center",
                  }}
                >
                  {variant === "app" ? (
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedRowByKey[rowKey] === true}
                        onChange={(e) => toggleRowSelection(rowKey, e.target.checked)}
                        aria-label={`Select ${emp.full_name}`}
                      />
                    </div>
                  ) : null}
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
                  {showEmployeeLinkedIn || variant === "app" ? (
                    <div style={{ minWidth: 0, display: "flex", justifyContent: variant === "app" ? "center" : "flex-start" }}>
                      {emp.linkedin_url ? (
                        <a
                          href={emp.linkedin_url}
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
                          title="Open profile on LinkedIn"
                          aria-label={`Open ${emp.full_name} LinkedIn profile`}
                        >
                          <Icons.Linkedin size={16} strokeWidth={1.75} aria-hidden />
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>-</span>
                      )}
                    </div>
                  ) : null}
                  {variant === "app" ? (
                    <>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          minHeight: 30,
                          padding: "0 12px",
                          boxSizing: "border-box",
                          borderRadius: 999,
                          border: "1px solid color-mix(in srgb, var(--color-primary) 30%, var(--color-border) 70%)",
                          background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface) 88%)",
                          color: "var(--color-text)",
                          boxShadow: "0 1px 2px color-mix(in srgb, var(--color-primary) 14%, transparent)",
                        }}
                        title={enriched?.email || "Email not available"}
                      >
                        <Mail size={13} strokeWidth={2} color="var(--color-primary)" />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            minWidth: 0,
                            flex: 1,
                            whiteSpace: "normal",
                            overflow: "visible",
                            wordBreak: "break-all",
                            lineHeight: 1.2,
                          }}
                        >
                          {emailText || "Email not available"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          minHeight: 30,
                          padding: "0 12px",
                          boxSizing: "border-box",
                          borderRadius: 999,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-surface-secondary)",
                          color: "var(--color-text-muted)",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                        }}
                        title={enriched?.phone || "Phone not available"}
                      >
                        <Phone size={13} strokeWidth={2} color="var(--color-primary)" />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            minWidth: 0,
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {phoneText || "Phone not available"}
                        </span>
                      </div>
                      <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                        {shouldShowRevealButton || !hasAnyDisplayedContact ? (
                          <button
                            type="button"
                            onClick={() => void enrichPreviewPerson(emp, idx)}
                            disabled={enriching}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 7,
                              height: 34,
                              width: 132,
                              padding: "0 14px",
                              boxSizing: "border-box",
                              borderRadius: 10,
                              border: enriching
                                ? "1px solid color-mix(in srgb, var(--color-primary) 50%, var(--color-border) 50%)"
                                : "1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border) 65%)",
                              background: enriching
                                ? "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 85%, #000 15%) 0%, var(--color-primary) 100%)"
                                : "var(--color-primary)",
                              color: "#ffffff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: enriching ? "wait" : "pointer",
                              opacity: 1,
                              boxShadow: enriching
                                ? "0 0 0 2px color-mix(in srgb, var(--color-primary) 24%, transparent)"
                                : hasActiveRowReveal
                                ? "0 2px 8px color-mix(in srgb, var(--color-primary) 18%, transparent)"
                                : "none",
                            }}
                          >
                            {enriching ? (
                              <>
                                <Icons.Loader size={13} strokeWidth={2.2} className="animate-spin" />
                                {elapsedSeconds}s
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} strokeWidth={2} />
                                Reveal
                              </>
                            )}
                          </button>
                        ) : (
                          <div
                            style={{
                              height: 34,
                              width: 132,
                              borderRadius: 10,
                              border: "1px solid var(--color-border)",
                              background: "var(--color-surface-secondary)",
                              color: "var(--color-text-muted)",
                              fontSize: 12,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            Revealed
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                        <LandingTeamPreviewEmailPill />
                      </div>
                      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
                        <LandingTeamPreviewPhonePill />
                      </div>
                    </>
                  )}
                  {variant === "app" && showNoData ? (
                    <div style={{ gridColumn: "5 / span 3", display: "flex", justifyContent: "flex-start", paddingTop: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                          fontWeight: 600,
                          border: "1px dashed var(--color-border)",
                          borderRadius: 999,
                          padding: "5px 10px",
                        }}
                      >
                        No contact found
                      </span>
                    </div>
                  ) : null}
                </div>
                );
              })}
              {variant === "app" && employeeRows.length > employeePageSize ? (
                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    background: "var(--color-surface)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                    Showing {previewRangeStart}-{previewRangeEnd} of {employeeRows.length}
                  </span>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage <= 1}
                      style={{
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-secondary)",
                        color: "var(--color-text)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: previewPage <= 1 ? "not-allowed" : "pointer",
                        opacity: previewPage <= 1 ? 0.6 : 1,
                      }}
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                      Page {previewPage} of {previewPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.min(previewPageCount, p + 1))}
                      disabled={previewPage >= previewPageCount}
                      style={{
                        height: 30,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-secondary)",
                        color: "var(--color-text)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: previewPage >= previewPageCount ? "not-allowed" : "pointer",
                        opacity: previewPage >= previewPageCount ? 0.6 : 1,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
              {showSignupCtas ? (
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
                      background: "var(--color-primary)",
                      boxShadow: "0 1px 2px rgba(var(--color-primary-rgb), 0.2)",
                      flexShrink: 0,
                    }}
                  >
                    Sign-up for free
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}



