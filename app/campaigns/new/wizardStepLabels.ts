import type { StepType } from "./channelConfig";

/** Short labels for the circular stepper (plain language). */
export const WIZARD_STEP_SHORT_LABEL: Record<StepType, string> = {
  basic_setup: "Name & channels",
  core_details_part1: "Your Offer",
  core_details_part2: "Select leads",
  email_followup_preferences: "Email follow-ups",
  email_templates: "Email drafts",
  linkedin_message_type: "LinkedIn type",
  linkedin_templates: "LinkedIn note",
  whatsapp_templates: "WhatsApp",
  call_knowledge_base: "Call knowledge",
  call_voice_selection: "Voice",
  call_initial_prompt: "Opening",
  call_system_persona: "Assistant style",
  schedule: "Schedule",
  review: "Review",
  launch: "Launch",
};
