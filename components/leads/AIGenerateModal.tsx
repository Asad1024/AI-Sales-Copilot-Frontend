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
  const hasContactGapsToEnrich = contactGaps.missingEmail > 0 || contactGaps.missingPhone > 0;

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
        subtitle="Build a clean ICP prompt, generate qualified contacts"
        headerTint="radial-gradient(circle at 92% 8%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 24%), radial-gradient(circle at 12% 10%, rgba(196,181,253,0.25) 0%, rgba(196,181,253,0) 28%), linear-gradient(96deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)"
        icon={
          <span
            style={{
              position: "relative",
              display: "inline-flex",
              width: 26,
              height: 26,
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden
          >
            <Icons.Search size={22} strokeWidth={2} style={{ color: "#ffffff" }} />
            <Icons.Plus
              size={11}
              strokeWidth={2.75}
              style={{
                position: "absolute",
                right: -1,
                bottom: 0,
                color: "#ffffff",
                filter: "drop-shadow(0 0 1px rgba(91, 33, 182, 0.35))",
              }}
            />
          </span>
        }
        headerTitleColor="#ffffff"
        headerSubtitleColor="rgba(255,255,255,0.86)"
        headerBorderColor="rgba(255,255,255,0.24)"
        headerIconContainerStyle={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.34)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px rgba(49, 11, 115, 0.32)",
          borderRadius: 14,
          width: 44,
          height: 44,
        }}
        headerCloseButtonStyle={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.34)",
          color: "#f5f3ff",
          width: 36,
          height: 36,
          borderRadius: "50%",
        }}
        frameBorderRadius={12}
        maxWidth={820}
        maxModalHeight="min(92vh, 900px)"
        closeDisabled={generating || Boolean(suggestionLoadingTopic)}
      >
        <div
          className="persona-ai-panel-reveal"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              padding: "10px 12px 12px",
              borderRadius: 10,
              background: "#ffffff",
              border: "1px solid #e8e4dc",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#a8988e",
                marginBottom: 6,
              }}
            >
              Quick suggestions
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 8,
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
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: loadingChip ? "6px 8px" : "4px 8px",
                      borderRadius: 9999,
                      border: activeChip ? "1px solid rgba(124, 58, 237, 0.45)" : "1px solid #e5e0d8",
                      background: activeChip ? "rgba(124, 58, 237, 0.12)" : "#f5f2ed",
                      color: activeChip ? "#6d28d9" : "#4b5563",
                      fontSize: 11,
                      fontWeight: activeChip ? 600 : 500,
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
                        {activeChip ? (
                          <Icons.Sparkles size={11} strokeWidth={2} style={{ flexShrink: 0, color: "#7C3AED" }} aria-hidden />
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
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#a8988e",
                display: "block",
                marginBottom: 4,
              }}
            >
              Describe your ideal customer
            </label>
            <div
              style={{
                borderRadius: 10,
                border: "1px solid #e8e4dc",
                background: "#faf8f5",
                overflow: "hidden",
              }}
            >
              <textarea
                id="ai-lead-prompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (selectedSuggestion) setSelectedSuggestion(null);
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
                  padding: "10px 12px",
                  minHeight: 112,
                  maxHeight: 220,
                  resize: "vertical",
                  borderRadius: 0,
                  boxSizing: "border-box",
                  border: "none",
                  borderBottom: "1px solid #e8e4dc",
                  background: "transparent",
                }}
              />
              <div
                style={{
                  borderRadius: 0,
                  border: "none",
                  background: "#f3f1ec",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: speechListening ? "#6d28d9" : "#a8a29e",
                    fontWeight: speechListening ? 600 : 400,
                    transition: "color 0.2s ease",
                  }}
                >
                  {speechListening ? "Speak now — we're listening…" : "Be specific for better results"}
                </span>
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
                      ? "1px solid rgba(124, 58, 237, 0.55)"
                      : "1px solid #e5e0d8",
                    background: speechListening ? "rgba(124, 58, 237, 0.12)" : "#ffffff",
                    color: speechListening ? "#6d28d9" : "#78716c",
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

          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4, width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 10,
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#faf8f5",
                  border: "1px solid #e8e4dc",
                  borderRadius: 999,
                  padding: "4px 8px",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", padding: "0 4px" }}>
                  Leads
                </span>
                <button
                  type="button"
                  onClick={decrementCount}
                  disabled={generating || Boolean(suggestionLoadingTopic)}
                  aria-label="Decrease lead count"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid #e5e0d8",
                    background: "#f5f2ed",
                    color: "#374151",
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
                  }}
                >
                  -
                </button>
                <span
                  style={{
                    minWidth: 32,
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {count}
                </span>
                <button
                  type="button"
                  onClick={incrementCount}
                  disabled={generating || Boolean(suggestionLoadingTopic)}
                  aria-label="Increase lead count"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid #e5e0d8",
                    background: "#f5f2ed",
                    color: "#374151",
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
                  }}
                >
                  +
                </button>
              </div>
              {generating ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    flex: "1 1 220px",
                    minWidth: 200,
                    borderRadius: 999,
                    border: "1px solid #e8e4dc",
                    background: "#faf8f5",
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#78716c", fontWeight: 600 }}>
                      {genStream.label || "Generating…"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>
                      {genPct}%
                      {genShowCountsExtra ? ` (${genStream.done}/${genStream.total})` : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: "#e7e5e4",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(2, genPct)}%`,
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, #5b21b6 0%, #7c3aed 35%, #a78bfa 65%, #7c3aed 100%)",
                        backgroundSize: "220% 100%",
                        animation: "generateBarShimmer 1.05s linear infinite",
                        transition: "width 0.15s ease-out",
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={generating || Boolean(suggestionLoadingTopic)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  minWidth: 96,
                  border: "1px solid #d6d3d1",
                  background: "#ffffff",
                  color: "#1f2937",
                  fontWeight: 600,
                  cursor: generating || suggestionLoadingTopic ? "not-allowed" : "pointer",
                  opacity: generating || suggestionLoadingTopic ? 0.55 : 1,
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (generating || suggestionLoadingTopic) return;
                  e.currentTarget.style.background = "#f9fafb";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#d6d3d1";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleGenerate()}
                disabled={
                  generating ||
                  Boolean(suggestionLoadingTopic) ||
                  (!postGenSuccess && !prompt.trim())
                }
                aria-busy={generating}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: "11px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  color: "#fff",
                  background: generationComplete
                    ? "linear-gradient(135deg, #15803d 0%, #22c55e 55%, #4ade80 100%)"
                    : "linear-gradient(135deg, #6d28d9 0%, #7c3aed 45%, #8b5cf6 100%)",
                  boxShadow: generationComplete
                    ? "0 10px 24px rgba(34, 197, 94, 0.28)"
                    : "0 10px 24px rgba(124, 58, 237, 0.28)",
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
          </div>
        </div>
      </ImportModalFrame>

      {/* Post-generation: optional FullEnrich contact flow (same as toolbar Enrich → contact-only) */}
      {showEnrichPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
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
              width: "min(560px, 96vw)",
              background: "#ffffff",
              border: "1px solid #e8e4dc",
              borderRadius: 12,
              padding: 0,
              boxShadow: "0 25px 80px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
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
                padding: "20px 22px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.24)",
                background:
                  "radial-gradient(circle at 92% 8%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 24%), radial-gradient(circle at 12% 10%, rgba(196,181,253,0.25) 0%, rgba(196,181,253,0) 28%), linear-gradient(96deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.34)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px rgba(49, 11, 115, 0.32)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {hasContactGapsToEnrich ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icons.Mail size={18} strokeWidth={2} style={{ color: "#ffffff" }} />
                      <Icons.Phone size={16} strokeWidth={2} style={{ color: "#ffffff", marginLeft: -2 }} />
                    </span>
                  ) : (
                    <Icons.CheckCircle size={22} strokeWidth={1.75} style={{ color: "#ffffff" }} />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    id="ai-generate-success-title"
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 700,
                      color: "#ffffff",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.25,
                    }}
                  >
                    {hasContactGapsToEnrich ? "Some contact details are missing" : "Contacts look complete"}
                  </h3>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
                    {hasContactGapsToEnrich
                      ? `We saved ${contactGaps.total} lead${contactGaps.total === 1 ? "" : "s"}. Apollo did not return a usable email or phone for every row — you can run FullEnrich now or finish later in the table.`
                      : `All ${contactGaps.total} lead${contactGaps.total === 1 ? "" : "s"} already have a verified email and phone on file.`}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "18px 22px 22px",
                background: "#faf8f5",
                borderTop: "1px solid #ede9e4",
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
                      background: "rgba(124, 58, 237, 0.08)",
                      border: "1px solid rgba(124, 58, 237, 0.18)",
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
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: "1px solid #d6d3d1",
                    background: "#ffffff",
                    fontSize: 13,
                    color: "#57534e",
                    lineHeight: 1.55,
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <Icons.CheckCircle size={20} strokeWidth={2} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                  <span>No enrichment step is required for contact fields. You can still use Enrich in the toolbar for
                    other data later.</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  disabled={enrichSubmitting}
                  onClick={() => {
                    setShowEnrichPopup(false);
                    onClose();
                  }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid #d6d3d1",
                    background: "#ffffff",
                    color: "#1f2937",
                    cursor: enrichSubmitting ? "not-allowed" : "pointer",
                    opacity: enrichSubmitting ? 0.55 : 1,
                  }}
                >
                  {hasContactGapsToEnrich ? "Skip for now" : "Close"}
                </button>
                {hasContactGapsToEnrich ? (
                  <button
                    type="button"
                    className="btn-primary focus-ring"
                    disabled={enrichSubmitting}
                    onClick={() => void handleEnrichAfterGenerate()}
                    style={{
                      padding: "11px 20px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      border: "none",
                      color: "#fff",
                      background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 45%, #8b5cf6 100%)",
                      boxShadow: "0 10px 24px rgba(124, 58, 237, 0.28)",
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
