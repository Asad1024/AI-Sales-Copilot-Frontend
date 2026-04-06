"use client";
import { useRouter } from "next/navigation";
import BaseSelector from "@/components/ui/BaseSelector";
import ToolbarSearchField from "@/components/ui/ToolbarSearchField";
import { PORTAL_ACTION_ICON } from "@/components/ui/actionIcons";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { goToNewCampaignOrWorkspaces } from "@/lib/goToNewCampaign";

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
  const { activeBaseId } = useBaseStore();
  const { filters, setFilters } = useCampaignStore();

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '14px',
      padding: '20px',
      border: '0.5px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Select Base</label>
          <BaseSelector />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems:'center' }}>
        <ToolbarSearchField
          value={filters.search}
          onChange={(v) => setFilters({ search: v })}
          placeholder="Search campaigns…"
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Search campaigns"
        />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(['all','running','paused','draft','completed'] as const).map(s => (
            <button 
              key={s} 
              type="button"
              className={filters.status===s? 'btn-primary':'btn-ghost'} 
              onClick={()=> setFilters({ status: s })}
              style={{ padding: '8px 14px', fontSize: 13, textTransform: 'capitalize', borderRadius: 8 }}
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
                type="button"
                className={filters.channel===ch? 'btn-primary':'btn-ghost'} 
                onClick={()=> setFilters({ channel: ch })}
                style={{ padding: '8px 14px', fontSize: 13, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}
              >
                <IconComponent {...PORTAL_ACTION_ICON} />
                {ch}
              </button>
            );
          })}
        </div>
        <button 
          onClick={() => goToNewCampaignOrWorkspaces(router, activeBaseId)}
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

