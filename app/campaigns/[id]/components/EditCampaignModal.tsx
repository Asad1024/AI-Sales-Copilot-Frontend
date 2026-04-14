import { Icons } from "@/components/ui/Icons";

interface Campaign {
  id: number;
  name: string;
  tier_filter?: string;
  leads?: number;
}

interface EditCampaignModalProps {
  campaign: Campaign;
  editData: { name: string; status: 'draft' | 'running' | 'paused' | 'completed' };
  updating: boolean;
  totalLeads: number;
  loadingLeads?: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onEditDataChange: (data: { name: string; status: 'draft' | 'running' | 'paused' | 'completed' }) => void;
}

export function EditCampaignModal({ campaign, editData, updating, totalLeads, loadingLeads = false, onClose, onUpdate, onEditDataChange }: EditCampaignModalProps) {
  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,.6)', 
        backdropFilter: 'blur(4px)',
        zIndex:1000, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        padding:20 
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ 
        width:'min(500px, 96vw)', 
        background:'var(--elev-bg)', 
        border:'1px solid var(--elev-border)', 
        borderRadius:16, 
        padding:24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize: 20, fontWeight: 700 }}>Edit Campaign</h3>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ padding: '8px 12px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Campaign Name
            </label>
            <input
              type="text"
              className="input"
              value={editData.name}
              onChange={(e) => onEditDataChange({ ...editData, name: e.target.value })}
              placeholder="Campaign name"
              style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Status
            </label>
            <select
              className="input"
              value={editData.status}
              onChange={(e) => onEditDataChange({ ...editData, status: e.target.value as any })}
              style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
            >
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {campaign.tier_filter && (
            <div style={{
              padding: 12,
              background: 'rgba(124, 58, 237, 0.1)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--color-text-muted)'
            }}>
              <strong>Target Tier:</strong> {campaign.tier_filter} Leads ({loadingLeads ? (campaign.leads ?? 0) : totalLeads} leads)
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button 
              className="btn-ghost" 
              onClick={onClose}
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={onUpdate}
              disabled={updating || !editData.name.trim()}
              style={{ 
                padding: '10px 24px', 
                fontSize: 14,
                opacity: (updating || !editData.name.trim()) ? 0.6 : 1,
                cursor: (updating || !editData.name.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

