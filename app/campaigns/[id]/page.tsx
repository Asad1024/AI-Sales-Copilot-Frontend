"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { Icons } from "@/components/ui/Icons";
import { CampaignHeader } from "./components/CampaignHeader";
import { CampaignTabs, type CampaignViewTabId } from "./components/CampaignTabs";
import { OverviewTab } from "./components/OverviewTab";
import { LeadsTab } from "./components/LeadsTab";
import { SequenceTab } from "./components/SequenceTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { CallTranscriptsTab, type CallLog } from "./components/CallTranscriptsTab";
import { EditCampaignModal } from "./components/EditCampaignModal";
import { LeadActivityModal } from "./components/LeadActivityModal";
import { useNotification } from "@/context/NotificationContext";
import { UiSkeleton } from "@/components/ui/AppSkeleton";
import { campaignScheduleFieldToUtcIso } from "@/lib/campaignScheduleUtc";

interface Campaign {
  id: number;
  name: string;
  channel: 'email' | 'linkedin' | 'whatsapp' | 'call';
  status: 'running' | 'paused' | 'draft' | 'completed';
  base_id: number;
  leads?: number;
  sent?: number;
  email_sent?: number;
  email_processed?: number;
  esp_accept_rate?: string;
  event_counts?: Record<string, number>;
  whatsapp_template_preview?: string | null;
  whatsapp_last_message_preview?: string | null;
  aggregate_sent?: number;
  aggregate_replied?: number;
  aggregate_reply_rate?: string;
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
  /** Wizard / API payload (schedule, launch_now, etc.) */
  config?: Record<string, unknown>;
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
  linkedin_invitations_attempted?: number;
  linkedin_submit_success_rate?: string;
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

function campaignChannelList(c: Campaign): string[] {
  const raw = c.channels?.length ? c.channels : c.channel ? [c.channel] : [];
  return raw.map((x) => String(x).toLowerCase());
}

function campaignIncludesCallChannel(c: Campaign): boolean {
  return campaignChannelList(c).includes("call");
}

/** Sequence tab is for email / WhatsApp / LinkedIn message steps — not call-only. */
function campaignShowsSequenceTab(c: Campaign): boolean {
  const ch = campaignChannelList(c);
  if (ch.length === 0) return true;
  return ch.some((x) => ["email", "whatsapp", "linkedin"].includes(x));
}

export default function CampaignDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showError, showSuccess } = useNotification();
  const { activeBaseId, bases } = useBase();
  const [tab, setTab] = useState<CampaignViewTabId>("overview");
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
  const [callLogsPrefetch, setCallLogsPrefetch] = useState<{
    loading: boolean;
    logs: CallLog[] | null;
    error: string | null;
  }>({ loading: false, logs: null, error: null });

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

  /** Prefetch call logs on campaign open (call-channel only). Backend auto-syncs ElevenLabs + media on this route, then we refresh campaign for Overview metrics. */
  useEffect(() => {
    if (!campaign) return;
    if (!campaignIncludesCallChannel(campaign)) {
      setCallLogsPrefetch({ loading: false, logs: null, error: null });
      return;
    }
    let cancelled = false;
    setCallLogsPrefetch({ loading: true, logs: null, error: null });
    void (async () => {
      try {
        const data = await apiRequest(`/campaigns/${campaign.id}/call-logs`);
        if (cancelled) return;
        const logs: CallLog[] = Array.isArray(data?.callLogs) ? data.callLogs : [];
        setCallLogsPrefetch({ loading: false, logs, error: null });
        try {
          const fresh = await apiRequest(`/campaigns/${params.id}`);
          if (cancelled) return;
          const campaignData = fresh?.campaign || fresh;
          setCampaign(campaignData);
        } catch {
          // Non-fatal: overview still shows prior snapshot
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load call logs";
        if (!cancelled) setCallLogsPrefetch({ loading: false, logs: null, error: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaign?.id, params.id]);

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

  const showTranscriptsTab = useMemo(
    () => (campaign ? campaignIncludesCallChannel(campaign) : false),
    [campaign]
  );
  const showSequenceTab = useMemo(
    () => (campaign ? campaignShowsSequenceTab(campaign) : false),
    [campaign]
  );

  useEffect(() => {
    if (!campaign) return;
    if (tab === "transcripts" && !showTranscriptsTab) setTab("overview");
    if (tab === "sequence" && !showSequenceTab) setTab("overview");
  }, [campaign, tab, showTranscriptsTab, showSequenceTab]);

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
        // Launch draft: backend needs launch_now and/or schedule.start (wizard saves schedule in config)
        const sch = ((campaign.config as Record<string, unknown>)?.schedule || {}) as {
          start?: string | null;
          end?: string | null;
          launch_now?: boolean;
          timezone?: string | null;
        };
        // Any non-empty start means "schedule for later". Do not let stale `launch_now: true` from wizard JSON override.
        const startStr = String(sch.start ?? '').trim();
        const launch_now = startStr.length > 0 ? false : true;
        const response = await apiRequest(`/campaigns/${campaign.id}/start`, {
          method: 'POST',
          body: JSON.stringify({
            launch_now,
            schedule: {
              start: campaignScheduleFieldToUtcIso(sch.start ?? undefined),
              end: campaignScheduleFieldToUtcIso(sch.end ?? undefined),
              launch_now,
              ...(typeof sch.timezone === "string" && sch.timezone.trim()
                ? { timezone: sch.timezone.trim() }
                : {}),
            },
          }),
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
        const sch = ((campaign.config as Record<string, unknown>)?.schedule || {}) as {
          start?: string | null;
          end?: string | null;
          launch_now?: boolean;
          timezone?: string | null;
        };
        const startStrPaused = String(sch.start ?? '').trim();
        const launch_now = startStrPaused.length > 0 ? false : true;
        const response = await apiRequest(`/campaigns/${campaign.id}/start`, {
          method: 'POST',
          body: JSON.stringify({
            launch_now,
            schedule: {
              start: campaignScheduleFieldToUtcIso(sch.start ?? undefined),
              end: campaignScheduleFieldToUtcIso(sch.end ?? undefined),
              launch_now,
              ...(typeof sch.timezone === "string" && sch.timezone.trim()
                ? { timezone: sch.timezone.trim() }
                : {}),
            },
          }),
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

  const pageShellStyle: CSSProperties = {
    minHeight: "calc(100vh - 56px)",
    width: "100%",
    background: "var(--color-canvas)",
    display: "flex",
    flexDirection: "column",
    padding: "8px clamp(10px, 1.25vw, 20px) 14px",
    gap: 12,
    boxSizing: "border-box",
  };

  const surfaceCardStyle: CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    boxShadow: "0 4px 24px var(--color-shadow)",
  };

  if (loading) {
    return (
      <div style={pageShellStyle} aria-busy="true" aria-label="Loading campaign">
        <div style={{ ...surfaceCardStyle, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <UiSkeleton height={22} width="40%" />
          <UiSkeleton height={14} width="28%" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <UiSkeleton height={36} width={120} radius={10} />
            <UiSkeleton height={36} width={120} radius={10} />
            <UiSkeleton height={36} width={120} radius={10} />
          </div>
          <UiSkeleton height={220} width="100%" radius={12} style={{ marginTop: 8 }} />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={pageShellStyle}>
        <div style={{ ...surfaceCardStyle, padding: "48px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ 
          width: 64, 
          height: 64, 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icons.AlertCircle size={32} strokeWidth={1.5} style={{ color: '#ef4444' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: 8, color: "var(--color-text)" }}>Campaign not found</h3>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0, maxWidth: 360 }}>This campaign may have been deleted or you don&apos;t have access.</p>
        <button 
          type="button"
          className="btn-primary" 
          onClick={() => router.push('/campaigns')} 
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: "10px 18px" }}
        >
          <Icons.ChevronLeft size={16} />
          Back to Campaigns
        </button>
        </div>
      </div>
    );
  }

  const baseName = bases.find(b => b.id === campaign.base_id)?.name || 'Unknown Base';

  return (
    <div style={pageShellStyle}>
      <CampaignHeader 
        campaign={campaign}
        baseName={baseName}
        updating={updating}
        onToggleStatus={toggleStatus}
        onEdit={handleEdit}
      />

      <div style={{ ...surfaceCardStyle, padding: 20, overflow: "visible" }}>
        <CampaignTabs
          tab={tab}
          setTab={setTab}
          showTranscripts={showTranscriptsTab}
          showSequence={showSequenceTab}
        />

        {/* Tab Content */}
        {tab === 'overview' && (
          <OverviewTab campaign={campaign} totalLeads={leads.length} loadingLeads={loadingLeads} />
        )}

        {tab === 'leads' && (
          <LeadsTab 
            campaign={campaign}
            leads={leads}
            loadingLeads={loadingLeads}
            onViewLeadActivity={(leadId, leadEmail) => setViewingLeadActivity({ leadId, leadEmail })}
          />
        )}

        {tab === "sequence" && showSequenceTab && (
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

        {tab === "transcripts" && showTranscriptsTab && (
          <CallTranscriptsTab
            key={campaign.id}
            prefetchEnabled={campaignIncludesCallChannel(campaign)}
            prefetchedLogs={callLogsPrefetch.logs}
            prefetchedLoading={callLogsPrefetch.loading}
            prefetchedError={callLogsPrefetch.error}
          />
        )}
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <EditCampaignModal
          campaign={campaign}
          editData={editData}
          updating={updating}
          totalLeads={leads.length}
          loadingLeads={loadingLeads}
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
