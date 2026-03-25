"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { Icons } from "@/components/ui/Icons";
import { CampaignHeader } from "./components/CampaignHeader";
import { CampaignTabs } from "./components/CampaignTabs";
import { OverviewTab } from "./components/OverviewTab";
import { LeadsTab } from "./components/LeadsTab";
import { SequenceTab } from "./components/SequenceTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { InboxTab } from "./components/InboxTab";
import { CallTranscriptsTab } from "./components/CallTranscriptsTab";
import { EditCampaignModal } from "./components/EditCampaignModal";
import { LeadActivityModal } from "./components/LeadActivityModal";
import { useNotification } from "@/context/NotificationContext";

interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  base_id: number;
  leads?: number;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  converted?: number;
  openRate?: any;
  replyRate?: any;
  clickRate?: any;
  conversionRate?: any;
  created_at?: string;
  updated_at?: string;
  ai_insight?: string;
  tier_filter?: string;
  channels?: string[];
  whatsapp_sent?: number;
  whatsapp_delivered?: number;
  whatsapp_seen?: number;
  whatsapp_replied?: number;
  whatsapp_skipped?: number;
  whatsapp_no_whatsapp?: number;
  whatsapp_delivery_rate?: string;
  whatsapp_read_rate?: string;
  whatsapp_reply_rate?: string;
  linkedin_invitations_sent?: number;
  linkedin_invitations_failed?: number;
  linkedin_invitations_skipped?: number;
  linkedin_invitations_accepted?: number;
  call_attempts?: number;
  call_answered?: number;
  call_answer_rate?: string;
}

interface Lead {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  role?: string;
  score?: number;
  tier?: string;
  industry?: string;
  region?: string;
  linkedin_invitation_sent?: boolean;
  linkedin_invitation_accepted?: boolean;
  linkedin_invitation_sent_at?: string;
  linkedin_invitation_accepted_at?: string;
}

interface Template {
  id: number;
  content: string;
  channel: string;
  variables?: any;
}

interface SequenceStep {
  id: number;
  content: string;
  channel: string;
  delay_days?: number;
  variables?: any;
}

export default function CampaignDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useNotification();
  const { activeBaseId, bases } = useBase();
  const [tab, setTab] = useState<'overview'|'sequence'|'analytics'|'inbox'|'leads'|'transcripts'>('overview');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    status: 'draft' as 'draft' | 'running' | 'paused' | 'completed'
  });
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewingLeadActivity, setViewingLeadActivity] = useState<{ leadId: number; leadEmail?: string } | null>(null);

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/campaigns/${params.id}`);
        const campaignData = data?.campaign || data;
        setCampaign(campaignData);
        setEditData({
          name: campaignData.name || '',
          status: campaignData.status || 'draft'
        });
      } catch (error) {
        console.error('Failed to fetch campaign:', error);
        showError('Campaign unavailable', 'Failed to load campaign. Redirecting…');
        router.push('/campaigns');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [params.id, router]);

  // Poll for updates if campaign is running
  useEffect(() => {
    if (campaign?.status !== 'running') return;
    
    const interval = setInterval(async () => {
      try {
        const data = await apiRequest(`/campaigns/${params.id}`);
        const campaignData = data?.campaign || data;
        setCampaign(campaignData);
      } catch (error) {
        console.error('Failed to refresh campaign:', error);
      }
    }, 5000); // Refresh every 5 seconds for running campaigns
    
    return () => clearInterval(interval);
  }, [params.id, campaign?.status]);

  // Fetch leads for this campaign
  useEffect(() => {
    const fetchLeads = async () => {
      if (!campaign || !campaign.base_id) return;
      
      setLoadingLeads(true);
      try {
        // Use campaign-specific leads endpoint to get acceptance status
        const data = await apiRequest(`/campaigns/${campaign.id}/leads`);
        const leadsList = Array.isArray(data?.leads) ? data.leads : [];
        setLeads(leadsList);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [campaign]);

  // Fetch templates and sequence steps
  useEffect(() => {
    const fetchSequenceData = async () => {
      if (!campaign) return;
      
      try {
        // Fetch templates
        const templatesData = await apiRequest('/templates');
        setTemplates(templatesData?.templates || []);
        
        // Fetch sequence steps for this campaign
        const stepsData = await apiRequest(`/campaigns/${campaign.id}/templates`);
        setSequenceSteps(Array.isArray(stepsData?.templates) ? stepsData.templates : []);
      } catch (error) {
        console.error('Failed to fetch sequence data:', error);
        setTemplates([]);
        setSequenceSteps([]);
      }
    };
    
    if (tab === 'sequence') {
      fetchSequenceData();
    }
  }, [campaign, tab]);

  const refreshSequence = async () => {
    if (!campaign) return;
    try {
      const stepsData = await apiRequest(`/campaigns/${campaign.id}/templates`);
      setSequenceSteps(Array.isArray(stepsData?.templates) ? stepsData.templates : []);
    } catch (error) {
      console.error('Failed to refresh sequence:', error);
    }
  };

  // Update campaign status
  const updateCampaign = async () => {
    if (!campaign) return;
    
    setUpdating(true);
    try {
      const response = await apiRequest(`/campaigns/${campaign.id}`, {
        method: 'PUT',
        body: JSON.stringify(editData)
      });
      
      setCampaign(response?.campaign || { ...campaign, ...editData });
      setShowEditModal(false);
      showSuccess('Campaign updated', 'Your changes were saved.');
    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      showError('Update failed', error?.message || 'Failed to update campaign');
    } finally {
      setUpdating(false);
    }
  };

  // Toggle campaign status
  const toggleStatus = async () => {
    if (!campaign) return;
    
    setUpdating(true);
    try {
      if (campaign.status === 'draft') {
        // Launch draft campaign using the start endpoint
        const response = await apiRequest(`/campaigns/${campaign.id}/start`, {
          method: 'POST'
        });
        setCampaign(response?.campaign || { ...campaign, status: 'running' });
      } else if (campaign.status === 'running') {
        // Pause running campaign
        const response = await apiRequest(`/campaigns/${campaign.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'paused' })
        });
        setCampaign(response?.campaign || { ...campaign, status: 'paused' });
      } else if (campaign.status === 'paused') {
        // Resume paused campaign using the start endpoint
        const response = await apiRequest(`/campaigns/${campaign.id}/start`, {
          method: 'POST'
        });
        setCampaign(response?.campaign || { ...campaign, status: 'running' });
      }
    } catch (error: any) {
      console.error('Failed to update campaign status:', error);
      showError('Status update failed', error?.message || 'Failed to update campaign status');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    // If campaign is in draft, navigate to new campaign page to resume editing
    if (campaign?.status === 'draft') {
      router.push(`/campaigns/new?edit=${campaign.id}`);
    } else {
      // For non-draft campaigns, show the edit modal
      setShowEditModal(true);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }} aria-busy="true" aria-label="Loading campaign">
        <div
          className="card-enhanced"
          style={{
            borderRadius: 12,
            padding: 24,
            border: "0.5px solid rgba(255,255,255,0.1)",
            background: "#111113",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div className="ui-skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="ui-skeleton" style={{ height: 22, width: "40%", borderRadius: 6 }} />
              <div className="ui-skeleton" style={{ height: 14, width: "28%", borderRadius: 6 }} />
            </div>
            <div className="ui-skeleton" style={{ height: 36, width: 120, borderRadius: 8 }} />
          </div>
          <div className="ui-skeleton" style={{ height: 14, width: "100%", borderRadius: 6 }} />
        </div>
        <div
          className="card-enhanced"
          style={{
            borderRadius: 12,
            padding: 24,
            border: "0.5px solid rgba(255,255,255,0.1)",
            background: "#111113",
            minHeight: 280,
          }}
        >
          <div className="ui-skeleton" style={{ height: 40, width: "100%", borderRadius: 8, marginBottom: 16 }} />
          <div className="ui-skeleton" style={{ height: 180, width: "100%", borderRadius: 10 }} />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="card-enhanced" style={{ borderRadius: 16, padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          background: 'rgba(255, 107, 107, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icons.AlertCircle size={32} style={{ color: '#ff6b6b' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: 8 }}>Campaign not found</h3>
        <button 
          className="btn-primary" 
          onClick={() => router.push('/campaigns')} 
          style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Icons.ChevronLeft size={16} />
          Back to Campaigns
        </button>
      </div>
    );
  }

  const baseName = bases.find(b => b.id === campaign.base_id)?.name || 'Unknown Base';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <CampaignHeader 
        campaign={campaign}
        baseName={baseName}
        updating={updating}
        onToggleStatus={toggleStatus}
        onEdit={handleEdit}
      />

      {/* Tabs */}
      <div className="card-enhanced" style={{ borderRadius: 16, padding: 24 }}>
        <CampaignTabs tab={tab} setTab={setTab as any} />

        {/* Tab Content */}
        {tab === 'overview' && (
          <OverviewTab campaign={campaign} totalLeads={leads.length} />
        )}

        {tab === 'leads' && (
          <LeadsTab 
            campaign={campaign}
            leads={leads}
            loadingLeads={loadingLeads}
            onViewLeadActivity={(leadId, leadEmail) => setViewingLeadActivity({ leadId, leadEmail })}
          />
        )}

        {tab === 'sequence' && (
          <SequenceTab 
                      campaignId={campaign.id}
            templates={templates}
            sequenceSteps={sequenceSteps}
            onRefresh={refreshSequence}
          />
        )}

        {tab === 'analytics' && (
          <AnalyticsTab campaign={campaign} />
        )}

        {tab === 'inbox' && (
          <InboxTab />
        )}

        {tab === 'transcripts' && (
          <CallTranscriptsTab />
        )}
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <EditCampaignModal
          campaign={campaign}
          editData={editData}
          updating={updating}
          totalLeads={leads.length}
          onClose={() => setShowEditModal(false)}
          onUpdate={updateCampaign}
          onEditDataChange={setEditData}
        />
      )}

      {/* Lead Email Activity Modal */}
      {viewingLeadActivity && campaign && (
        <LeadActivityModal
                campaignId={campaign.id}
                leadId={viewingLeadActivity.leadId}
                leadEmail={viewingLeadActivity.leadEmail}
          onClose={() => setViewingLeadActivity(null)}
              />
      )}
    </div>
  );
}
