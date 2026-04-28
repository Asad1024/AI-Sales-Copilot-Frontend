"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, streamGenerateLeads, setUser, getUser, type User } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { ImportModalFrame } from "@/components/leads/ImportModalChrome";
import { getEmailInfo } from "@/utils/emailNormalization";
import { getPhoneInfo } from "@/utils/phoneNormalization";

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerated: (rows: any[]) => void;
  onAsyncEnrichmentStarted?: (payload: {
    leadIds: number[];
    enrichmentIds: string[];
    pendingCount: number;
  }) => void;
};

function countContactGapsForLeads(leads: any[]) {
  let missingEmail = 0;
  let missingPhone = 0;
  for (const lead of leads) {
    const e = getEmailInfo(lead?.email, lead?.enrichment);
    if (!e.isValid) missingEmail += 1;
    const p = getPhoneInfo(lead?.phone, lead?.enrichment);
    if (!p.isValid) missingPhone += 1;
  }
  return { missingEmail, missingPhone, total: leads.length };
}

/**
 * Map server phases to cumulative weight bands so % never goes backward when a new
 * phase resets done/total (extract 1/1 was 100%, then search 0/n read as 0%).
 */
const LEAD_GEN_STAGE_BAND: Record<string, readonly [number, number]> = {
  extract: [0, 10],
  search: [10, 38],
  research: [38, 88],
  save: [88, 100],
};

function overallLeadGenPercent(stage: string, done: number, total: number): number {
  const s = (stage || "").toLowerCase();
  const band = LEAD_GEN_STAGE_BAND[s] ?? [0, 100];
  const [lo, hi] = band;
  const safeTotal = Math.max(1, Number(total) || 1);
  const d = Math.min(Math.max(0, Number(done) || 0), safeTotal);
  const frac = d / safeTotal;
  return Math.min(100, Math.max(0, Math.round(lo + frac * (hi - lo))));
}

const AI_LEAD_PROMPT_MAX_CHARS = 150;
const AI_LEAD_COUNT_MIN = 10;
const AI_LEAD_COUNT_MAX = 100;

function getSpeechRecognitionCtor(): unknown {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type LeadGenQuickSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

const DEFAULT_LEAD_GEN_QUICK_SUGGESTIONS: LeadGenQuickSuggestion[] = [
  {
    id: "chip-role-hr-manager",
    label: "HR Manager",
    prompt:
      "Find HR Managers at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-talent-acquisition-manager",
    label: "Talent Acquisition Manager",
    prompt:
      "Find Talent Acquisition Managers at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-engineering-manager",
    label: "Engineering Manager",
    prompt:
      "Find Engineering Managers at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-head-of-product",
    label: "Head of Product",
    prompt:
      "Find Heads of Product at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-vp-sales",
    label: "VP Sales",
    prompt:
      "Find VP Sales leaders at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-account-executive",
    label: "Account Executive",
    prompt:
      "Find Account Executives at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-marketing-manager",
    label: "Marketing Manager",
    prompt:
      "Find Marketing Managers at established software companies in Dubai with 200-500 employees.",
  },
  {
    id: "chip-role-customer-success-manager",
    label: "Customer Success Manager",
    prompt:
      "Find Customer Success Managers at established software companies in Dubai with 200-500 employees.",
  },
];

export default function AIGenerateModal({ open, onClose, onGenerated, onAsyncEnrichmentStarted }: Props) {
  const router = useRouter();
  const { activeBaseId } = useBase();
  const { showSuccess, showError } = useNotification();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  /** Real server-reported progress from NDJSON /leads/generate-stream. */
  const [genStream, setGenStream] = useState({ stage: "", done: 0, total: 0, label: "" });
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [showEnrichPopup, setShowEnrichPopup] = useState(false);
  const [generatedLeads, setGeneratedLeads] = useState<any[]>([]);
  const [enrichSubmitting, setEnrichSubmitting] = useState(false);
  const quickSuggestions = DEFAULT_LEAD_GEN_QUICK_SUGGESTIONS;
  const [selectedQuickSuggestionId, setSelectedQuickSuggestionId] = useState<string | null>(null);
  /** Short delay before applying a quick suggestion so the pill can show a “Crafting…” state. */
  const [craftingQuickSuggestionId, setCraftingQuickSuggestionId] = useState<string | null>(null);
  const craftingQuickSuggestionTimerRef = useRef<number | null>(null);
  /** Shown on primary CTA after a successful run (until modal closes or a new run starts). */
  const [postGenSuccess, setPostGenSuccess] = useState<{ count: number } | null>(null);
  const [speechListening, setSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  /** AI prompt token allowance from server (refreshed when modal opens and after a successful run). */
  const [meTokens, setMeTokens] = useState<{ bal: number; monthly: number } | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"tokens" | "credits">("tokens");
  const speechRecRef = useRef<{
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: {
      resultIndex: number;
      results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
    }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
  } | null>(null);
  const speechPrefixRef = useRef("");
  const speechAccumulatedFinalRef = useRef("");
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const leadGenProgressRef = useRef<HTMLDivElement | null>(null);
  const handleGenerateRef = useRef<() => void>(() => {});
  const modalKeyboardRef = useRef({
    generating: false,
    craftingQuickSuggestionId: null as string | null,
    prompt: "",
    activeBaseId: null as number | null,
  });

  const contactGaps = useMemo(() => countContactGapsForLeads(generatedLeads), [generatedLeads]);
  const hasContactGapsToEnrich = contactGaps.missingEmail > 0 || contactGaps.missingPhone > 0;

  const blockingQuickSuggestionUi = generating || Boolean(craftingQuickSuggestionId);

  modalKeyboardRef.current = {
    generating,
    craftingQuickSuggestionId,
    prompt,
    activeBaseId,
  };

  const handleEnrichAfterGenerate = useCallback(async () => {
    const leadIds = generatedLeads.map((l) => l?.id).filter((id) => id != null).map(Number);
    if (!activeBaseId || leadIds.length === 0) {
      showError("Nothing to enrich", "No leads were found to enrich.");
      return;
    }
    setEnrichSubmitting(true);
    setError("");
    try {
      const response = await apiRequest("/leads/bulk-enrich", {
        method: "POST",
        body: JSON.stringify({
          lead_ids: leadIds,
          base_id: activeBaseId,
          enrichment_type: "contact",
          only_fullenrich: true,
        }),
      });
      const enrichmentIds = Array.isArray(response?.enrichment_ids)
        ? response.enrichment_ids.filter((id: unknown) => typeof id === "string" && String(id).trim().length > 0)
        : [];
      const pendingCount =
        typeof response?.pending_count === "number" ? response.pending_count : leadIds.length;

      onAsyncEnrichmentStarted?.({ leadIds, enrichmentIds, pendingCount });
      showSuccess(
        "Enrichment started",
        "Watch the leads table for the progress banner and row tags until FullEnrich finishes."
      );
      setShowEnrichPopup(false);
      void onGenerated([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start enrichment.";
      showError("Couldn't start enrichment", msg);
    } finally {
      setEnrichSubmitting(false);
    }
  }, [activeBaseId, generatedLeads, onAsyncEnrichmentStarted, onGenerated, showError, showSuccess]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || typeof Ctor !== "function") return;
    const rec = new (Ctor as new () => NonNullable<typeof speechRecRef.current>)();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

    rec.onstart = () => {
      setSpeechListening(true);
    };

    rec.onresult = (event: {
      resultIndex: number;
      results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
    }) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          speechAccumulatedFinalRef.current += piece;
        } else {
          interim += piece;
        }
      }
      const prefix = speechPrefixRef.current;
      const finals = speechAccumulatedFinalRef.current;
      const sep =
        prefix.length > 0 && (finals.length > 0 || interim.length > 0) && !prefix.endsWith(" ") ? " " : "";
      const combined = prefix + sep + finals + interim;
      setPrompt(combined.slice(0, AI_LEAD_PROMPT_MAX_CHARS));
      setError("");
    };

    rec.onerror = (event: { error: string }) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setSpeechListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Allow the mic in your browser settings to use voice input.");
      }
    };

    rec.onend = () => {
      setSpeechListening(false);
    };

    speechRecRef.current = rec;
    setSpeechSupported(true);
    return () => {
      speechRecRef.current = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setPostGenSuccess(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const d = (await apiRequest(`/auth/me?_=${Date.now()}`)) as { user?: User };
        if (cancelled || !d?.user) return;
        setUser(d.user);
        setMeTokens({
          bal: Number(d.user.ai_prompt_tokens_balance ?? 0),
          monthly: Number(d.user.monthly_ai_prompt_tokens ?? 0),
        });
      } catch {
        if (!cancelled) setMeTokens({ bal: 0, monthly: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    const rec = speechRecRef.current;
    if (!rec) return;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
    setSpeechListening(false);
  }, [open]);

  const toggleSpeechInput = useCallback(() => {
    const rec = speechRecRef.current;
    if (!rec) return;
    if (speechListening) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      return;
    }
    speechPrefixRef.current = prompt;
    speechAccumulatedFinalRef.current = "";
    setError("");
    try {
      rec.start();
    } catch {
      setError("Could not start voice input. Try again or refresh the page.");
    }
  }, [prompt, speechListening]);

  const promptTokenCost = prompt.trim().length;
  const tokenBalance = meTokens?.bal ?? 0;
  const tokenMonthly = meTokens?.monthly ?? 0;
  const insufficientTokens = meTokens !== null && promptTokenCost > 0 && tokenBalance < promptTokenCost;
  const noTokens = meTokens !== null && tokenBalance <= 0;

  const genPct = useMemo(() => {
    if (!generating) return 0;
    return overallLeadGenPercent(genStream.stage, genStream.done, genStream.total);
  }, [generating, genStream.stage, genStream.done, genStream.total]);
  const genShowCounts =
    generating &&
    genStream.total > 0 &&
    genStream.stage !== "extract" &&
    ["search", "research", "save"].includes(genStream.stage);
  /** Backend often puts `done/total` in `label` (e.g. "Research 7/10"); avoid appending the same fraction again. */
  const genShowCountsExtra =
    genShowCounts &&
    !(typeof genStream.label === "string" && genStream.label.includes(`${genStream.done}/${genStream.total}`));
  const generationComplete = Boolean(postGenSuccess) && !generating;

  const clampLeadCount = useCallback(
    (value: number) => Math.min(AI_LEAD_COUNT_MAX, Math.max(AI_LEAD_COUNT_MIN, value)),
    []
  );
  const decrementCount = useCallback(() => setCount((v) => clampLeadCount(v - 1)), [clampLeadCount]);
  const incrementCount = useCallback(() => setCount((v) => clampLeadCount(v + 1)), [clampLeadCount]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt describing the leads you want to generate");
      return;
    }

    if (!activeBaseId) {
      setError("Please select a base first");
      return;
    }

    setGenStream({ stage: "extract", done: 0, total: 1, label: "Starting…" });
    setGenerating(true);
    setPostGenSuccess(null);
    setError("");
    setProgress("");

    try {
      const complete = await streamGenerateLeads(
        { prompt: prompt.trim(), base_id: activeBaseId, count },
        (e) => {
          setGenStream({
            stage: e.stage,
            done: e.done,
            total: e.total,
            label: e.label || "",
          });
        }
      );

      const rows = Array.isArray(complete.leads) ? complete.leads : [];
      if (rows.length > 0) {
        try {
          const d = (await apiRequest(`/auth/me?_=${Date.now()}`)) as { user?: User };
          if (d?.user) {
            setUser(d.user);
            setMeTokens({
              bal: Number(d.user.ai_prompt_tokens_balance ?? 0),
              monthly: Number(d.user.monthly_ai_prompt_tokens ?? 0),
            });
          } else if (typeof complete.ai_prompt_tokens_balance === "number") {
            const u = getUser();
            if (u) {
              setUser({ ...u, ai_prompt_tokens_balance: complete.ai_prompt_tokens_balance });
              setMeTokens((prev) => ({
                bal: complete.ai_prompt_tokens_balance as number,
                monthly: prev?.monthly ?? Number(u.monthly_ai_prompt_tokens ?? 0),
              }));
            }
          }
        } catch {
          /* ignore refresh errors */
        }
        setGenStream((s) => ({
          ...s,
          done: rows.length,
          total: Math.max(rows.length, s.total || rows.length),
          label: "Complete",
        }));
        setPostGenSuccess({ count: rows.length });
        setProgress(`Successfully generated ${rows.length} leads!`);
        setGeneratedLeads(rows);
        onGenerated(rows);
        setTimeout(() => {
          setShowEnrichPopup(true);
          setPrompt("");
          setProgress("");
          setPostGenSuccess(null);
          setCount(10);
          setError("");
        }, 1500);
      } else {
        throw new Error("No leads were generated");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        status: error?.status,
        response: error?.response?.data
      });
      
      // Extract error message - handle different error formats
      let errorMessage = "Failed to generate leads. Please try again.";
      
      // Priority 1: Use error.message if it's not just the class name
      if (error?.message && 
          error.message !== "APIError" && 
          error.message !== "BadRequestError" &&
          error.message !== "Error") {
        errorMessage = error.message;
      } 
      // Priority 2: Check response data message
      else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } 
      // Priority 3: Check response data error (if it's not just the class name)
      else if (error?.response?.data?.error && 
               error.response.data.error !== "BadRequestError" &&
               error.response.data.error !== "APIError") {
        errorMessage = error.response.data.error;
      }
      
      const msg = String(errorMessage || "");
      if (/not enough lead credits/i.test(msg)) {
        setUpgradeReason("credits");
        setShowUpgradePrompt(true);
        setError("");
      } else if (/not enough ai prompt tokens/i.test(msg)) {
        setUpgradeReason("tokens");
        setShowUpgradePrompt(true);
        setError("");
      } else {
        setError(errorMessage);
      }
      setProgress("");
    } finally {
      setGenerating(false);
      setGenStream({ stage: "", done: 0, total: 0, label: "" });
    }
  };

  const handleGenerateClick = useCallback(() => {
    if (blockingQuickSuggestionUi) return;
    if (!postGenSuccess && !prompt.trim()) return;
    if (!postGenSuccess && (noTokens || insufficientTokens)) {
      setUpgradeReason("tokens");
      setShowUpgradePrompt(true);
      return;
    }
    handleGenerateRef.current();
  }, [blockingQuickSuggestionUi, insufficientTokens, noTokens, postGenSuccess, prompt]);

  const CRAFTING_QUICK_SUGGESTION_MS = 1100;

  const beginQuickSuggestion = useCallback(
    (item: LeadGenQuickSuggestion) => {
      if (generating) return;
      if (craftingQuickSuggestionTimerRef.current) {
        clearTimeout(craftingQuickSuggestionTimerRef.current);
        craftingQuickSuggestionTimerRef.current = null;
      }
      setError("");
      setCraftingQuickSuggestionId(item.id);
      const tid = window.setTimeout(() => {
        craftingQuickSuggestionTimerRef.current = null;
        setCraftingQuickSuggestionId(null);
        setSelectedQuickSuggestionId(item.id);
        setPrompt(item.prompt.slice(0, AI_LEAD_PROMPT_MAX_CHARS));
        setProgress("");
        window.setTimeout(() => promptInputRef.current?.focus({ preventScroll: true }), 0);
      }, CRAFTING_QUICK_SUGGESTION_MS);
      craftingQuickSuggestionTimerRef.current = typeof tid === "number" ? tid : null;
    },
    [generating]
  );

  useEffect(() => {
    if (open) return;
    if (craftingQuickSuggestionTimerRef.current) {
      clearTimeout(craftingQuickSuggestionTimerRef.current);
      craftingQuickSuggestionTimerRef.current = null;
    }
    setCraftingQuickSuggestionId(null);
  }, [open]);

  useEffect(() => {
    return () => {
      if (craftingQuickSuggestionTimerRef.current) {
        clearTimeout(craftingQuickSuggestionTimerRef.current);
        craftingQuickSuggestionTimerRef.current = null;
      }
    };
  }, []);

  handleGenerateRef.current = () => {
    void handleGenerate();
  };

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      promptInputRef.current?.focus({ preventScroll: true });
    }, 90);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open || !generating) return;
    const id = window.setTimeout(() => {
      leadGenProgressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, generating]);

  useEffect(() => {
    if (!open || !generating) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, generating]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const m = modalKeyboardRef.current;
      if (e.key === "Escape") {
        if (m.generating || m.craftingQuickSuggestionId) return;
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (m.generating || m.craftingQuickSuggestionId || !m.prompt.trim() || !m.activeBaseId) return;
        const cost = m.prompt.trim().length;
        const bal = Number(getUser()?.ai_prompt_tokens_balance ?? 0);
        if (cost > 0 && bal < cost) return;
        e.preventDefault();
        void handleGenerateRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -240px 0; }
          100% { background-position: 240px 0; }
        }
      `}} />

      <ImportModalFrame
        open={open}
        onClose={onClose}
        title="Generate leads with AI"
        subtitle="Describe your ideal customer — we'll add qualified rows to this workspace"
        headerTint="linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.26) 0%, rgba(var(--color-primary-rgb), 0.14) 100%)"
        icon={<Icons.Sun size={22} strokeWidth={2} style={{ color: "var(--color-primary)" }} />}
        headerTitleColor="var(--color-text)"
        headerSubtitleColor="var(--color-text-muted)"
        headerBorderColor="rgba(var(--color-primary-rgb), 0.26)"
        hideHeaderBottomBorder
        headerIconContainerStyle={{
          background: "rgba(var(--color-primary-rgb), 0.16)",
          border: "1px solid rgba(var(--color-primary-rgb), 0.32)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
          width: 44,
          height: 44,
        }}
        headerCloseButtonStyle={{
          background: "rgba(var(--color-primary-rgb), 0.16)",
          border: "1px solid rgba(var(--color-primary-rgb), 0.35)",
          color: "var(--color-primary)",
          width: 40,
          height: 40,
          borderRadius: 12,
        }}
        frameBorderRadius={12}
        maxWidth={820}
        maxModalHeight="min(92vh, 900px)"
        closeDisabled={blockingQuickSuggestionUi}
        dialogBackground="var(--color-surface)"
      >
        <div
          className="persona-ai-panel-reveal ai-generate-modal-body"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "transparent",
          }}
        >
          {!activeBaseId ? (
            <div className="ai-generate-workspace-alert" role="alert">
              <Icons.AlertCircle size={18} strokeWidth={2} aria-hidden />
              <span>Select a workspace in the header before generating leads.</span>
            </div>
          ) : null}

          <div
            style={{
              padding: "0 0 4px",
              borderRadius: 0,
              background: "transparent",
              border: "none",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                marginBottom: 8,
              }}
            >
              Quick suggestions
            </div>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--color-text-muted)",
              }}
            >
              One click fills the prompt below. Your merged list is stored in the browser on this device.
            </p>
            <div
              className="ai-generate-suggestions-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
                gap: 10,
                paddingTop: 2,
              }}
            >
              {quickSuggestions.map((item) => {
                const loadingChip = craftingQuickSuggestionId === item.id;
                const activeChip = selectedQuickSuggestionId === item.id || loadingChip;
                const disabled = blockingQuickSuggestionUi;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => beginQuickSuggestion(item)}
                    disabled={disabled}
                    className={`ai-generate-suggestion-pill${activeChip ? " ai-generate-suggestion-pill--active" : ""}${
                      loadingChip ? " ai-generate-suggestion-pill--loading" : ""
                    }`}
                    title={item.prompt}
                  >
                    {loadingChip ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.2) 50%, rgba(var(--color-primary-rgb), 0.2) 100%)",
                            backgroundSize: "200px 100%",
                            animation: "shimmer 1.1s linear infinite",
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>Crafting…</span>
                      </span>
                    ) : (
                      <span style={{ fontWeight: 600, textAlign: "left" as const, display: "block" }}>{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="ai-lead-prompt"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Describe your ideal customer
            </label>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "transparent",
                overflow: "hidden",
              }}
            >
              <textarea
                ref={promptInputRef}
                id="ai-lead-prompt"
                value={prompt}
                maxLength={AI_LEAD_PROMPT_MAX_CHARS}
                onChange={(e) => {
                  setPrompt(e.target.value.slice(0, AI_LEAD_PROMPT_MAX_CHARS));
                  if (selectedQuickSuggestionId) setSelectedQuickSuggestionId(null);
                  setError("");
                }}
                rows={4}
                placeholder="Example: VP Sales at B2B software firms in Dubai, 200–500 employees, selling to GCC enterprises"
                disabled={blockingQuickSuggestionUi}
                className="input ai-generate-prompt-textarea"
                style={{
                  width: "100%",
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: "10px 14px",
                  minHeight: 100,
                  maxHeight: 220,
                  resize: "vertical",
                  borderRadius: 0,
                  boxSizing: "border-box",
                  border: "none",
                  background: "transparent",
                }}
              />
              <div
                style={{
                  borderRadius: 0,
                  border: "none",
                  borderTop: "1px solid var(--color-border)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: speechListening ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: speechListening ? 600 : 500,
                    transition: "color 0.2s ease",
                    flex: "1 1 160px",
                    minWidth: 0,
                  }}
                >
                  {speechListening
                    ? "Speak now — we're listening…"
                    : "Tip: say titles, industry, Dubai, and 200–500 employees."}
                </span>
                <span
                  className="ai-generate-char-count"
                  style={
                    prompt.length >= AI_LEAD_PROMPT_MAX_CHARS
                      ? { color: "var(--color-warning, #d97706)", fontWeight: 600 }
                      : undefined
                  }
                >
                  {prompt.length.toLocaleString()}/{AI_LEAD_PROMPT_MAX_CHARS} characters
                </span>
                <button
                  type="button"
                  onClick={() => void toggleSpeechInput()}
                  disabled={!speechSupported || blockingQuickSuggestionUi}
                  aria-pressed={speechListening}
                  aria-label={speechListening ? "Stop voice input" : "Start voice input"}
                  title={
                    !speechSupported
                      ? "Voice input needs a browser with speech recognition (e.g. Chrome or Edge)."
                      : speechListening
                        ? "Stop dictation"
                        : "Dictate with your voice"
                  }
                  style={{
                    width: "auto",
                    minWidth: speechListening ? 88 : 72,
                    height: 30,
                    borderRadius: 8,
                    border: speechListening
                      ? "1px solid rgba(var(--color-primary-rgb), 0.2)"
                      : "1px solid var(--color-border)",
                    background: speechListening ? "rgba(var(--color-primary-rgb), 0.2)" : "var(--color-surface)",
                    color: speechListening ? "var(--color-primary)" : "var(--color-text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      !speechSupported || blockingQuickSuggestionUi ? "not-allowed" : "pointer",
                    opacity: !speechSupported ? 0.45 : 1,
                    transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                    position: "relative",
                    flexShrink: 0,
                    padding: "0 10px",
                  }}
                >
                  <Icons.Sun size={18} strokeWidth={2} />
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>
                    {speechListening ? "Speak…" : "Voice"}
                  </span>
                  {speechListening ? (
                    <span
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#ef4444",
                        animation: "pulse 1.2s ease-in-out infinite",
                      }}
                    />
                  ) : null}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.09)",
                border: "1px solid rgba(239, 68, 68, 0.28)",
                borderRadius: 8,
                color: "#ef4444",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icons.AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</span>
            </div>
          ) : null}

          {progress && !generating && !craftingQuickSuggestionId ? (
            <div
              style={{
                padding: "10px 12px",
                background: "rgba(34, 197, 94, 0.10)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 8,
                color: "#16a34a",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icons.CheckCircle size={17} />
              <span>{progress}</span>
            </div>
          ) : null}

          <div
            className="ai-generate-actions-wrap"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: -4,
              paddingTop: 0,
              width: "100%",
            }}
          >
            <p className="ai-generate-target-line">
              We&apos;ll aim for <strong>{count}</strong> new {count === 1 ? "lead" : "leads"} (minimum{" "}
              <strong>{AI_LEAD_COUNT_MIN}</strong> per run) and add them to your list (subject to availability).
            </p>
            {meTokens !== null ? (
              <p
                className="ai-generate-target-line"
                style={{
                  marginTop: -4,
                  marginBottom: 0,
                  color: insufficientTokens ? "#b45309" : undefined,
                }}
              >
                AI prompt tokens: <strong>{tokenBalance.toLocaleString()}</strong>
                {tokenMonthly > 0 ? (
                  <>
                    {" "}
                    / {tokenMonthly.toLocaleString()} this period
                    {promptTokenCost > 0 ? (
                      <>
                        {" "}
                        · this prompt: <strong>{promptTokenCost.toLocaleString()}</strong> tokens
                      </>
                    ) : (
                      <> · type above to see how many tokens this run will use</>
                    )}
                  </>
                ) : (
                  <>
                    {" "}
                    remaining
                    {promptTokenCost > 0 ? (
                      <>
                        {" "}
                        · this prompt: <strong>{promptTokenCost.toLocaleString()}</strong> tokens
                      </>
                    ) : (
                      <> · each character in your prompt uses one token</>
                    )}
                  </>
                )}
                {insufficientTokens ? " — not enough tokens to run." : ""}
              </p>
            ) : null}

            <div className="ai-generate-primary-row">
              <div
                className="ai-generate-qty-stepper"
                style={blockingQuickSuggestionUi ? { opacity: 0.75 } : undefined}
              >
                <span className="ai-generate-qty-label">How many leads</span>
                <button
                  type="button"
                  onClick={decrementCount}
                  disabled={blockingQuickSuggestionUi || count <= AI_LEAD_COUNT_MIN}
                  aria-label="Decrease lead count"
                  className="ai-generate-qty-btn"
                >
                  -
                </button>
                <span className="ai-generate-qty-value">{count}</span>
                <button
                  type="button"
                  onClick={incrementCount}
                  disabled={blockingQuickSuggestionUi}
                  aria-label="Increase lead count"
                  className="ai-generate-qty-btn"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={`btn-primary ai-generate-generate-btn${generationComplete ? " ai-generate-success-cta" : ""}`}
                onClick={handleGenerateClick}
                disabled={
                  blockingQuickSuggestionUi ||
                  (!postGenSuccess && !prompt.trim())
                }
                aria-busy={generating}
              >
                {generating ? (
                  <>
                    <Icons.Loader size={16} strokeWidth={2} className="animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : generationComplete && postGenSuccess ? (
                  <>
                    <Icons.Check size={16} strokeWidth={2.5} />
                    Done — {postGenSuccess.count} lead{postGenSuccess.count === 1 ? "" : "s"} generated
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={15} />
                    Generate leads
                  </>
                )}
              </button>
            </div>

            {generating ? (
              <div
                ref={leadGenProgressRef}
                className="ai-generate-progress-panel"
                role="status"
                aria-live="polite"
              >
                <div className="ai-generate-progress-panel__top">
                  <span className="ai-generate-progress-panel__label">
                    {genStream.label || "Generating leads…"}
                  </span>
                  <span className="ai-generate-progress-panel__pct">
                    {genPct}%
                    {genShowCountsExtra ? ` (${genStream.done}/${genStream.total})` : ""}
                  </span>
                </div>
                <div className="ai-generate-progress-track">
                  <div
                    className="ai-generate-progress-fill"
                    style={{
                      width: `${Math.max(3, genPct)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </ImportModalFrame>

      {showUpgradePrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.52)",
            zIndex: 2100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowUpgradePrompt(false)}
          role="presentation"
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background:
                "linear-gradient(180deg, rgba(255,247,237,1) 0%, rgba(255,255,255,1) 48%), radial-gradient(1200px 260px at 18% 0%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0) 60%)",
              borderRadius: 16,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              boxShadow: "0 28px 90px rgba(2, 6, 23, 0.34)",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to get more tokens"
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(249, 115, 22, 0.14)",
                    border: "1px solid rgba(249, 115, 22, 0.30)",
                    color: "#c2410c",
                    flex: "0 0 auto",
                  }}
                >
                  <Icons.Sparkles size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>
                    {upgradeReason === "credits"
                      ? "Not enough lead credits"
                      : "You're out of AI prompt tokens"}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15, 23, 42, 0.72)", lineHeight: 1.5 }}>
                    {upgradeReason === "credits"
                      ? "Upgrade to keep generating leads and grow your pipeline without limits."
                      : "Upgrade to keep generating leads with AI and unlock more tokens each billing period."}
                  </div>
                  {meTokens !== null ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15, 23, 42, 0.62)" }}>
                      {upgradeReason === "tokens" ? (
                        <>
                          Available now: <strong>{tokenBalance.toLocaleString()}</strong>
                          {tokenMonthly > 0 ? <> / {tokenMonthly.toLocaleString()} this period</> : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradePrompt(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                  background: "rgba(248, 250, 252, 0.9)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(15, 23, 42, 0.75)",
                  flex: "0 0 auto",
                }}
                aria-label="Close"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(15, 23, 42, 0.10)",
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {upgradeReason === "credits" ? "What you’ll get with an upgrade" : "Why upgrade?"}
              </div>
              <ul
                style={{
                  margin: "10px 0 0",
                  paddingLeft: 18,
                  fontSize: 12.5,
                  color: "rgba(15, 23, 42, 0.72)",
                  lineHeight: 1.55,
                }}
              >
                <li>
                  {upgradeReason === "credits"
                    ? "More lead credits so you can generate bigger lists in one go."
                    : "More AI prompt tokens so longer prompts can run instantly."}
                </li>
                <li>Higher monthly limits and fewer interruptions while prospecting.</li>
                <li>Renew anytime — your new limits apply immediately after upgrade.</li>
              </ul>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowUpgradePrompt(false)}
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(15, 23, 42, 0.16)",
                  background: "rgba(255, 255, 255, 0.85)",
                  color: "rgba(15, 23, 42, 0.82)",
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: "0 1px 0 rgba(2, 6, 23, 0.04)",
                }}
              >
                Not now
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowUpgradePrompt(false);
                  router.push("/upgrade");
                }}
              >
                View plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-generation: optional FullEnrich contact flow (same as toolbar Enrich → contact-only) */}
      {showEnrichPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.52)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(12px) saturate(1.1)",
            WebkitBackdropFilter: "blur(12px) saturate(1.1)",
            animation: "fadeIn 0.22s ease-out",
          }}
          onClick={() => {
            if (enrichSubmitting) return;
            setShowEnrichPopup(false);
            onClose();
          }}
        >
          <div
            style={{
              width: "min(520px, 96vw)",
              background: hasContactGapsToEnrich ? "#ffffff" : "linear-gradient(180deg, #ffffff 0%, #f8fffc 100%)",
              border: hasContactGapsToEnrich ? "1px solid rgba(148, 163, 184, 0.25)" : "1px solid rgba(16, 185, 129, 0.18)",
              borderRadius: 18,
              padding: 0,
              boxShadow: hasContactGapsToEnrich
                ? "0 24px 64px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255,255,255,0.5) inset"
                : "0 28px 72px rgba(5, 150, 105, 0.12), 0 16px 40px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255,255,255,0.6) inset",
              animation: "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-success-title"
          >
            <div
              style={{
                padding: hasContactGapsToEnrich ? "22px 24px 20px" : "28px 26px 24px",
                borderBottom: hasContactGapsToEnrich ? "1px solid rgba(255,255,255,0.2)" : "none",
                background: hasContactGapsToEnrich
                  ? "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 88%, #000000) 0%, var(--color-primary) 48%, color-mix(in srgb, var(--color-primary) 86%, #ffffff) 100%)"
                  : "linear-gradient(145deg, #047857 0%, #059669 38%, #10b981 72%, #34d399 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: hasContactGapsToEnrich ? 44 : 52,
                    height: hasContactGapsToEnrich ? 44 : 52,
                    borderRadius: 14,
                    background: hasContactGapsToEnrich
                      ? "rgba(255,255,255,0.22)"
                      : "rgba(255,255,255,0.25)",
                    border: "1px solid rgba(255,255,255,0.42)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {hasContactGapsToEnrich ? (
                    <Icons.User size={24} strokeWidth={2} style={{ color: "#ffffff" }} aria-hidden />
                  ) : (
                    <Icons.CheckCircle size={26} strokeWidth={1.85} style={{ color: "#ffffff" }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    id="ai-generate-success-title"
                    style={{
                      margin: 0,
                      fontSize: hasContactGapsToEnrich ? 19 : 20,
                      fontWeight: 700,
                      color: "#ffffff",
                      letterSpacing: "-0.035em",
                      lineHeight: 1.22,
                      textShadow: hasContactGapsToEnrich ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    {hasContactGapsToEnrich ? "Some contact details are missing" : "You’re all set"}
                  </h3>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.92)",
                      lineHeight: 1.55,
                      fontWeight: 500,
                    }}
                  >
                    {hasContactGapsToEnrich
                      ? `We saved ${contactGaps.total} lead${contactGaps.total === 1 ? "" : "s"}. Enrichment did not return a usable email or phone for every row — you can run FullEnrich now or finish later in the table.`
                      : `All ${contactGaps.total} lead${contactGaps.total === 1 ? "" : "s"} have verified email and phone — nothing else is needed for contacts.`}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: hasContactGapsToEnrich ? "18px 22px 22px" : "8px 24px 26px",
                background: hasContactGapsToEnrich
                  ? "var(--color-surface-secondary, #f8fafc)"
                  : "linear-gradient(180deg, rgba(236, 253, 245, 0.65) 0%, #ffffff 55%)",
                borderTop: hasContactGapsToEnrich ? "1px solid var(--color-border)" : "none",
              }}
            >
              {hasContactGapsToEnrich ? (
                <>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#a8988e",
                    }}
                  >
                    Gaps in this batch
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid #e8e4dc",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#a8988e",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Missing email
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#1f2937",
                          marginTop: 4,
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1.1,
                        }}
                      >
                        {contactGaps.missingEmail}
                      </div>
                      <div style={{ fontSize: 11, color: "#78716c", marginTop: 6, lineHeight: 1.4 }}>
                        Leads without a valid address (includes placeholders)
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid #e8e4dc",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#a8988e",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Missing phone
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "#1f2937",
                          marginTop: 4,
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1.1,
                        }}
                      >
                        {contactGaps.missingPhone}
                      </div>
                      <div style={{ fontSize: 11, color: "#78716c", marginTop: 6, lineHeight: 1.4 }}>
                        Leads without a usable phone number
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 10,
                      padding: "12px 14px",
                      background: "rgba(var(--color-primary-rgb), 0.2)",
                      border: "1px solid rgba(var(--color-primary-rgb), 0.2)",
                      fontSize: 12,
                      color: "#57534e",
                      lineHeight: 1.55,
                      marginBottom: 18,
                    }}
                  >
                    <strong style={{ color: "#4c1d95" }}>FullEnrich</strong> runs in the background. Your leads table will
                    show the same progress banner and row status as when you enrich from the toolbar, until webhooks
                    finish.
                  </div>
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 8px 12px",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      margin: "0 auto 16px",
                      borderRadius: "50%",
                      background: "linear-gradient(145deg, rgba(16, 185, 129, 0.18) 0%, rgba(52, 211, 153, 0.12) 100%)",
                      border: "1px solid rgba(16, 185, 129, 0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 12px 32px rgba(5, 150, 105, 0.12)",
                    }}
                    aria-hidden
                  >
                    <Icons.Sparkles size={28} strokeWidth={1.75} style={{ color: "#059669" }} />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "#475569",
                      lineHeight: 1.65,
                      fontWeight: 500,
                      maxWidth: 400,
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  >
                    Contact fields are complete. You can use{" "}
                    <strong style={{ color: "#0f766e", fontWeight: 600 }}>Enrich</strong> in the toolbar anytime for
                    deeper company or role data.
                  </p>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  alignItems: "center",
                  paddingTop: hasContactGapsToEnrich ? 0 : 8,
                }}
              >
                <button
                  type="button"
                  disabled={enrichSubmitting}
                  onClick={() => {
                    setShowEnrichPopup(false);
                    onClose();
                  }}
                  style={{
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: enrichSubmitting ? "not-allowed" : "pointer",
                    opacity: enrichSubmitting ? 0.55 : 1,
                    padding: "11px 22px",
                    border: hasContactGapsToEnrich
                      ? "1px solid var(--color-border)"
                      : "1px solid rgba(16, 185, 129, 0.35)",
                    background: hasContactGapsToEnrich ? "var(--color-surface)" : "rgba(255, 255, 255, 0.95)",
                    color: hasContactGapsToEnrich ? "var(--color-text)" : "#047857",
                    boxShadow: hasContactGapsToEnrich ? "none" : "0 4px 14px rgba(5, 150, 105, 0.12)",
                    transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (enrichSubmitting) return;
                    if (!hasContactGapsToEnrich) {
                      e.currentTarget.style.background = "rgba(236, 253, 245, 0.95)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(5, 150, 105, 0.16)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasContactGapsToEnrich) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(5, 150, 105, 0.12)";
                    }
                  }}
                >
                  {hasContactGapsToEnrich ? "Skip for now" : "Done"}
                </button>
                {hasContactGapsToEnrich ? (
                  <button
                    type="button"
                    className="btn-primary focus-ring"
                    disabled={enrichSubmitting}
                    onClick={() => void handleEnrichAfterGenerate()}
                    style={{
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 18px",
                      cursor: enrichSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {enrichSubmitting ? (
                      <>
                        <Icons.Loader size={16} strokeWidth={2} style={{ animation: "spin 0.85s linear infinite" }} />
                        Starting…
                      </>
                    ) : (
                      <>
                        <Icons.Sparkles size={16} strokeWidth={2} />
                        Enrich missing contacts
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
