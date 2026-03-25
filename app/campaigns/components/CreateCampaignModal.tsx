"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useNotification } from "@/context/NotificationContext";

export function CreateCampaignModal() {
  const router = useRouter();
  const { showError, showWarning } = useNotification();
  const { activeBaseId, bases } = useBaseStore();
  const { createCampaign } = useCampaignStore();
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "email" as "email" | "whatsapp" | "call" | "linkedin",
    base_id: activeBaseId || null
  });

  const handleCreate = async () => {
    if (!newCampaign.name.trim()) {
      showWarning('Campaign name', 'Please enter a campaign name.');
      return;
    }
    if (!newCampaign.base_id) {
      showWarning('Workspace', 'Please select a workspace.');
      return;
    }
    
    setCreating(true);
    try {
      const campaign = await createCampaign({
        name: newCampaign.name.trim(),
        channel: newCampaign.channel,
        base_id: newCampaign.base_id,
        status: 'draft'
      });
      
      if (campaign) {
        setShowModal(false);
        setNewCampaign({ name: "", channel: "email", base_id: activeBaseId || null });
        router.push(`/campaigns/${campaign.id}`);
      }
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      showError('Create failed', error?.message || 'Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!showModal) return null;

  return (
    <div 
      style={{ 
        position:'fixed', 
        inset:0, 
        background:'rgba(0,0,0,.7)', 
        backdropFilter: 'blur(8px)',
        zIndex:2000, 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        padding:20
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowModal(false);
        }
      }}
    >
      <div style={{ 
        width:'min(500px, 96vw)', 
        background:'var(--elev-bg)', 
        border:'1px solid var(--elev-border)', 
        borderRadius:20, 
        padding:32,
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Create New Campaign</h3>
          <button 
            className="btn-ghost" 
            onClick={() => setShowModal(false)}
            style={{ padding: '8px', minWidth: 'auto' }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Campaign Name
            </label>
            <input
              className="input"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              placeholder="Enter campaign name"
              style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Channel
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['email', 'linkedin', 'whatsapp', 'call'] as const).map(ch => (
                <button
                  key={ch}
                  className={newCampaign.channel === ch ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setNewCampaign({ ...newCampaign, channel: ch })}
                  style={{ padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {(() => {
                    const ChannelIcon = ch === 'email' ? Icons.Mail :
                                      ch === 'linkedin' ? Icons.Linkedin :
                                      ch === 'whatsapp' ? Icons.MessageCircle :
                                      Icons.Phone;
                    return <ChannelIcon size={16} />;
                  })()}
                  <span style={{ textTransform: 'capitalize' }}>{ch}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Base
            </label>
            <select
              className="input"
              value={newCampaign.base_id || ''}
              onChange={(e) => setNewCampaign({ ...newCampaign, base_id: Number(e.target.value) || null })}
              style={{ width: '100%', fontSize: 14, padding: '12px 16px' }}
            >
              <option value="">Select a base</option>
              {bases.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button 
              className="btn-ghost" 
              onClick={() => {
                setShowModal(false);
                setNewCampaign({ name: "", channel: "email", base_id: activeBaseId || null });
              }}
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleCreate}
              disabled={creating || !newCampaign.name.trim() || !newCampaign.base_id}
              style={{ 
                padding: '10px 24px', 
                fontSize: 14,
                fontWeight: 600,
                opacity: (creating || !newCampaign.name.trim() || !newCampaign.base_id) ? 0.6 : 1,
                cursor: (creating || !newCampaign.name.trim() || !newCampaign.base_id) ? 'not-allowed' : 'pointer'
              }}
            >
              {creating ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

