"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import { useBaseStore } from "@/stores/useBaseStore";

type ScoringPromptCardProps = {
  baseId: number;
  canManageSettings: boolean;
};

export function ScoringPromptCard({ baseId, canManageSettings }: ScoringPromptCardProps) {
  const { showSuccess, showError } = useNotification();
  const refreshBases = useBaseStore((s) => s.refreshBases);
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIcpContext(baseId);
      const raw = (data as any)?.icp_context?.scoring_prompt;
      const str = typeof raw === "string" ? raw : "";
      setValue(str);
      setInitial(str);
    } catch (e: any) {
      showError("Could not load workspace", e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [baseId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = value !== initial;
  const overLimit = value.length > 8000;

  const onSave = async () => {
    if (!canManageSettings || overLimit) return;
    setSaving(true);
    try {
      await api.updateIcpContext(baseId, { scoring_prompt: value });
      setInitial(value);
      await refreshBases();
      showSuccess("Scoring prompt saved", "Lead scoring can use this text when AI scoring is enabled.");
    } catch (e: any) {
      showError("Save failed", e?.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (!canManageSettings) {
    return null;
  }

  return (
    <div className="card-enhanced" style={{ borderRadius: 16, padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Scoring prompt</h2>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16, maxWidth: 720 }}>
        Optional free-text criteria for this workspace. When AI lead scoring is enabled, the model may add a small fit
        bonus (up to 8 points) on top of structured ICP and research scoring — it does not replace the main score
        breakdown.
      </p>
      {loading ? (
        <div className="ui-skeleton" style={{ height: 120, borderRadius: 8 }} aria-hidden />
      ) : (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Prioritize VP Sales at B2B SaaS, 50–500 employees, US/Canada; deprioritize agencies and consultants."
            rows={5}
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
              color: "var(--color-text)",
              fontSize: 14,
              resize: "vertical",
              minHeight: 100
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              flexWrap: "wrap",
              gap: 12
            }}
          >
            <span style={{ fontSize: 12, color: overLimit ? "var(--color-danger)" : "var(--color-text-muted)" }}>
              {value.length} / 8000
            </span>
            <button
              type="button"
              className="btn-primary"
              disabled={!dirty || saving || overLimit}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save scoring prompt"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
