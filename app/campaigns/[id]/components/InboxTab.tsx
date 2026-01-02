import { Icons } from "@/components/ui/Icons";

export function InboxTab() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Campaign Inbox</h3>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          Replies and conversations from this campaign
        </p>
      </div>
      <div style={{ 
        padding: 40, 
        textAlign: 'center',
        background: 'rgba(76, 103, 255, 0.05)',
        borderRadius: 12,
        border: '1px dashed rgba(76, 103, 255, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }}>
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
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No replies yet</div>
        <div style={{ fontSize: 13, color: '#888' }}>
          Replies will appear here once leads start responding
        </div>
      </div>
    </div>
  );
}

