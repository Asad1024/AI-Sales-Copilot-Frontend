"use client";
import { useState, useEffect, useRef } from "react";
import { Icons } from "@/components/ui/Icons";
import { ViewSwitcher } from "./ViewSwitcher";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useBasePermissions } from "@/hooks/useBasePermissions";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { FilterPanel } from "./FilterPanel";

interface LeadsToolbarProps {
  onEnrich: () => void;
  onScore: () => void;
  onImportCSV: () => void;
  onImportAirtable?: () => void;
  onGenerateAI: () => void;
  onSchemaClick: () => void;
  onExportCSV?: () => void;
}

export function LeadsToolbar({
  onEnrich,
  onScore,
  onImportCSV,
  onImportAirtable,
  onGenerateAI,
  onSchemaClick,
  onExportCSV,
}: LeadsToolbarProps) {
  const { filters, setFilters, leads } = useLeadStore();
  const { activeBaseId, bases } = useBaseStore();
  const activeBase = bases.find(b => b.id === activeBaseId);
  const { permissions } = useBasePermissions(activeBaseId);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ToolbarButton = ({ 
    onClick, 
    icon, 
    label, 
    active, 
    disabled, 
    primary,
    danger
  }: { 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string; 
    active?: boolean; 
    disabled?: boolean;
    primary?: boolean;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 10px",
        fontSize: "13px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "6px",
        border: primary ? "none" : "1px solid transparent",
        background: primary 
          ? "#2563eb" 
          : active 
            ? "rgba(37, 99, 235, 0.1)" 
            : "transparent",
        color: primary 
          ? "#fff" 
          : danger 
            ? "#dc2626" 
            : active 
              ? "#2563eb" 
              : "var(--color-text)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !primary && !active) {
          e.currentTarget.style.background = "var(--color-surface-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !primary && !active) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {icon}
      {label}
    </button>
  );

  const Divider = () => (
    <div style={{ 
      width: "1px", 
      height: "24px", 
      background: "var(--color-border)", 
      margin: "0 4px" 
    }} />
  );

  return (
    <div style={{ 
      background: "var(--color-surface)", 
      borderBottom: "1px solid var(--color-border)",
      padding: "12px 20px",
      position: "relative",
      zIndex: 200,
      width: "100%",
      flexShrink: 0,
      display: "block",
      visibility: "visible",
      minHeight: "48px",
      boxSizing: "border-box",
    }}>
      {/* Single Row Layout */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px",
        flexWrap: "wrap",
        visibility: "visible",
        opacity: 1,
      }}>
        {/* Left: View & Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ViewSwitcher />
          
          <div style={{ position: "relative", minWidth: "180px" }}>
            <Icons.Search size={14} style={{ 
              position: "absolute", 
              left: "10px", 
              top: "50%", 
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none"
            }} />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        <Divider />

        {/* Center: Grid Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ position: "relative" }}>
            <ToolbarButton
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              icon={<Icons.Eye size={14} />}
              label="Fields"
            />
            {showColumnMenu && (
              <ColumnVisibilityMenu onClose={() => setShowColumnMenu(false)} />
            )}
          </div>

          <div style={{ position: "relative" }}>
            <ToolbarButton
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              icon={<Icons.Filter size={14} />}
              label="Filter"
              active={!!filters.segment || filters.aiFilters?.highIntent || filters.aiFilters?.recentlyActive || filters.aiFilters?.needsFollowUp}
            />
            {showFilterPanel && (
              <FilterPanel onClose={() => setShowFilterPanel(false)} />
            )}
          </div>

          <div style={{ position: "relative" }} ref={groupMenuRef}>
            <ToolbarButton
              onClick={() => {
                setShowGroupMenu(!showGroupMenu);
                setShowSortMenu(false);
                setShowColumnMenu(false);
                setShowFilterPanel(false);
                setShowAddMenu(false);
              }}
              icon={<Icons.Users size={14} />}
              label={filters.groupBy ? `Group: ${filters.groupBy}` : "Group"}
              active={!!filters.groupBy}
            />
            {showGroupMenu && (
              <DropdownMenu
                title="Group by"
                options={[
                  { value: "owner", label: "Owner" },
                  { value: "tier", label: "Tier" },
                  { value: "score", label: "Score Range" },
                  { value: "company", label: "Company" },
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
            <ToolbarButton
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowGroupMenu(false);
                setShowColumnMenu(false);
                setShowFilterPanel(false);
                setShowAddMenu(false);
              }}
              icon={<Icons.ArrowUpDown size={14} />}
              label={filters.sortBy ? `Sort: ${filters.sortBy}` : "Sort"}
              active={!!filters.sortBy}
            />
            {showSortMenu && (
              <DropdownMenu
                title="Sort by"
                options={[
                  { value: "name", label: "Name" },
                  { value: "email", label: "Email" },
                  { value: "company", label: "Company" },
                  { value: "score", label: "AI Score" },
                  { value: "tier", label: "Tier" },
                ]}
                selected={filters.sortBy}
                onSelect={(value) => {
                  if (value === undefined) {
                    setFilters({ sortBy: undefined, sortOrder: 'asc' });
                  } else {
                    setFilters({ sortBy: value as any, sortOrder: 'asc' });
                  }
                }}
                showSortOrder={!!filters.sortBy}
                sortOrder={filters.sortOrder || 'asc'}
                onSortOrderChange={() => setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                allowDeselect={true}
              />
            )}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* AI Actions */}
          <ToolbarButton
            onClick={onEnrich}
            icon={<Icons.Sparkles size={14} />}
            label="Enrich"
            disabled={!permissions.canUpdateLeads || leads.length === 0}
            primary
          />
          <ToolbarButton
            onClick={onScore}
            icon={<Icons.Target size={14} />}
            label="Score"
            disabled={!permissions.canUpdateLeads || leads.length === 0}
          />

          <Divider />

          {/* Add Leads */}
          {permissions.canCreateLeads && (
            <div style={{ position: "relative" }} ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                style={{
                  padding: "6px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                <Icons.Plus size={14} />
                Add
                <Icons.ChevronDown size={12} style={{ opacity: 0.5 }} />
              </button>
              {showAddMenu && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                  minWidth: "180px",
                  overflow: "hidden",
                  zIndex: 1000,
                  animation: "dropdownFadeIn 0.15s ease-out",
                }}>
                  <MenuButton
                    icon={<Icons.Sparkles size={14} />}
                    label="Generate with AI"
                    onClick={() => { onGenerateAI(); setShowAddMenu(false); }}
                  />
                  <MenuButton
                    icon={<Icons.FileText size={14} />}
                    label="Import CSV"
                    onClick={() => { onImportCSV(); setShowAddMenu(false); }}
                  />
                  {onImportAirtable && (
                    <MenuButton
                      icon={<Icons.List size={14} />}
                      label="Import Airtable"
                      onClick={() => { onImportAirtable(); setShowAddMenu(false); }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* More Actions */}
          <ToolbarButton
            onClick={onSchemaClick}
            icon={<Icons.Columns size={14} />}
            label="Schema"
            disabled={!permissions.canEditSchema}
          />
          
          {onExportCSV && (
            <ToolbarButton
              onClick={onExportCSV}
              icon={<Icons.Download size={14} />}
              label="Export"
            />
          )}
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
  danger 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
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
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.12s ease",
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
      zIndex: 1000,
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
              background: selected === option.value ? "rgba(37, 99, 235, 0.1)" : "transparent",
              border: "none",
              borderRadius: "6px",
              color: selected === option.value ? "#2563eb" : "var(--color-text)",
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
                background: selected === option.value ? "#2563eb" : "transparent",
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
