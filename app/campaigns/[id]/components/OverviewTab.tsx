import { Icons } from "@/components/ui/Icons";
import { Kpi } from "./Kpi";

interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  base_id: number;
  leads?: number;
  sent?: number;
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
  totalLeads: number;
}

export function OverviewTab({ campaign, totalLeads }: OverviewTabProps) {
  const calculatedOpenRate = campaign.sent && campaign.opened 
    ? ((campaign.opened / campaign.sent) * 100).toFixed(1) 
    : '0';
  const calculatedReplyRate = campaign.sent && campaign.replied 
    ? ((campaign.replied / campaign.sent) * 100).toFixed(1) 
    : '0';
  const calculatedConversionRate = campaign.replied && campaign.converted 
    ? ((campaign.converted / campaign.replied) * 100).toFixed(1) 
    : '0';

  const activeChannels = campaign.channels || (campaign.channel ? [campaign.channel] : []);

  return (
    <div>
      {/* Total Leads - Universal Metric */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom: 32 }}>
        <Kpi title="Total Leads" value={campaign.leads || totalLeads || 0} icon={Icons.Users} />
      </div>
      
      {/* Channel-Specific Metrics */}
      {(() => {
        const channelSections = [];
        
        // Email Channel Metrics
        if (activeChannels.includes('email')) {
          const emailDeliveryRate = campaign.sent && campaign.delivered 
            ? ((campaign.delivered / campaign.sent) * 100).toFixed(1) 
            : '0';
          const emailClickRate = campaign.sent && campaign.clicked 
            ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) 
            : '0';
          
          channelSections.push(
            <div key="email" style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Mail size={18} />
                  Email Metrics
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  Track email delivery, opens, clicks, and replies
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom: 16 }}>
                <Kpi title="Sent" value={campaign.sent || 0} icon={Icons.Send} />
                <Kpi title="Delivered" value={campaign.delivered || 0} icon={Icons.CheckCircle} />
                <Kpi title="Opened" value={campaign.opened || 0} icon={Icons.Eye} />
                <Kpi title="Clicked" value={campaign.clicked || 0} icon={Icons.ExternalLink} />
                <Kpi title="Replied" value={campaign.replied || 0} icon={Icons.MessageCircle} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                <Kpi title="Delivery Rate" value={`${emailDeliveryRate}%`} icon={Icons.Chart} />
                <Kpi title="Open Rate" value={`${calculatedOpenRate}%`} icon={Icons.Chart} />
                <Kpi title="Click Rate" value={`${emailClickRate}%`} icon={Icons.Chart} />
                <Kpi title="Reply Rate" value={`${calculatedReplyRate}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        // WhatsApp Channel Metrics
        if (activeChannels.includes('whatsapp')) {
          channelSections.push(
            <div key="whatsapp" style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📱</span>
                  WhatsApp Metrics
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  Track delivery, read status, and replies for WhatsApp messages
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom: 16 }}>
                <Kpi title="Sent" value={campaign.whatsapp_sent || 0} icon={Icons.Send} />
                <Kpi title="Delivered" value={campaign.whatsapp_delivered || 0} icon={Icons.CheckCircle} />
                <Kpi title="Read (Seen)" value={campaign.whatsapp_seen || 0} icon={Icons.Eye} />
                <Kpi title="Replied" value={campaign.whatsapp_replied || 0} icon={Icons.MessageCircle} />
                {campaign.whatsapp_no_whatsapp && campaign.whatsapp_no_whatsapp > 0 && (
                  <Kpi title="Skipped (No WhatsApp)" value={campaign.whatsapp_no_whatsapp || 0} icon={Icons.AlertCircle} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                <Kpi title="Delivery Rate" value={`${campaign.whatsapp_delivery_rate || '0'}%`} icon={Icons.Chart} />
                <Kpi title="Read Rate" value={`${campaign.whatsapp_read_rate || '0'}%`} icon={Icons.Chart} />
                <Kpi title="Reply Rate" value={`${campaign.whatsapp_reply_rate || '0'}%`} icon={Icons.Target} />
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
          
          channelSections.push(
            <div key="linkedin" style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Linkedin size={18} />
                  LinkedIn Metrics
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  Track connection invitations sent, accepted, and engagement
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom: 16 }}>
                <Kpi title="Invitations Sent" value={linkedinSent} icon={Icons.Send} />
                <Kpi title="Accepted" value={linkedinAccepted} icon={Icons.CheckCircle} />
                {linkedinFailed > 0 && (
                  <Kpi title="Failed" value={linkedinFailed} icon={Icons.X} />
                )}
                {linkedinSkipped > 0 && (
                  <Kpi title="Skipped" value={linkedinSkipped} icon={Icons.AlertCircle} />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                <Kpi title="Acceptance Rate" value={`${linkedinAcceptanceRate}%`} icon={Icons.Chart} />
              </div>
            </div>
          );
        }
        
        // Call Channel Metrics
        if (activeChannels.includes('call')) {
          channelSections.push(
            <div key="call" style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Phone size={18} />
                  Call Metrics
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  Track call initiation, answers, completions, and outcomes
                </p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom: 16 }}>
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                <Kpi title="Answer Rate" value={`${campaign.call_answer_rate || '0'}%`} icon={Icons.Chart} />
                <Kpi title="Completion Rate" value={`${campaign.call_completion_rate || '0'}%`} icon={Icons.Target} />
              </div>
            </div>
          );
        }
        
        return channelSections.length > 0 ? channelSections : (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            No channel metrics available yet. Start the campaign to see metrics.
          </div>
        );
      })()}
      
      {/* Conversions - Universal Metric */}
      {(campaign.converted && campaign.converted > 0) && (
        <div style={{ marginTop: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Target size={18} />
              Overall Performance
            </h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
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
          background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(76, 103, 255, 0.2)'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#4C67FF', display: 'flex', alignItems: 'center', gap: 8 }}>
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

