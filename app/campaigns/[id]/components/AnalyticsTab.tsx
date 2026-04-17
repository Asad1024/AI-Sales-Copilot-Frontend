import { Icons } from "@/components/ui/Icons";
import { EmailActivityTimeline } from "./EmailActivityTimeline";

interface Campaign {
  id: number;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  sent?: number;
  email_sent?: number;
  email_processed?: number;
  esp_accept_rate?: string;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  converted?: number;
  bounced?: number;
  dropped?: number;
  spam_reports?: number;
  unsubscribed?: number;
  deliveryRate?: string;
  openRate?: string;
  clickRate?: string;
  replyRate?: string;
  bounceRate?: string;
  dropRate?: string;
  spamRate?: string;
  unsubscribeRate?: string;
  healthScore?: number;
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
  linkedin_submit_success_rate?: string;
  call_initiated?: number;
  call_answered?: number;
  call_completed?: number;
  call_not_answered?: number;
  call_failed?: number;
  call_busy?: number;
  call_answer_rate?: string;
  call_completion_rate?: string;
  config?: any;
}

interface AnalyticsTabProps {
  campaign: Campaign;
}

export function AnalyticsTab({ campaign }: AnalyticsTabProps) {
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
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, position: 'relative', zIndex: 1 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, position: 'relative', zIndex: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, position: 'relative', zIndex: 1 }}>{subtitle}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Campaign Analytics</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
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
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📤 Sending & Delivery
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <MetricCard title="Emails sent" value={emailSent} gradient="linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)" color="#2563EB" />
                  <MetricCard title="Resend accepted (processed)" value={campaign.email_processed ?? 0} subtitle={campaign.esp_accept_rate ? `${campaign.esp_accept_rate}% ESP accept rate` : undefined} gradient="linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)" color="#6366f1" />
                  <MetricCard title="Delivered (inbox)" value={campaign.delivered || 0} subtitle={campaign.deliveryRate ? `${campaign.deliveryRate}% inbox delivery rate` : undefined} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                  {(campaign.bounced || 0) > 0 && (
                    <MetricCard title="Bounced" value={campaign.bounced || 0} subtitle={campaign.bounceRate ? `${campaign.bounceRate}% bounce rate` : undefined} gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)" color="#ef4444" />
                  )}
                  {(campaign.dropped || 0) > 0 && (
                    <MetricCard title="Dropped" value={campaign.dropped || 0} subtitle={campaign.dropRate ? `${campaign.dropRate}% drop rate` : undefined} gradient="linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)" color="#f59e0b" />
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  💡 Engagement
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <MetricCard title="Opened" value={campaign.opened || 0} subtitle={campaign.openRate ? `${campaign.openRate}% open rate` : undefined} gradient="linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)" color="#06B6D4" />
                  <MetricCard title="Clicked" value={campaign.clicked || 0} subtitle={campaign.clickRate ? `${campaign.clickRate}% click rate` : undefined} gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)" color="#3b82f6" />
                  <MetricCard title="Replied" value={campaign.replied || 0} subtitle={campaign.replyRate ? `${campaign.replyRate}% reply rate` : undefined} gradient="linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)" color="#22c55e" />
                </div>
              </div>
              
              {((campaign.spam_reports || 0) > 0 || (campaign.unsubscribed || 0) > 0) && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚠️ Issues
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    {(campaign.spam_reports || 0) > 0 && (
                      <MetricCard title="Spam Reports" value={campaign.spam_reports || 0} subtitle={campaign.spamRate ? `${campaign.spamRate}% spam rate` : undefined} gradient="linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)" color="#dc2626" />
                    )}
                    {(campaign.unsubscribed || 0) > 0 && (
                      <MetricCard title="Unsubscribed" value={campaign.unsubscribed || 0} subtitle={campaign.unsubscribeRate ? `${campaign.unsubscribeRate}% unsubscribe rate` : undefined} gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)" color="#fb923c" />
                    )}
                  </div>
                </div>
              )}
              
              {campaign.healthScore !== undefined && (
                <div style={{ marginTop: 20, padding: 20, background: campaign.healthScore >= 85 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)' : campaign.healthScore >= 70 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)', borderRadius: 12, border: `1px solid ${campaign.healthScore >= 85 ? '#10b98140' : campaign.healthScore >= 70 ? '#f59e0b40' : '#ef444440'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Deliverability Health Score</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {campaign.healthScore >= 95 ? '✅ Excellent' : campaign.healthScore >= 85 ? '✅ Good' : campaign.healthScore >= 70 ? '⚠️ Fair - needs improvement' : '🚨 Poor - critical issues'}
                      </div>
                    </div>
                    <div style={{ fontSize: 48, fontWeight: 700, color: campaign.healthScore >= 85 ? '#10b981' : campaign.healthScore >= 70 ? '#f59e0b' : '#ef4444' }}>
                      {campaign.healthScore}/100
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp Channel Metrics */}
          {activeChannels.includes('whatsapp') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.MessageCircle size={18} style={{ color: '#25D366' }} />
                  WhatsApp Metrics
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Track messages sent, delivered, and replies for WhatsApp campaigns
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <MetricCard title="Sent" value={campaign.whatsapp_sent ?? 0} gradient="linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(37, 211, 102, 0.05) 100%)" color="#25D366" />
                <MetricCard title="Delivered" value={campaign.whatsapp_delivered ?? 0} subtitle={campaign.whatsapp_delivery_rate ? `${campaign.whatsapp_delivery_rate}% delivery rate` : undefined} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                <MetricCard title="Replied" value={campaign.whatsapp_replied ?? 0} subtitle={campaign.whatsapp_reply_rate ? `${campaign.whatsapp_reply_rate}% reply rate` : undefined} gradient="linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)" color="#8b5cf6" />
              </div>
            </div>
          )}

          {/* Call Channel Metrics */}
          {activeChannels.includes('call') && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Phone size={18} style={{ color: '#6366f1' }} />
                  Call Metrics
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Track calls initiated, answered, and completed with transcripts
                </p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📞 Call Status
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <MetricCard title="Initiated" value={campaign.call_initiated || 0} gradient="linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)" color="#6366f1" />
                  <MetricCard title="Answered" value={campaign.call_answered || 0} subtitle={campaign.call_answer_rate ? `${campaign.call_answer_rate}% answer rate` : undefined} gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)" color="#10b981" />
                  <MetricCard title="Completed" value={campaign.call_completed || 0} subtitle={campaign.call_completion_rate ? `${campaign.call_completion_rate}% completion rate` : undefined} gradient="linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)" color="#22c55e" />
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 Call Outcomes
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <MetricCard title="Failed" value={campaign.call_failed || 0} gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)" color="#ef4444" />
                  <MetricCard title="No Answer" value={campaign.call_not_answered || 0} gradient="linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)" color="#f59e0b" />
                  <MetricCard title="Busy" value={campaign.call_busy || 0} gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)" color="#fb923c" />
                </div>
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
                <MetricCard title="API success" value={`${campaign.linkedin_submit_success_rate ?? '0'}%`} subtitle="Sent ÷ (sent + failed)" gradient="linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)" color="#2563EB" />
                {campaign.linkedin_invitations_failed && campaign.linkedin_invitations_failed > 0 && (
                  <MetricCard title="Failed" value={campaign.linkedin_invitations_failed} gradient="linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)" color="#ff6b6b" />
                )}
                {campaign.linkedin_invitations_skipped && campaign.linkedin_invitations_skipped > 0 && (
                  <MetricCard title="Skipped" value={campaign.linkedin_invitations_skipped} gradient="linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)" color="#ffc107" />
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

          {/* Campaign totals (real figures — no simulated time series yet) */}
          {activeChannels.includes('email') && (
            <div style={{
              background: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Email volume snapshot</h4>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
                Bar heights use your live totals (not random placeholders). Per-day trends require stored time-series.
              </p>
              {(() => {
                const s = emailSent || 0;
                const o = campaign.opened || 0;
                const r = campaign.replied || 0;
                const max = Math.max(s, o, r, 1);
                const bars = [
                  { label: 'Sent', value: s, color: '#2563EB' },
                  { label: 'Opened', value: o, color: '#06B6D4' },
                  { label: 'Replied', value: r, color: '#ff6b6b' },
                ];
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 160, paddingTop: 8 }}>
                    {bars.map((b) => (
                      <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{b.value}</div>
                        <div style={{
                          width: '100%',
                          maxWidth: 56,
                          height: `${Math.max(8, (b.value / max) * 120)}px`,
                          background: `linear-gradient(to top, ${b.color}, ${b.color}55)`,
                          borderRadius: '6px 6px 0 0',
                        }} />
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* AI Insights */}
          {campaign.ai_insight && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid rgba(37, 99, 235, 0.3)'
            }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icons.Robot size={18} style={{ color: '#2563EB' }} />
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

