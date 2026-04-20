"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState, useEffect, useMemo } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Icons } from "@/components/ui/Icons";
import { AirtableBrandIcon } from "@/app/leads/components/LeadSourceBrandIcons";

interface AirtableImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  targetBaseId: number;
}

interface AirtableBase {
  id: string;
  name: string;
}

interface AirtableTable {
  id: string;
  name: string;
}

interface AirtableField {
  id: string;
  name: string;
  type: string;
}

type Step = "select_base" | "select_table" | "map_fields" | "importing";

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

const STEPS: { key: Step; label: string }[] = [
  { key: "select_base", label: "Base" },
  { key: "select_table", label: "Table" },
  { key: "map_fields", label: "Mapping" },
  { key: "importing", label: "Import" },
];

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
  backdropFilter: "blur(8px)",
};

const muted: CSSProperties = { color: "var(--color-text-muted)", fontSize: 13 };

function LoadingPanel({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 16,
        borderRadius: 16,
        border: "1px dashed var(--color-border)",
        background: "var(--color-surface-secondary)",
      }}
    >
      <div className="ui-spinner-ring" aria-hidden />
      <p style={{ margin: 0, ...muted, fontWeight: 500 }}>{title}</p>
    </div>
  );
}

function SelectableRow({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        textAlign: "left",
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        cursor: "pointer",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(24, 191, 255, 0.45)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.08)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, rgba(252, 180, 0, 0.12) 0%, rgba(24, 191, 255, 0.1) 100%)",
          color: "var(--color-text)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text)", letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              marginTop: 4,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </span>
      <Icons.ChevronRight size={18} strokeWidth={1.75} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
    </button>
  );
}

function Stepper({ activeStep }: { activeStep: Step }) {
  const idx = STEPS.findIndex((s) => s.key === activeStep);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
        padding: "4px 0",
      }}
    >
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const last = i === STEPS.length - 1;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: last ? "0 0 auto" : 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  background: active
                    ? "linear-gradient(135deg, #18BFFF 0%, var(--color-primary) 100%)"
                    : done
                      ? "rgba(24, 191, 255, 0.2)"
                      : "var(--color-surface-secondary)",
                  color: active ? "#fff" : done ? "#0891b2" : "var(--color-text-muted)",
                  border: active || done ? "none" : "1px solid var(--color-border)",
                  boxShadow: active ? "0 4px 14px rgba(24, 191, 255, 0.35)" : "none",
                }}
              >
                {done ? <Icons.Check size={16} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--color-text)" : "var(--color-text-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                {s.label}
              </span>
            </div>
            {!last ? (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 6px 22px",
                  borderRadius: 1,
                  background: done ? "linear-gradient(90deg, rgba(24,191,255,0.5), rgba(99,102,241,0.35))" : "var(--color-border)",
                  minWidth: 8,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function AirtableImportModal({ open, onClose, onImported, targetBaseId }: AirtableImportModalProps) {
  const { showSuccess, showError } = useNotification();
  const confirmDialog = useConfirm();
  const [step, setStep] = useState<Step>("select_base");
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState<AirtableBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [fields, setFields] = useState<AirtableField[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, isImporting: false });
  const [importResult, setImportResult] = useState<any>(null);

  const workspaceAirtableQs = useMemo(() => {
    const n = Number(targetBaseId);
    return Number.isFinite(n) && n > 0 ? `?workspace_base_id=${encodeURIComponent(String(n))}` : "";
  }, [targetBaseId]);

  useEffect(() => {
    if (open && step === "select_base") {
      loadBases();
    }
  }, [open, step, workspaceAirtableQs]);

  useEffect(() => {
    if (selectedBaseId && step === "select_table") {
      loadTables();
    }
  }, [selectedBaseId, step]);

  useEffect(() => {
    if (selectedTableId && step === "map_fields") {
      loadFields();
    }
  }, [selectedTableId, step]);

  useEffect(() => {
    if (autoMapping && Object.keys(autoMapping).length > 0) {
      setFieldMapping(autoMapping);
    }
  }, [autoMapping]);

  const loadBases = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/integrations/airtable/bases${workspaceAirtableQs}`);
      const basesList = data.bases || [];
      setBases(basesList);

      console.log(
        "[Airtable Import] Loaded bases:",
        basesList.map((b: AirtableBase) => ({ id: b.id, name: b.name }))
      );

      if (basesList.length === 0) {
        showError(
          "No bases found",
          "Your Personal Access Token doesn't have access to any bases. Please ensure: 1) The token has 'schema.bases:read' scope, 2) The token has been granted access to your bases in Airtable settings."
        );
      } else if (basesList.length === 1) {
        setSelectedBaseId(basesList[0].id);
        setStep("select_table");
      }
    } catch (error: any) {
      console.error("[Airtable Import] Failed to load bases:", error);
      showError(
        "Failed to load Airtable bases",
        error?.response?.data?.error ||
          error?.message ||
          "Please check your Airtable connection and ensure your Personal Access Token has the 'schema.bases:read' scope"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!selectedBaseId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/integrations/airtable/${selectedBaseId}/tables${workspaceAirtableQs}`);
      setTables(data.tables || []);
    } catch (error: any) {
      showError("Failed to load tables", error?.message || "Please check your Airtable connection");
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async () => {
    if (!selectedBaseId || !selectedTableId) return;
    setLoading(true);
    try {
      const encodedTableId = encodeURIComponent(selectedTableId);
      console.log("[Airtable Import] Loading fields for:", {
        baseId: selectedBaseId,
        tableId: selectedTableId,
        encodedTableId,
      });

      const data = await apiRequest(
        `/integrations/airtable/${selectedBaseId}/tables/${encodedTableId}/fields${workspaceAirtableQs}`,
      );
      setFields(data.fields || []);
      setAutoMapping(data.autoMapping || {});

      console.log("[Airtable Import] Loaded fields:", data.fields?.length || 0);
    } catch (error: any) {
      console.error("[Airtable Import] Failed to load fields:", {
        error,
        baseId: selectedBaseId,
        tableId: selectedTableId,
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";

      if (errorMessage.includes("not found") || error?.response?.status === 404) {
        showError(
          "Table not found",
          `The table "${selectedTableId}" was not found in base "${selectedBaseId}". This usually means:\n\n1. Your Personal Access Token doesn't have access to this base\n2. The base ID in the URL might be different from the one your token can access\n3. The token needs to be granted access to this specific base in Airtable settings\n\nPlease check: https://airtable.com/create/tokens and ensure your token has access to the base containing this table.`
        );
      } else if (error?.response?.status === 403) {
        showError(
          "Access forbidden",
          "Your Personal Access Token doesn't have permission to access this table. Please ensure:\n\n1. The token has 'schema.bases:read' scope\n2. The token has been granted access to this base in Airtable settings\n3. You have permission to access this base in your Airtable account"
        );
      } else {
        showError("Failed to load table fields", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedBaseId || !selectedTableId) {
      showError("Missing information", "Please select a base and table");
      return;
    }

    const emailField = Object.entries(fieldMapping).find(([, leadField]) => leadField === "email")?.[0];
    if (!emailField) {
      showError("Email mapping required", "Please map at least one Airtable field to Email");
      return;
    }

    setStep("importing");
    setImportProgress({ current: 0, total: 0, isImporting: true });

    try {
      const result = await apiRequest("/integrations/airtable/import", {
        method: "POST",
        body: JSON.stringify({
          base_id: targetBaseId,
          airtable_base_id: selectedBaseId,
          airtable_table_id: selectedTableId,
          field_mapping: fieldMapping,
          import_mode: "add_only",
        }),
      });

      setImportResult(result);
      setImportProgress({ current: result.total || 0, total: result.total || 0, isImporting: false });

      if (result.imported > 0 || result.updated > 0) {
        showSuccess(
          "Import Complete",
          `Successfully imported ${result.imported} leads${result.updated > 0 ? ` and updated ${result.updated}` : ""}.`
        );
        onImported();
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      } else {
        showError("Import failed", result.errors?.[0] || "No leads were imported");
      }
    } catch (error: any) {
      showError("Import failed", error?.message || "Failed to import leads from Airtable");
      setImportProgress({ current: 0, total: 0, isImporting: false });
    }
  };

  const resetModal = () => {
    setStep("select_base");
    setSelectedBaseId("");
    setSelectedTableId("");
    setFields([]);
    setFieldMapping({});
    setAutoMapping({});
    setImportResult(null);
    setImportProgress({ current: 0, total: 0, isImporting: false });
  };

  const handleClose = () => {
    void (async () => {
      if (importProgress.isImporting) {
        const ok = await confirmDialog({
          title: "Close import?",
          message: "Import is in progress. Are you sure you want to close?",
          confirmLabel: "Close",
          variant: "danger",
        });
        if (!ok) return;
      }
      resetModal();
      onClose();
    })();
  };

  const selectedBaseName = bases.find((b) => b.id === selectedBaseId)?.name ?? "";

  if (!open) return null;

  const backBtnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    cursor: "pointer",
    transition: "background 0.15s ease",
  };

  return (
    <div style={overlayStyle} onClick={handleClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="airtable-import-title"
        className="card-enhanced"
        style={{
          borderRadius: 22,
          maxWidth: 560,
          width: "100%",
          maxHeight: "min(90vh, 720px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 25px 80px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--color-border-light)",
            background:
              "linear-gradient(165deg, rgba(252, 180, 0, 0.09) 0%, rgba(24, 191, 255, 0.06) 42%, transparent 72%)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
                  flexShrink: 0,
                }}
              >
                <AirtableBrandIcon size={34} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  id="airtable-import-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--color-text)",
                    lineHeight: 1.25,
                  }}
                >
                  Import from Airtable
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                  Choose a base and table, map columns to leads, then import.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                color: "var(--color-text-muted)",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-secondary)";
                e.currentTarget.style.color = "var(--color-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-surface)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              <Icons.X size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
          <Stepper activeStep={step} />
        </div>

        <div
          style={{
            padding: "0 24px 24px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {step === "select_base" && (
            <div>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                Select Airtable base
              </h3>
              {loading ? (
                <LoadingPanel title="Loading your bases…" />
              ) : bases.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    borderRadius: 16,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-secondary)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, opacity: 0.92 }}>
                    <AirtableBrandIcon size={52} />
                  </div>
                  <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--color-text)" }}>No bases found</p>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                    Your token needs access to at least one base. Open{" "}
                    <a
                      href="https://airtable.com/create/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-primary)", fontWeight: 600 }}
                    >
                      Airtable token settings
                    </a>{" "}
                    and grant <strong>schema.bases:read</strong> plus access to your bases.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {bases.map((base) => (
                    <SelectableRow
                      key={base.id}
                      icon={<Icons.Folder size={20} strokeWidth={1.5} />}
                      title={base.name}
                      subtitle={base.id}
                      onClick={() => {
                        setSelectedBaseId(base.id);
                        setStep("select_table");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "select_table" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={backBtnStyle}
                  onClick={() => {
                    setStep("select_base");
                    setSelectedTableId("");
                    setTables([]);
                  }}
                >
                  <Icons.ChevronLeft size={16} strokeWidth={2} />
                  Back
                </button>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Select table</h3>
              </div>
              {selectedBaseName ? (
                <p style={{ ...muted, margin: "-8px 0 14px", fontSize: 12 }}>
                  In <strong style={{ color: "var(--color-text)" }}>{selectedBaseName}</strong>
                </p>
              ) : null}
              {loading ? (
                <LoadingPanel title="Loading tables…" />
              ) : tables.length === 0 ? (
                <div style={{ textAlign: "center", padding: 36, borderRadius: 16, border: "1px dashed var(--color-border)" }}>
                  <p style={{ margin: 0, ...muted }}>No tables in this base.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tables.map((table) => (
                    <SelectableRow
                      key={table.id}
                      icon={<Icons.Columns size={20} strokeWidth={1.5} />}
                      title={table.name}
                      subtitle="Tap to map fields"
                      onClick={() => {
                        console.log("[Airtable Import] Selected table:", { id: table.id, name: table.name });
                        setSelectedTableId(table.id);
                        setSelectedTableName(table.name);
                        setStep("map_fields");
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "map_fields" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={backBtnStyle}
                  onClick={() => {
                    setStep("select_table");
                    setFields([]);
                    setFieldMapping({});
                  }}
                >
                  <Icons.ChevronLeft size={16} strokeWidth={2} />
                  Back
                </button>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Map fields</h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--color-surface-secondary)",
                  border: "1px solid var(--color-border-light)",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>Source</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{selectedBaseName || "Base"}</span>
                <Icons.ChevronRight size={12} strokeWidth={2} style={{ opacity: 0.4 }} />
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{selectedTableName || "Table"}</span>
              </div>

              {loading ? (
                <LoadingPanel title="Loading columns…" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Match each Airtable column to a lead field. <strong style={{ color: "var(--color-text)" }}>Email</strong>{" "}
                    is required.
                  </p>
                  {fields.map((field) => (
                    <div
                      key={field.id}
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text)" }}>{field.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, textTransform: "capitalize" }}>
                          {field.type}
                        </div>
                      </div>
                      <select
                        className="input"
                        value={fieldMapping[field.name] || ""}
                        onChange={(e) => {
                          setFieldMapping({
                            ...fieldMapping,
                            [field.name]: e.target.value,
                          });
                        }}
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          borderRadius: 10,
                          border: "1px solid var(--elev-border)",
                          background: "var(--elev-bg)",
                          width: "100%",
                        }}
                      >
                        <option value="">— Skip —</option>
                        {LEAD_FIELDS.map((leadField) => (
                          <option key={leadField.value} value={leadField.value}>
                            {leadField.label}
                            {leadField.required ? " *" : ""}
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
                      onClick={handleImport}
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
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Import status</h3>
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
                  <p style={{ margin: "8px 0 0", ...muted }}>This may take a moment for large tables.</p>
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
                          {importResult.imported || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                          Imported
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-primary)", letterSpacing: "-0.02em" }}>
                          {importResult.updated || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                          Updated
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#dc2626", letterSpacing: "-0.02em" }}>
                          {importResult.failed || 0}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                          Failed
                        </div>
                      </div>
                    </div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text)" }}>Errors</div>
                      <div
                        style={{
                          maxHeight: 180,
                          overflowY: "auto",
                          padding: 12,
                          borderRadius: 12,
                          background: "rgba(239, 68, 68, 0.06)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        {importResult.errors.map((err: string, idx: number) => (
                          <div key={idx} style={{ fontSize: 12, color: "#b91c1c", marginBottom: 6, lineHeight: 1.45 }}>
                            {err}
                          </div>
                        ))}
                      </div>
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
        </div>
      </div>
    </div>
  );
}
