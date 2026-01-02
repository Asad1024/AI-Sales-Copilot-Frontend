"use client";
import { useState, useEffect, useMemo } from "react";
import { Icons } from "@/components/ui/Icons";
import { useBaseStore } from "@/stores/useBaseStore";
import { apiRequest } from "@/lib/apiClient";
import { getEmailInfo, getEmailDisplayText } from "@/utils/emailNormalization";
import { TierCampaignModal } from "./TierCampaignModal";

export function TierBreakdown() {
  const { activeBaseId } = useBaseStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showTierBreakdown, setShowTierBreakdown] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'Hot' | 'Warm' | 'Cold' | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    const fetchLeads = async () => {
      if (!activeBaseId) {
        setLeads([]);
        return;
      }
      setLoadingLeads(true);
      try {
        const data = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
        const leadsList = Array.isArray(data?.leads) ? data.leads : (Array.isArray(data) ? data : []);
        setLeads(leadsList);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [activeBaseId]);

  const tierBreakdown = useMemo(() => {
    const hot = leads.filter(l => l.tier === 'Hot');
    const warm = leads.filter(l => l.tier === 'Warm');
    const cold = leads.filter(l => l.tier === 'Cold' || !l.tier);
    const total = leads.length;
    
    return {
      hot,
      warm,
      cold,
      total,
      hotCount: hot.length,
      warmCount: warm.length,
      coldCount: cold.length,
      hotPercent: total > 0 ? ((hot.length / total) * 100).toFixed(1) : '0',
      warmPercent: total > 0 ? ((warm.length / total) * 100).toFixed(1) : '0',
      coldPercent: total > 0 ? ((cold.length / total) * 100).toFixed(1) : '0'
    };
  }, [leads]);

  if (loadingLeads || !activeBaseId || leads.length === 0) return null;

  return (
    <div className="card-enhanced" style={{ 
      borderRadius: 16, 
      padding: '24px',
      background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.05) 0%, rgba(169, 76, 255, 0.05) 100%)',
      border: '1px solid rgba(76, 103, 255, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Flame size={24} style={{ color: '#ff6b6b' }} />
            Lead Quality Breakdown
          </h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {tierBreakdown.total} leads categorized by engagement tier
          </p>
        </div>
        <button
          onClick={() => setShowTierBreakdown(!showTierBreakdown)}
          style={{
            background: showTierBreakdown ? 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)' : 'var(--color-surface-secondary)',
            border: showTierBreakdown ? 'none' : '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: showTierBreakdown ? '#000' : 'var(--color-text)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showTierBreakdown ? 'Hide Details' : 'View & Create Campaigns'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: showTierBreakdown ? 20 : 0 }}>
        {/* Hot Leads Card */}
        <div style={{
          background: selectedTier === 'Hot' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)',
          border: selectedTier === 'Hot' ? '2px solid #ff6b6b' : '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onClick={() => {
          const newTier = selectedTier === 'Hot' ? null : 'Hot';
          setSelectedTier(newTier);
          if (newTier) {
            setShowTierModal(true);
          }
        }}
        >
          {selectedTier === 'Hot' && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#ff6b6b',
              color: '#fff',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold'
            }}>✓</div>
          )}
          <Icons.Flame size={32} style={{ color: '#ff6b6b', marginBottom: 8 }} />
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ff6b6b', marginBottom: 4 }}>
            {tierBreakdown.hotCount}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: 4 }}>Hot Leads</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#ff6b6b' }}>
            {tierBreakdown.hotPercent}%
          </div>
        </div>

        {/* Warm Leads Card */}
        <div style={{
          background: selectedTier === 'Warm' ? 'rgba(255, 167, 38, 0.2)' : 'rgba(255, 167, 38, 0.1)',
          border: selectedTier === 'Warm' ? '2px solid #ffa726' : '1px solid rgba(255, 167, 38, 0.3)',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onClick={() => {
          const newTier = selectedTier === 'Warm' ? null : 'Warm';
          setSelectedTier(newTier);
          if (newTier) {
            setShowTierModal(true);
          }
        }}
        >
          {selectedTier === 'Warm' && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#ffa726',
              color: '#fff',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold'
            }}>✓</div>
          )}
          <Icons.Thermometer size={32} style={{ color: '#ffa726', marginBottom: 8 }} />
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffa726', marginBottom: 4 }}>
            {tierBreakdown.warmCount}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: 4 }}>Warm Leads</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffa726' }}>
            {tierBreakdown.warmPercent}%
          </div>
        </div>

        {/* Cold Leads Card */}
        <div style={{
          background: selectedTier === 'Cold' ? 'rgba(128, 128, 128, 0.2)' : 'rgba(128, 128, 128, 0.1)',
          border: selectedTier === 'Cold' ? '2px solid #888' : '1px solid rgba(128, 128, 128, 0.3)',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onClick={() => {
          const newTier = selectedTier === 'Cold' ? null : 'Cold';
          setSelectedTier(newTier);
          if (newTier) {
            setShowTierModal(true);
          }
        }}
        >
          {selectedTier === 'Cold' && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#888',
              color: '#fff',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold'
            }}>✓</div>
          )}
          <Icons.Snowflake size={32} style={{ color: '#888', marginBottom: 8 }} />
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#888', marginBottom: 4 }}>
            {tierBreakdown.coldCount}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: 4 }}>Cold Leads</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
            {tierBreakdown.coldPercent}%
          </div>
        </div>
      </div>

      {showTierBreakdown && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {tierBreakdown.hot.length > 0 && (
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icons.Flame size={18} />
                  Hot Leads ({tierBreakdown.hot.length})
                </h4>
                <div style={{ 
                  maxHeight: 200, 
                  overflowY: 'auto', 
                  border: '1px solid rgba(255, 107, 107, 0.2)', 
                  borderRadius: 8,
                  background: 'var(--elev-bg)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--elev-bg)', zIndex: 10 }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(255, 107, 107, 0.2)', fontSize: 12, fontWeight: 600 }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(255, 107, 107, 0.2)', fontSize: 12, fontWeight: 600 }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(255, 107, 107, 0.2)', fontSize: 12, fontWeight: 600 }}>Company</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(255, 107, 107, 0.2)', fontSize: 12, fontWeight: 600 }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierBreakdown.hot.slice(0, 50).map((lead, idx) => {
                        const emailInfo = getEmailInfo(lead.email, lead.enrichment);
                        const emailDisplay = getEmailDisplayText(emailInfo);
                        return (
                          <tr key={lead.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 107, 107, 0.05)' }}>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 107, 107, 0.1)' }}>
                              {lead.first_name || lead.last_name ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 107, 107, 0.1)', fontStyle: !emailInfo.isValid ? 'italic' : 'normal' }}>
                              {emailDisplay}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 107, 107, 0.1)' }}>
                              {lead.company || '—'}
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 107, 107, 0.1)' }}>
                              <span style={{ 
                                background: 'rgba(255, 107, 107, 0.2)', 
                                color: '#ff6b6b', 
                                padding: '4px 8px', 
                                borderRadius: 4, 
                                fontSize: 11, 
                                fontWeight: 600 
                              }}>
                                {lead.score || 0}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTierModal && selectedTier && (
        <TierCampaignModal 
          tier={selectedTier}
          onClose={() => {
            setShowTierModal(false);
            setSelectedTier(null);
          }}
        />
      )}
    </div>
  );
}

