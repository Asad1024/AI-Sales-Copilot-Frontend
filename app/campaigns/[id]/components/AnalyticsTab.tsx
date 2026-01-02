import { Icons } from "@/components/ui/Icons";
import { EmailActivityTimeline } from "./EmailActivityTimeline";

interface Campaign {
  id: number;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  converted?: number;
  ai_insight?: string;
  channels?: string[];
  whatsapp_sent?: number;
  whatsapp_delivered?: number;
  whatsapp_seen?: number;
  whatsapp_replied?: number;
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

interface AnalyticsTabProps {
  campaign: Campaign;
}

export function AnalyticsTab({ campaign }: AnalyticsTabProps) {
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

  // Metric Card Component
  const MetricCard = ({ title, value, subtitle, gradient, color }: { title: string; value: number | string; subtitle?: string; gradient: string; color: string }) => (
    <div style={{
      background: gradient,
      borderRadius: 16,
      padding: 24,
      border: `1px solid ${color}40`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `${color}20`, borderRadius: '50%' }} />
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, position: 'relative', zIndex: 1 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, position: 'relative', zIndex: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 8, position: 'relative', zIndex: 1 }}>{subtitle}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Campaign Analytics</h3>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          Performance metrics and insights
        </p>
      </div>
      
      {campaign && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Email Channel Metrics */}
          {activeChannels.includes('email') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Mail size={18} />
                  Email Metrics
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Sent" value={campaign.sent || 0} gradient="linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(76, 103, 255, 0.05) 100%)" color="#4C67FF" />
                <MetricCard title="Delivered" value={campaign.delivered || 0} subtitle={`${campaign.sent && campaign.delivered ? ((campaign.delivered / campaign.sent) * 100).toFixed(1) : '0'}% delivery rate`} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                <MetricCard title="Opened" value={campaign.opened || 0} subtitle={`${calculatedOpenRate}% open rate`} gradient="linear-gradient(135deg, rgba(169, 76, 255, 0.1) 0%, rgba(169, 76, 255, 0.05) 100%)" color="#A94CFF" />
                <MetricCard title="Clicked" value={campaign.clicked || 0} subtitle={`${campaign.sent && campaign.clicked ? ((campaign.clicked / campaign.sent) * 100).toFixed(1) : '0'}% click rate`} gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)" color="#3b82f6" />
                <MetricCard title="Replied" value={campaign.replied || 0} subtitle={`${calculatedReplyRate}% reply rate`} gradient="linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)" color="#ff6b6b" />
              </div>
            </div>
          )}

          {/* WhatsApp Channel Metrics */}
          {activeChannels.includes('whatsapp') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📱</span>
                  WhatsApp Metrics
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Sent" value={campaign.whatsapp_sent || 0} gradient="linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(37, 211, 102, 0.05) 100%)" color="#25D366" />
                <MetricCard title="Delivered" value={campaign.whatsapp_delivered || 0} subtitle={`${campaign.whatsapp_delivery_rate || '0'}% delivery rate`} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                <MetricCard title="Read (Seen)" value={campaign.whatsapp_seen || 0} subtitle={`${campaign.whatsapp_read_rate || '0'}% read rate`} gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)" color="#3b82f6" />
                <MetricCard title="Replied" value={campaign.whatsapp_replied || 0} subtitle={`${campaign.whatsapp_reply_rate || '0'}% reply rate`} gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)" color="#8b5cf6" />
              </div>
            </div>
          )}

          {/* LinkedIn Channel Metrics */}
          {activeChannels.includes('linkedin') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Linkedin size={18} />
                  LinkedIn Metrics
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Invitations Sent" value={campaign.linkedin_invitations_sent || 0} gradient="linear-gradient(135deg, rgba(0, 119, 181, 0.1) 0%, rgba(0, 119, 181, 0.05) 100%)" color="#0077b5" />
                <MetricCard title="Accepted" value={campaign.linkedin_invitations_accepted || 0} subtitle={`${campaign.linkedin_invitations_sent && campaign.linkedin_invitations_accepted ? ((campaign.linkedin_invitations_accepted / campaign.linkedin_invitations_sent) * 100).toFixed(1) : '0'}% acceptance rate`} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                {campaign.linkedin_invitations_failed && campaign.linkedin_invitations_failed > 0 && (
                  <MetricCard title="Failed" value={campaign.linkedin_invitations_failed} gradient="linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)" color="#ff6b6b" />
                )}
                {campaign.linkedin_invitations_skipped && campaign.linkedin_invitations_skipped > 0 && (
                  <MetricCard title="Skipped" value={campaign.linkedin_invitations_skipped} gradient="linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)" color="#ffc107" />
                )}
              </div>
            </div>
          )}

          {/* Call Channel Metrics */}
          {activeChannels.includes('call') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Phone size={18} />
                  Call Metrics
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Calls Initiated" value={campaign.call_initiated || 0} gradient="linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(76, 103, 255, 0.05) 100%)" color="#4C67FF" />
                <MetricCard title="Answered" value={campaign.call_answered || 0} subtitle={`${campaign.call_answer_rate || '0'}% answer rate`} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                <MetricCard title="Completed" value={campaign.call_completed || 0} subtitle={`${campaign.call_completion_rate || '0'}% completion rate`} gradient="linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)" color="#22c55e" />
                <MetricCard title="Not Answered" value={campaign.call_not_answered || 0} gradient="linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)" color="#ffc107" />
                {(campaign.call_failed || 0) > 0 && (
                  <MetricCard title="Failed" value={campaign.call_failed || 0} gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)" color="#ef4444" />
                )}
                {(campaign.call_busy || 0) > 0 && (
                  <MetricCard title="Busy" value={campaign.call_busy || 0} gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)" color="#fb923c" />
                )}
              </div>
            </div>
          )}

          {/* Conversions */}
          {campaign.converted && campaign.converted > 0 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Target size={18} />
                  Overall Performance
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Conversions" value={campaign.converted} subtitle={`${calculatedConversionRate}% conversion rate`} gradient="linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%)" color="#4ecdc4" />
              </div>
            </div>
          )}

          {/* Performance Chart */}
          <div style={{
            background: 'var(--color-surface-secondary)',
            borderRadius: 12,
            padding: 24,
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Performance Over Time</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((day, idx) => {
                const sentHeight = campaign.sent ? Math.min((campaign.sent / 7) * (Math.random() * 0.3 + 0.7), 100) : 0;
                const openedHeight = campaign.opened ? Math.min((campaign.opened / 7) * (Math.random() * 0.3 + 0.7), sentHeight * 0.8) : 0;
                const repliedHeight = campaign.replied ? Math.min((campaign.replied / 7) * (Math.random() * 0.3 + 0.7), openedHeight * 0.6) : 0;
                
                return (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 150, width: '100%' }}>
                      <div style={{ width: '33%', height: `${sentHeight}%`, background: 'linear-gradient(to top, #4C67FF, rgba(76, 103, 255, 0.3))', borderRadius: '4px 4px 0 0', minHeight: sentHeight > 0 ? 4 : 0 }} />
                      <div style={{ width: '33%', height: `${openedHeight}%`, background: 'linear-gradient(to top, #A94CFF, rgba(169, 76, 255, 0.3))', borderRadius: '4px 4px 0 0', minHeight: openedHeight > 0 ? 4 : 0 }} />
                      <div style={{ width: '33%', height: `${repliedHeight}%`, background: 'linear-gradient(to top, #ff6b6b, rgba(255, 107, 107, 0.3))', borderRadius: '4px 4px 0 0', minHeight: repliedHeight > 0 ? 4 : 0 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Day {day}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: '#4C67FF', borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: '#888' }}>Sent</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: '#A94CFF', borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: '#888' }}>Opened</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, background: '#ff6b6b', borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: '#888' }}>Replied</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {campaign.ai_insight && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid rgba(76, 103, 255, 0.3)'
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Robot size={18} style={{ color: '#4C67FF' }} />
                AI Insights
              </h4>
              <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>
                {campaign.ai_insight}
              </p>
            </div>
          )}

          {/* Email Activity Timeline */}
          {(activeChannels.includes('email')) && (
            <div style={{
              background: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                Email Activity Timeline
              </h4>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                Real-time tracking of email events (sent, delivered, opened, clicked, bounced, etc.)
              </p>
              <EmailActivityTimeline 
                campaignId={campaign.id}
                leadEmail={undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

