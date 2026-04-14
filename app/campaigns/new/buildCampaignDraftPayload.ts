import { getEmailInfo } from "@/utils/emailNormalization";

export type DraftLead = {
  id: number;
  email?: string;
  score?: number;
  tier?: string;
  enrichment?: unknown;
};

export type ScheduleState = {
  start: string;
  end: string;
  launch_now?: boolean;
  timezone?: string;
  email?: { throttle: number };
  linkedin?: { throttle: number };
  whatsapp?: { throttle: number };
  call?: { throttle: number };
  followups: number;
  followupDelay?: number;
};

export type LinkedInStepConfig = {
  action: "invitation_only" | "invitation_with_message";
  message?: string;
  templates?: string[];
};

export type BuildCampaignDraftPayloadInput = {
  currentStep: number;
  name: string;
  channels: string[];
  segments: string[];
  schedule: ScheduleState;
  messages: string[];
  selectedMessageIndices: number[];
  messagesGenerated: boolean;
  whatsAppMessages: string[];
  selectedWhatsAppMessageIndices: number[];
  whatsAppMessagesGenerated: boolean;
  followupsPreferenceSet: boolean;
  showFollowupsNumberInput: boolean;
  productService: string;
  valueProposition: string;
  callToAction: string;
  senderName: string;
  senderCompany: string;
  linkedInStepConfig: LinkedInStepConfig | null;
  selectedVoiceId: string;
  initialPrompt: string;
  systemPersona: string;
  knowledgeBaseFiles: Array<{ id: string; name: string }>;
  leads: DraftLead[];
  hasLinkedInUrl: (lead: DraftLead) => boolean;
  /** When non-null, campaign targets exactly these lead IDs (wizard partial selection). Null = use segments only. */
  targetLeadIds?: number[] | null;
};

function tierFilterFromSegments(segments: string[]): string | undefined {
  if (segments.includes("Hot leads")) return "Hot";
  if (segments.includes("Warm leads")) return "Warm";
  if (segments.some((s) => s.includes("Cold"))) return "Cold";
  return undefined;
}

function getSegmentLeadsFiltered(
  segmentName: string,
  leads: DraftLead[],
  channels: string[],
  hasLinkedInUrl: (lead: DraftLead) => boolean
): DraftLead[] {
  let segmentLeads: DraftLead[] = [];

  switch (segmentName) {
    case "Hot leads":
      segmentLeads = leads.filter((l) => l.tier === "Hot");
      break;
    case "Warm leads":
      segmentLeads = leads.filter((l) => l.tier === "Warm");
      break;
    case "Cold leads":
      segmentLeads = leads.filter((l) => {
        const t = l.tier;
        return t === "Cold" || t == null || t === "";
      });
      break;
    case "Engaged not converted":
      segmentLeads = leads.filter(
        (l) => (l.tier === "Hot" || l.tier === "Warm") && (l.score || 0) >= 75
      );
      break;
    case "Never opened":
      segmentLeads = leads.filter((l) => (l.score || 0) < 65);
      break;
    case "High-score low-engagement":
      segmentLeads = leads.filter((l) => (l.score || 0) >= 90 && l.tier !== "Hot");
      break;
    default:
      segmentLeads = [];
  }

  if (channels.includes("email")) {
    segmentLeads = segmentLeads.filter((lead) => {
      if (!lead.email) return false;
      const emailInfo = getEmailInfo(lead.email, (lead as any).enrichment);
      return emailInfo.isValid && !emailInfo.isMasked;
    });
  }

  if (channels.includes("linkedin")) {
    segmentLeads = segmentLeads.filter(hasLinkedInUrl);
  }

  return segmentLeads;
}

function getSegmentLeadsCount(
  segmentName: string,
  leads: DraftLead[],
  channels: string[],
  hasLinkedInUrl: (lead: DraftLead) => boolean
): number {
  return getSegmentLeadsFiltered(segmentName, leads, channels, hasLinkedInUrl).length;
}

export function buildCampaignDraftPayload(
  input: BuildCampaignDraftPayloadInput
): { campaignPayload: Record<string, unknown>; tierFilter: string | undefined } {
  const {
    currentStep,
    name,
    channels,
    segments,
    schedule,
    messages,
    selectedMessageIndices,
    messagesGenerated,
    whatsAppMessages,
    selectedWhatsAppMessageIndices,
    whatsAppMessagesGenerated,
    followupsPreferenceSet,
    showFollowupsNumberInput,
    productService,
    valueProposition,
    callToAction,
    senderName,
    senderCompany,
    linkedInStepConfig,
    selectedVoiceId,
    initialPrompt,
    systemPersona,
    knowledgeBaseFiles,
    leads,
    hasLinkedInUrl,
    targetLeadIds: targetLeadIdsInput,
  } = input;

  const tierFilter = tierFilterFromSegments(segments);
  const targetLeadIds = targetLeadIdsInput !== undefined ? targetLeadIdsInput : null;

  const totalLeads = (() => {
    if (targetLeadIds !== null) {
      if (targetLeadIds.length === 0) return 0;
      const leadIdSet = new Set(leads.map((l) => l.id));
      return targetLeadIds.filter((id) => leadIdSet.has(id)).length;
    }
    const ids = new Set<number>();
    for (const seg of segments) {
      getSegmentLeadsFiltered(seg, leads, channels, hasLinkedInUrl).forEach((l) => ids.add(l.id));
    }
    return ids.size;
  })();

  const config: Record<string, unknown> = {
    /** Redundant with top-level `channels` so PUT merge always persists multi-channel selection. */
    channels,
    currentStep,
    schedule: {
      start: schedule.launch_now ? null : schedule.start || null,
      end: schedule.end || null,
      launch_now: !!schedule.launch_now,
      ...(schedule.timezone?.trim() ? { timezone: schedule.timezone.trim() } : {}),
      ...(channels.includes("email") && schedule.email ? { email: schedule.email } : {}),
      ...(channels.includes("linkedin") && schedule.linkedin ? { linkedin: schedule.linkedin } : {}),
      ...(channels.includes("whatsapp") && schedule.whatsapp ? { whatsapp: schedule.whatsapp } : {}),
      ...(channels.includes("call") && schedule.call ? { call: schedule.call } : {}),
      followups: schedule.followups || 0,
      followupDelay: schedule.followupDelay || 3,
    },
    segments,
    emailMessages: messages,
    selectedEmailMessageIndices: selectedMessageIndices,
    messagesGenerated,
    whatsAppMessages,
    selectedWhatsAppMessageIndices: selectedWhatsAppMessageIndices,
    whatsAppMessagesGenerated,
    followupsPreferenceSet,
    showFollowupsNumberInput,
    target_lead_ids: targetLeadIds,
  };

  if (channels.includes("email")) {
    config.email = {
      productService: productService || "",
      valueProposition: valueProposition || "",
      callToAction: callToAction || "",
      senderName: senderName || "",
      senderCompany: senderCompany || "",
    };
  }

  if (channels.includes("linkedin")) {
    config.linkedin = {
      productService: productService || "",
      valueProposition: valueProposition || "",
      callToAction: callToAction || "",
      senderName: senderName || "",
      senderCompany: senderCompany || "",
    };
    if (linkedInStepConfig) {
      config.linkedin_step = linkedInStepConfig;
    }
  }

  if (channels.includes("call")) {
    config.call = {
      knowledgeBaseFiles: knowledgeBaseFiles.map((f) => ({ id: f.id, name: f.name })),
      selectedVoiceId: selectedVoiceId || "",
      firstPrompt: initialPrompt,
      systemPersona,
    };
    if (selectedVoiceId) config.selectedVoiceId = selectedVoiceId;
    config.firstPrompt = initialPrompt;
    config.systemPersona = systemPersona;
  }

  const campaignPayload: Record<string, unknown> = {
    name: name || "Untitled Campaign",
    channel: channels[0] || "email",
    status: "draft",
    tier_filter: tierFilter,
    leads: totalLeads,
    channels,
    config,
  };

  if (channels.includes("call")) {
    campaignPayload.selectedVoiceId = selectedVoiceId || "";
    campaignPayload.firstPrompt = initialPrompt;
    campaignPayload.systemPersona = systemPersona;
  }

  return { campaignPayload, tierFilter };
}
