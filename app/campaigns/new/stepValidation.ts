import { StepType, ChannelType } from './channelConfig';
import { getStepInfo } from './stepFlowCalculator';

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
  schedule?: {
    start?: string;
    end?: string;
  };
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
    case 'basic_setup':
      return !!(context.name && context.channels.length > 0);
    
    case 'core_details_part1':
      return !!(context.productService && context.valueProposition && context.callToAction);
    
    case 'core_details_part2':
      return !!(context.segments && context.segments.length > 0);
    
    case 'email_followup_preferences':
      return context.followupsPreferenceSet === true;
    
    case 'linkedin_message_type':
      return !!context.linkedInStepConfig;
    
    case 'linkedin_templates':
      if (context.linkedInStepConfig?.action === 'invitation_with_message') {
        return !!context.linkedInStepConfig.message;
      }
      return true;
    
    case 'whatsapp_templates':
      return !!(context.whatsAppMessagesGenerated && context.selectedWhatsAppMessageIndices && context.selectedWhatsAppMessageIndices.length > 0);
    
    case 'call_knowledge_base':
      return !!(context.knowledgeBaseFiles && context.knowledgeBaseFiles.length > 0);
    
    case 'call_voice_selection':
      return !!context.selectedVoiceId;
    
    case 'call_initial_prompt':
      return !!context.initialPrompt && context.initialPrompt.trim().length > 0;
    
    case 'call_system_persona':
      return !!context.systemPersona && context.systemPersona.trim().length > 0;
    
    case 'schedule':
      if (!context.schedule?.start || !context.schedule?.end) {
        return false;
      }
      const startDate = new Date(context.schedule.start);
      const endDate = new Date(context.schedule.end);
      return endDate > startDate;
    
    case 'review':
      return true; // Review step is always valid
    
    default:
      return true; // Default to allowing progression for unknown steps
  }
}

/**
 * Get validation error message for the current step
 */
export function getValidationError(context: ValidationContext): string | null {
  const { step, channels, channelConfigs } = context;
  const stepInfo = getStepInfo(step, channels, channelConfigs);
  
  if (!stepInfo) return 'Invalid step';

  switch (stepInfo.stepType) {
    case 'basic_setup':
      if (!context.name) return 'Campaign name is required';
      if (context.channels.length === 0) return 'Please select at least one channel';
      return null;
    
    case 'core_details_part1':
      if (!context.productService) return 'Product/Service is required';
      if (!context.valueProposition) return 'Value Proposition is required';
      if (!context.callToAction) return 'Call-to-Action is required';
      return null;
    
    case 'core_details_part2':
      if (!context.segments || context.segments.length === 0) {
        return 'Please select at least one segment';
      }
      return null;
    
    case 'email_followup_preferences':
      if (context.followupsPreferenceSet !== true) {
        return 'Please set your follow-up preferences';
      }
      return null;
    
    case 'linkedin_message_type':
      if (!context.linkedInStepConfig) {
        return 'Please configure your LinkedIn message type';
      }
      return null;
    
    case 'linkedin_templates':
      if (context.linkedInStepConfig?.action === 'invitation_with_message' && !context.linkedInStepConfig.message) {
        return 'Please enter a LinkedIn message';
      }
      return null;
    
    case 'whatsapp_templates':
      if (!context.whatsAppMessagesGenerated) {
        return 'Please generate WhatsApp message templates';
      }
      if (!context.selectedWhatsAppMessageIndices || context.selectedWhatsAppMessageIndices.length === 0) {
        return 'Please select at least one WhatsApp message template';
      }
      return null;
    
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
    
    case 'schedule':
      if (!context.schedule?.start) return 'Start date is required';
      if (!context.schedule?.end) return 'End date is required';
      if (context.schedule.start && context.schedule.end) {
        const startDate = new Date(context.schedule.start);
        const endDate = new Date(context.schedule.end);
        if (endDate <= startDate) {
          return 'End date must be after start date';
        }
      }
      return null;
    
    default:
      return null;
  }
}

