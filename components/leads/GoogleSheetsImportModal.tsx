"use client";

import { useState, useEffect, useMemo } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { GoogleSheetsBrandIcon } from "@/app/leads/components/LeadSourceBrandIcons";
import {
  ImportModalFrame,
  ImportModalLoadingPanel,
  ImportModalStepper,
} from "@/components/leads/ImportModalChrome";

interface GoogleSheetsImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  targetBaseId: number;
}

const LEAD_FIELDS = [
  { value: "email", label: "Email", required: true },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "company", label: "Company" },
  { value: "phone", label: "Phone" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "role", label: "Role / Title" },
  { value: "industry", label: "Industry" },
  { value: "region", label: "Region" },
  { value: "custom_fields", label: "Custom Fields (unmapped)" },
];

const STEPS = [
  { key: "map", label: "Columns" },
  { key: "importing", label: "Import" },
];

type Step = "map" | "importing";

export function GoogleSheetsImportModal({ open, onClose, onImported, targetBaseId }: GoogleSheetsImportModalProps) {
  const { showSuccess, showError } = useNotification();
  const confirmDialog = useConfirm();
  const [step, setStep] = useState<Step>("map");
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetMeta, setSheetMeta] = useState<{ spreadsheetId: string; sheetName: string } | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState({ isImporting: false });
  const [importResult, setImportResult] = useState<{
    imported?: number;
    updated?: number;
    failed?: number;
    errors?: string[];
  } | null>(null);

  const previewWorkspaceQs = useMemo(() => {
    const n = Number(targetBaseId);
    return Number.isFinite(n) && n > 0 ? `?workspace_base_id=${encodeURIComponent(String(n))}` : "";
  }, [targetBaseId]);

  useEffect(() => {
    if (!open) return;
    setStep("map");
    setHeaders([]);
    setSheetMeta(null);
    setRowCount(0);
    setFieldMapping({});
    setImportResult(null);
    setImportProgress({ isImporting: false });

    const load = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/integrations/google-sheet/preview${previewWorkspaceQs}`);
        const h = (data.headers || []) as string[];
        setHeaders(h);
        setSheetMeta({
          spreadsheetId: data.spreadsheetId || "",
          sheetName: data.sheetName || "",
        });
        setRowCount(typeof data.rowCount === "number" ? data.rowCount : 0);
        const suggested = (data.suggestedMapping || {}) as Record<string, string>;
        if (h.length) {
          const next: Record<string, string> = {};
          for (const col of h) {
            next[col] = suggested[col] || "custom_fields";
          }
          setFieldMapping(next);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not load sheet";
        showError("Google Sheets", msg);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, previewWorkspaceQs, showError]);

  const handleImport = async () => {
    if (!Object.values(fieldMapping).includes("email")) {
      showError("Mapping", "Map at least one column to Email.");
      return;
    }
    setStep("importing");
    setImportProgress({ isImporting: true });
    try {
      const result = await apiRequest("/integrations/google-sheet/import", {
        method: "POST",
        body: JSON.stringify({
          base_id: targetBaseId,
          field_mapping: fieldMapping,
          import_mode: "add_only",
        }),
      });
      setImportResult(result);
      setImportProgress({ isImporting: false });
      if ((result.imported ?? 0) > 0 || (result.updated ?? 0) > 0) {
        showSuccess(
          "Import complete",
          `Imported ${result.imported ?? 0} lead(s)${(result.updated ?? 0) > 0 ? `, updated ${result.updated}` : ""}.`,
        );
        onImported();
        setTimeout(() => {
          onClose();
          resetModal();
        }, 1800);
      } else {
        showError("Import", result.errors?.[0] || "No leads were imported.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Import failed";
      showError("Import failed", msg);
      setImportProgress({ isImporting: false });
      setStep("map");
    }
  };

  const resetModal = () => {
    setStep("map");
    setHeaders([]);
    setSheetMeta(null);
    setRowCount(0);
    setFieldMapping({});
    setImportResult(null);
    setImportProgress({ isImporting: false });
  };

  const handleClose = () => {
    void (async () => {
      if (importProgress.isImporting) {
        const ok = await confirmDialog({
          title: "Close import?",
          message: "Import is in progress. Close anyway?",
          confirmLabel: "Close",
          variant: "danger",
        });
        if (!ok) return;
      }
      resetModal();
      onClose();
    })();
  };

  const headerTint =
    "linear-gradient(165deg, rgba(15, 157, 88, 0.12) 0%, rgba(135, 206, 172, 0.08) 42%, transparent 72%)";

  return (
    <ImportModalFrame
      open={open}
      onClose={handleClose}
      title="Import from Google Sheets"
      subtitle="Map columns to lead fields, then import rows from your connected spreadsheet."
      headerTint={headerTint}
      icon={<GoogleSheetsBrandIcon size={34} />}
      maxWidth={600}
      stepper={<ImportModalStepper steps={STEPS} activeKey={step} />}
    >
      {sheetMeta ? (
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Tab <strong style={{ color: "var(--color-text)" }}>{sheetMeta.sheetName}</strong> ·{" "}
          {rowCount.toLocaleString()} data row{rowCount === 1 ? "" : "s"} · new rows only (skips emails already in this
          workspace).
        </p>
      ) : null}

      {step === "map" && (
        <div>
          {loading ? (
            <ImportModalLoadingPanel title="Loading sheet preview…" />
          ) : headers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                borderRadius: 16,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <GoogleSheetsBrandIcon size={48} />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
                No columns found. Check the tab name and header row in Settings → Connectors.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--color-text)",
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(15, 157, 88, 0.08)",
                  border: "1px solid rgba(15, 157, 88, 0.22)",
                }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>Why this step?</strong>
                Headers differ between sheets (e.g. “Work email” vs “Email”). Link each column to the correct lead
                field. Suggested mappings are pre-filled — review and tap <strong>Start import</strong>.
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.02em" }}>
                Column mapping
                {Object.values(fieldMapping).includes("email") ? " · Email is mapped ✓" : ""}
              </div>
              {!Object.values(fieldMapping).includes("email") ? (
                <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
                  Map at least one column to <strong>Email</strong> before importing.
                </p>
              ) : null}
              {headers.map((col) => (
                <div
                  key={col}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr minmax(160px, 1fr)",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>{col}</div>
                  <select
                    className="input"
                    value={fieldMapping[col] || ""}
                    onChange={(e) => {
                      setFieldMapping({ ...fieldMapping, [col]: e.target.value });
                    }}
                    style={{ padding: "10px 12px", fontSize: 13, borderRadius: 10, width: "100%" }}
                  >
                    <option value="">— Skip —</option>
                    {LEAD_FIELDS.map((lf) => (
                      <option key={lf.value} value={lf.value}>
                        {lf.label}
                        {lf.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div style={{ marginTop: 8, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button type="button" className="btn-ghost" onClick={handleClose} style={{ padding: "12px 20px", borderRadius: 10 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleImport()}
                  disabled={!Object.values(fieldMapping).includes("email")}
                  style={{ padding: "12px 22px", borderRadius: 10, fontWeight: 600 }}
                >
                  Start import
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "importing" && (
        <div>
          {importProgress.isImporting ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                borderRadius: 16,
                border: "1px dashed var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <div className="ui-spinner-ring" style={{ margin: "0 auto 20px" }} aria-hidden />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>Importing rows…</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Keep this window open.</p>
            </div>
          ) : importResult ? (
            <div>
              <div
                style={{
                  padding: 22,
                  borderRadius: 16,
                  background: "linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>
                      {importResult.imported ?? 0}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                      Imported
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#7C3AED", letterSpacing: "-0.02em" }}>
                      {importResult.updated ?? 0}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                      Updated
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#dc2626", letterSpacing: "-0.02em" }}>
                      {importResult.failed ?? 0}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                      Failed
                    </div>
                  </div>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 ? (
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: "auto",
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(239, 68, 68, 0.06)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  }}
                >
                  {importResult.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#b91c1c", marginBottom: 6, lineHeight: 1.45 }}>
                      {err}
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn-primary" onClick={handleClose} style={{ padding: "12px 22px", borderRadius: 10 }}>
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </ImportModalFrame>
  );
}
