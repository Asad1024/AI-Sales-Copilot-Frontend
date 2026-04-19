import { StepType, ChannelType } from './channelConfig';
import { getStepInfo } from './stepFlowCalculator';

export const CAMPAIGN_NAME_MAX_LENGTH = 60;

/** Max distinct leads that can be included in a single campaign (wizard lead step). */
export const CAMPAIGN_WIZARD_MAX_LEADS = 30;

function trimmedCampaignName(name: string | undefined): string {
  return (name ?? '').trim();
}

/** Inline errors for the campaign name field (step 1). */
export function getBasicSetupCampaignNameError(name: string | undefined): string | null {
  const t = trimmedCampaignName(name);
  if (t.length === 0) return 'Campaign name is required';
  if (t.length > CAMPAIGN_NAME_MAX_LENGTH) {
    return `Use at most ${CAMPAIGN_NAME_MAX_LENGTH} characters`;
  }
  return null;
}

/** Parse email template for validation (aligned with campaign wizard `parseMessage` rules). */
function parseEmailTemplateForValidation(raw: string): { subject: string; body: string } {
  let message = (raw ?? '').trim();
  if (!message) return { subject: '', body: '' };

  if (message.startsWith('Subject:')) {
    const parts = message.split('\n\n');
    if (parts.length >= 2) {
      const subject = parts[0].replace(/^Subject:\s*/i, '').trim();
      const body = parts.slice(1).join('\n\n').trim();
      return { subject, body };
    }
    const subject = message.replace(/^Subject:\s*/i, '').trim();
    return { subject, body: '' };
  }
  return { subject: '', body: message };
}

function isValidEmailTemplateContent(raw: string): boolean {
  const { subject, body } = parseEmailTemplateForValidation(raw);
  if (raw.trim().startsWith('Subject:')) {
    return subject.length > 0 && body.length > 0;
  }
  return body.length > 0;
}

export interface ValidationContext {
  step: number;
  channels: ChannelType[];
  channelConfigs: Record<string, any>;
  // Common fields
  name?: string;
  productService?: string;
  valueProposition?: string;
  callToAction?: string;
  segments?: string[];
  /** Distinct selected leads on the lead step (wizard); used for 30-lead cap. */
  selectedLeadCount?: number;
  schedule?: {
    start?: string;
    end?: string;
    launch_now?: boolean;
    timezone?: string;
    followups?: number;
  };
  /** Email template step: raw template strings (Subject:/body) */
  messages?: string[];
  selectedMessageIndices?: number[];
  // Channel-specific fields
  followupsPreferenceSet?: boolean;
  linkedInStepConfig?: {
    action?: 'invitation_only' | 'invitation_with_message';
    message?: string;
  };
  whatsAppMessagesGenerated?: boolean;
  selectedWhatsAppMessageIndices?: number[];
  knowledgeBaseFiles?: any[];
  selectedVoiceId?: string;
  initialPrompt?: string;
  systemPersona?: string;
  /** Raw WhatsApp draft strings (same order as cards on the WhatsApp step) */
  whatsAppMessages?: string[];
}

function isWhatsAppTemplatesStepValid(context: ValidationContext): boolean {
  const indices = context.selectedWhatsAppMessageIndices ?? [];
  const msgs = context.whatsAppMessages ?? [];
  if (indices.length !== 1) return false;
  const i = indices[0];
  if (typeof i !== "number" || i < 0 || i >= msgs.length) return false;
  if (!(msgs[i] ?? "").trim()) return false;
  return true;
}

/**
 * Validate if the current step can proceed to the next step
 */
export function canProceedToNextStep(context: ValidationContext): boolean {
  const { step, channels, channelConfigs } = context;
  const stepInfo = getStepInfo(step, channels, channelConfigs);
  
  if (!stepInfo) return false;

  // Common validations
  switch (stepInfo.stepType) {
    case 'basic_setup': {
      const t = trimmedCampaignName(context.name);
      return (
        t.length > 0 &&
        t.length <= CAMPAIGN_NAME_MAX_LENGTH &&
        context.channels.length > 0
      );
    }
    
    case 'core_details_part1':
      return !!(context.productService && context.valueProposition && context.callToAction);
    
    case 'core_details_part2':
      return !!(context.segments && context.segments.length > 0);
    
    case 'email_followup_preferences':
      return context.followupsPreferenceSet === true;

    case 'email_templates': {
      if (!context.channels.includes('email')) return true;
      const followups = context.schedule?.followups ?? 0;
      const need = 1 + followups;
      const msgs = context.messages ?? [];
      const selected = context.selectedMessageIndices ?? [];
      if (msgs.length < need) return false;
      for (let i = 0; i < need; i++) {
        if (!isValidEmailTemplateContent(msgs[i])) return false;
      }
      for (let i = 0; i < need; i++) {
        if (!selected.includes(i)) return false;
      }
      return true;
    }
    
    case 'linkedin_message_type':
      return !!context.linkedInStepConfig;
    
    case 'linkedin_templates':
      if (context.linkedInStepConfig?.action === 'invitation_with_message') {
        return !!(context.linkedInStepConfig.message && context.linkedInStepConfig.message.trim().length > 0);
      }
      return true;
    
    case 'whatsapp_templates':
      // Allow either AI-generated drafts or user-edited sample messages — must have ≥1 selected non-empty body
      return isWhatsAppTemplatesStepValid(context);
    
    case 'call_knowledge_base':
      return !!(context.knowledgeBaseFiles && context.knowledgeBaseFiles.length > 0);
    
    case 'call_voice_selection':
      return !!context.selectedVoiceId;
    
    case 'call_initial_prompt':
      return !!context.initialPrompt && context.initialPrompt.trim().length > 0;
    
    case 'call_system_persona':
      return !!context.systemPersona && context.systemPersona.trim().length > 0;
    
    case 'schedule': {
      if (!context.schedule?.end) return false;
      const endDate = new Date(context.schedule.end);
      if (context.schedule.launch_now) {
        return endDate > new Date();
      }
      if (!context.schedule.start) return false;
      const startDate = new Date(context.schedule.start);
      return endDate > startDate;
    }
    
    case 'review':
      return true; // Review step is always valid

    case 'launch':
      return true;
    
    default:
      return true; // Default to allowing progression for unknown steps
  }
}

/**
 * When jumping forward from `fromStep` to `toStep`, each step in
 * `[fromStep, toStep)` must allow Next — same gates as pressing Next repeatedly.
 * Returns the first blocking step number, or `null` if the jump is allowed.
 */
export function getFirstBlockingStepForForwardJump(
  fromStep: number,
  toStep: number,
  base: ValidationContext
): number | null {
  if (toStep <= fromStep) return null;
  for (let s = fromStep; s < toStep; s++) {
    const ctx = { ...base, step: s };
    if (!canProceedToNextStep(ctx)) return s;
    const stepInfo = getStepInfo(s, base.channels, base.channelConfigs);
    if (
      stepInfo?.stepType === 'core_details_part2' &&
      (base.selectedLeadCount ?? 0) > CAMPAIGN_WIZARD_MAX_LEADS
    ) {
      return s;
    }
  }
  return null;
}

/**
 * Get validation error message for the current step
 */
export function getValidationError(context: ValidationContext): string | null {
  const { step, channels, channelConfigs } = context;
  const stepInfo = getStepInfo(step, channels, channelConfigs);
  
  if (!stepInfo) return 'Invalid step';

  switch (stepInfo.stepType) {
    case 'basic_setup': {
      const t = trimmedCampaignName(context.name);
      if (t.length === 0) return 'Campaign name is required';
      if (t.length > CAMPAIGN_NAME_MAX_LENGTH) {
        return `Campaign name must be ${CAMPAIGN_NAME_MAX_LENGTH} characters or fewer`;
      }
      if (context.channels.length === 0) return 'Please select at least one channel';
      return null;
    }
    
    case 'core_details_part1':
      if (!context.productService) return 'Product/Service is required';
      if (!context.valueProposition) return 'Value Proposition is required';
      if (!context.callToAction) return 'Call-to-Action is required';
      return null;
    
    case 'core_details_part2':
      if ((context.selectedLeadCount ?? 0) > CAMPAIGN_WIZARD_MAX_LEADS) {
        return `You can include at most ${CAMPAIGN_WIZARD_MAX_LEADS} leads per campaign. Remove some leads before continuing.`;
      }
      if (!context.segments || context.segments.length === 0) {
        return 'Please select at least one lead';
      }
      return null;
    
    case 'email_followup_preferences':
      if (context.followupsPreferenceSet !== true) {
        return 'Please set your follow-up preferences';
      }
      return null;

    case 'email_templates': {
      if (!context.channels.includes('email')) return null;
      const followups = context.schedule?.followups ?? 0;
      const need = 1 + followups;
      const msgs = context.messages ?? [];
      const selected = context.selectedMessageIndices ?? [];
      if (msgs.length < need) {
        return `Need ${need} email template(s) (initial + follow-ups). Regenerate or adjust follow-up count.`;
      }
      for (let i = 0; i < need; i++) {
        if (!isValidEmailTemplateContent(msgs[i])) {
          return `Email ${i + 1}: add a subject and body (or a non-empty body if not using Subject:).`;
        }
      }
      for (let i = 0; i < need; i++) {
        if (!selected.includes(i)) {
          return `Select all required email templates (initial + each follow-up).`;
        }
      }
      return null;
    }
    
    case 'linkedin_message_type':
      if (!context.linkedInStepConfig) {
        return 'Please configure your LinkedIn message type';
      }
      return null;
    
    case 'linkedin_templates':
      if (
        context.linkedInStepConfig?.action === 'invitation_with_message' &&
        !context.linkedInStepConfig.message?.trim()
      ) {
        return 'Please enter a LinkedIn connection message';
      }
      return null;
    
    case 'whatsapp_templates': {
      const indices = context.selectedWhatsAppMessageIndices ?? [];
      const msgs = context.whatsAppMessages ?? [];
      if (indices.length === 0) {
        return "Select one WhatsApp suggestion (click a card).";
      }
      if (indices.length > 1) {
        return "Select only one WhatsApp message for this campaign.";
      }
      const i = indices[0];
      if (typeof i !== "number" || i < 0 || i >= msgs.length) {
        return "Your selection doesn’t match the current messages. Try Regenerate drafts or pick another card.";
      }
      if (!(msgs[i] ?? "").trim()) {
        return `Suggestion ${i + 1} is empty. Edit the message or pick another suggestion.`;
      }
      return null;
    }
    
    case 'call_knowledge_base':
      if (!context.knowledgeBaseFiles || context.knowledgeBaseFiles.length === 0) {
        return 'Please upload at least one knowledge base file';
      }
      return null;
    
    case 'call_voice_selection':
      if (!context.selectedVoiceId) {
        return 'Please select a voice for your call campaign';
      }
      return null;
    
    case 'call_initial_prompt':
      if (!context.initialPrompt || context.initialPrompt.trim().length === 0) {
        return 'Please enter an initial prompt for your call agent';
      }
      return null;
    
    case 'call_system_persona':
      if (!context.systemPersona || context.systemPersona.trim().length === 0) {
        return 'Please enter a system persona for your call agent';
      }
      return null;
    
    case 'schedule': {
      if (!context.schedule?.end) return 'End date is required';
      const endDate = new Date(context.schedule.end);
      if (context.schedule.launch_now) {
        if (endDate <= new Date()) {
          return 'End date must be in the future';
        }
        return null;
      }
      if (!context.schedule?.start) return 'Start date is required';
      const startDate = new Date(context.schedule.start);
      if (endDate <= startDate) {
        return 'End date must be after start date';
      }
      return null;
    }
    
    default:
      return null;
  }
}

