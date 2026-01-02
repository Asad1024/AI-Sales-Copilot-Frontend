import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  base_id: number;
  updated_at?: string;
  tier_filter?: string;
  channels?: string[];
}

interface CampaignHeaderProps {
  campaign: Campaign;
  baseName: string;
  updating: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
}

export function CampaignHeader({ campaign, baseName, updating, onToggleStatus, onEdit }: CampaignHeaderProps) {
  const router = useRouter();

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

  const statusColors = getStatusColor(campaign.status);
  const ChannelIcon = getChannelIcon(campaign.channel);

  return (
    <div className="card-enhanced" style={{ 
      borderRadius: 16, 
      padding: 24,
      background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.05) 0%, rgba(169, 76, 255, 0.05) 100%)',
      border: '1px solid rgba(76, 103, 255, 0.2)'
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '32px', fontWeight: 700, background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {campaign.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <div className="text-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChannelIcon size={16} />
              Channel: {campaign.channel}
            </div>
            {campaign.channels && campaign.channels.length > 1 && (
              <div style={{ 
                fontSize: 12, 
                color: '#4C67FF', 
                fontWeight: 600,
                padding: '4px 8px',
                background: 'rgba(76, 103, 255, 0.1)',
                borderRadius: 6
              }}>
                +{campaign.channels.length - 1} more channel{campaign.channels.length - 1 !== 1 ? 's' : ''}
              </div>
            )}
            <div className="text-hint">• {baseName}</div>
            {campaign.tier_filter && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 4, 
                padding: '4px 10px',
                background: campaign.tier_filter === 'Hot' ? 'rgba(255, 107, 107, 0.1)' :
                            campaign.tier_filter === 'Warm' ? 'rgba(255, 167, 38, 0.1)' :
                            'rgba(128, 128, 128, 0.1)',
                borderRadius: 6,
                fontSize: 12,
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
          </div>
          {campaign.updated_at && (
            <div className="text-hint" style={{ fontSize: 12 }}>
              Last updated: {new Date(campaign.updated_at).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap: 'wrap' }}>
          <button 
            className="btn-ghost" 
            onClick={()=>router.push('/campaigns')}
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icons.ChevronLeft size={16} />
            Back
          </button>
          <button 
            className="btn-primary" 
            onClick={onToggleStatus}
            disabled={updating || campaign.status === 'completed'}
            style={{ 
              padding: '10px 20px',
              opacity: (updating || campaign.status === 'completed') ? 0.6 : 1,
              cursor: (updating || campaign.status === 'completed') ? 'not-allowed' : 'pointer'
            }}
          >
            {updating ? (
              <>
                <Icons.Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Updating...
              </>
            ) : campaign.status === 'running' ? (
              <>
                <Icons.Pause size={16} />
                Pause
              </>
            ) : campaign.status === 'paused' ? (
              <>
                <Icons.Play size={16} />
                Resume
              </>
            ) : campaign.status === 'draft' ? (
              <>
                <Icons.Rocket size={16} />
                Launch
              </>
            ) : (
              <>
                <Icons.CheckCircle size={16} />
                Completed
              </>
            )}
          </button>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}} />
          <button 
            className="btn-ghost" 
            onClick={onEdit}
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icons.FileEdit size={16} />
            Edit
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div style={{ marginTop: 16 }}>
        <span style={{
          background: statusColors.bg,
          color: statusColors.color,
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          textTransform: 'capitalize',
          display: 'inline-flex',
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
    </div>
  );
}

