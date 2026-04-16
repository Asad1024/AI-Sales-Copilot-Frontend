import { Icons } from "@/components/ui/Icons";

export type ChannelType = 'email' | 'linkedin' | 'whatsapp' | 'call';

export type StepType = 
  | 'basic_setup'
  | 'core_details_part1'
  | 'core_details_part2'
  | 'email_followup_preferences'
  | 'email_templates'
  | 'linkedin_message_type'
  | 'linkedin_templates'
  | 'whatsapp_templates'
  | 'call_knowledge_base'
  | 'call_voice_selection'
  | 'call_initial_prompt'
  | 'call_system_persona'
  | 'schedule'
  | 'review';

export interface ChannelStep {
  stepType: StepType;
  channel: ChannelType;
  required: boolean;
  conditional?: (config: any) => boolean; // Dynamic condition
  order: number; // Order within channel
}

export interface ChannelConfig {
  id: ChannelType;
  label: string;
  /** Short line for campaign wizard channel cards (step 1). */
  wizardCardDescription: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  steps: ChannelStep[];
  requiresIntegration?: boolean;
  integrationProvider?: string;
  maxThrottle?: number | ((accountType?: string, action?: string) => number);
  throttleKey?: string; // Key for schedule state (e.g., 'email', 'linkedin')
}

export interface ChannelConfigs {
  [key: string]: ChannelConfig;
}

export const CHANNEL_CONFIGS: ChannelConfigs = {
  email: {
    id: 'email',
    label: 'Email',
    wizardCardDescription: 'Best open rates',
    icon: Icons.Mail,
    requiresIntegration: true,
    integrationProvider: 'resend',
    maxThrottle: 100,
    throttleKey: 'email',
    steps: [
      { stepType: 'email_followup_preferences', channel: 'email', required: true, order: 1 },
      { stepType: 'email_templates', channel: 'email', required: true, order: 2 },
    ]
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    wizardCardDescription: 'B2B professionals',
    icon: Icons.Linkedin,
    requiresIntegration: true,
    integrationProvider: 'unipile_linkedin',
    maxThrottle: (accountType?: string, action?: string) => {
      if (['premium', 'sales_navigator', 'recruiter'].includes(accountType || '')) {
        return 100; // Daily limit for premium
      }
      // Free accounts: monthly limits, calculate daily average
      const monthlyLimit = action === 'invitation_with_message' ? 5 : 150;
      return Math.max(1, Math.floor(monthlyLimit / 30)); // At least 1 per day
    },
    throttleKey: 'linkedin',
    steps: [
      { 
        stepType: 'linkedin_message_type', 
        channel: 'linkedin', 
        required: true, 
        order: 1 
      },
      { 
        stepType: 'linkedin_templates', 
        channel: 'linkedin', 
        required: false, 
        order: 2,
        conditional: (config) => config.linkedin_step?.action === 'invitation_with_message'
      },
    ]
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    wizardCardDescription: 'High response rate',
    icon: Icons.MessageCircle,
    requiresIntegration: true,
    integrationProvider: 'unipile_whatsapp',
    maxThrottle: 100,
    throttleKey: 'whatsapp',
    steps: [
      { stepType: 'whatsapp_templates', channel: 'whatsapp', required: true, order: 1 },
    ]
  },
  call: {
    id: 'call',
    label: 'Call',
    wizardCardDescription: 'Direct & personal',
    icon: Icons.Phone,
    requiresIntegration: true,
    integrationProvider: 'twilio',
    maxThrottle: 100,
    throttleKey: 'call',
    steps: [
      { stepType: 'call_knowledge_base', channel: 'call', required: true, order: 1 },
      { stepType: 'call_voice_selection', channel: 'call', required: true, order: 2 },
      { stepType: 'call_initial_prompt', channel: 'call', required: true, order: 3 },
      { stepType: 'call_system_persona', channel: 'call', required: true, order: 4 },
    ]
  }
};

// Common steps that appear for all channels (in order)
export const COMMON_STEPS: StepType[] = [
  'basic_setup',
  'core_details_part1',
  'core_details_part2',
  'schedule',
  'review'
];

// Get channel config by ID
export function getChannelConfig(channelId: ChannelType): ChannelConfig | undefined {
  return CHANNEL_CONFIGS[channelId];
}

// Get all available channels
export function getAvailableChannels(): ChannelConfig[] {
  return Object.values(CHANNEL_CONFIGS);
}

// Check if a channel requires integration
export function channelRequiresIntegration(channelId: ChannelType): boolean {
  const config = getChannelConfig(channelId);
  return config?.requiresIntegration || false;
}

// Get integration provider for a channel
export function getChannelIntegrationProvider(channelId: ChannelType): string | undefined {
  const config = getChannelConfig(channelId);
  return config?.integrationProvider;
}

