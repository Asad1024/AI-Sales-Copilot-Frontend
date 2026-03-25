import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { Icons } from "@/components/ui/Icons";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { getEmailInfo, getEmailDisplayText, isMaskedEmail } from "@/utils/emailNormalization";

interface Campaign {
  id: number;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  tier_filter?: string;
  channels?: string[];
}

interface Lead {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  role?: string;
  score?: number;
  tier?: string;
  linkedin_invitation_sent?: boolean;
  linkedin_invitation_accepted?: boolean;
}

interface LeadsTabProps {
  campaign: Campaign;
  leads: Lead[];
  loadingLeads: boolean;
  onViewLeadActivity: (leadId: number, leadEmail?: string) => void;
}

export function LeadsTab({ campaign, leads, loadingLeads, onViewLeadActivity }: LeadsTabProps) {
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(leads);

  const handleShowAccepted = async () => {
    const data = await apiRequest(`/campaigns/${campaign.id}/leads`);
    const leadsList = Array.isArray(data?.leads) ? data.leads : [];
    const acceptedLeads = leadsList.filter((l: Lead) => l.linkedin_invitation_accepted);
    setFilteredLeads(acceptedLeads);
  };

  const handleShowAll = async () => {
    const data = await apiRequest(`/campaigns/${campaign.id}/leads`);
    const leadsList = Array.isArray(data?.leads) ? data.leads : [];
    setFilteredLeads(leadsList);
  };

  const displayLeads = filteredLeads.length > 0 ? filteredLeads : leads;
  const isLinkedInCampaign = campaign.channels?.includes('linkedin') || campaign.channel === 'linkedin';
  const isEmailCampaign = campaign.channels?.includes('email') || campaign.channel === 'email';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>
            Campaign Leads
          </h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {campaign.tier_filter 
              ? `${campaign.tier_filter} tier leads in this campaign`
              : 'All leads in this campaign'}
          </p>
        </div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#4C67FF' }}>
          {displayLeads.length} lead{displayLeads.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loadingLeads ? (
        <div
          style={{
            maxHeight: 600,
            overflow: 'auto',
            border: '1px solid var(--elev-border)',
            borderRadius: 12,
            background: 'var(--elev-bg)',
          }}
        >
          <TableSkeleton columns={7} rows={8} withCard={false} ariaLabel="Loading campaign leads" />
        </div>
      ) : displayLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: 'rgba(76, 103, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icons.Mail size={32} style={{ color: '#4C67FF' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No leads found</div>
          <div style={{ fontSize: 13, color: '#888' }}>
            {campaign.tier_filter 
              ? `No ${campaign.tier_filter.toLowerCase()} leads available for this base.`
              : 'No leads available for this campaign.'}
          </div>
        </div>
      ) : (
        <div>
          {/* LinkedIn Acceptance Filter */}
          {isLinkedInCampaign && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleShowAccepted}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Show Accepted ({leads.filter(l => l.linkedin_invitation_accepted).length})
              </button>
              <button
                onClick={handleShowAll}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#888',
                  border: '1px solid var(--elev-border)',
                  borderRadius: '6px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Show All
              </button>
            </div>
          )}
          <div style={{ 
            maxHeight: 600, 
            overflowY: 'auto', 
            border: '1px solid var(--elev-border)', 
            borderRadius: 12,
            background: 'var(--elev-bg)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--elev-bg)', zIndex: 10 }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Company</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Score</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Tier</th>
                {isLinkedInCampaign && (
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>LinkedIn Status</th>
                )}
                {isEmailCampaign && (
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 600 }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayLeads.map((lead, idx) => (
                <tr 
                  key={lead.id} 
                  style={{ 
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    borderBottom: '1px solid var(--elev-border)'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    {lead.first_name || lead.last_name 
                      ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                      : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {(() => {
                      const emailInfo = getEmailInfo(lead.email, undefined);
                      const emailText = getEmailDisplayText(emailInfo);
                      return emailInfo.isValid ? (
                        <span>{emailText}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{emailText}</span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {lead.company || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {lead.role || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {lead.score ? (
                      <span style={{ 
                        background: 'rgba(76, 103, 255, 0.1)', 
                        color: '#4C67FF', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600 
                      }}>
                        {lead.score}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {lead.tier ? (
                      <span style={{ 
                        background: lead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.2)' : 
                                   lead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.2)' : 
                                   'rgba(128, 128, 128, 0.2)',
                        color: lead.tier === 'Hot' ? '#ff6b6b' : 
                               lead.tier === 'Warm' ? '#ffa726' : '#888',
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 600 
                      }}>
                        {lead.tier === 'Hot' ? <Icons.Flame size={12} style={{ marginRight: 4 }} /> : 
                         lead.tier === 'Warm' ? <Icons.Thermometer size={12} style={{ marginRight: 4 }} /> : 
                         <Icons.Snowflake size={12} style={{ marginRight: 4 }} />}
                        {lead.tier}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  {isLinkedInCampaign && (
                    <td style={{ padding: '12px' }}>
                      {lead.linkedin_invitation_accepted ? (
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: '#3b82f6', 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Icons.CheckCircle size={12} />
                          Accepted
                        </span>
                      ) : lead.linkedin_invitation_sent ? (
                        <span style={{ 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          color: '#10b981', 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600 
                        }}>
                          Sent
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  )}
                  {isEmailCampaign && (
                    <td style={{ padding: '12px' }}>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          onViewLeadActivity(
                            lead.id,
                            lead.email && !isMaskedEmail(lead.email) ? lead.email : undefined
                          )
                        }
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Icons.Mail size={14} />
                        View Activity
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

