"use client";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Icons } from "@/components/ui/Icons";

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
  { value: "role", label: "Role / Title" },
  { value: "industry", label: "Industry" },
  { value: "region", label: "Region" },
  { value: "custom_fields", label: "Custom Fields (unmapped)" },
];

export function AirtableImportModal({
  open,
  onClose,
  onImported,
  targetBaseId,
}: AirtableImportModalProps) {
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

  useEffect(() => {
    if (open && step === "select_base") {
      loadBases();
    }
  }, [open, step]);

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
      const data = await apiRequest("/integrations/airtable/bases");
      const basesList = data.bases || [];
      setBases(basesList);
      
      console.log("[Airtable Import] Loaded bases:", basesList.map((b: any) => ({ id: b.id, name: b.name })));
      
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
        error?.response?.data?.error || error?.message || "Please check your Airtable connection and ensure your Personal Access Token has the 'schema.bases:read' scope"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!selectedBaseId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/integrations/airtable/${selectedBaseId}/tables`);
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
      // URL encode the tableId to ensure it's properly formatted
      const encodedTableId = encodeURIComponent(selectedTableId);
      console.log("[Airtable Import] Loading fields for:", {
        baseId: selectedBaseId,
        tableId: selectedTableId,
        encodedTableId
      });
      
      const data = await apiRequest(`/integrations/airtable/${selectedBaseId}/tables/${encodedTableId}/fields`);
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
        data: error?.response?.data
      });
      
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      
      // Provide specific guidance based on the error
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

    // Validate email mapping (required)
    const emailField = Object.entries(fieldMapping).find(([_, leadField]) => leadField === "email")?.[0];
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

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        className="card-enhanced"
        style={{
          borderRadius: 20,
          padding: 32,
          maxWidth: 700,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--elev-bg)",
          border: "1px solid var(--elev-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Import from Airtable</h2>
          <button
            className="btn-ghost"
            onClick={handleClose}
            style={{ padding: "8px", borderRadius: '8px', fontSize: '20px', minWidth: '36px', height: '36px' }}
          >
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[
            { key: "select_base", label: "Base" },
            { key: "select_table", label: "Table" },
            { key: "map_fields", label: "Mapping" },
            { key: "importing", label: "Import" },
          ].map((s, idx) => {
            const stepIndex = ["select_base", "select_table", "map_fields", "importing"].indexOf(step);
            const isActive = idx === stepIndex;
            const isCompleted = idx < stepIndex;
            return (
              <div
                key={s.key}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: isActive
                    ? "var(--color-primary)"
                    : isCompleted
                    ? "rgba(76, 103, 255, 0.12)"
                    : "var(--color-surface-secondary)",
                  color: isActive ? "#fff" : isCompleted ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  textAlign: "center",
                }}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Step 1: Select Base */}
        {step === "select_base" && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Select Airtable Base</h3>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Icons.Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Loading bases...</p>
              </div>
            ) : bases.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Icons.AlertCircle size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16, opacity: 0.5 }} />
                <p style={{ color: "var(--color-text-muted)", marginBottom: 8, fontWeight: 600 }}>No bases found</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                  Your Personal Access Token doesn't have access to any bases. Please go to{" "}
                  <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#4C67FF', textDecoration: 'none' }}>
                    Airtable Token Settings
                  </a>{" "}
                  and grant access to your bases.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {bases.map((base) => (
                  <button
                    key={base.id}
                    className="btn-ghost"
                    onClick={() => {
                      setSelectedBaseId(base.id);
                      setStep("select_table");
                    }}
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      borderRadius: 12,
                      border: "1px solid var(--elev-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{base.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{base.id}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Table */}
        {step === "select_table" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  setStep("select_base");
                  setSelectedTableId("");
                  setTables([]);
                }}
                style={{ padding: "8px 12px", fontSize: 14 }}
              >
                ← Back
              </button>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Select Table</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Icons.Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Loading tables...</p>
              </div>
            ) : tables.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ color: "var(--color-text-muted)" }}>No tables found in this base.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {tables.map((table) => (
                  <button
                    key={table.id}
                    className="btn-ghost"
                    onClick={() => {
                      console.log("[Airtable Import] Selected table:", { id: table.id, name: table.name });
                      setSelectedTableId(table.id);
                      setSelectedTableName(table.name);
                      setStep("map_fields");
                    }}
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      borderRadius: 12,
                      border: "1px solid var(--elev-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{table.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Map Fields */}
        {step === "map_fields" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button
                className="btn-ghost"
                onClick={() => {
                  setStep("select_table");
                  setFields([]);
                  setFieldMapping({});
                }}
                style={{ padding: "8px 12px", fontSize: 14 }}
              >
                ← Back
              </button>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Map Fields</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Icons.Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Loading fields...</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
                  Map Airtable fields to lead fields. Email is required.
                </div>
                {fields.map((field) => (
                  <div key={field.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{field.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{field.type}</div>
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
                        fontSize: 14,
                        borderRadius: 8,
                        border: "1px solid var(--elev-border)",
                        background: "var(--elev-bg)",
                      }}
                    >
                      <option value="">-- Skip --</option>
                      {LEAD_FIELDS.map((leadField) => (
                        <option key={leadField.value} value={leadField.value}>
                          {leadField.label} {leadField.required && "*"}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button className="btn-ghost" onClick={handleClose} style={{ padding: "12px 24px" }}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleImport}
                    disabled={!Object.values(fieldMapping).includes("email")}
                    style={{ padding: "12px 24px" }}
                  >
                    Start Import
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Importing Leads</h3>
            {importProgress.isImporting ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Icons.Loader size={48} style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
                <p style={{ color: "var(--color-text-muted)" }}>Importing records from Airtable...</p>
              </div>
            ) : importResult ? (
              <div>
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{importResult.imported || 0}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Imported</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#4C67FF" }}>{importResult.updated || 0}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Updated</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{importResult.failed || 0}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Failed</div>
                    </div>
                  </div>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Errors:</div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {importResult.errors.map((error: string, idx: number) => (
                        <div key={idx} style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn-primary" onClick={handleClose} style={{ padding: "12px 24px" }}>
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

