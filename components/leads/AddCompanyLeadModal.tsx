"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type CompanyPreviewRecord } from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { importModalOverlayStyle } from "@/components/leads/ImportModalChrome";

type AddCompanyLeadModalProps = {
  open: boolean;
  onClose: () => void;
  baseId: number;
  onCreated: (lead: unknown) => void;
};

function companySubtitle(company: CompanyPreviewRecord): string {
  const parts = [company.industry, company.location].filter(Boolean);
  if (parts.length === 0) return "Company profile";
  return parts.join(" - ");
}

function companyMeta(company: CompanyPreviewRecord): string {
  const parts: string[] = [];
  if (company.estimated_num_employees && company.estimated_num_employees > 0) {
    parts.push(`${company.estimated_num_employees.toLocaleString()} employees`);
  } else if (company.employee_range) {
    parts.push(company.employee_range);
  }
  if (company.founded_year) {
    parts.push(`Founded ${company.founded_year}`);
  }
  if (company.domain) {
    parts.push(company.domain);
  }
  return parts.join(" - ");
}

export function AddCompanyLeadModal({ open, onClose, baseId, onCreated }: AddCompanyLeadModalProps) {
  const { showError, showSuccess } = useNotification();
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<CompanyPreviewRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCompanies([]);
    setSelectedCompanyId(null);
    setSearchLoading(false);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setCompanies([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await api.searchCompanies(baseId, q, 8);
        setCompanies(Array.isArray(result?.companies) ? result.companies : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load company suggestions.";
        showError("Company search failed", message);
        setCompanies([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, query, baseId, showError]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const canSubmit = Boolean(selectedCompany) && !saving;

  const handleSubmit = async () => {
    if (!selectedCompany) {
      showError("Select a company", "Pick one company before adding it to leads.");
      return;
    }
    setSaving(true);
    try {
      const response = await api.createLead(baseId, {
        company: selectedCompany.name,
        industry: selectedCompany.industry || undefined,
        region: selectedCompany.location || undefined,
        enrichment: {
          source: "apollo_company_search",
          company_data: {
            id: selectedCompany.id,
            name: selectedCompany.name,
            domain: selectedCompany.domain,
            website: selectedCompany.website_url,
            linkedin_url: selectedCompany.linkedin_url,
            industry: selectedCompany.industry,
            employees: selectedCompany.estimated_num_employees ?? selectedCompany.employee_range,
            founded_year: selectedCompany.founded_year,
            annual_revenue: selectedCompany.annual_revenue_printed,
          },
        },
        tags: {
          source: "company_search",
          preview: true,
        },
      });

      const createdLead = (response as { lead?: unknown })?.lead ?? response;
      showSuccess("Company added", `${selectedCompany.name} was added to this workspace.`);
      onCreated(createdLead);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add this company.";
      showError("Add failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={importModalOverlayStyle} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-company-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(90vh, 640px)",
          background: "var(--color-surface)",
          border: "1px solid var(--elev-border, var(--color-border))",
          borderRadius: 16,
          boxShadow: "var(--elev-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--elev-border, var(--color-border))",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(var(--color-primary-rgb), 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--color-primary)",
              }}
            >
              <Icons.Briefcase size={22} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="add-company-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Add from Company
              </h2>
              <p style={{ margin: "8px 0 0", color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.55 }}>
                Search companies with Apollo, choose one result, then add a company lead shell to enrich later.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--elev-border, var(--color-border))",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: "18px 22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.04em" }}>
            Company name
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing company name..."
              autoFocus
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
                borderRadius: 10,
                border: "1px solid var(--elev-border, var(--color-border))",
                background: "var(--elev-bg, var(--color-surface-secondary))",
                color: "var(--color-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <Icons.Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
              }}
            />
          </div>

          <div
            style={{
              border: "1px solid var(--color-border-light)",
              borderRadius: 12,
              minHeight: 180,
              maxHeight: 250,
              overflowY: "auto",
              background: "var(--color-canvas)",
            }}
          >
            {searchLoading ? (
              <div style={{ padding: "20px 14px", color: "var(--color-text-muted)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Loader size={14} className="animate-spin" />
                Searching companies...
              </div>
            ) : companies.length === 0 ? (
              <div style={{ padding: "20px 14px", color: "var(--color-text-muted)", fontSize: 13 }}>
                {query.trim().length < 2 ? "Type at least 2 letters to search." : "No companies found for this query."}
              </div>
            ) : (
              companies.map((company) => {
                const selected = selectedCompanyId === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1px solid var(--color-border-light)",
                      background: selected ? "rgba(var(--color-primary-rgb), 0.2)" : "transparent",
                      textAlign: "left",
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{company.name}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{companySubtitle(company)}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{companyMeta(company)}</span>
                  </button>
                );
              })
            )}
          </div>

          {selectedCompany ? (
            <div
              style={{
                border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                background: "rgba(var(--color-primary-rgb), 0.2)",
                borderRadius: 12,
                padding: "12px 14px",
                color: "var(--color-text)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>Selected company</div>
              <div style={{ fontSize: 13 }}>{selectedCompany.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{companyMeta(selectedCompany) || "No extra metadata"}</div>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {saving ? (
                <>
                  <Icons.Loader size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Icons.Plus size={16} />
                  Add company lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
