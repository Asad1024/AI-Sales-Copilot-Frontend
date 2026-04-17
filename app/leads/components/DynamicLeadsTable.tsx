"use client";
import React, { useMemo, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { useLeadStore, Lead } from "@/stores/useLeadStore";
import { useColumnStore, BaseColumn } from "@/stores/useColumnStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { getPhoneInfo } from "@/utils/phoneNormalization";
import { getEmailInfo, getEmailDisplayText, isMaskedEmail } from "@/utils/emailNormalization";
import { useNotification } from "@/context/NotificationContext";
import { LEAD_STATUS_STORAGE_KEY, DEFAULT_LEAD_STATUS_OPTIONS } from "@/lib/leadStatus";
import { BaseCell } from "./cells/BaseCell";
import { StatusCell } from "./cells/StatusCell";
import { OwnerAssignmentCell } from "./OwnerAssignmentCell";
import { leadHasAsyncContactEnrichResult } from "@/lib/contactEnrichmentStatus";

interface DynamicLeadsTableProps {
  leads: Lead[];
  pendingLeadIds?: number[];
  /** When true, sits inside a parent card (no outer chrome). */
  embedded?: boolean;
  onLeadClick: (lead: Lead) => void;
}

const getLeadName = (lead: Lead) => {
  if (lead.first_name || lead.last_name) {
    return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  }

  // Avoid showing placeholder/masked emails as the "name" fallback
  if (lead.email && !isMaskedEmail(lead.email)) {
    return lead.email;
  }

  return lead.phone || 'Unknown Lead';
};

/** Sticky index + checkbox rails */
const IDX_COL_W = 36;
const CB_COL_W = 50;
const CB_STICKY_LEFT = IDX_COL_W;

const LEAD_TABLE_CHECKBOX_STYLE: React.CSSProperties = {
  width: 18,
  height: 18,
  cursor: "pointer",
  margin: 0,
  flexShrink: 0,
  accentColor: "var(--color-primary, #2563EB)",
};

/** Campaign wizard (lead step) datatable chrome — shared with `app/campaigns/new/page.tsx` lead picker */
const WIZARD_LEAD_TABLE_CARD: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  /** `visible` so in-cell menus portaled to body are not clipped; rounded corners from border + background. */
  overflow: "visible",
  background: "var(--color-surface)",
};
const WIZARD_LEAD_TABLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  minWidth: 720,
};
const WIZARD_LEAD_THEAD_ROW: React.CSSProperties = {
  background: "var(--color-surface-secondary)",
  textAlign: "left",
};
const WIZARD_LEAD_TH: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#9ca3af",
};
const WIZARD_LEAD_TH_CHECK: React.CSSProperties = {
  ...WIZARD_LEAD_TH,
  width: CB_COL_W,
  minWidth: CB_COL_W,
  textAlign: "center",
};
const WIZARD_LEAD_TD: React.CSSProperties = {
  padding: "10px 14px",
};
const WIZARD_LEAD_ROW_HOVER = "rgba(67, 56, 202, 0.04)";
const WIZARD_LEAD_ROW_BORDER = "1px solid var(--color-border)";

function getLeadColumnMinWidth(column: { id?: string | number; name?: string; system?: boolean }): number {
  if (!column.system || column.id == null) return 144;
  const id = String(column.id);
  const map: Record<string, number> = {
    name: 160,
    email: 220,
    phone: 144,
    owner: 204,
    score: 96,
    tier: 108,
    generation_prompt: 200,
    company: 168,
    lead_status: 188,
  };
  return map[id] ?? 144;
}

// System columns that are always available (company immediately after phone)
const SYSTEM_COLUMNS = [
  { id: 'name', name: 'Name', type: 'text' as const, visible: true, system: true },
  { id: 'email', name: 'Email', type: 'email' as const, visible: true, system: true },
  { id: 'phone', name: 'Phone', type: 'phone' as const, visible: true, system: true },
  { id: 'company', name: 'Company', type: 'text' as const, visible: true, system: true },
  { id: 'owner', name: 'Owner', type: 'text' as const, visible: true, system: true },
  { id: 'score', name: 'AI Score', type: 'number' as const, visible: true, system: true },
  { id: 'tier', name: 'Tier', type: 'select' as const, visible: true, system: true },
  { id: 'generation_prompt', name: 'AI prompt', type: 'text' as const, visible: true, system: true },
  { id: 'lead_status', name: 'Lead status', type: 'status' as const, visible: true, system: true },
];

export function DynamicLeadsTable({
  leads,
  pendingLeadIds = [],
  embedded = false,
  onLeadClick,
}: DynamicLeadsTableProps) {
  const { selectedLeads = [], setSelectedLeads, pagination, setPagination, updateLead, filters } = useLeadStore();
  const { columns, fetchColumns } = useColumnStore();
  const { activeBaseId } = useBaseStore();
  const { permissions } = useBasePermissions(activeBaseId);
  const { showSuccess, showError } = useNotification();
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = React.useRef<HTMLInputElement>(null);
  const pendingLeadSet = useMemo(
    () =>
      new Set(
        (pendingLeadIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    [pendingLeadIds]
  );

  const showContactEnrichProcessing = (lead: Lead) => {
    const id = Number(lead.id);
    if (!Number.isFinite(id) || id <= 0) return false;
    if (!pendingLeadSet.has(id)) return false;
    return !leadHasAsyncContactEnrichResult(lead.enrichment);
  };

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const total = leads.length;
    const selected = Array.isArray(selectedLeads) ? selectedLeads.length : 0;
    el.indeterminate = total > 0 && selected > 0 && selected < total;
  }, [selectedLeads, leads.length]);

  // Fetch columns when base changes
  useEffect(() => {
    if (activeBaseId) {
      fetchColumns(activeBaseId);
    }
  }, [activeBaseId, fetchColumns]);

  // Scroll to top only when base changes or page changes (not when leads are added)
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
      tableContainerRef.current.scrollLeft = 0;
    }
  }, [activeBaseId, pagination.currentPage]);

  // Combine system and custom columns
  const allColumns = useMemo(() => {
    const systemCols = SYSTEM_COLUMNS.map(col => ({ ...col, display_order: SYSTEM_COLUMNS.indexOf(col) }));
    const customCols = columns
      .filter(col => col.visible)
      .map(col => ({ ...col, system: false }));
    return [...systemCols, ...customCols].sort((a, b) => {
      if (a.system && !b.system) return -1;
      if (!a.system && b.system) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [columns]);

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeads((currentSelected) => {
      const selected = Array.isArray(currentSelected) ? currentSelected : [];
      if (selected.includes(leadId)) {
        return selected.filter(id => id !== leadId);
      } else {
        return [...selected, leadId];
      }
    });
  };

  const toggleSelectAll = () => {
    setSelectedLeads((currentSelected) => {
      const selected = Array.isArray(currentSelected) ? currentSelected : [];
      if (selected.length === leads.length) {
        return [];
      } else {
        return leads.map(l => l.id);
      }
    });
  };

  const handleCellUpdate = async (leadId: number, columnName: string, value: any) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Check if it's a system column or custom field
      const isSystemColumn = SYSTEM_COLUMNS.some(col => col.id === columnName);

      if (isSystemColumn && columnName === "generation_prompt") {
        return;
      }

      if (isSystemColumn && columnName === "lead_status") {
        const customFields = { ...(lead.custom_fields || {}), [LEAD_STATUS_STORAGE_KEY]: value };
        await updateLead(leadId, { custom_fields: customFields });
        return;
      }

      if (isSystemColumn) {
        // Update system field
        await updateLead(leadId, { [columnName]: value });
      } else {
        // Update custom field
        const customFields = lead.custom_fields || {};
        const updatedFields = { ...customFields, [columnName]: value };
        await updateLead(leadId, { custom_fields: updatedFields });
      }
    } catch (error: any) {
      showError("Update Failed", error?.message || "Failed to update cell");
    }
  };

  const getCellValue = (lead: Lead, column: any) => {
    if (column.system) {
      switch (column.id) {
        case 'name':
          return getLeadName(lead);
        case 'email':
          return lead.email;
        case 'phone':
          return lead.phone;
        case 'owner':
          return lead.owner?.name || null;
        case 'score':
          return lead.score;
        case 'tier':
          return lead.tier;
        case 'generation_prompt':
          return (lead.enrichment as { generation_prompt?: string } | undefined)?.generation_prompt ?? null;
        case 'lead_status':
          return lead.custom_fields?.[LEAD_STATUS_STORAGE_KEY] ?? null;
        case 'company':
          return lead.company;
        default:
          return null;
      }
    } else {
      // Custom field
      return lead.custom_fields?.[column.name] ?? null;
    }
  };

  // Group leads if groupBy is set
  const groupedLeads = useMemo(() => {
    if (!filters.groupBy) {
      return { '': leads };
    }

    const groups: Record<string, Lead[]> = {};
    leads.forEach(lead => {
      let groupKey = '';
      switch (filters.groupBy) {
        case 'owner':
          groupKey = lead.owner?.name || 'Unassigned';
          break;
        case 'tier':
          groupKey = lead.tier || 'No Tier';
          break;
        case 'score':
          const score = lead.score ?? 0;
          if (score >= 80) groupKey = 'High (80+)';
          else if (score >= 60) groupKey = 'Medium (60-79)';
          else groupKey = 'Low (<60)';
          break;
        case 'company':
          groupKey = lead.company || 'No Company';
          break;
        case 'lead_status':
          groupKey = (lead.custom_fields?.[LEAD_STATUS_STORAGE_KEY] as string) || 'No status';
          break;
        default:
          groupKey = '';
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(lead);
    });
    return groups;
  }, [leads, filters.groupBy]);

  // Get row color based on colorBy filter
  const getRowColor = (lead: Lead): string => {
    if (!filters.colorBy) return "transparent";
    
    switch (filters.colorBy) {
      case 'tier':
        if (lead.tier === 'Hot') return 'rgba(255, 107, 107, 0.1)';
        if (lead.tier === 'Warm') return 'rgba(255, 167, 38, 0.1)';
        if (lead.tier === 'Cold') return 'rgba(158, 158, 158, 0.1)';
        return 'transparent';
      case 'score':
        const score = lead.score ?? 0;
        if (score >= 80) return 'rgba(37, 99, 235, 0.08)';
        if (score >= 60) return 'rgba(255, 167, 38, 0.08)';
        return 'rgba(158, 158, 158, 0.05)';
      case 'owner':
        // Use a hash of owner name for consistent color
        const ownerName = lead.owner?.name || 'Unassigned';
        const hash = ownerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = hash % 360;
        return `hsla(${hue}, 50%, 90%, 0.3)`;
      default:
        return "transparent";
    }
  };

  /** Wizard-style rows: no zebra; optional colorBy tint only. */
  const resolveRowBackground = (lead: Lead): string => {
    if (!filters.colorBy) return "transparent";
    const colored = getRowColor(lead);
    return colored !== "transparent" ? colored : "transparent";
  };

  const applyRowHoverBg = (tr: HTMLTableRowElement, bg: string) => {
    tr.querySelectorAll("td").forEach((td) => {
      (td as HTMLTableCellElement).style.background = bg;
    });
  };

  const renderSystemCell = (lead: Lead, columnId: string) => {
    switch (columnId) {
      case 'name':
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {getLeadName(lead)}
            </div>
            {showContactEnrichProcessing(lead) && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  borderRadius: 9999,
                  border: "1px solid rgba(37, 99, 235, 0.28)",
                  background: "rgba(37, 99, 235, 0.08)",
                  color: "var(--color-primary)",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  lineHeight: 1.2,
                }}
              >
                <Icons.Loader size={10} strokeWidth={2} style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap" }}>Processing</span>
              </span>
            )}
          </div>
        );
      
      case 'email': {
        const emailInfo = getEmailInfo(lead.email, lead.enrichment);
        const emailText = getEmailDisplayText(emailInfo);
        return emailInfo.isValid ? (
          <div className="text-[12px] leading-snug text-slate-800 dark:text-slate-200">{emailText}</div>
        ) : (
          <span className="text-[12px] text-slate-400 dark:text-slate-500" aria-label="No email">
            —
          </span>
        );
      }
      
      case 'phone':
        const phoneInfo = getPhoneInfo(lead.phone, lead.enrichment);
        return phoneInfo.normalized ? (
          <div className="text-[12px] leading-snug">
            <a href={`tel:${phoneInfo.normalized}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {phoneInfo.normalized}
            </a>
          </div>
        ) : (
          <div className="text-[12px] italic text-slate-400 dark:text-slate-500">—</div>
        );
      
      case 'owner':
        return (
          <OwnerAssignmentCell 
            lead={lead} 
            editable={permissions.canUpdateLeads}
          />
        );
      
      case 'score': {
        const s = lead.score;
        if (s === null || s === undefined) {
          return <span className="text-[12px] font-medium italic text-slate-400 dark:text-slate-500">—</span>;
        }
        const n = Number(s);
        const scoreColor =
          n >= 80
            ? "#047857"
            : n >= 60
              ? "#1d4ed8"
              : n >= 40
                ? "#b45309"
                : n >= 20
                  ? "#c2410c"
                  : "#475569";
        return (
          <span
            className="inline-flex min-w-[2rem] items-center text-[12px] tabular-nums font-semibold"
            style={{ color: scoreColor }}
          >
            {s}
          </span>
        );
      }

      case 'tier': {
        const t = lead.tier;
        if (!t) {
          return <span className="text-[12px] font-medium italic text-slate-400 dark:text-slate-500">—</span>;
        }
        const TierIcon =
          t === "Hot" ? Icons.Flame : t === "Warm" ? Icons.Thermometer : Icons.Snowflake;
        const tierColor =
          t === "Hot" ? "#be123c" : t === "Warm" ? "#b45309" : "#0369a1";
        return (
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-tight"
            style={{ color: tierColor }}
          >
            <TierIcon size={13} strokeWidth={2} style={{ color: tierColor, flexShrink: 0 }} aria-hidden />
            {t}
          </span>
        );
      }

      case "generation_prompt": {
        const raw = (lead.enrichment as { generation_prompt?: string } | undefined)?.generation_prompt;
        if (!raw || typeof raw !== "string" || !raw.trim()) {
          return <span className="text-[12px] font-medium italic text-slate-400 dark:text-slate-500">—</span>;
        }
        const trimmed = raw.trim();
        const short = trimmed.length > 56 ? `${trimmed.slice(0, 56)}…` : trimmed;
        return (
          <span
            className="block max-w-[min(260px,32vw)] truncate text-[12px] leading-snug text-slate-600 dark:text-slate-300"
            title={trimmed}
          >
            {short}
          </span>
        );
      }

      case "lead_status":
        return (
          <StatusCell
            value={lead.custom_fields?.[LEAD_STATUS_STORAGE_KEY] ?? null}
            options={DEFAULT_LEAD_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.color }))}
            onUpdate={(v) => handleCellUpdate(lead.id, "lead_status", v)}
            editable={permissions.canUpdateLeads}
          />
        );

      case 'company':
        return lead.company ? (
          <div className="text-[12px] leading-snug text-slate-600 dark:text-slate-300">{lead.company}</div>
        ) : (
          <div className="text-[12px] text-slate-400 dark:text-slate-500">—</div>
        );
      
      default:
        return null;
    }
  };

  if (leads.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          borderRadius: embedded ? 0 : 12,
          border: embedded ? "none" : "1px dashed var(--color-border)",
          background: embedded ? "var(--color-surface-secondary)" : "var(--color-surface)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>No leads match</div>
        <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 8 }}>
          Try adjusting search or filters.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minHeight: embedded ? "clamp(260px, 42vh, 520px)" : 400,
        maxHeight: "100%",
        position: "relative",
        background: embedded ? "transparent" : "transparent",
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .leads-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .leads-table-scroll::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .leads-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .leads-table-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.45);
          border-radius: 999px;
        }
        .leads-table-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.65);
        }
      `}</style>
      <div ref={tableContainerRef} className="leads-table-scroll">
        <div style={embedded ? WIZARD_LEAD_TABLE_CARD : { ...WIZARD_LEAD_TABLE_CARD, boxShadow: "0 1px 3px var(--color-shadow)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={WIZARD_LEAD_TABLE}>
        <thead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "table-header-group",
            visibility: "visible",
          }}
        >
          <tr style={WIZARD_LEAD_THEAD_ROW}>
            <th
              style={{
                ...WIZARD_LEAD_TH,
                textAlign: "center",
                verticalAlign: "middle",
                width: IDX_COL_W,
                minWidth: IDX_COL_W,
                position: "sticky",
                left: 0,
                zIndex: 12,
                background: "var(--color-surface-secondary)",
                boxShadow: "1px 0 0 var(--color-border-light)",
              }}
            >
              #
            </th>
            <th
              style={{
                ...WIZARD_LEAD_TH_CHECK,
                verticalAlign: "middle",
                width: CB_COL_W,
                minWidth: CB_COL_W,
                position: "sticky",
                left: CB_STICKY_LEFT,
                zIndex: 12,
                background: "var(--color-surface-secondary)",
                boxShadow: "1px 0 0 var(--color-border-light)",
              }}
            >
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                aria-label="Select all leads"
                style={LEAD_TABLE_CHECKBOX_STYLE}
                checked={Array.isArray(selectedLeads) && selectedLeads.length === leads.length && leads.length > 0}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectAll();
                }}
              />
            </th>
            {allColumns.map((column) => (
              <th
                key={`header-${column.id || column.name}`}
                style={{
                  ...WIZARD_LEAD_TH,
                  minWidth: getLeadColumnMinWidth(column),
                  background: "var(--color-surface-secondary)",
                }}
              >
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ display: "table-row-group", visibility: "visible" }}>
            {(() => {
              if (filters.groupBy) {
                // Render grouped leads
                const groupKeys = Object.keys(groupedLeads).sort();
                let globalIndex = 0;
                return groupKeys.map(groupKey => {
                  const groupLeads = groupedLeads[groupKey];
                  return (
                    <React.Fragment key={groupKey}>
                      {/* Group header */}
                      <tr style={{ background: "var(--color-surface-secondary)", borderBottom: WIZARD_LEAD_ROW_BORDER }}>
                        <td
                          colSpan={allColumns.length + 2}
                          style={{
                            padding: "12px 14px",
                            fontWeight: 600,
                            fontSize: 12,
                            color: "var(--color-text-muted)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {groupKey} ({groupLeads.length} {groupLeads.length === 1 ? "lead" : "leads"})
                        </td>
                      </tr>
                      {/* Group leads */}
                      {groupLeads.map((lead) => {
                        const index = globalIndex++;
                        const rowBaseBg = resolveRowBackground(lead);
                        return (
                          <tr
                            key={lead.id}
                            className="leads-table-data-row"
                            style={{
                              borderTop: WIZARD_LEAD_ROW_BORDER,
                              cursor: "pointer",
                              background: rowBaseBg,
                              transition: "background 0.15s ease",
                            }}
                            onClick={() => onLeadClick(lead)}
                            onMouseEnter={(e) => {
                              applyRowHoverBg(e.currentTarget, WIZARD_LEAD_ROW_HOVER);
                            }}
                            onMouseLeave={(e) => {
                              applyRowHoverBg(e.currentTarget, rowBaseBg);
                            }}
                          >
                            <td
                              style={{
                                ...WIZARD_LEAD_TD,
                                textAlign: "center",
                                verticalAlign: "middle",
                                fontSize: 12,
                                color: "var(--color-text-muted)",
                                fontWeight: 600,
                                position: "sticky",
                                left: 0,
                                zIndex: 11,
                                background: rowBaseBg,
                                boxShadow: "1px 0 0 var(--color-border-light)",
                              }}
                            >
                              {(pagination.currentPage - 1) * pagination.leadsPerPage + index + 1}
                            </td>
                            <td
                              style={{
                                ...WIZARD_LEAD_TD,
                                textAlign: "center",
                                verticalAlign: "middle",
                                width: CB_COL_W,
                                minWidth: CB_COL_W,
                                position: "sticky",
                                left: CB_STICKY_LEFT,
                                zIndex: 11,
                                background: rowBaseBg,
                                boxShadow: "1px 0 0 var(--color-border-light)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <input
                                type="checkbox"
                                style={LEAD_TABLE_CHECKBOX_STYLE}
                                checked={Array.isArray(selectedLeads) && selectedLeads.includes(lead.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleLeadSelection(lead.id);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                aria-label={`Select lead ${lead.id}`}
                              />
                            </td>
                            {allColumns.map((column) => (
                              <td
                                key={column.id || column.name}
                                style={{
                                  ...WIZARD_LEAD_TD,
                                  minWidth: getLeadColumnMinWidth(column),
                                  verticalAlign: "middle",
                                  background: rowBaseBg,
                                }}
                                onClick={(e) => {
                                  if (!column.system || column.id === "lead_status") {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                {column.system ? (
                                  renderSystemCell(lead, String(column.id))
                                ) : (
                                  <BaseCell
                                    column={column as BaseColumn}
                                    lead={lead}
                                    value={getCellValue(lead, column)}
                                    onUpdate={handleCellUpdate}
                                    editable={permissions.canUpdateLeads}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              } else {
                // Render ungrouped leads with insert row capability
                return leads.map((lead, index) => {
                  const rowBaseBg = resolveRowBackground(lead);

                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className="leads-table-data-row"
                        style={{
                          borderTop: WIZARD_LEAD_ROW_BORDER,
                          cursor: "pointer",
                          background: rowBaseBg,
                          transition: "background 0.15s ease",
                          position: "relative",
                        }}
                        onClick={() => onLeadClick(lead)}
                        onMouseEnter={(e) => {
                          applyRowHoverBg(e.currentTarget, WIZARD_LEAD_ROW_HOVER);
                        }}
                        onMouseLeave={(e) => {
                          applyRowHoverBg(e.currentTarget, rowBaseBg);
                        }}
                      >
                        <td
                          style={{
                            ...WIZARD_LEAD_TD,
                            textAlign: "center",
                            verticalAlign: "middle",
                            fontSize: 12,
                            color: "var(--color-text-muted)",
                            fontWeight: 600,
                            position: "sticky",
                            left: 0,
                            zIndex: 11,
                            background: rowBaseBg,
                            boxShadow: "1px 0 0 var(--color-border-light)",
                          }}
                        >
                          {(pagination.currentPage - 1) * pagination.leadsPerPage + index + 1}
                        </td>
                        <td
                          style={{
                            ...WIZARD_LEAD_TD,
                            textAlign: "center",
                            verticalAlign: "middle",
                            width: CB_COL_W,
                            minWidth: CB_COL_W,
                            position: "sticky",
                            left: CB_STICKY_LEFT,
                            zIndex: 11,
                            background: rowBaseBg,
                            boxShadow: "1px 0 0 var(--color-border-light)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <input
                            type="checkbox"
                            style={LEAD_TABLE_CHECKBOX_STYLE}
                            checked={Array.isArray(selectedLeads) && selectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleLeadSelection(lead.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            aria-label={`Select lead ${lead.id}`}
                          />
                        </td>
                        {allColumns.map((column) => (
                          <td
                            key={column.id || column.name}
                            style={{
                              ...WIZARD_LEAD_TD,
                              minWidth: getLeadColumnMinWidth(column),
                              verticalAlign: "middle",
                              background: rowBaseBg,
                            }}
                            onClick={(e) => {
                              if (!column.system || column.id === "lead_status") {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {column.system ? (
                              renderSystemCell(lead, String(column.id))
                            ) : (
                              <BaseCell
                                column={column as BaseColumn}
                                lead={lead}
                                value={getCellValue(lead, column)}
                                onUpdate={handleCellUpdate}
                                editable={permissions.canUpdateLeads}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                });
              }
            })()}
          </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 12px",
                borderTop: "1px solid var(--color-border)",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}
            >
              <span style={{ lineHeight: "32px", fontSize: 13 }}>
                Showing{" "}
                <strong style={{ color: "var(--color-text)" }}>
                  {(pagination.currentPage - 1) * pagination.leadsPerPage + 1}
                </strong>
                –
                <strong style={{ color: "var(--color-text)" }}>
                  {Math.min(pagination.currentPage * pagination.leadsPerPage, pagination.totalLeads)}
                </strong>{" "}
                of <strong style={{ color: "var(--color-text)" }}>{pagination.totalLeads}</strong> leads
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    const newPage = Math.max(1, pagination.currentPage - 1);
                    setPagination({ currentPage: newPage });
                  }}
                  disabled={pagination.currentPage === 1}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    height: 32,
                    minHeight: 32,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "var(--color-surface)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    cursor: pagination.currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: pagination.currentPage === 1 ? 0.45 : 1,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
                    setPagination({ currentPage: newPage });
                  }}
                  disabled={pagination.currentPage === pagination.totalPages}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    height: 32,
                    minHeight: 32,
                    padding: "0 10px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "var(--color-surface)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    cursor: pagination.currentPage === pagination.totalPages ? "not-allowed" : "pointer",
                    opacity: pagination.currentPage === pagination.totalPages ? 0.45 : 1,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

