"use client";
import BaseSelector from "@/components/ui/BaseSelector";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { ViewSwitcher } from "./ViewSwitcher";

interface LeadsHeaderProps {
  onShowAllBases: () => void;
  showAllBases: boolean;
}

export function LeadsHeader({ onShowAllBases, showAllBases }: LeadsHeaderProps) {
  const { filters, setFilters } = useLeadStore();

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: '1px solid rgba(124, 58, 237, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Lead Management
          </h1>
          <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
            Manage and enrich leads across all your bases
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Select Base</label>
          <BaseSelector />
          <ViewSwitcher />
          <button
            onClick={onShowAllBases}
            style={{
              background: showAllBases ? 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)' : 'var(--color-surface-secondary)',
              border: showAllBases ? 'none' : '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: showAllBases ? '#000000' : 'var(--color-text)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: 8
            }}
          >
            {showAllBases ? 'View Current Base' : 'View All Bases'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <ToolbarSearchField
          value={filters.search}
          onChange={(v) => setFilters({ search: v })}
          placeholder="Search leads by name or email..."
          style={{ width: "100%" }}
          aria-label="Search leads"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {Object.entries(filters.aiFilters).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setFilters({ 
              aiFilters: { ...filters.aiFilters, [key]: !value }
            })}
            style={{
              background: value ? 'linear-gradient(135deg, #7C3AED 0%, #A94CFF 100%)' : 'var(--color-surface-secondary)',
              border: value ? 'none' : '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: value ? '#000000' : 'var(--color-text)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {value ? '✅' : '⭕'} {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </button>
        ))}
      </div>
    </div>
  );
}

