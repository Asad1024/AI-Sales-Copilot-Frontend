"use client";
import { useMemo } from "react";
import { Icons } from "@/components/ui/Icons";
import { useLeadStore, Lead } from "@/stores/useLeadStore";
import { getEmailInfo, getEmailDisplayText, getEmailSourceBadge, getEmailStatusBadge, isMaskedEmail } from "@/utils/emailNormalization";
import { getPhoneInfo, getPhoneSourceBadge } from "@/utils/phoneNormalization";
import { useNotification } from "@/context/NotificationContext";

interface LeadsTableProps {
  leads: Lead[];
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

export function LeadsTable({ leads, onLeadClick }: LeadsTableProps) {
  const { selectedLeads, setSelectedLeads, pagination, setPagination } = useLeadStore();
  const { showInfo } = useNotification();

  const toggleLeadSelection = (leadId: number) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  // Leads are already paginated server-side, so use them directly
  const paginatedLeads = leads;

  if (leads.length === 0) {
    return (
      <div className="card-enhanced" style={{ 
        textAlign: 'center',
        padding: '60px 20px',
        borderRadius: 16
      }}>
        <div style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>No leads found</div>
      </div>
    );
  }

  return (
    <div className="card-enhanced" style={{ borderRadius: 16, padding: 24 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--elev-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={toggleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer', width: 18, height: 18 }}
                />
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Lead</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>AI Score</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tier</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>AI Insight</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead) => {
              const emailInfo = getEmailInfo(lead.email, lead.enrichment);
              const displayText = getEmailDisplayText(emailInfo);
              const sourceBadge = getEmailSourceBadge(emailInfo);
              const statusBadge = getEmailStatusBadge(emailInfo);
              const phoneInfo = getPhoneInfo(lead.phone, lead.enrichment);
              const phoneSourceBadge = getPhoneSourceBadge(phoneInfo);

              return (
                <tr 
                  key={lead.id} 
                  style={{ 
                    borderBottom: '1px solid var(--elev-border)', 
                    cursor:'pointer',
                    background: selectedLeads.includes(lead.id) ? 'rgba(var(--color-primary-rgb), 0.2)' : 'transparent',
                    transition: 'background 0.2s'
                  }} 
                  onClick={() => onLeadClick(lead)}
                >
                  <td style={{ padding: '16px 12px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', width: 18, height: 18 }}
                    />
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>{getLeadName(lead)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {emailInfo.isValid ? (
                          <>
                            <span>{displayText}</span>
                            {sourceBadge && (
                              <span style={{
                                background: 'rgba(var(--color-primary-rgb), 0.2)',
                                color: 'var(--color-primary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '600'
                              }}>
                                {sourceBadge}
                              </span>
                            )}
                            {statusBadge && (
                              <span style={{
                                fontSize: '10px',
                                opacity: 0.7
                              }}>
                                {statusBadge}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ fontStyle: 'italic' }}>{displayText}</span>
                        )}
                      </div>
                      {phoneInfo.normalized && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span>📞</span>
                          <a href={`tel:${phoneInfo.normalized}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                            {phoneInfo.normalized}
                          </a>
                          {phoneSourceBadge && (
                            <span style={{
                              background: 'rgba(var(--color-primary-rgb), 0.2)',
                              color: 'var(--color-primary)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              {phoneSourceBadge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    {lead.owner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#000000',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {lead.owner.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{lead.owner.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{lead.owner.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{
                      background: (lead.score || 0) > 80 ? 'linear-gradient(135deg, var(--color-primary) 0%, #F29F67 100%)' : 
                                  (lead.score || 0) > 60 ? 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)' : 
                                  'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                      color: '#000000',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block'
                    }}>
                      {lead.score || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      background: lead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.2)' : 
                                 lead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.2)' : 
                                 'rgba(158, 158, 158, 0.2)',
                      color: lead.tier === 'Hot' ? '#ff6b6b' : 
                             lead.tier === 'Warm' ? '#ffa726' : '#9e9e9e',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {lead.tier || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {lead.company ? `${lead.company}${lead.role ? ` • ${lead.role}` : ''}` : 'No company data'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="icon-btn focus-ring"
                        title="Contact"
                        onClick={() => showInfo('Contact', `Contact ${getLeadName(lead)}`)}
                        style={{ width: '32px', height: '32px', padding: 0 }}
                      >
                        <Icons.Mail size={16} />
                      </button>
                      <button 
                        className="icon-btn focus-ring"
                        title="View Details"
                        onClick={() => onLeadClick(lead)}
                        style={{ width: '32px', height: '32px', padding: 0 }}
                      >
                        <Icons.Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 24,
          borderTop: '1px solid var(--elev-border)'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
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

