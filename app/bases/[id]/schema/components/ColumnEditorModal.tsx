"use client";
import { useState, useEffect } from "react";
import { BaseColumn, ColumnType, useColumnStore } from "@/stores/useColumnStore";
import { Icons } from "@/components/ui/Icons";
import { ColumnTypeSelector } from "./ColumnTypeSelector";
import { ColumnConfigPanel } from "./ColumnConfigPanel";
import { useNotification } from "@/context/NotificationContext";

interface ColumnEditorModalProps {
  baseId: number;
  column?: BaseColumn;
  onClose: () => void;
  onSave: () => void;
}

export function ColumnEditorModal({ baseId, column, onClose, onSave }: ColumnEditorModalProps) {
  const { showError, showWarning } = useNotification();
  const { createColumn, updateColumn } = useColumnStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [config, setConfig] = useState<any>({});
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'type' | 'config'>(column ? 'config' : 'type');

  useEffect(() => {
    if (column) {
      setName(column.name);
      setType(column.type);
      const mergedConfig = { ...(column.config || {}) };
      if (!mergedConfig.options && Array.isArray((column as any).options)) {
        mergedConfig.options = (column as any).options.map((opt: any) => ({
          value: opt.id ?? opt.value ?? opt.label,
          label: opt.label,
          color: opt.color,
          display_order: opt.display_order,
        }));
      }
      setConfig(mergedConfig);
      setVisible(column.visible !== false);
    }
  }, [column]);

  const handleSave = async () => {
    if (!name.trim()) {
      showWarning("Column name required", "Please enter a column name.");
      return;
    }

    setSaving(true);
    try {
      if (column) {
        await updateColumn(column.id, {
          name: name.trim(),
          type,
          config,
          visible,
        });
      } else {
        await createColumn({
          base_id: baseId,
          name: name.trim(),
          type,
          config,
          visible,
        });
      }
      onSave();
    } catch (error: any) {
      showError("Save failed", error?.message || "Failed to save column");
    } finally {
      setSaving(false);
    }
  };

  const handleTypeSelect = (selectedType: ColumnType) => {
    setType(selectedType);
    setStep('config');
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: step === 'type' ? "560px" : "480px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: "16px 20px", 
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step === 'config' && !column && (
              <button
                onClick={() => setStep('type')}
                style={{
                  padding: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Icons.ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
                {column ? "Edit Column" : step === 'type' ? "Choose Column Type" : "Configure Column"}
              </h2>
              {step === 'type' && (
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
                  Select the type of data this column will store
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {step === 'type' ? (
            <ColumnTypeSelector value={type} onChange={handleTypeSelect} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Column Name */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                  Column Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Deal Stage, Priority"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  autoFocus={step === 'config'}
                />
              </div>

              {/* Selected Type Display */}
              {!column && (
                <div style={{ 
                  padding: "10px 12px", 
                  background: "rgba(37, 99, 235, 0.08)", 
                  borderRadius: "6px",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Type:</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#2563eb", textTransform: "capitalize" }}>
                      {type}
                    </span>
                  </div>
                  <button
                    onClick={() => setStep('type')}
                    style={{
                      fontSize: "12px",
                      color: "#2563eb",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Type-specific Configuration */}
              <ColumnConfigPanel type={type} config={config} onChange={setConfig} columnId={column?.id} />

              {/* Visibility Toggle */}
              <div style={{ 
                padding: "12px", 
                background: "var(--color-surface-secondary)", 
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  cursor: "pointer",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icons.Eye size={16} style={{ color: "var(--color-text-muted)" }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "500" }}>Show in table</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        Hidden columns can still be used in filters
                      </div>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => { e.preventDefault(); setVisible(!visible); }}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: visible ? "#2563eb" : "var(--color-border)",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: visible ? 20 : 2,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'config' && (
          <div style={{ 
            padding: "16px 20px", 
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}>
            <button 
              onClick={onClose} 
              disabled={saving}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: saving ? "not-allowed" : "pointer",
                color: "var(--color-text)",
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving || !name.trim()}
              style={{
                padding: "8px 16px",
                background: saving || !name.trim() ? "#93c5fd" : "#2563eb",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: saving || !name.trim() ? "not-allowed" : "pointer",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving ? "Saving..." : column ? "Save Changes" : "Create Column"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
