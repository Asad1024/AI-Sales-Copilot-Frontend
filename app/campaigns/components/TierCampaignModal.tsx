"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";

interface TierCampaignModalProps {
  tier: 'Hot' | 'Warm' | 'Cold';
  onClose: () => void;
}

export function TierCampaignModal({ tier, onClose }: TierCampaignModalProps) {
  const router = useRouter();
  const { showWarning, showError } = useNotification();
  const { activeBaseId } = useBaseStore();
  const { fetchCampaigns } = useCampaignStore();
  const [selectedChannels, setSelectedChannels] = useState<('email' | 'linkedin' | 'whatsapp' | 'call')[]>([]);
  const [campaignStep, setCampaignStep] = useState<'tier' | 'channel' | 'review'>('channel');
  const [creating, setCreating] = useState(false);
  
  const handleCreate = async () => {
    if (!activeBaseId || selectedChannels.length === 0) {
      showWarning('Channels', 'Please select at least one channel.');
      return;
    }

    setCreating(true);
    try {
      // Fetch leads for the tier first
      const leadsData = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
      const leads = Array.isArray(leadsData?.leads) ? leadsData.leads : [];
      const tierLeads = leads.filter((l: any) => {
        if (tier === 'Hot') return l.tier === 'Hot';
        if (tier === 'Warm') return l.tier === 'Warm';
        return l.tier === 'Cold' || !l.tier;
      });

      if (tierLeads.length === 0) {
        showWarning('No leads', `No ${tier.toLowerCase()} leads available for this workspace.`);
        return;
      }

      const channelNames = selectedChannels.map(ch => ch.charAt(0).toUpperCase() + ch.slice(1)).join(' + ');
      const campaignName = selectedChannels.length === 1 
        ? `${tier} Leads - ${channelNames} Campaign`
        : `${tier} Leads - Multi-Channel Campaign`;
      
      const response = await apiRequest('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName,
          channel: selectedChannels[0],
          base_id: activeBaseId,
          status: 'draft',
          tier_filter: tier,
          leads: tierLeads.length,
          channels: selectedChannels
        })
      });
      
      await fetchCampaigns(activeBaseId);
      
      onClose();
      setSelectedChannels([]);
      setCampaignStep('channel');
      
      if (response?.id) {
        router.push(`/campaigns/${response.id}?tier=${tier}`);
      }
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      showError('Create failed', error?.message || 'Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
    }
  };

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
          onClose();
        }
      }}
    >
      <div style={{ 
        width:'min(700px, 96vw)', 
        background:'var(--elev-bg)', 
        border:'1px solid var(--elev-border)', 
        borderRadius:20, 
        padding:32,
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Create Campaign for {tier} Leads
          </h3>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ padding: '8px', minWidth: 'auto' }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
              Select Channels
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(['email', 'linkedin', 'whatsapp', 'call'] as const).map(ch => {
                const IconComponent = ch === 'email' ? Icons.Mail :
                                    ch === 'linkedin' ? Icons.Linkedin :
                                    ch === 'whatsapp' ? Icons.MessageCircle :
                                    Icons.Phone;
                const isSelected = selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedChannels(selectedChannels.filter(c => c !== ch));
                      } else {
                        setSelectedChannels([...selectedChannels, ch]);
                      }
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #7C3AED' : '1px solid var(--elev-border)',
                      background: isSelected ? 'rgba(124, 58, 237, 0.1)' : 'var(--elev-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <IconComponent size={24} style={{ color: isSelected ? '#7C3AED' : 'var(--color-text)' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{ch}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button 
              className="btn-ghost" 
              onClick={onClose}
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleCreate}
              disabled={creating || selectedChannels.length === 0}
              style={{ 
                padding: '10px 24px', 
                fontSize: 14,
                fontWeight: 600,
                opacity: (creating || selectedChannels.length === 0) ? 0.6 : 1,
                cursor: (creating || selectedChannels.length === 0) ? 'not-allowed' : 'pointer'
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

