"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { getEmailInfo, getEmailDisplayText, getEmailSourceBadge, getEmailStatusBadge, isMaskedEmail } from "@/utils/emailNormalization";
import { getPhoneInfo, getPhoneSourceBadge } from "@/utils/phoneNormalization";
import { useBaseStore } from "@/stores/useBaseStore";
import { useLeadStore } from "@/stores/useLeadStore";
import { useNotification } from "@/context/NotificationContext";

export default function LeadDrawer({ lead, onClose, onEnrich }: { lead: any; onClose: () => void; onEnrich?: () => void }) {
  if (!lead) return null;

  const { activeBaseId } = useBaseStore();
  const { updateLead, fetchLeads, pagination } = useLeadStore();
  const { showSuccess, showError } = useNotification();
  
  const [enriching, setEnriching] = useState(false);
  const [currentLead, setCurrentLead] = useState(lead);
  const [enrichmentStatus, setEnrichmentStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigningOwner, setAssigningOwner] = useState(false);
  
  // Helper function to get LinkedIn URL from enrichment
  const getLinkedInUrl = (enrichment: any): string => {
    if (!enrichment) return '';
    try {
      const enriched = typeof enrichment === 'string' ? JSON.parse(enrichment) : enrichment;
      return enriched?.apollo_data?.linkedin_url || 
             enriched?.person_data?.linkedin_url ||
             enriched?.linkedin_url ||
             '';
    } catch (e) {
      return '';
    }
  };

  const [editingFields, setEditingFields] = useState({
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    email: lead.email && !isMaskedEmail(lead.email) ? lead.email : '',
    phone: lead.phone || '',
    company: lead.company || '',
    role: lead.role || '',
    industry: lead.industry || '',
    region: lead.region || '',
    linkedin_url: getLinkedInUrl(lead.enrichment) || '',
    score: lead.score ?? '',
    tier: lead.tier || '',
    notes: lead.notes || '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch team members for owner assignment
  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeBaseId) return;
      try {
        const data = await apiRequest(`/bases/${activeBaseId}/members`);
        const members = Array.isArray(data?.members) ? data.members : [];
        setTeamMembers(members.map((m: any) => ({
          id: m.user?.id || m.User?.id,
          name: m.user?.name || m.User?.name || m.user?.email || m.User?.email,
          email: m.user?.email || m.User?.email
        })).filter((m: any) => m.id));
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      }
    };
    fetchMembers();
  }, [activeBaseId]);

  // Update currentLead when lead prop changes
  useEffect(() => {
    setCurrentLead(lead);
    // Parse enrichment to get LinkedIn URL
    let enrichmentData: any = {};
    try {
      if (lead.enrichment) {
        enrichmentData = typeof lead.enrichment === 'string' 
          ? JSON.parse(lead.enrichment) 
          : lead.enrichment;
      }
    } catch (e) {
      console.error('[LeadDrawer] Error parsing enrichment:', e);
    }
    
    setEditingFields({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email && !isMaskedEmail(lead.email) ? lead.email : '',
      phone: lead.phone || '',
      company: lead.company || '',
      role: lead.role || '',
      industry: lead.industry || '',
      region: lead.region || '',
      linkedin_url: getLinkedInUrl(enrichmentData) || '',
      score: lead.score ?? '',
      tier: lead.tier || '',
      notes: lead.notes || '',
    });
  }, [lead]);

  const handleAssignOwner = async (ownerId: number | null) => {
    if (!currentLead.id) return;
    
    setAssigningOwner(true);
    try {
      await updateLead(currentLead.id, { owner_id: ownerId ?? undefined });
      const updatedLead = { ...currentLead, owner_id: ownerId };
      if (ownerId) {
        const owner = teamMembers.find(m => m.id === ownerId);
        updatedLead.owner = owner;
      } else {
        updatedLead.owner = null;
      }
      setCurrentLead(updatedLead);
      if (activeBaseId) {
        await fetchLeads(activeBaseId, pagination.currentPage, pagination.leadsPerPage);
      }
    } catch (error: any) {
      alert(`Failed to assign owner: ${error?.message || 'Unknown error'}`);
    } finally {
      setAssigningOwner(false);
    }
  };

  // Parse enrichment data - handle both object and JSON string
  let enrichment: any = {};
  try {
    if (currentLead.enrichment) {
      if (typeof currentLead.enrichment === 'string') {
        enrichment = JSON.parse(currentLead.enrichment);
      } else {
        enrichment = currentLead.enrichment;
      }
    }
  } catch (e) {
    console.error('[LeadDrawer] Error parsing enrichment:', e);
    enrichment = {};
  }

  // Handle both formats: enrichment service format and lead generation format
  const webInsights = enrichment.web_insights || enrichment.tavily_insights || {};
  const companyData = enrichment.company_data || {};
  const personData = enrichment.person_data || {};
  const companyInsights = webInsights.company || {};
  const personInsights = webInsights.person || {};
  const industryInsights = webInsights.industry || {};
  
  // Check for raw Tavily format (from lead generation)
  const hasRawTavilyCompany = companyInsights.answer || (companyInsights.results && companyInsights.results.length > 0);
  const hasRawTavilyPerson = personInsights.answer || (personInsights.results && personInsights.results.length > 0);
  
  // Check for structured format (from enrichment service)
  const hasStructuredCompany = companyInsights.company_info;
  const hasStructuredPerson = personInsights.person_info;

  // Debug: Log full enrichment structure
  useEffect(() => {
    console.log('[LeadDrawer] Full enrichment data:', {
      enrichment,
      webInsights,
      companyInsights,
      companyData,
      personData,
      personInsights,
      industryInsights,
      hasCompanyInfo: !!companyInsights?.company_info,
      hasRecentNews: !!companyInsights?.recent_news,
      recentNewsCount: companyInsights?.recent_news?.length || 0
    });
  }, [currentLead, enrichment, webInsights, companyInsights, companyData, personData, personInsights, industryInsights]);

  // Check if any enrichment data exists (more explicit check)
  // If enrichment is null, undefined, empty object, or only has error/manual source, consider it as no enrichment
  const enrichmentExists = enrichment && typeof enrichment === 'object' && Object.keys(enrichment).length > 0;
  const hasValidEnrichmentSource = enrichment?.source && enrichment.source !== 'error' && enrichment.source !== 'manual';
  
  const hasEnrichmentData = Boolean(
    (companyData && companyData.name) || 
    (personData && personData.title) || 
    (companyInsights && companyInsights.company_info) || 
    (personInsights && personInsights.person_info) || 
    (industryInsights && industryInsights.industry_trends) ||
    hasRawTavilyCompany ||
    hasRawTavilyPerson ||
    enrichment.apollo_data ||
    (enrichmentExists && hasValidEnrichmentSource)
  );

  // Debug logging
  useEffect(() => {
    console.log('[LeadDrawer] Enrichment check:', {
      hasEnrichmentData,
      companyData: !!companyData?.name,
      personData: !!personData?.title,
      companyInsights: !!companyInsights?.company_info,
      personInsights: !!personInsights?.person_info,
      industryInsights: !!industryInsights?.industry_trends,
      enrichmentSource: enrichment?.source,
      enrichment: enrichment
    });
  }, [hasEnrichmentData, companyData, personData, companyInsights, personInsights, industryInsights, enrichment]);

  const handleEnrich = async () => {
    if (!currentLead.id) {
      alert('Lead ID is missing');
      return;
    }
    
    setEnriching(true);
    setEnrichmentStatus('Starting enrichment...');
    
    try {
      console.log('Starting enrichment for lead:', currentLead.id);
      setEnrichmentStatus('Calling enrichment API...');
      
      const response = await apiRequest(`/leads/${currentLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enrich: true, purpose: 'General lead enrichment' })
      });
      
      console.log('Enrichment response:', response);
      
      if (response?.lead) {
        setEnrichmentStatus('Enrichment complete! Updating data...');
        // Update local state with enriched data
        setCurrentLead(response.lead);
        // Parse enrichment to get LinkedIn URL
        let enrichmentData: any = {};
        try {
          if (response.lead.enrichment) {
            enrichmentData = typeof response.lead.enrichment === 'string' 
              ? JSON.parse(response.lead.enrichment) 
              : response.lead.enrichment;
          }
        } catch (e) {
          console.error('[LeadDrawer] Error parsing enrichment:', e);
        }
        
        setEditingFields({
          first_name: response.lead.first_name || '',
          last_name: response.lead.last_name || '',
          email: response.lead.email || '',
          phone: response.lead.phone || '',
          company: response.lead.company || '',
          role: response.lead.role || '',
          industry: response.lead.industry || '',
          region: response.lead.region || '',
          linkedin_url: getLinkedInUrl(enrichmentData) || '',
          score: response.lead.score ?? '',
          tier: response.lead.tier || '',
          notes: response.lead.notes || ''
        });
        
        // Call onEnrich callback to refresh parent data
        if (onEnrich) {
          setEnrichmentStatus('Refreshing lead list...');
          await onEnrich();
        }
        
        setEnrichmentStatus('✅ Enrichment successful!');
        // Clear status after 2 seconds
        setTimeout(() => {
          setEnrichmentStatus('');
        }, 2000);
      } else {
        throw new Error('No lead data in response');
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      const errorMsg = error.message || error.error || 'Unknown error';
      setEnrichmentStatus(`❌ Error: ${errorMsg}`);
      alert(`Failed to enrich lead: ${errorMsg}`);
      setTimeout(() => {
        setEnrichmentStatus('');
      }, 3000);
    } finally {
      setEnriching(false);
    }
  };

  const handleSave = async () => {
    if (!currentLead.id) {
      showError('Error', 'Lead ID is missing');
      return;
    }
    
    setSaving(true);
    try {
      // Prepare update data
      const updateData: any = {
        first_name: editingFields.first_name,
        last_name: editingFields.last_name,
        email: editingFields.email,
        phone: editingFields.phone,
        company: editingFields.company,
        role: editingFields.role,
        industry: editingFields.industry,
        region: editingFields.region,
        score: editingFields.score !== '' ? Number(editingFields.score) : null,
        tier: editingFields.tier || null,
        notes: editingFields.notes,
      };

      // Update enrichment with LinkedIn URL if it changed
      if (editingFields.linkedin_url) {
        // Parse existing enrichment
        let enrichmentData: any = {};
        try {
          if (currentLead.enrichment) {
            enrichmentData = typeof currentLead.enrichment === 'string' 
              ? JSON.parse(currentLead.enrichment) 
              : currentLead.enrichment;
          }
        } catch (e) {
          console.error('[LeadDrawer] Error parsing enrichment:', e);
        }

        // Update LinkedIn URL in enrichment (try multiple locations)
        if (!enrichmentData.apollo_data) {
          enrichmentData.apollo_data = {};
        }
        enrichmentData.apollo_data.linkedin_url = editingFields.linkedin_url;
        
        // Also set in person_data and top level for compatibility
        if (!enrichmentData.person_data) {
          enrichmentData.person_data = {};
        }
        enrichmentData.person_data.linkedin_url = editingFields.linkedin_url;
        enrichmentData.linkedin_url = editingFields.linkedin_url;

        updateData.enrichment = enrichmentData;
      }

      const response = await apiRequest(`/leads/${currentLead.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response?.lead) {
        setCurrentLead(response.lead);
        setIsEditing(false);
        if (onEnrich) {
          await onEnrich();
        }
        showSuccess('Saved', 'Lead information updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to update lead:', error);
      showError('Save Failed', error.message || error.error || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const getLeadName = () => {
    if (currentLead.first_name || currentLead.last_name) {
      return `${currentLead.first_name || ''} ${currentLead.last_name || ''}`.trim();
    }
    return currentLead.email?.split('@')[0] || 'Unknown';
  };

  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,.5)', 
        zIndex:1000,
        backdropFilter: 'blur(4px)'
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          position:'absolute', 
          right:0, 
          top:72, 
          height:'calc(100vh - 72px)', 
          width: 'min(600px, 90vw)',
          background:'var(--elev-bg)', 
          borderLeft:'1px solid var(--elev-border)', 
          boxShadow:'-10px 0 40px rgba(0,0,0,.2)', 
          padding:24,
          overflowY: 'auto',
          animation: 'slideInRight 0.3s ease-out'
        }} 
        onClick={(e)=>e.stopPropagation()}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}} />

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid var(--color-border)' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin:0, fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>
              {getLeadName()}
            </h2>
            {(() => {
              const emailInfo = getEmailInfo(currentLead.email, currentLead.enrichment);
              const displayText = getEmailDisplayText(emailInfo);
              const sourceBadge = getEmailSourceBadge(emailInfo);
              const statusBadge = getEmailStatusBadge(emailInfo);
              
              return emailInfo.isValid ? (
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{displayText}</span>
                  {sourceBadge && (
                    <span style={{
                      background: 'rgba(76, 103, 255, 0.1)',
                      color: '#4C67FF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {sourceBadge}
                    </span>
                  )}
                  {statusBadge && (
                    <span style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      color: 'var(--color-text-muted)'
                    }}>
                      {statusBadge}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
                  {displayText}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {currentLead.company && (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <strong>Company:</strong> {currentLead.company}
                </div>
              )}
              {currentLead.role && (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <strong>Role:</strong> {currentLead.role}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {/* Enrich Button in Header - Always Visible */}
            {!hasEnrichmentData && (
              <button
                onClick={handleEnrich}
                disabled={enriching}
                style={{
                  padding: '8px 16px',
                  background: enriching 
                    ? 'rgba(76, 103, 255, 0.3)' 
                    : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: enriching ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: enriching ? 'none' : '0 2px 8px rgba(76, 103, 255, 0.3)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  if (!enriching) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 103, 255, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!enriching) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 103, 255, 0.3)';
                  }
                }}
              >
                {enriching ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    <span>Enriching...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Enrich Lead</span>
                  </>
                )}
              </button>
            )}
            <button 
              className="btn-ghost" 
              onClick={onClose} 
              style={{ 
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 18,
                minWidth: 40,
                height: 40
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Enrichment Status Banner */}
        {enrichmentStatus && (
          <div style={{
            padding: '12px 16px',
            marginBottom: 16,
            background: enrichmentStatus.includes('✅') 
              ? 'rgba(78, 205, 196, 0.1)' 
              : enrichmentStatus.includes('❌')
              ? 'rgba(255, 107, 107, 0.1)'
              : 'rgba(76, 103, 255, 0.1)',
            border: `1px solid ${enrichmentStatus.includes('✅') 
              ? 'rgba(78, 205, 196, 0.3)' 
              : enrichmentStatus.includes('❌')
              ? 'rgba(255, 107, 107, 0.3)'
              : 'rgba(76, 103, 255, 0.3)'}`,
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--color-text)',
            textAlign: 'center',
            fontWeight: 500
          }}>
            {enrichmentStatus}
          </div>
        )}

        {/* Owner Assignment */}
        <div style={{ 
          background: 'var(--color-surface-secondary)', 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 24,
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text)' }}>
            Assigned To
          </div>
          {currentLead.owner ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {currentLead.owner.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{currentLead.owner.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{currentLead.owner.email}</div>
                </div>
              </div>
              <button
                onClick={() => handleAssignOwner(null)}
                disabled={assigningOwner}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: assigningOwner ? 'not-allowed' : 'pointer',
                  opacity: assigningOwner ? 0.5 : 1
                }}
              >
                Unassign
              </button>
            </div>
          ) : (
            <select
              value=""
              onChange={(e) => {
                const ownerId = e.target.value ? parseInt(e.target.value) : null;
                handleAssignOwner(ownerId);
              }}
              disabled={assigningOwner || teamMembers.length === 0}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: assigningOwner || teamMembers.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Select owner...</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Score & Tier Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 24,
          border: '1px solid rgba(76, 103, 255, 0.2)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Lead Score
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: currentLead.score && currentLead.score > 80 ? '#4ecdc4' : currentLead.score && currentLead.score > 60 ? '#ffa726' : '#888',
              lineHeight: 1
            }}>
              {currentLead.score || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tier
            </div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 700,
              color: currentLead.tier === 'Hot' ? '#ff6b6b' : currentLead.tier === 'Warm' ? '#ffa726' : '#888',
              lineHeight: 1
            }}>
              {currentLead.tier || 'Cold'}
              {currentLead.tier === 'Hot' ? ' 🔥' : currentLead.tier === 'Warm' ? ' 🌡️' : ' ❄️'}
            </div>
          </div>
        </div>

        {/* Editable Lead Information Section - Always Visible */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)', 
          borderRadius: 16, 
          padding: 24, 
          marginBottom: 24,
          border: '1px solid rgba(76, 103, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(76, 103, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                Lead Information
              </h3>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(76, 103, 255, 0.15)',
                  border: '1px solid rgba(76, 103, 255, 0.3)',
                  borderRadius: 8,
                  color: '#4C67FF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 103, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(76, 103, 255, 0.15)';
                }}
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    // Parse enrichment to get LinkedIn URL
                    let enrichmentData: any = {};
                    try {
                      if (currentLead.enrichment) {
                        enrichmentData = typeof currentLead.enrichment === 'string' 
                          ? JSON.parse(currentLead.enrichment) 
                          : currentLead.enrichment;
                      }
                    } catch (e) {
                      console.error('[LeadDrawer] Error parsing enrichment:', e);
                    }
                    
                    setEditingFields({
                      first_name: currentLead.first_name || '',
                      last_name: currentLead.last_name || '',
                      email: currentLead.email || '',
                      phone: currentLead.phone || '',
                      company: currentLead.company || '',
                      role: currentLead.role || '',
                      industry: currentLead.industry || '',
                      region: currentLead.region || '',
                      linkedin_url: getLinkedInUrl(enrichmentData) || '',
                      score: currentLead.score ?? '',
                      tier: currentLead.tier || '',
                      notes: currentLead.notes || ''
                    });
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: saving ? 'rgba(76, 103, 255, 0.3)' : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: saving ? '#888' : '#000',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {saving ? '⏳ Saving...' : '💾 Save'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {/* First Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                First Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.first_name}
                  onChange={(e) => setEditingFields({ ...editingFields, first_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.first_name || '—'}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Last Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.last_name}
                  onChange={(e) => setEditingFields({ ...editingFields, last_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.last_name || '—'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editingFields.email}
                  onChange={(e) => setEditingFields({ ...editingFields, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.email || '—'}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editingFields.phone}
                  onChange={(e) => setEditingFields({ ...editingFields, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const phoneInfo = getPhoneInfo(currentLead.phone, currentLead.enrichment);
                    const sourceBadge = getPhoneSourceBadge(phoneInfo);
                    
                    if (phoneInfo.normalized) {
                      return (
                        <>
                          <span>📞</span>
                          <a href={`tel:${phoneInfo.normalized}`} style={{ color: '#4C67FF', textDecoration: 'none', fontWeight: 500 }}>
                            {phoneInfo.normalized}
                          </a>
                          {sourceBadge && (
                            <span style={{
                              background: 'rgba(76, 103, 255, 0.1)',
                              color: '#4C67FF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              {sourceBadge}
                            </span>
                          )}
                        </>
                      );
                    } else {
                      return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Company */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.company}
                  onChange={(e) => setEditingFields({ ...editingFields, company: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.company || '—'}
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Role / Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.role}
                  onChange={(e) => setEditingFields({ ...editingFields, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.role || '—'}
                </div>
              )}
            </div>

            {/* Industry */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Industry
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.industry}
                  onChange={(e) => setEditingFields({ ...editingFields, industry: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.industry || '—'}
                </div>
              )}
            </div>

            {/* LinkedIn URL */}
            <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                LinkedIn URL
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={editingFields.linkedin_url}
                  onChange={(e) => setEditingFields({ ...editingFields, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ 
                  padding: '10px 12px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 8, 
                  fontSize: 14, 
                  color: 'var(--color-text)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}>
                  {getLinkedInUrl(enrichment) ? (
                    <>
                      <span style={{ flexShrink: 0 }}>💼</span>
                      <a 
                        href={getLinkedInUrl(enrichment)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          color: '#0077b5', 
                          textDecoration: 'none', 
                          fontWeight: 500, 
                          flex: 1,
                          minWidth: 0,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                        title={getLinkedInUrl(enrichment)}
                      >
                        {getLinkedInUrl(enrichment)}
                      </a>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                  )}
                </div>
              )}
            </div>

            {/* Region */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Region
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editingFields.region}
                  onChange={(e) => setEditingFields({ ...editingFields, region: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.region || '—'}
                </div>
              )}
            </div>

            {/* Score */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                AI Score
              </label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingFields.score}
                  onChange={(e) => setEditingFields({ ...editingFields, score: e.target.value })}
                  placeholder="0-100"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.score ?? '—'}
                </div>
              )}
            </div>

            {/* Tier */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Tier
              </label>
              {isEditing ? (
                <select
                  value={editingFields.tier}
                  onChange={(e) => setEditingFields({ ...editingFields, tier: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select tier...</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)' }}>
                  {currentLead.tier ? (
                    <span style={{
                      background: currentLead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.2)' : 
                                 currentLead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.2)' : 
                                 'rgba(158, 158, 158, 0.2)',
                      color: currentLead.tier === 'Hot' ? '#ff6b6b' : 
                             currentLead.tier === 'Warm' ? '#ffa726' : '#9e9e9e',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {currentLead.tier}
                    </span>
                  ) : '—'}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                Notes
              </label>
              {isEditing ? (
                <textarea
                  value={editingFields.notes}
                  onChange={(e) => setEditingFields({ ...editingFields, notes: e.target.value })}
                  placeholder="Add notes about this lead..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--elev-bg)',
                    border: '1px solid rgba(76, 103, 255, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    color: 'var(--color-text)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4C67FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 103, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'pre-wrap', minHeight: '60px' }}>
                  {currentLead.notes || '—'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Enrich Button - Always visible if no enrichment */}
        {!hasEnrichmentData && (
          <div style={{ 
            marginBottom: 24,
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
            borderRadius: 16,
            border: '1px solid rgba(76, 103, 255, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Get comprehensive insights about this lead including company information, recent news, funding details, tech stack, and industry trends.
            </div>
            <button
              onClick={handleEnrich}
              disabled={enriching}
              style={{
                padding: '14px 28px',
                background: enriching 
                  ? 'rgba(76, 103, 255, 0.3)' 
                  : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: enriching ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: enriching ? 'none' : '0 4px 12px rgba(76, 103, 255, 0.3)',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                if (!enriching) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 103, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!enriching) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 103, 255, 0.3)';
                }
              }}
            >
              {enriching ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Enriching Lead...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Enrich Lead</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Raw Tavily Company Insights (from lead generation) */}
        {hasRawTavilyCompany && !hasStructuredCompany && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(76, 103, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🏢</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Company Insights</h3>
            </div>

            {/* AI Answer */}
            {companyInsights.answer && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Summary</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
                  {companyInsights.answer}
                </div>
              </div>
            )}

            {/* Search Results */}
            {companyInsights.results && companyInsights.results.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📰</span>
                  <span>Research Results</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {companyInsights.results.slice(0, 5).map((result: any, idx: number) => (
                    <a
                      key={idx}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        fontSize: 13,
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 103, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>🔗</span>
                        {result.title}
                        <span style={{ fontSize: 10, marginLeft: 'auto' }}>↗</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {result.content?.substring(0, 200)}...
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raw Tavily Person Insights (from lead generation) */}
        {hasRawTavilyPerson && !hasStructuredPerson && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(169, 76, 255, 0.08) 0%, rgba(76, 103, 255, 0.08) 100%)',
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(169, 76, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Person Insights</h3>
            </div>

            {/* AI Answer */}
            {personInsights.answer && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Summary</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
                  {personInsights.answer}
                </div>
              </div>
            )}

            {/* Search Results */}
            {personInsights.results && personInsights.results.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔍</span>
                  <span>Research Results</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {personInsights.results.slice(0, 5).map((result: any, idx: number) => (
                    <a
                      key={idx}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        fontSize: 13,
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(169, 76, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(169, 76, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{result.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {result.content?.substring(0, 200)}...
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tavily Web Insights - Company Section */}
        {companyInsights.company_info && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(76, 103, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>🏢</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Company Insights</h3>
            </div>

            {/* Company Description */}
            {companyInsights.company_info.description && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Description</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
                  {companyInsights.company_info.description}
                </div>
              </div>
            )}

            {/* Recent News */}
            {companyInsights.recent_news && companyInsights.recent_news.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📰</span>
                  <span>Recent News</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {companyInsights.recent_news.slice(0, 3).map((news: any, idx: number) => (
                    <a
                      key={idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        fontSize: 13,
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 103, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(76, 103, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>📰</span>
                        {news.title}
                        <span style={{ fontSize: 10, marginLeft: 'auto' }}>↗</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {news.snippet || news.title || 'Recent company news'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Funding Info */}
            {companyInsights.company_info.funding_info && (
              <div style={{ 
                marginBottom: 16,
                padding: '16px 18px',
                background: 'rgba(78, 205, 196, 0.12)',
                borderRadius: 12,
                border: '1px solid rgba(78, 205, 196, 0.3)'
              }}>
                <div style={{ 
                  fontSize: 13, 
                  color: 'var(--color-text)', 
                  marginBottom: 12, 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  lineHeight: 1.4
                }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                  <span>Funding Information</span>
                </div>
                <div style={{ 
                  fontSize: 13, 
                  lineHeight: 1.7, 
                  color: 'var(--color-text)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  marginBottom: companyInsights.company_info.funding_info.url ? 12 : 0
                }}>
                  {companyInsights.company_info.funding_info.content || companyInsights.company_info.funding_info.snippet}
                </div>
                {companyInsights.company_info.funding_info.url && (
                  <a 
                    href={companyInsights.company_info.funding_info.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      fontSize: 12, 
                      color: '#4ecdc4', 
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      marginTop: 4
                    }}
                  >
                    <span>🔗</span>
                    View Source
                    <span style={{ fontSize: 10 }}>↗</span>
                  </a>
                )}
              </div>
            )}

            {/* Tech Stack */}
            {companyInsights.company_info.tech_stack && companyInsights.company_info.tech_stack.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚙️</span>
                  <span>Tech Stack</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {companyInsights.company_info.tech_stack.map((tech: string, idx: number) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(76, 103, 255, 0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#4C67FF',
                        border: '1px solid rgba(76, 103, 255, 0.3)'
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {companyInsights.sources && companyInsights.sources.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔗</span>
                  <span>Sources</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {companyInsights.sources.slice(0, 3).map((source: any, idx: number) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#4C67FF',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: 'rgba(76, 103, 255, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 103, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(76, 103, 255, 0.1)';
                      }}
                    >
                      <span>🔗</span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                        {source.title || source.url}
                      </span>
                      <span style={{ fontSize: 10 }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tavily Person Insights */}
        {personInsights.person_info && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(169, 76, 255, 0.08) 0%, rgba(76, 103, 255, 0.08) 100%)',
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(169, 76, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Person Insights</h3>
            </div>

            {/* Bio */}
            {personInsights.person_info.bio && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>Bio</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
                  {personInsights.person_info.bio}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {personInsights.recent_activity && personInsights.recent_activity.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📱</span>
                  <span>Recent Activity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {personInsights.recent_activity.map((activity: any, idx: number) => (
                    <a
                      key={idx}
                      href={activity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        fontSize: 13,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(169, 76, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(169, 76, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <span style={{ fontSize: 20 }}>
                        {activity.platform === 'LinkedIn' ? '💼' : activity.platform === 'Twitter' ? '🐦' : '💻'}
                      </span>
                      <span style={{ fontWeight: 600, minWidth: 80 }}>{activity.platform}</span>
                      <span style={{ color: 'var(--color-text-muted)', flex: 1, fontSize: 12, lineHeight: 1.4 }}>
                        {activity.snippet || activity.title || `Check out this ${activity.platform} activity`}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Expertise */}
            {personInsights.person_info.expertise && personInsights.person_info.expertise.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🎯</span>
                  <span>Expertise</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {personInsights.person_info.expertise.map((exp: string, idx: number) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(169, 76, 255, 0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#A94CFF',
                        border: '1px solid rgba(169, 76, 255, 0.3)'
                      }}
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Industry Trends */}
        {industryInsights.industry_trends && (
          <div style={{ 
            background: 'rgba(255, 167, 38, 0.1)',
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(255, 167, 38, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>📊</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Industry Trends</h3>
            </div>
            {industryInsights.industry_trends.insights && (
              <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16, padding: 12, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, color: 'var(--color-text)' }}>
                {industryInsights.industry_trends.insights}
              </div>
            )}
            {industryInsights.industry_trends.trends && industryInsights.industry_trends.trends.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700 }}>Key Trends</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {industryInsights.industry_trends.trends.slice(0, 3).map((trend: any, idx: number) => (
                    <a
                      key={idx}
                      href={trend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                        fontSize: 13,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 167, 38, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 167, 38, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>📊</span>
                        {trend.title}
                        <span style={{ fontSize: 10, marginLeft: 'auto' }}>↗</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {trend.insight || trend.title || 'Industry trend information'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Social Profiles & Additional Info (from Apollo enrichment) */}
        {enrichment.apollo_data && (enrichment.apollo_data.linkedin_url || enrichment.apollo_data.twitter_url || enrichment.apollo_data.github_url || enrichment.apollo_data.facebook_url || enrichment.apollo_data.title || enrichment.apollo_data.headline) && (
          <div style={{ 
            background: 'rgba(169, 76, 255, 0.05)', 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(169, 76, 255, 0.2)'
          }}>
            <div style={{ fontSize: 14, color: 'var(--color-text)', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔗</span>
              <span>Social Profiles & Additional Info</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              {/* Social Media Links */}
              {(enrichment.apollo_data.linkedin_url || enrichment.apollo_data.twitter_url || enrichment.apollo_data.github_url || enrichment.apollo_data.facebook_url) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>Social Profiles</div>
                  {enrichment.apollo_data.linkedin_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077b5" style={{ minWidth: 18 }}>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <a href={enrichment.apollo_data.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>LinkedIn</span>
                        <span style={{ fontSize: 12, flexShrink: 0 }}>↗</span>
                      </a>
                    </div>
                  )}
                  {enrichment.apollo_data.twitter_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2" style={{ minWidth: 18 }}>
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      <a href={enrichment.apollo_data.twitter_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span>Twitter</span>
                        <span style={{ fontSize: 12 }}>↗</span>
                      </a>
                    </div>
                  )}
                  {enrichment.apollo_data.github_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ minWidth: 18, color: 'var(--color-text)' }}>
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <a href={enrichment.apollo_data.github_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span>GitHub</span>
                        <span style={{ fontSize: 12 }}>↗</span>
                      </a>
                    </div>
                  )}
                  {enrichment.apollo_data.facebook_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" style={{ minWidth: 18 }}>
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <a href={enrichment.apollo_data.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span>Facebook</span>
                        <span style={{ fontSize: 12 }}>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
              {enrichment.apollo_data.title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>💼</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Title:</strong>
                  <span style={{ flex: 1 }}>{enrichment.apollo_data.title}</span>
                </div>
              )}
              {enrichment.apollo_data.headline && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Headline:</strong>
                  <span style={{ flex: 1, lineHeight: 1.5 }}>{enrichment.apollo_data.headline}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Information */}
        {(companyData.name || companyData.website || companyData.linkedin_url || companyData.employees || enrichment.apollo_data?.organization) && (
          <div style={{ 
            background: 'rgba(76, 103, 255, 0.05)', 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            border: '1px solid rgba(76, 103, 255, 0.2)'
          }}>
            <div style={{ fontSize: 14, color: 'var(--color-text)', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏢</span>
              <span>Company Information</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              {(companyData.name || enrichment.apollo_data?.organization?.name) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🏢</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Company:</strong>
                  <span style={{ flex: 1, fontWeight: 600 }}>{companyData.name || enrichment.apollo_data?.organization?.name}</span>
                </div>
              )}
              {(companyData.website || enrichment.apollo_data?.organization?.website_url) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🌐</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Website:</strong>
                  <a href={companyData.website || enrichment.apollo_data?.organization?.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {companyData.website || enrichment.apollo_data?.organization?.website_url}
                    </span>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>↗</span>
                  </a>
                </div>
              )}
              {(companyData.linkedin_url || enrichment.apollo_data?.organization?.linkedin_url) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077b5" style={{ minWidth: 18 }}>
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <a href={companyData.linkedin_url || enrichment.apollo_data?.organization?.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>View Company Profile</span>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>↗</span>
                  </a>
                </div>
              )}
              {(companyData.employees || enrichment.apollo_data?.organization?.estimated_num_employees) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>👥</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Employees:</strong>
                  <span style={{ flex: 1 }}>{companyData.employees || enrichment.apollo_data?.organization?.estimated_num_employees}</span>
                </div>
              )}
              {(enrichment.apollo_data?.organization?.phone || companyData.phone) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📞</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Phone:</strong>
                  <span style={{ flex: 1 }}>{enrichment.apollo_data?.organization?.phone || companyData.phone}</span>
                </div>
              )}
              {enrichment.apollo_data?.organization?.industry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🏭</span>
                  <strong style={{ color: 'var(--color-text-muted)', minWidth: 100 }}>Industry:</strong>
                  <span style={{ flex: 1 }}>{enrichment.apollo_data.organization.industry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enrichment Purpose */}
        {enrichment.purpose && (
          <div style={{ 
            background: 'rgba(76, 103, 255, 0.08)', 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 20,
            border: '1px solid rgba(76, 103, 255, 0.2)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎯</span>
              <span>Enrichment Purpose</span>
            </div>
            <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-text)', lineHeight: 1.6 }}>
              "{enrichment.purpose}"
            </div>
          </div>
        )}

        {/* Tags */}
        {currentLead.tags && Object.keys(currentLead.tags).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, fontWeight: 700 }}>Tags</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(currentLead.tags).map(([key, value]: [string, any]) => (
                <span 
                  key={key} 
                  className="preset-chip" 
                  style={{ 
                    fontSize: 12, 
                    padding: '6px 12px',
                    background: 'rgba(76, 103, 255, 0.15)',
                    border: '1px solid rgba(76, 103, 255, 0.3)'
                  }}
                >
                  {typeof value === 'string' ? value : key}
                </span>
              ))}
            </div>
        </div>
        )}

        {/* Animation styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    </div>
  );
}
