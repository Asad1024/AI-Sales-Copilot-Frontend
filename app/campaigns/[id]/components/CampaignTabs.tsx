import { Icons } from "@/components/ui/Icons";

interface CampaignTabsProps {
  tab: 'overview'|'sequence'|'analytics'|'inbox'|'leads'|'transcripts';
  setTab: (tab: 'overview'|'sequence'|'analytics'|'inbox'|'leads'|'transcripts') => void;
}

export function CampaignTabs({ tab, setTab }: CampaignTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Icons.Dashboard },
    { id: 'leads', label: 'Leads', icon: Icons.Users },
    { id: 'sequence', label: 'Sequence', icon: Icons.Send },
    { id: 'analytics', label: 'Analytics', icon: Icons.Chart },
    { id: 'inbox', label: 'Inbox', icon: Icons.Mail },
    { id: 'transcripts', label: 'Call Transcripts', icon: Icons.Phone }
  ];

  return (
    <div style={{ display:'flex', gap:8, marginBottom: 24, flexWrap: 'wrap', borderBottom: '2px solid var(--color-border)', paddingBottom: 20 }}>
      {tabs.map(t=> {
        const IconComponent = t.icon;
        return (
          <button 
            key={t.id} 
            className={tab===t.id ? 'btn-primary' : 'btn-ghost'} 
            onClick={()=>setTab(t.id as any)}
            style={{ 
              padding: '12px 20px', 
              fontSize: 14,
              textTransform: 'capitalize',
              fontWeight: tab === t.id ? 600 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 8,
              transition: 'all 0.2s',
              borderBottom: tab === t.id ? '2px solid #4C67FF' : '2px solid transparent',
              marginBottom: tab === t.id ? '-2px' : '0',
              position: 'relative'
            }}
          >
            <IconComponent size={16} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

