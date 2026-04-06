"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, getToken } from "@/lib/apiClient";
import { API_BASE } from "@/lib/api";
import { useBase } from "@/context/BaseContext";
import { getEmailInfo, getEmailDisplayText } from "@/utils/emailNormalization";
import { getPhoneInfo } from "@/utils/phoneNormalization";
import { Icons } from "@/components/ui/Icons";
import { ChannelType, CHANNEL_CONFIGS, getAvailableChannels } from "./channelConfig";
import { calculateStepFlow, getStepInfo, getTotalSteps } from "./stepFlowCalculator";
import { canProceedToNextStep, ValidationContext } from "./stepValidation";
import { useNotification } from "@/context/NotificationContext";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface Lead {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  score?: number;
  tier?: string;
  company?: string;
  role?: string;
  industry?: string;
  enrichment?: any;
}

/**
 * Sanitizes lead data for API requests by removing null/undefined/empty values
 * This improves performance by reducing payload size and ensures data consistency
 * @param lead - The lead object to sanitize
 * @returns A sanitized object with only valid, non-empty values
 */
function sanitizeLeadForAPI(lead: Lead): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  // Only include fields that have truthy values (not null, undefined, or empty string)
  // This reduces payload size and prevents validation errors
  if (lead.first_name) sanitized.first_name = lead.first_name;
  if (lead.last_name) sanitized.last_name = lead.last_name;
  if (lead.company) sanitized.company = lead.company;
  if (lead.role) sanitized.role = lead.role;
  if (lead.industry) sanitized.industry = lead.industry;
  // Include score even if 0 (falsy but valid)
  if (lead.score !== null && lead.score !== undefined) sanitized.score = lead.score;
  if (lead.tier) sanitized.tier = lead.tier;
  
  return sanitized;
}

export default function CampaignNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showWarning } = useNotification();

  // Safely get activeBaseId, with fallback for when BaseProvider isn't ready
  let activeBaseId;
  try {
    activeBaseId = useBase().activeBaseId;
  } catch (error) {
    // BaseProvider not ready yet, use undefined
    activeBaseId = undefined;
  }

  useEffect(() => {
    if (activeBaseId === null) {
      router.replace("/bases");
    }
  }, [activeBaseId, router]);

  // Don't render until we have base context
  if (activeBaseId === undefined) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: 'var(--color-text-muted)'
      }}>
        Loading...
      </div>
    );
  }
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [segments, setSegments] = useState<string[]>([]);
  const [messages, setMessages] = useState<string[]>([
    "Hi {{first_name}}, quick idea for {{company_name}}...",
    "{{first_name}}, noticed {{company_name}} is hiring...",
    "Question about your {{tool}} stack"
  ]);
  
  // Helper function to parse message into subject and body
  const parseMessage = (message: string): { subject: string; body: string } => {
    if (!message || typeof message !== 'string') {
      return { subject: '', body: '' };
    }
    
    // Check if this message contains multiple emails (multiple "Subject:" lines)
    const subjectMatches = message.match(/Subject:/g);
    if (subjectMatches && subjectMatches.length > 1) {
      // Multiple subjects found - this shouldn't happen, but log it
      console.warn('[parseMessage] Multiple subjects found in single message:', subjectMatches.length);
      // Take only the first email
      const firstEmailEnd = message.indexOf('Subject:', message.indexOf('Subject:') + 1);
      if (firstEmailEnd > 0) {
        message = message.substring(0, firstEmailEnd);
      }
    }
    
    if (message.startsWith('Subject:')) {
      // Split by double newline to separate subject from body
      const parts = message.split('\n\n');
      if (parts.length >= 2) {
        const subjectLine = parts[0];
        const subject = subjectLine.replace('Subject:', '').trim();
        const body = parts.slice(1).join('\n\n').trim();
        return { subject, body };
      } else {
        // Only subject line, no body
        const subject = message.replace('Subject:', '').trim();
        return { subject, body: '' };
      }
    }
    return { subject: '', body: message };
  };
  
  // Helper function to format message back
  const formatMessage = (subject: string, body: string): string => {
    if (subject) {
      return `Subject: ${subject}\n\n${body}`;
    }
    return body;
  };
  const [schedule, setSchedule] = useState<{
    start: string;
    end: string;
    launch_now?: boolean;
    email?: { throttle: number };
    linkedin?: { throttle: number };
    whatsapp?: { throttle: number };
    call?: { throttle: number };
    followups: number;
    followupDelay?: number;
  }>({ 
    start: "", 
    end: "",
    launch_now: true,
    email: { throttle: 200 },
    linkedin: { throttle: 100 },
    whatsapp: { throttle: 50 },
    call: { throttle: 20 },
    followups: 2,
    followupDelay: 3
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  
  // Throttle recommendation state
  const [recommendedEmailThrottle, setRecommendedEmailThrottle] = useState<number | null>(null);
  const [recommendedLinkedInThrottle, setRecommendedLinkedInThrottle] = useState<number | null>(null);
  const [linkedInAccountType, setLinkedInAccountType] = useState<string | null>(null);
  const [linkedInMaxThrottle, setLinkedInMaxThrottle] = useState<number>(100);
  const [linkedInMonthlyLimit, setLinkedInMonthlyLimit] = useState<number | null>(null); // For free accounts
  
  // Email campaign details (only used when email channel is selected)
  const [productService, setProductService] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [callToAction, setCallToAction] = useState("Schedule a demo");
  const [senderName, setSenderName] = useState("");
  const [senderCompany, setSenderCompany] = useState("");
  
  // Lead data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [viewingSegment, setViewingSegment] = useState<string | null>(null);
  const [viewingLeads, setViewingLeads] = useState<Lead[]>([]);
  
  // Message generation state
  const [generatingMessages, setGeneratingMessages] = useState(false);
  const [messagesGenerated, setMessagesGenerated] = useState(false);
  const [selectedMessageIndices, setSelectedMessageIndices] = useState<number[]>([0]); // Default to first email
  
  // WhatsApp message generation state
  const [whatsAppMessages, setWhatsAppMessages] = useState<string[]>([
    "Hi {{first_name}}, I noticed {{company_name}}...",
    "{{first_name}}, quick question about {{company_name}}...",
    "Hello {{first_name}}, I'd love to connect..."
  ]);
  const [generatingWhatsAppMessages, setGeneratingWhatsAppMessages] = useState(false);
  const [whatsAppMessagesGenerated, setWhatsAppMessagesGenerated] = useState(false);
  const [selectedWhatsAppMessageIndices, setSelectedWhatsAppMessageIndices] = useState<number[]>([0]); // Default to first WhatsApp message
  
  // Email follow-up preferences state
  const [followupsPreferenceSet, setFollowupsPreferenceSet] = useState(false);
  const [showFollowupsNumberInput, setShowFollowupsNumberInput] = useState(false);
  
  // Email provider integration state
  const [emailIntegration, setEmailIntegration] = useState<any>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  
  // Call knowledge base state
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<Array<{ id: string; name: string; uploadedAt: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Call agent configuration state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [systemPersona, setSystemPersona] = useState("");
  
  // Test call state
  const [testCallPhoneNumber, setTestCallPhoneNumber] = useState("");
  const [testCallFirstName, setTestCallFirstName] = useState("");
  const [testingCall, setTestingCall] = useState(false);
  const [testCallSuccess, setTestCallSuccess] = useState(false);
  const [testCallError, setTestCallError] = useState<string | null>(null);
  
  // LinkedIn step configuration
  const [linkedInStepConfig, setLinkedInStepConfig] = useState<{
    action: "invitation_only" | "invitation_with_message";
    message?: string;
    templates?: string[];
  } | null>(null);
  const [showLinkedInConfigModal, setShowLinkedInConfigModal] = useState(false);
  
  // Helper function to extract LinkedIn URL from lead enrichment
  const getLinkedInUrl = (lead: Lead): string | null => {
    const enrichment = (lead as any).enrichment;
    if (!enrichment) return null;
    
    return enrichment.apollo_data?.linkedin_url || 
           enrichment.person_data?.linkedin_url ||
           enrichment.linkedin_url ||
           null;
  };

  // Helper function to check if lead has LinkedIn URL
  const hasLinkedInUrl = (lead: Lead): boolean => {
    return !!getLinkedInUrl(lead);
  };


  // Draft campaign state
  const [draftCampaignId, setDraftCampaignId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [previousStep, setPreviousStep] = useState<Step | null>(null);
  const [isLaunching, setIsLaunching] = useState(false); // Flag to prevent auto-save during launch

  // Calculate step flow dynamically based on selected channels
  const stepFlow = useMemo(() => {
    return calculateStepFlow(channels as ChannelType[], {
      linkedin_step: linkedInStepConfig,
    });
  }, [channels, linkedInStepConfig]);

  // Get total steps from calculated flow
  const totalSteps = stepFlow.length;

  // Get current step info
  const currentStepInfo = useMemo(() => {
    return getStepInfo(step, channels as ChannelType[], {
      linkedin_step: linkedInStepConfig,
    });
  }, [step, channels, linkedInStepConfig]);

  // Fetch leads for segment calculation
  useEffect(() => {
    const fetchLeads = async () => {
      // Step 3 is always segments now
      const segmentStep = 3;
      if (!activeBaseId || step !== segmentStep) return;
      setLoadingLeads(true);
      try {
        // Fetch with high limit to get all leads
        // For new campaign, fetch first page with larger limit for lead selection
        const data = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
        const leadsList = Array.isArray(data?.leads) ? data.leads : (Array.isArray(data) ? data : []);
        setLeads(leadsList);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchLeads();
  }, [activeBaseId, step, channels]);

  // Fetch email integration when email channel is selected
  useEffect(() => {
    const fetchIntegration = async () => {
      if (!activeBaseId || !channels.includes('email')) {
        setEmailIntegration(null);
        return;
      }
      setLoadingIntegration(true);
      try {
        const data = await apiRequest(`/integrations/${activeBaseId}`);
        const integrations = data?.integrations || [];
        const emailProviderIntegration = integrations.find(
          (i: any) => i.provider === 'sendgrid' || i.provider === 'smtp'
        );
        if (emailProviderIntegration) {
          setEmailIntegration(emailProviderIntegration);
          return;
        }

        // If no DB integration exists, check backend SMTP env fallback.
        const providerStatus = await apiRequest('/config/email-provider-status');
        if (providerStatus?.smtp_env_configured) {
          setEmailIntegration({
            provider: 'smtp',
            config: {
              from_email: providerStatus?.smtp_from_email || undefined
            },
            source: 'env'
          });
          return;
        }

        setEmailIntegration(null);
      } catch (error) {
        console.error('Failed to fetch email integration:', error);
        setEmailIntegration(null);
      } finally {
        setLoadingIntegration(false);
      }
    };
    fetchIntegration();
  }, [activeBaseId, channels]);

  // Fetch available voices when voice selection step is active
  useEffect(() => {
    const fetchVoices = async () => {
      if (currentStepInfo?.stepType !== 'call_voice_selection' || availableVoices.length > 0) {
        return;
      }
      setLoadingVoices(true);
      try {
        const data = await apiRequest('/campaigns/voices');
        if (data?.voices && Array.isArray(data.voices)) {
          setAvailableVoices(data.voices);
        } else if (data?.error) {
          console.error('ElevenLabs API error:', data.error);
          // Provide fallback voices for development/testing
          setAvailableVoices([
            { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm and professional female voice' },
            { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Drew', description: 'Friendly male voice' },
            { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Clyde', description: 'Deep and resonant male voice' },
            { id: 'ErXwobaYiN019PkySvjV', name: 'Paul', description: 'Warm and approachable male voice' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch voices:', error);
        // Provide fallback voices even on network error
        setAvailableVoices([
          { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Fallback)', description: 'Calm and professional female voice' },
          { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Drew (Fallback)', description: 'Friendly male voice' }
        ]);
      } finally {
        setLoadingVoices(false);
      }
    };
    fetchVoices();
  }, [currentStepInfo?.stepType]);

  // Load draft campaign when editing
  useEffect(() => {
    const loadDraftCampaign = async () => {
      const editCampaignId = searchParams?.get('edit');
      if (!editCampaignId || draftLoaded) return; // Already loaded or no edit param
      
      try {
        const data = await apiRequest(`/campaigns/${editCampaignId}`);
        const campaignData = data?.campaign || data;
        
        // Only load if it's a draft campaign
        if (campaignData.status !== 'draft') {
          console.warn('Campaign is not in draft status, cannot edit');
          return;
        }
        
        // Set draft campaign ID
        setDraftCampaignId(campaignData.id);
        
        // Restore basic fields
        if (campaignData.name) setName(campaignData.name);
        if (campaignData.channels && Array.isArray(campaignData.channels)) {
          setChannels(campaignData.channels);
        } else if (campaignData.channel) {
          setChannels([campaignData.channel]);
        }
        
        // Restore config
        const config = campaignData.config || {};
        
        // Restore segments
        if (config.segments && Array.isArray(config.segments)) {
          setSegments(config.segments);
        }
        
        // Restore schedule (handle both old and new format)
        if (config.schedule) {
          const oldSchedule = config.schedule;
          setSchedule({
            start: oldSchedule.start || '',
            end: oldSchedule.end || '',
            email: oldSchedule.email || (channels.includes('email') ? { throttle: oldSchedule.throttle || 200 } : undefined),
            linkedin: oldSchedule.linkedin || (channels.includes('linkedin') ? { throttle: oldSchedule.throttle || 100 } : undefined),
            whatsapp: oldSchedule.whatsapp || (channels.includes('whatsapp') ? { throttle: oldSchedule.throttle || 50 } : undefined),
            call: oldSchedule.call || (channels.includes('call') ? { throttle: oldSchedule.throttle || 20 } : undefined),
            followups: oldSchedule.followups || 2,
            followupDelay: oldSchedule.followupDelay || 3
          });
          if (oldSchedule.followups !== undefined) {
            setFollowupsPreferenceSet(true);
            setShowFollowupsNumberInput(oldSchedule.followups > 0);
          }
        }
        
        // Restore follow-up preferences
        if (config.followupsPreferenceSet !== undefined) {
          setFollowupsPreferenceSet(config.followupsPreferenceSet);
        }
        if (config.showFollowupsNumberInput !== undefined) {
          setShowFollowupsNumberInput(config.showFollowupsNumberInput);
        }
        
        // Restore email campaign details
        if (config.email) {
          if (config.email.productService) setProductService(config.email.productService);
          if (config.email.valueProposition) setValueProposition(config.email.valueProposition);
          if (config.email.callToAction) setCallToAction(config.email.callToAction);
          if (config.email.senderName) setSenderName(config.email.senderName);
          if (config.email.senderCompany) setSenderCompany(config.email.senderCompany);
        }
        
        // Restore LinkedIn campaign details (if not already set from email)
        if (config.linkedin && !config.email) {
          if (config.linkedin.productService) setProductService(config.linkedin.productService);
          if (config.linkedin.valueProposition) setValueProposition(config.linkedin.valueProposition);
          if (config.linkedin.callToAction) setCallToAction(config.linkedin.callToAction);
          if (config.linkedin.senderName) setSenderName(config.linkedin.senderName);
          if (config.linkedin.senderCompany) setSenderCompany(config.linkedin.senderCompany);
        }
        
        // Restore LinkedIn step config
        if (config.linkedin_step) {
          setLinkedInStepConfig(config.linkedin_step);
        }
        
        // Restore email messages and selections
        if (config.emailMessages && Array.isArray(config.emailMessages)) {
          setMessages(config.emailMessages);
        }
        if (config.selectedEmailMessageIndices && Array.isArray(config.selectedEmailMessageIndices)) {
          setSelectedMessageIndices(config.selectedEmailMessageIndices);
        }
        if (config.messagesGenerated !== undefined) {
          setMessagesGenerated(config.messagesGenerated);
        }
        
        // Restore WhatsApp messages and selections
        if (config.whatsAppMessages && Array.isArray(config.whatsAppMessages)) {
          setWhatsAppMessages(config.whatsAppMessages);
        }
        if (config.selectedWhatsAppMessageIndices && Array.isArray(config.selectedWhatsAppMessageIndices)) {
          setSelectedWhatsAppMessageIndices(config.selectedWhatsAppMessageIndices);
        }
        if (config.whatsAppMessagesGenerated !== undefined) {
          setWhatsAppMessagesGenerated(config.whatsAppMessagesGenerated);
        }
        
        // Load knowledge base files if call channel is selected
        if (campaignData.channels?.includes('call') || campaignData.channel === 'call') {
          try {
            const kbData = await apiRequest(`/campaigns/${editCampaignId}/knowledge-base`);
            if (kbData?.files && Array.isArray(kbData.files)) {
              setKnowledgeBaseFiles(kbData.files.map((f: any) => ({
                id: f.id.toString(),
                name: f.name,
                uploadedAt: f.uploadedAt
              })));
            }
          } catch (error) {
            console.error('Failed to load knowledge base files:', error);
            // Don't fail the whole load if KB files fail
          }
          
          // Restore call agent configuration (check both top-level and config)
          if (campaignData.selectedVoiceId || config.selectedVoiceId) {
            setSelectedVoiceId(campaignData.selectedVoiceId || config.selectedVoiceId);
          }
          if (campaignData.firstPrompt || config.firstPrompt) {
            setInitialPrompt(campaignData.firstPrompt || config.firstPrompt);
          }
          if (campaignData.systemPersona || config.systemPersona) {
            setSystemPersona(campaignData.systemPersona || config.systemPersona);
          }
        }
        
        // Restore call agent config even if not in call channel (for when switching channels)
        if (config.selectedVoiceId) setSelectedVoiceId(config.selectedVoiceId);
        if (config.firstPrompt) setInitialPrompt(config.firstPrompt);
        if (config.systemPersona) setSystemPersona(config.systemPersona);
        
        // Calculate step flow for current channels to get total steps
        const restoredChannels = campaignData.channels && Array.isArray(campaignData.channels) 
          ? campaignData.channels 
          : (campaignData.channel ? [campaignData.channel] : ['email']);
        const restoredStepFlow = calculateStepFlow(restoredChannels as ChannelType[], {
          linkedin_step: config.linkedin_step,
        });
        const restoredTotalSteps = restoredStepFlow.length;
        
        // Restore the step from saved config, or calculate fallback step
        let targetStep: Step = 1;
        
        // Use saved step if available
        if (config.currentStep && typeof config.currentStep === 'number') {
          targetStep = Math.max(1, Math.min(config.currentStep, restoredTotalSteps)) as Step;
        } else {
          // Fallback: Determine step based on what's configured (for backward compatibility)
          const hasEmail = campaignData.channels?.includes('email') || campaignData.channel === 'email';
          const hasLinkedIn = campaignData.channels?.includes('linkedin') || campaignData.channel === 'linkedin';
          
          if (campaignData.name && (campaignData.channels?.length > 0 || campaignData.channel)) {
            const campaignDetails = config.email || config.linkedin;
            if (campaignDetails?.productService && campaignDetails?.valueProposition && campaignDetails?.callToAction) {
              targetStep = 3; // Segments step
              if (config.segments && config.segments.length > 0) {
                if (hasEmail) {
                  targetStep = 4; // Email templates step
                  if (config.schedule?.start) {
                    targetStep = 5; // Schedule step
                  }
                } else if (hasLinkedIn) {
                  if (config.linkedin_step) {
                    targetStep = 5; // LinkedIn templates or schedule step
                  } else {
                    targetStep = 4; // Message type selection step
                  }
                }
              }
            } else {
              targetStep = 2; // Core Details Part 1 step
            }
          }
        }
        
        setStep(targetStep);
        setPreviousStep(targetStep); // Set previous step to avoid triggering save on load
        setDraftLoaded(true);
      } catch (error) {
        console.error('Failed to load draft campaign:', error);
        showWarning('Draft', 'Failed to load draft campaign. Starting fresh…');
        setDraftLoaded(true); // Mark as loaded even on error to prevent retries
      }
    };
    
    loadDraftCampaign();
  }, [searchParams, draftLoaded]);

  // Auto-save draft as user progresses through steps
  useEffect(() => {
    const saveDraft = async () => {
      // Only save draft if we have minimum required data (name and base)
      // Don't save during launch to prevent race conditions
      if (!name.trim() || !activeBaseId || savingDraft || isLaunching) return;
      
      // Don't save on step 1 (too early)
      if (step === 1) return;

      setSavingDraft(true);
      try {
        // Determine tier_filter from segments
        let tierFilter: string | undefined = undefined;
        if (segments.includes('Hot leads')) {
          tierFilter = 'Hot';
        } else if (segments.includes('Warm leads')) {
          tierFilter = 'Warm';
        } else if (segments.some(s => s.includes('Cold'))) {
          tierFilter = 'Cold';
        }
        
        // Calculate total leads count
        // Helper function to get segment leads count
        const getSegmentLeads = (segmentName: string): number => {
          let segmentLeads: Lead[] = [];
          
          switch (segmentName) {
            case 'Hot leads':
              segmentLeads = leads.filter(l => l.tier === 'Hot');
              break;
            case 'Warm leads':
              segmentLeads = leads.filter(l => l.tier === 'Warm');
              break;
            case 'Engaged not converted':
              segmentLeads = leads.filter(l => (l.tier === 'Hot' || l.tier === 'Warm') && (l.score || 0) >= 75);
              break;
            case 'Never opened':
              segmentLeads = leads.filter(l => (l.score || 0) < 65);
              break;
            case 'High-score low-engagement':
              segmentLeads = leads.filter(l => (l.score || 0) >= 90 && l.tier !== 'Hot');
              break;
            default:
              segmentLeads = [];
          }
          
          // Filter by channel requirements
          if (channels.includes('email')) {
            const hasValidEmail = (lead: Lead): boolean => {
              if (!lead.email) return false;
              const emailInfo = getEmailInfo(lead.email, (lead as any).enrichment);
              return emailInfo.isValid && !emailInfo.isMasked;
            };
            segmentLeads = segmentLeads.filter(hasValidEmail);
          }
          
          // Filter by LinkedIn URL if LinkedIn channel is selected
          if (channels.includes('linkedin')) {
            segmentLeads = segmentLeads.filter(hasLinkedInUrl);
          }
          
          return segmentLeads.length;
        };
        
        const totalLeads = segments.reduce((total, seg) => {
          return total + getSegmentLeads(seg);
        }, 0);
        
        // Build config object with all form state
        const config: any = {
          // Save current step for resume
          currentStep: step,
          
          schedule: {
            start: schedule.start || null,
            end: schedule.end || null,
            ...(channels.includes('email') && schedule.email ? { email: schedule.email } : {}),
            ...(channels.includes('linkedin') && schedule.linkedin ? { linkedin: schedule.linkedin } : {}),
            ...(channels.includes('whatsapp') && schedule.whatsapp ? { whatsapp: schedule.whatsapp } : {}),
            ...(channels.includes('call') && schedule.call ? { call: schedule.call } : {}),
            followups: schedule.followups || 0,
            followupDelay: schedule.followupDelay || 3
          },
          segments: segments,
          
          // Save email messages and selections
          emailMessages: messages,
          selectedEmailMessageIndices: selectedMessageIndices,
          messagesGenerated: messagesGenerated,
          
          // Save WhatsApp messages and selections
          whatsAppMessages: whatsAppMessages,
          selectedWhatsAppMessageIndices: selectedWhatsAppMessageIndices,
          whatsAppMessagesGenerated: whatsAppMessagesGenerated,
          
          // Save follow-up preferences
          followupsPreferenceSet: followupsPreferenceSet,
          showFollowupsNumberInput: showFollowupsNumberInput
        };
        
        // Add email campaign details if email channel
        if (channels.includes('email')) {
          config.email = {
            productService: productService || '',
            valueProposition: valueProposition || '',
            callToAction: callToAction || '',
            senderName: senderName || '',
            senderCompany: senderCompany || ''
          };
        }
        
        // Add LinkedIn campaign details if LinkedIn channel
        if (channels.includes('linkedin')) {
          config.linkedin = {
            productService: productService || '',
            valueProposition: valueProposition || '',
            callToAction: callToAction || '',
            senderName: senderName || '',
            senderCompany: senderCompany || ''
          };
          
          // Add LinkedIn step config if configured
          if (linkedInStepConfig) {
            config.linkedin_step = linkedInStepConfig;
          }
        }

        // Add segments to config if selected
        if (segments && segments.length > 0) {
          config.segments = segments;
        }

        // Add call campaign details if call channel
        if (channels.includes('call')) {
          config.call = {
            knowledgeBaseFiles: knowledgeBaseFiles.map(f => ({ id: f.id, name: f.name }))
          };
        }

        const campaignPayload: any = {
          name: name || 'Untitled Campaign',
          channel: channels[0] || 'email',
          status: 'draft',
          tier_filter: tierFilter,
          leads: totalLeads,
          channels: channels,
          config: config
        };

        // Add call agent configuration fields
        if (channels.includes('call')) {
          if (selectedVoiceId) campaignPayload.selectedVoiceId = selectedVoiceId;
          if (initialPrompt) campaignPayload.firstPrompt = initialPrompt;
          if (systemPersona) campaignPayload.systemPersona = systemPersona;
        }

        if (draftCampaignId) {
          // Update existing draft
          console.log('Updating campaign with payload:', campaignPayload);
          await apiRequest(`/campaigns/${draftCampaignId}`, {
            method: 'PUT',
            body: JSON.stringify(campaignPayload)
          });
        } else {
          // Create new draft
          campaignPayload.base_id = activeBaseId;
          const campaignResponse = await apiRequest('/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaignPayload)
          });
          
          const campaignId = campaignResponse?.campaign?.id || campaignResponse?.id;
          if (campaignId) {
            setDraftCampaignId(campaignId);
          }
        }
      } catch (error) {
        console.error('Failed to save draft:', error);
        // Don't show alert for draft saves to avoid interrupting user flow
      } finally {
        setSavingDraft(false);
      }
    };

    // Debounced save for field changes (excluding step)
    const timeoutId = setTimeout(saveDraft, 1500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name, channels, segments, schedule, activeBaseId, draftCampaignId, leads,
    productService, valueProposition, callToAction, senderName, senderCompany,
    messages, selectedMessageIndices, messagesGenerated,
    whatsAppMessages, selectedWhatsAppMessageIndices, whatsAppMessagesGenerated,
    followupsPreferenceSet, showFollowupsNumberInput,
    linkedInStepConfig, selectedVoiceId, initialPrompt, systemPersona, knowledgeBaseFiles,
    isLaunching, savingDraft
  ]);

  // Immediate save when step changes
  useEffect(() => {
    if (previousStep !== null && previousStep !== step && draftCampaignId && name.trim() && activeBaseId && step > 1 && !isLaunching) {
      // Step changed - save immediately
      const saveDraftImmediate = async () => {
        if (savingDraft || isLaunching) return;
        setSavingDraft(true);
        try {
          // Reuse the same save logic but execute immediately
          let tierFilter: string | undefined = undefined;
          if (segments.includes('Hot leads')) {
            tierFilter = 'Hot';
          } else if (segments.includes('Warm leads')) {
            tierFilter = 'Warm';
          } else if (segments.some(s => s.includes('Cold'))) {
            tierFilter = 'Cold';
          }
          
          const getSegmentLeads = (segmentName: string): number => {
            let segmentLeads: Lead[] = [];
            switch (segmentName) {
              case 'Hot leads':
                segmentLeads = leads.filter(l => l.tier === 'Hot');
                break;
              case 'Warm leads':
                segmentLeads = leads.filter(l => l.tier === 'Warm');
                break;
              case 'Engaged not converted':
                segmentLeads = leads.filter(l => (l.tier === 'Hot' || l.tier === 'Warm') && (l.score || 0) >= 75);
                break;
              case 'Never opened':
                segmentLeads = leads.filter(l => (l.score || 0) < 65);
                break;
              case 'High-score low-engagement':
                segmentLeads = leads.filter(l => (l.score || 0) >= 90 && l.tier !== 'Hot');
                break;
              default:
                segmentLeads = [];
            }
            if (channels.includes('email')) {
              segmentLeads = segmentLeads.filter(l => {
                if (!l.email) return false;
                const emailInfo = getEmailInfo(l.email, (l as any).enrichment);
                return emailInfo.isValid && !emailInfo.isMasked;
              });
            }
            if (channels.includes('linkedin')) {
              segmentLeads = segmentLeads.filter(hasLinkedInUrl);
            }
            return segmentLeads.length;
          };
          
          const totalLeads = segments.reduce((total, seg) => total + getSegmentLeads(seg), 0);
          
          const config: any = {
            currentStep: step,
            schedule: {
              start: schedule.start || null,
              end: schedule.end || null,
              ...(channels.includes('email') && schedule.email ? { email: schedule.email } : {}),
              ...(channels.includes('linkedin') && schedule.linkedin ? { linkedin: schedule.linkedin } : {}),
              ...(channels.includes('whatsapp') && schedule.whatsapp ? { whatsapp: schedule.whatsapp } : {}),
              ...(channels.includes('call') && schedule.call ? { call: schedule.call } : {}),
              followups: schedule.followups || 0,
              followupDelay: schedule.followupDelay || 3
            },
            segments: segments,
            emailMessages: messages,
            selectedEmailMessageIndices: selectedMessageIndices,
            messagesGenerated: messagesGenerated,
            whatsAppMessages: whatsAppMessages,
            selectedWhatsAppMessageIndices: selectedWhatsAppMessageIndices,
            whatsAppMessagesGenerated: whatsAppMessagesGenerated,
            followupsPreferenceSet: followupsPreferenceSet,
            showFollowupsNumberInput: showFollowupsNumberInput
          };
          
          if (channels.includes('email')) {
            config.email = {
              productService: productService || '',
              valueProposition: valueProposition || '',
              callToAction: callToAction || '',
              senderName: senderName || '',
              senderCompany: senderCompany || ''
            };
          }
          
          if (channels.includes('linkedin')) {
            config.linkedin = {
              productService: productService || '',
              valueProposition: valueProposition || '',
              callToAction: callToAction || '',
              senderName: senderName || '',
              senderCompany: senderCompany || ''
            };
            if (linkedInStepConfig) {
              config.linkedin_step = linkedInStepConfig;
            }
          }
          
          if (channels.includes('call')) {
            config.call = {
              knowledgeBaseFiles: knowledgeBaseFiles.map(f => ({ id: f.id, name: f.name }))
            };
          }
          
          const campaignPayload: any = {
            name: name || 'Untitled Campaign',
            channel: channels[0] || 'email',
            status: 'draft',
            tier_filter: tierFilter,
            leads: totalLeads,
            channels: channels,
            config: config
          };
          
          if (channels.includes('call')) {
            if (selectedVoiceId) campaignPayload.selectedVoiceId = selectedVoiceId;
            if (initialPrompt) campaignPayload.firstPrompt = initialPrompt;
            if (systemPersona) campaignPayload.systemPersona = systemPersona;
          }
          
          await apiRequest(`/campaigns/${draftCampaignId}`, {
            method: 'PUT',
            body: JSON.stringify(campaignPayload)
          });
        } catch (error) {
          console.error('Failed to save draft on step change:', error);
        } finally {
          setSavingDraft(false);
        }
      };
      
      saveDraftImmediate();
    }
    setPreviousStep(step);
  }, [step, previousStep, draftCampaignId, name, activeBaseId, channels, segments, schedule, messages, selectedMessageIndices, whatsAppMessages, selectedWhatsAppMessageIndices, productService, valueProposition, callToAction, senderName, senderCompany, linkedInStepConfig, selectedVoiceId, initialPrompt, systemPersona, knowledgeBaseFiles, followupsPreferenceSet, showFollowupsNumberInput, messagesGenerated, whatsAppMessagesGenerated, leads, savingDraft, isLaunching]);

  // Save draft when tab becomes hidden (user switches tabs or closes browser)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && draftCampaignId && name.trim() && activeBaseId && step > 1 && !savingDraft && !isLaunching) {
        // Trigger immediate save when tab becomes hidden
        try {
          setSavingDraft(true);
          // Reuse the save logic from the auto-save effect
          // This will be handled by the auto-save effect, but we trigger it immediately
          const saveDraftNow = async () => {
            // Determine tier_filter from segments
            let tierFilter: string | undefined = undefined;
            if (segments.includes('Hot leads')) {
              tierFilter = 'Hot';
            } else if (segments.includes('Warm leads')) {
              tierFilter = 'Warm';
            } else if (segments.some(s => s.includes('Cold'))) {
              tierFilter = 'Cold';
            }
            
            const getSegmentLeads = (segmentName: string): number => {
              let segmentLeads: Lead[] = [];
              switch (segmentName) {
                case 'Hot leads':
                  segmentLeads = leads.filter(l => l.tier === 'Hot');
                  break;
                case 'Warm leads':
                  segmentLeads = leads.filter(l => l.tier === 'Warm');
                  break;
                case 'Engaged not converted':
                  segmentLeads = leads.filter(l => (l.tier === 'Hot' || l.tier === 'Warm') && (l.score || 0) >= 75);
                  break;
                case 'Never opened':
                  segmentLeads = leads.filter(l => (l.score || 0) < 65);
                  break;
                case 'High-score low-engagement':
                  segmentLeads = leads.filter(l => (l.score || 0) >= 90 && l.tier !== 'Hot');
                  break;
                default:
                  segmentLeads = [];
              }
              if (channels.includes('email')) {
                segmentLeads = segmentLeads.filter(l => {
                  if (!l.email) return false;
                  const emailInfo = getEmailInfo(l.email, (l as any).enrichment);
                  return emailInfo.isValid && !emailInfo.isMasked;
                });
              }
              if (channels.includes('linkedin')) {
                segmentLeads = segmentLeads.filter(hasLinkedInUrl);
              }
              return segmentLeads.length;
            };
            
            const totalLeads = segments.reduce((total, seg) => total + getSegmentLeads(seg), 0);
            
            const config: any = {
              currentStep: step,
              schedule: {
                start: schedule.start || null,
                end: schedule.end || null,
                ...(channels.includes('email') && schedule.email ? { email: schedule.email } : {}),
                ...(channels.includes('linkedin') && schedule.linkedin ? { linkedin: schedule.linkedin } : {}),
                ...(channels.includes('whatsapp') && schedule.whatsapp ? { whatsapp: schedule.whatsapp } : {}),
                ...(channels.includes('call') && schedule.call ? { call: schedule.call } : {}),
                followups: schedule.followups || 0,
                followupDelay: schedule.followupDelay || 3
              },
              segments: segments,
              emailMessages: messages,
              selectedEmailMessageIndices: selectedMessageIndices,
              messagesGenerated: messagesGenerated,
              whatsAppMessages: whatsAppMessages,
              selectedWhatsAppMessageIndices: selectedWhatsAppMessageIndices,
              whatsAppMessagesGenerated: whatsAppMessagesGenerated,
              followupsPreferenceSet: followupsPreferenceSet,
              showFollowupsNumberInput: showFollowupsNumberInput
            };
            
            if (channels.includes('email')) {
              config.email = {
                productService: productService || '',
                valueProposition: valueProposition || '',
                callToAction: callToAction || '',
                senderName: senderName || '',
                senderCompany: senderCompany || ''
              };
            }
            
            if (channels.includes('linkedin')) {
              config.linkedin = {
                productService: productService || '',
                valueProposition: valueProposition || '',
                callToAction: callToAction || '',
                senderName: senderName || '',
                senderCompany: senderCompany || ''
              };
              if (linkedInStepConfig) {
                config.linkedin_step = linkedInStepConfig;
              }
            }
            
            if (channels.includes('call')) {
              config.call = {
                knowledgeBaseFiles: knowledgeBaseFiles.map(f => ({ id: f.id, name: f.name }))
              };
            }
            
            const campaignPayload: any = {
              name: name || 'Untitled Campaign',
              channel: channels[0] || 'email',
              status: 'draft',
              tier_filter: tierFilter,
              leads: totalLeads,
              channels: channels,
              config: config
            };
            
            if (channels.includes('call')) {
              if (selectedVoiceId) campaignPayload.selectedVoiceId = selectedVoiceId;
              if (initialPrompt) campaignPayload.firstPrompt = initialPrompt;
              if (systemPersona) campaignPayload.systemPersona = systemPersona;
            }
            
            await apiRequest(`/campaigns/${draftCampaignId}`, {
              method: 'PUT',
              body: JSON.stringify(campaignPayload)
            });
          };
          
          await saveDraftNow();
        } catch (error) {
          console.error('Failed to save draft on visibility change:', error);
        } finally {
          setSavingDraft(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [draftCampaignId, name, step, activeBaseId, channels, segments, schedule, messages, selectedMessageIndices, whatsAppMessages, selectedWhatsAppMessageIndices, productService, valueProposition, callToAction, senderName, senderCompany, linkedInStepConfig, selectedVoiceId, initialPrompt, systemPersona, knowledgeBaseFiles, followupsPreferenceSet, showFollowupsNumberInput, messagesGenerated, whatsAppMessagesGenerated, leads, savingDraft, isLaunching]);

  // Calculate segment leads
  const segmentData = useMemo(() => {
    // Helper function to check if lead has valid email
    const hasValidEmail = (lead: Lead): boolean => {
      if (!lead.email) return false;
      const emailInfo = getEmailInfo(lead.email, (lead as any).enrichment);
      return emailInfo.isValid && !emailInfo.isMasked;
    };

    // Helper function to check if lead has valid phone
    const hasValidPhone = (lead: Lead): boolean => {
      if (!lead.phone || !lead.phone.trim()) return false;
      // Basic phone validation - at least 10 digits
      const cleaned = lead.phone.replace(/[^\d+]/g, '');
      const digitsOnly = cleaned.replace(/\+/g, '');
      return digitsOnly.length >= 10 && /^\+?[\d\s\-()]{10,}$/.test(lead.phone);
    };

    // Filter leads based on selected channels
    const filterLeadsByChannel = (leadsList: Lead[]): Lead[] => {
      let filtered = leadsList;
      
      // If email channel is selected, only include leads with valid emails
      if (channels.includes('email')) {
        filtered = filtered.filter(hasValidEmail);
      }
      
      // If LinkedIn channel is selected, only include leads with LinkedIn URLs
      if (channels.includes('linkedin')) {
        filtered = filtered.filter(hasLinkedInUrl);
      }
      
      // If WhatsApp or Call channel is selected, only include leads with valid phone numbers
      if (channels.includes('whatsapp') || channels.includes('call')) {
        filtered = filtered.filter(hasValidPhone);
      }
      
      return filtered;
    };

    const getSegmentLeads = (segmentName: string): Lead[] => {
      let segmentLeads: Lead[] = [];
      
      switch (segmentName) {
        case 'Hot leads':
          segmentLeads = leads.filter(l => l.tier === 'Hot');
          break;
        case 'Warm leads':
          segmentLeads = leads.filter(l => l.tier === 'Warm');
          break;
        case 'Engaged not converted':
          segmentLeads = leads.filter(l => (l.tier === 'Hot' || l.tier === 'Warm') && (l.score || 0) >= 75);
          break;
        case 'Never opened':
          segmentLeads = leads.filter(l => (l.score || 0) < 65);
          break;
        case 'High-score low-engagement':
          segmentLeads = leads.filter(l => (l.score || 0) >= 90 && l.tier !== 'Hot');
          break;
        default:
          segmentLeads = [];
      }
      
      // Apply channel-based filtering
      return filterLeadsByChannel(segmentLeads);
    };

    return [
      { name: 'Hot leads', color: '#ff6b6b' },
      { name: 'Warm leads', color: '#ffa726' },
      { name: 'Engaged not converted', color: '#4C67FF' },
      { name: 'Never opened', color: '#888' },
      { name: 'High-score low-engagement', color: '#A94CFF' }
    ].map(s => ({
      ...s,
      count: getSegmentLeads(s.name).length,
      leads: getSegmentLeads(s.name)
    }));
  }, [leads, channels]);

  // Calculate total leads from selected segments
  const totalLeads = useMemo(() => {
    return segments.reduce((total, segName) => {
      const seg = segmentData.find(s => s.name === segName);
      return total + (seg?.count || 0);
    }, 0);
  }, [segments, segmentData]);

  // Calculate campaign duration in days
  const campaignDays = useMemo(() => {
    if (!schedule.start || !schedule.end) return 0;
    const start = new Date(schedule.start);
    const end = new Date(schedule.end);
    if (end <= start) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [schedule.start, schedule.end]);

  // Fetch LinkedIn account type to determine max throttle
  useEffect(() => {
    const fetchLinkedInAccountType = async () => {
      if (!channels.includes('linkedin') || !activeBaseId) {
        setLinkedInAccountType(null);
        setLinkedInMaxThrottle(100);
        return;
      }
      try {
        const integrations = await apiRequest('/integrations');
        const linkedInIntegration = integrations.integrations?.find(
          (i: any) => i.provider === 'unipile_linkedin' && i.base_id === activeBaseId
        );
        if (linkedInIntegration) {
          const accountType = linkedInIntegration.config?.linkedin_account_type || 'free_basic';
          setLinkedInAccountType(accountType);
          
          // Set max throttle based on account type
          if (['premium', 'sales_navigator', 'recruiter'].includes(accountType)) {
            setLinkedInMaxThrottle(100); // Daily limit for premium
            setLinkedInMonthlyLimit(null); // Premium accounts have daily limits
          } else {
            // Free accounts: monthly limits
            const action = linkedInStepConfig?.action || 'invitation_only';
            const monthlyLimit = action === 'invitation_with_message' ? 5 : 150;
            setLinkedInMonthlyLimit(monthlyLimit);
            // For free accounts, calculate daily average based on campaign duration
            // But we'll show monthly limit in UI and calculate recommendation differently
            setLinkedInMaxThrottle(Math.max(1, Math.floor(monthlyLimit / 30))); // Temporary daily average for input
          }
        } else {
          setLinkedInAccountType('free_basic');
          setLinkedInMaxThrottle(5); // Default to conservative limit
        }
      } catch (error) {
        console.error('Failed to fetch LinkedIn account type:', error);
        setLinkedInAccountType('free_basic');
        setLinkedInMaxThrottle(5);
      }
    };
    fetchLinkedInAccountType();
  }, [channels, activeBaseId, linkedInStepConfig?.action]);

  // Calculate throttle recommendations
  useEffect(() => {
    if (!schedule.start || !schedule.end || totalLeads === 0 || campaignDays === 0) {
      setRecommendedEmailThrottle(null);
      setRecommendedLinkedInThrottle(null);
      return;
    }
    
    // Calculate recommended throttle: leads / days, capped at max
    const recommendedEmail = Math.min(100, Math.ceil(totalLeads / campaignDays));
    setRecommendedEmailThrottle(recommendedEmail);
    
    if (channels.includes('linkedin')) {
      // For free accounts with monthly limits, calculate based on monthly limit
      if (linkedInMonthlyLimit !== null) {
        // Calculate daily average that respects monthly limit
        // If campaign runs for X days, we can send at most monthlyLimit / X per day
        // But also need to ensure we don't exceed total leads
        const dailyFromMonthly = Math.floor(linkedInMonthlyLimit / campaignDays);
        const dailyFromLeads = Math.ceil(totalLeads / campaignDays);
        // For free accounts, we need to ensure total doesn't exceed monthly limit
        // If totalLeads > monthlyLimit, we can only send monthlyLimit total
        const maxTotalCanSend = Math.min(totalLeads, linkedInMonthlyLimit);
        const dailyFromMaxTotal = Math.ceil(maxTotalCanSend / campaignDays);
        // Take the minimum of: monthly limit per day, leads per day, and max throttle
        const recommendedLinkedIn = Math.min(
          linkedInMaxThrottle,
          Math.max(1, Math.min(dailyFromMonthly, dailyFromLeads, dailyFromMaxTotal))
        );
        setRecommendedLinkedInThrottle(recommendedLinkedIn);
      } else {
        // Premium accounts: daily limits
        const recommendedLinkedIn = Math.min(linkedInMaxThrottle, Math.ceil(totalLeads / campaignDays));
        setRecommendedLinkedInThrottle(recommendedLinkedIn);
      }
    } else {
      setRecommendedLinkedInThrottle(null);
    }
  }, [schedule.start, schedule.end, totalLeads, campaignDays, channels, linkedInMaxThrottle, linkedInMonthlyLimit]);

  // Auto-apply recommendations when they change (only if not manually set)
  useEffect(() => {
    if (recommendedEmailThrottle && channels.includes('email') && !schedule.email?.throttle) {
      setSchedule(prev => ({
        ...prev,
        email: { throttle: recommendedEmailThrottle }
      }));
    }
    if (recommendedLinkedInThrottle && channels.includes('linkedin') && !schedule.linkedin?.throttle) {
      setSchedule(prev => ({
        ...prev,
        linkedin: { throttle: recommendedLinkedInThrottle }
      }));
    }
  }, [recommendedEmailThrottle, recommendedLinkedInThrottle, channels]);

  // Handle file upload for knowledge base
  const handleFileUpload = async (file: File) => {
    if (!activeBaseId) {
      setUploadError('Please select a base first');
      return;
    }

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      // Get campaign ID - use draftCampaignId if available, otherwise check searchParams
      let campaignId = draftCampaignId;
      if (!campaignId) {
        const editCampaignId = searchParams?.get('edit');
        if (editCampaignId) {
          campaignId = Number(editCampaignId);
        }
      }

      // If no campaign ID, create a draft campaign first
      if (!campaignId) {
        if (!name.trim()) {
          setUploadError('Please enter a campaign name first');
          setUploadingFile(false);
          return;
        }

        // Create draft campaign
        const draftResponse = await apiRequest('/campaigns', {
          method: 'POST',
          body: JSON.stringify({
            base_id: activeBaseId,
            name: name || 'Untitled Campaign',
            channel: channels[0] || 'call',
            channels: channels,
            status: 'draft',
            config: {}
          })
        });

        campaignId = draftResponse.campaign?.id;
        if (campaignId) {
          setDraftCampaignId(campaignId);
          // Update URL to include edit parameter
          router.replace(`/campaigns/new?edit=${campaignId}`);
        } else {
          throw new Error('Failed to create draft campaign');
        }
      }

      const formData = new FormData();
      formData.append('pdf', file);

      const token = getToken();
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/knowledge-base/pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header, browser will set it with boundary for FormData
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Add file to list
      setKnowledgeBaseFiles(prev => [...prev, {
        id: data.file?.id?.toString() || Date.now().toString(),
        name: file.name,
        uploadedAt: data.file?.uploadedAt || new Date().toISOString()
      }]);
    } catch (error: any) {
      console.error('File upload error:', error);
      setUploadError(error?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Auto-generate email messages when reaching step 5 with email channel (after follow-up preferences)
  useEffect(() => {
    const generateEmailTemplates = async () => {
      // Only generate if:
      // 1. We're on step 5 (messages step when email is selected, after follow-up preferences)
      // 2. Email channel is selected
      // 3. Follow-up preferences have been set
      // 4. Messages haven't been generated yet OR we need to regenerate for new follow-up count
      // 5. We have required email campaign details
      // 6. We have segments selected
      const messagesStep = 5;
      const isDefaultMessages = messages[0]?.includes('quick idea') || 
                                messages[0]?.includes('noticed') || 
                                messages[0]?.includes('Question about') ||
                                messages.length === 0;
      
      // Check if we need to regenerate templates (follow-up count changed)
      const expectedTemplateCount = 1 + (schedule.followups || 0);
      const needsRegeneration = messages.length !== expectedTemplateCount;
      
      if (
        step === messagesStep &&
        channels.includes('email') &&
        followupsPreferenceSet &&
        (!messagesGenerated || needsRegeneration) &&
        (isDefaultMessages || needsRegeneration) &&
        productService &&
        valueProposition &&
        callToAction &&
        segments.length > 0 &&
        activeBaseId &&
        segmentData.length > 0
      ) {
        setGeneratingMessages(true);
        try {
          // Get sample leads from selected segments
          const sampleLeads = segments
            .map(segName => {
              const seg = segmentData.find(s => s.name === segName);
              return seg?.leads?.[0]; // Get first lead from each segment
            })
            .filter((lead): lead is Lead => lead !== undefined)
            .slice(0, 3); // Limit to 3 sample leads
          
          if (sampleLeads.length > 0) {
            // Calculate number of templates needed: 1 initial + number of follow-ups
            const numberOfTemplates = 1 + (schedule.followups || 0);
            
            const response = await apiRequest('/campaigns/generate-messages', {
              method: 'POST',
              body: JSON.stringify({
                channel: 'email',
                campaignName: name,
                baseId: activeBaseId,
                segments: segments,
                sampleLeads: sampleLeads.map(sanitizeLeadForAPI),
                productService: productService,
                valueProposition: valueProposition,
                callToAction: callToAction,
                senderName: senderName,
                senderCompany: senderCompany,
                numberOfTemplates: numberOfTemplates
              })
            });
            
            if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
              // Ensure we have exactly the number of templates needed (pad with empty if needed)
              const processedMessages = response.messages.slice(0, numberOfTemplates);
              while (processedMessages.length < numberOfTemplates) {
                processedMessages.push('Subject: \n\n');
              }
              console.log('[Frontend] Received messages:', processedMessages.length, 'items');
              console.log('[Frontend] Follow-ups configured:', schedule.followups);
              setMessages(processedMessages);
              setMessagesGenerated(true);
              // Reset selection to include all templates when new messages are generated
              setSelectedMessageIndices(Array.from({ length: processedMessages.length }, (_, i) => i));
            } else {
              console.error('[Frontend] Invalid messages response:', response);
            }
          }
        } catch (error) {
          console.error('Failed to generate email templates:', error);
          // Keep default messages on error
        } finally {
          setGeneratingMessages(false);
        }
      }
    };
    
    generateEmailTemplates();
  }, [step, channels, name, segments, segmentData, activeBaseId, productService, valueProposition, callToAction, senderName, senderCompany, messages, messagesGenerated, followupsPreferenceSet, schedule.followups]);

  const viewSegmentLeads = (segmentName: string) => {
    const segment = segmentData.find(s => s.name === segmentName);
    if (segment) {
      setViewingLeads(segment.leads);
      setViewingSegment(segmentName);
    }
  };

  const next = () => {
    // Calculate max step based on channels
    let maxStep = totalSteps;
    setStep((s) => (Math.min(maxStep, (s + 1)) as Step));
  };
  
  const back = () => {
    if (step === 1) {
      // If on step 1, navigate back to campaigns page
      router.push('/campaigns');
    } else {
      // Otherwise, go to previous step
      setStep((s) => (Math.max(1, (s - 1)) as Step));
    }
  };

  return (
    <>
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
      <div className="card-enhanced" style={{ 
        borderRadius: 20, 
        padding: '40px 48px', 
        maxWidth: 1200, 
        margin: '0 auto',
        background: 'var(--color-surface)',
        border: '1px solid var(--elev-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ 
              fontSize: 14, 
              color: 'var(--color-text-muted)', 
              fontWeight: 600,
              minWidth: '100px'
            }}>
              Step {step} of {totalSteps}
            </div>
            <div style={{ 
              flex: 1, 
              height: 6, 
              background: 'var(--color-border)', 
              borderRadius: 10, 
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, #4C67FF 0%, #A94CFF 100%)', 
                width: `${(step / totalSteps) * 100}%`,
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: 10,
                boxShadow: '0 2px 8px rgba(76, 103, 255, 0.3)'
              }} />
            </div>
          </div>
        </div>

      {/* Basic Setup - rendered based on stepType */}
      {currentStepInfo?.stepType === 'basic_setup' && (
        <div style={{ display:'grid', gap: 24 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Basic Setup</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Start by giving your campaign a name and selecting the channels you want to use
            </p>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Campaign Name *</label>
            <input 
              className="input" 
              value={name} 
              onChange={(e)=>setName(e.target.value)} 
              placeholder="e.g., Q4 ABM Outreach"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Select Channel *</label>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {getAvailableChannels().map((channelConfig) => {
              const Icon = channelConfig.icon;
              return (
                <button 
                  key={channelConfig.id} 
                  className={channels.includes(channelConfig.id) ? 'btn-primary' : 'btn-ghost'} 
                  onClick={()=>setChannels((prev)=> prev.includes(channelConfig.id) ? prev.filter(x=>x!==channelConfig.id) : [...prev,channelConfig.id])}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} />
                  {channelConfig.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* Core Details Part 1 - rendered based on stepType */}
      {currentStepInfo?.stepType === 'core_details_part1' && (
        <div style={{ display:'grid', gap: 24 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Core Details (Part 1)</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Provide details about your campaign to generate personalized templates
            </p>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>What are you offering? (Product/Service) *</label>
            <input 
              className="input" 
              value={productService} 
              onChange={(e)=>setProductService(e.target.value)} 
              placeholder="e.g., Enterprise CRM software, API integration services, Marketing automation platform"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Value Proposition (What problem do you solve?) *</label>
            <textarea 
              className="input" 
              value={valueProposition} 
              onChange={(e)=>setValueProposition(e.target.value)} 
              rows={3}
              placeholder="e.g., Help real estate companies automate lead management and increase conversion rates by 40%"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, resize: 'vertical' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Call-to-Action *</label>
            <input 
              className="input" 
              value={callToAction} 
              onChange={(e)=>setCallToAction(e.target.value)} 
              placeholder="e.g., Schedule a demo, Book a call, Download free guide"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Your Name (Optional)</label>
            <input 
              className="input" 
              value={senderName} 
              onChange={(e)=>setSenderName(e.target.value)} 
              placeholder="e.g., John Smith"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Your Company (Optional)</label>
            <input 
              className="input" 
              value={senderCompany} 
              onChange={(e)=>setSenderCompany(e.target.value)} 
              placeholder="e.g., Spark AI"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
            />
          </div>
        </div>
      )}

      {/* Core Details Part 2 - Segments - rendered based on stepType */}
      {currentStepInfo?.stepType === 'core_details_part2' && (
        <div style={{ display:'grid', gap: 24 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Core Details (Part 2)</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Choose the lead segments you want to target with this campaign
            </p>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Select a segment *</label>
          {!activeBaseId ? (
            <div style={{ 
              padding: '24px', 
              background: 'rgba(255, 167, 38, 0.1)', 
              borderRadius: 12, 
              border: '1px solid rgba(255, 167, 38, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ marginBottom: 12, color: '#ffa726' }}>
                <Icons.AlertCircle size={32} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No Base Selected</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Please select a base first to view and select segments for your campaign.
              </div>
            </div>
          ) : loadingLeads ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Icons.Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <div>Loading leads...</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {segmentData.map(s => {
                  const isSelected = segments.includes(s.name);
                  return (
                    <div
                      key={s.name}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 16,
                        borderRadius: 12,
                        border: isSelected ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(169, 76, 255, 0.15) 100%)' 
                          : 'var(--color-surface-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onClick={() => {
                        // Toggle segment selection
                        if (isSelected) {
                          setSegments(segments.filter(seg => seg !== s.name));
                        } else {
                          setSegments([...segments, s.name]);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--color-surface)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--color-surface-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                        {isSelected && (
                          <Icons.Check size={20} style={{ color: '#4C67FF' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, marginBottom: 8 }}>
                        {s.count}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        leads available
                      </div>
                      {s.count > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewSegmentLeads(s.name);
                          }}
                          className="btn-ghost"
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            marginTop: 'auto',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          <Icons.Eye size={14} />
                          View Leads
                        </button>
                      )}
                      {s.count === 0 && (
                        <div style={{ 
                          fontSize: 11, 
                          color: 'var(--color-text-muted)', 
                          marginTop: 'auto',
                          fontStyle: 'italic'
                        }}>
                          No leads in this segment
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-hint" style={{ marginTop: 8 }}>
                Segments auto-update based on lead engagement and scoring. Select the best fit for this campaign.
                {(channels.includes('email') || channels.includes('linkedin') || channels.includes('whatsapp') || channels.includes('call')) && (
                  <div style={{ marginTop: 8, padding: 12, background: 'rgba(76, 103, 255, 0.08)', borderRadius: 8, border: '1px solid rgba(76, 103, 255, 0.2)', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icons.Info size={14} style={{ color: '#4C67FF' }} />
                      <strong style={{ color: '#4C67FF' }}>Channel Requirements</strong>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                      {channels.includes('email') && (
                        <div>• <strong>Email:</strong> Only leads with valid email addresses are included</div>
                      )}
                      {channels.includes('linkedin') && (
                        <div>• <strong>LinkedIn:</strong> Only leads with LinkedIn profile URLs are included</div>
                      )}
                      {(channels.includes('whatsapp') || channels.includes('call')) && (
                        <div>• <strong>WhatsApp/Call:</strong> Only leads with valid phone numbers are included</div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 11, fontStyle: 'italic' }}>
                        Leads missing required contact information will be automatically skipped during campaign execution.
                      </div>
                    </div>
                  </div>
                )}
                {segments.length > 0 && (
                  <>
                    <span style={{ marginLeft: 8, fontWeight: 600, marginTop: 8, display: 'block' }}>
                      {segments.length} segment{segments.length !== 1 ? 's' : ''} selected • Total leads: {segments.reduce((total, seg) => {
                        const segData = segmentData.find(s => s.name === seg);
                        return total + (segData?.count || 0);
                      }, 0)}
                    </span>
                    {totalLeads === 0 && (
                      <div style={{ 
                        marginTop: 12, 
                        padding: 12, 
                        background: '#fff3cd', 
                        borderRadius: 8, 
                        border: '1px solid #ffc107',
                        fontSize: 12
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, color: '#856404' }}>
                          ⚠️ No leads match your criteria
                        </div>
                        <div style={{ color: '#856404', lineHeight: 1.5 }}>
                          {channels.includes('email') && '• Selected leads must have valid email addresses\n'}
                          {channels.includes('linkedin') && '• Selected leads must have LinkedIn URLs\n'}
                          {(channels.includes('whatsapp') || channels.includes('call')) && '• Selected leads must have valid phone numbers\n'}
                          <div style={{ marginTop: 6 }}>
                            Consider: Adding more leads, selecting different segments, or choosing different communication channels.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      )}

      {/* Email Follow-up Preferences - rendered based on stepType */}
      {currentStepInfo?.stepType === 'email_followup_preferences' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Email Follow-up Preferences</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Configure how you want to follow up with leads after the initial email
            </p>
          </div>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
              <Icons.Send size={18} />
              Do you want to send follow-up emails? *
            </label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                className={schedule.followups > 0 ? 'btn-primary' : 'btn-ghost'}
                onClick={() => {
                  setSchedule({ ...schedule, followups: 1 });
                  setFollowupsPreferenceSet(true);
                  setShowFollowupsNumberInput(true);
                }}
                style={{ 
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                Yes
              </button>
              <button
                className={schedule.followups === 0 ? 'btn-primary' : 'btn-ghost'}
                onClick={() => {
                  setSchedule({ ...schedule, followups: 0 });
                  setFollowupsPreferenceSet(true);
                  setShowFollowupsNumberInput(false);
                }}
                style={{ 
                  padding: '12px 24px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                No
              </button>
            </div>
          </div>
          
          {showFollowupsNumberInput && schedule.followups > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                How many follow-up emails? (1-5)
              </label>
              <input
                className="input"
                type="number"
                min="1"
                max="5"
                value={schedule.followups || 1}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(5, Number(e.target.value) || 1));
                  setSchedule({ ...schedule, followups: value });
                }}
                style={{ width: '100%', padding: '12px 16px', fontSize: 14 }}
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                You can configure the delay between follow-ups in the schedule step
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Templates - rendered based on stepType */}
      {currentStepInfo?.stepType === 'email_templates' && followupsPreferenceSet && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>AI Email Templates</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              AI-generated email templates based on your campaign details. Select which templates to use.
            </p>
          </div>
          {generatingMessages ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Icons.Sparkles size={48} style={{ color: '#4C67FF' }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Generating personalized email templates...</div>
              <div style={{ fontSize: 13 }}>
                Using your campaign details, target segments, and ICP profile to create tailored messages
              </div>
            </div>
          ) : (
            <>
              <div className="text-hint">
                {channels.includes('email') && messagesGenerated
                  ? 'AI-generated email templates based on your campaign details. Select which template(s) to use.'
                  : 'AI suggested messages'}
              </div>
              {messages.map((m,i)=> {
                const { subject, body } = parseMessage(m);
                const isSelected = selectedMessageIndices.includes(i);
                return (
                  <div key={i} style={{ 
                    border: isSelected ? '2px solid #4C67FF' : '1px solid var(--color-border)', 
                    borderRadius: 12, 
                    padding: 16, 
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)'
                      : 'var(--color-surface-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => {
                    // Toggle selection
                    if (isSelected) {
                      setSelectedMessageIndices(selectedMessageIndices.filter(idx => idx !== i));
                    } else {
                      setSelectedMessageIndices([...selectedMessageIndices, i]);
                    }
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        {i === 0 ? 'Initial Email' : `Follow-up ${i}`}
                      </label>
                      <div style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        border: isSelected ? '2px solid #4C67FF' : '2px solid var(--color-border)',
                        background: isSelected ? '#4C67FF' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setSelectedMessageIndices(selectedMessageIndices.filter(idx => idx !== i));
                        } else {
                          setSelectedMessageIndices([...selectedMessageIndices, i]);
                        }
                      }}
                      >
                        {isSelected && (
                          <Icons.Check size={12} style={{ color: 'white' }} />
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                          Subject Line
                        </label>
                        <input
                          className="input"
                          value={subject}
                          onChange={(e) => {
                            e.stopPropagation();
                            const copy = [...messages];
                            copy[i] = formatMessage(e.target.value, body);
                            setMessages(copy);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Email subject..."
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                          Email Body
                        </label>
                        <textarea
                          className="input"
                          value={body}
                          onChange={(e) => {
                            e.stopPropagation();
                            const copy = [...messages];
                            copy[i] = formatMessage(subject, e.target.value);
                            setMessages(copy);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          rows={8}
                          placeholder="Email body..."
                          style={{ width: '100%', fontFamily: 'inherit' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {channels.includes('email') && messagesGenerated && selectedMessageIndices.length > 0 && (
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(76, 103, 255, 0.1)', 
                  borderRadius: 8, 
                  fontSize: 13,
                  color: 'var(--color-text)',
                  border: '1px solid rgba(76, 103, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Icons.Check size={16} style={{ color: '#4C67FF' }} />
                  <strong>Selected:</strong> {selectedMessageIndices.length} email template{selectedMessageIndices.length !== 1 ? 's' : ''} 
                  ({selectedMessageIndices.map(idx => `Email ${idx + 1}`).join(', ')})
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button 
                  className="btn-ghost" 
                  onClick={async () => {
                    if (!channels.includes('email') || !activeBaseId) return;
                    setGeneratingMessages(true);
                    try {
                      const sampleLeads = segments
                        .map(segName => {
                          const seg = segmentData.find(s => s.name === segName);
                          return seg?.leads?.[0];
                        })
                        .filter((lead): lead is Lead => lead !== undefined)
                        .slice(0, 3);
                      
                      if (sampleLeads.length > 0) {
                        // Calculate number of templates needed: 1 initial + number of follow-ups
                        const numberOfTemplates = 1 + (schedule.followups || 0);
                        
                        const response = await apiRequest('/campaigns/generate-messages', {
                          method: 'POST',
                          body: JSON.stringify({
                            channel: 'email',
                            campaignName: name,
                            baseId: activeBaseId,
                            segments: segments,
                            sampleLeads: sampleLeads.map(lead => ({
                              first_name: lead.first_name,
                              last_name: lead.last_name,
                              company: lead.company,
                              role: lead.role,
                              score: lead.score,
                              tier: lead.tier
                            })),
                            productService: productService,
                            valueProposition: valueProposition,
                            callToAction: callToAction,
                            senderName: senderName,
                            senderCompany: senderCompany,
                            numberOfTemplates: numberOfTemplates
                          })
                        });
                        
                        if (response.messages && Array.isArray(response.messages)) {
                          // Ensure we have exactly the number of templates needed (pad with empty if needed)
                          const processedMessages = response.messages.slice(0, numberOfTemplates);
                          while (processedMessages.length < numberOfTemplates) {
                            processedMessages.push('Subject: \n\n');
                          }
                          console.log('[Frontend] Regenerated messages:', processedMessages.length, 'items');
                          setMessages(processedMessages);
                          setMessagesGenerated(true);
                          // Reset selection to first email when regenerating
                          setSelectedMessageIndices([0]);
                        } else {
                          console.error('[Frontend] Invalid messages response:', response);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to regenerate templates:', error);
                    } finally {
                      setGeneratingMessages(false);
                    }
                  }}
                  disabled={!channels.includes('email') || !productService || !valueProposition || !callToAction}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icons.RefreshCw size={16} />
                  Regenerate
                </button>
                <button 
                  className="btn-ghost" 
                  onClick={()=>setMessages((prev)=> prev.map(m=> m.replace(/Hi\b/g,'Hello').replace(/\bI\b/g,'We')))}
                >
                  Tone: Formal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* LinkedIn Message Type - rendered based on stepType */}
      {currentStepInfo?.stepType === 'linkedin_message_type' && (
        <div style={{ display:'grid', gap:12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>LinkedIn Message Type</h3>
          <p className="text-hint" style={{ marginTop: 0, marginBottom: 16 }}>
            {linkedInStepConfig 
              ? 'You can change your selection below if needed.'
              : 'Choose how you want to connect with leads on LinkedIn'}
          </p>
          
          {linkedInStepConfig && (
            <div style={{ 
              padding: 16, 
              background: 'rgba(76, 103, 255, 0.08)', 
              borderRadius: 12,
              marginBottom: 8,
              border: '1px solid rgba(76, 103, 255, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icons.Check size={16} style={{ color: '#4C67FF' }} />
                <div style={{ fontWeight: 600 }}>Current Selection:</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--color-text)' }}>
                {linkedInStepConfig.action === 'invitation_only' 
                  ? 'Send only invitation (no message)'
                  : 'Send invitation with message'}
              </div>
              {linkedInStepConfig.message && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 12, 
                  background: 'var(--color-surface-secondary)', 
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {linkedInStepConfig.message}
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn-ghost"
              onClick={() => {
                setLinkedInStepConfig({ action: 'invitation_only' });
              }}
              style={{ 
                padding: '16px', 
                textAlign: 'left', 
                borderRadius: 12,
                border: linkedInStepConfig?.action === 'invitation_only' ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                background: linkedInStepConfig?.action === 'invitation_only' 
                  ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)'
                  : 'var(--color-surface-secondary)'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Send only invitation</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Send connection requests without a message
              </div>
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setShowLinkedInConfigModal(true);
              }}
              style={{ 
                padding: '16px', 
                textAlign: 'left', 
                borderRadius: 12,
                border: linkedInStepConfig?.action === 'invitation_with_message' ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                background: linkedInStepConfig?.action === 'invitation_with_message' 
                  ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)'
                  : 'var(--color-surface-secondary)'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Send invitation with message</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Include a personalized message with your connection request
              </div>
            </button>
          </div>
        </div>
      )}

      {/* LinkedIn Templates - rendered based on stepType */}
      {currentStepInfo?.stepType === 'linkedin_templates' && 
        linkedInStepConfig?.action === 'invitation_with_message' && (
        <div style={{ display:'grid', gap:12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>AI LinkedIn Message Templates</h3>
          <p className="text-hint" style={{ marginTop: 0, marginBottom: 16 }}>
            AI-generated LinkedIn connection message templates (max 200 characters each) based on your campaign details.
          </p>
          {linkedInStepConfig.templates && linkedInStepConfig.templates.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {linkedInStepConfig.templates.map((template, idx) => (
                <div key={idx} style={{
                  border: linkedInStepConfig.message === template ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: 16,
                  background: linkedInStepConfig.message === template 
                    ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)'
                    : 'var(--color-surface-secondary)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setLinkedInStepConfig({ ...linkedInStepConfig, message: template });
                }}
                >
                  <div style={{ fontSize: 13, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                    {template}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    {template.length} characters
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Icons.FileEdit size={32} />
              <div style={{ fontSize: 14 }}>No templates generated yet. Please configure LinkedIn message type first.</div>
            </div>
          )}
        </div>
      )}


      {/* Call Knowledge Base - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_knowledge_base' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Knowledge Base Upload</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Upload PDF files to provide context for your AI call agent. These files will enhance call conversations with relevant information.
            </p>
          </div>

          {/* File Upload Area */}
          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 12,
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--color-surface-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#4C67FF';
              e.currentTarget.style.background = 'rgba(76, 103, 255, 0.05)';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-surface-secondary)';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-surface-secondary)';
              const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
              if (files.length > 0) {
                handleFileUpload(files[0]);
              }
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/pdf';
              input.onchange = (e: any) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              };
              input.click();
            }}
          >
            <Icons.Upload size={48} style={{ color: '#4C67FF', marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {uploadingFile ? 'Uploading...' : 'Click to upload or drag and drop'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              PDF files only (max 10MB)
            </div>
          </div>

          {uploadError && (
            <div style={{
              padding: 12,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: 14
            }}>
              {uploadError}
            </div>
          )}

          {/* Uploaded Files List */}
          {knowledgeBaseFiles.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Uploaded Files</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {knowledgeBaseFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      background: 'var(--color-surface-secondary)',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Icons.FileText size={20} style={{ color: '#4C67FF' }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={async () => {
                        const editCampaignId = searchParams?.get('edit');
                        if (!editCampaignId) {
                          setKnowledgeBaseFiles(knowledgeBaseFiles.filter(f => f.id !== file.id));
                          return;
                        }

                        try {
                          await apiRequest(`/campaigns/${editCampaignId}/knowledge-base/${file.id}`, {
                            method: 'DELETE'
                          });
                          setKnowledgeBaseFiles(knowledgeBaseFiles.filter(f => f.id !== file.id));
                        } catch (error: any) {
                          showError('Delete failed', error?.message || 'Failed to delete file');
                        }
                      }}
                      style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {knowledgeBaseFiles.length === 0 && !uploadingFile && (
            <div style={{
              padding: 20,
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: 13,
              color: '#ef4444'
            }}>
              <Icons.AlertCircle size={16} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle' }} />
              <strong>Required:</strong> Knowledge base files are required for call campaigns. Upload product documentation, FAQs, or other relevant materials to help the AI agent make informed calls.
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Templates - rendered based on stepType */}
      {currentStepInfo?.stepType === 'whatsapp_templates' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>AI WhatsApp Message Templates</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              AI-generated WhatsApp message templates based on your campaign details. Select which template(s) to use.
            </p>
          </div>
          {generatingWhatsAppMessages ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Icons.Sparkles size={48} style={{ color: '#4C67FF' }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Generating personalized WhatsApp templates...</div>
              <div style={{ fontSize: 13 }}>
                Using your campaign details, target segments, and ICP profile to create tailored messages
              </div>
            </div>
          ) : (
            <>
              <div className="text-hint">
                {channels.includes('whatsapp') && whatsAppMessagesGenerated
                  ? 'AI-generated WhatsApp message templates based on your campaign details. Select which template(s) to use.'
                  : 'AI suggested WhatsApp messages'}
              </div>
              {whatsAppMessages.map((m, i) => {
                const isSelected = selectedWhatsAppMessageIndices.includes(i);
                return (
                  <div key={i} style={{ 
                    border: isSelected ? '2px solid #4C67FF' : '1px solid var(--color-border)', 
                    borderRadius: 12, 
                    padding: 16, 
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)'
                      : 'var(--color-surface-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => {
                    // Toggle selection
                    if (isSelected) {
                      setSelectedWhatsAppMessageIndices(selectedWhatsAppMessageIndices.filter(idx => idx !== i));
                    } else {
                      setSelectedWhatsAppMessageIndices([...selectedWhatsAppMessageIndices, i]);
                    }
                  }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#4C67FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--color-text)', whiteSpace: 'pre-wrap', paddingRight: isSelected ? 40 : 0 }}>
                      {m}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{m.length} characters</span>
                      <span style={{ fontSize: 10, color: isSelected ? '#4C67FF' : 'var(--color-text-muted)' }}>
                        {isSelected ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                    <textarea
                      className="input"
                      value={m}
                      onChange={(e) => {
                        e.stopPropagation();
                        const copy = [...whatsAppMessages];
                        copy[i] = e.target.value;
                        setWhatsAppMessages(copy);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      rows={4}
                      placeholder="WhatsApp message..."
                      style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
                    />
                  </div>
                );
              })}
              {channels.includes('whatsapp') && whatsAppMessagesGenerated && selectedWhatsAppMessageIndices.length > 0 && (
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(76, 103, 255, 0.1)', 
                  borderRadius: 8, 
                  fontSize: 13,
                  color: 'var(--color-text)',
                  border: '1px solid rgba(76, 103, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Icons.Check size={16} style={{ color: '#4C67FF' }} />
                  <strong>Selected:</strong> {selectedWhatsAppMessageIndices.length} WhatsApp template{selectedWhatsAppMessageIndices.length !== 1 ? 's' : ''} 
                  ({selectedWhatsAppMessageIndices.map(idx => `Message ${idx + 1}`).join(', ')})
                </div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button 
                  className="btn-ghost" 
                  onClick={async () => {
                    if (!channels.includes('whatsapp') || !activeBaseId) return;
                    setGeneratingWhatsAppMessages(true);
                    try {
                      const sampleLeads = segments
                        .map(segName => {
                          const seg = segmentData.find(s => s.name === segName);
                          return seg?.leads || [];
                        })
                        .flat()
                        .filter((lead: Lead) => {
                          // Only include leads with valid phone numbers for WhatsApp
                          if (!lead.phone || !lead.phone.trim()) return false;
                          const cleaned = lead.phone.replace(/[^\d+]/g, '');
                          const digitsOnly = cleaned.replace(/\+/g, '');
                          return digitsOnly.length >= 10;
                        })
                        .slice(0, 3);

                      if (sampleLeads.length === 0) {
                        showWarning('Phone numbers required', 'Add leads with phone numbers to generate personalized WhatsApp templates.');
                        return;
                      }

                      const response = await apiRequest('/campaigns/generate-messages', {
                        method: 'POST',
                        body: JSON.stringify({
                          channel: 'whatsapp',
                          campaignName: name || '',
                          campaignPurpose: productService || '',
                          baseId: activeBaseId,
                          segments: segments,
                          sampleLeads: sampleLeads.map(lead => {
                            const sanitized = sanitizeLeadForAPI(lead);
                            // Add industry fallback if not present
                            if (!sanitized.industry && lead.role) {
                              sanitized.industry = lead.role;
                            }
                            return sanitized;
                          }),
                          productService: productService || '',
                          valueProposition: valueProposition || '',
                          callToAction: callToAction || '',
                          senderName: senderName || '',
                          senderCompany: senderCompany || ''
                        })
                      });

                      if (response?.messages && Array.isArray(response.messages)) {
                        setWhatsAppMessages(response.messages);
                        setWhatsAppMessagesGenerated(true);
                        // Auto-select first message
                        setSelectedWhatsAppMessageIndices([0]);
                      } else {
                        console.error('Invalid response format:', response);
                        showError('Generation failed', 'Failed to generate WhatsApp templates. Please try again.');
                      }
                    } catch (error: any) {
                      console.error('Failed to generate WhatsApp messages:', error);
                      showError('Generation failed', error?.message || 'Failed to generate WhatsApp templates. Please try again.');
                    } finally {
                      setGeneratingWhatsAppMessages(false);
                    }
                  }}
                  disabled={generatingWhatsAppMessages || !channels.includes('whatsapp')}
                  style={{ 
                    padding: '12px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: (generatingWhatsAppMessages || !channels.includes('whatsapp')) ? 0.5 : 1,
                    cursor: (generatingWhatsAppMessages || !channels.includes('whatsapp')) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {generatingWhatsAppMessages ? 'Generating...' : 'Generate AI Templates'}
                </button>
                <button 
                  className="btn-ghost" 
                  onClick={()=>setWhatsAppMessages((prev)=> prev.map(m=> m.replace(/Hi\b/g,'Hello').replace(/\bI\b/g,'We')))}
                >
                  Tone: Formal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Call Voice Selection - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_voice_selection' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Voice Selection</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Choose the voice your AI agent will use during calls. This voice will be used for all call interactions.
            </p>
          </div>

          {loadingVoices ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Icons.Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <div>Loading voices...</div>
            </div>
          ) : availableVoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Icons.AlertCircle size={24} style={{ color: '#ffa726' }} />
              <div>No voices available. Please check your ElevenLabs configuration.</div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14 }}>Select Voice *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                {availableVoices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoiceId(voice.id)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedVoiceId === voice.id ? '#4C67FF' : 'var(--color-border)'}`,
                      borderRadius: 12,
                      background: selectedVoiceId === voice.id ? 'rgba(76, 103, 255, 0.05)' : 'var(--color-surface-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    {selectedVoiceId === voice.id && (
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#4C67FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Icons.Phone size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                          {voice.name}
                        </div>
                        {voice.description && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {voice.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedVoiceId && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'rgba(76, 103, 255, 0.1)',
                  borderRadius: 8,
                  border: '1px solid rgba(76, 103, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Icons.Check size={16} style={{ color: '#4C67FF' }} />
                  <strong>Selected:</strong> {availableVoices.find(v => v.id === selectedVoiceId)?.name || 'Unknown Voice'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Call Initial Prompt - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_initial_prompt' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Initial Call Prompt</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Write the opening message your AI agent will say when making calls. Use dynamic variables to personalize each call with lead information.
            </p>
          </div>

          {/* Dynamic Variables Helper */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 12,
            padding: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icons.Sparkles size={20} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>Personalize Your Calls</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, marginTop: 0 }}>
              Click any variable below to insert it into your message. The AI will automatically replace it with real lead data during calls.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {[
                { key: 'first_name', label: 'First Name', example: 'John' },
                { key: 'last_name', label: 'Last Name', example: 'Smith' },
                { key: 'company_name', label: 'Company', example: 'Acme Corp' },
                { key: 'role', label: 'Job Title', example: 'CEO' },
                { key: 'industry', label: 'Industry', example: 'Technology' },
                { key: 'product_service', label: 'Your Product', example: 'our CRM software' },
                { key: 'value_proposition', label: 'Value Prop', example: 'save 40% on costs' },
                { key: 'call_to_action', label: 'Call to Action', example: 'schedule a demo' }
              ].map((variable) => (
                <button
                  key={variable.key}
                  onClick={() => {
                    const textarea = document.querySelector('textarea.initial-prompt-textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const after = text.substring(end);
                      const insertText = `{{${variable.key}}}`;
                      textarea.value = before + insertText + after;
                      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
                      textarea.focus();
                      setInitialPrompt(textarea.value);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {`{{${variable.key}}}`}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {variable.example}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Call Opening Message *</label>
            <textarea
              className="input initial-prompt-textarea"
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              rows={6}
              placeholder="Hello {{first_name}}! I'm calling from our company about {{product_service}}. We help {{company_name}} {{value_proposition}}. Do you have a moment to discuss {{call_to_action}}?"
              style={{ width: '100%', fontSize: 14, resize: 'vertical' }}
            />

            {/* Message Preview */}
            {initialPrompt && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 8
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>
                  📱 Message Preview (with sample data):
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  {initialPrompt
                    .replace(/\{\{first_name\}\}/g, 'Sarah')
                    .replace(/\{\{last_name\}\}/g, 'Johnson')
                    .replace(/\{\{company_name\}\}/g, 'TechCorp Inc')
                    .replace(/\{\{role\}\}/g, 'CTO')
                    .replace(/\{\{industry\}\}/g, 'Software')
                    .replace(/\{\{product_service\}\}/g, 'our AI platform')
                    .replace(/\{\{value_proposition\}\}/g, 'automate 80% of their workflows')
                    .replace(/\{\{call_to_action\}\}/g, 'scheduling a free consultation')}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
              💡 <strong>Tip:</strong> Use variables like <code style={{background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: 3}}>{`{first_name}`}</code> to personalize each call. The AI will automatically replace them with real lead information.
            </div>
          </div>

          {/* Template Suggestions */}
          <div style={{
            background: 'rgba(156, 163, 175, 0.1)',
            border: '1px solid rgba(156, 163, 175, 0.2)',
            borderRadius: 8,
            padding: 16
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-primary)' }}>
              📝 Quick Templates
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                {
                  title: 'Warm Introduction',
                  text: 'Hello {{first_name}}! This is [Your Name] from [Your Company]. I noticed {{company_name}} is doing great work in {{industry}}. Do you have a moment to discuss how {{product_service}} could help {{value_proposition}}?'
                },
                {
                  title: 'Value-First Approach',
                  text: 'Hi {{first_name}}! I\'m reaching out from [Your Company] because we help companies like {{company_name}} {{value_proposition}} using {{product_service}}. Would you be open to a quick discussion about {{call_to_action}}?'
                },
                {
                  title: 'Personal Connection',
                  text: 'Hello {{first_name}}! My name is [Your Name] and I work with {{role}}s at companies like {{company_name}}. We\'ve helped similar organizations {{value_proposition}} through {{product_service}}. Could we explore {{call_to_action}} together?'
                }
              ].map((template, index) => (
                <button
                  key={index}
                  onClick={() => setInitialPrompt(template.text)}
                  style={{
                    padding: '12px',
                    background: 'white',
                    border: '1px solid rgba(156, 163, 175, 0.3)',
                    borderRadius: 6,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.3)';
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--color-text-primary)' }}>
                    {template.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {template.text.length > 120 ? `${template.text.substring(0, 120)}...` : template.text}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call System Persona - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_system_persona' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>AI Agent Persona</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Define your AI agent's personality and behavior. This helps create consistent, professional interactions.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>System Instructions *</label>
            <textarea
              className="input"
              value={systemPersona}
              onChange={(e) => setSystemPersona(e.target.value)}
              rows={8}
              placeholder={`You are a professional sales representative from [Your Company]. Your goal is to:

1. Build rapport and understand the prospect's needs
2. Clearly explain [Your Product/Service] and its benefits
3. Handle objections professionally
4. Schedule follow-up meetings when appropriate
5. Always be polite, knowledgeable, and solution-focused

Guidelines:
- Listen actively to the prospect's responses
- Ask qualifying questions to understand their situation
- Focus on value rather than features
- Be persistent but not pushy
- End calls positively, even if no immediate sale`}
              style={{ width: '100%', fontSize: 14, resize: 'vertical', fontFamily: 'monospace' }}
            />
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
              💡 <strong>Tip:</strong> Include specific instructions about how to handle common objections, follow-up procedures, and your company's unique selling points.
            </div>
          </div>
        </div>
      )}

      {/* Schedule step - rendered based on stepType */}
      {currentStepInfo?.stepType === 'schedule' && 
        (channels.includes('email') || channels.includes('linkedin') || channels.includes('whatsapp') || channels.includes('call')) && (
        <div style={{ display:'grid', gap:16 }}>
          {/* Launch mode */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <Icons.Clock size={18} />
              When to start
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!!schedule.launch_now}
                  onChange={() => setSchedule({ ...schedule, launch_now: true, start: "", end: "" })}
                />
                Launch immediately
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!schedule.launch_now}
                  onChange={() => setSchedule({ ...schedule, launch_now: false })}
                />
                Schedule for later
              </label>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
              <Icons.Calendar size={18} />
              Start date *
            </label>
            <input 
              className="input" 
              type="datetime-local" 
              value={schedule.start} 
              disabled={!!schedule.launch_now}
              onChange={(e)=>{
                const newStart = e.target.value;
                setSchedule({...schedule, start: newStart});
              }} 
              required={!schedule.launch_now}
            />
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Clock size={14} />
              {schedule.launch_now ? "Campaign will start immediately" : "Campaign will begin sending at this date/time"}
            </div>
          </div>
          
          {/* End Date */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
              <Icons.Calendar size={18} />
              End date *
            </label>
            <input 
              className="input" 
              type="datetime-local" 
              value={schedule.end} 
              disabled={!!schedule.launch_now}
              onChange={(e)=>{
                const newEnd = e.target.value;
                setSchedule({...schedule, end: newEnd});
              }} 
              min={schedule.start || undefined}
              required={!schedule.launch_now}
            />
            {schedule.start && schedule.end && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {new Date(schedule.end) <= new Date(schedule.start) ? (
                  <>
                    <Icons.AlertCircle size={14} style={{ color: '#ef4444' }} />
                    <span style={{ color: '#ef4444' }}>End date must be after start date</span>
                  </>
                ) : (
                  <>
                    <Icons.Clock size={14} />
                    Campaign duration: {campaignDays} day{campaignDays !== 1 ? 's' : ''}
                  </>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Clock size={14} />
              Campaign will automatically stop sending after this date/time
            </div>
          </div>
          
          {/* Email Throttle with Recommendation */}
          {channels.includes('email') && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Icons.Mail size={18} />
                Email Throttle (per day)
              </label>
              {schedule.start && schedule.end && totalLeads > 0 && campaignDays > 0 && recommendedEmailThrottle !== null && (
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(76, 103, 255, 0.08)', 
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: 13,
                  border: '1px solid rgba(76, 103, 255, 0.2)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.Lightbulb size={16} style={{ color: '#4C67FF' }} />
                    Recommended: {recommendedEmailThrottle} emails/day
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    Based on {totalLeads} lead{totalLeads !== 1 ? 's' : ''} over {campaignDays} day{campaignDays !== 1 ? 's' : ''}
                    {recommendedEmailThrottle >= 100 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#ef4444' }}>
                        <Icons.AlertCircle size={14} />
                        Maximum cap: 100 emails/day
                      </div>
                    )}
                  </div>
                </div>
              )}
              <input 
                className="input" 
                type="number" 
                min="1"
                max="100"
                value={schedule.email?.throttle || 200} 
                onChange={(e)=>setSchedule({
                  ...schedule, 
                  email: { 
                    throttle: Math.min(100, Math.max(1, Number(e.target.value) || 1))
                  }
                })} 
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Maximum emails to send per day (max: 100)
              </div>
            </div>
          )}
          
          {/* LinkedIn Throttle with Recommendation */}
          {channels.includes('linkedin') && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Icons.Linkedin size={18} />
                LinkedIn Throttle (per day)
              </label>
              {schedule.start && schedule.end && totalLeads > 0 && campaignDays > 0 && recommendedLinkedInThrottle !== null && linkedInAccountType && (
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(76, 103, 255, 0.08)', 
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: 13,
                  border: '1px solid rgba(76, 103, 255, 0.2)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.Lightbulb size={16} style={{ color: '#4C67FF' }} />
                    Recommended: {recommendedLinkedInThrottle} invitations/day
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    Based on {totalLeads} lead{totalLeads !== 1 ? 's' : ''} over {campaignDays} day{campaignDays !== 1 ? 's' : ''}
                    <br />
                    Account type: {linkedInAccountType === 'free_basic' ? 'Free / Basic' : linkedInAccountType}
                    {linkedInMonthlyLimit !== null ? (
                      <>
                        {' '}(Monthly limit: {linkedInMonthlyLimit} invitations{linkedInStepConfig?.action === 'invitation_with_message' ? ' with message' : ''})
                        {linkedInStepConfig?.action === 'invitation_with_message' && (
                          <div style={{ marginTop: 4, color: '#ffa726', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icons.AlertCircle size={12} />
                            <span>Free accounts can send up to {linkedInMonthlyLimit} invitations per month with a message</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <> (Max: {linkedInMaxThrottle}/day)</>
                    )}
                  </div>
                </div>
              )}
              <input 
                className="input" 
                type="number" 
                min="1"
                max={linkedInMonthlyLimit !== null ? Math.min(linkedInMaxThrottle, linkedInMonthlyLimit) : linkedInMaxThrottle}
                value={schedule.linkedin?.throttle || 100} 
                onChange={(e)=>{
                  const inputValue = Number(e.target.value) || 1;
                  // For free accounts with monthly limits, ensure we don't exceed monthly limit
                  let maxValue = linkedInMaxThrottle;
                  if (linkedInMonthlyLimit !== null) {
                    // Calculate max per day based on monthly limit and campaign duration
                    const maxPerDayFromMonthly = Math.floor(linkedInMonthlyLimit / Math.max(1, campaignDays));
                    maxValue = Math.min(linkedInMaxThrottle, maxPerDayFromMonthly, linkedInMonthlyLimit);
                  }
                  setSchedule({
                    ...schedule, 
                    linkedin: { 
                      throttle: Math.min(maxValue, Math.max(1, inputValue))
                    }
                  });
                }} 
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {linkedInMonthlyLimit !== null ? (
                      <>
                        Maximum LinkedIn invitations per day
                        <div style={{ marginTop: 6, padding: 12, background: 'rgba(255, 167, 38, 0.1)', borderRadius: 8, border: '1px solid rgba(255, 167, 38, 0.2)' }}>
                          <div style={{ fontWeight: 600, marginBottom: 6, color: '#ffa726', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icons.AlertCircle size={14} />
                            Monthly Limit: {linkedInMonthlyLimit} invitations{linkedInStepConfig?.action === 'invitation_with_message' ? ' with message' : ''}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                            {linkedInStepConfig?.action === 'invitation_with_message' 
                              ? `Free accounts can send up to ${linkedInMonthlyLimit} connection invitations per month with a personalized message.`
                              : `Free accounts can send up to ${linkedInMonthlyLimit} connection invitations per month without a message.`}
                            <br />
                            <br />
                            <strong>Campaign capacity:</strong> With {campaignDays} day{campaignDays !== 1 ? 's' : ''} duration, you can send up to {Math.min(totalLeads, linkedInMonthlyLimit)} of {totalLeads} lead{totalLeads !== 1 ? 's' : ''} (max {linkedInMonthlyLimit} total per month)
                            {totalLeads > linkedInMonthlyLimit && (
                              <div style={{ marginTop: 6, padding: 8, background: 'rgba(255, 107, 107, 0.1)', borderRadius: 6, border: '1px solid rgba(255, 107, 107, 0.2)', color: '#ff6b6b', fontSize: 11 }}>
                                <Icons.AlertCircle size={12} style={{ marginRight: 4, display: 'inline' }} />
                                You have {totalLeads} leads but can only send {linkedInMonthlyLimit} invitations per month. Consider reducing leads or extending campaign duration.
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        Maximum LinkedIn invitations per day (max: {linkedInMaxThrottle} based on your account type)
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 11, marginTop: 4 }}>
                          <Icons.AlertCircle size={12} />
                          Also subject to LinkedIn platform limits
                        </div>
                      </>
                    )}
              </div>
            </div>
          )}
          
          {/* WhatsApp Throttle */}
          {channels.includes('whatsapp') && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Icons.MessageCircle size={18} />
                WhatsApp Throttle (per day)
              </label>
              {schedule.start && schedule.end && totalLeads > 0 && campaignDays > 0 && (
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(76, 103, 255, 0.08)', 
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: 13,
                  border: '1px solid rgba(76, 103, 255, 0.2)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.Lightbulb size={16} style={{ color: '#4C67FF' }} />
                    Recommended: {Math.ceil(totalLeads / campaignDays)} messages/day
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                    Based on {totalLeads} lead{totalLeads !== 1 ? 's' : ''} over {campaignDays} day{campaignDays !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              <input 
                className="input" 
                type="number" 
                min="1"
                max="50"
                value={schedule.whatsapp?.throttle || 50} 
                onChange={(e)=>setSchedule({
                  ...schedule, 
                  whatsapp: { 
                    throttle: Math.min(50, Math.max(1, Number(e.target.value) || 1))
                  }
                })} 
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Maximum WhatsApp messages to send per day (max: 50)
              </div>
            </div>
          )}
          
          {/* Visual separator if multiple channels are selected */}
          {(channels.includes('email') && channels.includes('linkedin')) || 
           (channels.includes('email') && channels.includes('whatsapp')) ||
           (channels.includes('linkedin') && channels.includes('whatsapp')) || 
           channels.length > 2 && (
            <div style={{ 
              padding: 12, 
              background: 'rgba(76, 103, 255, 0.08)', 
              borderRadius: 8,
              fontSize: 13,
              border: '1px solid rgba(76, 103, 255, 0.2)'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.Info size={16} style={{ color: '#4C67FF' }} />
                Multi-Channel Campaign
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                Each channel has its own daily throttle limit. The campaign will complete when all leads receive messages on <strong>all selected channels</strong>.
              </div>
            </div>
          )}
          
          {/* Follow-up Delay Configuration (only if email + follow-ups enabled) */}
          {channels.includes('email') && schedule.followups > 0 && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 600 }}>
                <Icons.Send size={18} />
                Follow-up Delay (days between emails)
              </label>
              <input 
                className="input" 
                type="number" 
                min="1"
                max="30"
                value={schedule.followupDelay || 3} 
                onChange={(e)=>setSchedule({
                  ...schedule, 
                  followupDelay: Math.max(1, Math.min(30, Number(e.target.value) || 3))
                })} 
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Days to wait before sending each follow-up email (default: 3 days)
                {schedule.followups > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: 'var(--color-surface-secondary)', borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>Follow-up Schedule:</div>
                    <div style={{ fontSize: 12 }}>
                      <div>Initial email: Day 0 (immediate)</div>
                      {Array.from({ length: schedule.followups }, (_, i) => (
                        <div key={i}>
                          Follow-up {i + 1}: Day {(i + 1) * (schedule.followupDelay || 3)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Step - rendered based on stepType */}
      {currentStepInfo?.stepType === 'review' && (
        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Review Campaign</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 0 }}>
              Review all your campaign details before launching
            </p>
          </div>

          {/* Campaign Overview Card */}
          <div style={{
            background: 'var(--color-surface-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icons.Rocket size={20} style={{ color: '#4C67FF' }} />
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaign Overview</h4>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Campaign Name</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{name || 'Untitled Campaign'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Channels</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {channels.map((channel) => {
                    const Icon = CHANNEL_CONFIGS[channel]?.icon || Icons.Mail;
                    return (
                      <div key={channel} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: 'var(--color-surface)',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        <Icon size={14} />
                        {CHANNEL_CONFIGS[channel]?.label || channel}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Target Segments</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {segments.length > 0 ? (
                    <>
                      {segments.map((seg, idx) => {
                        const segData = segmentData.find(s => s.name === seg);
                        return (
                          <span key={seg}>
                            <strong>{seg}</strong> ({segData?.count || 0} leads){idx < segments.length - 1 ? ', ' : ''}
                          </span>
                        );
                      })}
                      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                        Total: {segments.reduce((total, seg) => {
                          const segData = segmentData.find(s => s.name === seg);
                          return total + (segData?.count || 0);
                        }, 0)} leads
                      </div>
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>No segments selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Email Configuration Card */}
          {channels.includes('email') && (
            <div style={{
              background: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icons.Mail size={20} style={{ color: '#4C67FF' }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Email Configuration</h4>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                {productService && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Product/Service</div>
                    <div style={{ fontSize: 14 }}>{productService}</div>
                  </div>
                )}
                {valueProposition && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Value Proposition</div>
                    <div style={{ fontSize: 14 }}>{valueProposition}</div>
                  </div>
                )}
                {callToAction && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Call-to-Action</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{callToAction}</div>
                  </div>
                )}
                {senderName && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Sender</div>
                    <div style={{ fontSize: 14 }}>
                      {senderName}{senderCompany ? ` at ${senderCompany}` : ''}
                    </div>
                  </div>
                )}
                {channels.includes('email') && messages && messages.length > 0 && selectedMessageIndices.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Email Templates</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedMessageIndices.map((idx) => {
                        const message = messages[idx];
                        if (!message) return null;
                        const { subject, body } = parseMessage(message);
                        return (
                          <div key={idx} style={{
                            background: 'var(--color-surface)',
                            borderRadius: 8,
                            padding: 12,
                            border: '1px solid var(--color-border)'
                          }}>
                            {subject && (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Subject</div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{subject}</div>
                              </div>
                            )}
                            {body && (
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Body</div>
                                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{body.substring(0, 200)}{body.length > 200 ? '...' : ''}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {channels.includes('whatsapp') && whatsAppMessages && whatsAppMessages.length > 0 && selectedWhatsAppMessageIndices.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>WhatsApp Templates</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedWhatsAppMessageIndices.map((idx) => {
                        const message = whatsAppMessages[idx];
                        if (!message) return null;
                        return (
                          <div key={idx} style={{
                            background: 'var(--color-surface)',
                            borderRadius: 8,
                            padding: 12,
                            border: '1px solid var(--color-border)'
                          }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Message</div>
                              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{message.substring(0, 200)}{message.length > 200 ? '...' : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {schedule.followups > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Follow-up Strategy</div>
                    <div style={{ fontSize: 14 }}>
                      {schedule.followups} follow-up email{schedule.followups !== 1 ? 's' : ''} with {schedule.followupDelay || 3} day{schedule.followupDelay !== 1 ? 's' : ''} delay between each
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LinkedIn Configuration Card */}
          {channels.includes('linkedin') && linkedInStepConfig && (
            <div style={{
              background: 'var(--color-surface-secondary)',
              borderRadius: 12,
              padding: 20,
              border: '1px solid var(--color-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icons.Linkedin size={20} style={{ color: '#4C67FF' }} />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>LinkedIn Configuration</h4>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Connection Type</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {linkedInStepConfig.action === 'invitation_only' 
                      ? 'Send invitation only (no message)'
                      : 'Send invitation with message'}
                  </div>
                </div>
                {linkedInStepConfig.action === 'invitation_with_message' && linkedInStepConfig.message && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Message</div>
                    <div style={{
                      background: 'var(--color-surface)',
                      borderRadius: 8,
                      padding: 12,
                      border: '1px solid var(--color-border)',
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6
                    }}>
                      {linkedInStepConfig.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {linkedInStepConfig.message.length} characters
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule & Settings Card */}
          <div style={{
            background: 'var(--color-surface-secondary)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icons.Calendar size={20} style={{ color: '#4C67FF' }} />
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Schedule & Settings</h4>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Start Date</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {schedule.start ? new Date(schedule.start).toLocaleString() : 'Not scheduled'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>End Date</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {schedule.end ? new Date(schedule.end).toLocaleString() : 'Not scheduled'}
                  </div>
                </div>
              </div>
              {schedule.start && schedule.end && campaignDays > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Campaign Duration</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {campaignDays} day{campaignDays !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {channels.includes('email') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--color-surface)',
                    borderRadius: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icons.Mail size={16} />
                      <span style={{ fontSize: 13 }}>Email Throttle</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{schedule.email?.throttle || 200} emails/day</span>
                  </div>
                )}
                {channels.includes('linkedin') && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--color-surface)',
                    borderRadius: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icons.Linkedin size={16} />
                      <span style={{ fontSize: 13 }}>LinkedIn Throttle</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{schedule.linkedin?.throttle || 100} invitations/day</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Safety & Completion Info */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
            borderRadius: 12,
            padding: 16,
            border: '1px solid rgba(76, 103, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icons.CheckCircle size={20} style={{ color: '#4C67FF', marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Safety & Automation</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  Your campaign will automatically respect rate limits, quiet hours, and stop sending when recipients reply. 
                  The campaign will complete when all leads receive messages on all selected channels.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        <div style={{ 
          display:'flex', 
          justifyContent:'space-between', 
          alignItems: 'center',
          marginTop: 40, 
          paddingTop: 32, 
          borderTop: '1px solid var(--elev-border)' 
        }}>
          <button 
            className="btn-ghost" 
            onClick={back}
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10
            }}
          >
            Back
          </button>
        {step < totalSteps ? (
          <button 
            className="btn-primary" 
            onClick={next} 
            disabled={!canProceedToNextStep({
              step,
              channels: channels as ChannelType[],
              channelConfigs: { linkedin_step: linkedInStepConfig },
              name,
              productService,
              whatsAppMessagesGenerated,
              selectedWhatsAppMessageIndices,
              valueProposition,
              callToAction,
              segments,
              schedule,
              followupsPreferenceSet,
              linkedInStepConfig: linkedInStepConfig || undefined,
              knowledgeBaseFiles,
              selectedVoiceId,
              initialPrompt,
              systemPersona
            })}
            style={{
              padding: '12px 32px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              minWidth: '120px'
            }}
          >
            Next
          </button>
        ) : (
          <button 
            className="btn-primary" 
            onClick={()=> setConfirmOpen(true)} 
            disabled={!name || channels.length===0 || segments.length === 0}
            style={{
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 10,
              minWidth: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: (!name || channels.length===0 || segments.length === 0) 
                ? undefined 
                : 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
              border: 'none',
              boxShadow: (!name || channels.length===0 || segments.length === 0)
                ? undefined
                : '0 4px 12px rgba(76, 103, 255, 0.3)',
              opacity: (!name || channels.length===0 || segments.length === 0) ? 0.6 : 1,
              cursor: (!name || channels.length===0 || segments.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            <Icons.Rocket size={18} />
            Launch Campaign
          </button>
        )}
        </div>
      </div>
    </div>

    {/* View Leads Modal */}
      {viewingSegment && (
        <>
          <style>{`
            .view-leads-modal-scroll::-webkit-scrollbar {
              width: 10px;
              height: 10px;
            }
            .view-leads-modal-scroll::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.05);
              border-radius: 5px;
            }
            .view-leads-modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.25);
              border-radius: 5px;
            }
            .view-leads-modal-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 0, 0, 0.4);
            }
          `}</style>
          <div 
            style={{ 
              position:'fixed', 
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:'rgba(0,0,0,.6)', 
              backdropFilter: 'blur(4px)',
              zIndex:1000, 
              display:'flex', 
              alignItems:'center',
              justifyContent:'center',
              padding: '20px',
              overflow: 'auto',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setViewingSegment(null);
                setViewingLeads([]);
              }
            }}
          >
            <div style={{ 
              width:'min(1100px, 96vw)', 
              maxWidth: '96vw',
              height: '90vh',
              maxHeight: '90vh',
              minHeight: '500px',
              background:'var(--elev-bg)', 
              borderRadius:16, 
              padding:0,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              margin: 'auto',
              position: 'relative',
              overflow: 'hidden'
            }}>
          <div style={{ 
            display:'flex', 
            justifyContent:'space-between', 
            alignItems:'center', 
            padding: '18px 22px',
            flexShrink: 0, 
            borderBottom: '1px solid var(--elev-border)',
            background: 'var(--elev-bg)',
            zIndex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(76, 103, 255, 0.12)',
                border: '1px solid rgba(76, 103, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icons.Users size={16} style={{ color: '#4C67FF' }} />
              </div>
              <div>
                <h3 style={{ margin:0, fontSize: 18, fontWeight: 700 }}>
                  {viewingSegment}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'var(--color-text-muted)', letterSpacing: '0.2px' }}>
                  {viewingLeads.length} lead{viewingLeads.length !== 1 ? 's' : ''} in this segment
                </p>
              </div>
            </div>
            <button 
              className="btn-ghost" 
              onClick={() => {
                setViewingSegment(null);
                setViewingLeads([]);
              }}
              style={{ 
                padding: '8px 10px', 
                fontSize: 13, 
                minWidth: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--elev-border)',
                borderRadius: 10,
                background: 'var(--color-surface-secondary)'
              }}
            >
              <Icons.X size={14} />
            </button>
          </div>

          <div 
            className="view-leads-modal-scroll"
            style={{ 
              flex: '1 1 0%',
              overflowY: 'auto',
              overflowX: 'auto',
              minHeight: 0,
              padding: '0 24px 24px 24px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(76, 103, 255, 0.4) rgba(0, 0, 0, 0.08)'
            }}
          >
              {viewingLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Icons.Mail size={48} style={{ opacity: 0.5 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No leads in this segment</div>
                  <div style={{ fontSize: 13 }}>
                    This segment will populate as leads are enriched and scored.
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: '820px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--elev-bg)', zIndex: 10, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>
                    <tr>
                      {['Name','Email','Phone','Company','Role','Score','Tier'].map((col) => (
                        <th key={col} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--elev-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingLeads.map((lead, idx) => {
                      const hasLinkedIn = hasLinkedInUrl(lead);
                      const isLinkedInChannel = channels.includes('linkedin');
                      const isDisabled = isLinkedInChannel && !hasLinkedIn;
                      
                      return (
                      <tr 
                        key={lead.id || idx}
                        style={{
                          background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
                          borderBottom: '1px solid var(--elev-border)',
                          transition: 'background 0.2s, transform 0.2s',
                          opacity: isDisabled ? 0.5 : 1,
                          filter: isDisabled ? 'blur(0.5px)' : 'none',
                          cursor: isDisabled ? 'not-allowed' : 'default',
                          position: 'relative'
                        }}
                        title={isDisabled ? 'This lead does not have a LinkedIn URL and cannot be used for LinkedIn campaigns' : ''}
                        onMouseEnter={(e) => {
                          if (!isDisabled) {
                            e.currentTarget.style.background = 'rgba(76, 103, 255, 0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)';
                        }}
                      >
                        <td style={{ padding: '14px', paddingLeft: isDisabled ? '44px' : '14px', position: 'relative' }}>
                          {isDisabled && (
                            <Icons.AlertCircle size={16} style={{ 
                              color: '#ffa726',
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              zIndex: 1
                            }} />
                          )}
                          <div>
                            {lead.first_name || lead.last_name 
                              ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                              : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                            {isDisabled && (
                              <div style={{ fontSize: 11, color: '#ffa726', marginTop: 4, fontWeight: 500 }}>
                                No LinkedIn URL
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.email ? getEmailDisplayText(getEmailInfo(lead.email, (lead as any).enrichment)) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.phone ? getPhoneInfo(lead.phone).normalized || lead.phone : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.company || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.role || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.score !== undefined && lead.score !== null ? (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: (lead.score || 0) > 80 ? 'rgba(76, 103, 255, 0.2)' : 
                                         (lead.score || 0) > 60 ? 'rgba(255, 167, 38, 0.2)' : 
                                         'rgba(128, 128, 128, 0.2)',
                              color: (lead.score || 0) > 80 ? '#4C67FF' : 
                                     (lead.score || 0) > 60 ? '#ffa726' : '#888',
                              fontWeight: 600,
                              fontSize: 12
                            }}>
                              {lead.score}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {lead.tier ? (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: lead.tier === 'Hot' ? 'rgba(255, 107, 107, 0.2)' : 
                                         lead.tier === 'Warm' ? 'rgba(255, 167, 38, 0.2)' : 
                                         'rgba(128, 128, 128, 0.2)',
                              color: lead.tier === 'Hot' ? '#ff6b6b' : 
                                     lead.tier === 'Warm' ? '#ffa726' : '#888',
                              fontWeight: 600,
                              fontSize: 12
                            }}>
                              {lead.tier}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                    </table>
                  </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {confirmOpen && (
        <div 
          style={{ 
            position:'fixed', 
            inset:0, 
            background:'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(4px)',
            zIndex:1000, 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center', 
            padding:20 
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmOpen(false);
            }
          }}
        >
          <div style={{ 
            width:'min(600px,96vw)', 
            maxHeight: '90vh',
            background:'var(--color-surface)', 
            border:'none',
            borderRadius:20, 
            padding:0,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--elev-border)',
              background: 'linear-gradient(135deg, rgba(76, 103, 255, 0.08) 0%, rgba(169, 76, 255, 0.08) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #4C67FF 0%, #A94CFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icons.Rocket size={20} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h3 style={{ 
                    margin:0, 
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--color-text)'
                  }}>
                    Confirm Launch
                  </h3>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: 13, 
                    color: 'var(--color-text-muted)' 
                  }}>
                    Review campaign details before launching
                  </p>
                </div>
              </div>
              <button 
                className="btn-ghost"
                onClick={() => setConfirmOpen(false)}
                style={{
                  padding: '8px',
                  minWidth: 'auto',
                  borderRadius: 8
                }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '24px 28px',
              overflowY: 'auto',
              flex: 1
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Campaign Overview */}
                <div style={{
                  padding: '16px',
                  borderRadius: 12,
                  background: 'var(--color-surface-secondary)',
                  border: '1px solid var(--elev-border)'
                }}>
                  <div style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: 'var(--color-text-muted)', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 12
                  }}>
                    Campaign Overview
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icons.Target size={16} style={{ color: '#4C67FF' }} />
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
                    </div>
                    <div style={{ 
                      fontSize: 13, 
                      color: 'var(--color-text-muted)',
                      marginLeft: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      {channels.map((ch, idx) => {
                        const ChannelIcon = CHANNEL_CONFIGS[ch]?.icon || Icons.Mail;
                        return (
                          <span key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {idx > 0 && <span style={{ margin: '0 4px' }}>+</span>}
                            <ChannelIcon size={14} />
                            <span style={{ textTransform: 'capitalize' }}>{ch}</span>
                          </span>
                        );
                      })}
                      {' → '}
                      {segments.length > 0 ? (
                        segments.length === 1 ? (
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            "{segments[0]}" ({segmentData.find(s => s.name === segments[0])?.count || 0} leads)
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                            {segments.length} segments ({segments.reduce((total, seg) => {
                              const segData = segmentData.find(s => s.name === seg);
                              return total + (segData?.count || 0);
                            }, 0)} total leads)
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#ef4444' }}>no segments</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Configuration Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Email Configuration */}
                  {channels.includes('email') && (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--elev-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Icons.Mail size={18} style={{ color: '#4C67FF' }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Email Configuration</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Provider</span>
                          {emailIntegration ? (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                              <Icons.CheckCircle size={14} />
                              {emailIntegration.provider === 'smtp' ? 'SMTP Connected' : 'SendGrid Connected'}
                              {emailIntegration.config?.from_email && (
                                <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                                  ({emailIntegration.config.from_email})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <Icons.AlertCircle size={14} />
                              Not connected
                            </span>
                          )}
                        </div>
                        {selectedMessageIndices.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Templates</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {selectedMessageIndices.length === 1 
                                ? '1 template selected'
                                : `${selectedMessageIndices.length} templates selected`
                              }
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Throttle</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{schedule.email?.throttle || 200}/day</span>
                        </div>
                        {schedule.followups > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Follow-ups</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {schedule.followups} (delay: {schedule.followupDelay || 3} days)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* LinkedIn Configuration */}
                  {channels.includes('linkedin') && linkedInStepConfig && (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--elev-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Icons.Linkedin size={18} style={{ color: '#0077b5' }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>LinkedIn Configuration</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Action</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {linkedInStepConfig.action === 'invitation_only' 
                              ? 'Connection invitation only'
                              : 'Connection invitation with message'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Throttle</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{schedule.linkedin?.throttle || 100}/day</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Configuration */}
                  {channels.includes('whatsapp') && selectedWhatsAppMessageIndices.length > 0 && (
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--elev-border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Icons.MessageCircle size={18} style={{ color: '#25D366' }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>WhatsApp Configuration</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Templates</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {selectedWhatsAppMessageIndices.length === 1 
                              ? '1 template selected'
                              : `${selectedWhatsAppMessageIndices.length} templates selected`
                            }
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Throttle</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{schedule.whatsapp?.throttle || 50}/day</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--elev-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Icons.Clock size={18} style={{ color: '#4C67FF' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Schedule</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Start</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {schedule.start ? new Date(schedule.start).toLocaleString() : 'Unscheduled'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>End</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {schedule.end ? new Date(schedule.end).toLocaleString() : 'Unscheduled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '20px 28px',
              borderTop: '1px solid var(--elev-border)',
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <button 
                className="btn-ghost" 
                onClick={()=> setConfirmOpen(false)}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={async () => {
                  if (launching) return;
                  if (channels.includes('linkedin')) {
                    // Check LinkedIn integration
                    try {
                      const data = await apiRequest(`/integrations/${activeBaseId}`);
                      const integrations = data?.integrations || [];
                      const linkedInIntegration = integrations.find((i: any) => i.provider === 'unipile_linkedin');
                      if (!linkedInIntegration) {
                        showWarning('LinkedIn required', 'Connect LinkedIn in Settings before launching LinkedIn campaigns.');
                        return;
                      }
                      
                      if (!linkedInStepConfig) {
                        showWarning('LinkedIn step', 'Configure your LinkedIn campaign step before launching.');
                        setShowLinkedInConfigModal(true);
                        return;
                      }
                    } catch (error) {
                      console.error('Failed to check LinkedIn integration:', error);
                      showError('LinkedIn check failed', 'Failed to verify LinkedIn integration. Please try again.');
                      return;
                    }
                  }
                  
                  setLaunching(true);
                  setIsLaunching(true); // Prevent auto-save during launch
                  try {
                    // If segments are empty in state, try to load them from the saved campaign first
                    let finalSegments: string[] = segments.length > 0 ? [...segments] : [];
                    if (finalSegments.length === 0 && draftCampaignId) {
                      try {
                        const savedCampaign = await apiRequest(`/campaigns/${draftCampaignId}`);
                        const savedConfig = savedCampaign?.campaign?.config || savedCampaign?.config || {};
                        if (savedConfig.segments && Array.isArray(savedConfig.segments) && savedConfig.segments.length > 0) {
                          console.log('[Campaign Launch] Loading segments from saved campaign:', savedConfig.segments);
                          finalSegments = [...savedConfig.segments];
                          setSegments(finalSegments); // Update state as well
                        }
                      } catch (error) {
                        console.error('[Campaign Launch] Failed to load segments from saved campaign:', error);
                      }
                    }
                    
                    // Validate segments before launching
                    if (finalSegments.length === 0) {
                      showWarning('Segments required', 'Select at least one segment before launching the campaign.');
                      setLaunching(false);
                      setIsLaunching(false);
                      return;
                    }
                    
                    // Determine tier_filter from segments
                    let tierFilter: string | undefined = undefined;
                    if (finalSegments.includes('Hot leads')) {
                      tierFilter = 'Hot';
                    } else if (finalSegments.includes('Warm leads')) {
                      tierFilter = 'Warm';
                    } else if (finalSegments.some((s: string) => s.includes('Cold'))) {
                      tierFilter = 'Cold';
                    }
                    
                    // Calculate total leads count using finalSegments
                    const totalLeads = finalSegments.reduce((total: number, seg: string) => {
                      const segData = segmentData.find(s => s.name === seg);
                      return total + (segData?.count || 0);
                    }, 0);
                    
                    // Build config object with all necessary fields
                    // Include all throttle settings for all selected channels
                    const config: any = {
                      schedule: {
                        start: schedule.launch_now ? null : (schedule.start || null),
                        end: schedule.launch_now ? null : (schedule.end || null),
                        launch_now: !!schedule.launch_now,
                        ...(channels.includes('email') && schedule.email ? { email: schedule.email } : {}),
                        ...(channels.includes('linkedin') && schedule.linkedin ? { linkedin: schedule.linkedin } : {}),
                        ...(channels.includes('whatsapp') && schedule.whatsapp ? { whatsapp: schedule.whatsapp } : {}),
                        ...(channels.includes('call') && schedule.call ? { call: schedule.call } : {}),
                        followups: schedule.followups || 0,
                        followupDelay: schedule.followupDelay || 3
                      },
                      segments: finalSegments, // Always include segments (validated above)
                      currentStep: step, // Save current step
                      // Preserve draft state
                      emailMessages: messages,
                      selectedEmailMessageIndices: selectedMessageIndices,
                      messagesGenerated: messagesGenerated,
                      whatsAppMessages: whatsAppMessages,
                      selectedWhatsAppMessageIndices: selectedWhatsAppMessageIndices,
                      whatsAppMessagesGenerated: whatsAppMessagesGenerated,
                      followupsPreferenceSet: followupsPreferenceSet,
                      showFollowupsNumberInput: showFollowupsNumberInput
                    };
                    
                    // Add email campaign details if email channel
                    if (channels.includes('email')) {
                      config.email = {
                        productService: productService || '',
                        valueProposition: valueProposition || '',
                        callToAction: callToAction || '',
                        senderName: senderName || '',
                        senderCompany: senderCompany || ''
                      };
                    }
                    
                    // Add LinkedIn campaign details if LinkedIn channel
                    if (channels.includes('linkedin')) {
                      config.linkedin = {
                        productService: productService || '',
                        valueProposition: valueProposition || '',
                        callToAction: callToAction || '',
                        senderName: senderName || '',
                        senderCompany: senderCompany || ''
                      };
                      
                      // Add LinkedIn step config if configured
                      if (linkedInStepConfig) {
                        config.linkedin_step = linkedInStepConfig;
                      }
                    }
                    
                    // Use existing draft or create new campaign
                    let campaignId = draftCampaignId;
                    
                    if (!campaignId) {
                      // Create new campaign
                      const campaignResponse = await apiRequest('/campaigns', {
                        method: 'POST',
                        body: JSON.stringify({
                          name: name || 'Untitled Campaign',
                          channel: channels[0] || 'email',
                          base_id: activeBaseId,
                          status: 'draft',
                          tier_filter: tierFilter,
                          leads: totalLeads,
                          channels: channels,
                          config: config
                        })
                      });
                      
                      campaignId = campaignResponse?.campaign?.id || campaignResponse?.id;
                      
                      if (!campaignId) {
                        throw new Error('Failed to create campaign');
                      }
                    } else {
                      // Update existing draft with final data
                      // Log segments before update for debugging
                      console.log('[Campaign Launch] Updating campaign with segments:', finalSegments, 'total:', finalSegments.length);
                      
                      const updateResponse = await apiRequest(`/campaigns/${campaignId}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                          name: name || 'Untitled Campaign',
                          channel: channels[0] || 'email',
                          status: 'draft',
                          tier_filter: tierFilter,
                          leads: totalLeads,
                          channels: channels,
                          config: config // Includes segments array
                        })
                      });
                      
                      // First, try to verify segments from the PUT response
                      let verifyConfig = updateResponse?.campaign?.config || updateResponse?.config || {};
                      let verifiedSegments = Array.isArray(verifyConfig.segments) ? verifyConfig.segments : [];
                      console.log('[Campaign Launch] Segments from PUT response:', verifiedSegments);
                      
                      // If segments are missing from PUT response, read back the campaign
                      if (verifiedSegments.length === 0 && finalSegments.length > 0) {
                        console.log('[Campaign Launch] Segments missing from PUT response, reading back campaign...');
                        // Add a small delay to ensure database write is complete
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const verifyResponse = await apiRequest(`/campaigns/${campaignId}`);
                        verifyConfig = verifyResponse?.campaign?.config || verifyResponse?.config || {};
                        verifiedSegments = Array.isArray(verifyConfig.segments) ? verifyConfig.segments : [];
                        console.log('[Campaign Launch] Verified segments after read-back:', verifiedSegments);
                      }
                      
                      // Final verification
                      if (verifiedSegments.length === 0 && finalSegments.length > 0) {
                        console.error('[Campaign Launch] ERROR: Segments were not saved properly!');
                        console.error('[Campaign Launch] Expected segments:', finalSegments);
                        console.error('[Campaign Launch] Received segments:', verifiedSegments);
                        console.error('[Campaign Launch] Full config:', JSON.stringify(verifyConfig, null, 2));
                        showError('Segments not saved', 'Select segments again, then launch.');
                        setLaunching(false);
                        setIsLaunching(false);
                        return;
                      }
                      
                      // Update segments in state if they differ (in case they were loaded from saved campaign)
                      if (JSON.stringify(verifiedSegments) !== JSON.stringify(finalSegments)) {
                        console.log('[Campaign Launch] Updating segments state to match saved:', verifiedSegments);
                        setSegments(verifiedSegments);
                        finalSegments = verifiedSegments;
                      }
                    }
                    
                    // Save selected message templates if email channel
                    if (channels.includes('email') && selectedMessageIndices.length > 0) {
                      // First, delete any existing email templates for this campaign to avoid duplicates
                      try {
                        const existingTemplates = await apiRequest(`/campaigns/${campaignId}/templates`);
                        if (existingTemplates?.templates && Array.isArray(existingTemplates.templates)) {
                          for (const template of existingTemplates.templates) {
                            if (template.channel === 'email') {
                              await apiRequest(`/campaigns/${campaignId}/templates/${template.id}`, {
                                method: 'DELETE'
                              });
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Failed to clear existing email templates:', error);
                      }

                      // Add new email templates
                      for (const idx of selectedMessageIndices) {
                        if (messages[idx]) {
                          const { subject, body } = parseMessage(messages[idx]);
                          await apiRequest(`/campaigns/${campaignId}/templates`, {
                            method: 'POST',
                            body: JSON.stringify({
                              channel: 'email',
                              content: messages[idx],
                              variables: {
                                first_name: true,
                                last_name: true,
                                company_name: true,
                                role: true,
                                industry: true
                              },
                              delay_days: idx === 0 ? 0 : (idx * (schedule.followupDelay || 3)) // First email immediate, follow-ups spaced
                            })
                          });
                        }
                      }
                    }
                    
                    // Save selected WhatsApp message templates if WhatsApp channel
                    if (channels.includes('whatsapp') && selectedWhatsAppMessageIndices.length > 0) {
                      // First, delete any existing WhatsApp templates for this campaign to avoid duplicates
                      try {
                        const existingTemplates = await apiRequest(`/campaigns/${campaignId}/templates`);
                        if (existingTemplates?.templates && Array.isArray(existingTemplates.templates)) {
                          for (const template of existingTemplates.templates) {
                            if (template.channel === 'whatsapp') {
                              await apiRequest(`/campaigns/${campaignId}/templates/${template.id}`, {
                                method: 'DELETE'
                              });
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Failed to clear existing WhatsApp templates:', error);
                      }

                      // Add new WhatsApp templates
                      for (const idx of selectedWhatsAppMessageIndices) {
                        if (whatsAppMessages[idx]) {
                          await apiRequest(`/campaigns/${campaignId}/templates`, {
                            method: 'POST',
                            body: JSON.stringify({
                              channel: 'whatsapp',
                              content: whatsAppMessages[idx],
                              variables: {
                                first_name: true,
                                last_name: true,
                                company_name: true,
                                role: true,
                                industry: true
                              },
                              delay_days: idx === 0 ? 0 : (idx * (schedule.followupDelay || 3)) // First message immediate, follow-ups spaced
                            })
                          });
                        }
                      }
                    }
                    
                    // Actually launch the campaign using the start endpoint
                    try {
                      await apiRequest(`/campaigns/${campaignId}/start`, {
                        method: 'POST',
                        body: JSON.stringify({
                          launch_now: schedule.launch_now || false,
                          schedule: {
                            start: schedule.start || null,
                            end: schedule.end || null,
                            launch_now: schedule.launch_now || false
                          }
                        })
                      });
                    } catch (error: any) {
                      // If launch fails, show detailed error message
                      console.error('Failed to launch campaign:', error);
                      const errorMessage = error?.response?.data?.error || error?.message || 'Campaign created but failed to launch.';
                      const errorDetails = error?.response?.data?.details;
                      
                      if (errorDetails && errorDetails.leadsWithPhone === 0) {
                        // Specific error for no phone numbers
                        showError('Call campaign', `${errorMessage}\n\nFound ${errorDetails.totalLeadsInSegments} lead(s) in selected segments, but none have valid phone numbers. Add phone numbers before launching a call campaign.`);
                      } else {
                        showError('Launch failed', errorMessage + (errorDetails ? `\n\nDetails: ${JSON.stringify(errorDetails)}` : ''));
                      }
                      
                      // Don't navigate if it's a validation error (user should fix it)
                      if (error?.response?.status === 400) {
                        return; // Stay on the page so user can fix the issue
                      }
                    }
                    
                    // Navigate to campaigns page
                    router.push('/campaigns');
                  } catch (error: any) {
                    console.error('Failed to launch campaign:', error);
                    showError('Launch failed', error?.message || 'Failed to launch campaign. Please try again.');
                  } finally {
                    setLaunching(false);
                    setIsLaunching(false); // Re-enable auto-save
                  }
                }}
                disabled={(channels.includes('linkedin') && !linkedInStepConfig) || launching}
                style={{
                  padding: '12px 28px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: '140px',
                  justifyContent: 'center'
                }}
              >
                {launching ? (
                  <>
                    <Icons.Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Launching...
                  </>
                ) : (
                  <>
                    <Icons.Rocket size={16} />
                    Launch Campaign
                  </>
                )}
              </button>
            </div>

            {/* Test Call Section for Call Campaigns */}
            {channels.includes('call') && draftCampaignId && (
              <div style={{
                marginTop: 24,
                padding: 20,
                background: 'rgba(76, 103, 255, 0.05)',
                borderRadius: 12,
                border: '1px solid rgba(76, 103, 255, 0.2)'
              }}>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: 0, marginBottom: 4, fontSize: 16, fontWeight: 600 }}>
                    Test Call Before Launch
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Test your call campaign with a single phone number before launching to all leads
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {testCallSuccess && (
                    <div style={{
                      padding: 16,
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: 8,
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Icons.Check size={20} style={{ color: '#22c55e' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
                          Test call initiated successfully!
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        The call has been placed. You can now launch the campaign when ready, or make another test call.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                        Phone Number *
                      </label>
                      <input
                        className="input"
                        type="tel"
                        placeholder="+1234567890"
                        value={testCallPhoneNumber}
                        onChange={(e) => setTestCallPhoneNumber(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                        First Name (Optional)
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="John"
                        value={testCallFirstName}
                        onChange={(e) => setTestCallFirstName(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    {testCallError && (
                      <div style={{
                        padding: 12,
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: 13,
                        color: '#ef4444'
                      }}>
                        {testCallError}
                      </div>
                    )}
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        if (!testCallPhoneNumber.trim()) {
                          setTestCallError('Phone number is required');
                          return;
                        }
                        setTestingCall(true);
                        setTestCallError(null);
                        try {
                          await apiRequest(`/campaigns/${draftCampaignId}/test-call`, {
                            method: 'POST',
                            body: JSON.stringify({
                              phoneNumber: testCallPhoneNumber.trim(),
                              firstName: testCallFirstName.trim() || undefined
                            })
                          });
                          setTestCallSuccess(true);
                          setTestCallError(null);
                        } catch (error: any) {
                          setTestCallError(error?.message || 'Failed to initiate test call. Please try again.');
                          setTestCallSuccess(false);
                        } finally {
                          setTestingCall(false);
                        }
                      }}
                      disabled={testingCall || !testCallPhoneNumber.trim()}
                      style={{
                        padding: '10px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      {testingCall ? (
                        <>
                          <Icons.Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Icons.Phone size={16} />
                          Test Call
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {channels.includes('email') && !emailIntegration && (
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                background: 'rgba(255, 167, 38, 0.1)', 
                borderRadius: 8,
                fontSize: 13,
                color: '#ffa726',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Icons.AlertCircle size={16} />
                No email integration connected in Settings. Backend may still use SMTP env fallback.
              </div>
            )}
            {channels.includes('linkedin') && !linkedInStepConfig && (
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                background: 'rgba(255, 167, 38, 0.1)', 
                borderRadius: 8,
                fontSize: 13,
                color: '#ffa726',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Icons.AlertCircle size={16} />
                Please configure your LinkedIn campaign step before launching.
              </div>
            )}
          </div>
        </div>
      )}

      {/* LinkedIn Step Configuration Modal */}
      {showLinkedInConfigModal && activeBaseId && (
        <LinkedInStepConfigModal
          baseId={activeBaseId}
          sampleLead={leads.find(l => {
            const enrichment = (l as any).enrichment;
            if (!enrichment) return false;
            return enrichment.apollo_data?.linkedin_url || 
                   enrichment.person_data?.linkedin_url ||
                   enrichment.linkedin_url;
          }) || undefined}
          productService={productService}
          valueProposition={valueProposition}
          callToAction={callToAction}
          senderName={senderName}
          senderCompany={senderCompany}
          onClose={() => setShowLinkedInConfigModal(false)}
          onSave={(config) => {
            setLinkedInStepConfig(config);
            setShowLinkedInConfigModal(false);
            // Continue to next step after saving - use step flow calculator
            const updatedConfig = { linkedin_step: config };
            const currentStepInfo = getStepInfo(step, channels as ChannelType[], updatedConfig);
            
            if (currentStepInfo) {
              // Find the next step in the flow
              const flow = calculateStepFlow(channels as ChannelType[], updatedConfig);
              const currentIndex = flow.findIndex(s => s.stepNumber === step);
              if (currentIndex >= 0 && currentIndex < flow.length - 1) {
                setStep(flow[currentIndex + 1].stepNumber as Step);
              } else {
                // Fallback: just increment
                setStep((s) => Math.min(totalSteps, (s + 1)) as Step);
              }
            }
          }}
        />
      )}
    </>
  );
}

function LinkedInStepConfigModal({
  baseId,
  sampleLead,
  productService,
  valueProposition,
  callToAction,
  senderName,
  senderCompany,
  onClose,
  onSave
}: {
  baseId: number;
  sampleLead?: Lead;
  productService?: string;
  valueProposition?: string;
  callToAction?: string;
  senderName?: string;
  senderCompany?: string;
  onClose: () => void;
  onSave: (config: { action: "invitation_only" | "invitation_with_message"; message?: string; templates?: string[] }) => void;
}) {
  const { showWarning } = useNotification();
  const [action, setAction] = useState<"invitation_only" | "invitation_with_message">("invitation_only");
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);
  const [generatingTemplates, setGeneratingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [linkedInIntegration, setLinkedInIntegration] = useState<any>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(true);

  // Fetch LinkedIn integration to get account type
  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        setLoadingIntegration(true);
        const data = await apiRequest(`/integrations/${baseId}`);
        const integrations = data?.integrations || [];
        const linkedIn = integrations.find((i: any) => i.provider === "unipile_linkedin");
        setLinkedInIntegration(linkedIn);
      } catch (error) {
        console.error("Failed to fetch LinkedIn integration:", error);
      } finally {
        setLoadingIntegration(false);
      }
    };
    fetchIntegration();
  }, [baseId]);

  // Get limit description based on account type
  const getLimitDescription = () => {
    const accountType = linkedInIntegration?.config?.linkedin_account_type;
    if (!accountType) return null;

    if (accountType === "premium" || accountType === "sales_navigator" || accountType === "recruiter") {
      return "Up to 80-100 connection invitations per day (with or without message)";
    } else if (accountType === "free_basic") {
      if (action === "invitation_with_message") {
        return "Up to 5 connection invitations per month (with message)";
      } else {
        return "Up to 150 connection invitations per month (without message)";
      }
    }
    return null;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          width: "100%",
          maxWidth: "500px",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>LinkedIn Campaign Step</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        <p style={{ marginBottom: 20, color: "var(--color-text-muted)", fontSize: 14 }}>
          What do you want to do using LinkedIn?
        </p>

        {/* LinkedIn Account Limits Warning */}
        {linkedInIntegration?.config?.linkedin_account_type && (
          <div style={{
            marginBottom: 20,
            padding: 12,
            background: "rgba(255, 167, 38, 0.1)",
            borderRadius: 8,
            border: "1px solid rgba(255, 167, 38, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Icons.AlertCircle size={20} style={{ color: "#ffa726", marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: "#ffa726" }}>
                  LinkedIn Platform Limits
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  Account Type: <strong>{linkedInIntegration.config.linkedin_account_type === 'free_basic' ? 'Free / Basic' :
                    linkedInIntegration.config.linkedin_account_type === 'premium' ? 'Premium' :
                    linkedInIntegration.config.linkedin_account_type === 'sales_navigator' ? 'Sales Navigator' :
                    linkedInIntegration.config.linkedin_account_type === 'recruiter' ? 'Recruiter / Recruiter Lite' :
                    linkedInIntegration.config.linkedin_account_type}</strong>
                </div>
                {getLimitDescription() && (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                    <strong>Limit:</strong> {getLimitDescription()}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  We respect LinkedIn's platform rules and will automatically enforce these limits to protect your account.
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
          <label style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: 12, 
            cursor: "pointer",
            padding: 16,
            borderRadius: 12,
            border: action === "invitation_only" ? '2px solid #4C67FF' : '1px solid var(--color-border)',
            background: action === "invitation_only" ? 'rgba(76, 103, 255, 0.1)' : 'var(--color-surface-secondary)',
            transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              checked={action === "invitation_only"}
              onChange={() => setAction("invitation_only")}
              style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Send only a connection invitation</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Send a connection request without a message
              </div>
            </div>
          </label>

          <label style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: 12, 
            cursor: "pointer",
            padding: 16,
            borderRadius: 12,
            border: action === "invitation_with_message" ? '2px solid #4C67FF' : '1px solid var(--color-border)',
            background: action === "invitation_with_message" ? 'rgba(76, 103, 255, 0.1)' : 'var(--color-surface-secondary)',
            transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              checked={action === "invitation_with_message"}
              onChange={() => setAction("invitation_with_message")}
              style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Send a message along with the connection invitation</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Include a personalized message with your connection request
              </div>
            </div>
          </label>
        </div>

        {action === "invitation_with_message" && (
          <div style={{ marginBottom: 20 }}>
            {templates.length === 0 && !generatingTemplates && (
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    if (!sampleLead) {
                      showWarning('LinkedIn URLs', 'Add leads with LinkedIn URLs to generate personalized templates.');
                      return;
                    }
                    const enrichment = (sampleLead as any).enrichment;
                    const linkedInUrl = enrichment?.apollo_data?.linkedin_url || 
                                      enrichment?.person_data?.linkedin_url ||
                                      enrichment?.linkedin_url;
                    if (!linkedInUrl) {
                      showWarning('LinkedIn URL', "Selected lead doesn't have a LinkedIn URL.");
                      return;
                    }
                    
                    setGeneratingTemplates(true);
                    setTemplateError(null);
                    try {
                      const response = await apiRequest("/campaigns/generate-linkedin-templates", {
                        method: "POST",
                        body: JSON.stringify({
                          toProfileUrl: linkedInUrl,
                          baseId: baseId,
                          lead: sanitizeLeadForAPI(sampleLead),
                          productService: productService || undefined,
                          valueProposition: valueProposition || undefined,
                          callToAction: callToAction || undefined,
                          senderName: senderName || undefined,
                          senderCompany: senderCompany || undefined,
                        }),
                      });
                      
                      if (response.templates && response.templates.length > 0) {
                        setTemplates(response.templates);
                      } else {
                        setTemplateError("No templates generated. Please try again.");
                      }
                    } catch (error: any) {
                      console.error("Failed to generate templates:", error);
                      setTemplateError(error.message || "Failed to generate templates. You can still enter a custom message.");
                    } finally {
                      setGeneratingTemplates(false);
                    }
                  }}
                  disabled={!sampleLead}
                  style={{ 
                    width: "100%", 
                    padding: '12px 24px', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    borderRadius: '10px',
                    marginBottom: 12
                  }}
                >
                  {sampleLead ? (
                    <>
                      <Icons.Sparkles size={16} style={{ marginRight: 6 }} />
                      Generate AI Templates
                    </>
                  ) : (
                    <>
                      <Icons.AlertCircle size={16} style={{ marginRight: 6 }} />
                      Add leads with LinkedIn URLs to generate templates
                    </>
                  )}
                </button>
                {!sampleLead && (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>
                    Templates will be personalized based on your leads' LinkedIn profiles
                  </div>
                )}
              </div>
            )}

            {generatingTemplates && (
              <div style={{ 
                padding: 20, 
                textAlign: "center", 
                background: "var(--color-surface-secondary)", 
                borderRadius: 12,
                marginBottom: 16
              }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Sparkles size={16} style={{ color: '#4C67FF' }} />
                  Generating personalized templates...
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Analyzing profile and recent activity
                </div>
              </div>
            )}

            {templateError && (
              <div style={{ 
                padding: 12, 
                background: "rgba(239, 68, 68, 0.1)", 
                borderRadius: 8,
                color: "#ef4444",
                fontSize: 13,
                marginBottom: 16
              }}>
                {templateError}
              </div>
            )}

            {templates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                  Select a template (or enter custom message below):
                </label>
                <div style={{ display: "grid", gap: 8 }}>
                  {templates.map((template, index) => (
                    <label
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        cursor: "pointer",
                        padding: 12,
                        borderRadius: 8,
                        border: selectedTemplateIndex === index ? '2px solid #4C67FF' : '1px solid var(--color-border)',
                        background: selectedTemplateIndex === index ? 'rgba(76, 103, 255, 0.1)' : 'var(--color-surface-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        checked={selectedTemplateIndex === index}
                        onChange={() => {
                          setSelectedTemplateIndex(index);
                          setMessage(template);
                        }}
                        style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, fontSize: 13 }}>
                        {template}
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                          {template.length}/200 characters
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setTemplates([]);
                    setSelectedTemplateIndex(null);
                    setMessage("");
                  }}
                  style={{ 
                    marginTop: 8, 
                    padding: '8px 16px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    borderRadius: '8px'
                  }}
                >
                  Generate new templates
                </button>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: 14 }}>
                {templates.length > 0 ? "Or enter custom message:" : "Message *"}
              </label>
              <span style={{ 
                fontSize: 12, 
                color: message.length > 200 ? "#ef4444" : message.length > 180 ? "#ffa726" : "var(--color-text-muted)",
                fontWeight: message.length > 180 ? 600 : 400
              }}>
                {message.length}/200
              </span>
            </div>
            <textarea
              className="input"
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setMessage(e.target.value);
                  setSelectedTemplateIndex(null);
                }
              }}
              placeholder="Hi {{first_name}}, I'd like to connect..."
              rows={4}
              maxLength={200}
              style={{ 
                width: "100%", 
                fontFamily: 'inherit',
                borderColor: message.length > 200 ? "#ef4444" : message.length > 180 ? "#ffa726" : undefined
              }}
            />
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
              You can use variables like {"{{first_name}}"}, {"{{company_name}}"}, etc.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', borderRadius: '10px' }}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (action === "invitation_with_message") {
                if (!message.trim()) {
                  showWarning('Message required', 'Please enter a message.');
                  return;
                }
                if (message.length > 200) {
                  showWarning('Message too long', 'Message cannot exceed 200 characters.');
                  return;
                }
              }
              onSave({
                action,
                message: action === "invitation_with_message" ? message : undefined,
                templates: templates.length > 0 ? templates : undefined,
              });
            }}
            style={{ 
              padding: '12px 24px', 
              fontSize: '14px', 
              fontWeight: '600', 
              borderRadius: '10px'
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
