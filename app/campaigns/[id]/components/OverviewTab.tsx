import { Icons } from "@/components/ui/Icons";
import { Kpi } from "./Kpi";

interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  leads?: number;
  sent?: number;
  email_sent?: number;
  email_processed?: number;
  esp_accept_rate?: string;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  converted?: number;
  openRate?: number;
  replyRate?: number;
  clickRate?: number;
  conversionRate?: number;
  ai_insight?: string;
  tier_filter?: string;
  channels?: string[];
  event_counts?: Record<string, number>;
  whatsapp_template_preview?: string | null;
  whatsapp_last_message_preview?: string | null;
  whatsapp_sent?: number;
  whatsapp_delivered?: number;
  whatsapp_seen?: number;
  whatsapp_replied?: number;
  whatsapp_skipped?: number;
  whatsapp_no_whatsapp?: number;
  whatsapp_delivery_rate?: string;
  whatsapp_read_rate?: string;
  whatsapp_reply_rate?: string;
  linkedin_invitations_sent?: number;
  linkedin_invitations_failed?: number;
  linkedin_invitations_skipped?: number;
  linkedin_invitations_accepted?: number;
  linkedin_invitations_attempted?: number;
  linkedin_submit_success_rate?: string;
  call_initiated?: number;
  call_answered?: number;
  call_completed?: number;
  call_not_answered?: number;
  call_failed?: number;
  call_busy?: number;
  call_answer_rate?: string;
  call_completion_rate?: string;
}

interface OverviewTabProps {
  campaign: Campaign;
  /** Row count from GET /campaigns/:id/leads (source of truth). */
  totalLeads: number;
  /** While true, KPI may fall back to campaign.leads (wizard metadata can be stale). */
  loadingLeads?: boolean;
}

export function OverviewTab({ campaign, totalLeads, loadingLeads = false }: OverviewTabProps) {
  const emailSent = campaign.email_sent ?? campaign.sent ?? 0;
  const calculatedOpenRate = emailSent && campaign.opened 
    ? ((campaign.opened / emailSent) * 100).toFixed(1) 
    : '0';
  const calculatedReplyRate = emailSent && campaign.replied 
    ? ((campaign.replied / emailSent) * 100).toFixed(1) 
    : '0';
  const calculatedConversionRate = campaign.replied && campaign.converted 
    ? ((campaign.converted / campaign.replied) * 100).toFixed(1) 
    : '0';

  const activeChannels = campaign.channels || (campaign.channel ? [campaign.channel] : []);

  // Prefer fetched list count: `campaign.leads` is saved at create/edit and can disagree
  // with tier/segment expansion (e.g. wizard showed 1 selected vs 7 cold leads in campaign).
  const totalLeadsKpi = loadingLeads ? (campaign.leads ?? 0) : totalLeads;

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Total Leads - Universal Metric */}
      <div style={{ 
        display:'grid', 
        gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', 
        gap:20, 
        marginBottom: 40 
      }}>
        <Kpi title="Total Leads" value={totalLeadsKpi} icon={Icons.Users} />
      </div>
      
      {/* Channel-Specific Metrics */}
      {(() => {
        const channelSections = [];
        
        // Email Channel Metrics
        if (activeChannels.includes('email')) {
          const processed = campaign.email_processed ?? 0;
          const emailDeliveryRate = emailSent && (campaign.delivered || 0) > 0
            ? (((campaign.delivered || 0) / emailSent) * 100).toFixed(1) 
            : '0';
          const emailClickRate = emailSent && (campaign.clicked || 0) > 0
            ? (((campaign.clicked || 0) / emailSent) * 100).toFixed(1) 
            : '0';
          const espRate = campaign.esp_accept_rate
            ?? (emailSent && processed > 0 ? ((processed / emailSent) * 100).toFixed(1) : '0');
          const ec = campaign.event_counts || {};
          const webhookLine = [
            `processed ${ec.processed ?? 0}`,
            `delivered ${ec.delivered ?? 0}`,
            `opened ${(ec.opened ?? 0) + (ec.email_opened ?? 0)}`,
            `clicked ${ec.clicked ?? 0}`,
            `replied ${(ec.replied ?? 0) + (ec.email_reply ?? 0)}`,
          ].join(' · ');
          
          channelSections.push(
            <div key="email" style={{ 
              marginBottom: 40,
              padding: '24px',
              background: 'var(--elev-bg)',
              borderRadius: '16px',
              border: '1px solid var(--elev-border)'
            }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                  <Icons.Mail size={20} style={{ color: '#3b82f6' }} />
                  Email Metrics
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: 30 }}>
                  Track email delivery, opens, clicks, and replies
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom: 16 }}>
                <Kpi title="Leads in campaign" value={totalLeadsKpi} icon={Icons.Users} />
                <Kpi title="Emails sent" value={emailSent} icon={Icons.Send} />
                <Kpi title="Resend accepted (email.sent)" value={processed} icon={Icons.CheckCircle} />
                <Kpi title="Delivered (inbox)" value={campaign.delivered || 0} icon={Icons.CheckCircle} />
                <Kpi title="Opened" value={campaign.opened || 0} icon={Icons.Eye} />
                <Kpi title="Clicked" value={campaign.clicked || 0} icon={Icons.ExternalLink} />
                <Kpi title="Replied" value={campaign.replied || 0} icon={Icons.MessageCircle} />
              </div>
              <div style={{
                marginBottom: 20,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--color-surface-secondary)',
                border: '1px solid var(--elev-border)',
                fontSize: 12,
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
              }}>
                <strong style={{ color: 'var(--color-text)' }}>Webhook / EventLog counts</strong>
                <div style={{ marginTop: 6 }}>{webhookLine}</div>
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  “Resend accepted” counts <code style={{ fontSize: 11 }}>email.sent</code> webhooks. “Delivered (inbox)” needs <code style={{ fontSize: 11 }}>email.delivered</code>.
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
                <Kpi title="Inbox delivery rate" value={`${emailDeliveryRate}%`} icon={Icons.Chart} />
                <Kpi title="ESP accept rate" value={`${espRate}%`} icon={Icons.Chart} />
                <Kpi title="Open rate (vs sent)" value={`${calculatedOpenRate}%`} icon={Icons.Chart} />
                <Kpi title="Click rate (vs sent)" value={`${emailClickRate}%`} icon={Icons.Chart} />
                <Kpi title="Reply rate (vs sent)" value={`${calculatedReplyRate}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        // WhatsApp Channel Metrics
        if (activeChannels.includes('whatsapp')) {
          const waSent = campaign.whatsapp_sent ?? 0;
          const waDel = campaign.whatsapp_delivered ?? 0;
          const waRep = campaign.whatsapp_replied ?? 0;
          const waDelRate = waSent > 0 ? ((waDel / waSent) * 100).toFixed(1) : (campaign.whatsapp_delivery_rate || '0.0');
          const waRepRate = waSent > 0 ? ((waRep / waSent) * 100).toFixed(1) : (campaign.whatsapp_reply_rate || '0.0');
          const waMsg =
            campaign.whatsapp_last_message_preview ||
            campaign.whatsapp_template_preview ||
            '';
          channelSections.push(
            <div key="whatsapp" style={{ 
              marginBottom: 40,
              padding: '24px',
              background: 'var(--elev-bg)',
              borderRadius: '16px',
              border: '1px solid var(--elev-border)'
            }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                  <Icons.MessageCircle size={20} style={{ color: '#25D366' }} />
                  WhatsApp Metrics
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: 30 }}>
                  Track messages sent, delivered, and replies for WhatsApp campaigns
                </p>
              </div>
              {waMsg ? (
                <div style={{
                  marginBottom: 20,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--color-surface-secondary)',
                  border: '1px solid var(--elev-border)',
                  fontSize: 13,
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.45,
                  maxHeight: 220,
                  overflow: 'auto',
                }}>
                  <strong style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Message (last send or template)</strong>
                  <div style={{ marginTop: 8 }}>{waMsg}</div>
                </div>
              ) : null}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom: 24 }}>
                <Kpi title="Sent" value={waSent} icon={Icons.Send} />
                <Kpi title="Delivered" value={waDel} icon={Icons.CheckCircle} />
                <Kpi title="Replied" value={waRep} icon={Icons.MessageCircle} />
                {campaign.whatsapp_no_whatsapp && campaign.whatsapp_no_whatsapp > 0 && (
                  <Kpi title="Skipped (No WhatsApp)" value={campaign.whatsapp_no_whatsapp} icon={Icons.AlertCircle} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
                <Kpi title="Delivery Rate" value={`${waDelRate}%`} icon={Icons.Chart} />
                <Kpi title="Reply Rate" value={`${waRepRate}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        // LinkedIn Channel Metrics
        if (activeChannels.includes('linkedin')) {
          const linkedinSent = campaign.linkedin_invitations_sent || 0;
          const linkedinAccepted = campaign.linkedin_invitations_accepted || 0;
          const linkedinFailed = campaign.linkedin_invitations_failed || 0;
          const linkedinSkipped = campaign.linkedin_invitations_skipped || 0;
          const linkedinAcceptanceRate = linkedinSent > 0 ? ((linkedinAccepted / linkedinSent) * 100).toFixed(1) : '0';
          const submitOk =
            campaign.linkedin_submit_success_rate
            ?? (linkedinSent + linkedinFailed > 0
              ? ((linkedinSent / (linkedinSent + linkedinFailed)) * 100).toFixed(1)
              : '0');
          
          channelSections.push(
            <div key="linkedin" style={{ 
              marginBottom: 40,
              padding: '24px',
              background: 'var(--elev-bg)',
              borderRadius: '16px',
              border: '1px solid var(--elev-border)'
            }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                  <Icons.Linkedin size={20} style={{ color: '#0077b5' }} />
                  LinkedIn Metrics
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: 30 }}>
                  Track connection invitations sent, accepted, and engagement
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom: 24 }}>
                <Kpi title="Invitations Sent" value={linkedinSent} icon={Icons.Send} />
                <Kpi title="Accepted" value={linkedinAccepted} icon={Icons.CheckCircle} />
                <Kpi title="Failed" value={linkedinFailed} icon={Icons.X} />
                {linkedinSkipped > 0 && (
                  <Kpi title="Skipped" value={linkedinSkipped} icon={Icons.AlertCircle} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
                <Kpi title="Acceptance rate" value={linkedinSent > 0 ? `${linkedinAcceptanceRate}%` : '—'} icon={Icons.Chart} />
                <Kpi title="API success (sent ÷ sent+failed)" value={`${submitOk}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        // Call Channel Metrics
        if (activeChannels.includes('call')) {
          channelSections.push(
            <div key="call" style={{ 
              marginBottom: 40,
              padding: '24px',
              background: 'var(--elev-bg)',
              borderRadius: '16px',
              border: '1px solid var(--elev-border)'
            }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                  <Icons.Phone size={20} style={{ color: '#4ecdc4' }} />
                  Call Metrics
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, paddingLeft: 30 }}>
                  Track call initiation, answers, completions, and outcomes
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom: 24 }}>
                <Kpi title="Initiated" value={campaign.call_initiated || 0} icon={Icons.Phone} />
                <Kpi title="Answered" value={campaign.call_answered || 0} icon={Icons.CheckCircle} />
                <Kpi title="Completed" value={campaign.call_completed || 0} icon={Icons.Check} />
                <Kpi title="Not Answered" value={campaign.call_not_answered || 0} icon={Icons.AlertCircle} />
                {(campaign.call_failed || 0) > 0 && (
                  <Kpi title="Failed" value={campaign.call_failed || 0} icon={Icons.AlertCircle} />
                )}
                {(campaign.call_busy || 0) > 0 && (
                  <Kpi title="Busy" value={campaign.call_busy || 0} icon={Icons.Clock} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
                <Kpi title="Answer Rate" value={`${campaign.call_answer_rate || '0'}%`} icon={Icons.Chart} />
                <Kpi title="Completion Rate" value={`${campaign.call_completion_rate || '0'}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        return channelSections.length > 0 ? channelSections : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
            No channel metrics available yet. Start the campaign to see metrics.
          </div>
        );
      })()}
      
      {/* Conversions - Universal Metric */}
      {(campaign.converted && campaign.converted > 0) && (
        <div style={{ 
          marginTop: 40,
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(78, 205, 196, 0.2)'
        }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
              <Icons.Target size={20} style={{ color: '#4ecdc4' }} />
              Overall Performance
            </h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
            <Kpi title="Conversions" value={campaign.converted || 0} icon={Icons.CheckCircle} />
            <Kpi title="Conversion Rate" value={`${calculatedConversionRate}%`} icon={Icons.Target} />
          </div>
        </div>
      )}

      {/* AI Insight */}
      {campaign.ai_insight && (
        <div style={{
          marginTop: 24,
          padding: 20,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(37, 99, 235, 0.2)'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Robot size={18} />
            AI Insight
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
            {campaign.ai_insight}
          </div>
        </div>
      )}
    </div>
  );
}

