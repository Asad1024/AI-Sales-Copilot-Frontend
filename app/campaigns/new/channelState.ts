/**
 * Channel-specific state management types
 * Each channel can have its own configuration state
 */

export interface EmailChannelState {
  followups: number;
  followupDelay: number;
  templates: string[];
  selectedTemplateIndices: number[];
}

export interface LinkedInChannelState {
  action: 'invitation_only' | 'invitation_with_message';
  message?: string;
  templates?: string[];
}

export interface WhatsAppChannelState {
  templates: string[];
  selectedTemplateIndices: number[];
}

export interface CallChannelState {
  script: string;
  callDuration: number; // in minutes
  callType: 'outbound' | 'inbound';
}

export interface ChannelState {
  email?: EmailChannelState;
  linkedin?: LinkedInChannelState;
  whatsapp?: WhatsAppChannelState;
  call?: CallChannelState;
}

/**
 * Default state for each channel
 */
export const DEFAULT_CHANNEL_STATES: ChannelState = {
  email: {
    followups: 0,
    followupDelay: 3,
    templates: [],
    selectedTemplateIndices: [0]
  },
  linkedin: {
    action: 'invitation_only'
  },
  whatsapp: {
    templates: [],
    selectedTemplateIndices: [0]
  },
  call: {
    script: '',
    callDuration: 15,
    callType: 'outbound'
  }
};

