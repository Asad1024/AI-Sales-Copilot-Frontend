"use client";
import React, { useMemo, useEffect, useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { useLeadStore, Lead } from "@/stores/useLeadStore";
import { useColumnStore, BaseColumn } from "@/stores/useColumnStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { getPhoneInfo, getPhoneSourceBadge } from "@/utils/phoneNormalization";
import { getEmailInfo, getEmailDisplayText, isMaskedEmail } from "@/utils/emailNormalization";
import { useNotification } from "@/context/NotificationContext";
import { LEAD_STATUS_STORAGE_KEY, DEFAULT_LEAD_STATUS_OPTIONS } from "@/lib/leadStatus";
import { BaseCell } from "./cells/BaseCell";
import { StatusCell } from "./cells/StatusCell";
import { OwnerAssignmentCell } from "./OwnerAssignmentCell";

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
const CB_COL_W = 44;
const CB_STICKY_LEFT = IDX_COL_W;

// System columns that are always available
const SYSTEM_COLUMNS = [
  { id: 'name', name: 'Name', type: 'text' as const, visible: true, system: true },
  { id: 'email', name: 'Email', type: 'email' as const, visible: true, system: true },
  { id: 'phone', name: 'Phone', type: 'phone' as const, visible: true, system: true },
  { id: 'owner', name: 'Owner', type: 'text' as const, visible: true, system: true },
  { id: 'score', name: 'AI Score', type: 'number' as const, visible: true, system: true },
  { id: 'tier', name: 'Tier', type: 'select' as const, visible: true, system: true },
  { id: 'company', name: 'Company', type: 'text' as const, visible: true, system: true },
  { id: 'lead_status', name: 'Lead status', type: 'status' as const, visible: true, system: true },
];

export function DynamicLeadsTable({ leads, pendingLeadIds = [], embedded = false, onLeadClick }: DynamicLeadsTableProps) {
  const { selectedLeads = [], setSelectedLeads, pagination, setPagination, updateLead, filters } = useLeadStore();
  const { columns, fetchColumns } = useColumnStore();
  const { activeBaseId } = useBaseStore();
  const { permissions } = useBasePermissions(activeBaseId);
  const { showSuccess, showError } = useNotification();
  const selectedCount = Array.isArray(selectedLeads) ? selectedLeads.length : 0;
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = React.useRef<HTMLInputElement>(null);
  const pendingLeadSet = useMemo(() => new Set(pendingLeadIds), [pendingLeadIds]);

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
        if (score >= 80) return 'rgba(76, 103, 255, 0.08)';
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

  const resolveRowBackground = (lead: Lead, _stripeIndex: number, isSelected: boolean): string => {
    if (isSelected) return "rgba(37, 99, 235, 0.1)";
    const colored = getRowColor(lead);
    if (colored !== "transparent") return colored;
    return _stripeIndex % 2 === 0 ? "rgba(248, 250, 252, 0.58)" : "transparent";
  };

  const ROW_BORDER = "#f8fafc";
  const HOVER_BG = "rgba(239, 246, 255, 0.62)";
  const CELL_PAD_Y = 14;
  const CELL_PAD_X = 14;

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
            <div className="text-[10px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">
              {getLeadName(lead)}
            </div>
            {pendingLeadSet.has(lead.id) && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  border: '1px solid rgba(76, 103, 255, 0.28)',
                  background: 'rgba(76, 103, 255, 0.08)',
                  color: 'var(--color-primary)',
                  fontSize: 8,
                  fontWeight: 600,
                  padding: '2px 8px'
                }}
              >
                <Icons.Loader size={8} strokeWidth={2} style={{ animation: 'spin 0.9s linear infinite' }} />
                Processing
              </span>
            )}
          </div>
        );
      
      case 'email': {
        const emailInfo = getEmailInfo(lead.email, lead.enrichment);
        const emailText = getEmailDisplayText(emailInfo);
        return emailInfo.isValid ? (
          <div className="text-[10px] leading-snug text-slate-800 dark:text-slate-200">{emailText}</div>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-slate-500" aria-label="No email">
            —
          </span>
        );
      }
      
      case 'phone':
        const phoneInfo = getPhoneInfo(lead.phone, lead.enrichment);
        return phoneInfo.normalized ? (
          <div className="text-[10px] leading-snug">
            <a href={`tel:${phoneInfo.normalized}`} className="text-blue-600 hover:underline dark:text-blue-400">
              {phoneInfo.normalized}
            </a>
          </div>
        ) : (
          <div className="text-[10px] italic text-slate-400 dark:text-slate-500">—</div>
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
          return <span className="text-[10px] font-medium italic text-slate-400 dark:text-slate-500">—</span>;
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
            className="inline-flex min-w-[2rem] items-center text-[11px] tabular-nums font-semibold"
            style={{ color: scoreColor }}
          >
            {s}
          </span>
        );
      }

      case 'tier': {
        const t = lead.tier;
        if (!t) {
          return <span className="text-[10px] font-medium italic text-slate-400 dark:text-slate-500">—</span>;
        }
        const TierIcon =
          t === "Hot" ? Icons.Flame : t === "Warm" ? Icons.Thermometer : Icons.Snowflake;
        const tierColor =
          t === "Hot" ? "#be123c" : t === "Warm" ? "#b45309" : "#0369a1";
        return (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight"
            style={{ color: tierColor }}
          >
            <TierIcon size={13} strokeWidth={2} style={{ color: tierColor, flexShrink: 0 }} aria-hidden />
            {t}
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
          <div className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">{lead.company}</div>
        ) : (
          <div className="text-[10px] text-slate-400 dark:text-slate-500">—</div>
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
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>No leads match</div>
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>
          Try adjusting search or filters.
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={tableContainerRef}
      className="leads-table-scroll"
      style={{ 
        background: embedded ? "transparent" : "var(--color-surface)", 
        border: embedded ? "none" : "1px solid var(--color-border)",
        borderRadius: embedded ? 0 : 12,
        boxShadow: embedded ? "none" : "0 1px 3px var(--color-shadow)",
        height: "100%",
        width: "100%",
        minHeight: "400px",
        maxHeight: "100%",
        overflow: "auto",
        position: "relative",
        display: "block",
      }}
    >
      <style>{`
        .leads-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
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
      <table style={{ 
        width: "100%", 
        borderCollapse: "collapse",
        minWidth: "max-content",
        display: "table",
        tableLayout: "auto",
      }}>
        <thead
          className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/90 dark:bg-slate-800/80 dark:text-slate-400"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "table-header-group",
            visibility: "visible",
          }}
        >
          <tr style={{ borderBottom: `1px solid ${ROW_BORDER}` }}>
            <th
              className="bg-slate-50/50 dark:bg-slate-800/50"
              style={{
                padding: `${CELL_PAD_Y}px 6px`,
                textAlign: "center",
                verticalAlign: "middle",
                width: IDX_COL_W,
                minWidth: IDX_COL_W,
                borderBottom: `1px solid ${ROW_BORDER}`,
                position: "sticky",
                left: 0,
                zIndex: 12,
                boxShadow: "1px 0 0 var(--color-border-light)",
              }}
            >
              #
            </th>
            <th
              className="bg-slate-50/50 dark:bg-slate-800/50"
              style={{
                padding: `${CELL_PAD_Y}px 2px`,
                textAlign: "center",
                verticalAlign: "middle",
                width: CB_COL_W,
                minWidth: CB_COL_W,
                borderBottom: `1px solid ${ROW_BORDER}`,
                position: "sticky",
                left: CB_STICKY_LEFT,
                zIndex: 12,
                boxShadow: "1px 0 0 var(--color-border-light)",
              }}
            >
              <div className="leads-table-checkbox-wrap">
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  className="leads-table-checkbox"
                  aria-label="Select all leads"
                  checked={Array.isArray(selectedLeads) && selectedLeads.length === leads.length && leads.length > 0}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectAll();
                  }}
                />
              </div>
            </th>
            {allColumns.map((column) => (
              <th
                key={`header-${column.id || column.name}`}
                className="bg-slate-50/50 dark:bg-slate-800/50"
                style={{
                  padding: `${CELL_PAD_Y}px ${CELL_PAD_X}px`,
                  textAlign: "left",
                  minWidth: "128px",
                  borderBottom: `1px solid ${ROW_BORDER}`,
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
                      <tr style={{ background: "var(--color-surface-secondary)", borderBottom: `1px solid ${ROW_BORDER}` }}>
                        <td
                          colSpan={allColumns.length + 2}
                          style={{
                            padding: "12px 14px",
                            fontWeight: 600,
                            fontSize: 11,
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
                        const isSelected = Array.isArray(selectedLeads) && selectedLeads.includes(lead.id);
                        const rowBaseBg = resolveRowBackground(lead, index, isSelected);
                        return (
                          <tr
                            key={lead.id}
                            className="leads-table-data-row"
                            style={{
                              borderBottom: `1px solid ${ROW_BORDER}`,
                              cursor: "pointer",
                              background: rowBaseBg,
                              transition: "background 0.15s ease",
                            }}
                            onClick={() => onLeadClick(lead)}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                applyRowHoverBg(e.currentTarget, HOVER_BG);
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                applyRowHoverBg(e.currentTarget, rowBaseBg);
                              }
                            }}
                          >
                            <td
                              style={{
                                padding: `${CELL_PAD_Y}px 6px`,
                                textAlign: "center",
                                verticalAlign: "middle",
                                fontSize: 11,
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
                                padding: `${CELL_PAD_Y}px 2px`,
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
                              <div className="leads-table-checkbox-wrap">
                                <input
                                  type="checkbox"
                                  className="leads-table-checkbox"
                                  checked={Array.isArray(selectedLeads) && selectedLeads.includes(lead.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleLeadSelection(lead.id);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                />
                              </div>
                            </td>
                            {allColumns.map((column) => (
                              <td
                                key={column.id || column.name}
                                style={{
                                  padding: `${CELL_PAD_Y}px ${CELL_PAD_X}px`,
                                  minWidth: "116px",
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
                  const isSelected = Array.isArray(selectedLeads) && selectedLeads.includes(lead.id);
                  const rowBaseBg = resolveRowBackground(lead, index, isSelected);

                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className="leads-table-data-row"
                        style={{
                          borderBottom: `1px solid ${ROW_BORDER}`,
                          cursor: "pointer",
                          background: rowBaseBg,
                          transition: "background 0.15s ease",
                          position: "relative",
                        }}
                        onClick={() => onLeadClick(lead)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            applyRowHoverBg(e.currentTarget, HOVER_BG);
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            applyRowHoverBg(e.currentTarget, rowBaseBg);
                          }
                        }}
                      >
                        <td
                          style={{
                            padding: `${CELL_PAD_Y}px 6px`,
                            textAlign: "center",
                            verticalAlign: "middle",
                            fontSize: 11,
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
                            padding: `${CELL_PAD_Y}px 2px`,
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
                          <div className="leads-table-checkbox-wrap">
                            <input
                              type="checkbox"
                              className="leads-table-checkbox"
                              checked={Array.isArray(selectedLeads) && selectedLeads.includes(lead.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleLeadSelection(lead.id);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            />
                          </div>
                        </td>
                        {allColumns.map((column) => (
                          <td
                            key={column.id || column.name}
                            style={{
                              padding: `${CELL_PAD_Y}px ${CELL_PAD_X}px`,
                              minWidth: "116px",
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

      {pagination.totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          paddingTop: 14,
          paddingLeft: embedded ? 4 : 0,
          paddingRight: embedded ? 4 : 0,
          borderTop: "1px solid var(--color-border-light)",
        }}>
          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
            Showing <strong>{(pagination.currentPage - 1) * pagination.leadsPerPage + 1}</strong> - <strong>{Math.min(pagination.currentPage * pagination.leadsPerPage, pagination.totalLeads)}</strong> of <strong>{pagination.totalLeads}</strong> leads
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const newPage = Math.max(1, pagination.currentPage - 1);
                setPagination({ currentPage: newPage });
              }}
              disabled={pagination.currentPage === 1}
              className="btn-ghost"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Previous
            </button>
            <button
              onClick={() => {
                const newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
                setPagination({ currentPage: newPage });
              }}
              disabled={pagination.currentPage === pagination.totalPages}
              className="btn-ghost"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

