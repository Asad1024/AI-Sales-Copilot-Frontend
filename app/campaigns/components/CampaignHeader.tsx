"use client";
import { useRouter } from "next/navigation";
import BaseSelector from "@/components/ui/BaseSelector";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore } from "@/stores/useCampaignStore";

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'email': return Icons.Mail;
    case 'linkedin': return Icons.Linkedin;
    case 'whatsapp': return Icons.MessageCircle;
    case 'call': return Icons.Phone;
    default: return Icons.Rocket;
  }
};

export function CampaignHeader() {
  const router = useRouter();
  const { filters, setFilters } = useCampaignStore();

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.1) 0%, rgba(169, 76, 255, 0.1) 100%)',
      borderRadius: '20px',
      padding: '32px',
      border: '1px solid rgba(76, 103, 255, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Campaign Management
          </h1>
          <p style={{ fontSize: '16px', color: '#888', margin: 0 }}>
            Create, optimize, and scale your sales campaigns with AI assistance
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Select Base</label>
          <BaseSelector />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems:'center' }}>
        <input
          placeholder="Search campaigns…"
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          style={{ 
            flex: 1,
            minWidth: 200,
            padding:'12px 16px', 
            borderRadius:12, 
            border:'1px solid var(--elev-border)', 
            background:'var(--elev-bg)',
            fontSize: 14,
            outline: 'none'
          }}
        />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(['all','running','paused','draft','completed'] as const).map(s => (
            <button 
              key={s} 
              className={filters.status===s? 'btn-primary':'btn-ghost'} 
              onClick={()=> setFilters({ status: s })}
              style={{ padding: '8px 16px', fontSize: 13, textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(['all','email','linkedin','whatsapp','call'] as const).map(ch => {
            const IconComponent = ch === 'all' ? Icons.Rocket : getChannelIcon(ch);
            return (
              <button 
                key={ch} 
                className={filters.channel===ch? 'btn-primary':'btn-ghost'} 
                onClick={()=> setFilters({ channel: ch })}
                style={{ padding: '8px 16px', fontSize: 13, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <IconComponent size={16} />
                {ch}
              </button>
            );
          })}
        </div>
        <button 
          onClick={() => router.push('/campaigns/new')}
          style={{
            background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            color: '#000000',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          + New Campaign
        </button>
      </div>
    </div>
  );
}

