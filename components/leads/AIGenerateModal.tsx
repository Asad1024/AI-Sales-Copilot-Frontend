"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiRequest, streamGenerateLeads } from "@/lib/apiClient";
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

const SUGGESTION_LOADING_PHASES = [
  "Mapping your segment…",
  "Choosing titles & seniority…",
  "Setting region & company size…",
  "Adding buying signals…",
  "Almost ready…",
];

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

function getSpeechRecognitionCtor(): unknown {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function AIGenerateModal({ open, onClose, onGenerated, onAsyncEnrichmentStarted }: Props) {
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
  const [suggestionLoadingTopic, setSuggestionLoadingTopic] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  /** Shown on primary CTA after a successful run (until modal closes or a new run starts). */
  const [postGenSuccess, setPostGenSuccess] = useState<{ count: number } | null>(null);
  const [speechListening, setSpeechListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
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
    suggestionLoadingTopic: null as string | null,
    prompt: "",
    activeBaseId: null as number | null,
  });
  const suggestionPrompts = [
    "SaaS Founders",
    "Marketing Directors",
    "Product Managers",
    "HR Leaders in IT Services",
    "Ecommerce Growth Managers",
    "Real Estate Brokerage Owners",
    "Healthcare Operations Heads",
    "Sales Directors",
  ];

  const contactGaps = useMemo(() => countContactGapsForLeads(generatedLeads), [generatedLeads]);
  const hasContactGapsToEnrich = contactGaps.missingEmail > 0 || contactGaps.missingPhone > 0;

  modalKeyboardRef.current = {
    generating,
    suggestionLoadingTopic,
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
      setPrompt(prefix + sep + finals + interim);
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

  useEffect(() => {
    if (!suggestionLoadingTopic) return;
    let i = 0;
    setProgress(`${SUGGESTION_LOADING_PHASES[0]} · ${suggestionLoadingTopic}`);
    const id = window.setInterval(() => {
      i = (i + 1) % SUGGESTION_LOADING_PHASES.length;
      setProgress(`${SUGGESTION_LOADING_PHASES[i]} · ${suggestionLoadingTopic}`);
    }, 1200);
    return () => window.clearInterval(id);
  }, [suggestionLoadingTopic]);

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

  const clampLeadCount = useCallback((value: number) => Math.min(100, Math.max(1, value)), []);
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
      
      setError(errorMessage);
      setProgress("");
    } finally {
      setGenerating(false);
      setGenStream({ stage: "", done: 0, total: 0, label: "" });
    }
  };

  const handleSuggestionTopic = async (topic: string) => {
    setError("");
    setSelectedSuggestion(topic);
    setSuggestionLoadingTopic(topic);
    try {
      const response = await apiRequest("/ai/lead-prompt-from-suggestion", {
        method: "POST",
        body: JSON.stringify({
          topic,
          ...(activeBaseId ? { base_id: activeBaseId } : {}),
        }),
      });
      const p = typeof response?.prompt === "string" ? response.prompt.trim() : "";
      if (!p) {
        throw new Error("No prompt returned from AI");
      }
      setPrompt(p);
      setProgress("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not generate prompt";
      setError(msg);
      setProgress("");
      setPrompt(
        `Find B2B decision-makers for: ${topic}. Include specific job titles, industries, locations (e.g. United States or your target region), and company size (e.g. 50–500 employees or startups). Add signals that help narrow to qualified prospects.`
      );
    } finally {
      setSuggestionLoadingTopic(null);
    }
  };

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
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const m = modalKeyboardRef.current;
      if (e.key === "Escape") {
        if (m.generating || m.suggestionLoadingTopic) return;
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (m.generating || m.suggestionLoadingTopic || !m.prompt.trim() || !m.activeBaseId) return;
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
        headerTint="var(--color-primary, #2563eb)"
        icon={<Icons.Sun size={22} strokeWidth={2} style={{ color: "#ffffff" }} />}
        headerTitleColor="#ffffff"
        headerSubtitleColor="rgba(255,255,255,0.86)"
        headerBorderColor="rgba(255,255,255,0.24)"
        hideHeaderBottomBorder
        headerIconContainerStyle={{
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 14px rgba(0, 0, 0, 0.12)",
          borderRadius: 12,
          width: 44,
          height: 44,
        }}
        headerCloseButtonStyle={{
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.38)",
          color: "#f8fafc",
          width: 40,
          height: 40,
          borderRadius: 12,
        }}
        frameBorderRadius={12}
        maxWidth={820}
        maxModalHeight="min(92vh, 900px)"
        closeDisabled={generating || Boolean(suggestionLoadingTopic)}
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
            <div
              className="ai-generate-suggestions-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 10,
                paddingTop: 2,
              }}
            >
              {suggestionPrompts.map((item) => {
                const loadingChip = suggestionLoadingTopic === item;
                const activeChip = selectedSuggestion === item || loadingChip;
                const disabled = generating || Boolean(suggestionLoadingTopic);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSuggestionTopic(item)}
                    disabled={disabled}
                    className={`ai-generate-suggestion-pill${activeChip ? " ai-generate-suggestion-pill--active" : ""}${
                      loadingChip ? " ai-generate-suggestion-pill--loading" : ""
                    }`}
                  >
                    {loadingChip ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.45) 50%, rgba(37,99,235,0.15) 100%)",
                            backgroundSize: "200px 100%",
                            animation: "shimmer 1.1s linear infinite",
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>Crafting…</span>
                      </span>
                    ) : (
                      <>
                        {activeChip ? (
                          <Icons.Sparkles size={12} strokeWidth={2} style={{ flexShrink: 0, color: "var(--color-primary)" }} aria-hidden />
                        ) : null}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                      </>
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
            <p id="ai-lead-prompt-hint" className="ai-generate-hint">
              Name the role, industry, region, and company size (e.g. 50–500 employees). More detail usually means better
              matches.
            </p>
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
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (selectedSuggestion) setSelectedSuggestion(null);
                  setError("");
                }}
                rows={4}
                placeholder="Example: VP Marketing at B2B SaaS in North America, 50–200 employees, buying intent for sales tools"
                disabled={generating || Boolean(suggestionLoadingTopic)}
                className="input ai-generate-prompt-textarea"
                aria-describedby="ai-lead-prompt-hint"
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
                  {speechListening ? "Speak now — we're listening…" : "Tip: mention seniority, geography, and firmographics."}
                </span>
                <span className="ai-generate-char-count">{prompt.length.toLocaleString()} characters</span>
                <button
                  type="button"
                  onClick={() => void toggleSpeechInput()}
                  disabled={!speechSupported || generating || Boolean(suggestionLoadingTopic)}
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
                      ? "1px solid rgba(37, 99, 235, 0.45)"
                      : "1px solid var(--color-border)",
                    background: speechListening ? "rgba(37, 99, 235, 0.1)" : "var(--color-surface)",
                    color: speechListening ? "var(--color-primary)" : "var(--color-text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      !speechSupported || generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
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

          {progress && !generating && !suggestionLoadingTopic ? (
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
              We&apos;ll request up to <strong>{count}</strong> new {count === 1 ? "lead" : "leads"} and add them to your
              list (subject to availability).
            </p>

            <div className="ai-generate-primary-row">
              <div className="ai-generate-qty-stepper" style={generating ? { opacity: 0.75 } : undefined}>
                <span className="ai-generate-qty-label">How many leads</span>
                <button
                  type="button"
                  onClick={decrementCount}
                  disabled={Boolean(suggestionLoadingTopic) || generating}
                  aria-label="Decrease lead count"
                  className="ai-generate-qty-btn"
                >
                  -
                </button>
                <span className="ai-generate-qty-value">{count}</span>
                <button
                  type="button"
                  onClick={incrementCount}
                  disabled={Boolean(suggestionLoadingTopic) || generating}
                  aria-label="Increase lead count"
                  className="ai-generate-qty-btn"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={`btn-primary ai-generate-generate-btn${generationComplete ? " ai-generate-success-cta" : ""}`}
                onClick={() => void handleGenerate()}
                disabled={
                  generating ||
                  Boolean(suggestionLoadingTopic) ||
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
                  ? "linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #3b82f6 100%)"
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
                      background: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.18)",
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
