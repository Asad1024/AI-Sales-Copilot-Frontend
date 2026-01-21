"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

interface EnrichModalProps {
  open: boolean;
  onClose: () => void;
  onEnriched?: () => void;
}

export function EnrichModal({ open, onClose, onEnriched }: EnrichModalProps) {
  const { activeBaseId } = useBaseStore();
  const { selectedLeads, leads } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  
  const [enrichmentType, setEnrichmentType] = useState<'contact' | 'deep_research'>('deep_research');
  const [purpose, setPurpose] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState("");
  const [enrichScope, setEnrichScope] = useState<'selected' | 'all'>('selected');

  if (!open) return null;

  const handleEnrich = async () => {
    if (!activeBaseId) {
      showError("Error", "Please select a base first");
      return;
    }

    const leadsToEnrich = enrichScope === 'selected' ? selectedLeads : leads.map(l => l.id);
    
    if (leadsToEnrich.length === 0) {
      showError("No Leads", enrichScope === 'selected' 
        ? "Please select leads to enrich" 
        : "No leads available to enrich");
      return;
    }

    setEnriching(true);
    setProgress("Starting enrichment...");

    try {
      setProgress(`Enriching ${leadsToEnrich.length} lead(s)...`);
      
      const response = await apiRequest("/leads/bulk-enrich", {
        method: "POST",
        body: JSON.stringify({
          lead_ids: leadsToEnrich,
          base_id: activeBaseId,
          enrichment_type: enrichmentType,
          // Contact mode is FullEnrich-only and async (webhook); deep_research runs sync pipeline
          only_fullenrich: enrichmentType === 'contact'
        })
      });

      if (enrichmentType === 'contact') {
        // Contact enrichment is async (webhook). Backend will choose the best FullEnrich strategy per lead:
        // - reverse-email for leads with valid email
        // - LinkedIn/name+company for leads without email/phone but with identifiers
        setProgress("Contact enrichment started! Results will appear shortly.");
        showSuccess("Enrichment Started", "Contact enrichment has been initiated. Results will be available once processing completes.");

        setTimeout(() => {
          setEnriching(false);
          setProgress("");
          setPurpose("");
          onEnriched?.();
          onClose();
        }, 2000);
      } else if (response?.enriched && response.enriched.length > 0) {
        setProgress(`Successfully enriched ${response.enriched.length} lead(s)!`);
        showSuccess("Enrichment Complete", `Successfully enriched ${response.enriched.length} lead(s)`);

        setTimeout(() => {
          setEnriching(false);
          setProgress("");
          setPurpose("");
          onEnriched?.();
          onClose();
        }, 1500);
      } else {
        throw new Error("No leads were enriched");
      }
    } catch (error: any) {
      console.error("Enrichment error:", error);
      showError("Enrichment Failed", error?.message || "Failed to enrich leads. Please try again.");
      setProgress("");
      setEnriching(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
      
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,.7)', 
          zIndex: 1000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 20,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      >
        <div 
          style={{ 
            width: 'min(600px, 96vw)', 
            maxHeight: '90vh',
            background: 'var(--color-surface)', 
            border: '1px solid var(--elev-border)', 
            borderRadius: 16, 
            padding: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease-out',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icons.Sparkles size={24} style={{ color: '#000' }} />
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#000' }}>
                Enrich Leads
              </h3>
            </div>
            <button
              onClick={onClose}
              className="icon-btn"
              style={{ 
                width: '32px', 
                height: '32px', 
                padding: 0,
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}
            >
              <Icons.X size={18} style={{ color: '#000' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {enriching ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  border: '4px solid rgba(76, 103, 255, 0.2)',
                  borderTopColor: '#4C67FF',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {progress || "Enriching leads..."}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  This may take a few moments...
                </div>
              </div>
            ) : (
              <>
                {/* Scope Selection */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 12,
                    color: 'var(--color-text)'
                  }}>
                    Select Leads to Enrich
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setEnrichScope('selected')}
                      disabled={selectedLeads.length === 0}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: enrichScope === 'selected' 
                          ? '2px solid #4C67FF' 
                          : '1px solid var(--elev-border)',
                        background: enrichScope === 'selected'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: selectedLeads.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: selectedLeads.length === 0 ? 0.5 : 1
                      }}
                    >
                      Selected ({selectedLeads.length})
                    </button>
                    <button
                      onClick={() => setEnrichScope('all')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: enrichScope === 'all' 
                          ? '2px solid #4C67FF' 
                          : '1px solid var(--elev-border)',
                        background: enrichScope === 'all'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      All ({leads.length})
                    </button>
                  </div>
                </div>

                {/* Enrichment Type */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 12,
                    color: 'var(--color-text)'
                  }}>
                    Enrichment Type
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setEnrichmentType('contact')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: enrichmentType === 'contact'
                          ? '2px solid #4C67FF'
                          : '1px solid var(--elev-border)',
                        background: enrichmentType === 'contact'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Contact Only
                    </button>
                    <button
                      onClick={() => setEnrichmentType('deep_research')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: enrichmentType === 'deep_research'
                          ? '2px solid #4C67FF'
                          : '1px solid var(--elev-border)',
                        background: enrichmentType === 'deep_research'
                          ? 'rgba(76, 103, 255, 0.1)'
                          : 'var(--color-surface-secondary)',
                        color: 'var(--color-text)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Deep Research
                    </button>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 8
                  }}>
                    {enrichmentType === 'contact'
                      ? 'Uses FullEnrich to find contact details. If a lead has an email it uses reverse-email; otherwise it uses LinkedIn/name+company (async webhook).'
                      : 'Comprehensive enrichment including company data, research insights, and contact info'}
                  </div>
                </div>

                {/* Purpose (Optional) */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    marginBottom: 8,
                    color: 'var(--color-text)'
                  }}>
                    Purpose / Context (Optional)
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., Looking for SaaS founders in fintech space..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--elev-border)',
                      background: 'var(--color-surface-secondary)',
                      color: 'var(--color-text)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ 
                    fontSize: 12, 
                    color: 'var(--color-text-muted)', 
                    marginTop: 6 
                  }}>
                    Helps AI provide more relevant enrichment data
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={onClose}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEnrich}
                    disabled={enriching || (enrichScope === 'selected' && selectedLeads.length === 0)}
                    className="btn-primary"
                    style={{ 
                      flex: 1, 
                      padding: '12px',
                      opacity: (enrichScope === 'selected' && selectedLeads.length === 0) ? 0.5 : 1,
                      cursor: (enrichScope === 'selected' && selectedLeads.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {enriching ? "Enriching..." : `Enrich ${enrichScope === 'selected' ? selectedLeads.length : leads.length} Lead(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

