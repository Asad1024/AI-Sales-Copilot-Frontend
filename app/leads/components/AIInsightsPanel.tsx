"use client";
import { useMemo } from "react";
import { useLeadStore } from "@/stores/useLeadStore";

export function AIInsightsPanel() {
  const { leads, filters } = useLeadStore();

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !filters.search || 
        `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''} ${lead.company || ''}`
          .toLowerCase()
          .includes(filters.search.toLowerCase());
      
      if (filters.segment !== 'All') {
        if (filters.segment === 'Hot' && lead.tier !== 'Hot') return false;
        if (filters.segment === 'Warm' && lead.tier !== 'Warm') return false;
        if (filters.segment === 'Cold' && lead.tier !== 'Cold') return false;
      }
      
      if (filters.aiFilters.highIntent && (!lead.score || lead.score < 70)) return false;
      if (filters.aiFilters.recentlyActive && !lead.enrichment?.recent_activity) return false;
      if (filters.aiFilters.needsFollowUp && !lead.enrichment?.needs_followup) return false;
      
      return matchesSearch;
    });
  }, [leads, filters]);

  const highIntentCount = filteredLeads.filter(l => (l.score || 0) > 80).length;
  const staleCount = filteredLeads.filter(l => l.tier === 'Cold').length;

  return (
    <div className="card-enhanced ms-hover-scale" style={{
      borderRadius: '16px',
      padding: '24px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>
        Insights
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div style={{
          background: 'rgba(76, 103, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(76, 103, 255, 0.3)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#4C67FF' }}>
            High-Intent Leads
          </h4>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            {highIntentCount} leads showing strong buying signals. AI recommends immediate follow-up.
          </p>
        </div>
        <div style={{
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255, 107, 107, 0.3)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#ff6b6b' }}>
            Stale Leads
          </h4>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            {staleCount} leads need re-engagement. AI suggests creating a nurture campaign.
          </p>
        </div>
        <div style={{
          background: 'rgba(78, 205, 196, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(78, 205, 196, 0.3)'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0', color: '#4ecdc4' }}>
            Growth Opportunity
          </h4>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            Expand your lead database by importing from CSV or connecting your CRM.
          </p>
        </div>
      </div>
    </div>
  );
}

