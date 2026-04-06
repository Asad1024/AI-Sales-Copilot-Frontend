"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeadStore } from "@/stores/useLeadStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

interface NextStepsGuidanceProps {
  onEnrich: () => void;
  onScore: () => void;
  enriching?: boolean;
}

export function NextStepsGuidance({ onEnrich, onScore, enriching = false }: NextStepsGuidanceProps) {
  const router = useRouter();
  const { activeBaseId } = useBaseStore();
  const { leads } = useLeadStore();

  const enrichmentStatus = useMemo(() => {
    const enrichedLeads = leads.filter(lead => {
      const enrichment = lead.enrichment as any;
      return enrichment && (
        enrichment.apollo_data ||
        enrichment.person_data ||
        enrichment.company_data ||
        enrichment.tavily_research ||
        (Object.keys(enrichment).length > 0 && enrichment.enriched_at)
      );
    });
    const isEnriched = enrichedLeads.length > 0 && enrichedLeads.length === leads.length;
    const partiallyEnriched = enrichedLeads.length > 0 && enrichedLeads.length < leads.length;
    
    const scoredLeads = leads.filter(lead => lead.score !== null && lead.score !== undefined);
    const isScored = scoredLeads.length > 0 && scoredLeads.length === leads.length;
    const partiallyScored = scoredLeads.length > 0 && scoredLeads.length < leads.length;
    
    return {
      enrichedLeads,
      isEnriched,
      partiallyEnriched,
      scoredLeads,
      isScored,
      partiallyScored
    };
  }, [leads]);

  if (leads.length === 0) return null;

  const { isEnriched, partiallyEnriched, enrichedLeads, isScored, partiallyScored, scoredLeads } = enrichmentStatus;

  return (
    <div className="card-enhanced ms-hover-scale" style={{ borderRadius: 16, padding: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Next Steps</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>✓ Leads added</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→</span>
        {isEnriched ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>✓ Enriched</span>
        ) : partiallyEnriched ? (
          <button
            className="btn-ghost ms-hover-scale ms-press focus-ring"
            onClick={onEnrich}
            disabled={enriching}
            style={{ padding: '6px 12px', fontSize: 12 }}
            title={`${enrichedLeads.length}/${leads.length} leads enriched`}
          >
            Enrich ({enrichedLeads.length}/{leads.length})
          </button>
        ) : (
          <button
            className="btn-ghost ms-hover-scale ms-press focus-ring"
            onClick={onEnrich}
            disabled={enriching}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Enrich
          </button>
        )}
        {isScored ? (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>✓ Scored</span>
        ) : partiallyScored ? (
          <button
            className="btn-ghost ms-hover-scale ms-press focus-ring"
            onClick={onScore}
            disabled={enriching}
            style={{ padding: '6px 12px', fontSize: 12 }}
            title={`${scoredLeads.length}/${leads.length} leads scored`}
          >
            Score ({scoredLeads.length}/{leads.length})
          </button>
        ) : (
          <button
            className="btn-ghost ms-hover-scale ms-press focus-ring"
            onClick={onScore}
            disabled={enriching}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Score
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→</span>
        <button
          className="btn-primary ms-hover-scale ms-press focus-ring"
          onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          Create Campaign
        </button>
      </div>
    </div>
  );
}

