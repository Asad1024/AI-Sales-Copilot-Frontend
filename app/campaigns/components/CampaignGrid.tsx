"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore, Campaign } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'email': return Icons.Mail;
    case 'linkedin': return Icons.Linkedin;
    case 'whatsapp': return Icons.MessageCircle;
    case 'call': return Icons.Phone;
    default: return Icons.Rocket;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return { bg: 'rgba(76, 103, 255, 0.2)', color: '#4C67FF' };
    case 'paused': return { bg: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' };
    case 'draft': return { bg: 'rgba(255, 167, 38, 0.2)', color: '#ffa726' };
    case 'completed': return { bg: 'rgba(78, 205, 196, 0.2)', color: '#4ecdc4' };
    default: return { bg: 'rgba(128, 128, 128, 0.2)', color: '#888' };
  }
};

interface CampaignGridProps {
  campaigns: Campaign[];
  loading: boolean;
  onDelete?: (id: number) => void;
}

export function CampaignGrid({ campaigns, loading, onDelete }: CampaignGridProps) {
  const router = useRouter();
  const { bases } = useBaseStore();
  const { deleteCampaign } = useCampaignStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: number) => {
    setCampaignToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCampaign(campaignToDelete);
      if (onDelete) onDelete(campaignToDelete);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } catch (error) {
      alert('Failed to delete campaign');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };

  return (
    <div>
      {loading && (
        <div className="card-enhanced" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <Icons.Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#4C67FF' }} />
          <div style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>Loading campaigns...</div>
        </div>
      )}

      {!loading && campaigns.length === 0 && (
        <div className="card-enhanced ms-hover-scale" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8
          }}>
            <Icons.Rocket size={32} style={{ color: '#4C67FF' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: 8 }}>No campaigns yet</h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Ready to launch? Create your first campaign to start reaching your leads across email, LinkedIn, WhatsApp, or calls.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/campaigns/new')}
              className="btn-primary ms-hover-scale ms-press focus-ring"
              style={{ padding: '12px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Icons.Rocket size={16} />
              Create Campaign
            </button>
            <Link href="/flow/new-goal" className="btn-ghost ms-hover-scale ms-press focus-ring" style={{ padding: '12px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Sparkles size={16} />
              Use AI Flow
            </Link>
          </div>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px'
        }}>
          {campaigns.map((campaign) => {
            const statusColors = getStatusColor(campaign.status);
            const baseName = bases.find(b => b.id === campaign.base_id)?.name || 'Unknown Base';
            const actualLeadCount = campaign.leads || 0;
            const calculatedOpenRate = campaign.sent && campaign.opened
              ? ((campaign.opened / campaign.sent) * 100).toFixed(1)
              : null;
            const calculatedReplyRate = campaign.sent && campaign.replied
              ? ((campaign.replied / campaign.sent) * 100).toFixed(1)
              : null;

            return (
              <div key={campaign.id} className="card-enhanced ms-hover-scale" style={{
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  width: '120px',
                  height: '120px',
                  background: `radial-gradient(circle, ${statusColors.bg} 0%, transparent 70%)`,
                  borderRadius: '50%',
                  transform: 'translate(40px, -40px)'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', color: 'var(--color-text)' }}>
                        <Link href={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {campaign.name}
                        </Link>
                      </h3>

                      {campaign.tier_filter && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 8,
                          padding: '4px 10px',
                          background: campaign.tier_filter === 'Hot' ? 'rgba(255, 107, 107, 0.1)' :
                                    campaign.tier_filter === 'Warm' ? 'rgba(255, 167, 38, 0.1)' :
                                    'rgba(128, 128, 128, 0.1)',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: campaign.tier_filter === 'Hot' ? '#ff6b6b' :
                                 campaign.tier_filter === 'Warm' ? '#ffa726' : '#888'
                        }}>
                          {campaign.tier_filter === 'Hot' ? <Icons.Flame size={14} /> :
                           campaign.tier_filter === 'Warm' ? <Icons.Thermometer size={14} /> :
                           <Icons.Snowflake size={14} />}
                          {campaign.tier_filter} Leads
                        </div>
                      )}

                      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(() => {
                          const ChannelIcon = getChannelIcon(campaign.channel);
                          return <ChannelIcon size={14} />;
                        })()}
                        {campaign.channel}
                        {campaign.channels && campaign.channels.length > 1 && (
                          <span style={{ marginLeft: 6, color: '#4C67FF', fontWeight: 600 }}>
                            +{campaign.channels.length - 1} more
                          </span>
                        )}
                        {' • '}{baseName}
                      </p>
                      {campaign.updated_at && (
                        <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
                          Updated {new Date(campaign.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span style={{
                      background: statusColors.bg,
                      color: statusColors.color,
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      {campaign.status === 'completed' && <Icons.CheckCircle size={14} />}
                      {campaign.status === 'running' && <Icons.Circle size={14} style={{ fill: statusColors.color }} />}
                      {campaign.status === 'paused' && <Icons.Pause size={14} />}
                      {campaign.status === 'draft' && <Icons.FileText size={14} />}
                      {campaign.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Leads</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text)' }}>
                        {actualLeadCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Sent</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text)' }}>
                        {campaign.sent || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Open</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#4C67FF' }}>
                        {calculatedOpenRate ? `${calculatedOpenRate}%` : (campaign.openRate ? `${campaign.openRate}%` : '—')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Reply</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#A94CFF' }}>
                        {calculatedReplyRate ? `${calculatedReplyRate}%` : (campaign.replyRate ? `${campaign.replyRate}%` : '—')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      className="btn-ghost"
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteClick(campaign.id)}
                      className="btn-ghost"
                      style={{ padding: '8px 16px', fontSize: 13, color: '#ff6b6b' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Delete Confirmation Dialog */}
          {deleteDialogOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                zIndex: 5000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                animation: 'fadeIn 0.3s ease-out',
              }}
              onClick={handleCancelDelete}
            >
              <div
                style={{
                  width: 'min(500px, 90vw)',
                  background: 'var(--color-surface)',
                  border: '2px solid rgba(255, 87, 87, 0.4)',
                  borderRadius: 24,
                  padding: 0,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.1)',
                  animation: 'slideUp 0.4s ease-out',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Animated background */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle at 20% 30%, rgba(255, 87, 87, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 87, 87, 0.15) 0%, transparent 50%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Header */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ff5757 0%, #ff4444 100%)',
                      padding: '28px 32px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        <Icons.AlertCircle size={32} />
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 24,
                          fontWeight: 800,
                          color: 'white',
                          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          lineHeight: 1.2,
                        }}
                      >
                        Delete Campaign
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      padding: '32px',
                      background: 'var(--color-surface)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: 'var(--color-text)',
                        marginBottom: 24,
                      }}
                    >
                      Are you sure you want to delete this campaign? This action cannot be undone.
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      padding: '20px 32px',
                      background: 'var(--elev-bg)',
                      borderTop: '1px solid var(--elev-border)',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 12,
                    }}
                  >
                    <button
                      onClick={handleCancelDelete}
                      disabled={isDeleting}
                      style={{
                        padding: '12px 28px',
                        fontSize: 15,
                        fontWeight: 600,
                        borderRadius: 12,
                        border: '1px solid var(--elev-border)',
                        background: 'var(--elev-bg)',
                        color: 'var(--color-text)',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeleting) {
                          e.currentTarget.style.background = 'var(--elev-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--elev-bg)';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      style={{
                        padding: '12px 28px',
                        fontSize: 15,
                        fontWeight: 600,
                        borderRadius: 12,
                        border: 'none',
                        background: isDeleting
                          ? 'rgba(255, 87, 87, 0.6)'
                          : 'linear-gradient(135deg, #ff5757 0%, #ff4444 100%)',
                        color: 'white',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(255, 87, 87, 0.3)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeleting) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 87, 87, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 87, 87, 0.3)';
                      }}
                    >
                      {isDeleting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icons.Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Deleting...
                        </span>
                      ) : (
                        'Delete Campaign'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}