"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiRequest, streamGenerateLeads } from "@/lib/apiClient";
import { useBase } from "@/context/BaseContext";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { GenerateLeadAIIcon } from "@/app/leads/components/LeadSourceBrandIcons";
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
  const suggestionPrompts = [
    "SaaS Founders",
    "Marketing Directors",
    "VP Sales in FinTech",
    "HR Leaders in IT Services",
    "Ecommerce Growth Managers",
    "Real Estate Brokerage Owners",
    "Healthcare Operations Heads",
    "Logistics Decision Makers",
  ];

  const contactGaps = useMemo(() => countContactGapsForLeads(generatedLeads), [generatedLeads]);

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
        setProgress(`Successfully generated ${rows.length} leads!`);
        setGeneratedLeads(rows);
        onGenerated(rows);
        setTimeout(() => {
          setShowEnrichPopup(true);
          setPrompt("");
          setProgress("");
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
        @keyframes generateBarShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}} />

      <ImportModalFrame
        open={open}
        onClose={onClose}
        title="Generate leads with AI"
        subtitle="Build a clean ICP prompt, then generate qualified contacts for this workspace."
        headerTint="linear-gradient(165deg, rgba(99, 102, 241, 0.14) 0%, rgba(124, 58, 237, 0.08) 45%, transparent 72%)"
        icon={<GenerateLeadAIIcon size={36} sparklesSize={18} />}
        maxWidth={860}
        maxModalHeight="min(92vh, 900px)"
        closeDisabled={generating || Boolean(suggestionLoadingTopic)}
      >
        <div
          className="persona-ai-panel-reveal"
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "10px 12px",
            background: "var(--color-surface-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 200px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginBottom: 2, lineHeight: 1.3 }}>
                Generate with AI
              </div>
              <p className="text-hint" style={{ margin: 0, fontSize: 11, lineHeight: 1.35, maxWidth: 560 }}>
                One-click suggestions, or type your full ICP in your own words. Same flow as campaign Knowledge base /
                Assistant — always open here (no upload step).
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {generating ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-primary, #7C3AED)",
                  }}
                  aria-live="polite"
                >
                  <span
                    style={{
                      width: 56,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--color-border)",
                      overflow: "hidden",
                      display: "inline-block",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${Math.max(4, genPct)}%`,
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, #7c3aed 0%, #a78bfa 35%, #c4b5fd 50%, #a78bfa 65%, #7c3aed 100%)",
                        backgroundSize: "200% 100%",
                        animation: "generateBarShimmer 1.1s linear infinite",
                        transition: "width 0.12s ease-out",
                      }}
                    />
                  </span>
                  Generating
                </span>
              ) : null}
              {!generating && suggestionLoadingTopic ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>
                    <Icons.Loader size={12} strokeWidth={2} aria-hidden />
                  </span>
                  Crafting…
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Suggestions
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gridTemplateRows: "auto auto",
                gap: 8,
                paddingTop: 2,
              }}
            >
              {suggestionPrompts.map((item) => {
                const loadingChip = suggestionLoadingTopic === item;
                const disabled = generating || Boolean(suggestionLoadingTopic);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSuggestionTopic(item)}
                    disabled={disabled}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: loadingChip ? "6px 8px" : "4px 8px",
                      borderRadius: 9999,
                      border: loadingChip ? "1px solid var(--color-primary, #7C3AED)" : "1px solid var(--color-border)",
                      background: loadingChip ? "rgba(124, 58, 237, 0.14)" : "var(--color-surface)",
                      color: loadingChip ? "var(--color-primary, #7C3AED)" : "var(--color-text)",
                      fontSize: 11,
                      fontWeight: loadingChip ? 600 : 500,
                      lineHeight: 1.25,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.55 : 1,
                      textAlign: "center",
                      minWidth: 0,
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {loadingChip ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(167,139,250,0.35) 50%, rgba(99,102,241,0.14) 100%)",
                            backgroundSize: "200px 100%",
                            animation: "shimmer 1.15s linear infinite",
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>Crafting…</span>
                      </span>
                    ) : (
                      <>
                        <Icons.Sparkles size={11} strokeWidth={2} style={{ flexShrink: 0, color: "#7C3AED" }} aria-hidden />
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
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#9ca3af",
                display: "block",
                marginBottom: 4,
              }}
            >
              Your words
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                id="ai-lead-prompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError("");
                }}
                rows={5}
                placeholder="Short idea or full ICP — e.g. marketing directors, B2B SaaS, 50–200 employees, North America"
                disabled={generating || Boolean(suggestionLoadingTopic)}
                className="input"
                style={{
                  width: "100%",
                  fontSize: 12,
                  lineHeight: 1.45,
                  padding: "8px 44px 8px 12px",
                  minHeight: 112,
                  maxHeight: 220,
                  resize: "vertical",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
              />
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
                  position: "absolute",
                  right: 8,
                  bottom: 8,
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: speechListening
                    ? "1px solid var(--color-primary, #7C3AED)"
                    : "1px solid var(--color-border)",
                  background: speechListening ? "rgba(124, 58, 237, 0.16)" : "var(--color-surface)",
                  color: speechListening ? "var(--color-primary, #7C3AED)" : "var(--color-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor:
                    !speechSupported || generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
                  opacity: !speechSupported ? 0.45 : 1,
                  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
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

          {generating ? (
            <div style={{ marginTop: 2 }} role="status" aria-live="polite" aria-label="Lead generation progress">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {genStream.label || progress || "Working on your request…"}
                  {genShowCountsExtra ? (
                    <span style={{ marginLeft: 6, color: "var(--color-primary, #7C3AED)", fontWeight: 700 }}>
                      {genStream.done}/{genStream.total}
                    </span>
                  ) : null}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary, #7C3AED)", fontVariantNumeric: "tabular-nums" }}>
                  {genPct}%
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "var(--color-border)",
                  overflow: "hidden",
                  border: "1px solid rgba(124, 58, 237, 0.12)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, genPct)}%`,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #5b21b6 0%, #7c3aed 22%, #a78bfa 45%, #ddd6fe 55%, #a78bfa 68%, #7c3aed 100%)",
                    backgroundSize: "220% 100%",
                    animation: "generateBarShimmer 1.05s linear infinite",
                    boxShadow: "0 0 12px rgba(124, 58, 237, 0.35)",
                    transition: "width 0.1s ease-out",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>Number of leads</span>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                className="input"
                style={{
                  width: 56,
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-secondary)",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}
                disabled={generating || Boolean(suggestionLoadingTopic)}
              />
            </div>

            <div style={{ display: "flex", gap: 9 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={generating || Boolean(suggestionLoadingTopic)}
                style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleGenerate()}
                disabled={generating || Boolean(suggestionLoadingTopic) || !prompt.trim()}
                aria-busy={generating}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {generating ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${Math.max(0, genPct)}%`,
                        background: "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
                        transition: "width 0.12s ease-out",
                        pointerEvents: "none",
                      }}
                    />
                    <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icons.Sparkles size={15} />
                      Generating {genPct}%
                      {genShowCountsExtra ? ` (${genStream.done}/${genStream.total})` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={15} />
                    Generate leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </ImportModalFrame>

      {/* Post-generation: optional FullEnrich contact flow (same as toolbar Enrich → contact-only) */}
      {showEnrichPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.62)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            animation: "fadeIn 0.2s ease-out",
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
              background: "var(--color-surface)",
              border: "1px solid var(--elev-border)",
              borderRadius: 20,
              padding: 0,
              boxShadow: "0 32px 80px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(124, 58, 237, 0.08)",
              animation: "slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-success-title"
          >
            <div
              style={{
                padding: "22px 24px 18px",
                background:
                  "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(99, 102, 241, 0.06) 50%, transparent 100%)",
                borderBottom: "1px solid var(--elev-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(145deg, rgba(124, 58, 237, 0.22), rgba(167, 139, 250, 0.12))",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 8px 24px rgba(124, 58, 237, 0.2)",
                  }}
                >
                  <Icons.CheckCircle size={26} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    id="ai-generate-success-title"
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.2,
                    }}
                  >
                    Leads ready
                  </h3>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
                    We added {contactGaps.total} lead{contactGaps.total === 1 ? "" : "s"}. Many records still need verified
                    email or phone — run enrichment to pull them from FullEnrich, or continue in your table.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: "22px 24px 24px", background: "var(--color-surface)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    padding: "14px 16px",
                    border: "1px solid var(--elev-border)",
                    background: "var(--color-surface-secondary)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                    EMAILS TO FETCH
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {contactGaps.missingEmail}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Missing or placeholder addresses
                  </div>
                </div>
                <div
                  style={{
                    borderRadius: 14,
                    padding: "14px 16px",
                    border: "1px solid var(--elev-border)",
                    background: "var(--color-surface-secondary)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                    PHONES TO FETCH
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                    {contactGaps.missingPhone}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Missing or short numbers
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: "rgba(124, 58, 237, 0.06)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  lineHeight: 1.55,
                  marginBottom: 22,
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>After Enrich:</strong> the leads table shows the same
                progress banner and per-row &quot;Processing&quot; state as when you enrich from the toolbar, until the webhook
                completes.
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-ghost focus-ring"
                  disabled={enrichSubmitting}
                  onClick={() => {
                    setShowEnrichPopup(false);
                    onClose();
                  }}
                  style={{ padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  className="btn-primary focus-ring"
                  disabled={enrichSubmitting || contactGaps.total === 0}
                  onClick={() => void handleEnrichAfterGenerate()}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {enrichSubmitting ? (
                    <>
                      <Icons.Loader size={16} strokeWidth={2} style={{ animation: "spin 0.85s linear infinite" }} />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Icons.Target size={17} strokeWidth={1.5} />
                      Enrich
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
