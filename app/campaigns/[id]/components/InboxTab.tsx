"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { apiRequest } from "@/lib/apiClient";

interface Reply {
  id: number;
  type: string;
  lead_id: number;
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  message?: string;
  createdAt: string;
  meta?: any;
}

export function InboxTab() {
  const params = useParams();
  const campaignId = params?.id;
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;

    const fetchReplies = async () => {
      try {
        setLoading(true);
        // Fetch event logs for this campaign with type whatsapp_replied or email_replied
        const response = await apiRequest(`/campaigns/${campaignId}/events?types=whatsapp_replied,email_replied,linkedin_replied`);
        setReplies(response.events || []);
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReplies();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Icons.Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Campaign Inbox</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
          Replies and conversations from this campaign ({replies.length})
        </p>
      </div>

      {replies.length === 0 ? (
        <div style={{ 
          padding: 40, 
          textAlign: 'center',
          background: 'rgba(var(--color-primary-rgb), 0.2)',
          borderRadius: 12,
          border: '1px dashed rgba(var(--color-primary-rgb), 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: 'rgba(var(--color-primary-rgb), 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icons.Mail size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No replies yet</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Replies will appear here once leads start responding
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {replies.map((reply) => {
            const channelIcon = reply.type.includes('whatsapp') ? Icons.MessageCircle : 
                               reply.type.includes('email') ? Icons.Mail : 
                               Icons.Linkedin;
            const ChannelIcon = channelIcon;
            
            return (
              <div 
                key={reply.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: 20,
                  transition: 'all 0.2s'
                }}
                className="ms-hover-scale"
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ChannelIcon size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                          {reply.lead_name || 'Unknown Lead'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {reply.lead_phone || reply.lead_email || 'No contact info'}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {new Date(reply.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ 
                      marginTop: 12,
                      padding: 12,
                      background: 'rgba(var(--color-primary-rgb), 0.2)',
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {reply.message || reply.meta?.message || 'No message content'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

