import type { StepType } from "./channelConfig";

export interface WizardPhaseBanner {
  /** Short label shown in the progress header (which part of the wizard you’re in). */
  phaseLabel: string;
  /** One line under the header so users know this step is not a repeat of the last screen. */
  phaseHint: string;
}

const DEFAULT: WizardPhaseBanner = {
  phaseLabel: "Campaign",
  phaseHint: "",
};

const BY_STEP: Record<StepType, WizardPhaseBanner> = {
  basic_setup: {
    phaseLabel: "Campaign setup",
    phaseHint:
      "Name your campaign and pick channels. Each channel gets its own steps after this.",
  },
  core_details_part1: {
    phaseLabel: "Your Offer",
    phaseHint:
      "Your answers are used to generate personalized AI messages across all channels.",
  },
  core_details_part2: {
    phaseLabel: "Campaign setup",
    phaseHint: "Choose which leads to include in this campaign.",
  },
  email_followup_preferences: {
    phaseLabel: "Email",
    phaseHint: "Next: how this campaign uses email—including follow-up sends.",
  },
  email_templates: {
    phaseLabel: "Email",
    phaseHint:
      "My saved templates (Templates page) or AI drafts for this campaign—pick, edit, then continue.",
  },
  linkedin_message_type: {
    phaseLabel: "LinkedIn",
    phaseHint:
      "Next: how this campaign uses LinkedIn connection requests.",
  },
  linkedin_templates: {
    phaseLabel: "LinkedIn",
    phaseHint:
      "Saved LinkedIn notes from your library, or AI options from setup—short invite text only (not email).",
  },
  whatsapp_templates: {
    phaseLabel: "WhatsApp",
    phaseHint:
      "Saved WhatsApp templates from your library, or AI drafts—same as email: pick what to send.",
  },
  call_knowledge_base: {
    phaseLabel: "AI calls",
    phaseHint: "Next: what the calling assistant is allowed to know from files.",
  },
  call_voice_selection: {
    phaseLabel: "AI calls",
    phaseHint: "Choose the voice callers will hear.",
  },
  call_initial_prompt: {
    phaseLabel: "AI calls",
    phaseHint: "How the assistant opens the phone conversation.",
  },
  call_system_persona: {
    phaseLabel: "AI calls",
    phaseHint: "Tone and rules for the assistant for the rest of the call.",
  },
  schedule: {
    phaseLabel: "Schedule",
    phaseHint: "When to start and how fast to send or call.",
  },
  review: {
    phaseLabel: "Review",
    phaseHint: "Check everything before you launch.",
  },
};

export function getWizardPhaseBanner(stepType: StepType | undefined): WizardPhaseBanner {
  if (!stepType) return DEFAULT;
  return BY_STEP[stepType] ?? DEFAULT;
}
