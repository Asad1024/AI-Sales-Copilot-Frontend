"use client";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, getToken } from "@/lib/apiClient";
import { API_BASE } from "@/lib/api";
import { useBase } from "@/context/BaseContext";
import { useBaseStore } from "@/stores/useBaseStore";
import { getEmailInfo, getEmailDisplayText } from "@/utils/emailNormalization";
import { getPhoneInfo } from "@/utils/phoneNormalization";
import { Icons } from "@/components/ui/Icons";
import {
  RefreshCw,
  UserPlus,
  MessageCircle,
  FileText,
  Play,
  Pause,
  Calendar,
  Clock,
  Minus,
  Plus,
  ChevronDown,
  ArrowRight,
  Check,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Rocket,
  Sparkles,
} from "lucide-react";
import { ChannelType, CHANNEL_CONFIGS, getAvailableChannels, type StepType } from "./channelConfig";
import { calculateStepFlow, getStepInfo, getTotalSteps, getStepNumberForType } from "./stepFlowCalculator";
import {
  canProceedToNextStep,
  getFirstBlockingStepForForwardJump,
  getValidationError,
  CAMPAIGN_NAME_MAX_LENGTH,
  CAMPAIGN_WIZARD_MAX_LEADS,
  getBasicSetupCampaignNameError,
  type ValidationContext,
} from "./stepValidation";
import { useNotification } from "@/context/NotificationContext";
import { buildCampaignDraftPayload } from "./buildCampaignDraftPayload";
import {
  campaignScheduleFieldToUtcIso,
  formatScheduleWindowMs,
} from "@/lib/campaignScheduleUtc";
import {
  filterChannelsForWorkspaceOwnerPlan,
  isEmailOnlyWorkspacePlan,
} from "@/lib/subscriptionPlanCaps";
import { getWizardPhaseBanner } from "./wizardStepUi";
import { WizardCircularStepper } from "./WizardCircularStepper";
import { WizardEmailDraftCard } from "@/components/campaigns/WizardEmailDraftCard";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";

const LeadDrawer = dynamic(() => import("@/components/leads/LeadDrawer"), { ssr: false });

type Step = number;

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
  enrichment?: unknown;
  /** CSV / base columns — LinkedIn is often stored here if not mapped to system LinkedIn URL */
  custom_fields?: Record<string, unknown>;
}

const LINKEDIN_PROFILE_PATH_RE = /linkedin\.com\/(in|sales|pub)\//i;

function parseLeadEnrichmentObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function linkedInUrlFromEnrichmentBlob(enrichment: Record<string, unknown> | null): string | null {
  if (!enrichment) return null;
  const apollo = enrichment.apollo_data as { linkedin_url?: string } | undefined;
  const person = enrichment.person_data as { linkedin_url?: string } | undefined;
  const top = enrichment.linkedin_url;
  const candidates = [apollo?.linkedin_url, person?.linkedin_url, typeof top === "string" ? top : null];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/** Same rules as backend `getLinkedInUrl` plus custom_fields and string JSON enrichment */
function getLinkedInUrlFromLead(lead: Lead): string | null {
  const enrichment = parseLeadEnrichmentObject(lead.enrichment);
  const fromEnrichment = linkedInUrlFromEnrichmentBlob(enrichment);
  if (fromEnrichment) return fromEnrichment;

  const cf = lead.custom_fields;
  if (cf && typeof cf === "object") {
    for (const v of Object.values(cf)) {
      if (typeof v === "string" && v.trim() && LINKEDIN_PROFILE_PATH_RE.test(v)) {
        return v.trim();
      }
    }
  }
  return null;
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

/** Lead merge fields — matches backend `replaceVariables` (template.service) */
const CAMPAIGN_TEMPLATE_VARIABLES = [
  "{{first_name}}",
  "{{last_name}}",
  "{{full_name}}",
  "{{company_name}}",
  "{{company}}",
  "{{role}}",
  "{{industry}}",
  "{{region}}",
  "{{sender_name}}",
  "{{sender_company}}",
  "{{product_service}}",
  "{{value_proposition}}",
  "{{call_to_action}}",
] as const;

function insertTokenInField(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  currentValue: string,
  token: string,
  applyNext: (next: string) => void,
  options?: { maxLength?: number }
) {
  let start: number;
  let end: number;
  if (el && typeof el.selectionStart === "number" && document.activeElement === el) {
    start = el.selectionStart;
    end = el.selectionEnd ?? start;
  } else if (el && typeof el.selectionStart === "number") {
    start = el.selectionStart;
    end = el.selectionEnd ?? start;
  } else {
    start = end = currentValue.length;
  }
  let next = currentValue.slice(0, start) + token + currentValue.slice(end);
  if (options?.maxLength !== undefined && next.length > options.maxLength) {
    next = next.slice(0, options.maxLength);
  }
  applyNext(next);
  requestAnimationFrame(() => {
    if (!el || !document.body.contains(el)) return;
    el.focus();
    const pos = Math.min(start + token.length, next.length);
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  });
}

function WizardEditVariableRow({
  tokens,
  onInsert,
  hint = "Click in a field above, then insert.",
}: {
  tokens: readonly string[];
  onInsert: (token: string) => void;
  hint?: string;
}) {
  return (
    <div style={{ flexShrink: 0, marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--elev-border)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6 }}>{hint}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tokens.map((tok) => (
          <button
            key={tok}
            type="button"
            className="btn-ghost"
            onClick={() => onInsert(tok)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {tok}
          </button>
        ))}
      </div>
    </div>
  );
}

const EMAIL_TONE_OPTIONS = ["Formal", "Casual", "Friendly", "Persuasive", "Short & punchy"] as const;
type EmailDraftTone = (typeof EMAIL_TONE_OPTIONS)[number];

function emailDraftBadgeLabel(i: number): string {
  return i === 0 ? "Initial Email" : `Follow-up ${i}`;
}

function emailSelectionSummaryPhrase(indices: number[]): string {
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  if (sorted.length === 0) return "No drafts selected";
  const hasInitial = sorted.includes(0);
  const nFu = sorted.filter((x) => x > 0).length;
  if (hasInitial && nFu === 0) return "✓ Initial Email ready to send";
  if (hasInitial && nFu === 1) return "✓ Initial Email + 1 follow-up ready to send";
  if (hasInitial && nFu > 1) return `✓ Initial Email + ${nFu} follow-ups ready to send`;
  if (!hasInitial && nFu === 1) return "✓ 1 follow-up ready to send";
  if (!hasInitial && nFu > 1) return `✓ ${nFu} follow-ups ready to send`;
  return "✓ Drafts ready to send";
}

/** Single status line under AI draft cards: count + selection (avoids duplicating both). */
function aiEmailDraftsUnifiedSummary(messageCount: number, selectedIndices: number[]): string {
  if (messageCount <= 0) return "";
  if (selectedIndices.length > 0) {
    return emailSelectionSummaryPhrase(selectedIndices);
  }
  if (messageCount === 1) {
    return "1 draft (initial only). Select which emails to send.";
  }
  const nFu = messageCount - 1;
  return `${messageCount} drafts (1 initial + ${nFu} follow-up${nFu !== 1 ? "s" : ""}). Select which emails to send.`;
}

function whatsAppDraftBadgeLabel(i: number): string {
  return `Suggestion ${i + 1}`;
}

function whatsAppSelectionSummaryPhrase(indices: number[]): string {
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  if (sorted.length === 0) return "No suggestion selected";
  if (sorted.length === 1) {
    const i = sorted[0];
    return `✓ ${whatsAppDraftBadgeLabel(i)} selected for this campaign`;
  }
  return "Select only one WhatsApp suggestion.";
}

function aiWhatsAppDraftsUnifiedSummary(messageCount: number, selectedIndices: number[]): string {
  if (messageCount <= 0) return "";
  if (selectedIndices.length > 0) {
    return whatsAppSelectionSummaryPhrase(selectedIndices);
  }
  if (messageCount === 1) {
    return "1 AI suggestion. Click a card to select it for this campaign.";
  }
  return `${messageCount} AI suggestions. Pick one message to use for this campaign.`;
}

function countEmailWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function librarySelectionSummaryPhrase(templateCount: number): string {
  if (templateCount === 0) return "";
  if (templateCount === 1) return "✓ 1 template ready to send";
  return `✓ ${templateCount} templates ready to send`;
}

type LeadTableFilterKey =
  | "all"
  | "hot"
  | "warm"
  | "cold"
  | "never_opened"
  | "engaged"
  | "high_score";

const LEAD_TABLE_PAGE_SIZE = 10;

/** Lead step table + filter — match workspace leads table checkbox sizing */
const WIZARD_LEAD_STEP_CHECKBOX_COL_W = 50;
const WIZARD_LEAD_STEP_CHECKBOX_STYLE: CSSProperties = {
  width: 18,
  height: 18,
  cursor: "pointer",
  margin: 0,
  flexShrink: 0,
  accentColor: "var(--color-primary)",
};

function filterLeadsByLeadTableKey(list: Lead[], key: LeadTableFilterKey): Lead[] {
  if (key === "all") return list;
  const sc = (l: Lead) => l.score ?? 0;
  switch (key) {
    case "hot":
      return list.filter((l) => l.tier === "Hot");
    case "warm":
      return list.filter((l) => l.tier === "Warm");
    case "cold":
      return list.filter((l) => {
        const t = l.tier;
        return t === "Cold" || t == null || t === "";
      });
    case "never_opened":
      return list.filter((l) => sc(l) < 65);
    case "engaged":
      return list.filter(
        (l) => (l.tier === "Hot" || l.tier === "Warm") && sc(l) >= 75
      );
    case "high_score":
      return list.filter((l) => sc(l) >= 90 && l.tier !== "Hot");
    default:
      return list;
  }
}

/** Call-step KB: must match backend `KNOWLEDGE_SUGGESTIONS` ids */
const KB_SUGGESTIONS = [
  { id: "sales_playbook", label: "Sales playbook & objections", hint: "Positioning, pricing, rebuttals" },
  { id: "banking_finance", label: "Banking & finance", hint: "Accounts, cards, transfers" },
  { id: "saas_support", label: "SaaS product support", hint: "Billing, onboarding, bugs" },
  { id: "healthcare", label: "Healthcare & appointments", hint: "Scheduling, patient info" },
  { id: "real_estate", label: "Real estate inquiries", hint: "Listings, viewings, leads" },
  { id: "custom_business", label: "General business FAQ", hint: "Services, hours, pitch" },
] as const;

/** Step 11 — call opening: insertable variables (tooltip shows sample value). */
const CALL_OPENING_VARIABLES = [
  { key: "first_name", example: "Sarah" },
  { key: "last_name", example: "Johnson" },
  { key: "company_name", example: "TechCorp Inc" },
  { key: "role", example: "CTO" },
  { key: "industry", example: "Software" },
  { key: "product_service", example: "our AI platform" },
  { key: "value_proposition", example: "automate 80% of their workflows" },
  { key: "call_to_action", example: "scheduling a free consultation" },
  { key: "sender_name", example: "Alex Rivera" },
  { key: "sender_company", example: "Acme Sales" },
] as const;

const CALL_STARTER_SCRIPTS = [
  {
    title: "Warm Introduction",
    description: "Friendly intro referencing their company and industry, soft ask for time.",
    text: "Hello {{first_name}}! This is {{sender_name}} from {{sender_company}}. I noticed {{company_name}} is doing great work in {{industry}}. Do you have a moment to discuss how {{product_service}} could help {{value_proposition}}?",
  },
  {
    title: "Value-First Approach",
    description: "Lead with outcomes and your offer, then invite a quick conversation.",
    text: "Hi {{first_name}}! I'm reaching out from {{sender_company}} because we help companies like {{company_name}} {{value_proposition}} using {{product_service}}. Would you be open to a quick discussion about {{call_to_action}}?",
  },
  {
    title: "Personal Connection",
    description: "Speaks to their role and how similar teams benefited.",
    text: "Hello {{first_name}}! My name is {{sender_name}} and I work with {{role}}s at companies like {{company_name}}. We've helped similar organizations {{value_proposition}} through {{product_service}}. Could we explore {{call_to_action}} together?",
  },
] as const;

/** Assistant style (call system persona) — one-click briefs sent to AI to draft the full system prompt. */
const CALL_SYSTEM_PERSONA_SUGGESTIONS: ReadonlyArray<{
  id: string;
  label: string;
  brief: string;
}> = [
  {
    id: "consultative",
    label: "Consultative B2B seller",
    brief:
      "Generate a system prompt for a consultative B2B sales voice assistant: build rapport, ask discovery questions, explain value clearly, handle objections calmly, and move toward a demo or qualified next step. Professional, never pushy.",
  },
  {
    id: "friendly_sdr",
    label: "Friendly SDR — book meetings",
    brief:
      "Generate a system prompt for an energetic but respectful SDR: short sentences, warm tone, qualify quickly, handle brush-offs, and aim to book a short follow-up or meeting. Sound natural on the phone.",
  },
  {
    id: "enterprise_formal",
    label: "Formal enterprise AE",
    brief:
      "Generate a system prompt for a formal enterprise account executive: measured pace, precise language, respect for time, senior stakeholders, and careful handling of objections and compliance.",
  },
  {
    id: "discovery_first",
    label: "Discovery-first, no hard pitch",
    brief:
      "Generate a system prompt for a discovery-first call: prioritize understanding pain, budget, timing, and stakeholders before pitching; summarize back what you heard; avoid aggressive closing.",
  },
  {
    id: "support_style",
    label: "Patient, support-style helper",
    brief:
      "Generate a system prompt for a patient, support-oriented voice assistant: clarify confusion, answer questions simply, escalate when needed, and keep the prospect comfortable even if they are skeptical.",
  },
  {
    id: "reactivation",
    label: "Win-back / reactivation",
    brief:
      "Generate a system prompt for a win-back or reactivation call: acknowledge time passed, reference value gently, invite an honest conversation, handle 'not interested' gracefully, and offer a low-friction next step.",
  },
];

function countWordsForCallOpening(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function estimateSpeakSecondsFromWords(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round((wordCount / 150) * 60));
}

function previewCallOpeningWithSamples(text: string): string {
  return text
    .replace(/\{\{first_name\}\}/g, "Sarah")
    .replace(/\{\{last_name\}\}/g, "Johnson")
    .replace(/\{\{company_name\}\}/g, "TechCorp Inc")
    .replace(/\{\{company\}\}/g, "TechCorp Inc")
    .replace(/\{\{role\}\}/g, "CTO")
    .replace(/\{\{industry\}\}/g, "Software")
    .replace(/\{\{region\}\}/g, "Dubai")
    .replace(/\{\{sender_name\}\}/g, "Alex Rivera")
    .replace(/\{\{sender_company\}\}/g, "Spark AI")
    .replace(/\{\{product_service\}\}/g, "our AI platform")
    .replace(/\{\{value_proposition\}\}/g, "automate 80% of their workflows")
    .replace(/\{\{call_to_action\}\}/g, "scheduling a free consultation");
}

function formatKbFileSize(bytes: number | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseKbQuestionLabel(raw: string): { title: string; optional: boolean } {
  const optional = /\(optional\)\s*$/i.test(raw);
  const title = raw.replace(/\s*\(optional\)\s*$/i, "").trim();
  return { title, optional };
}

function kbQuestionPlaceholder(question: string, _index: number): string {
  const q = question.toLowerCase();
  if (/product|service|sell|deliver|company sell/.test(q)) {
    return "Describe what you offer in plain language (e.g. types of accounts, SKUs, or packages)…";
  }
  if (/objection/.test(q)) {
    return "List common objections and how you want the agent to respond…";
  }
  if (/pricing|packaging|plans/.test(q)) {
    return "What can the agent say about pricing, trials, or packaging rules…";
  }
  if (/tone/.test(q)) {
    return "e.g. Consultative and calm, or short and direct…";
  }
  if (/compliance|disclaimer/.test(q)) {
    return "Required phrases or compliance notes the agent must mention…";
  }
  if (/pain point|frustration/.test(q)) {
    return "Describe the top problems or frustrations callers mention…";
  }
  if (/policy|refund|trial/.test(q)) {
    return "Summarize the policy in plain language for the agent…";
  }
  if (/escalat/.test(q)) {
    return "When to escalate and how (ticket link, manager, email)…";
  }
  if (/ideal|customer|caller|who is/.test(q)) {
    return "Describe the types of accounts or callers you serve best…";
  }
  if (/goal|successful call|main goal/.test(q)) {
    return "What should a successful call achieve for you…";
  }
  if (/region|property|listing|viewing/.test(q)) {
    return "Regions, property types, or qualification rules to mention…";
  }
  if (/scheduling|hours|appointment/.test(q)) {
    return "Hours, booking rules, or scheduling constraints…";
  }
  if (/insurance|payment/.test(q)) {
    return "Basics the agent can explain about insurance or payment…";
  }
  if (/hipaa|privacy/.test(q)) {
    return "Privacy or HIPAA-style phrases the agent should use…";
  }
  if (/technical|issue|bug/.test(q)) {
    return "Common technical issues and first-step troubleshooting…";
  }
  const short = question.replace(/\s*\(optional\)\s*$/i, "").trim();
  return `Answer in your own words: ${short.slice(0, 72)}${short.length > 72 ? "…" : ""}`;
}

function kbFileIconColor(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "#ef4444";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "var(--color-primary)";
  if (lower.endsWith(".txt")) return "#6b7280";
  return "#64748b";
}

type VoiceOption = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  previewUrl?: string | null;
};

const isPremadeLibraryVoice = (v: VoiceOption) => {
  const c = (v.category || "").toLowerCase();
  if (c === "premade") return true;
  if (c === "cloned" || c === "generated" || c === "fine_tuned") return false;
  // Older payloads sometimes omit category — keep those in Library so the list isn't empty on the wrong side.
  return true;
};

/** Wizard chrome — aligned with app primary (`--color-primary` / var(--color-primary)) */
const WIZ_ACCENT = "var(--color-primary)";
const WIZ_ACCENT_LINE = "color-mix(in srgb, var(--color-primary) 88%, #000000)";
const WIZ_ROW_SELECTED = "rgba(var(--color-primary-rgb), 0.2)";
/** Voice step: title, tab bar, list, and selected bar share this horizontal inset (px). */
const VOICE_STEP_CONTENT_GUTTER = 20;

/** Straight left accent (not `border-left` on a rounded box). Right corners only rounded. */
function WizardStepCallout({
  tone,
  marginTop,
  children,
}: {
  tone: "selected" | "idle";
  marginTop?: number;
  children: ReactNode;
}) {
  const on = tone === "selected";
  return (
    <div
      style={{
        marginTop: marginTop ?? 0,
        display: "flex",
        alignItems: "stretch",
        borderRadius: "0 12px 12px 0",
        overflow: "hidden",
        border: on ? "1px solid rgba(var(--color-primary-rgb), 0.2)" : "1px solid var(--color-border)",
        background: on ? "rgba(var(--color-primary-rgb), 0.2)" : "var(--color-surface-secondary)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div aria-hidden style={{ width: 3, flexShrink: 0, background: on ? WIZ_ACCENT : "#cbd5e1" }} />
      <div
        style={{
          flex: 1,
          padding: "11px 16px",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--color-text)",
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function WizardStickyLeadSelectionBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        display: "flex",
        alignItems: "stretch",
        borderTop: "1px solid rgba(var(--color-primary-rgb), 0.2)",
        boxShadow: "0 -6px 24px rgba(15, 23, 42, 0.06)",
        background: "rgba(248, 250, 255, 0.97)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div aria-hidden style={{ width: 3, flexShrink: 0, background: WIZ_ACCENT }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "11px 16px 11px 14px",
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const VOICE_LOAD_MORE_BORDER = "rgba(var(--color-primary-rgb), 0.2)";
const VOICE_LOAD_MORE_BG = "rgba(var(--color-primary-rgb), 0.2)";
const VOICE_LOAD_MORE_SHADOW = "0 1px 3px rgba(15, 23, 42, 0.08)";

function voiceLoadMoreButtonSx(marginTop: number): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    marginTop,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    lineHeight: 1.2,
    borderRadius: 10,
    cursor: "pointer",
    boxSizing: "border-box",
    border: `1.5px solid ${VOICE_LOAD_MORE_BORDER}`,
    background: VOICE_LOAD_MORE_BG,
    color: WIZ_ACCENT_LINE,
    transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
    boxShadow: VOICE_LOAD_MORE_SHADOW,
    transform: "translateY(0)",
  };
}

function voiceLoadMoreHover(el: HTMLButtonElement, on: boolean) {
  if (on) {
    el.style.background = "rgba(var(--color-primary-rgb), 0.2)";
    el.style.borderColor = WIZ_ACCENT;
    el.style.boxShadow = "0 6px 22px rgba(var(--color-primary-rgb), 0.2)";
    el.style.transform = "translateY(-1px)";
  } else {
    el.style.background = VOICE_LOAD_MORE_BG;
    el.style.borderColor = VOICE_LOAD_MORE_BORDER;
    el.style.boxShadow = VOICE_LOAD_MORE_SHADOW;
    el.style.transform = "translateY(0)";
  }
}

/** Edit draft modal — compact fields (matches wizard card typography). */
const WIZ_EDIT_LABEL: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
  color: "var(--color-text-muted)",
  letterSpacing: "0.01em",
};
const WIZ_EDIT_FIELD: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-secondary)",
  color: "var(--color-text)",
  fontSize: 13,
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
  lineHeight: 1.55,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
};
const WIZ_EDIT_ICON_MUTED = "#64748b";

/** Channel glyph colors in wizard edit headers (aligned with WizardEmailDraftCard). */
const WIZ_CHANNEL_EMAIL = "var(--color-primary)";
const WIZ_CHANNEL_WHATSAPP = "#25D366";
const WIZ_CHANNEL_LINKEDIN = "#0077B5";
/** Call channel — distinct from email blue / primary purple */
const WIZ_CHANNEL_CALL = "#0d9488";

/** Neutral slate toolbar (email wizard AI row — avoids primary blue). */
const EMAIL_AI_TOOLBAR_BTN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 14px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  lineHeight: 1.25,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-secondary)",
  color: "var(--color-text)",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
};

const DISABLED_BUTTON_STYLE: CSSProperties = {
  cursor: "not-allowed",
  boxShadow: "none",
  opacity: 1,
};

const DISABLED_PRIMARY_TINT_STYLE: CSSProperties = {
  ...DISABLED_BUTTON_STYLE,
  background: "rgba(var(--color-primary-rgb), 0.18)",
  borderColor: "rgba(var(--color-primary-rgb), 0.35)",
  color: "var(--color-primary)",
};

const DISABLED_SURFACE_TINT_STYLE: CSSProperties = {
  ...DISABLED_BUTTON_STYLE,
  background: "rgba(var(--color-primary-rgb), 0.12)",
  borderColor: "rgba(var(--color-primary-rgb), 0.3)",
  color: "var(--color-primary)",
};

const VALUE_PROPOSITION_MAX_LENGTH = 300;
const CTA_QUICK_OPTIONS = [
  "Schedule a demo",
  "Book a call",
  "Get a free trial",
  "Learn more",
] as const;

type VoiceLibraryFilterChip = "all" | "male" | "female" | "casual" | "professional" | "non-english";

const VOICE_LIBRARY_FILTER_CHIPS: { id: VoiceLibraryFilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Professional" },
  { id: "non-english", label: "Non-English" },
];

function inferVoiceWaveColor(v: VoiceOption): string {
  const t = `${v.name} ${v.description || ""}`.toLowerCase();
  if (/\b(energetic|upbeat|excited|dynamic|high[\s-]?energy)\b/.test(t)) return "#ea580c";
  if (/\b(warm|gentle|soft|soothing|kind)\b/.test(t)) return "#d97706";
  if (/\b(casual|laid[\s-]?back|relaxed|conversational|chill)\b/.test(t)) return "#16a34a";
  if (/\b(professional|formal|corporate|authoritative|news|documentary)\b/.test(t)) return "var(--color-primary)";
  return "#64748b";
}

function voiceTextBlob(v: VoiceOption): string {
  return `${v.name} ${v.description || ""}`.toLowerCase();
}

function voiceMatchesLibraryFilter(v: VoiceOption, filter: VoiceLibraryFilterChip): boolean {
  if (filter === "all") return true;
  const t = voiceTextBlob(v);
  if (filter === "male") {
    if (/\b(female|woman|girl)\b/.test(t)) return false;
    return /\b(male|man|guy|masculine|deep voice)\b/.test(t);
  }
  if (filter === "female") {
    if (/\b(male|man|guy)\b/.test(t) && !/\b(female|woman)\b/.test(t)) return false;
    return /\b(female|woman|girl|feminine)\b/.test(t);
  }
  if (filter === "casual") return /\b(casual|laid[\s-]?back|relaxed|conversational|chill)\b/.test(t);
  if (filter === "professional") return /\b(professional|formal|corporate|authoritative|news)\b/.test(t);
  if (filter === "non-english") {
    if (/\b(multilingual|non[\s-]?english|accent|japanese|chinese|spanish|french|german|hindi|arabic|korean|portuguese|italian)\b/i.test(t)) {
      return true;
    }
    return /[^\u0000-\u007f]/.test(`${v.name} ${v.description || ""}`);
  }
  return true;
}

function VoiceNameRow({
  name,
  playing,
  waveColor,
}: {
  name: string;
  playing: boolean;
  waveColor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <svg
        className="voice-wave-svg"
        width={20}
        height={14}
        viewBox="0 0 20 14"
        fill="none"
        aria-hidden
        style={{
          flexShrink: 0,
          color: waveColor,
          opacity: playing ? 1 : 0.72,
        }}
      >
        <rect x="0" y="6" width="2.5" height="8" rx="1" fill="currentColor" />
        <rect x="4.5" y="3" width="2.5" height="11" rx="1" fill="currentColor" />
        <rect x="9" y="0" width="2.5" height="14" rx="1" fill="currentColor" />
        <rect x="13.5" y="4" width="2.5" height="10" rx="1" fill="currentColor" />
        <rect x="18" y="7" width="2" height="7" rx="1" fill="currentColor" />
      </svg>
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--color-text)",
          overflowWrap: "anywhere",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** Wizard Step 13 — daily throttle slider ceiling (all channels). */
const SCHEDULE_DAILY_LIMIT_MAX = 30;

/** Clamp persisted / legacy throttle so UI `stored={min(max, …)}` cannot hide values > max in review. */
function clampScheduleThrottleValue(
  value: number | undefined,
  fallback = SCHEDULE_DAILY_LIMIT_MAX
): number {
  const raw =
    value === undefined || Number.isNaN(Number(value)) ? fallback : Number(value);
  return Math.min(SCHEDULE_DAILY_LIMIT_MAX, Math.max(1, raw));
}

/** Step 14 email review: short body preview per template (not full content). */
function reviewFirstWords(text: string, maxWords: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const words = t.split(" ");
  if (words.length <= maxWords) return t;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** Channel row icons on Step 14 overview (WhatsApp = brand glyph, same as schedule / summaries). */
const REVIEW_OVERVIEW_CHANNEL_META: Record<
  ChannelType,
  { Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>; iconColor: string }
> = {
  email: { Icon: Icons.Mail, iconColor: WIZ_CHANNEL_EMAIL },
  linkedin: { Icon: Icons.Linkedin, iconColor: WIZ_CHANNEL_LINKEDIN },
  whatsapp: { Icon: Icons.WhatsApp, iconColor: WIZ_CHANNEL_WHATSAPP },
  call: { Icon: Icons.Phone, iconColor: WIZ_CHANNEL_CALL },
};

/** Same glyph + colors for Campaign Overview chips and Schedule & Settings review rows. */
function ReviewChannelGlyph({ channel, size = 14 }: { channel: ChannelType; size?: number }) {
  const meta = REVIEW_OVERVIEW_CHANNEL_META[channel];
  const ChIcon = meta?.Icon ?? Icons.Mail;
  const iconColor = meta?.iconColor ?? "var(--color-text)";
  if (channel === "email" || channel === "linkedin") {
    return (
      <ChIcon size={size} strokeWidth={1.75} style={{ flexShrink: 0, color: iconColor }} aria-hidden />
    );
  }
  return <ChIcon size={size} style={{ flexShrink: 0, color: iconColor }} aria-hidden />;
}

function ReviewCardEditLabel() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      Edit
      <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ flexShrink: 0, opacity: 0.88 }} />
    </span>
  );
}

const SCHEDULE_TIMEZONE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "UTC", label: "UTC+0 (UTC)" },
  { id: "America/New_York", label: "UTC−5/−4 (Eastern US)" },
  { id: "America/Chicago", label: "UTC−6/−5 (Central US)" },
  { id: "America/Los_Angeles", label: "UTC−8/−7 (Pacific US)" },
  { id: "Europe/London", label: "UTC+0/+1 (London)" },
  { id: "Asia/Dubai", label: "UTC+4 (Dubai)" },
  { id: "Asia/Karachi", label: "UTC+5 (Karachi)" },
  { id: "Asia/Kolkata", label: "UTC+5:30 (India)" },
  { id: "Asia/Singapore", label: "UTC+8 (Singapore)" },
];

type ScheduleThrottleChannel = "email" | "linkedin" | "whatsapp" | "call";

/** Matches `Icons` components (`IconProps` = SVG props + optional `size`) */
type WizardScheduleRowIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

function WizardScheduleThrottleRow({
  Icon,
  iconStyle,
  label,
  max,
  stored,
  draft,
  onDraftChange,
  onSliderCommit,
  onBlurClamp,
  recommendation,
}: {
  Icon: WizardScheduleRowIcon;
  /** Channel color / opacity — matches Icons usage on earlier wizard steps */
  iconStyle?: CSSProperties;
  label: string;
  max: number;
  stored: number;
  draft: string | undefined;
  onDraftChange: (v: string | undefined) => void;
  onSliderCommit: (v: number) => void;
  onBlurClamp: () => void;
  recommendation?: ReactNode;
}) {
  const parsedDraft =
    draft !== undefined && draft.trim() !== "" ? Number.parseInt(draft, 10) : Number.NaN;
  const hasValidDraft = !Number.isNaN(parsedDraft);
  const sliderVal = hasValidDraft
    ? Math.min(Math.max(1, parsedDraft), max)
    : Math.min(Math.max(1, stored), max);
  const exceedsMax = hasValidDraft && parsedDraft > max;
  const inputDisplay = draft !== undefined ? draft : String(stored);
  const rangeFillPct =
    max <= 1 ? "100%" : `${((sliderVal - 1) / Math.max(1, max - 1)) * 100}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          rowGap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            minWidth: 132,
            flex: "1 1 140px",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon
            size={18}
            strokeWidth={1.75}
            style={{ flexShrink: 0, opacity: 0.92, ...iconStyle }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>{label}</span>
        </div>
        <div
          style={{
            display: "flex",
            minWidth: 200,
            flex: "2 1 220px",
            alignItems: "center",
            gap: 12,
            minHeight: 28,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="range"
              className="schedule-daily-range"
              min={1}
              max={max}
              step={1}
              value={sliderVal}
              onChange={(e) => {
                const n = Number(e.target.value);
                onSliderCommit(n);
                onDraftChange(undefined);
              }}
              style={{
                ["--schedule-range-pct" as string]: rangeFillPct,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                height: 20,
                margin: 0,
                padding: 0,
                verticalAlign: "middle",
                cursor: "pointer",
                boxSizing: "border-box",
                accentColor: "var(--color-primary)",
              }}
            />
          </div>
          <input
            type="text"
            inputMode="numeric"
            className="input"
            value={inputDisplay}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              onDraftChange(v);
            }}
            onBlur={onBlurClamp}
            aria-invalid={exceedsMax}
            style={{
              width: 56,
              flexShrink: 0,
              textAlign: "center",
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
              ...(exceedsMax ? { borderColor: "#ef4444", color: "#dc2626" } : {}),
            }}
          />
        </div>
      </div>
      {exceedsMax && (
        <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>Exceeds max — capped at {max}</p>
      )}
      {recommendation}
    </div>
  );
}

export default function CampaignNew() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams?.get("edit") ?? null;
  const { showError, showWarning, showSuccess } = useNotification();

  /** When `?edit=` is present, wizard stays hidden until the draft is applied (no empty step 1 flash). */
  const [draftHydrated, setDraftHydrated] = useState(!editParam);
  const prevEditParamRef = useRef<string | null>(null);
  const loadedDraftEditIdRef = useRef<string | null>(null);

  // Safely get activeBaseId, with fallback for when BaseProvider isn't ready
  let activeBaseId;
  try {
    activeBaseId = useBase().activeBaseId;
  } catch (error) {
    // BaseProvider not ready yet, use undefined
    activeBaseId = undefined;
  }

  const basesLoading = useBaseStore((s) => s.loading);

  useEffect(() => {
    if (activeBaseId === undefined) return;
    if (activeBaseId !== null) return;
    if (basesLoading) return;
      router.replace("/bases");
  }, [activeBaseId, router, basesLoading]);

  /** When `?edit=` appears or changes, reset hydration so we show loading until draft is fetched (fixes client nav from /campaigns/new with stale draftHydrated=true). */
  useEffect(() => {
    const id = searchParams?.get("edit") ?? null;
    if (!id) {
      setDraftHydrated(true);
      loadedDraftEditIdRef.current = null;
      prevEditParamRef.current = null;
      return;
    }
    if (prevEditParamRef.current !== id) {
      prevEditParamRef.current = id;
      // Same-session draft creation: do not flash loading or refetch (see persistCampaignDraft POST).
      if (pendingLocalDraftEditRef.current === id) {
        return;
      }
      loadedDraftEditIdRef.current = null;
      setDraftHydrated(false);
    }
  }, [searchParams]);

  /** Server-side: email + messaging + voice providers configured for this workspace (null = still loading) */
  const [channelAvailability, setChannelAvailability] = useState<Record<ChannelType, boolean> | null>(null);
  /** Workspace owner billing tier (for plan-based channel limits). */
  const [workspaceOwnerPlanKey, setWorkspaceOwnerPlanKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeBaseId == null || typeof activeBaseId !== "number") {
      setChannelAvailability(null);
      setWorkspaceOwnerPlanKey(null);
      return;
    }
    let cancelled = false;
    setChannelAvailability(null);
    setWorkspaceOwnerPlanKey(null);
    void (async () => {
      try {
        const [statusData, creditsData] = await Promise.all([
          apiRequest(
            `/campaigns/wizard/channel-status?base_id=${encodeURIComponent(String(activeBaseId))}`
          ) as Promise<Record<ChannelType, boolean>>,
          apiRequest(`/bases/${activeBaseId}/workspace-credits?page=1&limit=1`) as Promise<{
            billing_plan_key?: string | null;
          }>,
        ]);
        if (!cancelled) {
          setChannelAvailability(statusData);
          setWorkspaceOwnerPlanKey(creditsData.billing_plan_key ?? null);
        }
      } catch {
        if (!cancelled) {
          setChannelAvailability({ email: true, linkedin: true, whatsapp: true, call: true });
          setWorkspaceOwnerPlanKey(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBaseId]);

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
  /** Highest completed step index (current step is pending until user moves past it). */
  const [maxReachedStep, setMaxReachedStep] = useState<number>(0);
  const [name, setName] = useState("");
  const [campaignNameBlurred, setCampaignNameBlurred] = useState(false);
  const [channels, setChannels] = useState<string[]>(["email"]);
  const channelsRef = useRef<string[]>(channels);
  channelsRef.current = channels;

  useEffect(() => {
    if (!channelAvailability) return;
    // Editing a draft: keep saved channel selections (including disconnected) until the user unchecks on Step 1.
    if (editParam) return;
    setChannels((prev) => {
      let filtered = prev.filter((c) => channelAvailability[c as ChannelType]);
      if (isEmailOnlyWorkspacePlan(workspaceOwnerPlanKey)) {
        filtered = filtered.filter((c) => c !== "linkedin" && c !== "whatsapp");
      }
      if (filtered.length > 0) return filtered;
      const order: ChannelType[] = ["email", "linkedin", "whatsapp", "call"];
      const first = order.find(
        (c) =>
          channelAvailability[c] &&
          (!isEmailOnlyWorkspacePlan(workspaceOwnerPlanKey) || (c !== "linkedin" && c !== "whatsapp"))
      );
      return first ? [first] : [];
    });
  }, [channelAvailability, editParam, workspaceOwnerPlanKey]);

  const staleChannels = useMemo(() => {
    if (!channelAvailability) return [];
    return channels.filter((c) => !channelAvailability[c as ChannelType]);
  }, [channels, channelAvailability]);

  const [segments, setSegments] = useState<string[]>([]);
  /** When non-null, selected leads = this list ∩ channel-eligible leads (fixes checkboxes vs segment-union bug). */
  const [explicitCampaignTargetLeadIds, setExplicitCampaignTargetLeadIds] = useState<number[] | null>(null);
  const [leadTableFilter, setLeadTableFilter] = useState<LeadTableFilterKey>("all");
  const [leadTableSearch, setLeadTableSearch] = useState("");
  const [leadTablePage, setLeadTablePage] = useState(1);
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
    timezone?: string;
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
    timezone: "Asia/Karachi",
    email: { throttle: SCHEDULE_DAILY_LIMIT_MAX },
    linkedin: { throttle: SCHEDULE_DAILY_LIMIT_MAX },
    whatsapp: { throttle: SCHEDULE_DAILY_LIMIT_MAX },
    call: { throttle: SCHEDULE_DAILY_LIMIT_MAX },
    followups: 2,
    followupDelay: 3,
  });
  const [scheduleThrottleDraft, setScheduleThrottleDraft] = useState<
    Partial<Record<ScheduleThrottleChannel, string>>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLeadDropdownOpen, setConfirmLeadDropdownOpen] = useState(false);
  const [confirmDetailPreview, setConfirmDetailPreview] = useState<
    | null
    | {
        title: string;
        layout: "text" | "list" | "kb" | "voice" | "lead";
        text?: string;
        list?: string[];
        kbFiles?: Array<{ id: string; name: string; sizeLabel?: string }>;
        voice?: { id: string; name: string };
        lead?: Lead;
      }
  >(null);
  /** Wizard footer: show loading while draft persists on Next/Back */
  const [wizardNavBusy, setWizardNavBusy] = useState<"next" | "back" | null>(null);
  /** Stepper click: show inline loader on target step (do not use footer "Back" saving state). */
  const [wizardStepperLoadingStep, setWizardStepperLoadingStep] = useState<number | null>(null);
  /** Latest validation context for jump guards (callbacks sit above the useMemo that builds it). */
  const stepValidationContextRef = useRef<ValidationContext | null>(null);
  const [launching, setLaunching] = useState(false);
  
  // Throttle recommendation state
  const [recommendedEmailThrottle, setRecommendedEmailThrottle] = useState<number | null>(null);
  const [recommendedLinkedInThrottle, setRecommendedLinkedInThrottle] = useState<number | null>(null);
  const [linkedInAccountType, setLinkedInAccountType] = useState<string | null>(null);
  const [linkedInMaxThrottle, setLinkedInMaxThrottle] = useState<number>(SCHEDULE_DAILY_LIMIT_MAX);
  const [linkedInMonthlyLimit, setLinkedInMonthlyLimit] = useState<number | null>(null); // For free accounts
  
  // Email campaign details (only used when email channel is selected)
  const [productService, setProductService] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [callToAction, setCallToAction] = useState("Schedule a demo");
  const [senderName, setSenderName] = useState("");
  const [senderCompany, setSenderCompany] = useState("");
  const [senderDetailsExpanded, setSenderDetailsExpanded] = useState(true);

  // Lead data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [viewingSegment, setViewingSegment] = useState<string | null>(null);
  const [viewingLeads, setViewingLeads] = useState<Lead[]>([]);
  /** Full lead detail modal (same LeadDrawer as /leads) from Step 3 table */
  const [campaignLeadDrawerLead, setCampaignLeadDrawerLead] = useState<Lead | null>(null);
  
  // Message generation state
  const [emailDraftFetchState, setEmailDraftFetchState] = useState<"idle" | "center" | "skeleton">("idle");
  const [messagesGenerated, setMessagesGenerated] = useState(false);
  const [selectedMessageIndices, setSelectedMessageIndices] = useState<number[]>([0, 1, 2]); // Match default 3 templates + follow-up slots
  const [emailDraftTone, setEmailDraftTone] = useState<EmailDraftTone>("Formal");
  const emailDraftToneRef = useRef<EmailDraftTone>(emailDraftTone);
  emailDraftToneRef.current = emailDraftTone;
  type EmailWizardPreviewState = {
    title: string;
    metaLine: string;
    subject: string;
    body: string;
    kind?: "email" | "linkedin" | "whatsapp";
  };
  const [emailWizardPreview, setEmailWizardPreview] = useState<EmailWizardPreviewState | null>(null);
  type EmailWizardEditState =
    | { type: "library"; id: number }
    | { type: "ai"; index: number }
    | { type: "linkedin_library"; id: number }
    | { type: "linkedin_ai"; index: number }
    | { type: "whatsapp_library"; id: number }
    | { type: "whatsapp_ai"; index: number };
  const [emailWizardEdit, setEmailWizardEdit] = useState<EmailWizardEditState | null>(null);
  const [emailToneMenuOpen, setEmailToneMenuOpen] = useState(false);
  const [regeneratingEmailSlot, setRegeneratingEmailSlot] = useState<number | null>(null);
  const [selectedLibraryTemplateIds, setSelectedLibraryTemplateIds] = useState<number[]>([]);
  const [libraryTemplateEdits, setLibraryTemplateEdits] = useState<Record<number, { subject: string; body: string }>>(
    {}
  );
  /** First campaign email: filled by AI vs copied from a saved template (for labels on All emails). */
  const [emailInitialContentSource, setEmailInitialContentSource] = useState<"ai" | "library">("ai");
  const emailToneMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emailToneMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emailToneMenuRef.current && !emailToneMenuRef.current.contains(e.target as Node)) {
        setEmailToneMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emailToneMenuOpen]);

  useEffect(() => {
    if (!emailWizardPreview && !emailWizardEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (emailWizardPreview) {
        setEmailWizardPreview(null);
        return;
      }
      if (emailWizardEdit) setEmailWizardEdit(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emailWizardPreview, emailWizardEdit]);

  // WhatsApp message generation state (AI fills on WhatsApp drafts step — no hardcoded starters)
  const [whatsAppMessages, setWhatsAppMessages] = useState<string[]>([]);
  const [generatingWhatsAppMessages, setGeneratingWhatsAppMessages] = useState(false);
  const [whatsAppMessagesGenerated, setWhatsAppMessagesGenerated] = useState(false);
  const [selectedWhatsAppMessageIndices, setSelectedWhatsAppMessageIndices] = useState<number[]>([]); // Single suggestion index (radio)
  
  // Email follow-up preferences state
  const [followupsPreferenceSet, setFollowupsPreferenceSet] = useState(false);
  const [showFollowupsNumberInput, setShowFollowupsNumberInput] = useState(false);
  
  // Email provider integration state
  const [emailIntegration, setEmailIntegration] = useState<any>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  
  // Call knowledge base state
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<
    Array<{ id: string; name: string; uploadedAt: string; sizeBytes?: number }>
  >([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedKbTopicId, setSelectedKbTopicId] = useState<string | null>(null);
  const [kbAiOpen, setKbAiOpen] = useState(false);
  const [kbAiSuggestionId, setKbAiSuggestionId] = useState<string | null>(null);
  const [kbAiSuggestionLabel, setKbAiSuggestionLabel] = useState("");
  const [kbAiQuestions, setKbAiQuestions] = useState<string[]>([]);
  const [kbAiAnswers, setKbAiAnswers] = useState<string[]>([]);
  const [kbAiPhase, setKbAiPhase] = useState<"idle" | "loading" | "questions" | "generating">("idle");
  const [kbAiError, setKbAiError] = useState<string | null>(null);
  const [kbAiHighlightIdx, setKbAiHighlightIdx] = useState(0);
  const [kbAiGeneratorExpanded, setKbAiGeneratorExpanded] = useState(false);
  const [kbAiGeneratorCustomBrief, setKbAiGeneratorCustomBrief] = useState("");
  const [kbAiUserTopic, setKbAiUserTopic] = useState<string | null>(null);
  const [kbDeleteTarget, setKbDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [kbDeleteLoading, setKbDeleteLoading] = useState(false);

  useEffect(() => {
    // Mark only previous steps as completed. If user is on step 11, completed max is 10.
    setMaxReachedStep((prev) => Math.max(prev, Math.max(0, step - 1)));
  }, [step]);

  useEffect(() => {
    setMaxReachedStep(0);
  }, [editParam]);

  useEffect(() => {
    if (kbAiPhase === "questions" && kbAiQuestions.length > 0) {
      setKbAiHighlightIdx(0);
    }
  }, [kbAiPhase, kbAiQuestions.length]);

  useEffect(() => {
    if (!confirmOpen) {
      setConfirmLeadDropdownOpen(false);
      setConfirmDetailPreview(null);
    }
  }, [confirmOpen]);
  
  // Call agent configuration state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceLibrarySearch, setVoiceLibrarySearch] = useState("");
  const [voiceLibraryFilter, setVoiceLibraryFilter] = useState<VoiceLibraryFilterChip>("all");
  const [libraryVoiceVisibleCount, setLibraryVoiceVisibleCount] = useState(5);
  const [myVoiceVisibleCount, setMyVoiceVisibleCount] = useState(5);
  const [voicePickerTab, setVoicePickerTab] = useState<"library" | "my">("library");
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewLoadingVoiceId, setPreviewLoadingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  /** Review step: full email / WhatsApp / LinkedIn message in a modal (eye icon). */
  const [reviewChannelPreview, setReviewChannelPreview] = useState<
    | null
    | { kind: "email"; title: string; subject: string; body: string }
    | { kind: "whatsapp"; title: string; text: string }
    | { kind: "linkedin"; title: string; text: string }
  >(null);
  /** Review → Call config: which KB PDF action is in flight (icon shows spinner). */
  const [reviewKbLoading, setReviewKbLoading] = useState<null | { fileId: string; action: "view" | "download" }>(null);
  const [voiceCloneOpen, setVoiceCloneOpen] = useState(false);
  const [voiceCloneName, setVoiceCloneName] = useState("");
  const [voiceCloneDescription, setVoiceCloneDescription] = useState("");
  const [voiceCloneFiles, setVoiceCloneFiles] = useState<File[]>([]);
  const [voiceCloneDragOver, setVoiceCloneDragOver] = useState(false);
  const voiceCloneSampleInputRef = useRef<HTMLInputElement>(null);
  const [voiceClonePreviewIndex, setVoiceClonePreviewIndex] = useState<number | null>(null);
  const voiceClonePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceClonePreviewUrlRef = useRef<string | null>(null);
  const [cloningVoice, setCloningVoice] = useState(false);
  const [voiceDeleteTarget, setVoiceDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [voiceDeleteLoading, setVoiceDeleteLoading] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [callOpeningStarterIndex, setCallOpeningStarterIndex] = useState<number | null>(null);
  const initialPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  /** One-time voice first-message prefill per wizard mount (avoid refetch when user clears textarea). */
  const callOpeningElFetchFinishedRef = useRef(false);
  /** True while `/campaigns/elevenlabs-first-message` is loading (empty draft opening only). */
  const [callOpeningFetchLoading, setCallOpeningFetchLoading] = useState(false);
  const initialPromptRef = useRef(initialPrompt);
  const [systemPersona, setSystemPersona] = useState("");
  /** One-time voice system-prompt prefill for Step 12. */
  const callSystemPersonaElFetchFinishedRef = useRef(false);
  /** True while `/campaigns/elevenlabs-system-prompt` is loading (empty draft persona only). */
  const [systemPersonaFetchLoading, setSystemPersonaFetchLoading] = useState(false);
  const systemPersonaRef = useRef(systemPersona);
  const [systemPersonaGenerating, setSystemPersonaGenerating] = useState(false);
  const [systemPersonaCustomBrief, setSystemPersonaCustomBrief] = useState("");
  /** Collapsed “Generate with AI” trigger until the user opens the generator panel. */
  const [systemPersonaAiExpanded, setSystemPersonaAiExpanded] = useState(false);

  /** When KB upload / AI KB returns `suggestedSystemPersona`, align Assistant style and skip ElevenLabs prefill. */
  const applyKbDerivedSystemPersona = useCallback((raw: unknown) => {
    const t = typeof raw === "string" ? raw.trim() : "";
    if (!t) return;
    setSystemPersona(t);
    callSystemPersonaElFetchFinishedRef.current = true;
  }, []);

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
  const [linkedInWizardIntegration, setLinkedInWizardIntegration] = useState<{
    config?: { linkedin_account_type?: string };
  } | null>(null);
  const [linkedInWizardIntegrationLoading, setLinkedInWizardIntegrationLoading] = useState(false);
  const [linkedInGeneratingTemplates, setLinkedInGeneratingTemplates] = useState(false);
  const [linkedInTemplateError, setLinkedInTemplateError] = useState<string | null>(null);
  /** Which AI suggestion card is explicitly applied (shows ✓ Applied); cleared when message is edited away from that template */
  const [linkedInAppliedSuggestionIndex, setLinkedInAppliedSuggestionIndex] = useState<number | null>(null);
  const wizardEditSubjectRef = useRef<HTMLInputElement | null>(null);
  const wizardEditBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const wizardEditInsertTargetRef = useRef<"subject" | "body">("body");

  /** Message library from Templates page (`/templates`), filtered by channel in the UI */
  const [libraryTemplates, setLibraryTemplates] = useState<Record<string, unknown>[]>([]);
  const [libraryTemplatesLoading, setLibraryTemplatesLoading] = useState(false);
  const [emailTemplateTab, setEmailTemplateTab] = useState<"library" | "ai">("ai");
  const [linkedInTemplateTab, setLinkedInTemplateTab] = useState<"library" | "ai">("ai");
  const [whatsAppTemplateTab, setWhatsAppTemplateTab] = useState<"library" | "ai">("ai");
  /** Library template id applied to slot 0 (for card selected state). */
  const [whatsAppAppliedLibraryTemplateId, setWhatsAppAppliedLibraryTemplateId] = useState<number | null>(null);

  const getLinkedInUrl = (lead: Lead): string | null => getLinkedInUrlFromLead(lead);

  const hasLinkedInUrl = (lead: Lead): boolean => !!getLinkedInUrlFromLead(lead);


  // Draft campaign state
  const [draftCampaignId, setDraftCampaignId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false); // Flag to prevent auto-save during launch
  const launchInProgressRef = useRef(false);

  const draftCampaignIdRef = useRef<number | null>(null);
  /** When we POST a new draft then `router.replace(?edit=)`, skip reload/hydration reset — client state is already correct. */
  const pendingLocalDraftEditRef = useRef<string | null>(null);
  const persistQueueRef = useRef(Promise.resolve());
  const persistFnRef = useRef<
    (
      s: Step,
      o?: { linkedInStepConfig?: typeof linkedInStepConfig | null; channels?: string[] }
    ) => Promise<number | null>
  >(() => Promise.resolve(null));
  const stepRef = useRef<Step>(1);
  const hasLinkedInUrlRef = useRef(hasLinkedInUrl);
  const wizardPersistCtxRef = useRef({
    draftHydrated: false,
    name: "",
    activeBaseId: null as number | null,
    isLaunching: false,
    channels: [] as string[],
    segments: [] as string[],
    explicitCampaignTargetLeadIds: null as number[] | null,
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
  });

  useEffect(() => {
    draftCampaignIdRef.current = draftCampaignId;
  }, [draftCampaignId]);

  stepRef.current = step;
  hasLinkedInUrlRef.current = hasLinkedInUrl;

  // Calculate step flow dynamically based on selected channels
  const stepFlow = useMemo(() => {
    return calculateStepFlow(channels as ChannelType[], {
      linkedin_step: linkedInStepConfig,
    });
  }, [channels, linkedInStepConfig]);

  // Get total steps from calculated flow
  const totalSteps = stepFlow.length;

  useEffect(() => {
    // Keep completed marker within current step-flow length.
    setMaxReachedStep((prev) => Math.min(prev, Math.max(0, totalSteps - 1)));
  }, [totalSteps]);

  // Get current step info
  const currentStepInfo = useMemo(() => {
    return getStepInfo(step, channels as ChannelType[], {
      linkedin_step: linkedInStepConfig,
    });
  }, [step, channels, linkedInStepConfig]);

  /** Default schedule has followups > 0 so "Yes" looks selected — sync flags so count UI shows without toggling No/Yes. */
  useEffect(() => {
    if (currentStepInfo?.stepType !== "email_followup_preferences") return;
    if (!channels.includes("email")) return;
    setShowFollowupsNumberInput(schedule.followups > 0);
    setFollowupsPreferenceSet(true);
  }, [currentStepInfo?.stepType, channels, schedule.followups]);

  useEffect(() => {
    if (currentStepInfo?.stepType !== "call_knowledge_base") {
      setKbAiGeneratorExpanded(false);
      setKbAiGeneratorCustomBrief("");
    }
  }, [currentStepInfo?.stepType]);

  useEffect(() => {
    if (currentStepInfo?.stepType !== "review") {
      setReviewChannelPreview(null);
    }
  }, [currentStepInfo?.stepType]);

  const basicSetupNameValidationError =
    currentStepInfo?.stepType === "basic_setup"
      ? getBasicSetupCampaignNameError(name)
      : null;
  const showCampaignNameInlineError =
    currentStepInfo?.stepType === "basic_setup" &&
    campaignNameBlurred &&
    basicSetupNameValidationError !== null;

  useEffect(() => {
    const st = currentStepInfo?.stepType;
    if (!activeBaseId) return;
    if (
      st !== "email_templates" &&
      st !== "linkedin_templates" &&
      st !== "whatsapp_templates"
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLibraryTemplatesLoading(true);
      try {
        const data = await apiRequest(`/templates?base_id=${activeBaseId}`);
        if (!cancelled) {
          setLibraryTemplates(Array.isArray(data?.templates) ? data.templates : []);
        }
      } catch {
        if (!cancelled) setLibraryTemplates([]);
      } finally {
        if (!cancelled) setLibraryTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStepInfo?.stepType, activeBaseId]);

  useEffect(() => {
    if (currentStepInfo?.stepType !== "linkedin_message_type" || activeBaseId == null) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLinkedInWizardIntegrationLoading(true);
        const data = await apiRequest(`/integrations/${activeBaseId}`);
        const integrations = data?.integrations || [];
        const linkedIn = integrations.find((i: { provider?: string }) => i.provider === "unipile_linkedin");
        if (!cancelled) setLinkedInWizardIntegration(linkedIn ?? null);
      } catch {
        if (!cancelled) setLinkedInWizardIntegration(null);
      } finally {
        if (!cancelled) setLinkedInWizardIntegrationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStepInfo?.stepType, activeBaseId]);

  const linkedInSampleLeadForAi = useMemo(
    () => leads.find((l) => !!getLinkedInUrlFromLead(l)),
    [leads]
  );

  /** One auto-run per (step × lead snapshot) so we retry when leads load after landing on the step */
  const linkedInAutoSuggestAttemptKeyRef = useRef<string>("");

  const runLinkedInInlineAiTemplates = useCallback(
    async (opts?: { quietNoUrl?: boolean }) => {
    const sampleLead = linkedInSampleLeadForAi;
    if (!sampleLead || activeBaseId == null) {
      setLinkedInTemplateError(null);
      if (!opts?.quietNoUrl) {
        showWarning(
          "LinkedIn URLs",
          "Add leads with LinkedIn profile URLs to your campaign to suggest connection notes."
        );
      }
      return;
    }
    const linkedInUrl = getLinkedInUrlFromLead(sampleLead);
    if (!linkedInUrl) {
      setLinkedInTemplateError(null);
      if (!opts?.quietNoUrl) {
        showWarning("LinkedIn URL", "Your sample lead does not have a LinkedIn URL.");
      }
      return;
    }
    setLinkedInGeneratingTemplates(true);
    setLinkedInTemplateError(null);
    try {
      const response = await apiRequest("/campaigns/generate-linkedin-templates", {
        method: "POST",
        body: JSON.stringify({
          toProfileUrl: linkedInUrl,
          baseId: activeBaseId,
          lead: sanitizeLeadForAPI(sampleLead),
          productService: productService || undefined,
          valueProposition: valueProposition || undefined,
          callToAction: callToAction || undefined,
          senderName: senderName || undefined,
          senderCompany: senderCompany || undefined,
        }),
      });
      if (response.templates && Array.isArray(response.templates) && response.templates.length > 0) {
        setLinkedInAppliedSuggestionIndex(null);
        setLinkedInStepConfig((prev) => ({
          action: "invitation_with_message",
          message: prev?.message ?? "",
          templates: response.templates as string[],
        }));
        showSuccess("Suggestions ready", "Pick a note below or edit your own.");
      } else {
        setLinkedInTemplateError("No suggestions returned. Try again or type your own note.");
      }
    } catch (error: unknown) {
      console.error("Failed to generate LinkedIn templates:", error);
      const msg = error instanceof Error ? error.message : "Could not suggest notes.";
      setLinkedInTemplateError(`${msg} You can still type your own message.`);
    } finally {
      setLinkedInGeneratingTemplates(false);
    }
  },
    [
    linkedInSampleLeadForAi,
    activeBaseId,
    productService,
    valueProposition,
    callToAction,
    senderName,
    senderCompany,
    showWarning,
    showSuccess,
  ]
  );

  useEffect(() => {
    if (currentStepInfo?.stepType !== "linkedin_templates") {
      linkedInAutoSuggestAttemptKeyRef.current = "";
      return;
    }
    if (linkedInStepConfig?.action !== "invitation_with_message") return;
    if (!channels.includes("linkedin")) return;
    if (!activeBaseId) return;
    if (loadingLeads) return;

    const leadSig = `${leads.length}:${linkedInSampleLeadForAi?.id ?? "none"}`;
    const attemptKey = `${step}|${leadSig}`;
    if (linkedInAutoSuggestAttemptKeyRef.current === attemptKey) return;

    if (linkedInStepConfig?.templates && linkedInStepConfig.templates.length > 0) {
      linkedInAutoSuggestAttemptKeyRef.current = attemptKey;
      return;
    }

    linkedInAutoSuggestAttemptKeyRef.current = attemptKey;
    void runLinkedInInlineAiTemplates({ quietNoUrl: true });
  }, [
    currentStepInfo?.stepType,
    step,
    linkedInStepConfig?.action,
    linkedInStepConfig?.templates,
    channels,
    activeBaseId,
    loadingLeads,
    leads,
    linkedInSampleLeadForAi?.id,
    runLinkedInInlineAiTemplates,
  ]);

  useEffect(() => {
    if (linkedInAppliedSuggestionIndex === null) return;
    const tpls = linkedInStepConfig?.templates;
    if (!tpls || linkedInAppliedSuggestionIndex < 0 || linkedInAppliedSuggestionIndex >= tpls.length) {
      setLinkedInAppliedSuggestionIndex(null);
      return;
    }
    const t = tpls[linkedInAppliedSuggestionIndex];
    if (t === undefined) {
      setLinkedInAppliedSuggestionIndex(null);
      return;
    }
    const applied = t.slice(0, 200);
    if ((linkedInStepConfig?.message ?? "") !== applied) {
      setLinkedInAppliedSuggestionIndex(null);
    }
  }, [linkedInStepConfig?.message, linkedInStepConfig?.templates, linkedInAppliedSuggestionIndex]);

  const filterLibraryByChannel = (channel: string) =>
    libraryTemplates.filter((t: Record<string, unknown>) => {
      const ch = String(t.channel || "").toLowerCase();
      const cid = t.campaign_id;
      const isLibraryRow = cid == null || cid === "";
      return ch === channel.toLowerCase() && isLibraryRow;
    });

  useEffect(() => {
    if (emailTemplateTab !== "library" || selectedLibraryTemplateIds.length === 0) return;
    const primary = Math.min(...selectedLibraryTemplateIds);
    const list = libraryTemplates.filter((t: Record<string, unknown>) => {
      const ch = String(t.channel || "").toLowerCase();
      const cid = t.campaign_id;
      const isLibraryRow = cid == null || cid === "";
      return ch === "email" && isLibraryRow;
    });
    const t = list.find((row) => row.id === primary) as Record<string, unknown> | undefined;
    if (!t) return;
    const vars = (t.variables && typeof t.variables === "object" && !Array.isArray(t.variables)
      ? (t.variables as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    const defaultSubj = vars.subject != null ? String(vars.subject) : "";
    const defaultBody = String(t.content || "");
    const subj = libraryTemplateEdits[primary]?.subject ?? defaultSubj;
    const body = libraryTemplateEdits[primary]?.body ?? defaultBody;
    setMessages((m) => {
      const next = [...m];
      const formatted = formatMessage(subj, body);
      if (next.length === 0) return [formatted];
      next[0] = formatted;
      return next;
    });
    setEmailInitialContentSource("library");
    setMessagesGenerated(true);
    setSelectedMessageIndices((s) => Array.from(new Set([0, ...s])));
  }, [emailTemplateTab, selectedLibraryTemplateIds, libraryTemplateEdits, libraryTemplates]);

  const premadeVoices = useMemo(() => {
    return availableVoices.filter(isPremadeLibraryVoice);
  }, [availableVoices]);

  const myVoicesList = useMemo(() => {
    return availableVoices.filter((v) => (v.category || "").toLowerCase() === "cloned");
  }, [availableVoices]);

  const filteredPremadeVoices = useMemo(() => {
    const q = voiceLibrarySearch.trim().toLowerCase();
    let list = premadeVoices.filter((v) => voiceMatchesLibraryFilter(v, voiceLibraryFilter));
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) || (v.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [premadeVoices, voiceLibrarySearch, voiceLibraryFilter]);

  useEffect(() => {
    setLibraryVoiceVisibleCount(5);
  }, [voiceLibrarySearch, voiceLibraryFilter]);

  useEffect(() => {
    setMyVoiceVisibleCount(5);
  }, [myVoicesList.length]);

  const visibleLibraryVoices = useMemo(
    () => filteredPremadeVoices.slice(0, libraryVoiceVisibleCount),
    [filteredPremadeVoices, libraryVoiceVisibleCount]
  );

  const visibleMyVoices = useMemo(
    () => myVoicesList.slice(0, myVoiceVisibleCount),
    [myVoicesList, myVoiceVisibleCount]
  );

  useEffect(() => {
    if (currentStepInfo?.stepType !== "call_voice_selection") return;
    if (voicePickerTab !== "my") return;
    if (myVoicesList.length !== 1) return;
    const only = myVoicesList[0];
    if (only) setSelectedVoiceId(only.id);
  }, [currentStepInfo?.stepType, voicePickerTab, myVoicesList]);

  useEffect(() => {
    if (currentStepInfo?.stepType === "call_voice_selection") return;
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
        previewAudioRef.current = null;
      }
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setPreviewingVoiceId(null);
    setPreviewLoadingVoiceId(null);
  }, [currentStepInfo?.stepType]);

  initialPromptRef.current = initialPrompt;
  systemPersonaRef.current = systemPersona;

  useEffect(() => {
    if (currentStepInfo?.stepType !== "call_initial_prompt") {
      setCallOpeningFetchLoading(false);
      return;
    }
    if (!draftHydrated) return;
    if (callOpeningElFetchFinishedRef.current) return;

    if (initialPromptRef.current.trim() !== "") {
      callOpeningElFetchFinishedRef.current = true;
      return;
    }

    setCallOpeningFetchLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const res = (await apiRequest("/campaigns/elevenlabs-first-message")) as {
          firstMessage?: string;
        };
        if (cancelled) return;
        const msg = (res?.firstMessage ?? "").trim();
        if (msg) setInitialPrompt(msg);
      } catch {
        /* Voice provider missing or error — leave opening line empty */
      } finally {
        if (!cancelled) {
          callOpeningElFetchFinishedRef.current = true;
          setCallOpeningFetchLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setCallOpeningFetchLoading(false);
    };
  }, [currentStepInfo?.stepType, draftHydrated]);

  useEffect(() => {
    if (currentStepInfo?.stepType !== "call_system_persona") {
      setSystemPersonaFetchLoading(false);
      return;
    }
    if (!draftHydrated) return;
    if (callSystemPersonaElFetchFinishedRef.current) return;

    if (systemPersonaRef.current.trim() !== "") {
      callSystemPersonaElFetchFinishedRef.current = true;
      return;
    }

    setSystemPersonaFetchLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const res = (await apiRequest("/campaigns/elevenlabs-system-prompt")) as {
          systemPrompt?: string;
        };
        if (cancelled) return;
        const text = (res?.systemPrompt ?? "").trim();
        if (text) setSystemPersona(text);
      } catch {
        /* Voice provider missing or error */
      } finally {
        if (!cancelled) {
          callSystemPersonaElFetchFinishedRef.current = true;
          setSystemPersonaFetchLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setSystemPersonaFetchLoading(false);
    };
  }, [currentStepInfo?.stepType, draftHydrated]);

  useEffect(() => {
    if (currentStepInfo?.stepType !== "call_system_persona") {
      setSystemPersonaAiExpanded(false);
    }
  }, [currentStepInfo?.stepType]);

  wizardPersistCtxRef.current = {
    draftHydrated,
    name,
    activeBaseId,
    isLaunching,
    channels,
    segments,
    explicitCampaignTargetLeadIds,
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
  };

  const persistCampaignDraft = (
    currentStepForSave: Step,
    overrides?: { linkedInStepConfig?: typeof linkedInStepConfig | null; channels?: string[] }
  ) => {
    const next = persistQueueRef.current.then(async () => {
      const ctx = wizardPersistCtxRef.current;
      if (
        !ctx.draftHydrated ||
        !ctx.name.trim() ||
        !ctx.activeBaseId ||
        ctx.isLaunching ||
        launchInProgressRef.current
      ) {
        return draftCampaignIdRef.current;
      }
      setSavingDraft(true);
      try {
        const effectiveLinkedIn =
          overrides?.linkedInStepConfig !== undefined
            ? overrides.linkedInStepConfig
            : ctx.linkedInStepConfig;

        const channelsForPayload = overrides?.channels ?? channelsRef.current;

        const { campaignPayload } = buildCampaignDraftPayload({
          currentStep: currentStepForSave,
          name: ctx.name,
          channels: channelsForPayload,
          segments: ctx.segments,
          targetLeadIds: ctx.explicitCampaignTargetLeadIds,
          schedule: ctx.schedule,
          messages: ctx.messages,
          selectedMessageIndices: ctx.selectedMessageIndices,
          messagesGenerated: ctx.messagesGenerated,
          whatsAppMessages: ctx.whatsAppMessages,
          selectedWhatsAppMessageIndices: ctx.selectedWhatsAppMessageIndices,
          whatsAppMessagesGenerated: ctx.whatsAppMessagesGenerated,
          followupsPreferenceSet: ctx.followupsPreferenceSet,
          showFollowupsNumberInput: ctx.showFollowupsNumberInput,
          productService: ctx.productService,
          valueProposition: ctx.valueProposition,
          callToAction: ctx.callToAction,
          senderName: ctx.senderName,
          senderCompany: ctx.senderCompany,
          linkedInStepConfig: effectiveLinkedIn,
          selectedVoiceId: ctx.selectedVoiceId,
          initialPrompt: ctx.initialPrompt,
          systemPersona: ctx.systemPersona,
          knowledgeBaseFiles: ctx.knowledgeBaseFiles,
          leads: ctx.leads,
          hasLinkedInUrl: hasLinkedInUrlRef.current,
        });

        const id = draftCampaignIdRef.current;
        if (id) {
          await apiRequest(`/campaigns/${id}`, {
            method: "PUT",
            body: JSON.stringify(campaignPayload),
          });
          return id;
        }

        const body = { ...campaignPayload, base_id: ctx.activeBaseId };
        const campaignResponse = await apiRequest("/campaigns", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const newId = campaignResponse?.campaign?.id || campaignResponse?.id;
        if (newId) {
          draftCampaignIdRef.current = newId;
          setDraftCampaignId(newId);
          pendingLocalDraftEditRef.current = String(newId);
          router.replace(`/campaigns/new?edit=${newId}`, { scroll: false });
        }
        return newId ?? null;
      } catch (error) {
        console.error("Failed to persist campaign draft:", error);
        return draftCampaignIdRef.current;
      } finally {
        setSavingDraft(false);
      }
    });
    persistQueueRef.current = next.then(() => undefined).catch(() => undefined);
    return next;
  };

  persistFnRef.current = persistCampaignDraft;

  const refetchCampaignWizardLeads = useCallback(async () => {
    if (!activeBaseId) return;
    try {
      const data = await apiRequest(`/leads?base_id=${activeBaseId}&page=1&limit=100`);
      const leadsList = Array.isArray(data?.leads) ? data.leads : (Array.isArray(data) ? data : []);
      setLeads(leadsList);
      setCampaignLeadDrawerLead((prev) => {
        if (!prev) return null;
        const updated = leadsList.find((l: Lead) => l.id === prev.id);
        return (updated as Lead) ?? prev;
      });
    } catch (error) {
      console.error("Failed to refresh leads:", error);
    }
  }, [activeBaseId]);

  useEffect(() => {
    if (
      !activeBaseId ||
      (currentStepInfo?.stepType !== "linkedin_message_type" &&
        currentStepInfo?.stepType !== "linkedin_templates")
    ) {
      return;
    }
    void refetchCampaignWizardLeads();
  }, [activeBaseId, currentStepInfo?.stepType, refetchCampaignWizardLeads]);

  useEffect(() => {
    if (step <= totalSteps) return;
    setStep(Math.max(1, totalSteps) as Step);
  }, [step, totalSteps]);

  // Fetch leads for segment calculation (step 3+) and whenever the UI needs counts (e.g. Review after refresh).
  useEffect(() => {
    const fetchLeads = async () => {
      if (!activeBaseId) return;
      const segmentStep = 3;
      const onReview =
        currentStepInfo?.stepType === "review" || currentStepInfo?.stepType === "launch";
      const pastSegmentStep = step >= segmentStep;
      const hasSavedSegments = segments.length > 0;
      if (!pastSegmentStep && !onReview && !hasSavedSegments) return;
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
    // Do not depend on `segments` / selection — updating checkboxes changes segments and would re-fetch and flash the loader.
  }, [activeBaseId, step, channels, currentStepInfo?.stepType]);

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
          (i: any) => i.provider === 'resend' || i.provider === 'smtp'
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

        if (providerStatus?.resend_env_configured) {
          setEmailIntegration({
            provider: 'resend',
            config: {
              from_email: providerStatus?.resend_from_email || undefined
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

  // Fetch voices on voice step and on review (so Call card shows friendly names + preview)
  useEffect(() => {
    const needVoices =
      currentStepInfo?.stepType === "call_voice_selection" ||
      ((currentStepInfo?.stepType === "review" || currentStepInfo?.stepType === "launch") &&
        channels.includes("call"));
    if (!needVoices) return;
    let cancelled = false;
    const fetchVoices = async () => {
      setLoadingVoices(true);
      try {
        const data = await apiRequest("/campaigns/voices");
        if (cancelled) return;
        if (data?.voices && Array.isArray(data.voices)) {
          setAvailableVoices(data.voices as VoiceOption[]);
        } else if (data?.error) {
          console.error("Voice API error:", data.error);
          setAvailableVoices([
            {
              id: "21m00Tcm4TlvDq8ikWAM",
              name: "Rachel",
              description: "Calm and professional female voice",
              category: "premade",
            },
            {
              id: "AZnzlk1XvdvUeBnXmlld",
              name: "Drew",
              description: "Friendly male voice",
              category: "premade",
            },
            {
              id: "EXAVITQu4vr4xnSDxMaL",
              name: "Clyde",
              description: "Deep and resonant male voice",
              category: "premade",
            },
            {
              id: "ErXwobaYiN019PkySvjV",
              name: "Paul",
              description: "Warm and approachable male voice",
              category: "premade",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch voices:", error);
        if (!cancelled) {
        setAvailableVoices([
            {
              id: "21m00Tcm4TlvDq8ikWAM",
              name: "Rachel (Fallback)",
              description: "Calm and professional female voice",
              category: "premade",
            },
            {
              id: "AZnzlk1XvdvUeBnXmlld",
              name: "Drew (Fallback)",
              description: "Friendly male voice",
              category: "premade",
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    };
    void fetchVoices();
    return () => {
      cancelled = true;
    };
  }, [currentStepInfo?.stepType, channels]);

  // Load draft campaign when editing (?edit=:id)
  useEffect(() => {
    const editCampaignId = searchParams?.get("edit");
    if (!editCampaignId) {
      loadedDraftEditIdRef.current = null;
      return;
    }
    if (pendingLocalDraftEditRef.current === editCampaignId) {
      pendingLocalDraftEditRef.current = null;
      loadedDraftEditIdRef.current = editCampaignId;
      setDraftHydrated(true);
      return;
    }
    let cancelled = false;

    const loadDraftCampaign = async () => {
      try {
        const data = await apiRequest(`/campaigns/${editCampaignId}?forDraftEdit=1`);
        if (cancelled) return;
        const campaignData = data?.campaign || data;

        if (campaignData.status !== "draft") {
          console.warn("Campaign is not in draft status, cannot edit");
          showWarning("Cannot edit", "Only draft campaigns can be opened in the editor.");
          loadedDraftEditIdRef.current = editCampaignId;
          setDraftHydrated(true);
          router.replace("/campaigns");
          return;
        }

        if (cancelled) return;

        const rawConfig = campaignData.config || {};
        const cfgChannels = rawConfig.channels;
        const restoredChannels: ChannelType[] =
          campaignData.channels && Array.isArray(campaignData.channels) && campaignData.channels.length > 0
            ? (campaignData.channels as ChannelType[])
            : Array.isArray(cfgChannels) && cfgChannels.length > 0
              ? (cfgChannels as ChannelType[])
            : campaignData.channel
              ? ([campaignData.channel] as ChannelType[])
              : ["email"];

        let ownerPlanForChannels: string | null = null;
        const baseIdForPlan = typeof campaignData.base_id === "number" ? campaignData.base_id : null;
        if (baseIdForPlan != null) {
          try {
            const cr = (await apiRequest(
              `/bases/${baseIdForPlan}/workspace-credits?page=1&limit=1`
            )) as { billing_plan_key?: string | null };
            ownerPlanForChannels = cr.billing_plan_key ?? null;
          } catch {
            ownerPlanForChannels = null;
          }
        }
        const channelsForUi = filterChannelsForWorkspaceOwnerPlan(restoredChannels, ownerPlanForChannels);

        setDraftCampaignId(campaignData.id);
        draftCampaignIdRef.current = campaignData.id;
        if (campaignData.name) setName(campaignData.name);
        setChannels(channelsForUi as ChannelType[]);

        const config = rawConfig;

        if (config.segments && Array.isArray(config.segments)) {
          setSegments(config.segments);
        }
        if (Array.isArray((config as { target_lead_ids?: unknown }).target_lead_ids)) {
          const raw = (config as { target_lead_ids: unknown[] }).target_lead_ids;
          setExplicitCampaignTargetLeadIds(
            raw
              .map((x) => Number(x))
              .filter((n) => Number.isFinite(n) && !Number.isNaN(n))
          );
        } else {
          setExplicitCampaignTargetLeadIds(null);
        }

        if (config.schedule) {
          const oldSchedule = config.schedule;
          const throttleFallback = typeof oldSchedule.throttle === "number" ? oldSchedule.throttle : undefined;
          setSchedule((prev) => ({
            ...prev,
            start: oldSchedule.start ?? "",
            end: oldSchedule.end ?? "",
            launch_now:
              oldSchedule.launch_now !== undefined ? oldSchedule.launch_now : (prev.launch_now ?? true),
            email:
              oldSchedule.email != null
                ? {
                    throttle: clampScheduleThrottleValue(
                      oldSchedule.email.throttle ?? throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                    ),
                  }
                : restoredChannels.includes("email")
                  ? {
                      throttle: clampScheduleThrottleValue(
                        throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                      ),
                    }
                  : undefined,
            linkedin:
              oldSchedule.linkedin != null
                ? {
                    throttle: clampScheduleThrottleValue(
                      oldSchedule.linkedin.throttle ?? throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                    ),
                  }
                : restoredChannels.includes("linkedin")
                  ? {
                      throttle: clampScheduleThrottleValue(
                        throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                      ),
                    }
                  : undefined,
            whatsapp:
              oldSchedule.whatsapp != null
                ? {
                    throttle: clampScheduleThrottleValue(
                      oldSchedule.whatsapp.throttle ?? throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                    ),
                  }
                : restoredChannels.includes("whatsapp")
                  ? {
                      throttle: clampScheduleThrottleValue(
                        throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                      ),
                    }
                  : undefined,
            call:
              oldSchedule.call != null
                ? {
                    throttle: clampScheduleThrottleValue(
                      oldSchedule.call.throttle ?? throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                    ),
                  }
                : restoredChannels.includes("call")
                  ? {
                      throttle: clampScheduleThrottleValue(
                        throttleFallback ?? SCHEDULE_DAILY_LIMIT_MAX
                      ),
                    }
                  : undefined,
            followups: oldSchedule.followups ?? prev.followups,
            followupDelay: oldSchedule.followupDelay ?? prev.followupDelay,
            timezone:
              typeof oldSchedule.timezone === "string" && oldSchedule.timezone.trim()
                ? oldSchedule.timezone.trim()
                : prev.timezone,
          }));
          if (oldSchedule.followups !== undefined) {
            setFollowupsPreferenceSet(true);
            setShowFollowupsNumberInput(oldSchedule.followups > 0);
          }
        }

        if (config.followupsPreferenceSet !== undefined) {
          setFollowupsPreferenceSet(config.followupsPreferenceSet);
        }
        if (config.showFollowupsNumberInput !== undefined) {
          setShowFollowupsNumberInput(config.showFollowupsNumberInput);
        }

        const emailCfg = config.email || {};
        const linkedinCfg = config.linkedin || {};
        setProductService(
          String(emailCfg.productService ?? linkedinCfg.productService ?? "")
        );
        setValueProposition(
          String(emailCfg.valueProposition ?? linkedinCfg.valueProposition ?? "")
        );
        setCallToAction(
          String(
            emailCfg.callToAction ??
              linkedinCfg.callToAction ??
              "Schedule a demo"
          )
        );
        setSenderName(String(emailCfg.senderName ?? linkedinCfg.senderName ?? ""));
        setSenderCompany(
          String(emailCfg.senderCompany ?? linkedinCfg.senderCompany ?? "")
        );

        if (config.linkedin_step) {
          setLinkedInStepConfig(config.linkedin_step);
        }

        if (config.emailMessages && Array.isArray(config.emailMessages)) {
          setMessages(config.emailMessages);
          setEmailInitialContentSource("ai");
        }
        if (config.selectedEmailMessageIndices && Array.isArray(config.selectedEmailMessageIndices)) {
          setSelectedMessageIndices(config.selectedEmailMessageIndices);
        }
        if (config.messagesGenerated !== undefined) {
          setMessagesGenerated(config.messagesGenerated);
        }

        const restoredWa = config.whatsAppMessages;
        if (restoredWa && Array.isArray(restoredWa)) {
          setWhatsAppMessages(restoredWa);
        }
        if (config.selectedWhatsAppMessageIndices && Array.isArray(config.selectedWhatsAppMessageIndices)) {
          const len = restoredWa && Array.isArray(restoredWa) ? restoredWa.length : 0;
          const valid = config.selectedWhatsAppMessageIndices.filter(
            (x: unknown): x is number =>
              typeof x === "number" && Number.isInteger(x) && x >= 0 && x < len
          );
          const one = valid.length > 0 ? [valid.sort((a: number, b: number) => a - b)[0]!] : [0];
          setSelectedWhatsAppMessageIndices(len > 0 ? one : [0]);
        }
        if (config.whatsAppMessagesGenerated !== undefined) {
          setWhatsAppMessagesGenerated(config.whatsAppMessagesGenerated);
        }

        const callCfg =
          config.call && typeof config.call === "object" && !Array.isArray(config.call)
            ? (config.call as Record<string, unknown>)
            : {};
        const voiceId =
          config.selectedVoiceId ||
          campaignData.selectedVoiceId ||
          (typeof callCfg.selectedVoiceId === "string" ? callCfg.selectedVoiceId : "");
        if (voiceId) setSelectedVoiceId(voiceId);
        const firstPr =
          (config.firstPrompt as string | undefined) ||
          (campaignData.firstPrompt as string | undefined) ||
          (typeof callCfg.firstPrompt === "string" ? callCfg.firstPrompt : "");
        if (firstPr) setInitialPrompt(firstPr);
        const sysPer =
          (config.systemPersona as string | undefined) ||
          (campaignData.systemPersona as string | undefined) ||
          (typeof callCfg.systemPersona === "string" ? callCfg.systemPersona : "");
        if (sysPer) setSystemPersona(sysPer);

        const restoredStepFlow = calculateStepFlow(restoredChannels, {
          linkedin_step: config.linkedin_step,
        });
        const restoredTotalSteps = restoredStepFlow.length;

        let targetStep: Step = 1;
        const rawCurrent = config.currentStep as unknown;
        const parsedCurrent = typeof rawCurrent === "string" ? parseInt(rawCurrent, 10) : Number(rawCurrent);
        if (rawCurrent != null && rawCurrent !== "" && Number.isFinite(parsedCurrent) && parsedCurrent > 0) {
          targetStep = Math.max(1, Math.min(parsedCurrent, restoredTotalSteps)) as Step;
        } else {
          const hasEmail = restoredChannels.includes("email");
          const hasLinkedIn = restoredChannels.includes("linkedin");

          if (campaignData.name && restoredChannels.length > 0) {
            const campaignDetails = config.email || config.linkedin;
            if (
              campaignDetails?.productService &&
              campaignDetails?.valueProposition &&
              campaignDetails?.callToAction
            ) {
              targetStep = 3;
              if (config.segments && config.segments.length > 0) {
                if (hasEmail) {
                  targetStep = 4;
                  if (config.schedule?.start) {
                    targetStep = 5;
                  }
                } else if (hasLinkedIn) {
                  if (config.linkedin_step) {
                    targetStep = 5;
                  } else {
                    targetStep = 4;
                  }
                }
              }
            } else {
              targetStep = 2;
            }
          }
        }

        if (cancelled) return;
        setStep(targetStep);
        loadedDraftEditIdRef.current = editCampaignId;
        setDraftHydrated(true);

        if (restoredChannels.includes("call")) {
          const kbCampaignId = editCampaignId;
          void (async () => {
            try {
              const kbData = await apiRequest(`/campaigns/${kbCampaignId}/knowledge-base`);
              if (cancelled) return;
              if (loadedDraftEditIdRef.current !== kbCampaignId) return;
              if (kbData?.files && Array.isArray(kbData.files) && kbData.files.length > 0) {
                const f = kbData.files[0] as {
                  id: number | string;
                  name: string;
                  uploadedAt: string;
                  size?: number;
                };
                setKnowledgeBaseFiles([
                  {
                    id: String(f.id),
                    name: f.name,
                    uploadedAt: f.uploadedAt,
                    sizeBytes: typeof f.size === "number" ? f.size : undefined,
                  },
                ]);
              }
            } catch (err) {
              console.error("Failed to load knowledge base files:", err);
            }
          })();
        }
      } catch (error) {
        console.error("Failed to load draft campaign:", error);
        if (!cancelled) {
          showWarning("Draft", "Failed to load draft campaign. Starting fresh…");
          loadedDraftEditIdRef.current = editCampaignId;
          setDraftHydrated(true);
        }
      }
    };

    loadDraftCampaign();
    return () => {
      cancelled = true;
    };
  }, [searchParams, router, showWarning]);

  // Debounced auto-save (omit savingDraft from deps — it would reset the timer every save)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void persistFnRef.current?.(stepRef.current, { channels: channelsRef.current });
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [
    draftHydrated,
    step,
    name,
    channels,
    segments,
    explicitCampaignTargetLeadIds,
    schedule,
    activeBaseId,
    draftCampaignId,
    leads,
    productService,
    valueProposition,
    callToAction,
    senderName,
    senderCompany,
    messages,
    selectedMessageIndices,
    messagesGenerated,
    whatsAppMessages,
    selectedWhatsAppMessageIndices,
    whatsAppMessagesGenerated,
    followupsPreferenceSet,
    showFollowupsNumberInput,
    linkedInStepConfig,
    selectedVoiceId,
    initialPrompt,
    systemPersona,
    knowledgeBaseFiles,
    isLaunching,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      void persistFnRef.current?.(stepRef.current, { channels: channelsRef.current });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const onPageHide = () => {
      const ctx = wizardPersistCtxRef.current;
      if (
        !ctx.draftHydrated ||
        !ctx.name.trim() ||
        !ctx.activeBaseId ||
        ctx.isLaunching ||
        launchInProgressRef.current
      ) {
        return;
      }
      try {
        const { campaignPayload } = buildCampaignDraftPayload({
          currentStep: stepRef.current,
          name: ctx.name,
          channels: channelsRef.current,
          segments: ctx.segments,
          targetLeadIds: ctx.explicitCampaignTargetLeadIds,
          schedule: ctx.schedule,
          messages: ctx.messages,
          selectedMessageIndices: ctx.selectedMessageIndices,
          messagesGenerated: ctx.messagesGenerated,
          whatsAppMessages: ctx.whatsAppMessages,
          selectedWhatsAppMessageIndices: ctx.selectedWhatsAppMessageIndices,
          whatsAppMessagesGenerated: ctx.whatsAppMessagesGenerated,
          followupsPreferenceSet: ctx.followupsPreferenceSet,
          showFollowupsNumberInput: ctx.showFollowupsNumberInput,
          productService: ctx.productService,
          valueProposition: ctx.valueProposition,
          callToAction: ctx.callToAction,
          senderName: ctx.senderName,
          senderCompany: ctx.senderCompany,
          linkedInStepConfig: ctx.linkedInStepConfig,
          selectedVoiceId: ctx.selectedVoiceId,
          initialPrompt: ctx.initialPrompt,
          systemPersona: ctx.systemPersona,
          knowledgeBaseFiles: ctx.knowledgeBaseFiles,
          leads: ctx.leads,
          hasLinkedInUrl: hasLinkedInUrlRef.current,
        });
        const id = draftCampaignIdRef.current;
        const token = getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const url = id ? `${API_BASE}/api/campaigns/${id}` : `${API_BASE}/api/campaigns`;
        const body = id ? campaignPayload : { ...campaignPayload, base_id: ctx.activeBaseId };
        void fetch(url, {
          method: id ? "PUT" : "POST",
          headers,
          body: JSON.stringify(body),
          keepalive: true,
        });
      } catch {
        /* best-effort flush */
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

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
        case 'Cold leads':
          segmentLeads = leads.filter(l => {
            const t = l.tier;
            return t === 'Cold' || t == null || t === '';
          });
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
      { name: 'Cold leads', color: '#38bdf8' },
      { name: 'Engaged not converted', color: 'var(--color-primary)' },
      { name: 'Never opened', color: '#888' },
      { name: 'High-score low-engagement', color: '#F29F67' }
    ].map(s => ({
      ...s,
      count: getSegmentLeads(s.name).length,
      leads: getSegmentLeads(s.name)
    }));
  }, [leads, channels]);

  const allChannelLeads = useMemo(() => {
    const hasValidEmail = (lead: Lead): boolean => {
      if (!lead.email) return false;
      const emailInfo = getEmailInfo(lead.email, (lead as any).enrichment);
      return emailInfo.isValid && !emailInfo.isMasked;
    };
    const hasValidPhone = (lead: Lead): boolean => {
      if (!lead.phone || !lead.phone.trim()) return false;
      const cleaned = lead.phone.replace(/[^\d+]/g, "");
      const digitsOnly = cleaned.replace(/\+/g, "");
      return digitsOnly.length >= 10 && /^\+?[\d\s\-()]{10,}$/.test(lead.phone);
    };
    let filtered = [...leads];
    if (channels.includes("email")) {
      filtered = filtered.filter(hasValidEmail);
    }
    if (channels.includes("linkedin")) {
      filtered = filtered.filter(hasLinkedInUrl);
    }
    if (channels.includes("whatsapp") || channels.includes("call")) {
      filtered = filtered.filter(hasValidPhone);
    }
    return filtered;
  }, [leads, channels, hasLinkedInUrl]);

  const selectedLeadIds = useMemo(() => {
    const allowed = new Set(allChannelLeads.map((l) => l.id));
    const ids = explicitCampaignTargetLeadIds;
    // Only treat non-empty explicit lists as authoritative; [] still falls back to segments (draft/API edge cases).
    if (ids != null && ids.length > 0) {
      return new Set(ids.filter((id) => allowed.has(id)));
    }
    const set = new Set<number>();
    segments.forEach((segName) => {
      segmentData.find((s) => s.name === segName)?.leads.forEach((l) => set.add(l.id));
    });
    return set;
  }, [segments, segmentData, explicitCampaignTargetLeadIds, allChannelLeads]);

  const selectedLeadsForSamples = useMemo(
    () => allChannelLeads.filter((l) => selectedLeadIds.has(l.id)),
    [allChannelLeads, selectedLeadIds]
  );

  const whatsAppSampleLeadsForAi = useMemo(() => {
    return selectedLeadsForSamples
      .filter((lead: Lead) => {
        if (!lead.phone || !lead.phone.trim()) return false;
        const cleaned = lead.phone.replace(/[^\d+]/g, "");
        const digitsOnly = cleaned.replace(/\+/g, "");
        return digitsOnly.length >= 10;
      })
      .slice(0, 3);
  }, [selectedLeadsForSamples]);

  const buildSegmentsFromLeadIds = useCallback(
    (ids: Set<number>) => {
      const out: string[] = [];
      for (const s of segmentData) {
        if (s.leads.some((l) => ids.has(l.id))) out.push(s.name);
      }
      return out;
    },
    [segmentData]
  );

  const whatsAppAutoSuggestAttemptKeyRef = useRef<string>("");

  const runWhatsAppAiDrafts = useCallback(
    async (opts?: { quietNoPhone?: boolean }) => {
      if (!channels.includes("whatsapp") || !activeBaseId) return;

      const sampleLeads = whatsAppSampleLeadsForAi;
      if (sampleLeads.length === 0) {
        if (!opts?.quietNoPhone) {
          showWarning(
            "Phone numbers required",
            "Add leads with phone numbers to generate WhatsApp drafts."
          );
        }
        return;
      }

      setGeneratingWhatsAppMessages(true);
      try {
        const response = await apiRequest("/campaigns/generate-messages", {
          method: "POST",
          body: JSON.stringify({
            channel: "whatsapp",
            campaignName: name || "",
            campaignPurpose: productService || "",
            baseId: activeBaseId,
            segments,
            sampleLeads: sampleLeads.map((lead) => {
              const sanitized = sanitizeLeadForAPI(lead);
              if (!sanitized.industry && lead.role) {
                sanitized.industry = lead.role;
              }
              return sanitized;
            }),
            productService: productService || "",
            valueProposition: valueProposition || "",
            callToAction: callToAction || "",
            senderName: senderName || "",
            senderCompany: senderCompany || "",
          }),
        });

        if (response?.messages && Array.isArray(response.messages) && response.messages.length > 0) {
          setWhatsAppMessages(response.messages);
          setWhatsAppMessagesGenerated(true);
          setSelectedWhatsAppMessageIndices([0]);
          showSuccess("Drafts ready", "Your WhatsApp messages are ready to review.");
        } else {
          console.error("Invalid response format:", response);
          showError("Generation failed", "Failed to generate WhatsApp drafts. Please try again.");
        }
      } catch (error: unknown) {
        console.error("Failed to generate WhatsApp messages:", error);
        showError(
          "Generation failed",
          error instanceof Error ? error.message : "Failed to generate WhatsApp drafts. Please try again."
        );
      } finally {
        setGeneratingWhatsAppMessages(false);
      }
    },
    [
      channels,
      activeBaseId,
      whatsAppSampleLeadsForAi,
      name,
      productService,
      segments,
      valueProposition,
      callToAction,
      senderName,
      senderCompany,
      showWarning,
      showSuccess,
      showError,
    ]
  );

  useEffect(() => {
    if (currentStepInfo?.stepType !== "whatsapp_templates") {
      whatsAppAutoSuggestAttemptKeyRef.current = "";
      return;
    }
    if (!channels.includes("whatsapp")) return;
    if (whatsAppTemplateTab !== "ai") return;
    if (!activeBaseId) return;
    if (loadingLeads) return;

    const leadKey = `${selectedLeadsForSamples.map((l) => l.id).join(",")}|${whatsAppSampleLeadsForAi.map((l) => l.id).join(",")}`;
    const attemptKey = `${step}|${leadKey}`;
    if (whatsAppAutoSuggestAttemptKeyRef.current === attemptKey) return;

    if (whatsAppMessages.length > 0) {
      whatsAppAutoSuggestAttemptKeyRef.current = attemptKey;
      return;
    }

    whatsAppAutoSuggestAttemptKeyRef.current = attemptKey;
    void runWhatsAppAiDrafts({ quietNoPhone: true });
  }, [
    currentStepInfo?.stepType,
    whatsAppTemplateTab,
    step,
    channels,
    activeBaseId,
    loadingLeads,
    selectedLeadsForSamples,
    whatsAppSampleLeadsForAi,
    whatsAppMessages.length,
    runWhatsAppAiDrafts,
  ]);

  useEffect(() => {
    if (explicitCampaignTargetLeadIds === null) return;
    if (explicitCampaignTargetLeadIds.length === 0) return;
    const allowed = new Set(allChannelLeads.map((l) => l.id));
    // While leads refetch / channel filter yields an empty list, do not wipe saved selection.
    if (allowed.size === 0) return;
    const filtered = explicitCampaignTargetLeadIds.filter((id) => allowed.has(id));
    if (filtered.length === explicitCampaignTargetLeadIds.length) return;
    setExplicitCampaignTargetLeadIds(filtered);
    setSegments(buildSegmentsFromLeadIds(new Set(filtered)));
  }, [allChannelLeads, explicitCampaignTargetLeadIds, buildSegmentsFromLeadIds]);

  useEffect(() => {
    setLeadTablePage(1);
  }, [leadTableFilter, leadTableSearch]);

  const leadFilterCounts = useMemo(() => {
    const list = allChannelLeads;
    const score = (l: Lead) => l.score ?? 0;
    return {
      all: list.length,
      hot: list.filter((l) => l.tier === "Hot").length,
      warm: list.filter((l) => l.tier === "Warm").length,
      cold: list.filter((l) => {
        const t = l.tier;
        return t === "Cold" || t == null || t === "";
      }).length,
      never_opened: list.filter((l) => score(l) < 65).length,
      engaged: list.filter(
        (l) => (l.tier === "Hot" || l.tier === "Warm") && score(l) >= 75
      ).length,
      high_score: list.filter((l) => score(l) >= 90 && l.tier !== "Hot").length,
    };
  }, [allChannelLeads]);

  const leadsMatchingFilterPreset = useMemo(
    () => filterLeadsByLeadTableKey(allChannelLeads, leadTableFilter),
    [allChannelLeads, leadTableFilter]
  );

  const filteredTableLeads = useMemo(() => {
    let list = filterLeadsByLeadTableKey(allChannelLeads, leadTableFilter);
    const q = leadTableSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((l) => {
        const name = `${l.first_name || ""} ${l.last_name || ""}`.trim().toLowerCase();
        const em = (l.email || "").toLowerCase();
        return name.includes(q) || em.includes(q);
      });
    }
    return list;
  }, [allChannelLeads, leadTableFilter, leadTableSearch]);

  const leadTableTotalPages = Math.max(
    1,
    Math.ceil(filteredTableLeads.length / LEAD_TABLE_PAGE_SIZE)
  );

  useEffect(() => {
    setLeadTablePage((p) => Math.min(p, leadTableTotalPages));
  }, [leadTableTotalPages]);

  const paginatedTableLeads = useMemo(() => {
    const start = (leadTablePage - 1) * LEAD_TABLE_PAGE_SIZE;
    return filteredTableLeads.slice(start, start + LEAD_TABLE_PAGE_SIZE);
  }, [filteredTableLeads, leadTablePage]);

  const segmentShortLabel = (segmentName: string) =>
    segmentName
      .replace(/ leads$/i, "")
      .replace(/ not converted/i, "")
      .replace(/ low-engagement/i, "");

  const tagsForLeadRow = useCallback(
    (lead: Lead) => {
      const names: string[] = [];
      for (const s of segmentData) {
        if (s.leads.some((l) => l.id === lead.id)) names.push(segmentShortLabel(s.name));
      }
      const uniq = [...new Set(names)];
      return uniq.length ? uniq.slice(0, 4).join(" · ") : "—";
    },
    [segmentData]
  );

  // Unique leads across selected segments (avoids double-counting when a lead matches multiple segments)
  const totalLeads = useMemo(() => selectedLeadIds.size, [selectedLeadIds]);

  /** Non-empty start means "schedule for later" even if `launch_now` is stale true. */
  const scheduleTiming = useMemo(() => {
    const hasStart = Boolean(String(schedule.start ?? "").trim());
    const launchImmediate = Boolean(schedule.launch_now) && !hasStart;
    if (!schedule.end) {
      return {
        campaignDays: 0,
        labelScheduled: null as string | null,
        labelImmediate: null as string | null,
        hasStart,
        launchImmediate,
        hasScheduleWindow: false,
      };
    }
    const endMs = new Date(schedule.end).getTime();
    if (Number.isNaN(endMs)) {
      return {
        campaignDays: 0,
        labelScheduled: null,
        labelImmediate: null,
        hasStart,
        launchImmediate,
        hasScheduleWindow: false,
      };
    }
    if (hasStart) {
      const startMs = new Date(schedule.start).getTime();
      if (Number.isNaN(startMs) || endMs <= startMs) {
        return {
          campaignDays: 0,
          labelScheduled: null,
          labelImmediate: null,
          hasStart,
          launchImmediate,
          hasScheduleWindow: false,
        };
      }
      const campaignDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
      return {
        campaignDays,
        labelScheduled: formatScheduleWindowMs(startMs, endMs),
        labelImmediate: null,
        hasStart,
        launchImmediate,
        hasScheduleWindow: true,
      };
    }
    if (launchImmediate) {
      const startMs = Date.now();
      if (endMs <= startMs) {
        return {
          campaignDays: 0,
          labelScheduled: null,
          labelImmediate: null,
          hasStart,
          launchImmediate,
          hasScheduleWindow: false,
        };
      }
      const campaignDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
      return {
        campaignDays,
        labelScheduled: null,
        labelImmediate: `${formatScheduleWindowMs(startMs, endMs)} (from now)`,
        hasStart,
        launchImmediate,
        hasScheduleWindow: true,
      };
    }
    return {
      campaignDays: 0,
      labelScheduled: null,
      labelImmediate: null,
      hasStart,
      launchImmediate,
      hasScheduleWindow: false,
    };
  }, [schedule.start, schedule.end, schedule.launch_now]);

  const campaignDays = scheduleTiming.campaignDays;
  const scheduleDurationLabelScheduled = scheduleTiming.labelScheduled;
  const scheduleDurationLabelImmediate = scheduleTiming.labelImmediate;
  const scheduleLaunchImmediate = scheduleTiming.launchImmediate;
  const campaignWindowHumanForCopy =
    scheduleDurationLabelScheduled ??
    scheduleDurationLabelImmediate?.replace(/ \(from now\)$/, "") ??
    (campaignDays > 0 ? `${campaignDays} day${campaignDays !== 1 ? "s" : ""}` : null);

  // Fetch LinkedIn account type to determine max throttle
  useEffect(() => {
    const fetchLinkedInAccountType = async () => {
      if (!channels.includes('linkedin') || !activeBaseId) {
        setLinkedInAccountType(null);
        setLinkedInMaxThrottle(SCHEDULE_DAILY_LIMIT_MAX);
        return;
      }
      try {
        const integrations = await apiRequest(`/integrations/${activeBaseId}`);
        const linkedInIntegration = integrations.integrations?.find(
          (i: any) => i.provider === 'unipile_linkedin' && i.base_id === activeBaseId
        );
        if (linkedInIntegration) {
          const accountType = linkedInIntegration.config?.linkedin_account_type || 'free_basic';
          setLinkedInAccountType(accountType);
          
          // Set max throttle based on account type
          if (['premium', 'sales_navigator', 'recruiter'].includes(accountType)) {
            setLinkedInMaxThrottle(SCHEDULE_DAILY_LIMIT_MAX); // Wizard daily cap
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
    const hasScheduleWindow = scheduleTiming.hasScheduleWindow;
    if (!hasScheduleWindow || totalLeads === 0 || campaignDays === 0) {
      setRecommendedEmailThrottle(null);
      setRecommendedLinkedInThrottle(null);
      return;
    }
    
    // Calculate recommended throttle: leads / days, capped at max
    const recommendedEmail = Math.min(
      SCHEDULE_DAILY_LIMIT_MAX,
      Math.ceil(totalLeads / campaignDays)
    );
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
          SCHEDULE_DAILY_LIMIT_MAX,
          linkedInMaxThrottle,
          Math.max(1, Math.min(dailyFromMonthly, dailyFromLeads, dailyFromMaxTotal))
        );
        setRecommendedLinkedInThrottle(recommendedLinkedIn);
      } else {
        // Premium accounts: daily limits
        const recommendedLinkedIn = Math.min(
          SCHEDULE_DAILY_LIMIT_MAX,
          linkedInMaxThrottle,
          Math.ceil(totalLeads / campaignDays)
        );
        setRecommendedLinkedInThrottle(recommendedLinkedIn);
      }
    } else {
      setRecommendedLinkedInThrottle(null);
    }
  }, [
    scheduleTiming.hasScheduleWindow,
    schedule.start,
    schedule.end,
    schedule.launch_now,
    totalLeads,
    campaignDays,
    channels,
    linkedInMaxThrottle,
    linkedInMonthlyLimit,
  ]);

  const emailThrottleMax = SCHEDULE_DAILY_LIMIT_MAX;
  const whatsappThrottleMax = SCHEDULE_DAILY_LIMIT_MAX;
  const callThrottleMax = SCHEDULE_DAILY_LIMIT_MAX;
  const linkedinSliderMax = SCHEDULE_DAILY_LIMIT_MAX;

  const scheduleHasWindowForRec = scheduleTiming.hasScheduleWindow;

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

  /**
   * Auto-manage daily limits from lead volume + follow-ups.
   * Example: 10 leads + 0 follow-ups => 10/day.
   * Example: 10 leads + 2 follow-ups => 30/day (capped by channel max).
   *
   * We only recompute when campaign inputs change (leads/follow-ups/channels),
   * so manual edits stay intact until those inputs change again.
   */
  useEffect(() => {
    if (totalLeads <= 0) return;

    const followupCount = Math.max(0, schedule.followups ?? 0);
    const perLeadTouches = 1 + followupCount;
    const baseAutoDaily = Math.min(
      SCHEDULE_DAILY_LIMIT_MAX,
      Math.max(1, totalLeads * perLeadTouches)
    );

    setSchedule((prev) => {
      const next = { ...prev };
      let changed = false;

      if (channels.includes("email")) {
        const target = Math.min(emailThrottleMax, baseAutoDaily);
        if ((prev.email?.throttle ?? 0) !== target) {
          next.email = { throttle: target };
          changed = true;
        }
      }

      if (channels.includes("linkedin")) {
        const target = Math.min(linkedinSliderMax, baseAutoDaily);
        if ((prev.linkedin?.throttle ?? 0) !== target) {
          next.linkedin = { throttle: target };
          changed = true;
        }
      }

      if (channels.includes("whatsapp")) {
        const target = Math.min(whatsappThrottleMax, baseAutoDaily);
        if ((prev.whatsapp?.throttle ?? 0) !== target) {
          next.whatsapp = { throttle: target };
          changed = true;
        }
      }

      if (channels.includes("call")) {
        const target = Math.min(callThrottleMax, baseAutoDaily);
        if ((prev.call?.throttle ?? 0) !== target) {
          next.call = { throttle: target };
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    totalLeads,
    schedule.followups,
    channels,
    emailThrottleMax,
    linkedinSliderMax,
    whatsappThrottleMax,
    callThrottleMax,
  ]);

  /** Sync schedule if stored throttle exceeds slider max (slider `stored` was capped visually but state kept e.g. 200). */
  useEffect(() => {
    setSchedule((prev) => {
      const next = { ...prev };
      let changed = false;
      (["email", "linkedin", "whatsapp", "call"] as const).forEach((ch) => {
        const t = prev[ch]?.throttle;
        if (t === undefined) return;
        if (t > SCHEDULE_DAILY_LIMIT_MAX || t < 1) {
          next[ch] = { throttle: clampScheduleThrottleValue(t) };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [
    schedule.email?.throttle,
    schedule.linkedin?.throttle,
    schedule.whatsapp?.throttle,
    schedule.call?.throttle,
  ]);

  /** Keep initial + each follow-up template slot selected when follow-up count changes */
  useEffect(() => {
    const need = 1 + (schedule.followups ?? 0);
    setSelectedMessageIndices((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < need; i++) next.add(i);
      return Array.from(next).sort((a, b) => a - b);
    });
  }, [schedule.followups]);

  const resolveKbCampaignId = async (): Promise<number> => {
    let campaignId = draftCampaignId;
    if (!campaignId) {
      const editCampaignId = searchParams?.get("edit");
      if (editCampaignId) {
        campaignId = Number(editCampaignId);
      }
    }
    if (!campaignId) {
      if (!activeBaseId) {
        throw new Error("Please select a base first");
      }
      if (!name.trim()) {
        throw new Error("Please enter a campaign name first");
      }
      const draftResponse = await apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          base_id: activeBaseId,
          name: name || "Untitled Campaign",
          channel: channels[0] || "call",
          channels: channels,
          status: "draft",
          config: {},
        }),
      });
      const id = draftResponse.campaign?.id as number | undefined;
      if (!id) {
        throw new Error("Failed to create draft campaign");
      }
      setDraftCampaignId(id);
      draftCampaignIdRef.current = id;
      pendingLocalDraftEditRef.current = String(id);
      router.replace(`/campaigns/new?edit=${id}`, { scroll: false });
      return id;
    }
    return campaignId;
  };

  const openKbAiSuggestion = async (suggestionId: string, label: string, userTopic?: string) => {
    setKbAiError(null);
    const focusRaw = userTopic?.trim().slice(0, 500) || "";
    setKbAiUserTopic(focusRaw || null);
    setKbAiSuggestionId(suggestionId);
    setKbAiSuggestionLabel(label);
    setKbAiOpen(true);
    setKbAiPhase("loading");
    setKbAiQuestions([]);
    setKbAiAnswers([]);
    try {
      const campaignId = await resolveKbCampaignId();
      const res = await apiRequest(`/campaigns/${campaignId}/knowledge-base/ai-questions`, {
        method: "POST",
        body: JSON.stringify({
          suggestionId,
          ...(focusRaw ? { userTopic: focusRaw } : {}),
        }),
      });
      const qs = Array.isArray(res.questions) ? res.questions.map((q: string) => String(q)) : [];
      setKbAiQuestions(qs.length ? qs : ["What should the agent emphasize?"]);
      setKbAiAnswers(new Array(Math.max(qs.length, 1)).fill(""));
      setKbAiPhase("questions");
    } catch (e: any) {
      const msg = e?.message || "Could not load questions";
      setKbAiUserTopic(null);
      setKbAiError(msg);
      setKbAiPhase("idle");
      showError("Knowledge base", msg);
    }
  };

  const submitKbAiAnswers = async () => {
    if (!kbAiSuggestionId) return;
    setKbAiError(null);
    setKbAiPhase("generating");
    try {
      const campaignId = await resolveKbCampaignId();
      const cleanedQuestions = kbAiQuestions.map((q) =>
        q.replace(/\s*\(optional\)\s*$/i, "").trim()
      );
      const res = (await apiRequest(`/campaigns/${campaignId}/knowledge-base/ai-generate-pdf`, {
        method: "POST",
        body: JSON.stringify({
          suggestionId: kbAiSuggestionId,
          questions: cleanedQuestions,
          answers: kbAiAnswers.map((a, i) => a || `(No answer for: ${cleanedQuestions[i]?.slice(0, 40)}…)`),
          ...(kbAiUserTopic ? { userTopic: kbAiUserTopic } : {}),
        }),
      })) as { file?: { id?: number | string; name?: string; uploadedAt?: string; size?: number }; suggestedSystemPersona?: string };
      const f = res.file;
      if (f?.id) {
        setKnowledgeBaseFiles([
          {
            id: String(f.id),
            name: f.name || "knowledge-base",
            uploadedAt: f.uploadedAt || new Date().toISOString(),
            sizeBytes: typeof f.size === "number" ? f.size : undefined,
          },
        ]);
      }
      applyKbDerivedSystemPersona(res.suggestedSystemPersona);
      if (!String(res.suggestedSystemPersona ?? "").trim()) {
        showWarning(
          "Assistant style not auto-filled",
          "We could not build a prompt from this document. Check OpenAI credentials, or edit the Assistant step manually."
        );
      }
      setKbAiUserTopic(null);
      setKbAiOpen(false);
      setKbAiPhase("idle");
      setKbAiSuggestionId(null);
    } catch (e: any) {
      setKbAiError(e?.message || "Failed to generate knowledge base");
      setKbAiPhase("questions");
    }
  };

  const fetchKbPdfBlob = async (fileId: string, download: boolean): Promise<void> => {
    const campaignId = draftCampaignId || Number(searchParams?.get("edit"));
    if (!campaignId) {
      showError("Missing campaign", "Save the campaign first.");
      return;
    }
    const token = getToken();
    const q = download ? "?download=1" : "";
    const response = await fetch(
      `${API_BASE}/api/campaigns/${campaignId}/knowledge-base/${fileId}/content${q}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Could not open file");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (download) {
      const a = document.createElement("a");
      a.href = url;
      a.download = knowledgeBaseFiles.find((f) => f.id === fileId)?.name || "knowledge-base";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    }
  };

  // Handle file upload for knowledge base (XHR for upload progress)
  const handleFileUpload = async (file: File) => {
    if (!activeBaseId) {
      setUploadError("Please select a base first");
      return;
    }

    if (file.type !== "application/pdf") {
      setUploadError("Only knowledge base files in supported format are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setUploadingFile(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const campaignId = await resolveKbCampaignId();
      const formData = new FormData();
      formData.append("pdf", file);
      const token = getToken();
      const url = `${API_BASE}/api/campaigns/${campaignId}/knowledge-base/pdf`;

      const data = await new Promise<{
        file?: { id?: number | string; uploadedAt?: string; size?: number };
        suggestedSystemPersona?: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
          }
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || "{}") as {
              error?: string;
              file?: { id?: number | string; uploadedAt?: string; size?: number };
              suggestedSystemPersona?: string;
            };
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error || "Upload failed"));
            }
          } catch {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });

      const idStr = data.file?.id != null ? String(data.file.id) : Date.now().toString();
      const sizeBytes =
        typeof data.file?.size === "number" ? data.file.size : file.size;
      const uploadedAt = data.file?.uploadedAt || new Date().toISOString();
      setKnowledgeBaseFiles([{ id: idStr, name: file.name, uploadedAt, sizeBytes }]);
      applyKbDerivedSystemPersona(data.suggestedSystemPersona);
      if (!String(data.suggestedSystemPersona ?? "").trim()) {
        showWarning(
          "Assistant style not auto-filled",
          "We could not build a prompt from this PDF (often image-only scans, or no OpenAI key). Add OPENAI_API_KEY or OpenAI in API credentials, try a text-based PDF, or write the Assistant step yourself."
        );
      }
    } catch (error: unknown) {
      console.error("File upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
    }
  };

  const triggerKbPdfFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.files?.[0]) {
        void handleFileUpload(t.files[0]);
      }
    };
    input.click();
  };

  // Auto-generate email messages on the email_templates step (dynamic step number — not hardcoded)
  useEffect(() => {
    const generateEmailTemplates = async () => {
      const isDefaultMessages = messages[0]?.includes('quick idea') || 
                                messages[0]?.includes('noticed') || 
                                messages[0]?.includes('Question about') ||
                                messages.length === 0;
      
      // Check if we need to regenerate templates (follow-up count changed)
      const expectedTemplateCount = 1 + (schedule.followups || 0);
      const needsRegeneration = messages.length !== expectedTemplateCount;
      
      if (
        currentStepInfo?.stepType === 'email_templates' &&
        channels.includes('email') &&
        followupsPreferenceSet &&
        (!messagesGenerated || needsRegeneration) &&
        (isDefaultMessages || needsRegeneration) &&
        productService &&
        valueProposition &&
        callToAction &&
        totalLeads > 0 &&
        activeBaseId &&
        segmentData.length > 0
      ) {
        setEmailDraftFetchState("center");
        try {
          const sampleLeads = selectedLeadsForSamples.slice(0, 3);
          
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
                numberOfTemplates: numberOfTemplates,
                tone: emailDraftToneRef.current,
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
              setEmailInitialContentSource("ai");
              setMessagesGenerated(true);
              setEmailWizardPreview(null);
              setEmailWizardEdit(null);
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
          setEmailDraftFetchState("idle");
        }
      }
    };
    
    generateEmailTemplates();
  }, [currentStepInfo?.stepType, step, channels, name, segments, segmentData, activeBaseId, productService, valueProposition, callToAction, senderName, senderCompany, messages, messagesGenerated, followupsPreferenceSet, schedule.followups, linkedInStepConfig, totalLeads, selectedLeadsForSamples]);

  const regenerateAiEmailDrafts = useCallback(
    async (opts: { tone: EmailDraftTone; toastTitle: string; toastMessage?: string }) => {
      if (!channels.includes("email")) {
        showWarning("Email channel", "Turn on the email channel to regenerate drafts.");
        return;
      }
      if (!activeBaseId) {
        showWarning("Workspace", "Select a workspace (base) so we can generate drafts.");
        return;
      }
      const sampleLeads = selectedLeadsForSamples.slice(0, 3);

      setEmailDraftFetchState("skeleton");
      try {
        const numberOfTemplates = 1 + (schedule.followups || 0);
        const response = await apiRequest("/campaigns/generate-messages", {
          method: "POST",
          body: JSON.stringify({
            channel: "email",
            campaignName: name,
            baseId: activeBaseId,
            segments,
            sampleLeads: sampleLeads.map(sanitizeLeadForAPI),
            productService,
            valueProposition,
            callToAction,
            senderName,
            senderCompany,
            numberOfTemplates,
            tone: opts.tone,
          }),
        });

        if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
          const processedMessages = response.messages.slice(0, numberOfTemplates);
          while (processedMessages.length < numberOfTemplates) {
            processedMessages.push("Subject: \n\n");
          }
          setMessages(processedMessages);
          setEmailInitialContentSource("ai");
          setMessagesGenerated(true);
          setEmailWizardPreview(null);
          setEmailWizardEdit(null);
          setSelectedMessageIndices(Array.from({ length: processedMessages.length }, (_, idx) => idx));
          showSuccess(opts.toastTitle, opts.toastMessage ?? "");
        } else {
          showError("Couldn’t regenerate", "No drafts were returned. Check your connection and try again.");
        }
      } catch (error) {
        console.error("Failed to regenerate templates:", error);
        showError("Couldn’t regenerate", "Something went wrong. Try again in a moment.");
      } finally {
        setEmailDraftFetchState("idle");
      }
    },
    [
      channels,
      activeBaseId,
      segments,
      name,
      productService,
      valueProposition,
      callToAction,
      senderName,
      senderCompany,
      schedule.followups,
      selectedLeadsForSamples,
      showSuccess,
      showWarning,
      showError,
    ]
  );

  const generateCallSystemPersonaWithBrief = useCallback(
    async (userBrief: string) => {
      const trimmed = userBrief.trim();
      if (!trimmed) {
        showWarning("Describe your style", "Pick a suggestion above or type what you want, then generate.");
        return;
      }
      setSystemPersonaGenerating(true);
      try {
        const response = (await apiRequest("/campaigns/generate-call-system-persona", {
          method: "POST",
          body: JSON.stringify({
            userBrief: trimmed,
            campaignName: name || undefined,
            baseId: activeBaseId ?? undefined,
            segments: segments.length > 0 ? segments : undefined,
            productService: productService || undefined,
            valueProposition: valueProposition || undefined,
            callToAction: callToAction || undefined,
          }),
        })) as { systemPersona?: string };

        const text =
          typeof response?.systemPersona === "string" ? response.systemPersona.trim() : "";
        if (!text) {
          showError("Generation failed", "No behavior text was returned. Try again.");
          return;
        }
        setSystemPersona(text);
        showSuccess("Assistant behavior ready", "Review and edit the system prompt below if you want.");
      } catch (error) {
        console.error("Failed to generate system persona:", error);
        showError("Generation failed", "Could not generate assistant behavior. Try again.");
      } finally {
        setSystemPersonaGenerating(false);
      }
    },
    [
      name,
      activeBaseId,
      segments,
      productService,
      valueProposition,
      callToAction,
      showSuccess,
      showWarning,
      showError,
    ]
  );

  const back = async () => {
    if (wizardNavBusy || wizardStepperLoadingStep !== null) return;
    setWizardNavBusy("back");
    try {
    if (step === 1) {
        try {
          await persistCampaignDraft(1, { channels });
        } catch {
          /* still leave */
        }
        router.push("/campaigns");
        return;
      }
      const prevStep = Math.max(1, step - 1) as Step;
      await persistCampaignDraft(prevStep, { channels });
      setStep(prevStep);
    } catch (e) {
      console.error(e);
    } finally {
      setWizardNavBusy(null);
    }
  };

  const goToWizardStepByType = async (stepType: StepType) => {
    if (wizardNavBusy || wizardStepperLoadingStep !== null) return;
    const n = getStepNumberForType(stepType, channels as ChannelType[], {
      linkedin_step: linkedInStepConfig,
    });
    if (n == null) return;
    const ctx = stepValidationContextRef.current;
    if (ctx && n > step) {
      const block = getFirstBlockingStepForForwardJump(step, n, ctx);
      if (block != null) {
        const hint =
          getValidationError({ ...ctx, step: block }) ?? "Complete this step before skipping ahead.";
        showWarning("Can't skip ahead", hint);
        return;
      }
    }
    setWizardStepperLoadingStep(n);
    try {
      await persistCampaignDraft(n as Step, { channels });
      setStep(n as Step);
    } catch (e) {
      console.error(e);
    } finally {
      setWizardStepperLoadingStep(null);
    }
  };

  const jumpToWizardStep = useCallback(
    async (targetStep: number) => {
      if (wizardNavBusy || wizardStepperLoadingStep !== null) return;
      if (targetStep === step) return;
      if (targetStep < 1 || targetStep > totalSteps) return;
      const ctx = stepValidationContextRef.current;
      if (ctx && targetStep > step) {
        const block = getFirstBlockingStepForForwardJump(step, targetStep, ctx);
        if (block != null) {
          const hint =
            getValidationError({ ...ctx, step: block }) ?? "Complete this step before skipping ahead.";
          showWarning("Can't skip ahead", hint);
          return;
        }
      }
      setWizardStepperLoadingStep(targetStep);
      try {
        await persistCampaignDraft(targetStep as Step, { channels });
        setStep(targetStep as Step);
      } catch (e) {
        console.error(e);
      } finally {
        setWizardStepperLoadingStep(null);
      }
    },
    [wizardNavBusy, wizardStepperLoadingStep, step, totalSteps, channels, showWarning]
  );

  const reviewThrottleInvalid = useMemo(() => {
    const emailBad =
      channels.includes("email") &&
      (schedule.email?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX) > SCHEDULE_DAILY_LIMIT_MAX;
    const liBad =
      channels.includes("linkedin") &&
      (schedule.linkedin?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX) > SCHEDULE_DAILY_LIMIT_MAX;
    const waBad =
      channels.includes("whatsapp") &&
      (schedule.whatsapp?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX) > SCHEDULE_DAILY_LIMIT_MAX;
    const callBad =
      channels.includes("call") &&
      (schedule.call?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX) > SCHEDULE_DAILY_LIMIT_MAX;
    return { emailBad, liBad, waBad, callBad, any: emailBad || liBad || waBad || callBad };
  }, [
    channels,
    schedule.email?.throttle,
    schedule.linkedin?.throttle,
    schedule.whatsapp?.throttle,
    schedule.call?.throttle,
  ]);

  const reviewLaunchBlocked = useMemo(
    () =>
      !name?.trim() ||
      channels.length === 0 ||
      segments.length === 0 ||
      totalLeads === 0 ||
      reviewThrottleInvalid.any,
    [
      name,
      channels.length,
      segments.length,
      totalLeads,
      reviewThrottleInvalid.any,
    ]
  );

  const stopVoicePreview = () => {
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
        previewAudioRef.current = null;
      }
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setPreviewingVoiceId(null);
  };

  const playVoicePreview = async (voiceId: string) => {
    const token = getToken();
    if (!token) {
      showError("Sign in required", "Please sign in to preview voices.");
      return;
    }
    setPreviewLoadingVoiceId(voiceId);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/voices/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voiceId }),
      });
      if (!res.ok) {
        let msg = "Could not load preview audio.";
        try {
          const j = await res.json();
          msg = j.message || j.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      stopVoicePreview();
      const url = URL.createObjectURL(blob);
      previewObjectUrlRef.current = url;
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPreviewingVoiceId(null);
      };
      await audio.play();
      setPreviewingVoiceId(voiceId);
    } catch (e: any) {
      showError("Preview failed", e?.message || "Could not play preview.");
    } finally {
      setPreviewLoadingVoiceId(null);
    }
  };

  const toggleVoicePreview = async (voiceId: string) => {
    if (previewingVoiceId === voiceId && previewAudioRef.current) {
      if (previewAudioRef.current.paused) {
        await previewAudioRef.current.play();
        setPreviewingVoiceId(voiceId);
        return;
      }
      previewAudioRef.current.pause();
      setPreviewingVoiceId(null);
      return;
    }
    await playVoicePreview(voiceId);
  };

  const closeConfirmDetailPreview = () => {
    if (confirmDetailPreview?.layout === "voice" && confirmDetailPreview.voice?.id) {
      const vid = confirmDetailPreview.voice.id;
      if (previewingVoiceId === vid || previewLoadingVoiceId === vid) {
        stopVoicePreview();
      }
    }
    setConfirmDetailPreview(null);
  };

  useEffect(() => {
    if (!confirmOpen && confirmDetailPreview?.layout === "voice") {
      stopVoicePreview();
    }
  }, [confirmOpen, confirmDetailPreview?.layout]);

  const isVoiceCloneSampleFile = (f: File) =>
    f.type.startsWith("audio/") || /\.(wav|mp3|m4a|webm|aac|flac|ogg)$/i.test(f.name);

  const mergeVoiceCloneFiles = (incoming: File[], existing: File[]) => {
    const key = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
    const map = new Map<string, File>();
    existing.forEach((file) => map.set(key(file), file));
    incoming.filter(isVoiceCloneSampleFile).forEach((file) => map.set(key(file), file));
    return Array.from(map.values());
  };

  const stopVoiceCloneSamplePreview = () => {
    try {
      if (voiceClonePreviewAudioRef.current) {
        voiceClonePreviewAudioRef.current.pause();
        voiceClonePreviewAudioRef.current.src = "";
        voiceClonePreviewAudioRef.current = null;
      }
      if (voiceClonePreviewUrlRef.current) {
        URL.revokeObjectURL(voiceClonePreviewUrlRef.current);
        voiceClonePreviewUrlRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setVoiceClonePreviewIndex(null);
  };

  const toggleVoiceCloneSamplePreview = async (file: File, idx: number) => {
    if (voiceClonePreviewIndex === idx && voiceClonePreviewAudioRef.current) {
      if (voiceClonePreviewAudioRef.current.paused) {
        await voiceClonePreviewAudioRef.current.play();
        setVoiceClonePreviewIndex(idx);
        return;
      }
      voiceClonePreviewAudioRef.current.pause();
      setVoiceClonePreviewIndex(null);
      return;
    }
    stopVoiceCloneSamplePreview();
    const sampleUrl = URL.createObjectURL(file);
    voiceClonePreviewUrlRef.current = sampleUrl;
    const sampleAudio = new Audio(sampleUrl);
    voiceClonePreviewAudioRef.current = sampleAudio;
    sampleAudio.onended = () => setVoiceClonePreviewIndex(null);
    await sampleAudio.play();
    setVoiceClonePreviewIndex(idx);
  };

  const submitVoiceClone = async () => {
    const token = getToken();
    if (!token) {
      showError("Sign in required", "Please sign in to clone a voice.");
      return;
    }
    if (!voiceCloneName.trim()) {
      showError("Name required", "Enter a name for your cloned voice.");
      return;
    }
    if (voiceCloneFiles.length === 0) {
      showError("Samples required", "Add at least one short audio sample (WAV or MP3).");
      return;
    }
    setCloningVoice(true);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const fd = new FormData();
      fd.append("name", voiceCloneName.trim());
      fd.append("description", voiceCloneDescription.trim());
      fd.append("language", "en");
      voiceCloneFiles.forEach((file) => fd.append("samples", file));
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 180000);
      const res = await fetch(`${API_BASE}/api/campaigns/voices/clone`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (!res.ok) {
        let msg = "Clone failed";
        try {
          const j = await res.json();
          msg = j.message || j.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const data = await res.json();
      const v = data?.voice;
      if (v?.id) {
        const next: VoiceOption = {
          id: v.id,
          name: v.name || voiceCloneName.trim(),
          category: v.category || "cloned",
          description: typeof v.description === "string" ? v.description : "Your cloned voice",
          previewUrl: v.previewUrl ?? null,
        };
        if (data?.persisted !== false) {
          setAvailableVoices((prev) => [next, ...prev.filter((x) => x.id !== next.id)]);
          setSelectedVoiceId(next.id);
        }
      }
      if (data?.persisted === false) {
        showWarning("Voice created", typeof data?.warning === "string" ? data.warning : "Run the database migration so this voice is linked to your account.");
    } else {
        showSuccess(
          "Voice cloned",
          v?.name ? `"${v.name}" is ready — it appears under My voices.` : "Your new voice is ready."
        );
        setVoicePickerTab("my");
        setVoiceCloneOpen(false);
        setVoiceCloneName("");
        setVoiceCloneDescription("");
        setVoiceCloneFiles([]);
        stopVoiceCloneSamplePreview();
      }
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Voice cloning timed out after 3 minutes. Try shorter/cleaner samples and retry."
          : e?.message || "Could not create voice.";
      showError("Clone failed", msg);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setCloningVoice(false);
    }
  };

  const confirmDeleteClonedVoice = async () => {
    const target = voiceDeleteTarget;
    if (!target) return;
    setVoiceDeleteLoading(true);
    try {
      await apiRequest(`/campaigns/voices/cloned/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      setAvailableVoices((prev) => prev.filter((v) => v.id !== target.id));
      if (selectedVoiceId === target.id) setSelectedVoiceId("");
      if (previewingVoiceId === target.id) {
        try {
          if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.src = "";
            previewAudioRef.current = null;
          }
          if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
          }
        } catch {
          /* ignore */
        }
        setPreviewingVoiceId(null);
      }
      showSuccess("Voice deleted", `"${target.name}" was removed from your account and the voice provider.`);
      setVoiceDeleteTarget(null);
    } catch (e: any) {
      showError("Delete failed", e?.message || "Could not delete voice.");
    } finally {
      setVoiceDeleteLoading(false);
    }
  };

  const stepProgressPct = totalSteps > 0 ? Math.min(100, Math.round((step / totalSteps) * 100)) : 0;

  const wizardPhaseBanner = useMemo(
    () => getWizardPhaseBanner(currentStepInfo?.stepType),
    [currentStepInfo?.stepType]
  );

  const stepValidationContext = useMemo<ValidationContext>(
    () => ({
      step,
      channels: channels as ChannelType[],
      channelConfigs: { linkedin_step: linkedInStepConfig },
      name,
      productService,
      whatsAppMessagesGenerated,
      whatsAppMessages,
      selectedWhatsAppMessageIndices,
      valueProposition,
      callToAction,
      senderName,
      senderCompany,
      segments,
      selectedLeadCount: totalLeads,
      schedule,
      followupsPreferenceSet,
      linkedInStepConfig: linkedInStepConfig || undefined,
      knowledgeBaseFiles,
      selectedVoiceId,
      initialPrompt,
      systemPersona,
      messages,
      selectedMessageIndices,
    }),
    [
      step,
      channels,
      linkedInStepConfig,
      name,
      productService,
      whatsAppMessagesGenerated,
      whatsAppMessages,
      selectedWhatsAppMessageIndices,
      valueProposition,
      callToAction,
      senderName,
      senderCompany,
      segments,
      totalLeads,
      schedule,
      followupsPreferenceSet,
      knowledgeBaseFiles,
      selectedVoiceId,
      initialPrompt,
      systemPersona,
      messages,
      selectedMessageIndices,
    ]
  );
  stepValidationContextRef.current = stepValidationContext;
  const nextStepValidationError = getValidationError(stepValidationContext);

  const isCallKnowledgeStep = currentStepInfo?.stepType === "call_knowledge_base";
  const isCallVoiceStep = currentStepInfo?.stepType === "call_voice_selection";
  const wizardAnyNavBusy = wizardNavBusy !== null || wizardStepperLoadingStep !== null;
  const nextButtonDisabled =
    wizardAnyNavBusy || !canProceedToNextStep(stepValidationContext);

  const next = async () => {
    if (wizardNavBusy || wizardStepperLoadingStep !== null) return;
    if (
      currentStepInfo?.stepType === "core_details_part2" &&
      totalLeads > CAMPAIGN_WIZARD_MAX_LEADS
    ) {
      showWarning(
        "Maximum 30 leads per campaign",
        `Each campaign can include up to ${CAMPAIGN_WIZARD_MAX_LEADS} leads. Remove some leads before continuing.`
      );
      return;
    }
    if (!canProceedToNextStep(stepValidationContext)) {
      return;
    }
    const maxStep = totalSteps;
    const nextStep = Math.min(maxStep, step + 1) as Step;
    setWizardNavBusy("next");
    try {
      await persistCampaignDraft(nextStep, { channels });
      setStep(nextStep);
    } catch (e) {
      console.error(e);
    } finally {
      setWizardNavBusy(null);
    }
  };

  if (editParam && !draftHydrated) {
    return (
      <GlobalPageLoader
        layout="page"
        ariaLabel="Loading campaign"
        message="Loading campaign…"
      />
    );
  }

  const channelConnectionsPending =
    typeof activeBaseId === "number" && channelAvailability === null;

  if (channelConnectionsPending) {
    return (
      <GlobalPageLoader
        layout="page"
        ariaLabel="Checking channel connections"
        message="Preparing campaign…"
      />
    );
  }

  return (
    <>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes voiceRowPlayingPulse {
        0%, 100% { box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.2); }
        50% { box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.2); }
      }
      .campaign-wizard-root .voice-row-playing-pulse {
        animation: voiceRowPlayingPulse 1.25s ease-in-out infinite;
      }
      .campaign-wizard-root .voice-preview-btn {
        flex-shrink: 0;
        padding: 6px 12px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 13px;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }
      .campaign-wizard-root .voice-preview-btn-idle {
        border: 1px solid transparent;
        color: var(--color-text-muted);
        background: transparent;
      }
      .campaign-wizard-root .voice-preview-btn-idle:hover:not(:disabled) {
        border-color: transparent;
        background: rgba(var(--color-primary-rgb), 0.2);
        color: var(--color-primary);
      }
      .campaign-wizard-root .voice-preview-btn-playing {
        border: 1px solid transparent;
        color: var(--color-primary);
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-preview-btn-playing:hover:not(:disabled) {
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-preview-btn:disabled {
        opacity: 1;
        cursor: not-allowed;
        border-color: rgba(var(--color-primary-rgb), 0.35);
        background: rgba(var(--color-primary-rgb), 0.12);
        color: var(--color-primary);
      }
      .campaign-wizard-root .voice-step-shell {
        border-radius: 16px;
        border: none;
        background: var(--color-surface);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
        overflow: hidden;
        min-width: 0;
      }
      .campaign-wizard-root .voice-step-segment-wrap {
        display: flex;
        gap: 6px;
        background: rgba(15, 23, 42, 0.03);
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        box-sizing: border-box;
      }
      .campaign-wizard-root .voice-step-segment {
        flex: 1;
        min-height: 44px;
        padding: 10px 14px;
        border-radius: 11px;
        border: none;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
      }
      .campaign-wizard-root .voice-step-segment-active {
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 600;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
      }
      .campaign-wizard-root .voice-step-segment-idle {
        background: transparent;
        color: var(--color-text-muted);
        font-weight: 500;
      }
      .campaign-wizard-root .voice-step-segment-idle:hover {
        color: var(--color-text);
        background: rgba(15, 23, 42, 0.05);
      }
      .campaign-wizard-root .voice-select-row {
        transition: background 0.15s ease;
        background: transparent;
      }
      .campaign-wizard-root .voice-select-row[data-selected="true"] {
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-select-row:hover {
        background: rgba(15, 23, 42, 0.045);
      }
      .campaign-wizard-root .voice-select-row[data-selected="true"]:hover {
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-select-row:focus-visible {
        outline: 2px solid rgba(var(--color-primary-rgb), 0.2);
        outline-offset: -2px;
      }
      .campaign-wizard-root .voice-list-scroll {
        max-height: min(52vh, 440px);
        overflow-y: auto;
        scroll-behavior: smooth;
        padding: 0;
        box-sizing: border-box;
      }
      .campaign-wizard-root .voice-list-rows {
        display: flex;
        flex-direction: column;
        border-radius: 10px;
        overflow: hidden;
        background: rgba(15, 23, 42, 0.02);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
      }
      .campaign-wizard-root .voice-list-rows .voice-select-row + .voice-select-row {
        border-top: 1px solid rgba(15, 23, 42, 0.07);
      }
      .campaign-wizard-root .voice-load-more-plain {
        width: 100%;
        margin-top: 10px;
        padding: 11px 12px;
        border: none;
        border-radius: 10px;
        background: transparent;
        color: var(--color-primary);
        font-size: 14px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background 0.15s ease;
      }
      .campaign-wizard-root .voice-load-more-plain:hover {
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-search-field {
        width: 100%;
        padding: 11px 14px 11px 40px;
        font-size: 14px;
        border-radius: 10px;
        box-sizing: border-box;
        border: none;
        background: rgba(15, 23, 42, 0.045);
        color: var(--color-text);
        outline: none;
        transition: background 0.15s ease, box-shadow 0.15s ease;
      }
      .campaign-wizard-root .voice-search-field::placeholder {
        color: var(--color-text-muted);
        opacity: 0.85;
      }
      .campaign-wizard-root .voice-search-field:focus {
        background: var(--color-surface);
        box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.2), 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .voice-filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      @media (max-width: 520px) {
        .campaign-wizard-root .voice-filter-chips {
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 6px;
          margin-bottom: -4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
      }
      .campaign-wizard-root .call-opening-panel {
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      .campaign-wizard-root .call-opening-panel-inner {
        padding: 20px;
        box-sizing: border-box;
      }
      @media (max-width: 919px) {
        .campaign-wizard-root .call-opening-panel-inner {
          padding: 18px 16px;
        }
      }
      .campaign-wizard-root .call-opening-chip {
        border: none;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        background: rgba(var(--color-primary-rgb), 0.2);
        color: color-mix(in srgb, var(--color-primary) 88%, #000000);
        cursor: pointer;
        transition: background 0.15s ease, transform 0.12s ease;
      }
      .campaign-wizard-root .call-opening-chip:hover {
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .call-opening-chip:active {
        transform: scale(0.98);
      }
      .campaign-wizard-root .call-opening-grid {
        display: grid;
        gap: 22px;
        align-items: start;
      }
      @media (min-width: 920px) {
        .campaign-wizard-root .call-opening-grid {
          grid-template-columns: minmax(0, 1fr) minmax(252px, 300px);
        }
      }
      .campaign-wizard-root .call-opening-editor-shell {
        position: relative;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.035);
        overflow: hidden;
        min-height: 200px;
      }
      .campaign-wizard-root .call-opening-loader-overlay {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        background: color-mix(in srgb, var(--color-surface) 88%, transparent);
        backdrop-filter: blur(5px);
        color: var(--color-text-muted);
        font-size: 14px;
        font-weight: 500;
      }
      .campaign-wizard-root .call-opening-textarea {
        width: 100%;
        min-height: 176px;
        max-height: 280px;
        resize: vertical;
        border: none;
        border-radius: 0;
        padding: 14px 14px 40px;
        font-size: 14px;
        line-height: 1.55;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: transparent;
        color: var(--color-text);
        box-sizing: border-box;
      }
      .campaign-wizard-root .call-opening-textarea:focus {
        outline: none;
      }
      .campaign-wizard-root .call-opening-textarea::placeholder {
        color: var(--color-text-muted);
        opacity: 0.75;
      }
      .campaign-wizard-root .persona-behavior-textarea {
        min-height: 220px;
        max-height: 520px;
      }
      .campaign-wizard-root .call-opening-meta {
        position: absolute;
        bottom: 10px;
        right: 12px;
        font-size: 12px;
        color: var(--color-text-muted);
        pointer-events: none;
      }
      .campaign-wizard-root .call-opening-preview {
        margin-top: 14px;
        padding: 12px 14px 14px 16px;
        border-radius: 0 12px 12px 0;
        border: none;
        border-left: 3px solid var(--color-primary);
        background: rgba(var(--color-primary-rgb), 0.2);
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-text);
      }
      .campaign-wizard-root .call-opening-starter {
        width: 100%;
        text-align: left;
        padding: 12px 14px;
        margin: 0;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        border-left: 3px solid rgba(var(--color-primary-rgb), 0.35);
        box-sizing: border-box;
      }
      .campaign-wizard-root .call-opening-starter:hover {
        background: rgba(var(--color-primary-rgb), 0.2);
        border-color: rgba(var(--color-primary-rgb), 0.55);
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(var(--color-primary-rgb), 0.18);
      }
      .campaign-wizard-root .call-opening-starter[data-selected="true"] {
        background: rgba(var(--color-primary-rgb), 0.2);
        border-color: rgba(var(--color-primary-rgb), 0.65);
        border-left-color: var(--color-primary);
        box-shadow: 0 8px 18px rgba(var(--color-primary-rgb), 0.16);
      }
      .campaign-wizard-root .call-opening-starter:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.28), 0 8px 18px rgba(var(--color-primary-rgb), 0.16);
      }
      .campaign-wizard-root .call-opening-chip:disabled,
      .campaign-wizard-root .call-opening-starter:disabled {
        opacity: 1;
        cursor: not-allowed;
        border-left-color: rgba(var(--color-primary-rgb), 0.35);
        border-color: rgba(var(--color-primary-rgb), 0.35);
        box-shadow: none;
        transform: none;
        background: rgba(var(--color-primary-rgb), 0.12);
        color: var(--color-primary);
      }
      .campaign-wizard-root .call-opening-starter-cta {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-primary);
      }
      .campaign-wizard-root .call-opening-starters-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 4px 0 0;
      }
      .campaign-wizard-root .call-opening-starters-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--color-text-muted);
        margin: 0 0 8px;
      }
      .campaign-wizard-root .wizard-footer-back {
        font-family: inherit;
        margin: 0;
        box-sizing: border-box;
        border-radius: 10px;
        padding: 12px 22px;
        font-size: 14px;
        font-weight: 600;
        min-height: 44px;
        min-width: 108px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: var(--color-surface);
        color: var(--color-primary);
        border: 1px solid rgba(var(--color-primary-rgb), 0.45);
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      }
      .campaign-wizard-root .wizard-footer-back:hover:not(:disabled):not(.wizard-footer-back--saving) {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: #fff;
        box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.22);
      }
      .campaign-wizard-root .wizard-footer-back:disabled:not(.wizard-footer-back--saving) {
        opacity: 1;
        background: rgba(var(--color-primary-rgb), 0.18);
        border-color: rgba(var(--color-primary-rgb), 0.35);
        color: var(--color-primary);
        box-shadow: none;
        cursor: not-allowed;
      }
      .campaign-wizard-root .wizard-footer-back.wizard-footer-back--saving {
        opacity: 1 !important;
        cursor: wait !important;
        pointer-events: none;
        border-color: rgba(var(--color-primary-rgb), 0.2);
        background: rgba(var(--color-primary-rgb), 0.2);
      }
      .campaign-wizard-root .wizard-footer-btn-spinner {
        animation: spin 0.75s linear infinite;
        flex-shrink: 0;
      }
      .campaign-wizard-root .wizard-footer-next {
        font-family: inherit;
        margin: 0;
        box-sizing: border-box;
        border: none;
        border-radius: 10px;
        padding: 12px 28px;
        font-size: 14px;
        font-weight: 600;
        min-height: 44px;
        min-width: 132px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: var(--color-primary);
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
      }
      .campaign-wizard-root .wizard-footer-next:hover:not(:disabled):not(.wizard-footer-next--saving) {
        background: color-mix(in srgb, var(--color-primary) 88%, #000000);
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
        transform: translateY(-1px);
      }
      .campaign-wizard-root .wizard-footer-next:active:not(:disabled):not(.wizard-footer-next--saving) {
        transform: translateY(0);
      }
      .campaign-wizard-root .wizard-footer-next[disabled]:not(.wizard-footer-next--saving) {
        opacity: 1;
        cursor: not-allowed;
        box-shadow: none;
        background: rgba(var(--color-primary-rgb), 0.18);
        border: 1px solid rgba(var(--color-primary-rgb), 0.35);
        color: var(--color-primary);
      }
      .campaign-wizard-root .wizard-footer-next[disabled].wizard-footer-next--saving,
      .campaign-wizard-root .wizard-footer-next.wizard-footer-next--saving {
        opacity: 1 !important;
        cursor: wait !important;
        pointer-events: none;
        background: var(--color-primary) !important;
        color: #fff !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
      }
    `}</style>
    <div className="campaign-wizard-root" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
      <div className="card-enhanced" style={{ 
        borderRadius: 8, 
        padding: "32px 24px", 
        paddingTop: 0,
        maxWidth: 1200, 
        margin: "0 auto",
        background: "var(--color-surface)",
        border: "1px solid var(--elev-border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 12px 40px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}>
        <div
          style={{
            marginLeft: -24,
            marginRight: -24,
            marginBottom: 32,
          }}
        >
          <div style={{ padding: "20px 24px 8px" }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: "var(--color-text)",
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>Step {step} of {totalSteps}</span>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {" "}
                ({stepProgressPct}%)
              </span>
              <span style={{ color: "var(--color-text-muted)" }}> — </span>
              <span>{wizardPhaseBanner.phaseHint || wizardPhaseBanner.phaseLabel}</span>
            </p>
          </div>
          <div style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 8 }}>
            <WizardCircularStepper
              steps={stepFlow}
              currentStepNumber={step}
              completedThroughStepNumber={maxReachedStep}
              onStepClick={(n) => void jumpToWizardStep(n)}
              navigationDisabled={wizardAnyNavBusy}
              loadingStepNumber={wizardStepperLoadingStep}
            />
          </div>
          <div style={{ height: 2, background: "var(--color-border)", position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(step / totalSteps) * 100}%`,
                background: `linear-gradient(90deg, ${WIZ_ACCENT_LINE} 0%, ${WIZ_ACCENT} 55%, #F6B68B 100%)`,
                transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        </div>

        {staleChannels.length > 0 ? (
          <div
            role="alert"
            style={{
              margin: "0 0 20px",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid rgba(245, 158, 11, 0.45)",
              background: "rgba(245, 158, 11, 0.1)",
              color: "var(--color-text)",
              fontSize: 14,
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertTriangle size={20} strokeWidth={2} style={{ flexShrink: 0, color: "#d97706", marginTop: 1 }} aria-hidden />
            <span>
              <strong style={{ fontWeight: 700 }}>Channel connection required.</strong>{" "}
              {staleChannels
                .map(
                  (c) =>
                    getAvailableChannels().find((cfg) => cfg.id === c)?.label ?? c
                )
                .join(", ")}{" "}
              {staleChannels.length === 1 ? "is" : "are"} no longer connected. Reconnect in Settings or open Step 1 and remove{" "}
              {staleChannels.length === 1 ? "this channel" : "these channels"} before launching.
            </span>
          </div>
        ) : null}

      {/* Basic Setup - rendered based on stepType */}
      {currentStepInfo?.stepType === 'basic_setup' && (
        <div
          style={{
            background: "var(--color-surface-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Basic Setup</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 0, fontSize: 13 }}>
              Start by giving your campaign a name and selecting the channels you want to use
            </p>
          </div>

          <div>
            <label
              htmlFor="campaign-wizard-name"
              style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}
            >
              Campaign name *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="campaign-wizard-name"
                className="input"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.slice(0, CAMPAIGN_NAME_MAX_LENGTH))
                }
                onBlur={() => setCampaignNameBlurred(true)}
                placeholder="e.g., Q4 ABM Outreach"
                aria-invalid={showCampaignNameInlineError}
                aria-describedby={
                  showCampaignNameInlineError
                    ? "campaign-wizard-name-error"
                    : "campaign-wizard-name-hint"
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 72px 12px 16px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: showCampaignNameInlineError
                    ? "2px solid #ef4444"
                    : "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 13,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  pointerEvents: "none",
                }}
              >
                {name.length} / {CAMPAIGN_NAME_MAX_LENGTH}
              </span>
            </div>
            <p
              id="campaign-wizard-name-hint"
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                color: "var(--color-text-muted)",
              }}
            >
              Keep it short and descriptive
            </p>
            {showCampaignNameInlineError ? (
              <p
                id="campaign-wizard-name-error"
                role="alert"
                style={{ margin: "8px 0 0", fontSize: 13, color: "#ef4444", fontWeight: 500 }}
              >
                {basicSetupNameValidationError}
              </p>
            ) : null}
          </div>

          <div
            style={{
              height: 1,
              background: "var(--color-border)",
              margin: "0",
            }}
          />

          <div style={{ marginTop: -4 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Channels *
            </label>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
              Choose one or more channels for this campaign.
            </p>
            {isEmailOnlyWorkspacePlan(workspaceOwnerPlanKey) ? (
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
                This workspace is on a plan that includes email campaigns only. LinkedIn and WhatsApp require Pro or
                Premium.
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {getAvailableChannels().map((channelConfig) => {
                const ch = channelConfig.id as ChannelType;
                const meta = REVIEW_OVERVIEW_CHANNEL_META[ch];
                const ChIcon = meta?.Icon ?? channelConfig.icon;
                const selected = channels.includes(channelConfig.id);
                const iconColor = meta?.iconColor ?? WIZ_ACCENT;
                const showDisconnected =
                  channelAvailability !== null && !channelAvailability[ch];
                const cannotSelectDisconnected = showDisconnected && !selected;
                const planLocksSocial =
                  isEmailOnlyWorkspacePlan(workspaceOwnerPlanKey) && (ch === "linkedin" || ch === "whatsapp");
                const cannotSelectPlan = planLocksSocial && !selected;
                return (
                  <button
                    type="button"
                    key={channelConfig.id}
                    disabled={cannotSelectDisconnected || cannotSelectPlan}
                    aria-disabled={cannotSelectDisconnected || cannotSelectPlan}
                    aria-pressed={selected}
                    onClick={() => {
                      if (planLocksSocial && !selected) {
                        showWarning(
                          "Not available on your plan",
                          "Upgrade to Pro or Premium to run LinkedIn and WhatsApp campaigns."
                        );
                        return;
                      }
                      if (showDisconnected && !selected) return;
                      setChannels((prev) => {
                        if (prev.includes(channelConfig.id)) {
                          return prev.filter((x) => x !== channelConfig.id);
                        }
                        if (showDisconnected) return prev;
                        return [...prev, channelConfig.id];
                      });
                    }}
                    style={{
                      width: 104,
                      minHeight: 112,
                      padding: "12px 10px",
                      borderRadius: 10,
                      border: selected ? `2px solid ${WIZ_ACCENT}` : "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      cursor: cannotSelectDisconnected || cannotSelectPlan ? "not-allowed" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      textAlign: "center",
                      transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                      boxShadow: selected ? "0 1px 4px rgba(var(--color-primary-rgb), 0.2)" : "none",
                      position: "relative",
                      opacity: (showDisconnected && !selected) || cannotSelectPlan ? 0.55 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (cannotSelectDisconnected || cannotSelectPlan) return;
                      if (!selected) {
                        e.currentTarget.style.background = "rgba(var(--color-primary-rgb), 0.2)";
                        e.currentTarget.style.borderColor = "rgba(var(--color-primary-rgb), 0.2)";
                      } else {
                        e.currentTarget.style.background = "rgba(var(--color-primary-rgb), 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--color-surface)";
                      e.currentTarget.style.borderColor = selected ? WIZ_ACCENT : "var(--color-border)";
                    }}
                  >
                    {selected ? (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: WIZ_ACCENT,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-hidden
                      >
                        <Icons.Check size={12} strokeWidth={2.5} style={{ color: "#fff" }} />
                      </span>
                    ) : null}
                    {ch === "email" || ch === "linkedin" ? (
                      <ChIcon
                        size={22}
                        strokeWidth={1.75}
                        style={{ flexShrink: 0, color: iconColor }}
                        aria-hidden
                      />
                    ) : (
                      <ChIcon size={22} style={{ flexShrink: 0, color: iconColor }} aria-hidden />
                    )}
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{channelConfig.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1.35,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {showDisconnected
                        ? selected
                          ? "Not connected — click to remove"
                          : "Not connected"
                        : channelConfig.wizardCardDescription}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Your Offer (core_details_part1) */}
      {currentStepInfo?.stepType === 'core_details_part1' && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 12px",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Your Offer</h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: WIZ_ACCENT_LINE,
                  background: WIZ_ROW_SELECTED,
                  border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                ✨ AI-powered
              </span>
            </div>
            <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Your answers are used to generate
              <br />
              personalized AI messages across all channels
            </p>
          </div>

          <div>
            <label
              htmlFor="wizard-product-service"
              style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}
            >
              Product / Service *
            </label>
            <input
              id="wizard-product-service"
              className="input"
              value={productService}
              onChange={(e) => setProductService(e.target.value)}
              placeholder="e.g., Enterprise CRM, marketing automation"
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "inherit",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              e.g., CRM software, API integration
            </p>
          </div>

          <div>
            <label
              htmlFor="wizard-value-prop"
              style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}
            >
              Value Proposition *
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                id="wizard-value-prop"
                className="input"
                value={valueProposition}
                onChange={(e) =>
                  setValueProposition(e.target.value.slice(0, VALUE_PROPOSITION_MAX_LENGTH))
                }
                placeholder="e.g., Help teams cut admin time and close more deals"
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: "12px 16px 32px 16px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  lineHeight: 1.5,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 10,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  pointerEvents: "none",
                }}
              >
                {valueProposition.length} / {VALUE_PROPOSITION_MAX_LENGTH}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              What problem you solve and the outcome you deliver
            </p>
          </div>

          <div>
            <label
              htmlFor="wizard-cta"
              style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}
            >
              Primary CTA *
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {CTA_QUICK_OPTIONS.map((opt) => {
                const active = callToAction.trim() === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCallToAction(opt)}
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 999,
                      border: active ? `2px solid ${WIZ_ACCENT}` : "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: active ? WIZ_ACCENT : "var(--color-text)",
                      cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                      boxShadow: "none",
                      transform: "none",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <input
              id="wizard-cta"
              className="input"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="Type your call-to-action or pick a suggestion above"
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "inherit",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              The action you want leads to take
            </p>
          </div>

          <div
            style={{
              height: 1,
              background: "var(--color-border)",
              margin: "4px 0",
            }}
          />

          <div>
            <button
              type="button"
              onClick={() => setSenderDetailsExpanded((v) => !v)}
              aria-expanded={senderDetailsExpanded}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text)",
                textAlign: "left",
              }}
            >
              <span>Sender Details *</span>
              <Icons.ChevronDown
                size={20}
                style={{
                  flexShrink: 0,
                  color: "var(--color-text-muted)",
                  transform: senderDetailsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
            <p style={{ margin: "0 0 8px 4px", fontSize: 12, color: "var(--color-text-muted)" }}>
              Required to personalize message signatures
            </p>
            {senderDetailsExpanded ? (
              <div
                style={{
                  background: "#F9F8FF",
                  border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    htmlFor="wizard-sender-name"
                    style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}
                  >
                    Your name *
                  </label>
                  <input
                    id="wizard-sender-name"
                    className="input"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g., John Smith"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 14,
                      fontFamily: "inherit",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="wizard-sender-company"
                    style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}
                  >
                    Your company *
                  </label>
                  <input
                    id="wizard-sender-company"
                    className="input"
                    value={senderCompany}
                    onChange={(e) => setSenderCompany(e.target.value)}
                    placeholder="e.g., Leads Reach"
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 14,
                      fontFamily: "inherit",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Step 3 — Select leads (table + filters; selection drives segment names for API) */}
      {currentStepInfo?.stepType === "core_details_part2" && (
        <div style={{ display: "grid", gap: 24 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Select Leads</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Choose which leads to include in this campaign
            </p>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
              Leads for this campaign *
            </label>
            {!activeBaseId ? (
              <div
                style={{
                  padding: "24px",
                  background: "rgba(255, 167, 38, 0.1)",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 167, 38, 0.3)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ marginBottom: 12, color: "#ffa726" }}>
                  <Icons.AlertCircle size={32} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No Base Selected</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Please select a base first to view and select leads for your campaign.
                </div>
              </div>
            ) : loadingLeads ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Icons.Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
                <div>Loading leads...</div>
              </div>
            ) : leads.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px 24px",
                  textAlign: "center",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <div style={{ marginBottom: 16, color: "var(--color-text-muted)" }}>
                  <Icons.Users size={40} strokeWidth={1.25} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>No leads yet</div>
                <p className="text-hint" style={{ margin: "0 0 20px", maxWidth: 360 }}>
                  Add leads before launching a campaign
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => router.push("/leads")}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Go to Leads →
                </button>
              </div>
            ) : allChannelLeads.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  background: "rgba(255, 167, 38, 0.08)",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 167, 38, 0.25)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No leads match your channels</div>
                <p className="text-hint" style={{ margin: 0, lineHeight: 1.5 }}>
                  {channels.includes("email") && <>Leads need a valid email. </>}
                  {channels.includes("linkedin") && <>Leads need a LinkedIn URL. </>}
                  {(channels.includes("whatsapp") || channels.includes("call")) && (
                    <>Leads need a valid phone number. </>
                  )}
                  Adjust channels or enrich leads, then return here.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 6,
                      flex: "1 1 auto",
                      minWidth: 0,
                    }}
                  >
                    {(
                      [
                        { key: "all" as const, label: "All", dot: null as string | null },
                        { key: "hot" as const, label: "Hot", dot: "#ef4444" },
                        { key: "warm" as const, label: "Warm", dot: "#f97316" },
                        { key: "cold" as const, label: "Cold", dot: "var(--color-primary)" },
                        { key: "never_opened" as const, label: "Never Opened", dot: "#9ca3af" },
                        { key: "engaged" as const, label: "Engaged", dot: "#22c55e" },
                        { key: "high_score" as const, label: "High Score", dot: "#eab308" },
                      ] as const
                    ).map(({ key, label, dot }) => {
                      const count = leadFilterCounts[key];
                      const active = leadTableFilter === key;
                      const chipBase: CSSProperties = {
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        height: 36,
                        minHeight: 36,
                        padding: "6px 12px",
                        borderRadius: 9999,
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        transform: "none",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        lineHeight: 1.2,
                      };
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setLeadTableFilter(key);
                            if (key === "all") return;
                            const preset = filterLeadsByLeadTableKey(allChannelLeads, key);
                            const next = new Set(preset.map((l) => l.id));
                            const nextArr = Array.from(next);
                            setExplicitCampaignTargetLeadIds(nextArr);
                            setSegments(buildSegmentsFromLeadIds(next));
                          }}
                          className={active ? "btn-primary" : undefined}
                          style={
                            active
                              ? {
                                  ...chipBase,
                                  border: "none",
                                  color: "#fff",
                                }
                              : {
                                  ...chipBase,
                                  border: "1px solid #e5e7eb",
                                  background: "#fff",
                                  color: "#1f2937",
                                }
                          }
                          onMouseEnter={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                            }
                          }}
                        >
                          {dot ? (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: dot,
                                flexShrink: 0,
                              }}
                              aria-hidden
                            />
                          ) : null}
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      height: 36,
                      width: 220,
                      maxWidth: "100%",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "#9ca3af",
                      }}
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={leadTableSearch}
                      onChange={(e) => setLeadTableSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      aria-label="Search leads by name or email"
                      style={{
                        width: "100%",
                        height: 36,
                        boxSizing: "border-box",
                        padding: "0 12px 0 34px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        color: "#111827",
                        fontSize: 14,
                        fontFamily: "inherit",
                        outline: "none",
                        transform: "none",
                      }}
                    />
                  </div>
                </div>

                {leadTableFilter !== "all" && leadsMatchingFilterPreset.length > 0 ? (
                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={WIZARD_LEAD_STEP_CHECKBOX_STYLE}
                        checked={
                          leadsMatchingFilterPreset.length > 0 &&
                          leadsMatchingFilterPreset.every((l) => selectedLeadIds.has(l.id))
                        }
                        ref={(el) => {
                          if (!el) return;
                          const some = leadsMatchingFilterPreset.some((l) => selectedLeadIds.has(l.id));
                          const all =
                            leadsMatchingFilterPreset.length > 0 &&
                            leadsMatchingFilterPreset.every((l) => selectedLeadIds.has(l.id));
                          el.indeterminate = some && !all;
                        }}
                        onChange={(e) => {
                          const base =
                            explicitCampaignTargetLeadIds !== null
                              ? new Set(explicitCampaignTargetLeadIds)
                              : new Set(selectedLeadIds);
                          const next = base;
                          if (e.target.checked) {
                            leadsMatchingFilterPreset.forEach((l) => next.add(l.id));
                          } else {
                            leadsMatchingFilterPreset.forEach((l) => next.delete(l.id));
                          }
                          setExplicitCampaignTargetLeadIds(Array.from(next));
                          setSegments(buildSegmentsFromLeadIds(next));
                        }}
                        aria-label={`Select all ${leadsMatchingFilterPreset.length} leads in this filter`}
                      />
                      <span>
                        Select all {leadsMatchingFilterPreset.length} in this filter
                      </span>
                    </label>
                  </div>
                ) : null}

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    overflow: "hidden",
                    background: "var(--color-surface)",
                  }}
                >
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                        minWidth: 720,
                      }}
                    >
                      <thead>
                        <tr style={{ background: "rgba(15, 23, 42, 0.04)", textAlign: "left" }}>
                          <th
                            style={{
                              padding: "12px 10px",
                              width: WIZARD_LEAD_STEP_CHECKBOX_COL_W,
                              minWidth: WIZARD_LEAD_STEP_CHECKBOX_COL_W,
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            <input
                              type="checkbox"
                              style={WIZARD_LEAD_STEP_CHECKBOX_STYLE}
                              disabled={paginatedTableLeads.length === 0}
                              checked={
                                paginatedTableLeads.length > 0 &&
                                paginatedTableLeads.every((l) => selectedLeadIds.has(l.id))
                              }
                              ref={(el) => {
                                if (!el) return;
                                const some = paginatedTableLeads.some((l) => selectedLeadIds.has(l.id));
                                const all =
                                  paginatedTableLeads.length > 0 &&
                                  paginatedTableLeads.every((l) => selectedLeadIds.has(l.id));
                                el.indeterminate = some && !all;
                              }}
                              onChange={() => {
                                const pageIds = paginatedTableLeads.map((l) => l.id);
                                const allSelected =
                                  pageIds.length > 0 &&
                                  pageIds.every((id) => selectedLeadIds.has(id));
                                const next =
                                  explicitCampaignTargetLeadIds !== null
                                    ? new Set(explicitCampaignTargetLeadIds)
                                    : new Set(selectedLeadIds);
                                if (allSelected) {
                                  pageIds.forEach((id) => next.delete(id));
                                } else {
                                  pageIds.forEach((id) => next.add(id));
                                }
                                setExplicitCampaignTargetLeadIds(Array.from(next));
                                setSegments(buildSegmentsFromLeadIds(next));
                              }}
                              aria-label="Select all leads on this page"
                            />
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Email
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Company
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Score
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                            }}
                          >
                            Tag
                          </th>
                          <th
                            style={{
                              padding: "12px 10px",
                              textAlign: "right",
                              fontSize: 11,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              color: "#9ca3af",
                              width: 56,
                            }}
                          >
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTableLeads.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{
                                padding: 28,
                                textAlign: "center",
                                color: "var(--color-text-muted)",
                              }}
                            >
                              No leads match this filter or search.
                            </td>
                          </tr>
                        ) : null}
                        {paginatedTableLeads.map((lead) => {
                          const name =
                            [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() || "—";
                          const email = lead.email || "—";
                          const company = lead.company || "—";
                          const sc = lead.score ?? 0;
                          const scorePillStyle: CSSProperties =
                            lead.score == null
                              ? {
                                  display: "inline-block",
                                  borderRadius: 9999,
                                  padding: "2px 8px",
                                  fontSize: 14,
                                  fontWeight: 500,
                                  background: "#f3f4f6",
                                  color: "#6b7280",
                                }
                              : sc >= 80
                                ? {
                                    display: "inline-block",
                                    borderRadius: 9999,
                                    padding: "2px 8px",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    background: "#dcfce7",
                                    color: "#166534",
                                  }
                                : sc >= 65
                                  ? {
                                      display: "inline-block",
                                      borderRadius: 9999,
                                      padding: "2px 8px",
                                      fontSize: 14,
                                      fontWeight: 500,
                                      background: "#fef3c7",
                                      color: "#92400e",
                                    }
                                  : {
                                      display: "inline-block",
                                      borderRadius: 9999,
                                      padding: "2px 8px",
                                      fontSize: 14,
                                      fontWeight: 500,
                                      background: "#ffedd5",
                                      color: "#c2410c",
                                    };
                          const tierRaw = lead.tier;
                          const statusKey =
                            tierRaw === "Hot" || tierRaw === "Warm" || tierRaw === "Cold"
                              ? tierRaw
                              : !tierRaw || tierRaw === ""
                                ? "Cold"
                                : tierRaw;
                          const statusStyles: Record<string, { bg: string; fg: string }> = {
                            Hot: { bg: "rgba(239, 68, 68, 0.15)", fg: "#b91c1c" },
                            Warm: { bg: "rgba(245, 158, 11, 0.2)", fg: "#b45309" },
                            Cold: { bg: "rgba(56, 189, 248, 0.18)", fg: "#0369a1" },
                          };
                          const st = statusStyles[statusKey] || {
                            bg: "rgba(100, 116, 139, 0.15)",
                            fg: "#475569",
                          };
                          const checked = selectedLeadIds.has(lead.id);
                          return (
                            <tr
                              key={lead.id}
                              style={{
                                borderTop: "1px solid var(--color-border)",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.background =
                                  "rgba(var(--color-primary-rgb), 0.2)";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                              }}
                            >
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  width: WIZARD_LEAD_STEP_CHECKBOX_COL_W,
                                  minWidth: WIZARD_LEAD_STEP_CHECKBOX_COL_W,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  style={WIZARD_LEAD_STEP_CHECKBOX_STYLE}
                                  checked={checked}
                                  onChange={(e) => {
                                    const next =
                                      explicitCampaignTargetLeadIds !== null
                                        ? new Set(explicitCampaignTargetLeadIds)
                                        : new Set(selectedLeadIds);
                                    if (e.target.checked) next.add(lead.id);
                                    else next.delete(lead.id);
                                    setExplicitCampaignTargetLeadIds(Array.from(next));
                                    setSegments(buildSegmentsFromLeadIds(next));
                                  }}
                                  aria-label={`Select ${name}`}
                                />
                              </td>
                              <td style={{ padding: "10px", fontWeight: 500 }}>{name}</td>
                              <td style={{ padding: "10px", color: "var(--color-text-muted)", wordBreak: "break-all" }}>
                                {email}
                              </td>
                              <td style={{ padding: "10px", color: "var(--color-text-muted)" }}>{company}</td>
                              <td style={{ padding: "10px" }}>
                                <span style={scorePillStyle}>
                                  {lead.score != null ? lead.score : "—"}
                                </span>
                              </td>
                              <td style={{ padding: "10px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: st.bg,
                                    color: st.fg,
                                  }}
                                >
                                  {statusKey}
                                </span>
                              </td>
                              <td style={{ padding: "10px", color: "var(--color-text-muted)", fontSize: 12 }}>
                                {tagsForLeadRow(lead)}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "right",
                                  verticalAlign: "middle",
                                }}
                              >
                                <button
                                  type="button"
                                  title="View lead details"
                                  aria-label={`View details for ${name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCampaignLeadDrawerLead(lead);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    background: "#fff",
                                    color: "#4b5563",
                                    cursor: "pointer",
                                    transform: "none",
                                  }}
                                >
                                  <Icons.Eye size={16} aria-hidden />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedLeadIds.size > 0 ? (
                    <WizardStickyLeadSelectionBar>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#de8850",
                          lineHeight: "20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span>
                          {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selected
                        </span>
                        {selectedLeadIds.size > CAMPAIGN_WIZARD_MAX_LEADS ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309" }}>
                            Max {CAMPAIGN_WIZARD_MAX_LEADS} leads per campaign — remove some to continue
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExplicitCampaignTargetLeadIds([]);
                          setSegments([]);
                        }}
                        style={{
                          margin: 0,
                          padding: 0,
                          fontSize: 14,
                          fontWeight: 500,
                          lineHeight: "20px",
                          color: "var(--color-primary)",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontFamily: "inherit",
                          transform: "none",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Clear selection
                      </button>
                    </WizardStickyLeadSelectionBar>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      gap: 10,
                      padding: "8px 12px",
                      borderTop: "1px solid var(--color-border)",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span style={{ lineHeight: "32px", fontSize: 12 }}>
                      Page {leadTablePage} of {leadTableTotalPages} · {filteredTableLeads.length} lead
                      {filteredTableLeads.length !== 1 ? "s" : ""}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        disabled={leadTablePage <= 1}
                        onClick={() => setLeadTablePage((p) => Math.max(1, p - 1))}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          height: 32,
                          minHeight: 32,
                          padding: "0 10px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#374151",
                          cursor: leadTablePage <= 1 ? "not-allowed" : "pointer",
                          opacity: leadTablePage <= 1 ? 0.45 : 1,
                          fontFamily: "inherit",
                          transform: "none",
                          boxSizing: "border-box",
                        }}
                      >
                        <Icons.ChevronLeft size={14} aria-hidden />
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={leadTablePage >= leadTableTotalPages}
                        onClick={() => setLeadTablePage((p) => Math.min(leadTableTotalPages, p + 1))}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          height: 32,
                          minHeight: 32,
                          padding: "0 10px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#374151",
                          cursor: leadTablePage >= leadTableTotalPages ? "not-allowed" : "pointer",
                          opacity: leadTablePage >= leadTableTotalPages ? 0.45 : 1,
                          fontFamily: "inherit",
                          transform: "none",
                          boxSizing: "border-box",
                        }}
                      >
                        Next
                        <Icons.ChevronRight size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", lineHeight: 1.4 }}>
                    Lead scores update automatically as engagement changes
                  </p>
                  {segments.length > 0 && totalLeads === 0 ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        background: "#fff3cd",
                        borderRadius: 8,
                        border: "1px solid #ffc107",
                        fontSize: 12,
                        color: "#856404",
                      }}
                    >
                      No leads match your criteria with the current channels. Try different channels or enrich leads.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Email Follow-up Preferences - rendered based on stepType */}
      {currentStepInfo?.stepType === "email_followup_preferences" && (
        <div style={{ display: "grid", gap: 22 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Email follow-ups</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Only affects email. Say if you want extra emails after the first one, and how many.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <Icons.Send size={18} />
              Do you want to send follow-up emails? *
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              {(
                [
                  {
                    key: "yes" as const,
                    followupsVal: 1,
                    icon: Icons.Mail,
                    title: "Yes, send follow-ups",
                    selected: schedule.followups > 0,
                  },
                  {
                    key: "no" as const,
                    followupsVal: 0,
                    icon: Icons.X,
                    title: "No, just one email",
                    selected: schedule.followups === 0,
                  },
                ] as const
              ).map(({ key, followupsVal, icon: CardIcon, title, selected }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (followupsVal > 0) {
                      setSchedule({ ...schedule, followups: 1 });
                      setFollowupsPreferenceSet(true);
                      setShowFollowupsNumberInput(true);
                    } else {
                      setSchedule({ ...schedule, followups: 0 });
                      setFollowupsPreferenceSet(true);
                      setShowFollowupsNumberInput(false);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                    }
                  }}
                  style={{
                    position: "relative",
                    width: 160,
                    maxWidth: "100%",
                    minHeight: 96,
                    padding: "16px 14px",
                    borderRadius: 12,
                    border: selected ? "2px solid var(--color-primary)" : "1px solid #e5e7eb",
                    background: selected ? "rgba(var(--color-primary-rgb), 0.2)" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    textAlign: "center",
                    fontFamily: "inherit",
                    transform: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s, background 0.15s",
                    boxShadow: "none",
                  }}
                >
                  {selected ? (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-hidden
                    >
                      <Icons.Check size={12} style={{ color: "#fff" }} strokeWidth={3} />
                    </span>
                  ) : null}
                  <CardIcon size={22} style={{ color: selected ? "var(--color-primary)" : "#6b7280" }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: selected ? "color-mix(in srgb, var(--color-primary) 88%, #000000)" : "#374151",
                      lineHeight: 1.35,
                    }}
                  >
                    {title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {schedule.followups > 0 && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--color-text)",
                }}
              >
                How many follow-up emails?
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {([1, 2, 3, 4, 5] as const).map((n) => {
                  const active = (schedule.followups || 1) === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSchedule({ ...schedule, followups: n })}
                      style={{
                        minWidth: 40,
                        height: 36,
                        padding: "0 12px",
                        borderRadius: 9999,
                        border: active ? "none" : "1px solid #d1d5db",
                        background: active
                          ? "linear-gradient(135deg, #F29F67 0%, var(--color-primary) 48%, color-mix(in srgb, var(--color-primary) 88%, #000000) 100%)"
                          : "#fff",
                        color: active ? "#fff" : "#4b5563",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transform: "none",
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  padding: "12px 0 4px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#fff4ec",
                    border: "1px solid #f8c8a9",
                    fontSize: 12,
                    fontWeight: 600,
                    color: WIZ_ACCENT_LINE,
                  }}
                >
                  <span aria-hidden>📧</span> Email 1
                </span>
                {Array.from({ length: schedule.followups || 1 }, (_, i) => i + 1).map((fu) => (
                  <span key={fu} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                      }}
                      title="Delay between sends — set in the Schedule step"
                    >
                      <Icons.Clock size={14} aria-hidden />
                      <span aria-hidden style={{ color: "#cbd5e1" }}>
                        →
                      </span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(var(--color-primary-rgb), 0.2)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                      }}
                    >
                      <span aria-hidden>📧</span> Follow-up {fu}
                    </span>
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  background: "#eff6ff",
                  border: "1px solid #fbe0ce",
                  marginTop: 4,
                }}
              >
                <Icons.Info size={14} style={{ color: "color-mix(in srgb, var(--color-primary) 88%, #000000)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-primary) 88%, #000000)", lineHeight: 1.45 }}>
                  You can configure the delay between follow-ups in the schedule step
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Templates - rendered based on stepType */}
      {currentStepInfo?.stepType === 'email_templates' && followupsPreferenceSet && (
        <div style={{ display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Email drafts</h3>
          {nextStepValidationError ? (
            <div
              role="alert"
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, #b91c1c 35%, var(--color-border))",
                background: "color-mix(in srgb, #fef2f2 92%, var(--color-surface))",
                color: "var(--color-text)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: "block", marginBottom: 6, color: "#991b1b" }}>
                Fix this before continuing
              </strong>
              {nextStepValidationError}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
            }}
          >
            <div
              role="tablist"
              aria-label="How to choose email content"
              style={{
                display: "inline-flex",
                width: "fit-content",
                maxWidth: "100%",
                flexWrap: "wrap",
                padding: 4,
                gap: 4,
                borderRadius: 12,
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={emailTemplateTab === "library"}
                aria-controls="email-draft-panel-library"
                id="email-draft-tab-library"
                onClick={() => {
                  setEmailToneMenuOpen(false);
                  setEmailTemplateTab("library");
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  ...(emailTemplateTab === "library"
                    ? {
                        background: "var(--color-surface)",
                        color: "var(--color-primary)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      }
                    : {
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        border: "1px solid transparent",
                        boxShadow: "none",
                      }),
                  transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                From templates
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={emailTemplateTab === "ai"}
                aria-controls="email-draft-panel-ai"
                id="email-draft-tab-ai"
                onClick={() => setEmailTemplateTab("ai")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  ...(emailTemplateTab === "ai"
                    ? {
                        background: "var(--color-surface)",
                        color: "var(--color-primary)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      }
                    : {
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        border: "1px solid transparent",
                        boxShadow: "none",
                      }),
                  transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                All emails
              </button>
            </div>
            {emailTemplateTab === "ai" && emailDraftFetchState !== "center" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    regenerateAiEmailDrafts({
                      tone: emailDraftTone,
                      toastTitle: "✨ Drafts regenerated",
                      toastMessage: "Your email drafts are ready to edit.",
                    })
                  }
                  disabled={
                    emailDraftFetchState !== "idle" ||
                    !channels.includes("email") ||
                    !productService ||
                    !valueProposition ||
                    !callToAction
                  }
                  style={{
                    ...EMAIL_AI_TOOLBAR_BTN,
                    ...(emailDraftFetchState !== "idle" ||
                    !channels.includes("email") ||
                    !productService ||
                    !valueProposition ||
                    !callToAction
                      ? DISABLED_SURFACE_TINT_STYLE
                      : {}),
                  }}
                >
                  {emailDraftFetchState === "skeleton" ? (
                    <Icons.Loader size={16} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} />
                  ) : (
                    <Icons.RefreshCw size={16} strokeWidth={1.75} style={{ color: "var(--color-text-muted)" }} />
                  )}
                  {emailDraftFetchState === "skeleton" ? "Regenerating…" : "Regenerate drafts"}
                </button>
                <div ref={emailToneMenuRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => emailDraftFetchState === "idle" && setEmailToneMenuOpen((o) => !o)}
                    disabled={emailDraftFetchState !== "idle"}
                    aria-expanded={emailToneMenuOpen}
                    aria-haspopup="listbox"
                    style={{
                      ...EMAIL_AI_TOOLBAR_BTN,
                      ...(emailDraftFetchState !== "idle" ? DISABLED_SURFACE_TINT_STYLE : {}),
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--color-text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      Tone
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-text)",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                      title={emailDraftTone}
                    >
                      {emailDraftTone}
                    </span>
                    <Icons.ChevronDown size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  </button>
                  {emailToneMenuOpen ? (
                    <div
                      role="listbox"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: 6,
                        zIndex: 200,
                        minWidth: 240,
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                        padding: 6,
                      }}
                    >
                      {EMAIL_TONE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          role="option"
                          aria-selected={opt === emailDraftTone}
                          onClick={async () => {
                            setEmailToneMenuOpen(false);
                            if (!channels.includes("email") || !activeBaseId) return;
                            if (opt === emailDraftTone) return;
                            setEmailDraftTone(opt);
                            emailDraftToneRef.current = opt;
                            await regenerateAiEmailDrafts({
                              tone: opt,
                              toastTitle: "Tone updated — drafts regenerated",
                              toastMessage: "Your drafts use the new tone.",
                            });
                          }}
                          style={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "none",
                            background:
                              opt === emailDraftTone ? "var(--color-surface-secondary)" : "transparent",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "var(--color-text)",
                            fontWeight: opt === emailDraftTone ? 600 : 500,
                          }}
                        >
                          {opt === emailDraftTone ? (
                            <Icons.Check size={16} style={{ color: "var(--color-text)", flexShrink: 0 }} />
                          ) : (
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: "2px solid #d1d5db",
                                flexShrink: 0,
                                boxSizing: "border-box",
                              }}
                              aria-hidden
                            />
                          )}
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.45, maxWidth: 720 }}>
            One sequence: a template only replaces the{" "}
            <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>first email</strong>. Manage reusable
            copies on{" "}
            <Link href="/templates" style={{ color: WIZ_ACCENT, fontWeight: 600 }}>
              Templates
            </Link>
            .
          </p>

          {emailTemplateTab === "library" && (
            <div
              id="email-draft-panel-library"
              role="tabpanel"
              aria-labelledby="email-draft-tab-library"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {libraryTemplatesLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading your saved templates…
                </div>
              ) : filterLibraryByChannel("email").length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    maxWidth: 420,
                    margin: "0 auto",
                  }}
                >
                  <Icons.Mail size={44} style={{ color: "#9ca3af", marginBottom: 16 }} />
                  <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                    No saved templates yet
                  </div>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.5 }}>
                    Create templates on the Templates page
                  </p>
                  <Link
                    href="/templates"
                    className="btn-ghost"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      border: "1px solid var(--color-border)",
                      textDecoration: "none",
                      color: "var(--color-text)",
                    }}
                  >
                    → Go to Templates
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {filterLibraryByChannel("email").map((t: Record<string, unknown>) => {
                      const id = t.id as number;
                      const vars = (t.variables && typeof t.variables === "object" && !Array.isArray(t.variables)
                        ? (t.variables as Record<string, unknown>)
                        : {}) as Record<string, unknown>;
                      const title = String(vars.name || "Untitled");
                      const category = String(vars.category ?? "Outreach");
                      const defaultSubj = vars.subject != null ? String(vars.subject) : "";
                      const defaultBody = String(t.content || "");
                      const subj = libraryTemplateEdits[id]?.subject ?? defaultSubj;
                      const body = libraryTemplateEdits[id]?.body ?? defaultBody;
                      const isSelected = selectedLibraryTemplateIds.includes(id);
                      const shared = t.visibility === "workspace";
                      const metaLine = `${category} · email${shared ? " · Shared" : ""}`;
                      return (
                        <WizardEmailDraftCard
                          key={id}
                          variant="library"
                          title={title}
                          category={category}
                          workspaceShared={shared}
                          subjectDisplay={subj}
                          bodyPreview={body}
                          isSelected={isSelected}
                          onToggleSelect={() => {
                            const willSelect = !isSelected;
                            setSelectedLibraryTemplateIds((prev) =>
                              isSelected ? prev.filter((x) => x !== id) : [...prev, id].sort((a, b) => a - b)
                            );
                            if (willSelect) {
                              showSuccess(
                                "Template applied to first email",
                                "Open All emails to review your full sequence (initial + follow-ups)."
                              );
                              setEmailTemplateTab("ai");
                            }
                          }}
                          onPreview={() =>
                            setEmailWizardPreview({
                              title,
                              metaLine,
                              subject: subj.trim() || "—",
                              body: body || "—",
                            })
                          }
                          onEdit={() => setEmailWizardEdit({ type: "library", id })}
                        />
                      );
                    })}
                  </div>
                  {selectedLibraryTemplateIds.length > 0 ? (
                    <WizardStepCallout tone="selected" marginTop={4}>
                      {librarySelectionSummaryPhrase(selectedLibraryTemplateIds.length)}
                    </WizardStepCallout>
                  ) : null}
                </>
              )}
            </div>
          )}

          {emailTemplateTab === "ai" && (
            <div
              id="email-draft-panel-ai"
              role="tabpanel"
              aria-labelledby="email-draft-tab-ai"
              style={{ display: "contents" }}
            >
              {emailDraftFetchState === "center" ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Icons.Loader size={40} style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Writing your email drafts…</div>
                  <div style={{ fontSize: 13 }}>
                    Using your campaign details, target segments, and ICP profile to create tailored messages
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {emailDraftFetchState === "skeleton"
                      ? Array.from(
                          { length: Math.max(messages.length, 1 + (schedule.followups || 0)) },
                          (_, sk) => (
                            <div key={`sk-${sk}`} className="bases-workspace-card" style={{ padding: "16px 18px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div style={{ width: 72, height: 10, borderRadius: 4, background: "#e5e7eb" }} />
                                  <div style={{ height: 18, width: "75%", borderRadius: 4, background: "#e5e7eb" }} />
                                  <div style={{ height: 12, width: "55%", borderRadius: 4, background: "#e5e7eb" }} />
                                </div>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#e5e7eb" }} />
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#e5e7eb" }} />
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb" }} />
                              </div>
                              <div style={{ display: "grid", rowGap: 14 }}>
                                <div>
                                  <div style={{ width: 48, height: 8, borderRadius: 4, background: "#e5e7eb", marginBottom: 4 }} />
                                  <div style={{ height: 12, width: "100%", borderRadius: 4, background: "#e5e7eb" }} />
                                </div>
                                <div>
                                  <div style={{ width: 36, height: 8, borderRadius: 4, background: "#e5e7eb", marginBottom: 4 }} />
                                  <div style={{ height: 12, width: "92%", borderRadius: 4, background: "#e5e7eb" }} />
                                </div>
                              </div>
                            </div>
                          )
                        )
                      : messages.map((m, i) => {
                          const { subject, body } = parseMessage(m);
                          const isSelected = selectedMessageIndices.includes(i);
                          const draftTitle = emailDraftBadgeLabel(i);
                          const metaLine = `Campaign · email · ${draftTitle}`;
                          return (
                            <WizardEmailDraftCard
                              key={i}
                              variant="ai"
                              draftSource={i === 0 ? emailInitialContentSource : "ai"}
                              title={draftTitle}
                              category="Campaign"
                              subjectDisplay={subject}
                              bodyPreview={body}
                              isSelected={isSelected}
                              onToggleSelect={() =>
                                setSelectedMessageIndices((prev) =>
                                  isSelected
                                    ? prev.filter((idx) => idx !== i)
                                    : [...prev, i].sort((a, b) => a - b)
                                )
                              }
                              onPreview={() =>
                                setEmailWizardPreview({
                                  title: draftTitle,
                                  metaLine,
                                  subject: subject.trim() || "—",
                                  body: body || "—",
                                })
                              }
                              onEdit={() => setEmailWizardEdit({ type: "ai", index: i })}
                            />
                          );
                        })}
                  </div>

                  {messages.length > 0 && channels.includes("email") ? (
                    <WizardStepCallout
                      tone={selectedMessageIndices.length > 0 ? "selected" : "idle"}
                      marginTop={12}
                    >
                      {aiEmailDraftsUnifiedSummary(messages.length, selectedMessageIndices)}
                    </WizardStepCallout>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* LinkedIn Message Type - rendered based on stepType */}
      {currentStepInfo?.stepType === "linkedin_message_type" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 20, fontWeight: 600 }}>
              LinkedIn connection requests
            </h3>
            <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Choose how invites are sent. This applies only to LinkedIn—not your email sequence.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {(
              [
                {
                  key: "invitation_only" as const,
                  icon: "userplus" as const,
                  title: "Send only invitation",
                  body: "Connection request without a message.",
                  sub: "Higher volume allowed.",
                },
                {
                  key: "invitation_with_message" as const,
                  icon: "message" as const,
                  title: "Send with message",
                  body: "Include a personalized note with your request.",
                  sub: "More personal, lower limit.",
                },
              ] as const
            ).map((opt) => {
              const selected = linkedInStepConfig?.action === opt.key;
              const iconColor =
                opt.icon === "userplus" ? "#0A66C2" : "var(--color-primary)";
              return (
                <div
                  key={opt.key}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  className="bases-workspace-card"
                  onClick={() => {
                    setLinkedInTemplateError(null);
                    if (opt.key === "invitation_only") {
                      setLinkedInAppliedSuggestionIndex(null);
                      setLinkedInStepConfig((prev) => ({
                        action: "invitation_only",
                        message: prev?.message,
                        templates: prev?.templates,
                      }));
                    } else {
                      setLinkedInStepConfig((prev) => ({
                        action: "invitation_with_message",
                        message: prev?.message ?? "",
                        templates: prev?.templates,
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    (e.currentTarget as HTMLDivElement).click();
                  }}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    ...(selected ? { border: "2px solid #eeab7a" } : {}),
                  }}
                >
                  <div style={{ padding: "16px 18px" }}>
                    {selected ? (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-hidden
                      >
                        <Icons.Check size={14} style={{ color: "#fff" }} />
                      </span>
                    ) : null}
                    <div style={{ marginBottom: 10, display: "flex", alignItems: "center" }} aria-hidden>
                      {opt.icon === "userplus" ? (
                        <UserPlus size={20} style={{ color: iconColor }} strokeWidth={2} />
                      ) : (
                        <MessageCircle size={20} style={{ color: iconColor }} strokeWidth={2} />
                      )}
                    </div>
                    <div className="bases-workspace-card-title" style={{ marginBottom: 8 }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.45, marginBottom: 4 }}>
                      {opt.body}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{opt.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: 12,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 0 }} aria-hidden>
              ⚠️
            </span>
            <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
              {linkedInWizardIntegrationLoading ? (
                <div style={{ color: "#a16207" }}>Loading your account type…</div>
              ) : linkedInWizardIntegration?.config?.linkedin_account_type === "free_basic" ? (
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#b45309" }}>LinkedIn Free/Basic:</strong> up to 150 invitations/month without
                  message. We enforce these limits automatically.
                </p>
              ) : linkedInWizardIntegration?.config?.linkedin_account_type ? (
                <p style={{ margin: 0 }}>
                  {linkedInStepConfig?.action === "invitation_with_message"
                    ? "With a message, LinkedIn applies stricter caps depending on your plan."
                    : "Without a note, higher monthly volumes are often available on paid LinkedIn plans."}{" "}
                  We enforce platform limits automatically.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#b45309" }}>LinkedIn Free/Basic:</strong> up to 150 invitations/month without
                  message. We enforce these limits automatically.
                </p>
              )}
            </div>
          </div>

          {linkedInStepConfig?.action === "invitation_with_message" ? (
            <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
              Next: write or choose your connection note (saved templates or AI suggestions)—same layout as email drafts.
            </p>
          ) : null}
        </div>
      )}

      {/* LinkedIn Templates - connection note editor + tabs/cards (aligned with email drafts step) */}
      {currentStepInfo?.stepType === "linkedin_templates" &&
        linkedInStepConfig?.action === "invitation_with_message" &&
        linkedInStepConfig && (
          <div style={{ display: "grid", gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>LinkedIn drafts</h3>
            {nextStepValidationError ? (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid color-mix(in srgb, #b91c1c 35%, var(--color-border))",
                  background: "color-mix(in srgb, #fef2f2 92%, var(--color-surface))",
                  color: "var(--color-text)",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ display: "block", marginBottom: 6, color: "#991b1b" }}>
                  Fix this before continuing
                </strong>
                {nextStepValidationError}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
              }}
            >
              <div
                role="tablist"
                aria-label="LinkedIn note source"
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  maxWidth: "100%",
                  flexWrap: "wrap",
                  padding: 4,
                  gap: 4,
                  borderRadius: 12,
                  background: "var(--color-surface-secondary)",
                  border: "1px solid var(--color-border)",
                  boxSizing: "border-box",
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={linkedInTemplateTab === "library"}
                  aria-controls="linkedin-draft-panel-library"
                  id="linkedin-draft-tab-library"
                  onClick={() => setLinkedInTemplateTab("library")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    ...(linkedInTemplateTab === "library"
                      ? {
                          background: "var(--color-surface)",
                          color: "var(--color-primary)",
                          border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                        }
                      : {
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          border: "1px solid transparent",
                          boxShadow: "none",
                        }),
                    transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  From templates
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={linkedInTemplateTab === "ai"}
                  aria-controls="linkedin-draft-panel-ai"
                  id="linkedin-draft-tab-ai"
                  onClick={() => setLinkedInTemplateTab("ai")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    ...(linkedInTemplateTab === "ai"
                      ? {
                          background: "var(--color-surface)",
                          color: "var(--color-primary)",
                          border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                        }
                      : {
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          border: "1px solid transparent",
                          boxShadow: "none",
                        }),
                    transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  All suggestions
                </button>
              </div>
              {linkedInTemplateTab === "ai" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {linkedInStepConfig.templates && linkedInStepConfig.templates.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void runLinkedInInlineAiTemplates()}
                      disabled={linkedInGeneratingTemplates}
                      style={{
                        ...EMAIL_AI_TOOLBAR_BTN,
                        ...(linkedInGeneratingTemplates ? DISABLED_SURFACE_TINT_STYLE : {}),
                      }}
                    >
                      {linkedInGeneratingTemplates ? (
                        <Icons.Loader
                          size={16}
                          style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }}
                        />
                      ) : (
                        <Icons.RefreshCw size={16} strokeWidth={1.75} style={{ color: "var(--color-text-muted)" }} />
                      )}
                      {linkedInGeneratingTemplates ? "Regenerating…" : "Regenerate suggestions"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runLinkedInInlineAiTemplates()}
                      disabled={linkedInGeneratingTemplates}
                      title={
                        linkedInSampleLeadForAi
                          ? undefined
                          : "Needs a lead with a LinkedIn profile URL (enrichment or a custom column containing a linkedin.com/in/… link)"
                      }
                      style={{
                        ...EMAIL_AI_TOOLBAR_BTN,
                        ...(linkedInGeneratingTemplates ? DISABLED_SURFACE_TINT_STYLE : {}),
                      }}
                    >
                      {linkedInGeneratingTemplates ? (
                        <Icons.Loader
                          size={16}
                          style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }}
                        />
                      ) : (
                        <Icons.Linkedin size={16} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_LINKEDIN }} />
                      )}
                      {linkedInGeneratingTemplates ? "Generating…" : "Suggest connection notes (AI)"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.45, maxWidth: 720 }}>
              Pick a saved note or AI suggestions (max 200 characters for LinkedIn). Edit copy with the pencil on each
              card. Save reusable notes under{" "}
              <Link href="/templates" style={{ color: WIZ_ACCENT, fontWeight: 600 }}>
                Templates
              </Link>{" "}
              (channel: LinkedIn).
            </p>

            {linkedInTemplateTab === "library" && (
              <div
                id="linkedin-draft-panel-library"
                role="tabpanel"
                aria-labelledby="linkedin-draft-tab-library"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {libraryTemplatesLoading ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
                    Loading saved templates…
                  </div>
                ) : filterLibraryByChannel("linkedin").length === 0 ? (
                  <div
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      maxWidth: 420,
                      margin: "0 auto",
                    }}
                  >
                    <Icons.Linkedin size={44} style={{ color: "#9ca3af", marginBottom: 16 }} />
                    <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                      No saved LinkedIn templates yet
                    </div>
                    <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.5 }}>
                      Create notes on the Templates page (channel: LinkedIn).
                    </p>
                    <Link
                      href="/templates"
                      className="btn-ghost"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        border: "1px solid var(--color-border)",
                        textDecoration: "none",
                        color: "var(--color-text)",
                      }}
                    >
                      → Go to Templates
                    </Link>
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {filterLibraryByChannel("linkedin").map((t: Record<string, unknown>) => {
                      const id = t.id as number;
                      const vars = (t.variables && typeof t.variables === "object" && !Array.isArray(t.variables)
                        ? (t.variables as Record<string, unknown>)
                        : {}) as Record<string, unknown>;
                      const title = String(vars.name || "Untitled");
                      const category = String(vars.category ?? "Outreach");
                      const raw = String(t.content || "").trim();
                      const useText = raw.length > 200 ? raw.slice(0, 200) : raw;
                      const shared = t.visibility === "workspace";
                      const metaLine = `${category} · linkedin${shared ? " · Shared" : ""}`;
                      const applied =
                        (linkedInStepConfig.message ?? "").trim() === useText.trim() && useText.length > 0;
                      return (
                        <WizardEmailDraftCard
                          key={id}
                          variant="library"
                          layout="linkedin_note"
                          title={title}
                          category={category}
                          workspaceShared={shared}
                          subjectDisplay=""
                          bodyPreview={raw.length > 200 ? `${raw.slice(0, 200)}…` : raw}
                          isSelected={applied}
                          onToggleSelect={() => {
                            setLinkedInAppliedSuggestionIndex(null);
                            setLinkedInStepConfig((prev) =>
                              prev
                                ? { ...prev, message: useText, action: "invitation_with_message" }
                                : prev
                            );
                            showSuccess("Note applied", "Your connection note is set. Switch to AI suggestions to compare.");
                            setLinkedInTemplateTab("ai");
                          }}
                          onPreview={() =>
                            setEmailWizardPreview({
                              kind: "linkedin",
                              title,
                              metaLine,
                              subject: "",
                              body: useText,
                            })
                          }
                          onEdit={() => setEmailWizardEdit({ type: "linkedin_library", id })}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {linkedInTemplateTab === "ai" && (
              <div
                id="linkedin-draft-panel-ai"
                role="tabpanel"
                aria-labelledby="linkedin-draft-tab-ai"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {linkedInGeneratingTemplates ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Icons.Loader size={18} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
                    Suggesting connection notes…
                  </div>
                ) : null}
                {linkedInTemplateError ? (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#b91c1c",
                      fontSize: 13,
                    }}
                  >
                    {linkedInTemplateError}
                  </div>
                ) : null}
                {!linkedInSampleLeadForAi ? (
                  <div
                    role="status"
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ fontWeight: 600 }}>No leads have a LinkedIn profile URL.</strong> Add or enrich
                    leads with a full profile link, then use &quot;Suggest connection notes (AI)&quot; again. Map a CSV
                    column to <strong>LinkedIn URL</strong> (system field), or use a custom column with{" "}
                    <code className="text-xs">linkedin.com/in/…</code> links.
                  </div>
                ) : null}
                {linkedInStepConfig.templates && linkedInStepConfig.templates.length > 0 ? (
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {linkedInStepConfig.templates.map((tpl, idx) => {
                      const isApplied = linkedInAppliedSuggestionIndex === idx;
                      return (
                        <WizardEmailDraftCard
                          key={idx}
                          variant="ai"
                          layout="linkedin_note"
                          title={`Suggestion ${idx + 1}`}
                          category="Connection note"
                          subjectDisplay=""
                          bodyPreview={tpl}
                          isSelected={isApplied}
                          onToggleSelect={() => {
                            setLinkedInAppliedSuggestionIndex(idx);
                            setLinkedInStepConfig((p) =>
                              p ? { ...p, message: tpl.slice(0, 200), action: "invitation_with_message" } : p
                            );
                          }}
                          onPreview={() =>
                            setEmailWizardPreview({
                              kind: "linkedin",
                              title: `Suggestion ${idx + 1}`,
                              metaLine: "AI suggestion · linkedin",
                              subject: "",
                              body: tpl,
                            })
                          }
                          onEdit={() => setEmailWizardEdit({ type: "linkedin_ai", index: idx })}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "var(--color-text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Icons.FileEdit size={32} />
                    <div style={{ fontSize: 14, maxWidth: 480, lineHeight: 1.5 }}>
                      {linkedInStepConfig.message?.trim()
                        ? "No AI suggestions yet. Use “Suggest connection notes (AI)” above to generate options, or edit your applied note with the pencil on a card."
                        : "Use “Suggest connection notes (AI)” above to generate options from a lead’s profile, or pick a saved template. Edit any note with the pencil on a card."}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


      {/* Call Knowledge Base - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_knowledge_base' && (
        <div style={{ display:'grid', gap:20 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>Calling assistant — knowledge</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 20 }}>
              Add files the AI can use on phone calls. This section is only for calls—not email or social messages.
            </p>
          </div>

          {!kbAiGeneratorExpanded ? (
            <div style={{ justifySelf: "start", width: "fit-content", maxWidth: "100%" }}>
              <button
                type="button"
                className="persona-ai-generate-btn"
                disabled={uploadingFile}
                onClick={() => setKbAiGeneratorExpanded(true)}
              >
                <Sparkles size={18} strokeWidth={2} aria-hidden />
                Generate with AI
              </button>
            </div>
          ) : (
            <div
              className="persona-ai-panel-reveal call-kb-ai-panel"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "18px 18px 16px",
                background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 2,
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginBottom: 8,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.25,
                    }}
                  >
                    AI knowledge document
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--color-text-muted)",
                      maxWidth: "52ch",
                    }}
                  >
                    Choose a starter topic below, or type your own. We&apos;ll ask a few quick questions, then build a PDF you
                    can attach like any other file.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={uploadingFile || kbAiPhase === "loading" || kbAiPhase === "generating"}
                  onClick={() => setKbAiGeneratorExpanded(false)}
                  className="btn-ghost"
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    background: "var(--color-surface)",
                    cursor:
                      uploadingFile || kbAiPhase === "loading" || kbAiPhase === "generating"
                        ? "not-allowed"
                        : "pointer",
                    opacity: uploadingFile || kbAiPhase === "loading" || kbAiPhase === "generating" ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  Hide
                </button>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: 10,
                  }}
                >
                  Suggested topics
                </div>
                <div
                  style={{
                    padding: "14px 14px 12px",
                    borderRadius: 10,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  {KB_SUGGESTIONS.map((s) => {
                    const isSel = selectedKbTopicId === s.id;
                    const disabled =
                      uploadingFile || kbAiPhase === "generating" || kbAiPhase === "loading";
                    const baseChip: CSSProperties = {
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      padding: "8px 14px",
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: isSel ? 600 : 500,
                      fontFamily: "inherit",
                      lineHeight: 1.35,
                      boxSizing: "border-box",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: 1,
                      border:
                        disabled
                          ? "1px solid rgba(var(--color-primary-rgb), 0.35)"
                          : isSel
                            ? "1px solid var(--color-primary)"
                            : "1px solid var(--color-border)",
                      background:
                        disabled
                          ? "rgba(var(--color-primary-rgb), 0.12)"
                          : isSel
                            ? "rgba(var(--color-primary-rgb), 0.2)"
                            : "var(--color-surface-secondary)",
                      color: disabled ? "var(--color-primary)" : isSel ? "var(--color-primary)" : "var(--color-text)",
                      transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                    };
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={disabled}
                        title={s.hint}
                        onClick={() => {
                          if (selectedKbTopicId === s.id) {
                            setSelectedKbTopicId(null);
                            return;
                          }
                          setSelectedKbTopicId(s.id);
                          void openKbAiSuggestion(s.id, s.label);
                        }}
                        style={baseChip}
                        onMouseEnter={(e) => {
                          if (disabled || isSel) return;
                          e.currentTarget.style.background = "var(--color-surface-secondary)";
                          e.currentTarget.style.borderColor = "#f8c8a9";
                        }}
                        onMouseLeave={(e) => {
                          if (disabled || isSel) return;
                          e.currentTarget.style.background = "var(--color-surface-secondary)";
                          e.currentTarget.style.borderColor = "";
                          e.currentTarget.style.border = "1px solid var(--color-border)";
                        }}
                      >
                        {isSel ? (
                          <span aria-hidden style={{ fontSize: 10 }}>
                            ✓
                          </span>
                        ) : null}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="kb-ai-generator-custom-brief"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Or describe your own topic
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "stretch",
                  }}
                >
                  <input
                    id="kb-ai-generator-custom-brief"
                    type="text"
                    className="input"
                    value={kbAiGeneratorCustomBrief}
                    onChange={(e) => setKbAiGeneratorCustomBrief(e.target.value)}
                    onKeyDown={(e) => {
                      const t = (e.currentTarget as HTMLInputElement).value.trim();
                      if (
                        e.key === "Enter" &&
                        t &&
                        !uploadingFile &&
                        kbAiPhase !== "loading" &&
                        kbAiPhase !== "generating"
                      ) {
                        e.preventDefault();
                        setSelectedKbTopicId("custom_business");
                        void openKbAiSuggestion("custom_business", t.length > 56 ? `${t.slice(0, 56)}…` : t, t);
                      }
                    }}
                    disabled={uploadingFile || kbAiPhase === "loading" || kbAiPhase === "generating"}
                    placeholder="Short description, e.g. dental scheduling & insurance FAQs"
                    style={{
                      flex: "1 1 220px",
                      minWidth: 0,
                      fontSize: 14,
                      padding: "10px 14px",
                      minHeight: 42,
                      borderRadius: 10,
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      uploadingFile ||
                      kbAiPhase === "loading" ||
                      kbAiPhase === "generating" ||
                      !kbAiGeneratorCustomBrief.trim()
                    }
                    onClick={() => {
                      const t = kbAiGeneratorCustomBrief.trim();
                      if (!t) return;
                      setSelectedKbTopicId("custom_business");
                      void openKbAiSuggestion("custom_business", t.length > 56 ? `${t.slice(0, 56)}…` : t, t);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      flexShrink: 0,
                      padding: "0 18px",
                      minHeight: 42,
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 10,
                      ...(uploadingFile ||
                      kbAiPhase === "loading" ||
                      kbAiPhase === "generating" ||
                      !kbAiGeneratorCustomBrief.trim()
                        ? DISABLED_PRIMARY_TINT_STYLE
                        : {}),
                    }}
                  >
                    <Sparkles size={16} strokeWidth={2} aria-hidden />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Initial upload (hidden once at least one file exists) */}
          {knowledgeBaseFiles.length === 0 ? (
            <>
            <div
              style={{
                border: "2px dashed var(--color-border)",
                borderRadius: 12,
                padding: uploadingFile ? "28px 20px" : "40px 20px",
                textAlign: "center",
                background: "var(--color-surface-secondary)",
                cursor: uploadingFile ? "default" : "pointer",
                transition: "border-color 0.2s, background 0.2s",
                position: "relative",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (uploadingFile) return;
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.background = "rgba(var(--color-primary-rgb), 0.2)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-surface-secondary)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-surface-secondary)";
                if (uploadingFile) return;
                const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
                if (files.length > 0) {
                  void handleFileUpload(files[0]);
                }
              }}
              onClick={() => {
                if (uploadingFile) return;
                triggerKbPdfFilePicker();
              }}
            >
              {uploadingFile ? (
                <div style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>Uploading…</span>
                    <span>{uploadProgress ?? 0}%</span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 9999,
                      background: "var(--color-border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: 4,
                        borderRadius: 9999,
                        background: "var(--color-primary)",
                        width: `${uploadProgress ?? 0}%`,
                        transition: "width 0.25s ease-out",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 10 }}>
                    Knowledge base files only (max 10MB)
                  </div>
                </div>
              ) : (
                <>
                  <Icons.Upload size={48} style={{ color: "var(--color-primary)", marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Click to upload or drag and drop</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Knowledge base files only (max 10MB)</div>
                </>
              )}
            </div>
            <p
              className="text-hint"
              style={{
                fontSize: 12,
                marginTop: 10,
                marginBottom: 0,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Add a knowledge base to continue: upload a PDF here, or use{" "}
              <strong style={{ fontWeight: 600 }}>Generate with AI</strong> to create one from a topic.
            </p>
            </>
          ) : null}

          {uploadError && (
            <div
              style={{
                padding: 12,
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: 8,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                fontSize: 14,
              }}
            >
              {uploadError}
            </div>
          )}

          {knowledgeBaseFiles.length > 0 ? (
            <div>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Uploaded file</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {knowledgeBaseFiles.map((file) => (
                  <div
                    key={file.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      background: "var(--color-surface-secondary)",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <FileText size={20} strokeWidth={2} style={{ color: kbFileIconColor(file.name), flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-word" }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          {file.sizeBytes != null ? ` · ${formatKbFileSize(file.sizeBytes)}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        title="View knowledge base file"
                        aria-label="View knowledge base file"
                        onClick={() => {
                          void fetchKbPdfBlob(file.id, false).catch((err: Error) => {
                            showError("View failed", err?.message || "Could not open file");
                          });
                        }}
                        style={{ padding: 8, borderRadius: 8 }}
                      >
                        <Icons.Eye size={18} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        title="Download knowledge base file"
                        aria-label="Download knowledge base file"
                        onClick={() => {
                          void fetchKbPdfBlob(file.id, true).catch((err: Error) => {
                            showError("Download failed", err?.message || "Could not download file");
                          });
                        }}
                        style={{ padding: 8, borderRadius: 8 }}
                      >
                        <Icons.Download size={18} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        title="Remove file"
                        aria-label="Remove file"
                        onClick={() => setKbDeleteTarget({ id: file.id, name: file.name })}
                        style={{ padding: 8, borderRadius: 8, color: "#ef4444" }}
                      >
                        <Icons.Trash size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* WhatsApp Templates — aligned with Step 5 email drafts (tabs, cards, preview/edit modals) */}
      {currentStepInfo?.stepType === "whatsapp_templates" && (
        <div style={{ display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>WhatsApp drafts</h3>
          {nextStepValidationError ? (
            <div
              role="alert"
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, #b91c1c 35%, var(--color-border))",
                background: "color-mix(in srgb, #fef2f2 92%, var(--color-surface))",
                color: "var(--color-text)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: "block", marginBottom: 6, color: "#991b1b" }}>
                Fix this before continuing
              </strong>
              {nextStepValidationError}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
            }}
          >
            <div
              role="tablist"
              aria-label="How to choose WhatsApp content"
              style={{
                display: "inline-flex",
                width: "fit-content",
                maxWidth: "100%",
                flexWrap: "wrap",
                padding: 4,
                gap: 4,
                borderRadius: 12,
                background: "var(--color-surface-secondary)",
                border: "1px solid var(--color-border)",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={whatsAppTemplateTab === "library"}
                aria-controls="wa-draft-panel-library"
                id="wa-draft-tab-library"
                onClick={() => setWhatsAppTemplateTab("library")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  ...(whatsAppTemplateTab === "library"
                    ? {
                        background: "var(--color-surface)",
                        color: "var(--color-primary)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      }
                    : {
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        border: "1px solid transparent",
                        boxShadow: "none",
                      }),
                  transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                From templates
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={whatsAppTemplateTab === "ai"}
                aria-controls="wa-draft-panel-ai"
                id="wa-draft-tab-ai"
                onClick={() => setWhatsAppTemplateTab("ai")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  ...(whatsAppTemplateTab === "ai"
                    ? {
                        background: "var(--color-surface)",
                        color: "var(--color-primary)",
                        border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      }
                    : {
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        border: "1px solid transparent",
                        boxShadow: "none",
                      }),
                  transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                AI suggestions
              </button>
            </div>
            {whatsAppTemplateTab === "ai" && !generatingWhatsAppMessages ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => void runWhatsAppAiDrafts()}
                  disabled={generatingWhatsAppMessages || !channels.includes("whatsapp") || !activeBaseId}
                  style={{
                    ...EMAIL_AI_TOOLBAR_BTN,
                    ...(generatingWhatsAppMessages || !channels.includes("whatsapp") || !activeBaseId
                      ? DISABLED_SURFACE_TINT_STYLE
                      : {}),
                  }}
                >
                  {generatingWhatsAppMessages ? (
                    <Icons.Loader
                      size={16}
                      style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }}
                    />
                  ) : (
                    <Icons.RefreshCw size={16} strokeWidth={1.75} style={{ color: "var(--color-text-muted)" }} />
                  )}
                  {generatingWhatsAppMessages
                    ? "Generating…"
                    : whatsAppMessages.length > 0
                      ? "Regenerate drafts"
                      : "Generate drafts"}
                </button>
              </div>
            ) : null}
          </div>
          <p className="text-hint" style={{ margin: 0, fontSize: 13, lineHeight: 1.45, maxWidth: 720 }}>
            AI gives several <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>suggestions</strong> (not
            email-style follow-ups). Choose <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>one</strong>{" "}
            to use. A saved template only fills <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>Suggestion 1</strong>; manage
            reusable copy on{" "}
            <Link href="/templates" style={{ color: WIZ_ACCENT, fontWeight: 600 }}>
              Templates
            </Link>
            .
          </p>

          {whatsAppTemplateTab === "library" && (
            <div
              id="wa-draft-panel-library"
              role="tabpanel"
              aria-labelledby="wa-draft-tab-library"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {libraryTemplatesLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading your saved templates…
                </div>
              ) : filterLibraryByChannel("whatsapp").length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    maxWidth: 420,
                    margin: "0 auto",
                  }}
                >
                  <Icons.WhatsApp size={44} style={{ color: "#9ca3af", marginBottom: 16 }} />
                  <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
                    No saved WhatsApp templates yet
                  </div>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 22px", lineHeight: 1.5 }}>
                    Create snippets on the Templates page (channel: WhatsApp).
                  </p>
                  <Link
                    href="/templates"
                    className="btn-ghost"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      border: "1px solid var(--color-border)",
                      textDecoration: "none",
                      color: "var(--color-text)",
                    }}
                  >
                    → Go to Templates
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {filterLibraryByChannel("whatsapp").map((t: Record<string, unknown>) => {
                      const id = t.id as number;
                      const vars = (t.variables && typeof t.variables === "object" && !Array.isArray(t.variables)
                        ? (t.variables as Record<string, unknown>)
                        : {}) as Record<string, unknown>;
                      const title = String(vars.name || "Untitled");
                      const category = String(vars.category ?? "Outreach");
                      const defaultBody = String(t.content || "");
                      const body = libraryTemplateEdits[id]?.body ?? defaultBody;
                      const shared = t.visibility === "workspace";
                      const metaLine = `${category} · whatsapp${shared ? " · Shared" : ""}`;
                      const previewText = body.length > 200 ? `${body.slice(0, 200)}…` : body;
                      const applied = whatsAppAppliedLibraryTemplateId === id;
                      return (
                        <WizardEmailDraftCard
                          key={id}
                          variant="library"
                          layout="whatsapp"
                          title={title}
                          category={category}
                          workspaceShared={shared}
                          subjectDisplay=""
                          bodyPreview={previewText}
                          isSelected={applied}
                          onToggleSelect={() => {
                            if (applied) {
                              setWhatsAppAppliedLibraryTemplateId(null);
                              return;
                            }
                            setWhatsAppAppliedLibraryTemplateId(id);
                            setWhatsAppMessages((prev) => {
                              const next = [...prev];
                              next[0] = body;
                              return next;
                            });
                            setWhatsAppMessagesGenerated(true);
                            setSelectedWhatsAppMessageIndices([0]);
                            showSuccess(
                              "Template applied to Suggestion 1",
                              "Open AI suggestions to compare variants and pick one for this campaign."
                            );
                            setWhatsAppTemplateTab("ai");
                          }}
                          onPreview={() =>
                            setEmailWizardPreview({
                              kind: "whatsapp",
                              title,
                              metaLine,
                              subject: "",
                              body: body || "—",
                            })
                          }
                          onEdit={() => setEmailWizardEdit({ type: "whatsapp_library", id })}
                        />
                      );
                    })}
                  </div>
                  {whatsAppAppliedLibraryTemplateId != null ? (
                    <WizardStepCallout tone="selected" marginTop={4}>
                      ✓ A saved template is applied to Suggestion 1. Open AI suggestions to compare variants, pick one
                      message for this campaign, and edit copy if needed.
                    </WizardStepCallout>
                  ) : null}
                </>
              )}
            </div>
          )}

          {whatsAppTemplateTab === "ai" && (
            <div
              id="wa-draft-panel-ai"
              role="tabpanel"
              aria-labelledby="wa-draft-tab-ai"
              style={{ display: "contents" }}
            >
              {generatingWhatsAppMessages ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Icons.Loader size={40} style={{ color: "var(--color-primary)", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Writing your WhatsApp drafts…</div>
                  <div style={{ fontSize: 13 }}>
                    Using your campaign details, target segments, and sample leads with phone numbers
                  </div>
                </div>
              ) : (
                <>
                  {whatsAppMessages.length === 0 && whatsAppSampleLeadsForAi.length === 0 ? (
                    <div
                      role="status"
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        color: "#92400e",
                        fontSize: 13,
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}
                    >
                      <strong style={{ fontWeight: 600 }}>No selected leads have a valid phone number.</strong> Add or
                      enrich phone numbers for your campaign leads, then use <strong>Generate drafts</strong> again.
                    </div>
                  ) : null}
                  <div
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))",
                      gap: 14,
                      paddingRight: 4,
                      alignContent: "start",
                    }}
                  >
                    {whatsAppMessages.map((m, i) => {
                      const draftTitle = whatsAppDraftBadgeLabel(i);
                      const metaLine = `Campaign · WhatsApp · ${draftTitle}`;
                      const isSelected = selectedWhatsAppMessageIndices.includes(i);
                      return (
                        <WizardEmailDraftCard
                          key={i}
                          variant="ai"
                          layout="whatsapp"
                          title={draftTitle}
                          category="Campaign"
                          subjectDisplay=""
                          bodyPreview={m}
                          isSelected={isSelected}
                          onToggleSelect={() => setSelectedWhatsAppMessageIndices([i])}
                          onPreview={() =>
                            setEmailWizardPreview({
                              kind: "whatsapp",
                              title: draftTitle,
                              metaLine,
                              subject: "",
                              body: m || "—",
                            })
                          }
                          onEdit={() => setEmailWizardEdit({ type: "whatsapp_ai", index: i })}
                        />
                      );
                    })}
                  </div>

                  {whatsAppMessages.length > 0 && channels.includes("whatsapp") ? (
                    <WizardStepCallout
                      tone={selectedWhatsAppMessageIndices.length > 0 ? "selected" : "idle"}
                      marginTop={12}
                    >
                      {aiWhatsAppDraftsUnifiedSummary(whatsAppMessages.length, selectedWhatsAppMessageIndices)}
                    </WizardStepCallout>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Call Voice Selection - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_voice_selection' && (
        <div style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingLeft: VOICE_STEP_CONTENT_GUTTER,
              paddingRight: VOICE_STEP_CONTENT_GUTTER,
              boxSizing: "border-box",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
              }}
            >
              Choose a call voice
            </h3>
            <p className="text-hint" style={{ margin: 0, maxWidth: 720, lineHeight: 1.55, fontSize: 14 }}>
              Used for AI phone calls. Pick a library voice or one you cloned — preview any row before you continue.
            </p>
          </div>

          {loadingVoices && availableVoices.length === 0 ? (
            <div
              style={{
                paddingLeft: VOICE_STEP_CONTENT_GUTTER,
                paddingRight: VOICE_STEP_CONTENT_GUTTER,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "52px 20px",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  borderRadius: 16,
                  border: "1px dashed var(--color-border)",
                  background: "var(--color-surface-secondary)",
                  boxSizing: "border-box",
                }}
              >
                <Icons.Loader size={28} style={{ animation: "spin 1s linear infinite" }} />
                <div style={{ fontWeight: 600, color: "var(--color-text)" }}>Loading voices…</div>
              </div>
            </div>
          ) : availableVoices.length === 0 ? (
            <div
              style={{
                paddingLeft: VOICE_STEP_CONTENT_GUTTER,
                paddingRight: VOICE_STEP_CONTENT_GUTTER,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--color-text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  border: "1px dashed var(--color-border)",
                  borderRadius: 16,
                  background: "var(--color-surface-secondary)",
                  boxSizing: "border-box",
                }}
              >
                <Icons.AlertCircle size={28} style={{ color: "#f59e0b" }} />
                <div style={{ fontWeight: 600, color: "var(--color-text)" }}>No voices available</div>
                <div style={{ fontSize: 14, maxWidth: 400, lineHeight: 1.5 }}>
                  Check your voice API key, or clone a voice once the API is configured.
                </div>
                <button type="button" className="btn-primary" onClick={() => setVoiceCloneOpen(true)} style={{ marginTop: 8 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Icons.UserPlus size={18} />
                    Clone a voice
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="voice-step-shell">
                <div
                  role="tablist"
                  aria-label="Voice source"
                  className="voice-step-segment-wrap"
                  style={{ padding: `8px ${VOICE_STEP_CONTENT_GUTTER}px` }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={voicePickerTab === "library"}
                    id="voice-tab-library"
                    onClick={() => setVoicePickerTab("library")}
                    className={`voice-step-segment ${
                      voicePickerTab === "library" ? "voice-step-segment-active" : "voice-step-segment-idle"
                    }`}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                      Library
                      {premadeVoices.length > 0 ? (
                        <span
                          className="text-hint"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(var(--color-primary-rgb), 0.2)",
                            color: WIZ_ACCENT_LINE,
                          }}
                        >
                          {premadeVoices.length}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={voicePickerTab === "my"}
                    id="voice-tab-my"
                    onClick={() => setVoicePickerTab("my")}
                    className={`voice-step-segment ${
                      voicePickerTab === "my" ? "voice-step-segment-active" : "voice-step-segment-idle"
                    }`}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                      My voices
                      {myVoicesList.length > 0 ? (
                        <span
                          className="text-hint"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(var(--color-primary-rgb), 0.2)",
                            color: WIZ_ACCENT_LINE,
                          }}
                        >
                          {myVoicesList.length}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </div>

                {/* Library tab */}
                {voicePickerTab === "library" && (
                  <section
                    style={{
                      padding: `16px ${VOICE_STEP_CONTENT_GUTTER}px 20px`,
                      minWidth: 0,
                      background: "var(--color-surface)",
                      boxSizing: "border-box",
                    }}
                  >
                    {premadeVoices.length === 0 ? (
                      <div className="text-hint" style={{ fontSize: 13, lineHeight: 1.55 }}>
                        No premade voices were returned. If you only see custom voices, they will appear under{" "}
                        <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>My voices</strong>.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            marginBottom: 14,
                          }}
                        >
                          <div style={{ position: "relative" }}>
                            <Icons.Search
                              size={18}
                              aria-hidden
                              style={{
                                position: "absolute",
                                left: 13,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--color-text-muted)",
                                opacity: 0.65,
                                pointerEvents: "none",
                              }}
                            />
                            <input
                              id="voice-library-search"
                              type="search"
                              className="voice-search-field"
                              placeholder="Search by name or description…"
                              value={voiceLibrarySearch}
                              onChange={(e) => setVoiceLibrarySearch(e.target.value)}
                              aria-label="Search voices"
                            />
                          </div>
                          <div role="group" aria-label="Voice style filters" className="voice-filter-chips">
                            {VOICE_LIBRARY_FILTER_CHIPS.map((chip) => {
                              const active = voiceLibraryFilter === chip.id;
                              return (
                                <button
                                  key={chip.id}
                                  type="button"
                                  onClick={() => setVoiceLibraryFilter(chip.id)}
                                  style={{
                                    padding: "6px 13px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: active ? 600 : 500,
                                    border: "none",
                                    background: active ? "rgba(var(--color-primary-rgb), 0.2)" : "transparent",
                                    color: active ? WIZ_ACCENT_LINE : "var(--color-text-muted)",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    transition: "background 0.15s ease, color 0.15s ease",
                                  }}
                                >
                                  {chip.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-hint" style={{ fontSize: 12, marginBottom: 8, lineHeight: 1.45 }}>
                          Showing{" "}
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{visibleLibraryVoices.length}</span> of{" "}
                          {filteredPremadeVoices.length}
                          {filteredPremadeVoices.length !== premadeVoices.length ? ` (${premadeVoices.length} in library)` : ""}
                        </div>

                        <div className="voice-list-scroll">
                          <div className="voice-list-rows">
                          {visibleLibraryVoices.map((voice) => {
                            const sel = selectedVoiceId === voice.id;
                            const playing = previewingVoiceId === voice.id;
                            const waveColor = inferVoiceWaveColor(voice);
                            return (
                              <div
                                key={voice.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={sel}
                                data-selected={sel ? "true" : undefined}
                                aria-label={`Select voice ${voice.name}`}
                                className={`voice-select-row${playing ? " voice-row-playing-pulse" : ""}`}
                                onClick={() => setSelectedVoiceId(voice.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedVoiceId(voice.id);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "stretch",
                                  border: "none",
                                  borderRadius: 0,
                                  overflow: "hidden",
                                  borderLeft: `3px solid ${sel ? WIZ_ACCENT : "transparent"}`,
                                  cursor: "pointer",
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 14px 12px 11px",
                                    minWidth: 0,
                                  }}
                                >
                                <div
                                  aria-hidden
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    border: sel ? "2px solid var(--color-primary)" : "1.5px solid rgba(148, 163, 184, 0.5)",
                                    background: sel ? "var(--color-primary)" : "transparent",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {sel ? (
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "#fff",
                                      }}
                                    />
                                  ) : null}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <VoiceNameRow name={voice.name} playing={playing} waveColor={waveColor} />
                                  {voice.description ? (
                                    <div
                                      className="text-hint"
                                      style={{
                                        fontSize: 12,
                                        marginTop: 6,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {voice.description}
                                    </div>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className={`voice-preview-btn ${playing ? "voice-preview-btn-playing" : "voice-preview-btn-idle"}`}
                                  disabled={previewLoadingVoiceId === voice.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleVoicePreview(voice.id);
                                  }}
                                >
                                  {previewLoadingVoiceId === voice.id ? (
                                    <Icons.Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                                  ) : playing ? (
                                    <Pause size={14} />
                                  ) : (
                                    <Play size={14} />
                                  )}
                                  {playing ? "Stop" : "Preview"}
                                </button>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                        {libraryVoiceVisibleCount < filteredPremadeVoices.length ? (
                          <button
                            type="button"
                            className="voice-load-more-plain"
                            onClick={() => setLibraryVoiceVisibleCount((n) => n + 5)}
                          >
                            <Icons.ChevronDown size={18} strokeWidth={2.25} aria-hidden style={{ flexShrink: 0, opacity: 0.75 }} />
                            <span>
                              Load more{" "}
                              <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>
                                ({filteredPremadeVoices.length - libraryVoiceVisibleCount} left)
                              </span>
                            </span>
                          </button>
                        ) : null}
                        {filteredPremadeVoices.length === 0 && premadeVoices.length > 0 ? (
                          <div className="text-hint" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
                            No voices match your search or filters. Try <strong>All</strong> or clear the search box.
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                )}

                {/* My voices tab */}
                {voicePickerTab === "my" && (
                  <section
                    style={{
                      padding: `16px ${VOICE_STEP_CONTENT_GUTTER}px 20px`,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      background: "var(--color-surface)",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text)",
                          marginBottom: 4,
                        }}
                      >
                        Your voices
                      </div>
                      <p className="text-hint" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        Clones are saved to your account and appear only here.
                      </p>
                    </div>

                    {myVoicesList.length === 0 ? (
                      <div
                        className="text-hint"
                        style={{
                          fontSize: 13,
                          padding: "22px 16px",
                          borderRadius: 12,
                          border: "none",
                          textAlign: "center",
                          lineHeight: 1.55,
                          background: "rgba(15, 23, 42, 0.03)",
                          boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
                        }}
                      >
                        No cloned voices yet. Use <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>Clone a new voice</strong>{" "}
                        below — it will show up in this list.
                      </div>
                    ) : (
                      <>
                        {myVoicesList.length > 5 ? (
                          <div className="text-hint" style={{ fontSize: 12, lineHeight: 1.45 }}>
                            Showing{" "}
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{visibleMyVoices.length}</span> of{" "}
                            {myVoicesList.length}
                          </div>
                        ) : null}
                        <div className="voice-list-scroll">
                        <div className="voice-list-rows">
                        {visibleMyVoices.map((voice) => {
                          const sel = selectedVoiceId === voice.id;
                          const playing = previewingVoiceId === voice.id;
                          const waveColor = inferVoiceWaveColor(voice);
                          return (
                            <div
                              key={voice.id}
                              role="button"
                              tabIndex={0}
                              aria-pressed={sel}
                              data-selected={sel ? "true" : undefined}
                              aria-label={`Select voice ${voice.name}`}
                              className={`voice-select-row${playing ? " voice-row-playing-pulse" : ""}`}
                              onClick={() => setSelectedVoiceId(voice.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedVoiceId(voice.id);
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "stretch",
                                border: "none",
                                borderRadius: 0,
                                overflow: "hidden",
                                borderLeft: `3px solid ${sel ? WIZ_ACCENT : "transparent"}`,
                                cursor: "pointer",
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "12px 14px 12px 11px",
                                  minWidth: 0,
                                }}
                              >
                              <div
                                aria-hidden
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  border: sel ? "2px solid var(--color-primary)" : "1.5px solid rgba(148, 163, 184, 0.5)",
                                  background: sel ? "var(--color-primary)" : "transparent",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {sel ? (
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: "#fff",
                                    }}
                                  />
                                ) : null}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <VoiceNameRow name={voice.name} playing={playing} waveColor={waveColor} />
                                {voice.description ? (
                                  <div
                                    className="text-hint"
                                    style={{
                                      fontSize: 12,
                                      marginTop: 6,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {voice.description}
                                  </div>
                                ) : null}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className={`voice-preview-btn ${playing ? "voice-preview-btn-playing" : "voice-preview-btn-idle"}`}
                                  disabled={previewLoadingVoiceId === voice.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleVoicePreview(voice.id);
                                  }}
                                >
                                  {previewLoadingVoiceId === voice.id ? (
                                    <Icons.Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                                  ) : playing ? (
                                    <Pause size={14} />
                                  ) : (
                                    <Play size={14} />
                                  )}
                                  {playing ? "Stop" : "Preview"}
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  title="Delete cloned voice"
                                  aria-label={`Delete ${voice.name}`}
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    border: "none",
                                    color: "rgba(185, 28, 28, 0.75)",
                                    background: "transparent",
                                    opacity: 0.85,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVoiceDeleteTarget({ id: voice.id, name: voice.name });
                                  }}
                                >
                                  <Icons.Trash size={18} />
                                </button>
                              </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                        </div>
                        {myVoiceVisibleCount < myVoicesList.length ? (
                          <button
                            type="button"
                            className="voice-load-more-plain"
                            onClick={() => setMyVoiceVisibleCount((n) => n + 5)}
                          >
                            <Icons.ChevronDown size={18} strokeWidth={2.25} aria-hidden style={{ flexShrink: 0, opacity: 0.75 }} />
                            <span>
                              Load more{" "}
                              <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>
                                ({myVoicesList.length - myVoiceVisibleCount} left)
                              </span>
                            </span>
                          </button>
                        ) : null}
                      </>
                    )}

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setVoiceCloneOpen(true)}
                      style={{
                        width: "100%",
                        marginTop: 2,
                        padding: "12px 16px",
                        fontWeight: 600,
                        fontSize: 14,
                        borderRadius: 10,
                        border: "none",
                        background: "rgba(var(--color-primary-rgb), 0.2)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        color: WIZ_ACCENT_LINE,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <Icons.Plus size={18} strokeWidth={2.25} />
                      Clone a new voice
                    </button>
                  </section>
                )}
              </div>

              {selectedVoiceId ? (
                <div
                  style={{
                    padding: `12px ${VOICE_STEP_CONTENT_GUTTER}px`,
                    background: "rgba(var(--color-primary-rgb), 0.2)",
                    borderRadius: "0 12px 12px 0",
                    border: "none",
                    boxShadow: "inset 3px 0 0 0 rgba(var(--color-primary-rgb), 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <div
                      aria-hidden
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "rgba(var(--color-primary-rgb), 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Check size={17} style={{ color: WIZ_ACCENT_LINE }} strokeWidth={2.25} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: WIZ_ACCENT_LINE }}>
                        Voice selected
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginTop: 2, overflowWrap: "anywhere" }}>
                        {availableVoices.find((v) => v.id === selectedVoiceId)?.name || "Unknown"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`voice-preview-btn ${
                      previewingVoiceId === selectedVoiceId ? "voice-preview-btn-playing" : "voice-preview-btn-idle"
                    }`}
                    disabled={previewLoadingVoiceId === selectedVoiceId}
                    onClick={() => void toggleVoicePreview(selectedVoiceId)}
                    style={{ flexShrink: 0 }}
                  >
                    {previewLoadingVoiceId === selectedVoiceId ? (
                      <Icons.Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                    ) : previewingVoiceId === selectedVoiceId ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                    {previewingVoiceId === selectedVoiceId ? "Stop" : "Preview"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Call Initial Prompt - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_initial_prompt' && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            paddingLeft: VOICE_STEP_CONTENT_GUTTER,
            paddingRight: VOICE_STEP_CONTENT_GUTTER,
            boxSizing: "border-box",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>How the call starts</h2>
            <p className="text-hint" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, maxWidth: 680 }}>
              The first thing your AI says on outbound calls. Tap a field to insert it, then edit freely—placeholders fill from
              each lead&apos;s profile.
            </p>
          </div>

          <div className="call-opening-panel">
            <div className="call-opening-panel-inner">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 10 }}>Insert fields</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {CALL_OPENING_VARIABLES.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      className="call-opening-chip"
                      title={`Example: ${variable.example}`}
                      disabled={callOpeningFetchLoading}
                      onClick={() => {
                        if (callOpeningFetchLoading) return;
                        const textarea = initialPromptTextareaRef.current;
                        if (!textarea) return;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = initialPrompt;
                        const insertText = `{{${variable.key}}}`;
                        const next = text.slice(0, start) + insertText + text.slice(end);
                        setInitialPrompt(next);
                        setCallOpeningStarterIndex(null);
                        requestAnimationFrame(() => {
                          const el = initialPromptTextareaRef.current;
                          if (!el) return;
                          const pos = start + insertText.length;
                          el.selectionStart = el.selectionEnd = pos;
                          el.focus();
                        });
                      }}
                    >
                      {`{{${variable.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="call-opening-grid">
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Opening line</span>
                    {!callOpeningFetchLoading ? (
                      <span className="text-hint" style={{ fontSize: 12 }}>
                        Tip: click a field above to insert at the cursor
                      </span>
                    ) : null}
                  </div>

                  <div className="call-opening-editor-shell">
                    {callOpeningFetchLoading ? (
                      <div className="call-opening-loader-overlay" role="status" aria-live="polite" aria-busy="true">
                        <Icons.Loader size={28} style={{ animation: "spin 1s linear infinite", color: WIZ_ACCENT }} />
                        <span>Loading your saved opening…</span>
                      </div>
                    ) : null}
                    <label htmlFor="initial-prompt-textarea" className="sr-only">
                      Call opening message
                    </label>
                    <textarea
                      id="initial-prompt-textarea"
                      ref={initialPromptTextareaRef}
                      className="call-opening-textarea initial-prompt-textarea"
                      value={initialPrompt}
                      disabled={callOpeningFetchLoading}
                      onChange={(e) => {
                        setInitialPrompt(e.target.value);
                        setCallOpeningStarterIndex(null);
                      }}
                      placeholder="Hello {{first_name}}! I'm calling about {{product_service}}…"
                    />
                    <div className="call-opening-meta">
                      ~
                      {countWordsForCallOpening(initialPrompt) || 0} words · ~
                      {estimateSpeakSecondsFromWords(countWordsForCallOpening(initialPrompt)) || 0} sec
                    </div>
                  </div>

                  {initialPrompt.trim() && !callOpeningFetchLoading ? (
                    <div className="call-opening-preview">
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--color-text-muted)",
                          marginBottom: 8,
                        }}
                      >
                        Sample as heard
                      </div>
                      <div>{previewCallOpeningWithSamples(initialPrompt)}</div>
                    </div>
                  ) : null}
                </div>

                <div className="call-opening-starters-wrap">
                  <div className="call-opening-starters-label">Starting points</div>
                  {CALL_STARTER_SCRIPTS.map((template, index) => {
                    const selected = callOpeningStarterIndex === index;
                    return (
                      <button
                        key={template.title}
                        type="button"
                        className="call-opening-starter"
                        data-selected={selected ? "true" : undefined}
                        title={template.text}
                        disabled={callOpeningFetchLoading}
                        onClick={() => {
                          if (callOpeningFetchLoading) return;
                          setInitialPrompt(template.text);
                          setCallOpeningStarterIndex(index);
                          requestAnimationFrame(() => initialPromptTextareaRef.current?.focus());
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)", marginBottom: 4 }}>
                          {template.title}
                        </div>
                        <div
                          className="text-hint"
                          style={{
                            fontSize: 12,
                            lineHeight: 1.45,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {template.description}
                        </div>
                        <div className="call-opening-starter-cta">
                          Click to use
                          <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call System Persona - rendered based on stepType */}
      {currentStepInfo?.stepType === 'call_system_persona' && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            paddingLeft: VOICE_STEP_CONTENT_GUTTER,
            paddingRight: VOICE_STEP_CONTENT_GUTTER,
            boxSizing: "border-box",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Assistant behavior</h2>
            <p className="text-hint" style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
              Your voice agent&apos;s{" "}
              <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>system prompt</strong>
              —tone, guardrails, and how it handles the rest of the call after the opening line.
            </p>
          </div>

          {!systemPersonaAiExpanded ? (
            <div style={{ justifySelf: "start", width: "fit-content", maxWidth: "100%" }}>
              <button
                type="button"
                className="persona-ai-generate-btn"
                disabled={systemPersonaGenerating || systemPersonaFetchLoading}
                onClick={() => setSystemPersonaAiExpanded(true)}
              >
                <Sparkles size={18} strokeWidth={2} aria-hidden />
                Generate with AI
              </button>
            </div>
          ) : (
            <div
              className="persona-ai-panel-reveal call-kb-ai-panel"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "18px 18px 16px",
                background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 2,
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginBottom: 8,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.25,
                    }}
                  >
                    AI assistant style
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--color-text-muted)",
                      maxWidth: "52ch",
                    }}
                  >
                    Choose a starter below, or describe your own. We&apos;ll generate a full system prompt using campaign
                    context when available.
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {systemPersonaGenerating ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden style={{ flexShrink: 0 }} />
                      Generating…
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={systemPersonaGenerating || systemPersonaFetchLoading}
                    onClick={() => setSystemPersonaAiExpanded(false)}
                    className="btn-ghost"
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "var(--color-surface)",
                      cursor:
                        systemPersonaGenerating || systemPersonaFetchLoading ? "not-allowed" : "pointer",
                      ...(systemPersonaGenerating || systemPersonaFetchLoading ? DISABLED_SURFACE_TINT_STYLE : {}),
                      flexShrink: 0,
                    }}
                  >
                    Hide
                  </button>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginBottom: 10,
                  }}
                >
                  Suggested styles
                </div>
                <div
                  style={{
                    padding: "14px 14px 12px",
                    borderRadius: 10,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    {CALL_SYSTEM_PERSONA_SUGGESTIONS.map((s) => {
                      const disabled = systemPersonaGenerating || systemPersonaFetchLoading;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={disabled}
                          title={s.brief.length > 140 ? `${s.brief.slice(0, 140)}…` : s.brief}
                          onClick={() => void generateCallSystemPersonaWithBrief(s.brief)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            padding: "8px 14px",
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: "inherit",
                            lineHeight: 1.35,
                            boxSizing: "border-box",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: 1,
                            border: disabled ? "1px solid rgba(var(--color-primary-rgb), 0.35)" : "1px solid var(--color-border)",
                            background: disabled ? "rgba(var(--color-primary-rgb), 0.12)" : "var(--color-surface-secondary)",
                            color: disabled ? "var(--color-primary)" : "var(--color-text)",
                            transition: "background 0.15s ease, border-color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (disabled) return;
                            e.currentTarget.style.borderColor = "#f8c8a9";
                          }}
                          onMouseLeave={(e) => {
                            if (disabled) return;
                            e.currentTarget.style.borderColor = "";
                            e.currentTarget.style.border = "1px solid var(--color-border)";
                          }}
                        >
                          <Sparkles size={14} strokeWidth={2} style={{ flexShrink: 0, color: "var(--color-primary)" }} aria-hidden />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="system-persona-custom-brief"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Or describe your own style
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
                  <input
                    id="system-persona-custom-brief"
                    type="text"
                    className="input"
                    value={systemPersonaCustomBrief}
                    onChange={(e) => setSystemPersonaCustomBrief(e.target.value)}
                    onKeyDown={(e) => {
                      const t = (e.currentTarget as HTMLInputElement).value.trim();
                      if (
                        e.key === "Enter" &&
                        t &&
                        !systemPersonaGenerating &&
                        !systemPersonaFetchLoading
                      ) {
                        e.preventDefault();
                        void generateCallSystemPersonaWithBrief(systemPersonaCustomBrief);
                      }
                    }}
                    disabled={systemPersonaGenerating || systemPersonaFetchLoading}
                    placeholder="e.g. calm doctor tone, UK English, short sentences"
                    style={{
                      flex: "1 1 220px",
                      minWidth: 0,
                      fontSize: 14,
                      padding: "10px 14px",
                      minHeight: 42,
                      borderRadius: 10,
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      systemPersonaGenerating ||
                      systemPersonaFetchLoading ||
                      !systemPersonaCustomBrief.trim()
                    }
                    onClick={() => void generateCallSystemPersonaWithBrief(systemPersonaCustomBrief)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      flexShrink: 0,
                      padding: "0 18px",
                      minHeight: 42,
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 10,
                      ...(systemPersonaGenerating ||
                      systemPersonaFetchLoading ||
                      !systemPersonaCustomBrief.trim()
                        ? DISABLED_PRIMARY_TINT_STYLE
                        : {}),
                    }}
                  >
                    <Sparkles size={16} strokeWidth={2} aria-hidden />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="call-opening-panel">
            <div className="call-opening-panel-inner" style={{ paddingBottom: 16 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
                  System instructions
                </div>
                <p className="text-hint" style={{ margin: 0, fontSize: 12, lineHeight: 1.45, maxWidth: 640 }}>
                  Cover objections, tone, what to avoid, and how to close or hand off. Saved with your campaign and sent to
                  your voice agent when you continue or launch.
                </p>
              </div>

              <div className="call-opening-editor-shell" style={{ minHeight: 260 }}>
                {systemPersonaFetchLoading ? (
                  <div className="call-opening-loader-overlay" role="status" aria-live="polite" aria-busy="true">
                    <Icons.Loader size={28} style={{ animation: "spin 1s linear infinite", color: WIZ_ACCENT }} />
                    <span>Loading your saved assistant style…</span>
                  </div>
                ) : null}
                <label htmlFor="system-persona-textarea" className="sr-only">
                  System instructions for the call assistant
                </label>
                <textarea
                  id="system-persona-textarea"
                  className="call-opening-textarea persona-behavior-textarea"
                  value={systemPersona}
                  disabled={systemPersonaFetchLoading}
                  onChange={(e) => setSystemPersona(e.target.value)}
                  placeholder={`You are a professional sales representative from {{sender_company}}. Your goals:

- Build rapport and understand the prospect's needs
- Explain {{product_service}} and its benefits clearly
- Handle objections professionally
- Aim for appropriate next steps (for example, {{call_to_action}})
- Stay polite, knowledgeable, and solution-focused

Use placeholders only from supported fields:
{{first_name}}, {{last_name}}, {{full_name}}, {{company_name}}, {{role}}, {{industry}}, {{region}}, {{sender_name}}, {{sender_company}}, {{product_service}}, {{value_proposition}}, {{call_to_action}}.`}
                />
                <div className="call-opening-meta">
                  {systemPersona.length.toLocaleString()} chars · {countWordsForCallOpening(systemPersona).toLocaleString()}{" "}
                  words
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule step - rendered based on stepType */}
      {currentStepInfo?.stepType === "schedule" &&
        (channels.includes("email") ||
          channels.includes("linkedin") ||
          channels.includes("whatsapp") ||
          channels.includes("call")) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>
                Timing and sending limits
              </h3>
              <p className="text-hint" style={{ marginTop: 0, marginBottom: 0 }}>
                Choose when the campaign runs and daily limits per channel.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 40,
                alignItems: "flex-start",
              }}
            >
              {/* Timing */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  flex: "1 1 340px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                  }}
                >
                  Timing
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                    When to start
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        checked={!!schedule.launch_now}
                        onChange={() => setSchedule({ ...schedule, launch_now: true, start: "" })}
                      />
                      Launch immediately
                    </label>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        checked={!schedule.launch_now}
                        onChange={() => setSchedule({ ...schedule, launch_now: false })}
                      />
                      Schedule for later
                    </label>
                  </div>
                </div>

                {!schedule.launch_now && (
                  <div>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--color-text)",
                      }}
                    >
                      <Calendar size={16} strokeWidth={2} style={{ opacity: 0.85, flexShrink: 0 }} />
                      Start date & time
                    </label>
                    <input
                      className="input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      type="datetime-local"
                      value={schedule.start}
                      onChange={(e) => setSchedule({ ...schedule, start: e.target.value })}
                      required={!schedule.launch_now}
                    />
                  </div>
                )}

                {schedule.launch_now && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      alignSelf: "flex-start",
                      borderRadius: 9999,
                      padding: "6px 14px",
                      fontSize: 14,
                      fontWeight: 500,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                    }}
                  >
                    <Check size={16} strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden />
                    Starts as soon as launched
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--color-text)",
                    }}
                  >
                    <Calendar size={16} strokeWidth={2} style={{ opacity: 0.85, flexShrink: 0 }} />
                    End date & time
                  </label>
                  <input
                    className="input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    type="datetime-local"
                    value={schedule.end}
                    onChange={(e) => setSchedule({ ...schedule, end: e.target.value })}
                    min={scheduleLaunchImmediate ? undefined : schedule.start || undefined}
                    required
                  />
                  {schedule.start && schedule.end && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {new Date(schedule.end) <= new Date(schedule.start) ? (
                        <>
                          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, color: "#ef4444" }} />
                          <span style={{ color: "#dc2626" }}>End date must be after start date</span>
                        </>
                      ) : scheduleDurationLabelScheduled ? (
                        <>
                          <Clock size={14} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
                          <span>Campaign duration: {scheduleDurationLabelScheduled}</span>
                        </>
                      ) : null}
                    </div>
                  )}
                  {scheduleLaunchImmediate && schedule.end && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {new Date(schedule.end) <= new Date() ? (
                        <>
                          <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, color: "#ef4444" }} />
                          <span style={{ color: "#dc2626" }}>End date must be in the future</span>
                        </>
                      ) : scheduleDurationLabelImmediate ? (
                        <>
                          <Clock size={14} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
                          <span>Campaign duration: {scheduleDurationLabelImmediate}</span>
                        </>
                      ) : null}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Clock size={14} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
                    Stops sending after this date and time
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#9ca3af",
                    }}
                    htmlFor="campaign-schedule-timezone"
                  >
                    Timezone
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="campaign-schedule-timezone"
                      className="input"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        appearance: "none",
                        WebkitAppearance: "none",
                        paddingRight: 36,
                      }}
                      value={schedule.timezone || "Asia/Karachi"}
                      onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
                    >
                      {SCHEDULE_TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.id} value={tz.id}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      style={{
                        pointerEvents: "none",
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        opacity: 0.45,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Daily limits */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  flex: "1 1 340px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                  }}
                >
                  Daily limits
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {channels.includes("email") && (
                    <WizardScheduleThrottleRow
                      Icon={Icons.Mail}
                      iconStyle={{ color: WIZ_CHANNEL_EMAIL }}
                      label="Email/day"
                      max={emailThrottleMax}
                      stored={Math.min(emailThrottleMax, schedule.email?.throttle ?? emailThrottleMax)}
                      draft={scheduleThrottleDraft.email}
                      onDraftChange={(v) =>
                        setScheduleThrottleDraft((prev) => ({ ...prev, email: v }))
                      }
                      onSliderCommit={(n) =>
                        setSchedule({
                          ...schedule,
                          email: { throttle: Math.min(emailThrottleMax, Math.max(1, n)) },
                        })
                      }
                      onBlurClamp={() => {
                        const d = scheduleThrottleDraft.email;
                        const cur = Math.min(
                          emailThrottleMax,
                          schedule.email?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX
                        );
                        let n = cur;
                        if (d !== undefined && d !== "") {
                          const p = Number.parseInt(d, 10);
                          n = Number.isNaN(p) ? cur : p;
                        }
                        const clamped = Math.min(emailThrottleMax, Math.max(1, n));
                        setSchedule({ ...schedule, email: { throttle: clamped } });
                        setScheduleThrottleDraft((prev) => ({ ...prev, email: undefined }));
                      }}
                    />
                  )}

                  {channels.includes("linkedin") && (
                    <>
                      <WizardScheduleThrottleRow
                        Icon={Icons.Linkedin}
                        iconStyle={{ color: WIZ_CHANNEL_LINKEDIN }}
                        label="LinkedIn/day"
                        max={linkedinSliderMax}
                        stored={Math.min(
                          linkedinSliderMax,
                          schedule.linkedin?.throttle ?? linkedinSliderMax
                        )}
                        draft={scheduleThrottleDraft.linkedin}
                        onDraftChange={(v) =>
                          setScheduleThrottleDraft((prev) => ({ ...prev, linkedin: v }))
                        }
                        onSliderCommit={(n) =>
                          setSchedule({
                            ...schedule,
                            linkedin: {
                              throttle: Math.min(linkedinSliderMax, Math.max(1, n)),
                            },
                          })
                        }
                        onBlurClamp={() => {
                          const d = scheduleThrottleDraft.linkedin;
                          const cur = Math.min(
                            linkedinSliderMax,
                            schedule.linkedin?.throttle ?? linkedinSliderMax
                          );
                          let n = cur;
                          if (d !== undefined && d !== "") {
                            const p = Number.parseInt(d, 10);
                            n = Number.isNaN(p) ? cur : p;
                          }
                          const clamped = Math.min(linkedinSliderMax, Math.max(1, n));
                          setSchedule({ ...schedule, linkedin: { throttle: clamped } });
                          setScheduleThrottleDraft((prev) => ({ ...prev, linkedin: undefined }));
                        }}
                      />
                      {linkedInMonthlyLimit !== null && (
                        <div
                          style={{
                            borderRadius: 8,
                            border: "1px solid rgba(255, 167, 38, 0.25)",
                            padding: 12,
                            fontSize: 11,
                            lineHeight: 1.55,
                            background: "rgba(255, 167, 38, 0.1)",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontWeight: 600,
                              color: "#b45309",
                            }}
                          >
                            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                            Monthly limit: {linkedInMonthlyLimit}
                            {linkedInStepConfig?.action === "invitation_with_message"
                              ? " invitations with message"
                              : " invitations"}
                          </div>
                          <p style={{ margin: 0 }}>
                            {linkedInStepConfig?.action === "invitation_with_message"
                              ? `Free accounts can send up to ${linkedInMonthlyLimit} connection invitations per month with a personalized message.`
                              : `Free accounts can send up to ${linkedInMonthlyLimit} connection invitations per month without a message.`}
                          </p>
                          <p style={{ margin: "10px 0 0" }}>
                            <strong style={{ color: "var(--color-text)" }}>Campaign capacity:</strong> With{" "}
                            {campaignWindowHumanForCopy ?? "your campaign window"}, you can reach up to{" "}
                            {Math.min(totalLeads, linkedInMonthlyLimit)} of {totalLeads} lead
                            {totalLeads !== 1 ? "s" : ""} (max {linkedInMonthlyLimit} / month).
                          </p>
                          {totalLeads > linkedInMonthlyLimit && (
                            <p
                              style={{
                                margin: "10px 0 0",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "rgba(239, 68, 68, 0.08)",
                                padding: 8,
                                color: "#dc2626",
                                fontSize: 11,
                              }}
                            >
                              <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                              <span>
                                You have {totalLeads} leads but only {linkedInMonthlyLimit} invitations per
                                month. Consider fewer leads or a longer window.
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {channels.includes("whatsapp") && (
                    <WizardScheduleThrottleRow
                      Icon={Icons.WhatsApp}
                      iconStyle={{ color: WIZ_CHANNEL_WHATSAPP }}
                      label="WhatsApp/day"
                      max={whatsappThrottleMax}
                      stored={Math.min(
                        whatsappThrottleMax,
                        schedule.whatsapp?.throttle ?? whatsappThrottleMax
                      )}
                      draft={scheduleThrottleDraft.whatsapp}
                      onDraftChange={(v) =>
                        setScheduleThrottleDraft((prev) => ({ ...prev, whatsapp: v }))
                      }
                      onSliderCommit={(n) =>
                        setSchedule({
                          ...schedule,
                          whatsapp: {
                            throttle: Math.min(whatsappThrottleMax, Math.max(1, n)),
                          },
                        })
                      }
                      onBlurClamp={() => {
                        const d = scheduleThrottleDraft.whatsapp;
                        const cur = Math.min(
                          whatsappThrottleMax,
                          schedule.whatsapp?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX
                        );
                        let n = cur;
                        if (d !== undefined && d !== "") {
                          const p = Number.parseInt(d, 10);
                          n = Number.isNaN(p) ? cur : p;
                        }
                        const clamped = Math.min(whatsappThrottleMax, Math.max(1, n));
                        setSchedule({ ...schedule, whatsapp: { throttle: clamped } });
                        setScheduleThrottleDraft((prev) => ({ ...prev, whatsapp: undefined }));
                      }}
                    />
                  )}

                  {channels.includes("call") && (
                    <WizardScheduleThrottleRow
                      Icon={Icons.Phone}
                      iconStyle={{ color: WIZ_CHANNEL_CALL }}
                      label="Calls/day"
                      max={callThrottleMax}
                      stored={Math.min(callThrottleMax, schedule.call?.throttle ?? callThrottleMax)}
                      draft={scheduleThrottleDraft.call}
                      onDraftChange={(v) =>
                        setScheduleThrottleDraft((prev) => ({ ...prev, call: v }))
                      }
                      onSliderCommit={(n) =>
                        setSchedule({
                          ...schedule,
                          call: { throttle: Math.min(callThrottleMax, Math.max(1, n)) },
                        })
                      }
                      onBlurClamp={() => {
                        const d = scheduleThrottleDraft.call;
                        const cur = Math.min(
                          callThrottleMax,
                          schedule.call?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX
                        );
                        let n = cur;
                        if (d !== undefined && d !== "") {
                          const p = Number.parseInt(d, 10);
                          n = Number.isNaN(p) ? cur : p;
                        }
                        const clamped = Math.min(callThrottleMax, Math.max(1, n));
                        setSchedule({ ...schedule, call: { throttle: clamped } });
                        setScheduleThrottleDraft((prev) => ({ ...prev, call: undefined }));
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {channels.includes("email") && (schedule.followups || 0) > 0 && (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  gap: 16,
                  borderTop: "1px solid var(--color-border)",
                  paddingTop: 24,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--color-text)",
                  }}
                >
                  <Clock size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.9 }} />
                  Follow-up delay (days between emails)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      padding: 4,
                      background: "var(--color-surface-secondary)",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        display: "inline-flex",
                        width: 36,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text)",
                        cursor: (schedule.followupDelay || 3) <= 1 ? "not-allowed" : "pointer",
                        opacity: (schedule.followupDelay || 3) <= 1 ? 0.4 : 1,
                      }}
                      aria-label="Decrease follow-up delay"
                      disabled={(schedule.followupDelay || 3) <= 1}
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          followupDelay: Math.max(1, (schedule.followupDelay || 3) - 1),
                        })
                      }
                    >
                      <Minus size={16} strokeWidth={2} />
                    </button>
                    <span
                      style={{
                        minWidth: 36,
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--color-text)",
                      }}
                    >
                      {schedule.followupDelay || 3}
                    </span>
                    <button
                      type="button"
                      style={{
                        display: "inline-flex",
                        width: 36,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text)",
                        cursor: (schedule.followupDelay || 3) >= 30 ? "not-allowed" : "pointer",
                        opacity: (schedule.followupDelay || 3) >= 30 ? 0.4 : 1,
                      }}
                      aria-label="Increase follow-up delay"
                      disabled={(schedule.followupDelay || 3) >= 30}
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          followupDelay: Math.min(30, (schedule.followupDelay || 3) + 1),
                        })
                      }
                    >
                      <Plus size={16} strokeWidth={2} />
                    </button>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    1–30 days between each follow-up (default 3)
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  {Array.from({ length: schedule.followups + 1 }, (_, i) => {
                    const delayDays = schedule.followupDelay || 3;
                    const day = i * delayDays;
                    return (
                      <span key={`fu-${i}-${day}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i > 0 && (
                          <ArrowRight
                            size={16}
                            strokeWidth={2}
                            aria-hidden
                            style={{ flexShrink: 0, opacity: 0.35 }}
                          />
                        )}
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 9999,
                            border: "1px solid var(--color-border)",
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 500,
                            background: "var(--color-surface-secondary)",
                            color: "var(--color-text)",
                          }}
                        >
                          <Icons.Mail
                            size={14}
                            strokeWidth={1.75}
                            style={{ opacity: 0.9, color: WIZ_CHANNEL_EMAIL }}
                            aria-hidden
                          />
                          Day {day}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Review Step - rendered based on stepType */}
      {currentStepInfo?.stepType === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {totalLeads === 0 && !loadingLeads ? (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                borderRadius: 8,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                padding: 12,
                fontSize: 13,
                lineHeight: 1.5,
                color: "#92400e",
              }}
            >
              <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2, color: "#d97706" }} aria-hidden />
              <span>
                No leads selected — go back to Step 3 to add leads before launching.{" "}
                <button
                  type="button"
                  onClick={() => void goToWizardStepByType("core_details_part2")}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                    fontWeight: 600,
                    textDecoration: "underline",
                    fontSize: "inherit",
                  }}
                >
                  Go back
                </button>
              </span>
            </div>
          ) : null}

          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Review your campaign</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 0 }}>
              One last look at every channel you turned on, then continue to launch.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            {/* Left column */}
            <div
              style={{
                flex: "1 1 320px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Campaign Overview */}
              <div
                style={{
                  background: "var(--color-surface-secondary)",
                  borderRadius: 12,
                  padding: 20,
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Rocket size={20} strokeWidth={2} aria-hidden style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaign Overview</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => void goToWizardStepByType("basic_setup")}
                    style={{
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <ReviewCardEditLabel />
                  </button>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>Campaign Name</div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{name || "Untitled Campaign"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>Channels</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {channels.map((channel) => {
                        const ch = channel as ChannelType;
                        return (
                          <span
                            key={ch}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              borderRadius: 9999,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              background: "transparent",
                              color: "var(--color-text)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            <ReviewChannelGlyph channel={ch} size={14} />
                            {CHANNEL_CONFIGS[ch]?.label || ch}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>Unique leads</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{totalLeads}</div>
                  </div>
                  {selectedLeadsForSamples.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                        {explicitCampaignTargetLeadIds != null && explicitCampaignTargetLeadIds.length > 0
                          ? "Selected recipients"
                          : "Recipients (from segments)"}
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          fontSize: 14,
                          lineHeight: 1.45,
                          color: "var(--color-text)",
                        }}
                      >
                        {selectedLeadsForSamples.slice(0, 20).map((l) => {
                          const nm = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
                          const label = nm || l.email || `Lead #${l.id}`;
                          const co = (l as { company_name?: string; company?: string }).company_name || (l as { company?: string }).company;
                          return (
                            <li key={l.id} style={{ marginBottom: 4 }}>
                              {label}
                              {co ? (
                                <span style={{ color: "var(--color-text-muted)" }}> · {co}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      {selectedLeadsForSamples.length > 20 ? (
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                          +{selectedLeadsForSamples.length - 20} more
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Schedule & Settings */}
              <div
                style={{
                  background: "var(--color-surface-secondary)",
                  borderRadius: 12,
                  padding: 20,
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Rocket size={20} strokeWidth={2} aria-hidden style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{"Schedule & Settings"}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => void goToWizardStepByType("schedule")}
                    style={{
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <ReviewCardEditLabel />
                  </button>
                </div>
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>Start Date</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {scheduleLaunchImmediate
                          ? "Immediately on launch"
                          : schedule.start
                            ? new Date(schedule.start).toLocaleString()
                            : "Not scheduled"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>End Date</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {schedule.end ? new Date(schedule.end).toLocaleString() : "Not scheduled"}
                      </div>
                    </div>
                  </div>
                  {scheduleTiming.hasScheduleWindow && campaignWindowHumanForCopy ? (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>Campaign Duration</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{campaignWindowHumanForCopy}</div>
                    </div>
                  ) : null}
                  <div style={{ display: "grid", gap: 12 }}>
                    {channels.includes("email") ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <ReviewChannelGlyph channel="email" size={16} />
                          <span style={{ fontSize: 13 }}>Email Throttle</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            textAlign: "right",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {schedule.email?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} emails/day
                          </span>
                          {reviewThrottleInvalid.emailBad ? (
                            <span style={{ fontSize: 12, color: "#ef4444" }}>
                              ⚠ exceeds max ({SCHEDULE_DAILY_LIMIT_MAX})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {channels.includes("linkedin") ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <ReviewChannelGlyph channel="linkedin" size={16} />
                          <span style={{ fontSize: 13 }}>LinkedIn Throttle</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            textAlign: "right",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {schedule.linkedin?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} invitations/day
                          </span>
                          {reviewThrottleInvalid.liBad ? (
                            <span style={{ fontSize: 12, color: "#ef4444" }}>
                              ⚠ exceeds max ({SCHEDULE_DAILY_LIMIT_MAX})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {channels.includes("whatsapp") ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <ReviewChannelGlyph channel="whatsapp" size={16} />
                          <span style={{ fontSize: 13 }}>WhatsApp Throttle</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            textAlign: "right",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {schedule.whatsapp?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} / day
                          </span>
                          {reviewThrottleInvalid.waBad ? (
                            <span style={{ fontSize: 12, color: "#ef4444" }}>
                              ⚠ exceeds max ({SCHEDULE_DAILY_LIMIT_MAX})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {channels.includes("call") ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <ReviewChannelGlyph channel="call" size={16} />
                          <span style={{ fontSize: 13 }}>Calls/day</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            textAlign: "right",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {schedule.call?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX}
                          </span>
                          {reviewThrottleInvalid.callBad ? (
                            <span style={{ fontSize: 12, color: "#ef4444" }}>
                              ⚠ exceeds max ({SCHEDULE_DAILY_LIMIT_MAX})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div
              style={{
                flex: "1 1 320px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {channels.includes("email") ? (
                <div
                  style={{
                    background: "var(--color-surface-secondary)",
                    borderRadius: 12,
                    padding: 20,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Icons.Mail size={20} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Email Configuration</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void goToWizardStepByType("email_templates")}
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <ReviewCardEditLabel />
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {senderName ? (
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>Sender: </span>
                        {senderName}
                        {senderCompany ? ` at ${senderCompany}` : ""}
                      </div>
                    ) : null}
                    {messages && messages.length > 0 && selectedMessageIndices.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {selectedMessageIndices.map((msgIdx, order) => {
                          const raw = messages[msgIdx];
                          if (!raw) return null;
                          const { subject, body } = parseMessage(raw);
                          const label =
                            order === 0
                              ? "Initial email"
                              : `Follow-up ${order}`;
                          return (
                            <div
                              key={`review-email-${msgIdx}-${order}`}
                              style={{
                                borderRadius: 8,
                                border: "1px solid var(--color-border)",
                                padding: 12,
                                background: "var(--color-surface)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  marginBottom: 8,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "var(--color-text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.02em",
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                  }}
                                >
                                  {label}
                                </div>
                                <button
                                  type="button"
                                  aria-label={`View full ${label}`}
                                  title="View full template"
                                  onClick={() =>
                                    setReviewChannelPreview({
                                      kind: "email",
                                      title: label,
                                      subject: subject || "",
                                      body: body || "",
                                    })
                                  }
                                  style={{
                                    flexShrink: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 6,
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 8,
                                    background: "var(--color-surface-secondary)",
                                    cursor: "pointer",
                                    color: "var(--color-text-muted)",
                                  }}
                                >
                                  <Icons.Eye size={14} aria-hidden />
                                </button>
                              </div>
                              {subject ? (
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    lineHeight: 1.45,
                                    marginBottom: body ? 8 : 0,
                                  }}
                                >
                                  {subject}
                                </div>
                              ) : null}
                              {body ? (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "var(--color-text-muted)",
                                    lineHeight: 1.55,
                                  }}
                                >
                                  {reviewFirstWords(body, 10)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No draft selected yet.</div>
                    )}
                  </div>
                </div>
              ) : null}

              {channels.includes("linkedin") && linkedInStepConfig ? (
                <div
                  style={{
                    background: "var(--color-surface-secondary)",
                    borderRadius: 12,
                    padding: 20,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Icons.Linkedin size={20} style={{ color: "#0077b5", flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>LinkedIn Configuration</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void goToWizardStepByType("linkedin_message_type")}
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <ReviewCardEditLabel />
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {linkedInStepConfig.action === "invitation_only"
                        ? "Send invitation only (no message)"
                        : "Send invitation with message"}
                    </div>
                    {linkedInStepConfig.action === "invitation_with_message" && linkedInStepConfig.message ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            flex: "1 1 auto",
                            minWidth: 0,
                            fontSize: 13,
                            color: "var(--color-text-muted)",
                            lineHeight: 1.5,
                            maxHeight: "4.5em",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {linkedInStepConfig.message}
                        </div>
                        <button
                          type="button"
                          aria-label="View full connection message"
                          title="View full message"
                          onClick={() =>
                            setReviewChannelPreview({
                              kind: "linkedin",
                              title: "LinkedIn connection message",
                              text: linkedInStepConfig.message || "",
                            })
                          }
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 6,
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            background: "var(--color-surface)",
                            cursor: "pointer",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          <Icons.Eye size={14} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {channels.includes("whatsapp") &&
              whatsAppMessages &&
              whatsAppMessages.length > 0 &&
              selectedWhatsAppMessageIndices.length > 0 ? (
                <div
                  style={{
                    background: "var(--color-surface-secondary)",
                    borderRadius: 12,
                    padding: 20,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Icons.WhatsApp size={20} style={{ color: WIZ_CHANNEL_WHATSAPP, flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>WhatsApp Configuration</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void goToWizardStepByType("whatsapp_templates")}
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <ReviewCardEditLabel />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedWhatsAppMessageIndices.map((widx, order) => {
                      const msg = widx != null ? whatsAppMessages[widx] : "";
                      const t = (msg || "").trim();
                      const label =
                        selectedWhatsAppMessageIndices.length > 1
                          ? `Message ${order + 1}`
                          : "Message";
                      return (
                        <div
                          key={`review-wa-${widx}-${order}`}
                          style={{
                            borderRadius: 8,
                            border: "1px solid var(--color-border)",
                            padding: 12,
                            background: "var(--color-surface)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 8,
                              marginBottom: selectedWhatsAppMessageIndices.length > 1 ? 8 : 0,
                            }}
                          >
                            {selectedWhatsAppMessageIndices.length > 1 ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--color-text-muted)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.02em",
                                  flex: "1 1 auto",
                                  minWidth: 0,
                                }}
                              >
                                {label}
                              </div>
                            ) : (
                              <span style={{ flex: 1 }} />
                            )}
                            <button
                              type="button"
                              aria-label={`View full ${label}`}
                              title="View full message"
                              onClick={() =>
                                setReviewChannelPreview({
                                  kind: "whatsapp",
                                  title: label,
                                  text: t || "",
                                })
                              }
                              style={{
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 6,
                                border: "1px solid var(--color-border)",
                                borderRadius: 8,
                                background: "var(--color-surface-secondary)",
                                cursor: "pointer",
                                color: "var(--color-text-muted)",
                              }}
                            >
                              <Icons.Eye size={14} aria-hidden />
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--color-text)",
                              lineHeight: 1.55,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {t
                              ? t.length > 160
                                ? `${t.slice(0, 160)}…`
                                : t
                              : "No message selected."}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {channels.includes("call") ? (
                <div
                  style={{
                    background: "var(--color-surface-secondary)",
                    borderRadius: 12,
                    padding: 20,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Icons.Phone size={20} style={{ color: "#0d9488", flexShrink: 0 }} />
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Call Configuration</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void goToWizardStepByType("call_knowledge_base")}
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <ReviewCardEditLabel />
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 10,
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          Voice
                        </div>
                        <div style={{ fontWeight: 600, color: "var(--color-text)", lineHeight: 1.4 }}>
                          {availableVoices.find((v) => v.id === selectedVoiceId)?.name ||
                            (selectedVoiceId ? selectedVoiceId : "—")}
                        </div>
                      </div>
                      {selectedVoiceId ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => void toggleVoicePreview(selectedVoiceId)}
                          disabled={!!previewLoadingVoiceId}
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {previewLoadingVoiceId === selectedVoiceId ? (
                            <>
                              <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                              Loading…
                            </>
                          ) : (
                            <>
                              {previewingVoiceId === selectedVoiceId ? (
                                <Pause size={14} strokeWidth={2} aria-hidden fill="currentColor" />
                              ) : (
                                <Play size={14} strokeWidth={2} aria-hidden fill="currentColor" style={{ marginLeft: 1 }} />
                              )}
                              {previewingVoiceId === selectedVoiceId ? "Pause preview" : "Preview voice"}
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#9ca3af",
                          marginBottom: 6,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Knowledge base
                      </div>
                      {knowledgeBaseFiles.length === 0 ? (
                        <span style={{ color: "var(--color-text-muted)" }}>No file attached yet.</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {knowledgeBaseFiles.map((f) => (
                            <div
                              key={f.id}
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--color-border)",
                                background: "var(--color-surface)",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: "var(--color-text)",
                                  fontSize: 13,
                                  overflowWrap: "anywhere",
                                  minWidth: 0,
                                  flex: "1 1 160px",
                                }}
                              >
                                {f.name}
                              </span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0, alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  aria-label="View knowledge base PDF"
                                  title="View PDF"
                                  disabled={reviewKbLoading?.fileId === f.id}
                                  onClick={() => {
                                    setReviewKbLoading({ fileId: f.id, action: "view" });
                                    void fetchKbPdfBlob(f.id, false)
                                      .catch((err) => {
                                        showError("Knowledge base", (err as Error)?.message || "Could not open file");
                                      })
                                      .finally(() => setReviewKbLoading(null));
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 34,
                                    height: 34,
                                    padding: 0,
                                    borderRadius: 8,
                                    border: "1px solid var(--color-border)",
                                    color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                                  }}
                                >
                                  {reviewKbLoading?.fileId === f.id && reviewKbLoading?.action === "view" ? (
                                    <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                                  ) : (
                                    <Icons.Eye size={14} aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  aria-label="Download knowledge base PDF"
                                  title="Download PDF"
                                  disabled={reviewKbLoading?.fileId === f.id}
                                  onClick={() => {
                                    setReviewKbLoading({ fileId: f.id, action: "download" });
                                    void fetchKbPdfBlob(f.id, true)
                                      .catch((err) => {
                                        showError("Knowledge base", (err as Error)?.message || "Could not download");
                                      })
                                      .finally(() => setReviewKbLoading(null));
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 34,
                                    height: 34,
                                    padding: 0,
                                    borderRadius: 8,
                                    border: "1px solid var(--color-border)",
                                    color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                                  }}
                                >
                                  {reviewKbLoading?.fileId === f.id && reviewKbLoading?.action === "download" ? (
                                    <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                                  ) : (
                                    <Icons.Download size={14} aria-hidden />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Safety & Automation — full width */}
          <div
            style={{
              background: "#ecfdf5",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <ShieldCheck size={18} strokeWidth={2} style={{ color: "#16a34a", marginTop: 2, flexShrink: 0 }} aria-hidden />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#15803d" }}>{"You're protected"}</div>
                <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                  Your campaign will automatically respect rate limits, quiet hours, and stop sending when recipients reply.
                  The campaign will complete when all leads receive messages on all selected channels.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentStepInfo?.stepType === "launch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {totalLeads === 0 && !loadingLeads ? (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                borderRadius: 8,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                padding: 12,
                fontSize: 13,
                lineHeight: 1.5,
                color: "#92400e",
              }}
            >
              <AlertTriangle size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2, color: "#d97706" }} aria-hidden />
              <span>
                No leads selected — go back to Step 3 to add leads before launching.{" "}
                <button
                  type="button"
                  onClick={() => void goToWizardStepByType("core_details_part2")}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "color-mix(in srgb, var(--color-primary) 88%, #000000)",
                    fontWeight: 600,
                    textDecoration: "underline",
                    fontSize: "inherit",
                  }}
                >
                  Go back
                </button>
              </span>
            </div>
          ) : null}

          <div>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Launch</h3>
            <p className="text-hint" style={{ marginTop: 0, marginBottom: 0 }}>
              Place a test call on the left if you use AI calls, then launch when you are ready.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              {channels.includes("call") && draftCampaignId ? (
                <div
                  style={{
                    padding: 20,
                    background: "var(--color-surface)",
                    borderRadius: 12,
                    border: "1px solid var(--elev-border)",
                    height: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: 0, marginBottom: 4, fontSize: 16, fontWeight: 600 }}>Test call</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                      Call one number to hear your assistant before the campaign runs to all leads.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {testCallSuccess && (
                      <div
                        style={{
                          padding: 16,
                          background: "rgba(34, 197, 94, 0.1)",
                          borderRadius: 8,
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Icons.Check size={20} style={{ color: "#22c55e" }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>
                            Test call initiated successfully!
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                          The call has been placed. You can launch when ready, or place another test call.
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                          Phone number *
                        </label>
                        <input
                          className="input"
                          type="tel"
                          placeholder="+1234567890"
                          value={testCallPhoneNumber}
                          onChange={(e) => setTestCallPhoneNumber(e.target.value)}
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                          First name (optional)
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="John"
                          value={testCallFirstName}
                          onChange={(e) => setTestCallFirstName(e.target.value)}
                          style={{ width: "100%" }}
                        />
                      </div>
                      {testCallError && (
                        <div
                          style={{
                            padding: 12,
                            background: "rgba(239, 68, 68, 0.1)",
                            borderRadius: 8,
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            fontSize: 13,
                            color: "#ef4444",
                          }}
                        >
                          {testCallError}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={async () => {
                          if (!testCallPhoneNumber.trim()) {
                            setTestCallError("Phone number is required");
                            return;
                          }
                          setTestingCall(true);
                          setTestCallError(null);
                          try {
                            await apiRequest(`/campaigns/${draftCampaignId}/test-call`, {
                              method: "POST",
                              body: JSON.stringify({
                                phoneNumber: testCallPhoneNumber.trim(),
                                firstName: testCallFirstName.trim() || undefined,
                              }),
                            });
                            setTestCallSuccess(true);
                            setTestCallError(null);
                          } catch (error: any) {
                            setTestCallError(error?.message || "Failed to initiate test call. Please try again.");
                            setTestCallSuccess(false);
                          } finally {
                            setTestingCall(false);
                          }
                        }}
                        disabled={testingCall || !testCallPhoneNumber.trim()}
                        style={{
                          padding: "12px 24px",
                          fontSize: 14,
                          fontWeight: 600,
                          borderRadius: 10,
                          background: "var(--color-primary)",
                          color: "#fff",
                          border: "1px solid var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 44,
                          opacity: testingCall || !testCallPhoneNumber.trim() ? 0.72 : 1,
                          cursor: testingCall || !testCallPhoneNumber.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        {testingCall ? (
                          <>
                            <Icons.Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                            Testing…
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
              ) : channels.includes("call") && !draftCampaignId ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: "1px dashed var(--color-border)",
                    background: "var(--color-surface-secondary)",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Saving your campaign… Once the draft is ready, you can place a test call here.
                </div>
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-secondary)",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  Test call is only available when the <strong>Call</strong> channel is enabled. Your campaign uses other
                  channels only.
                </div>
              )}
            </div>

            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: 22,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icons.Rocket size={20} style={{ color: "#fff" }} aria-hidden />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.25 }}>
                    {name?.trim() || "Untitled Campaign"}
                  </div>
                  <div className="text-hint" style={{ fontSize: 13, marginTop: 2 }}>
                    {totalLeads} unique lead{totalLeads !== 1 ? "s" : ""}
                    {scheduleTiming.hasScheduleWindow && campaignWindowHumanForCopy
                      ? ` · ${campaignWindowHumanForCopy} window`
                      : null}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {channels.map((channel) => {
                  const ch = channel as ChannelType;
                  return (
                    <span
                      key={ch}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 9999,
                        padding: "4px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        background: "transparent",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <ReviewChannelGlyph channel={ch} size={14} />
                      {CHANNEL_CONFIGS[ch]?.label || ch}
                    </span>
                  );
                })}
              </div>

              <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.55 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Audience
                </div>
                {explicitCampaignTargetLeadIds != null && explicitCampaignTargetLeadIds.length > 0 ? (
                  <div>Hand-picked leads ({explicitCampaignTargetLeadIds.length} selected)</div>
                ) : segments.length > 0 ? (
                  <div style={{ overflowWrap: "anywhere" }}>
                    Segments: {segments.join(", ")}
                  </div>
                ) : (
                  <div className="text-hint">No audience — go back to the review step if this looks wrong.</div>
                )}
              </div>

              <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.55 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Daily limits (max {SCHEDULE_DAILY_LIMIT_MAX}/day per channel)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {channels.includes("email") ? (
                    <div>
                      <strong>Email:</strong> {schedule.email?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} / day
                    </div>
                  ) : null}
                  {channels.includes("linkedin") ? (
                    <div>
                      <strong>LinkedIn:</strong> {schedule.linkedin?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} / day
                    </div>
                  ) : null}
                  {channels.includes("whatsapp") ? (
                    <div>
                      <strong>WhatsApp:</strong> {schedule.whatsapp?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} / day
                    </div>
                  ) : null}
                  {channels.includes("call") ? (
                    <div>
                      <strong>Calls:</strong> {schedule.call?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX} / day
                    </div>
                  ) : null}
                </div>
              </div>

              {channels.includes("call") ? (
                <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.55 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Call assistant
                  </div>
                  <div>
                    <strong>Voice:</strong>{" "}
                    {availableVoices.find((v) => v.id === selectedVoiceId)?.name ||
                      (selectedVoiceId ? selectedVoiceId : "—")}
                  </div>
                  {initialPrompt.trim() ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Opening line</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-muted)",
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {initialPrompt.trim().length > 160
                          ? `${initialPrompt.trim().slice(0, 160)}…`
                          : initialPrompt.trim()}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.55 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                  Schedule
                </div>
                <div>
                  <strong>Start:</strong>{" "}
                  {schedule.launch_now
                    ? "Immediately on launch"
                    : schedule.start
                      ? new Date(schedule.start).toLocaleString()
                      : "Not set"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>End:</strong> {schedule.end ? new Date(schedule.end).toLocaleString() : "Not set"}
                </div>
                {schedule.timezone?.trim() ? (
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
                    Timezone: {schedule.timezone.trim()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: "1px solid var(--elev-border)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {isCallVoiceStep && availableVoices.length > 0 ? (
            <div
              className="rounded-lg bg-orange-50 p-3 text-sm"
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                lineHeight: 1.45,
                color: "var(--color-primary)",
              }}
            >
              <Icons.Info size={14} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }} />
              <span>
                Select a voice to continue. Use Preview to hear it first.
              </span>
            </div>
          ) : null}
          {currentStepInfo?.stepType === "launch" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(108px, auto) 1fr minmax(200px, auto)",
                alignItems: "center",
                gap: 16,
                width: "100%",
              }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  className={`wizard-footer-back${wizardNavBusy === "back" ? " wizard-footer-back--saving" : ""}`}
                  onClick={() => void back()}
                  disabled={wizardAnyNavBusy}
                  aria-busy={wizardNavBusy === "back"}
                >
                  {wizardNavBusy === "back" ? (
                    <>
                      <Icons.Loader size={18} strokeWidth={2.25} className="wizard-footer-btn-spinner" style={{ color: "var(--color-primary)" }} aria-hidden />
                      <span>Saving…</span>
                    </>
                  ) : (
                    "Back"
                  )}
                </button>
              ) : (
                <span style={{ minWidth: 108, width: 108, flexShrink: 0 }} aria-hidden="true" />
              )}
              <div
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#9ca3af",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                Launching: {name?.trim() || "Untitled Campaign"}
              </div>
              <span
                style={{ justifySelf: "end" }}
                title={reviewLaunchBlocked ? "Fix errors above first" : undefined}
              >
                <button
                  type="button"
                  className="wizard-footer-next"
                  onClick={() => setConfirmOpen(true)}
                  disabled={reviewLaunchBlocked}
                  style={{ minWidth: 168, fontSize: 15, padding: "12px 26px", gap: 10 }}
                >
                  <Rocket size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
                  Launch Campaign
                </button>
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  className={`wizard-footer-back${wizardNavBusy === "back" ? " wizard-footer-back--saving" : ""}`}
                  onClick={() => void back()}
                  disabled={wizardAnyNavBusy}
                  aria-busy={wizardNavBusy === "back"}
                >
                  {wizardNavBusy === "back" ? (
                    <>
                      <Icons.Loader size={18} strokeWidth={2.25} className="wizard-footer-btn-spinner" style={{ color: "var(--color-primary)" }} aria-hidden />
                      <span>Saving…</span>
                    </>
                  ) : (
                    "Back"
                  )}
                </button>
              ) : (
                <span style={{ minWidth: 108, width: 108, flexShrink: 0 }} aria-hidden="true" />
              )}
              {step < totalSteps ? (
                <span
                  style={{ display: "inline-block" }}
                  title={
                    nextButtonDisabled && wizardNavBusy === null && wizardStepperLoadingStep === null
                      ? isCallVoiceStep && !selectedVoiceId
                        ? "Select a voice to continue"
                        : isCallKnowledgeStep && knowledgeBaseFiles.length === 0
                          ? "Add a knowledge base file (upload a PDF or complete the AI topic flow) to continue"
                          : currentStepInfo?.stepType === "basic_setup"
                            ? "Please complete the required fields"
                            : currentStepInfo?.stepType === "core_details_part1"
                              ? "Fill required fields to continue"
                              : nextStepValidationError ?? "Please complete the required fields"
                      : wizardNavBusy === null && wizardStepperLoadingStep === null &&
                          currentStepInfo?.stepType === "core_details_part2" &&
                          totalLeads > CAMPAIGN_WIZARD_MAX_LEADS
                        ? `Maximum ${CAMPAIGN_WIZARD_MAX_LEADS} leads per campaign — remove some before continuing`
                        : undefined
                  }
                  onClick={() => {
                    if (
                      currentStepInfo?.stepType === "basic_setup" &&
                      !canProceedToNextStep(stepValidationContext)
                    ) {
                      setCampaignNameBlurred(true);
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`wizard-footer-next${wizardNavBusy === "next" ? " wizard-footer-next--saving" : ""}`}
                    onClick={() => void next()}
                    disabled={nextButtonDisabled}
                    aria-busy={wizardNavBusy === "next"}
                  >
                    {wizardNavBusy === "next" ? (
                      <>
                        <Icons.Loader size={18} strokeWidth={2.25} className="wizard-footer-btn-spinner" style={{ color: "#fff" }} aria-hidden />
                        <span>Saving…</span>
                      </>
                    ) : (
                      "Next"
                    )}
                  </button>
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Email wizard: preview + edit (templates page styling; outside .card-enhanced) */}
    {emailWizardPreview && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(10px)",
          zIndex: 10060,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => setEmailWizardPreview(null)}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-wizard-preview-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(560px, 100%)",
            maxHeight: "min(85vh, 720px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--elev-bg)",
            border: "1px solid var(--elev-border)",
            borderRadius: 20,
            boxShadow: "var(--elev-shadow-lg)",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: "24px 28px 16px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              borderBottom: "1px solid var(--elev-border)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="bases-workspace-card-metric-label" style={{ marginBottom: 6 }}>
                Preview
              </div>
              <h2
                id="email-wizard-preview-title"
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--color-text)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                }}
              >
                {emailWizardPreview.title}
              </h2>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  lineHeight: 1.45,
                }}
              >
                {emailWizardPreview.metaLine}
              </div>
            </div>
            <button
              type="button"
              className="bases-workspace-card-menu-trigger"
              aria-label="Close preview"
              onClick={() => setEmailWizardPreview(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Icons.X size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              padding: "20px 28px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {emailWizardPreview.kind !== "linkedin" && emailWizardPreview.kind !== "whatsapp" ? (
                <div>
                  <div className="bases-workspace-card-metric-label">Subject</div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {emailWizardPreview.subject}
                  </p>
                </div>
              ) : null}
              <div>
                <div className="bases-workspace-card-metric-label">
                  {emailWizardPreview.kind === "linkedin"
                    ? "Connection note"
                    : emailWizardPreview.kind === "whatsapp"
                      ? "Message"
                      : "Body"}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--color-surface-secondary)",
                    border: "1px solid var(--elev-border)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--color-text)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {emailWizardPreview.body}
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              flexShrink: 0,
              padding: "16px 28px 24px",
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid var(--elev-border)",
            }}
          >
            <button
              type="button"
              className="btn-dashboard-outline focus-ring"
              onClick={() => setEmailWizardPreview(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {emailWizardEdit &&
      (() => {
        const closeEdit = () => setEmailWizardEdit(null);
        if (emailWizardEdit.type === "library") {
          const tid = emailWizardEdit.id;
          const t = libraryTemplates.find((x) => Number((x as Record<string, unknown>).id) === tid) as
            | Record<string, unknown>
            | undefined;
          if (!t) {
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-wizard-edit-missing"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 10060,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={closeEdit}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--elev-bg)",
                    borderRadius: 20,
                    padding: 28,
                    border: "1px solid var(--elev-border)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <h2 id="email-wizard-edit-missing" style={{ marginTop: 0, fontSize: 18 }}>
                    Template unavailable
                  </h2>
                  <p className="text-hint" style={{ marginBottom: 20 }}>
                    This template could not be loaded. Try refreshing or pick another template.
                  </p>
                  <button type="button" className="btn-primary" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </div>
            );
          }
          const vars = (t.variables && typeof t.variables === "object" && !Array.isArray(t.variables)
            ? (t.variables as Record<string, unknown>)
            : {}) as Record<string, unknown>;
          const tplTitle = String(vars.name || "Untitled");
          const defaultSubj = vars.subject != null ? String(vars.subject) : "";
          const defaultBody = String(t.content || "");
          const subj = libraryTemplateEdits[tid]?.subject ?? defaultSubj;
          const body = libraryTemplateEdits[tid]?.body ?? defaultBody;
          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
              role="presentation"
            >
              <div
                className="wizard-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="email-wizard-edit-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 16,
                  padding: 0,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 520,
                  width: "100%",
                  maxHeight: "min(88vh, calc(100vh - 48px))",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--elev-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Mail size={16} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_EMAIL }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      id="email-wizard-edit-title"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Edit email
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                      {tplTitle}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <label htmlFor={`email-wizard-edit-subj-${tid}`} style={WIZ_EDIT_LABEL}>
                      Subject line
                    </label>
                    <input
                      ref={wizardEditSubjectRef}
                      id={`email-wizard-edit-subj-${tid}`}
                      type="text"
                      className="input"
                      value={subj}
                      onFocus={() => {
                        wizardEditInsertTargetRef.current = "subject";
                      }}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLibraryTemplateEdits((prev) => ({
                          ...prev,
                          [tid]: { subject: v, body: prev[tid]?.body ?? defaultBody },
                        }));
                      }}
                      placeholder="Email subject…"
                      style={WIZ_EDIT_FIELD}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <label htmlFor={`email-wizard-edit-body-${tid}`} style={WIZ_EDIT_LABEL}>
                      Email body
                    </label>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`email-wizard-edit-body-${tid}`}
                      className="input"
                      value={body}
                      onFocus={() => {
                        wizardEditInsertTargetRef.current = "body";
                      }}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLibraryTemplateEdits((prev) => ({
                          ...prev,
                          [tid]: { subject: prev[tid]?.subject ?? defaultSubj, body: v },
                        }));
                      }}
                      placeholder="Email body…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        flex: 1,
                        minHeight: 100,
                        resize: "none",
                        overflowY: "auto",
                      }}
                    />
                    <WizardEditVariableRow
                      tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                      hint="Click in subject or body, then insert a variable."
                      onInsert={(tok) => {
                        const slot = wizardEditInsertTargetRef.current;
                        if (slot === "subject") {
                          insertTokenInField(wizardEditSubjectRef.current, subj, tok, (next) => {
                            setLibraryTemplateEdits((prev) => ({
                              ...prev,
                              [tid]: { subject: next, body: prev[tid]?.body ?? defaultBody },
                            }));
                          });
                        } else {
                          insertTokenInField(wizardEditBodyRef.current, body, tok, (next) => {
                            setLibraryTemplateEdits((prev) => ({
                              ...prev,
                              [tid]: { subject: prev[tid]?.subject ?? defaultSubj, body: next },
                            }));
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 16px 14px",
                    borderTop: "1px solid var(--elev-border)",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    onClick={closeEdit}
                    style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      background: WIZ_ACCENT,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 22px",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        }
        if (emailWizardEdit.type === "linkedin_library") {
          const lid = emailWizardEdit.id;
          const lt = libraryTemplates.find((x) => Number((x as Record<string, unknown>).id) === lid) as
            | Record<string, unknown>
            | undefined;
          if (!lt) {
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="li-wizard-edit-missing"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 10060,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={closeEdit}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--elev-bg)",
                    borderRadius: 20,
                    padding: 28,
                    border: "1px solid var(--elev-border)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <h2 id="li-wizard-edit-missing" style={{ marginTop: 0, fontSize: 18 }}>
                    Template unavailable
                  </h2>
                  <p className="text-hint" style={{ marginBottom: 20 }}>
                    This template could not be loaded. Try refreshing or pick another template.
                  </p>
                  <button type="button" className="btn-primary" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </div>
            );
          }
          const lvars = (lt.variables && typeof lt.variables === "object" && !Array.isArray(lt.variables)
            ? (lt.variables as Record<string, unknown>)
            : {}) as Record<string, unknown>;
          const liTplTitle = String(lvars.name || "Untitled");
          const liDefaultSubj = lvars.subject != null ? String(lvars.subject) : "";
          const liDefaultBody = String(lt.content || "");
          const liBody = libraryTemplateEdits[lid]?.body ?? liDefaultBody;
          const liBodyClipped = liBody.slice(0, 200);
          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
              role="presentation"
            >
              <div
                className="wizard-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="li-wizard-library-edit-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 16,
                  padding: 0,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 520,
                  width: "100%",
                  maxHeight: "min(88vh, calc(100vh - 48px))",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--elev-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Linkedin size={16} style={{ color: "#0077B5" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      id="li-wizard-library-edit-title"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Edit LinkedIn template
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                      {liTplTitle}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <label htmlFor={`li-wizard-edit-body-${lid}`} style={WIZ_EDIT_LABEL}>
                        Connection note
                      </label>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: liBodyClipped.length > 180 ? "#dc2626" : "var(--color-text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {liBodyClipped.length}/200
                      </span>
                    </div>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`li-wizard-edit-body-${lid}`}
                      className="input"
                      value={liBodyClipped}
                      maxLength={200}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, 200);
                        setLibraryTemplateEdits((prev) => ({
                          ...prev,
                          [lid]: { subject: prev[lid]?.subject ?? liDefaultSubj, body: v },
                        }));
                      }}
                      placeholder="Hi {{first_name}}, I'd like to connect…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        flex: 1,
                        minHeight: 100,
                        resize: "none",
                        overflowY: "auto",
                        borderColor: liBodyClipped.length > 180 ? "rgba(220, 38, 38, 0.35)" : undefined,
                      }}
                    />
                    <WizardEditVariableRow
                      tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                      hint="Insert variables (max 200 characters for LinkedIn)."
                      onInsert={(tok) =>
                        insertTokenInField(
                          wizardEditBodyRef.current,
                          liBodyClipped,
                          tok,
                          (next) => {
                            const clipped = next.slice(0, 200);
                            setLibraryTemplateEdits((prev) => ({
                              ...prev,
                              [lid]: { subject: prev[lid]?.subject ?? liDefaultSubj, body: clipped },
                            }));
                          },
                          { maxLength: 200 }
                        )
                      }
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 16px 14px",
                    borderTop: "1px solid var(--elev-border)",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    onClick={closeEdit}
                    style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      background: WIZ_ACCENT,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 22px",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        }
        if (emailWizardEdit.type === "linkedin_ai") {
          const lix = emailWizardEdit.index;
          const liTemplates = linkedInStepConfig?.templates;
          if (!liTemplates || lix < 0 || lix >= liTemplates.length) {
            return (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 10060,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={closeEdit}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--elev-bg)",
                    borderRadius: 20,
                    padding: 28,
                    border: "1px solid var(--elev-border)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <p style={{ marginTop: 0 }}>This suggestion is no longer available.</p>
                  <button type="button" className="btn-primary" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </div>
            );
          }
          const liTplDraft = liTemplates[lix] ?? "";
          const liDraftClipped = liTplDraft.slice(0, 200);
          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
              role="presentation"
            >
              <div
                className="wizard-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="li-wizard-ai-edit-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 16,
                  padding: 0,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 520,
                  width: "100%",
                  maxHeight: "min(88vh, calc(100vh - 48px))",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--elev-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Linkedin size={16} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_LINKEDIN }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      id="li-wizard-ai-edit-title"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Edit connection note
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                      Suggestion {lix + 1}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <label htmlFor={`li-wizard-ai-edit-body-${lix}`} style={WIZ_EDIT_LABEL}>
                        Connection note
                      </label>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: liDraftClipped.length > 180 ? "#dc2626" : "var(--color-text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {liDraftClipped.length}/200
                      </span>
                    </div>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`li-wizard-ai-edit-body-${lix}`}
                      className="input"
                      value={liDraftClipped}
                      maxLength={200}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, 200);
                        setLinkedInStepConfig((p) => {
                          if (!p?.templates) return p;
                          const nt = [...p.templates];
                          nt[lix] = v;
                          const next = { ...p, templates: nt };
                          if (linkedInAppliedSuggestionIndex === lix) {
                            return { ...next, message: v };
                          }
                          return next;
                        });
                      }}
                      placeholder="Connection note…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        flex: 1,
                        minHeight: 100,
                        resize: "none",
                        overflowY: "auto",
                        borderColor: liDraftClipped.length > 180 ? "rgba(220, 38, 38, 0.35)" : undefined,
                      }}
                    />
                    <WizardEditVariableRow
                      tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                      hint="Insert variables (max 200 characters for LinkedIn)."
                      onInsert={(tok) =>
                        insertTokenInField(
                          wizardEditBodyRef.current,
                          liDraftClipped,
                          tok,
                          (next) => {
                            const clipped = next.slice(0, 200);
                            setLinkedInStepConfig((p) => {
                              if (!p?.templates) return p;
                              const nt = [...p.templates];
                              nt[lix] = clipped;
                              const u = { ...p, templates: nt };
                              if (linkedInAppliedSuggestionIndex === lix) {
                                return { ...u, message: clipped };
                              }
                              return u;
                            });
                          },
                          { maxLength: 200 }
                        )
                      }
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 16px 14px",
                    borderTop: "1px solid var(--elev-border)",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    onClick={closeEdit}
                    style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      background: WIZ_ACCENT,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 22px",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        }
        if (emailWizardEdit.type === "whatsapp_library") {
          const wtid = emailWizardEdit.id;
          const wt = libraryTemplates.find((x) => Number((x as Record<string, unknown>).id) === wtid) as
            | Record<string, unknown>
            | undefined;
          if (!wt) {
            return (
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="wa-wizard-edit-missing"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 10060,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={closeEdit}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--elev-bg)",
                    borderRadius: 20,
                    padding: 28,
                    border: "1px solid var(--elev-border)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <h2 id="wa-wizard-edit-missing" style={{ marginTop: 0, fontSize: 18 }}>
                    Template unavailable
                  </h2>
                  <p className="text-hint" style={{ marginBottom: 20 }}>
                    This template could not be loaded. Try refreshing or pick another template.
                  </p>
                  <button type="button" className="btn-primary" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </div>
            );
          }
          const wvars = (wt.variables && typeof wt.variables === "object" && !Array.isArray(wt.variables)
            ? (wt.variables as Record<string, unknown>)
            : {}) as Record<string, unknown>;
          const waTplTitle = String(wvars.name || "Untitled");
          const waDefaultSubj = wvars.subject != null ? String(wvars.subject) : "";
          const waDefaultBody = String(wt.content || "");
          const waBody = libraryTemplateEdits[wtid]?.body ?? waDefaultBody;
          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
              role="presentation"
            >
              <div
                className="wizard-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wa-wizard-library-edit-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 16,
                  padding: 0,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 520,
                  width: "100%",
                  maxHeight: "min(88vh, calc(100vh - 48px))",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--elev-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.WhatsApp size={16} style={{ color: WIZ_CHANNEL_WHATSAPP }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      id="wa-wizard-library-edit-title"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Edit WhatsApp template
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                      {waTplTitle}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <label htmlFor={`wa-wizard-edit-body-${wtid}`} style={WIZ_EDIT_LABEL}>
                      Message
                    </label>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`wa-wizard-edit-body-${wtid}`}
                      className="input"
                      value={waBody}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLibraryTemplateEdits((prev) => ({
                          ...prev,
                          [wtid]: { subject: prev[wtid]?.subject ?? waDefaultSubj, body: v },
                        }));
                      }}
                      placeholder="WhatsApp message…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        flex: 1,
                        minHeight: 100,
                        resize: "none",
                        overflowY: "auto",
                      }}
                    />
                    <WizardEditVariableRow
                      tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                      hint="Insert variables into your message."
                      onInsert={(tok) =>
                        insertTokenInField(wizardEditBodyRef.current, waBody, tok, (next) => {
                          setLibraryTemplateEdits((prev) => ({
                            ...prev,
                            [wtid]: { subject: prev[wtid]?.subject ?? waDefaultSubj, body: next },
                          }));
                        })
                      }
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 16px 14px",
                    borderTop: "1px solid var(--elev-border)",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    onClick={closeEdit}
                    style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      background: WIZ_ACCENT,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 22px",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        }
        if (emailWizardEdit.type === "whatsapp_ai") {
          const widx = emailWizardEdit.index;
          if (widx < 0 || widx >= whatsAppMessages.length) {
            return (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.45)",
                  backdropFilter: "blur(10px)",
                  zIndex: 10060,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={closeEdit}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "var(--elev-bg)",
                    borderRadius: 20,
                    padding: 28,
                    border: "1px solid var(--elev-border)",
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <p style={{ marginTop: 0 }}>This draft is no longer available.</p>
                  <button type="button" className="btn-primary" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </div>
            );
          }
          const waMsgBody = whatsAppMessages[widx];
          return (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
              role="presentation"
            >
              <div
                className="wizard-edit-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wa-wizard-ai-edit-title"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 16,
                  padding: 0,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 520,
                  width: "100%",
                  maxHeight: "min(88vh, calc(100vh - 48px))",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--elev-border)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "var(--color-surface-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icons.WhatsApp size={16} style={{ color: WIZ_CHANNEL_WHATSAPP }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2
                      id="wa-wizard-ai-edit-title"
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.3,
                      }}
                    >
                      Edit WhatsApp draft
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                      {whatsAppDraftBadgeLabel(widx)}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <label htmlFor={`wa-wizard-ai-edit-body-${widx}`} style={WIZ_EDIT_LABEL}>
                      Message
                    </label>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`wa-wizard-ai-edit-body-${widx}`}
                      className="input"
                      value={waMsgBody}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWhatsAppMessages((prev) => {
                          const copy = [...prev];
                          copy[widx] = v;
                          return copy;
                        });
                      }}
                      placeholder="WhatsApp message…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        flex: 1,
                        minHeight: 100,
                        resize: "none",
                        overflowY: "auto",
                      }}
                    />
                    <WizardEditVariableRow
                      tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                      hint="Insert variables into your message."
                      onInsert={(tok) =>
                        insertTokenInField(wizardEditBodyRef.current, waMsgBody, tok, (next) => {
                          setWhatsAppMessages((prev) => {
                            const copy = [...prev];
                            copy[widx] = next;
                            return copy;
                          });
                        })
                      }
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px 16px 14px",
                    borderTop: "1px solid var(--elev-border)",
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn-dashboard-outline focus-ring"
                    onClick={closeEdit}
                    style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    style={{
                      background: WIZ_ACCENT,
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 22px",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        }
        const idx = emailWizardEdit.index;
        if (idx < 0 || idx >= messages.length) {
          return (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                backdropFilter: "blur(10px)",
                zIndex: 10060,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={closeEdit}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--elev-bg)",
                  borderRadius: 20,
                  padding: 28,
                  border: "1px solid var(--elev-border)",
                  maxWidth: 400,
                  width: "100%",
                }}
              >
                <p style={{ marginTop: 0 }}>This draft is no longer available.</p>
                <button type="button" className="btn-primary" onClick={closeEdit}>
                  Close
                </button>
              </div>
            </div>
          );
        }
        const { subject, body } = parseMessage(messages[idx]);
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100vh",
              background: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(10px)",
              zIndex: 10060,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={closeEdit}
            role="presentation"
          >
            <div
              className="wizard-edit-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-wizard-ai-edit-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--elev-bg)",
                borderRadius: 16,
                padding: 0,
                border: "1px solid var(--elev-border)",
                maxWidth: 520,
                width: "100%",
                maxHeight: "min(88vh, calc(100vh - 48px))",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.12)",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--elev-border)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--color-surface-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icons.Mail size={16} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_EMAIL }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    id="email-wizard-ai-edit-title"
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      margin: 0,
                      color: "var(--color-text)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.3,
                    }}
                  >
                    {idx === 0 && emailInitialContentSource === "library"
                      ? "Edit first email"
                      : "Edit AI draft"}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.45, color: "var(--color-text-muted)" }}>
                    {emailDraftBadgeLabel(idx)}
                    {idx === 0 && emailInitialContentSource === "library" ? (
                      <span style={{ display: "block", marginTop: 4, fontSize: 11, lineHeight: 1.45 }}>
                        Filled from a saved template—you can edit freely or re-generate with AI below.
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  overflow: "hidden",
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <label htmlFor={`email-wizard-ai-edit-subj-${idx}`} style={WIZ_EDIT_LABEL}>
                    Subject line
                  </label>
                  <input
                    ref={wizardEditSubjectRef}
                    id={`email-wizard-ai-edit-subj-${idx}`}
                    type="text"
                    className="input"
                    value={subject}
                    onFocus={() => {
                      wizardEditInsertTargetRef.current = "subject";
                    }}
                    onChange={(e) => {
                      const copy = [...messages];
                      copy[idx] = formatMessage(e.target.value, body);
                      setMessages(copy);
                    }}
                    placeholder="Email subject…"
                    style={WIZ_EDIT_FIELD}
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <label htmlFor={`email-wizard-ai-edit-body-${idx}`} style={WIZ_EDIT_LABEL}>
                      Email body
                    </label>
                    <textarea
                      ref={wizardEditBodyRef}
                      id={`email-wizard-ai-edit-body-${idx}`}
                      className="input"
                      value={body}
                      onFocus={() => {
                        wizardEditInsertTargetRef.current = "body";
                      }}
                      onChange={(e) => {
                        const copy = [...messages];
                        copy[idx] = formatMessage(subject, e.target.value);
                        setMessages(copy);
                      }}
                      placeholder="Email body…"
                      style={{
                        ...WIZ_EDIT_FIELD,
                        minHeight: 200,
                        maxHeight: "min(42vh, 360px)",
                        resize: "vertical",
                        overflowY: "auto",
                        width: "100%",
                      }}
                    />
                  </div>
                  <WizardEditVariableRow
                    tokens={CAMPAIGN_TEMPLATE_VARIABLES}
                    hint="Click in subject or body, then tap a variable to insert it."
                    onInsert={(tok) => {
                      const slot = wizardEditInsertTargetRef.current;
                      if (slot === "subject") {
                        insertTokenInField(wizardEditSubjectRef.current, subject, tok, (next) => {
                          const copy = [...messages];
                          copy[idx] = formatMessage(next, body);
                          setMessages(copy);
                        });
                      } else {
                        insertTokenInField(wizardEditBodyRef.current, body, tok, (next) => {
                          const copy = [...messages];
                          copy[idx] = formatMessage(subject, next);
                          setMessages(copy);
                        });
                      }
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      flexShrink: 0,
                      paddingTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      className="focus-ring"
                      disabled={
                        regeneratingEmailSlot === idx ||
                        !channels.includes("email") ||
                        !activeBaseId ||
                        emailDraftFetchState !== "idle"
                      }
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "8px 14px",
                        borderRadius: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        border: `1px solid ${WIZ_ACCENT}`,
                        background: "var(--color-surface)",
                        color:
                          regeneratingEmailSlot === idx ||
                          !channels.includes("email") ||
                          !activeBaseId ||
                          emailDraftFetchState !== "idle"
                            ? "var(--color-text-muted)"
                            : WIZ_ACCENT,
                        cursor:
                          regeneratingEmailSlot === idx ||
                          !channels.includes("email") ||
                          !activeBaseId ||
                          emailDraftFetchState !== "idle"
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          regeneratingEmailSlot === idx ||
                          !channels.includes("email") ||
                          !activeBaseId ||
                          emailDraftFetchState !== "idle"
                            ? 0.75
                            : 1,
                      }}
                      onClick={async () => {
                      if (!channels.includes("email") || !activeBaseId) return;
                      const sampleLeads = selectedLeadsForSamples.slice(0, 3);
                      setRegeneratingEmailSlot(idx);
                      try {
                        const response = await apiRequest("/campaigns/generate-messages", {
                          method: "POST",
                          body: JSON.stringify({
                            channel: "email",
                            campaignName: name,
                            baseId: activeBaseId,
                            segments,
                            sampleLeads: sampleLeads.map(sanitizeLeadForAPI),
                            productService,
                            valueProposition,
                            callToAction,
                            senderName,
                            senderCompany,
                            regenerateEmailIndex: idx,
                            tone: emailDraftTone,
                          }),
                        });
                        const newMsg = response.messages?.[0];
                        if (newMsg && typeof newMsg === "string") {
                          setMessages((prev) => {
                            const c = [...prev];
                            c[idx] = newMsg;
                            return c;
                          });
                          if (idx === 0) setEmailInitialContentSource("ai");
                          setMessagesGenerated(true);
                        }
                      } catch (err) {
                        console.error("Regenerate single email failed:", err);
                      } finally {
                        setRegeneratingEmailSlot(null);
                      }
                    }}
                  >
                    {regeneratingEmailSlot === idx ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Icons.Loader size={14} style={{ animation: "spin 1s linear infinite", color: WIZ_EDIT_ICON_MUTED }} />
                        Regenerating…
                      </span>
                    ) : (
                      <>
                        <Icons.Mail
                          size={14}
                          strokeWidth={1.75}
                          style={{
                            color:
                              regeneratingEmailSlot === idx ||
                              !channels.includes("email") ||
                              !activeBaseId ||
                              emailDraftFetchState !== "idle"
                                ? "var(--color-text-muted)"
                                : WIZ_CHANNEL_EMAIL,
                          }}
                        />
                        Re-generate this email
                      </>
                    )}
                  </button>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>
                    ~{countEmailWords(body)} words
                  </span>
                </div>
              </div>
              </div>
              <div
                style={{
                  padding: "10px 16px 14px",
                  borderTop: "1px solid var(--elev-border)",
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn-dashboard-outline focus-ring"
                  onClick={closeEdit}
                  style={{ fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  style={{
                    background: WIZ_ACCENT,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 22px",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    {/* KB AI modal: must sit outside .card-enhanced (backdrop-filter/transform break position:fixed) */}
    {kbAiOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kb-ai-modal-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10050,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
        onClick={() => {
          if (kbAiPhase !== 'generating' && kbAiPhase !== 'loading') {
            setKbAiUserTopic(null);
            setKbAiOpen(false);
            setKbAiPhase('idle');
          }
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90vh',
            overflow: 'auto',
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            border: '1px solid var(--color-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h4 id="kb-ai-modal-title" style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>
                {kbAiSuggestionLabel || "Knowledge base"}
              </h4>
              <p className="text-hint" style={{ marginTop: 0, marginBottom: 0, fontSize: 13 }}>
                Answer the questions below. A knowledge base document will be generated and uploaded to this campaign.
              </p>
            </div>
            {kbAiPhase === "questions" && kbAiQuestions.length > 0 ? (
              <span
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "#9ca3af",
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                Question {kbAiHighlightIdx + 1} of {kbAiQuestions.length}
              </span>
            ) : null}
          </div>

          {kbAiPhase === "loading" && (
            <div style={{ padding: "20px 8px 24px", textAlign: "center" }}>
              <Icons.Loader
                size={28}
                style={{
                  animation: "spin 1s linear infinite",
                  marginBottom: 10,
                  color: "var(--color-primary)",
                }}
              />
              <div style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Preparing questions…</div>
              <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.45 }}>
                We&apos;re generating questions based on your topic
              </div>
            </div>
          )}

          {kbAiPhase === "questions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {kbAiQuestions.map((q, idx) => {
                const { title, optional } = parseKbQuestionLabel(q);
                return (
                  <label key={idx} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--color-text)",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      {title}
                      {optional ? (
                        <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                      ) : null}
                    </span>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder={kbQuestionPlaceholder(q, idx)}
                      value={kbAiAnswers[idx] ?? ""}
                      onChange={(e) => {
                        const next = [...kbAiAnswers];
                        next[idx] = e.target.value;
                        setKbAiAnswers(next);
                      }}
                      onFocus={() => setKbAiHighlightIdx(idx)}
                      style={{ resize: "vertical", minHeight: 80 }}
                    />
                  </label>
                );
              })}
              {kbAiError && (
                <div style={{ color: '#ef4444', fontSize: 13 }}>{kbAiError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setKbAiUserTopic(null);
                    setKbAiOpen(false);
                    setKbAiPhase('idle');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void submitKbAiAnswers()}
                >
                  Add to knowledge base
                </button>
              </div>
            </div>
          )}

          {kbAiPhase === 'generating' && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <Icons.Sparkles size={32} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Generating your knowledge base…</div>
              <div style={{ fontSize: 13 }}>This may take up to a minute.</div>
            </div>
          )}

          {kbAiPhase === 'idle' && kbAiError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#ef4444', fontSize: 13 }}>{kbAiError}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setKbAiUserTopic(null);
                    setKbAiOpen(false);
                    setKbAiPhase('idle');
                    setKbAiError(null);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Remove knowledge base confirmation (outside .card-enhanced for correct fixed overlay) */}
    {kbDeleteTarget && (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kb-delete-title"
        aria-describedby="kb-delete-desc"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10060,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
        onClick={() => {
          if (!kbDeleteLoading) setKbDeleteTarget(null);
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            minWidth: 0,
            boxSizing: 'border-box',
            background: 'var(--color-surface)',
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 id="kb-delete-title" style={{ marginTop: 0, marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
            Remove knowledge base file?
          </h4>
          <p
            id="kb-delete-desc"
            className="text-hint"
            style={{
              marginTop: 0,
              marginBottom: 20,
              fontSize: 14,
              lineHeight: 1.5,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            This will remove{' '}
            <strong style={{ color: 'var(--color-text)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {kbDeleteTarget.name}
            </strong>{' '}
            from this campaign and from the agent knowledge base. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-ghost"
              disabled={kbDeleteLoading}
              onClick={() => setKbDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={kbDeleteLoading}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              onClick={async () => {
                const target = kbDeleteTarget;
                if (!target) return;
                const editCampaignId = searchParams?.get('edit') || String(draftCampaignId || '');
                if (!editCampaignId) {
                  setKnowledgeBaseFiles((prev) => prev.filter((f) => f.id !== target.id));
                  setKbDeleteTarget(null);
                  return;
                }
                setKbDeleteLoading(true);
                try {
                  await apiRequest(`/campaigns/${editCampaignId}/knowledge-base/${target.id}`, {
                    method: 'DELETE',
                  });
                  setKnowledgeBaseFiles((prev) => prev.filter((f) => f.id !== target.id));
                  setKbDeleteTarget(null);
                } catch (error: any) {
                  showError('Delete failed', error?.message || 'Failed to delete file');
                } finally {
                  setKbDeleteLoading(false);
                }
              }}
            >
              {kbDeleteLoading ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Clone voice (fixed overlay — outside .card-enhanced) */}
    {voiceCloneOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-clone-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10070,
          background: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={() => {
          if (!cloningVoice) {
            stopVoiceCloneSamplePreview();
            setVoiceCloneName("");
            setVoiceCloneDescription("");
            setVoiceCloneFiles([]);
            if (voiceCloneSampleInputRef.current) voiceCloneSampleInputRef.current.value = "";
            setVoiceCloneOpen(false);
          }
        }}
      >
        <style>{`
          .voice-clone-modal-scroll::-webkit-scrollbar,
          .voice-clone-file-list::-webkit-scrollbar {
            width: 8px;
          }
          .voice-clone-modal-scroll::-webkit-scrollbar-thumb,
          .voice-clone-file-list::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.22);
            border-radius: 4px;
          }
          .voice-clone-modal-scroll::-webkit-scrollbar-track,
          .voice-clone-file-list::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.04);
            border-radius: 4px;
          }
        `}</style>
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "min(90vh, 640px)",
            minWidth: 0,
            boxSizing: "border-box",
            background: "var(--color-surface)",
            borderRadius: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            margin: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="voice-clone-modal-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "22px 22px 12px",
              WebkitOverflowScrolling: "touch",
            }}
          >
          <h4 id="voice-clone-title" style={{ marginTop: 0, marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
            Clone a voice
          </h4>
          <p className="text-hint" style={{ marginTop: 0, marginBottom: 18, fontSize: 14, lineHeight: 1.55 }}>
            Upload one or more short, clear recordings (about 30–120 seconds total works well). The voice service creates the voice on
            your account; it will show under <strong style={{ color: "var(--color-text)" }}>My voices</strong>.
          </p>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Voice name *</label>
          <input
            className="input"
            value={voiceCloneName}
            onChange={(e) => setVoiceCloneName(e.target.value)}
            placeholder="e.g. Acme Sales — Alex"
            disabled={cloningVoice}
            style={{ width: "100%", marginBottom: 12, boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Description (optional)</label>
          <input
            className="input"
            value={voiceCloneDescription}
            onChange={(e) => setVoiceCloneDescription(e.target.value)}
            placeholder="Short note for the voice service (e.g. English sales tone)"
            disabled={cloningVoice}
            style={{ width: "100%", marginBottom: 16, boxSizing: "border-box" }}
          />
          <p className="text-hint" style={{ fontSize: 11, marginTop: -12, marginBottom: 14 }}>
            Language is sent as <strong style={{ color: "var(--color-text)" }}>English (en)</strong> for labels.
          </p>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Audio samples *</label>
          <input
            ref={voiceCloneSampleInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.webm,.aac,.flac,.ogg"
            multiple
            disabled={cloningVoice}
            aria-hidden
            tabIndex={-1}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            onChange={(e) => {
              const picked = e.target.files;
              const next = Array.from(picked || []).filter(isVoiceCloneSampleFile);
              if (next.length) setVoiceCloneFiles((prev) => mergeVoiceCloneFiles(next, prev));
              e.target.value = "";
            }}
          />
          <div
            role="presentation"
            onDragEnter={(e) => {
              e.preventDefault();
              if (!cloningVoice) setVoiceCloneDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setVoiceCloneDragOver(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              setVoiceCloneDragOver(false);
              if (cloningVoice) return;
              const dropped = Array.from(e.dataTransfer.files || []);
              setVoiceCloneFiles((prev) => mergeVoiceCloneFiles(dropped, prev));
            }}
            style={{
              border: `2px dashed ${voiceCloneDragOver ? "var(--color-primary)" : "var(--color-border)"}`,
              borderRadius: 14,
              padding: "22px 18px",
              background: voiceCloneDragOver ? "rgba(var(--color-primary-rgb), 0.2)" : "var(--color-surface-secondary)",
              marginBottom: 10,
              textAlign: "center",
              transition: "border-color 0.15s, background 0.15s",
              cursor: cloningVoice ? "not-allowed" : "default",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                margin: "0 auto 12px",
                borderRadius: 14,
                background: "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.12) 100%)",
                border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
              }}
            >
              <Icons.Upload size={26} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>
              {voiceCloneDragOver ? "Drop files to add" : "Drop audio here or browse"}
            </div>
            <div className="text-hint" style={{ fontSize: 12, lineHeight: 1.45, marginBottom: 14 }}>
              WAV, MP3, M4A, WebM — multiple files ok (~30–120s total recommended)
            </div>
            <button
              type="button"
              className="btn-ghost"
              disabled={cloningVoice}
              onClick={() => voiceCloneSampleInputRef.current?.click()}
              style={{
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              Choose files
            </button>
          </div>
          {voiceCloneFiles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="text-hint" style={{ fontSize: 12, fontWeight: 600 }}>
                  {voiceCloneFiles.length} file{voiceCloneFiles.length === 1 ? "" : "s"} selected
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={cloningVoice}
                  onClick={() => {
                    stopVoiceCloneSamplePreview();
                    setVoiceCloneFiles([]);
                    if (voiceCloneSampleInputRef.current) voiceCloneSampleInputRef.current.value = "";
                  }}
                  style={{ fontSize: 12, padding: "4px 10px" }}
                >
                  Clear all
                </button>
              </div>
              <ul
                className="voice-clone-file-list"
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: "min(220px, 32vh)",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {voiceCloneFiles.map((f, idx) => (
                  <li
                    key={`${f.name}-${f.size}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--color-surface-secondary)",
                      border: "1px solid var(--color-border)",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "rgba(var(--color-primary-rgb), 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Phone size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere", color: "var(--color-text)" }}>
                        {f.name}
                      </div>
                      <div className="text-hint" style={{ fontSize: 11, marginTop: 2 }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={cloningVoice}
                      onClick={() => void toggleVoiceCloneSamplePreview(f, idx)}
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 10px",
                        fontWeight: 600,
                      }}
                    >
                      {voiceClonePreviewIndex === idx ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
                      {voiceClonePreviewIndex === idx ? "Pause" : "Play"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={cloningVoice}
                      aria-label={`Remove ${f.name}`}
                      onClick={() => {
                        stopVoiceCloneSamplePreview();
                        setVoiceCloneFiles((prev) => prev.filter((_, i) => i !== idx));
                        if (voiceCloneSampleInputRef.current) voiceCloneSampleInputRef.current.value = "";
                      }}
                      style={{ flexShrink: 0, padding: "6px 10px", fontSize: 18, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          </div>
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              padding: "14px 22px 22px",
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              disabled={cloningVoice}
              onClick={() => {
                stopVoiceCloneSamplePreview();
                setVoiceCloneName("");
                setVoiceCloneDescription("");
                setVoiceCloneFiles([]);
                if (voiceCloneSampleInputRef.current) voiceCloneSampleInputRef.current.value = "";
                setVoiceCloneOpen(false);
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={cloningVoice} onClick={() => void submitVoiceClone()}>
              {cloningVoice ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icons.Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Creating…
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icons.Upload size={16} />
                  Create voice
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {voiceDeleteTarget && (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="voice-del-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10075,
          background: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => {
          if (!voiceDeleteLoading) setVoiceDeleteTarget(null);
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            minWidth: 0,
            boxSizing: "border-box",
            background: "var(--color-surface)",
            borderRadius: 14,
            padding: 22,
            boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 id="voice-del-title" style={{ marginTop: 0, marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
            Delete cloned voice?
          </h4>
          <p className="text-hint" style={{ marginTop: 0, marginBottom: 20, fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere" }}>
            This removes <strong style={{ color: "var(--color-text)" }}>{voiceDeleteTarget.name}</strong> from the voice provider and your
            account. Campaigns using this voice may need a new selection.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn-ghost" disabled={voiceDeleteLoading} onClick={() => setVoiceDeleteTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={voiceDeleteLoading}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              onClick={() => void confirmDeleteClonedVoice()}
            >
              {voiceDeleteLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}

    {campaignLeadDrawerLead && (
      <LeadDrawer
        lead={campaignLeadDrawerLead}
        onClose={() => setCampaignLeadDrawerLead(null)}
        onEnrich={refetchCampaignWizardLeads}
      />
    )}

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
                background: 'rgba(var(--color-primary-rgb), 0.2)',
                border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icons.Users size={16} style={{ color: 'var(--color-primary)' }} />
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
              scrollbarColor: 'rgba(var(--color-primary-rgb), 0.2) rgba(0, 0, 0, 0.08)'
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
                            e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.2)';
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
                              background: (lead.score || 0) > 80 ? 'rgba(var(--color-primary-rgb), 0.2)' : 
                                         (lead.score || 0) > 60 ? 'rgba(255, 167, 38, 0.2)' : 
                                         'rgba(128, 128, 128, 0.2)',
                              color: (lead.score || 0) > 80 ? 'var(--color-primary)' : 
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

      {reviewChannelPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-channel-preview-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10055,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setReviewChannelPreview(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "85vh",
              overflow: "auto",
              background: "var(--color-surface)",
              borderRadius: 14,
              padding: 22,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <h4
                id="review-channel-preview-title"
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  flex: "1 1 auto",
                  minWidth: 0,
                }}
              >
                {reviewChannelPreview.title}
              </h4>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setReviewChannelPreview(null)}
                style={{
                  flexShrink: 0,
                  padding: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: 8,
                  color: "var(--color-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Icons.X size={20} aria-hidden />
              </button>
            </div>
            {reviewChannelPreview.kind === "email" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reviewChannelPreview.subject ? (
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: "var(--color-text)" }}>
                    {reviewChannelPreview.subject}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--color-text)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {reviewChannelPreview.body || "—"}
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--color-text)",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {reviewChannelPreview.text || "—"}
              </div>
            )}
          </div>
        </div>
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
            width:'min(980px,96vw)', 
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
              background: 'var(--color-surface-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--color-primary)',
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
                <div style={{
                  padding: '16px',
                  borderRadius: 12,
                  background: 'var(--color-surface-secondary)',
                  border: '1px solid var(--elev-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Icons.Target size={16} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{name || 'Untitled Campaign'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {channels.map((ch) => {
                      const channelId = ch as ChannelType;
                      return (
                        <span key={ch} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--color-border)', borderRadius: 999, padding: '3px 10px' }}>
                          <ReviewChannelGlyph channel={channelId} size={13} />
                          <span>{CHANNEL_CONFIGS[channelId]?.label || ch}</span>
                        </span>
                      );
                    })}
                    <span style={{ marginLeft: 4 }}>
                      {totalLeads} selected lead{totalLeads !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--elev-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Selected Leads
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setConfirmLeadDropdownOpen((v) => !v)}
                      style={{
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-secondary)'
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {selectedLeadsForSamples.length} lead{selectedLeadsForSamples.length !== 1 ? 's' : ''} selected
                      </span>
                      <ChevronDown size={16} style={{ transform: confirmLeadDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }} />
                    </button>
                    {confirmLeadDropdownOpen && (
                      <div style={{
                        maxHeight: 230,
                        overflowY: 'auto',
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        background: 'var(--color-surface-secondary)',
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}>
                        {selectedLeadsForSamples.length > 0 ? selectedLeadsForSamples.map((l) => {
                          const nm = [l.first_name, l.last_name].filter(Boolean).join(' ').trim();
                          const label = nm || l.email || `Lead #${l.id}`;
                          const sub =
                            l.company && l.role
                              ? `${l.role} · ${l.company}`
                              : l.company || l.role || l.email || l.phone || '';
                          return (
                            <div
                              key={l.id}
                              style={{
                                fontSize: 13,
                                padding: '9px 10px',
                                border: '1px solid var(--color-border)',
                                borderRadius: 10,
                                background: 'var(--color-surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {label}
                                </div>
                                {sub ? (
                                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {sub}
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() =>
                                  setConfirmDetailPreview({
                                    title: label,
                                    layout: "lead",
                                    lead: l,
                                  })
                                }
                                style={{
                                  minWidth: 'auto',
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  flexShrink: 0
                                }}
                                title="View lead details"
                              >
                                <Icons.Eye size={14} aria-hidden />
                                View
                              </button>
                            </div>
                          );
                        }) : (
                          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No leads selected.</div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      <div><strong style={{ color: 'var(--color-text)' }}>Start:</strong> {schedule.launch_now ? 'Immediately on launch' : (schedule.start ? new Date(schedule.start).toLocaleString() : 'Not set')}</div>
                      <div><strong style={{ color: 'var(--color-text)' }}>End:</strong> {schedule.end ? new Date(schedule.end).toLocaleString() : 'Not set'}</div>
                      <div><strong style={{ color: 'var(--color-text)' }}>Timezone:</strong> {schedule.timezone || 'Asia/Karachi'}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {channels.includes('email') && <div><strong style={{ color: 'var(--color-text)' }}>Email/day:</strong> {schedule.email?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX}</div>}
                      {channels.includes('linkedin') && <div><strong style={{ color: 'var(--color-text)' }}>LinkedIn/day:</strong> {schedule.linkedin?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX}</div>}
                      {channels.includes('whatsapp') && <div><strong style={{ color: 'var(--color-text)' }}>WhatsApp/day:</strong> {schedule.whatsapp?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX}</div>}
                      {channels.includes('call') && <div><strong style={{ color: 'var(--color-text)' }}>Calls/day:</strong> {schedule.call?.throttle ?? SCHEDULE_DAILY_LIMIT_MAX}</div>}
                    </div>
                  </div>

                  <div style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--elev-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Preview Details
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(channels.includes('email') || channels.includes('whatsapp') || channels.includes('linkedin')) && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.45,
                          }}
                        >
                          Messaging Templates
                        </div>
                      )}
                      {channels.includes('email') && selectedMessageIndices.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Email Templates</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                            {selectedMessageIndices
                              .map((idx) => ({ idx, msg: messages[idx] }))
                              .filter((it) => typeof it.msg === 'string' && it.msg.trim().length > 0)
                              .map((it, order) => {
                                const parsed = parseMessage(it.msg as string);
                                const title = order === 0 ? 'Initial Email' : `Follow-up ${order}`;
                                return (
                                  <button
                                    key={`confirm-email-${it.idx}-${order}`}
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() =>
                                      setEmailWizardPreview({
                                        title,
                                        metaLine: "Launch confirmation · Email",
                                        subject: parsed.subject || "",
                                        body: parsed.body || (it.msg as string),
                                        kind: "email",
                                      })
                                    }
                                    style={{
                                      justifyContent: 'space-between',
                                      padding: '10px 12px',
                                      borderRadius: 12,
                                      border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                                      background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                                    }}
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                      <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--color-primary-rgb),0.18)' }}>
                                        <Icons.Mail size={13} aria-hidden style={{ color: WIZ_CHANNEL_EMAIL }} />
                                      </span>
                                      <span style={{ minWidth: 0, textAlign: 'left' }}>
                                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                                        <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open preview</span>
                                      </span>
                                    </span>
                                    <Icons.Eye size={15} aria-hidden />
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {channels.includes('whatsapp') && selectedWhatsAppMessageIndices.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>WhatsApp Template</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                            {selectedWhatsAppMessageIndices
                              .map((idx) => ({ idx, msg: whatsAppMessages[idx] }))
                              .filter((it) => typeof it.msg === 'string' && it.msg.trim().length > 0)
                              .map((it, order) => (
                                <button
                                  key={`confirm-wa-${it.idx}-${order}`}
                                  type="button"
                                  className="btn-ghost"
                                  onClick={() =>
                                    setEmailWizardPreview({
                                      title: selectedWhatsAppMessageIndices.length > 1 ? `WhatsApp ${order + 1}` : "WhatsApp",
                                      metaLine: "Launch confirmation · WhatsApp",
                                      subject: "",
                                      body: (it.msg as string) || "",
                                      kind: "whatsapp",
                                    })
                                  }
                                  style={{
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                                    background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                                  }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,211,102,0.15)' }}>
                                      <Icons.WhatsApp size={13} aria-hidden style={{ color: WIZ_CHANNEL_WHATSAPP }} />
                                    </span>
                                    <span style={{ minWidth: 0, textAlign: 'left' }}>
                                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {selectedWhatsAppMessageIndices.length > 1 ? `Template ${order + 1}` : "WhatsApp"}
                                      </span>
                                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open preview</span>
                                    </span>
                                  </span>
                                  <Icons.Eye size={15} aria-hidden />
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {channels.includes('linkedin') &&
                        linkedInStepConfig &&
                        Array.from(
                          new Set(
                            [
                              ...(Array.isArray(linkedInStepConfig.templates) ? linkedInStepConfig.templates : []),
                              linkedInStepConfig.message || "",
                            ]
                              .map((v) => (typeof v === "string" ? v.trim() : ""))
                              .filter((v) => v.length > 0)
                          )
                        ).length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>LinkedIn Templates</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                            {Array.from(
                              new Set(
                                [
                                  ...(Array.isArray(linkedInStepConfig.templates) ? linkedInStepConfig.templates : []),
                                  linkedInStepConfig.message || "",
                                ]
                                  .map((v) => (typeof v === "string" ? v.trim() : ""))
                                  .filter((v) => v.length > 0)
                              )
                            ).map((tpl, idx) => (
                              <button
                                key={`confirm-li-${idx}`}
                                type="button"
                                className="btn-ghost"
                                onClick={() =>
                                  setEmailWizardPreview({
                                    title: `LinkedIn ${idx + 1}`,
                                    metaLine: "Launch confirmation · LinkedIn",
                                    subject: "",
                                    body: tpl,
                                    kind: "linkedin",
                                  })
                                }
                                style={{
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                                  background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                                }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,102,194,0.14)' }}>
                                    <Icons.Linkedin size={13} aria-hidden style={{ color: WIZ_CHANNEL_LINKEDIN }} />
                                  </span>
                                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      Template {idx + 1}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open preview</span>
                                  </span>
                                </span>
                                <Icons.Eye size={15} aria-hidden />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(channels.includes('call') &&
                        (initialPrompt.trim().length > 0 ||
                          systemPersona.trim().length > 0 ||
                          !!selectedVoiceId ||
                          knowledgeBaseFiles.length > 0)) && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.45,
                            marginTop: 2,
                          }}
                        >
                          Calling Setup
                        </div>
                      )}

                      {channels.includes('call') && initialPrompt.trim().length > 0 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() =>
                            setEmailWizardPreview({
                              title: "Opening Message",
                              metaLine: "Launch confirmation · Call script",
                              subject: "",
                              body: initialPrompt,
                              kind: "whatsapp",
                            })
                          }
                          style={{
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                            background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.14)' }}>
                              <MessageCircle size={13} aria-hidden style={{ color: WIZ_CHANNEL_CALL }} />
                            </span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Opening Message</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open script preview</span>
                            </span>
                          </span>
                          <Icons.Eye size={15} aria-hidden />
                        </button>
                      )}

                      {channels.includes('call') && systemPersona.trim().length > 0 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() =>
                            setEmailWizardPreview({
                              title: "Assistant Style",
                              metaLine: "Launch confirmation · Assistant system style",
                              subject: "",
                              body: systemPersona,
                              kind: "whatsapp",
                            })
                          }
                          style={{
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                            background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.14)' }}>
                              <Sparkles size={13} aria-hidden style={{ color: WIZ_CHANNEL_CALL }} />
                            </span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Assistant Style</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open script preview</span>
                            </span>
                          </span>
                          <Icons.Eye size={15} aria-hidden />
                        </button>
                      )}

                      {channels.includes('call') && !!selectedVoiceId && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            const selectedVoiceName =
                              availableVoices.find((v) => v.id === selectedVoiceId)?.name || selectedVoiceId;
                            setConfirmDetailPreview({
                              title: 'Voice',
                              layout: 'voice',
                              voice: { id: selectedVoiceId, name: selectedVoiceName || "Not selected" }
                            });
                          }}
                          style={{
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                            background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.14)' }}>
                              <Play size={13} aria-hidden style={{ color: WIZ_CHANNEL_CALL }} />
                            </span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Voice</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>Open voice preview</span>
                            </span>
                          </span>
                          <Icons.Eye size={15} aria-hidden />
                        </button>
                      )}

                      {channels.includes('call') && knowledgeBaseFiles.length > 0 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            const kbItems = knowledgeBaseFiles.map((f) => ({
                              id: f.id,
                              name: f.name,
                              sizeLabel: formatKbFileSize(f.sizeBytes),
                            }));
                            setConfirmDetailPreview({ title: 'Knowledge Base', layout: 'kb', kbFiles: kbItems });
                          }}
                          style={{
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid rgba(var(--color-primary-rgb), 0.24)',
                            background: 'linear-gradient(180deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)))'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,148,136,0.14)' }}>
                              <FileText size={13} aria-hidden style={{ color: WIZ_CHANNEL_CALL }} />
                            </span>
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Knowledge Base</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>View and download files</span>
                            </span>
                          </span>
                          <Icons.Eye size={15} aria-hidden />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                      Click any item to preview before final launch.
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
                  if (channelAvailability) {
                    const disconnected = channels.filter((c) => !channelAvailability[c as ChannelType]);
                    if (disconnected.length > 0) {
                      const names = disconnected
                        .map(
                          (c) =>
                            getAvailableChannels().find((cfg) => cfg.id === c)?.label ?? c
                        )
                        .join(", ");
                      showWarning(
                        "Channels not connected",
                        `${names} ${disconnected.length === 1 ? "is" : "are"} not connected. Reconnect in Settings or remove ${disconnected.length === 1 ? "it" : "them"} on Step 1 before launching.`
                      );
                      return;
                    }
                  }
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
                        showWarning(
                          "LinkedIn step",
                          "Finish the LinkedIn connection request step in the wizard before launching."
                        );
                        return;
                      }
                    } catch (error) {
                      console.error('Failed to check LinkedIn integration:', error);
                      showError('LinkedIn check failed', 'Failed to verify LinkedIn integration. Please try again.');
                      return;
                    }
                  }

                  const now = new Date();
                  if (!schedule.end) {
                    showWarning('Schedule required', 'Set an end time in Schedule before launching.');
                    void goToWizardStepByType('schedule');
                    return;
                  }
                  const endDate = new Date(schedule.end);
                  if (Number.isNaN(endDate.getTime())) {
                    showWarning('Invalid end time', 'Update end time in Schedule to a valid date/time.');
                    void goToWizardStepByType('schedule');
                    return;
                  }
                  if (schedule.launch_now) {
                    if (endDate <= now) {
                      showWarning('End time passed', 'End time is in the past. Update it in Schedule, then launch.');
                      void goToWizardStepByType('schedule');
                      return;
                    }
                  } else {
                    if (!schedule.start) {
                      showWarning('Start time required', 'Set a start time in Schedule before launching.');
                      void goToWizardStepByType('schedule');
                      return;
                    }
                    const startDate = new Date(schedule.start);
                    if (Number.isNaN(startDate.getTime())) {
                      showWarning('Invalid start time', 'Update start time in Schedule to a valid date/time.');
                      void goToWizardStepByType('schedule');
                      return;
                    }
                    if (startDate <= now) {
                      showWarning('Start time passed', 'Start time is in the past. Update it in Schedule, then launch.');
                      void goToWizardStepByType('schedule');
                      return;
                    }
                    if (endDate <= startDate) {
                      showWarning('Invalid schedule window', 'End time must be after start time.');
                      void goToWizardStepByType('schedule');
                      return;
                    }
                  }
                   
                  launchInProgressRef.current = true;
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
                    
                    if (finalSegments.length === 0 && segments.length > 0) {
                      finalSegments = [...segments];
                    }
                    if (
                      finalSegments.length === 0 &&
                      explicitCampaignTargetLeadIds !== null &&
                      explicitCampaignTargetLeadIds.length > 0
                    ) {
                      finalSegments = buildSegmentsFromLeadIds(new Set(explicitCampaignTargetLeadIds));
                    }
                    
                    if (totalLeads === 0) {
                      showWarning("Leads required", "Select at least one lead before launching the campaign.");
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
                    
                    // Build config object with all necessary fields
                    // Include all throttle settings for all selected channels
                    const config: any = {
                      schedule: {
                        start: schedule.launch_now ? null : (schedule.start || null),
                        end: schedule.end || null,
                        launch_now: !!schedule.launch_now,
                        ...(schedule.timezone?.trim() ? { timezone: schedule.timezone.trim() } : {}),
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
                      showFollowupsNumberInput: showFollowupsNumberInput,
                      ...(explicitCampaignTargetLeadIds !== null && explicitCampaignTargetLeadIds.length > 0
                        ? { target_lead_ids: [...explicitCampaignTargetLeadIds] }
                        : {}),
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

                      // One selected suggestion → single WhatsApp template (not email follow-up sequencing)
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
                              delay_days: 0
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
                            start: schedule.launch_now
                              ? null
                              : campaignScheduleFieldToUtcIso(schedule.start),
                            end: campaignScheduleFieldToUtcIso(schedule.end),
                            launch_now: schedule.launch_now || false,
                            ...(schedule.timezone?.trim()
                              ? { timezone: schedule.timezone.trim() }
                              : {}),
                          },
                        }),
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
                      
                      // Never navigate when launch API fails.
                      return;
                    }
                    
                    // Navigate to campaigns page
                    router.push('/campaigns');
                  } catch (error: any) {
                    console.error('Failed to launch campaign:', error);
                    showError('Launch failed', error?.message || 'Failed to launch campaign. Please try again.');
                  } finally {
                    setLaunching(false);
                    setIsLaunching(false); // Re-enable auto-save
                    launchInProgressRef.current = false;
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
                    <Rocket size={18} strokeWidth={2} aria-hidden style={{ flexShrink: 0 }} />
                    Launch Campaign
                  </>
                )}
              </button>
            </div>

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

      {confirmDetailPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-detail-preview-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10060,
            background: "rgba(15, 23, 42, 0.52)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={closeConfirmDetailPreview}
        >
          <div
            style={{
              width: "min(920px, 96vw)",
              maxHeight: "86vh",
              overflow: "hidden",
              background: "var(--elev-bg)",
              borderRadius: 20,
              boxShadow: "var(--elev-shadow-lg)",
              border: "1px solid var(--elev-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "18px 22px",
                borderBottom: "1px solid var(--elev-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, var(--color-surface)) 0%, var(--color-surface) 100%)",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Preview
                </div>
                <h4 id="confirm-detail-preview-title" style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 700 }}>
                  {confirmDetailPreview.title}
                </h4>
              </div>
              <button type="button" className="btn-ghost" onClick={closeConfirmDetailPreview} style={{ minWidth: "auto", padding: 8 }}>
                <Icons.X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: "calc(86vh - 88px)", overflowY: "auto", padding: "18px 22px" }}>
            {confirmDetailPreview.layout === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(confirmDetailPreview.list || []).length > 0 ? (
                  (confirmDetailPreview.list || []).map((line, idx) => (
                    <div
                      key={`confirm-list-${idx}`}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        background: "var(--color-surface-secondary)",
                        padding: "10px 12px",
                        fontSize: 13,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No content available.</div>
                )}
              </div>
            ) : confirmDetailPreview.layout === "kb" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(confirmDetailPreview.kbFiles || []).length > 0 ? (
                  (confirmDetailPreview.kbFiles || []).map((f) => (
                    <div
                      key={`confirm-kb-${f.id}`}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        background: "var(--color-surface-secondary)",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </div>
                        {f.sizeLabel ? (
                          <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-muted)" }}>{f.sizeLabel}</div>
                        ) : null}
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={reviewKbLoading?.fileId === f.id}
                          onClick={() => {
                            setReviewKbLoading({ fileId: f.id, action: "view" });
                            void fetchKbPdfBlob(f.id, false)
                              .catch((err) => showError("Knowledge base", (err as Error)?.message || "Could not open file"))
                              .finally(() => setReviewKbLoading(null));
                          }}
                          style={{ minWidth: "auto", padding: "6px 10px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          {reviewKbLoading?.fileId === f.id && reviewKbLoading?.action === "view" ? (
                            <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                          ) : (
                            <Icons.Eye size={14} aria-hidden />
                          )}
                          View
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={reviewKbLoading?.fileId === f.id}
                          onClick={() => {
                            setReviewKbLoading({ fileId: f.id, action: "download" });
                            void fetchKbPdfBlob(f.id, true)
                              .catch((err) => showError("Knowledge base", (err as Error)?.message || "Could not download"))
                              .finally(() => setReviewKbLoading(null));
                          }}
                          style={{ minWidth: "auto", padding: "6px 10px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          {reviewKbLoading?.fileId === f.id && reviewKbLoading?.action === "download" ? (
                            <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                          ) : (
                            <Icons.Download size={14} aria-hidden />
                          )}
                          Download
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No files available.</div>
                )}
              </div>
            ) : confirmDetailPreview.layout === "voice" ? (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  background: "var(--color-surface-secondary)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(13,148,136,0.14)",
                    }}
                  >
                    <Play size={16} aria-hidden style={{ color: WIZ_CHANNEL_CALL }} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {confirmDetailPreview.voice?.name || "Voice"}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-muted)" }}>
                      Test the selected voice before launch
                    </div>
                  </div>
                </div>
                {confirmDetailPreview.voice?.id ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={previewLoadingVoiceId === confirmDetailPreview.voice.id}
                    onClick={() => void toggleVoicePreview(confirmDetailPreview.voice!.id)}
                    style={{
                      width: "fit-content",
                      minWidth: 150,
                      padding: "10px 14px",
                      borderRadius: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {previewLoadingVoiceId === confirmDetailPreview.voice.id ? (
                      <RefreshCw size={14} strokeWidth={2} className="animate-spin" aria-hidden />
                    ) : previewingVoiceId === confirmDetailPreview.voice.id ? (
                      <Pause size={14} strokeWidth={2} aria-hidden />
                    ) : (
                      <Play size={14} strokeWidth={2} aria-hidden />
                    )}
                    {previewingVoiceId === confirmDetailPreview.voice.id ? "Pause voice" : "Preview voice"}
                  </button>
                ) : null}
              </div>
            ) : confirmDetailPreview.layout === "lead" ? (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  background: "var(--color-surface-secondary)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {(() => {
                  const l = confirmDetailPreview.lead;
                  if (!l) {
                    return (
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        Lead details are not available.
                      </div>
                    );
                  }
                  const fullName = [l.first_name, l.last_name].filter(Boolean).join(" ").trim();
                  const displayName = fullName || l.email || `Lead #${l.id}`;
                  const linkedInUrl = getLinkedInUrlFromLead(l);
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(var(--color-primary-rgb),0.16)",
                          }}
                        >
                          <Icons.User size={16} aria-hidden style={{ color: "var(--color-primary)" }} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: "var(--color-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {displayName}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, color: "var(--color-text-muted)" }}>
                            Lead ID: {l.id}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Role</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.role || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Company</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.company || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Email</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.email || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Phone</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.phone || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Tier</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.tier || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Score</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.score ?? "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Industry</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)" }}>{l.industry || "—"}</div>
                        </div>
                        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, background: "var(--color-surface)" }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>LinkedIn</div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text)", overflowWrap: "anywhere" }}>{linkedInUrl || "—"}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  background: "var(--color-surface-secondary)",
                  padding: "14px 16px",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {confirmDetailPreview.text || "No content available."}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

