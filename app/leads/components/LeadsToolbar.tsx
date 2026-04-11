"use client";
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Icons } from "@/components/ui/Icons";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import ToolbarFilterButton from "@/components/ui/ToolbarFilterButton";
import { ViewSwitcher } from "./ViewSwitcher";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { FilterPanel } from "./FilterPanel";

interface LeadsToolbarProps {
  variant?: "default" | "embedded";
  onEnrich: () => void;
  onScore: () => void;
  onImportAirtable?: () => void;
  onGenerateAI: () => void;
  onSchemaClick: () => void;
  onExportCSV?: () => void;
  /** Outline Import CSV (dashboard-style) */
  onImportCSV?: () => void;
}

export function LeadsToolbar({
  variant = "default",
  onEnrich,
  onScore,
  onImportAirtable,
  onGenerateAI,
  onSchemaClick,
  onExportCSV,
  onImportCSV,
}: LeadsToolbarProps) {
  const embedded = variant === "embedded";
  const { filters, setFilters, pagination } = useLeadStore();
  const hasAnyLeads = (pagination?.totalLeads ?? 0) > 0;
  const { activeBaseId } = useBaseStore();
  const { permissions } = useBasePermissions(activeBaseId);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const morePanelStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "var(--elev-bg, var(--color-surface))",
    border: "1px solid var(--elev-border, var(--color-border))",
    borderRadius: 12,
    boxShadow: "var(--elev-shadow-lg, 0 10px 40px rgba(15, 23, 42, 0.12))",
    minWidth: 220,
    padding: 6,
    zIndex: 5000,
    overflow: "visible",
  };

  /** Inline flex so the toolbar stays one row even if Tailwind utilities are missing or overridden. */
  const row: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        background: embedded ? "transparent" : "var(--color-surface)",
        borderBottom: embedded ? "1px solid var(--color-border-light)" : "1px solid var(--color-border)",
        padding: embedded ? "10px 12px" : "12px 18px",
        position: "relative",
        zIndex: 200,
        width: "100%",
        flexShrink: 0,
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      {/*
        Do not use overflow-x: auto here: per CSS, paired with overflow-y: visible it forces y to clip,
        which hides Filter/Fields dropdowns and can clip bordered controls. Narrow screens: row may shrink.
      */}
      <div
        style={{
          ...row,
          width: "100%",
          minHeight: 40,
          minWidth: 0,
          justifyContent: "space-between",
          gap: 12,
          overflow: "visible",
        }}
      >
        <div
          style={{
            ...row,
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 40,
            gap: 12,
            overflow: "visible",
          }}
        >
          <div style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
            <ViewSwitcher />
          </div>
          <ToolbarSearchField
            variant="minimal"
            value={filters.search}
            onChange={(v) => setFilters({ search: v })}
            placeholder="Search leads"
            className="h-10 min-h-10 [&_input]:h-10 [&_input]:min-h-10"
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              maxWidth: 420,
              width: "auto",
              position: "relative",
              zIndex: 1,
            }}
            aria-label="Search leads"
          />
          <div style={{ ...row, position: "relative", minHeight: 40, flexShrink: 0, zIndex: 2 }}>
            <ToolbarFilterButton
              variant="minimal"
              open={showFilterPanel}
              onClick={() => {
                setShowFilterPanel((v) => !v);
                setShowColumnMenu(false);
                setShowMoreMenu(false);
                setShowAddMenu(false);
              }}
              aria-label="Filter leads"
            />
            {showFilterPanel && <FilterPanel onClose={() => setShowFilterPanel(false)} />}
          </div>
          <div style={{ ...row, position: "relative", minHeight: 40, flexShrink: 0, zIndex: 2 }}>
            <button
              type="button"
              className="btn-secondary-outline toolbar-filter-minimal focus-ring h-10 min-h-10"
              onClick={() => {
                setShowColumnMenu((v) => !v);
                setShowFilterPanel(false);
                setShowMoreMenu(false);
                setShowAddMenu(false);
              }}
              aria-expanded={showColumnMenu}
              style={{
                borderRadius: 8,
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text)",
              }}
            >
              <Icons.Eye size={15} strokeWidth={1.5} />
              Fields
            </button>
            {showColumnMenu && <ColumnVisibilityMenu onClose={() => setShowColumnMenu(false)} />}
          </div>
        </div>

        <div
          style={{
            ...row,
            minHeight: 40,
            flexShrink: 0,
            gap: 8,
            marginLeft: 12,
            position: "relative",
            zIndex: 2,
            overflow: "visible",
          }}
        >
          {permissions.canUpdateLeads && (
            <>
              <button
                type="button"
                className="btn-primary focus-ring h-10 min-h-10 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
                disabled={!hasAnyLeads}
                onClick={() => onEnrich()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  opacity: hasAnyLeads ? 1 : 0.45,
                  cursor: hasAnyLeads ? "pointer" : "not-allowed",
                }}
              >
                <Icons.Sparkles size={16} strokeWidth={1.5} />
                Enrich Leads
              </button>
              <button
                type="button"
                className="btn-primary focus-ring h-10 min-h-10 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
                disabled={!hasAnyLeads}
                onClick={() => onScore()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  opacity: hasAnyLeads ? 1 : 0.45,
                  cursor: hasAnyLeads ? "pointer" : "not-allowed",
                }}
              >
                <Icons.Chart size={16} strokeWidth={1.5} />
                Score Leads
              </button>
            </>
          )}

          {permissions.canCreateLeads && (
            <div ref={addMenuRef} style={{ ...row, position: "relative", minHeight: 40, flexShrink: 0 }}>
              <button
                type="button"
                className="btn-dashboard-outline focus-ring inline-flex h-10 min-h-10 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium"
                aria-expanded={showAddMenu}
                aria-label="Add leads"
                onClick={() => {
                  setShowAddMenu((v) => !v);
                  setShowFilterPanel(false);
                  setShowColumnMenu(false);
                  setShowMoreMenu(false);
                }}
              >
                <Icons.Plus size={16} strokeWidth={1.5} />
                Add
              </button>
              {showAddMenu && (
                <div style={morePanelStyle}>
                  {onImportCSV && (
                    <MenuButton
                      icon={<Icons.Upload size={14} strokeWidth={1.5} />}
                      label="Import CSV"
                      onClick={() => {
                        onImportCSV();
                        setShowAddMenu(false);
                      }}
                    />
                  )}
                  <MenuButton
                    icon={<Icons.Sparkles size={14} strokeWidth={1.5} />}
                    label="Generate Leads with AI"
                    onClick={() => {
                      onGenerateAI();
                      setShowAddMenu(false);
                    }}
                  />
                  {onImportAirtable && (
                    <MenuButton
                      icon={<Icons.List size={14} strokeWidth={1.5} />}
                      label="Import Airtable"
                      onClick={() => {
                        onImportAirtable();
                        setShowAddMenu(false);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={moreMenuRef} style={{ ...row, position: "relative", minHeight: 40, flexShrink: 0 }}>
            <button
              type="button"
              className="btn-secondary-outline toolbar-filter-minimal focus-ring h-10 min-h-10 shrink-0 p-0"
              aria-expanded={showMoreMenu}
              aria-label="More actions"
              onClick={() => {
                setShowMoreMenu((v) => !v);
                setShowFilterPanel(false);
                setShowColumnMenu(false);
                setShowAddMenu(false);
              }}
              style={{
                borderRadius: 8,
                width: 44,
                minWidth: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <MoreVertical size={18} strokeWidth={2} />
            </button>
            {showMoreMenu && (
              <div style={morePanelStyle}>
                <div style={{ position: "relative" }} ref={groupMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupMenu((v) => !v);
                      setShowSortMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icons.Users size={14} />
                      Group
                      {filters.groupBy ? (
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>({filters.groupBy})</span>
                      ) : null}
                    </span>
                    <Icons.ChevronDown size={14} style={{ opacity: 0.5 }} />
                  </button>
                  {showGroupMenu && (
                    <DropdownMenu
                      title="Group by"
                      options={[
                        { value: "owner", label: "Owner" },
                        { value: "tier", label: "Tier" },
                        { value: "score", label: "Score Range" },
                        { value: "company", label: "Company" },
                        { value: "lead_status", label: "Lead status" },
                      ]}
                      selected={filters.groupBy}
                      onSelect={(value) => {
                        setFilters({ groupBy: value as any });
                        if (!value) setShowGroupMenu(false);
                      }}
                      allowDeselect={true}
                    />
                  )}
                </div>
                <div style={{ position: "relative" }} ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSortMenu((v) => !v);
                      setShowGroupMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icons.ArrowUpDown size={14} />
                      Sort
                      {filters.sortBy ? (
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>({filters.sortBy})</span>
                      ) : null}
                    </span>
                    <Icons.ChevronDown size={14} style={{ opacity: 0.5 }} />
                  </button>
                  {showSortMenu && (
                    <DropdownMenu
                      title="Sort by"
                      options={[
                        { value: "name", label: "Name" },
                        { value: "email", label: "Email" },
                        { value: "company", label: "Company" },
                        { value: "score", label: "AI Score" },
                        { value: "tier", label: "Tier" },
                        { value: "lead_status", label: "Lead status" },
                      ]}
                      selected={filters.sortBy}
                      onSelect={(value) => {
                        if (value === undefined) {
                          setFilters({ sortBy: undefined, sortOrder: "asc" });
                        } else {
                          setFilters({ sortBy: value as any, sortOrder: "asc" });
                        }
                      }}
                      showSortOrder={!!filters.sortBy}
                      sortOrder={filters.sortOrder || "asc"}
                      onSortOrderChange={() =>
                        setFilters({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" })
                      }
                      allowDeselect={true}
                    />
                  )}
                </div>
                <div style={{ height: 1, background: "var(--color-border-light)", margin: "6px 0" }} />
                <MenuButton
                  icon={<Icons.Columns size={14} strokeWidth={1.5} />}
                  label="Schema"
                  onClick={() => {
                    onSchemaClick();
                    setShowMoreMenu(false);
                  }}
                  disabled={!permissions.canEditSchema}
                />
                {onExportCSV && (
                  <MenuButton
                    icon={<Icons.Download size={14} strokeWidth={1.5} />}
                    label="Export CSV"
                    onClick={() => {
                      onExportCSV();
                      setShowMoreMenu(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MenuButton({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "transparent",
        border: "none",
        color: danger ? "#dc2626" : "var(--color-text)",
        fontSize: "13px",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.12s ease",
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger 
          ? "rgba(220, 38, 38, 0.08)" 
          : "var(--color-surface-secondary)";
        e.currentTarget.style.paddingLeft = "20px";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.paddingLeft = "16px";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function DropdownMenu({
  title,
  options,
  selected,
  onSelect,
  showSortOrder,
  sortOrder,
  onSortOrderChange,
  allowDeselect = true,
}: {
  title: string;
  options: { value: any; label: string }[];
  selected: any;
  onSelect: (value: any) => void;
  showSortOrder?: boolean;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: () => void;
  allowDeselect?: boolean;
}) {
  const handleSelect = (value: any) => {
    // If clicking the same option and it's not "None", toggle it off
    if (allowDeselect && selected === value && value !== undefined) {
      onSelect(undefined);
    } else {
      onSelect(value);
    }
  };

  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "10px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      minWidth: "200px",
      overflow: "hidden",
      zIndex: 5000,
      animation: "dropdownFadeIn 0.15s ease-out",
    }}>
      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ 
        padding: "10px 14px", 
        fontSize: "11px", 
        fontWeight: 600, 
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-secondary)",
      }}>
        {title}
      </div>
      <div style={{ padding: "6px" }}>
        {options.filter(o => o.value !== undefined).map((option) => (
          <button
            key={option.value ?? "none"}
            onClick={() => handleSelect(option.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              background: selected === option.value ? "rgba(76, 103, 255, 0.12)" : "transparent",
              border: "none",
              borderRadius: "6px",
              color: selected === option.value ? "var(--color-primary)" : "var(--color-text)",
              fontSize: "13px",
              fontWeight: selected === option.value ? 600 : 400,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              if (selected !== option.value) {
                e.currentTarget.style.background = "var(--color-surface-secondary)";
              }
            }}
            onMouseLeave={(e) => {
              if (selected !== option.value) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: selected === option.value ? "none" : "2px solid var(--color-border)",
                background: selected === option.value ? "var(--color-primary)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.12s ease",
              }}>
                {selected === option.value && <Icons.Check size={12} style={{ color: "#fff" }} />}
              </div>
              <span>{option.label}</span>
            </div>
            {showSortOrder && selected === option.value && option.value && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSortOrderChange?.();
                }}
                style={{
                  padding: "4px 8px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  transition: "all 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)";
                }}
              >
                {sortOrder === 'asc' ? <Icons.ChevronUp size={12} /> : <Icons.ChevronDown size={12} />}
                {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
              </button>
            )}
          </button>
        ))}
      </div>
      {selected !== undefined && (
        <div style={{ 
          padding: "8px 6px", 
          borderTop: "1px solid var(--color-border)",
        }}>
          <button
            onClick={() => onSelect(undefined)}
            style={{
              width: "100%",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              border: "none",
              borderRadius: "6px",
              color: "#dc2626",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icons.X size={14} />
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
