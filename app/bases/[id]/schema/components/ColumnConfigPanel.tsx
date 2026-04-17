"use client";
import { useState, useMemo } from "react";
import { ColumnType } from "@/stores/useColumnStore";
import { Icons } from "@/components/ui/Icons";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";

interface ColumnConfigPanelProps {
  type: ColumnType;
  config: any;
  onChange: (config: any) => void;
  columnId?: number; // optional, for existing columns to persist options via API
}

export function ColumnConfigPanel({ type, config, onChange, columnId }: ColumnConfigPanelProps) {
  const { showError } = useNotification();
  const [newOption, setNewOption] = useState("");
  const [newOptionColor, setNewOptionColor] = useState("#2563EB");
  const [saving, setSaving] = useState(false);

  const defaultColors = ["#2563EB", "#ff6b6b", "#4ecdc4", "#ffa726", "#66bb6a", "#ef5350", "#ab47bc", "#26c6da"];
  
  // Normalize options: handle both string[] and {id/value/label/color}
  const options = useMemo(() => {
    const rawOptions = Array.isArray(config?.options) ? config.options : [];
    return rawOptions.map((opt: any, idx: number) => {
      if (typeof opt === "string") {
        return { value: opt.toLowerCase().replace(/\s+/g, "_"), label: opt, color: defaultColors[idx % defaultColors.length] };
      }
      const value = opt.id ?? opt.value ?? opt.label;
      return { ...opt, value };
    });
  }, [config?.options, defaultColors]);

  const persistOptions = (updatedOptions: any[]) => {
    onChange({ ...config, options: updatedOptions });
  };

  const addOption = async () => {
    if (!newOption.trim()) return;
    const optionValue = newOption.trim().toLowerCase().replace(/\s+/g, "_");
    const optionLabel = newOption.trim();
    const nextColor = newOptionColor;

    // If column not yet created, only update local state
    if (!columnId) {
      const updatedOptions = [
        ...options,
        { value: optionValue, label: optionLabel, color: nextColor },
      ];
      persistOptions(updatedOptions);
      setNewOption("");
      const currentColorIndex = defaultColors.indexOf(newOptionColor);
      setNewOptionColor(defaultColors[(currentColorIndex + 1) % defaultColors.length]);
      return;
    }

    // Persist via API for existing column
    try {
      setSaving(true);
      const created = await apiRequest(`/columns/${columnId}/options`, {
        method: "POST",
        body: JSON.stringify({ label: optionLabel, color: nextColor })
      });
      const opt = created?.option;
      const updatedOptions = [
        ...options,
        { id: opt.id, value: opt.id, label: opt.label, color: opt.color, display_order: opt.display_order },
      ].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      persistOptions(updatedOptions);
      setNewOption("");
      const currentColorIndex = defaultColors.indexOf(newOptionColor);
      setNewOptionColor(defaultColors[(currentColorIndex + 1) % defaultColors.length]);
    } catch (err: any) {
      console.error("Failed to add option", err);
      showError("Add option failed", err?.message || "Failed to add option");
    } finally {
      setSaving(false);
    }
  };

  const removeOption = async (index: number) => {
    const target = options[index];
    if (!target) return;

    if (!columnId || !target.id) {
      const updatedOptions = options.filter((_: any, i: number) => i !== index);
      persistOptions(updatedOptions);
      return;
    }

    try {
      setSaving(true);
      await apiRequest(`/columns/${columnId}/options/${target.id}`, { method: "DELETE" });
      const updatedOptions = options.filter((_: any, i: number) => i !== index);
      persistOptions(updatedOptions);
    } catch (err: any) {
      console.error("Failed to remove option", err);
      showError("Remove failed", err?.message || "Failed to remove option");
    } finally {
      setSaving(false);
    }
  };

  const updateOption = async (index: number, updates: any) => {
    const updatedOptionsLocal = options.map((opt: any, i: number) =>
      i === index ? { ...opt, ...updates } : opt
    );

    const target = options[index];
    if (!columnId || !target?.id) {
      persistOptions(updatedOptionsLocal);
      return;
    }

    try {
      setSaving(true);
      await apiRequest(`/columns/${columnId}/options/${target.id}`, {
        method: "PUT",
        body: JSON.stringify({
          label: updates.label ?? target.label,
          color: updates.color ?? target.color,
          display_order: updates.display_order ?? target.display_order,
        })
      });
      persistOptions(updatedOptionsLocal);
    } catch (err: any) {
      console.error("Failed to update option", err);
      showError("Update failed", err?.message || "Failed to update option");
    } finally {
      setSaving(false);
    }
  };

  const moveOption = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === options.length - 1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updatedOptions = [...options];
    [updatedOptions[index], updatedOptions[newIndex]] = [updatedOptions[newIndex], updatedOptions[index]];

    if (!columnId) {
      persistOptions(updatedOptions);
      return;
    }

    try {
      setSaving(true);
      const orders = updatedOptions.map((opt, idx) => ({
        id: opt.id,
        display_order: idx + 1
      })).filter(o => o.id !== undefined);

      await apiRequest(`/columns/${columnId}/options/reorder`, {
        method: "POST",
        body: JSON.stringify({ orders })
      });
      const withOrders = updatedOptions.map((opt, idx) => ({ ...opt, display_order: idx + 1 }));
      persistOptions(withOrders);
    } catch (err: any) {
      console.error("Failed to reorder options", err);
      showError("Reorder failed", err?.message || "Failed to reorder options");
    } finally {
      setSaving(false);
    }
  };

  if (type === "status") {
    return (
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Status Options *
        </label>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
          Define status values with colors. Status fields are perfect for tracking deal stages, lead status, or workflow states.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {options.map((option: any, index: number) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                background: "var(--color-surface-secondary)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: option.color || "#2563EB",
                  border: `2px solid ${option.color || "#2563EB"}80`,
                  cursor: "pointer",
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = option.color || "#2563EB";
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    updateOption(index, { color: target.value });
                  };
                  input.click();
                }}
              />
              <input
                type="text"
                value={option.label || option.value || ""}
                onChange={(e) => updateOption(index, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder="Status label (e.g., New, In Progress)"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--elev-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "13px",
                }}
              />
              <input
                type="color"
                value={option.color || "#2563EB"}
                onChange={(e) => updateOption(index, { color: e.target.value })}
                style={{ width: "40px", height: "40px", border: "none", borderRadius: "6px", cursor: "pointer" }}
              />
              <button
                onClick={() => removeOption(index)}
                className="icon-btn"
                style={{ width: "28px", height: "28px", padding: 0 }}
                title="Remove status"
              >
                <Icons.X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="color"
            value={newOptionColor}
            onChange={(e) => setNewOptionColor(e.target.value)}
            style={{ width: "40px", height: "40px", border: "none", borderRadius: "6px", cursor: "pointer" }}
          />
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addOption()}
            placeholder="Add new status (e.g., Won, Lost, Pending)..."
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--elev-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text)",
              fontSize: "14px",
            }}
          />
          <button onClick={addOption} className="btn-primary" style={{ padding: "10px 16px" }}>
            <Icons.Plus size={16} />
          </button>
        </div>
        {options.length === 0 && (
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>
            Add at least one status option. Common examples: New, In Progress, Won, Lost
          </p>
        )}
        {options.length > 0 && (
          <div style={{ marginTop: "12px", padding: "12px", background: "rgba(37, 99, 235, 0.05)", borderRadius: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>Preview:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {options.map((opt: any, idx: number) => (
                <span
                  key={idx}
                  style={{
                    background: `${opt.color || "#2563EB"}20`,
                    color: opt.color || "#2563EB",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: `1px solid ${opt.color || "#2563EB"}40`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: opt.color || "#2563EB",
                    }}
                  />
                  {opt.label || opt.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "select" || type === "multiselect") {
    // Options are already normalized above
    const normalizedOptions = options;

    return (
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Dropdown Options * {type === "multiselect" && <span style={{ fontSize: "12px", fontWeight: "400", color: "var(--color-text-muted)" }}>(Multi-select)</span>}
        </label>
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
          {type === "select" 
            ? "Define options for single-select dropdown. Perfect for Lead Status, Tier, Priority, etc."
            : "Define options for multi-select dropdown. Perfect for Tags, Lead Sources, Categories, etc."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {normalizedOptions.map((option: any, index: number) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px",
                background: "var(--color-surface-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--elev-border)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <button
                  onClick={() => moveOption(index, "up")}
                  disabled={index === 0}
                  className="icon-btn"
                  style={{ width: "24px", height: "24px", padding: 0, opacity: index === 0 ? 0.3 : 1 }}
                  title="Move up"
                >
                  <Icons.ChevronUp size={12} />
                </button>
                <button
                  onClick={() => moveOption(index, "down")}
                  disabled={index === normalizedOptions.length - 1}
                  className="icon-btn"
                  style={{ width: "24px", height: "24px", padding: 0, opacity: index === normalizedOptions.length - 1 ? 0.3 : 1 }}
                  title="Move down"
                >
                  <Icons.ChevronDown size={12} />
                </button>
              </div>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: option.color || "#2563EB",
                  border: `2px solid ${option.color || "#2563EB"}80`,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = option.color || "#2563EB";
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    updateOption(index, { color: target.value });
                  };
                  input.click();
                }}
                title="Click to change color"
              />
              <input
                type="text"
                value={option.label || option.value || ""}
                onChange={(e) => {
                  const label = e.target.value;
                  const value = label.toLowerCase().replace(/\s+/g, "_");
                  updateOption(index, { label, value });
                }}
                placeholder="Option label (e.g., New, Hot, Qualified)"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--elev-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "13px",
                }}
              />
              <button
                onClick={() => removeOption(index)}
                className="icon-btn"
                style={{ width: "32px", height: "32px", padding: 0 }}
                title="Remove option"
              >
                <Icons.X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="color"
            value={newOptionColor}
            onChange={(e) => setNewOptionColor(e.target.value)}
            style={{ width: "48px", height: "48px", border: "none", borderRadius: "8px", cursor: "pointer", flexShrink: 0 }}
            title="Option color"
          />
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addOption()}
            placeholder="Add new option (e.g., New, Hot, Qualified)..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid var(--elev-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text)",
              fontSize: "14px",
            }}
          />
          <button onClick={addOption} className="btn-primary" style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Icons.Plus size={16} />
            Add
          </button>
        </div>
        {normalizedOptions.length === 0 && (
          <div style={{ padding: "16px", background: "rgba(37, 99, 235, 0.05)", borderRadius: "8px", border: "1px dashed rgba(37, 99, 235, 0.3)" }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0, textAlign: "center" }}>
              Add at least one option for this dropdown field
            </p>
          </div>
        )}
        {normalizedOptions.length > 0 && (
          <div style={{ marginTop: "16px", padding: "16px", background: "rgba(37, 99, 235, 0.05)", borderRadius: "8px", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "12px", color: "var(--color-text)" }}>
              Preview:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {normalizedOptions.map((opt: any, idx: number) => (
                <span
                  key={idx}
                  style={{
                    background: `${opt.color || "#2563EB"}20`,
                    color: opt.color || "#2563EB",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: `1px solid ${opt.color || "#2563EB"}40`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: opt.color || "#2563EB",
                      flexShrink: 0,
                    }}
                  />
                  {opt.label || opt.value}
                </span>
              ))}
            </div>
            {type === "multiselect" && (
              <div style={{ marginTop: "12px", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  💡 Multi-select allows users to choose multiple options at once
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === "number") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
              Minimum
            </label>
            <input
              type="number"
              value={config?.min ?? ""}
              onChange={(e) => onChange({ ...config, min: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="No limit"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid var(--elev-border)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text)",
                fontSize: "13px",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
              Maximum
            </label>
            <input
              type="number"
              value={config?.max ?? ""}
              onChange={(e) => onChange({ ...config, max: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="No limit"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid var(--elev-border)",
                background: "var(--color-surface-secondary)",
                color: "var(--color-text)",
                fontSize: "13px",
              }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
            Default Value
          </label>
          <input
            type="number"
            value={config?.default ?? ""}
            onChange={(e) => onChange({ ...config, default: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="Optional"
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid var(--elev-border)",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text)",
              fontSize: "13px",
            }}
          />
        </div>
      </div>
    );
  }

  if (type === "formula") {
    return (
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Formula Expression
        </label>
        <textarea
          value={config?.formula || ""}
          onChange={(e) => onChange({ ...config, formula: e.target.value })}
          placeholder="e.g., {Deal Value} * 0.1"
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--elev-border)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text)",
            fontSize: "13px",
            fontFamily: "monospace",
            resize: "vertical",
          }}
        />
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "6px" }}>
          Reference other columns using {"{Column Name}"} syntax
        </p>
      </div>
    );
  }

  if (type === "text" || type === "email" || type === "phone" || type === "url") {
    return (
      <div>
        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
          Default Value
        </label>
        <input
          type="text"
          value={config?.default || ""}
          onChange={(e) => onChange({ ...config, default: e.target.value || undefined })}
          placeholder="Optional"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--elev-border)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text)",
            fontSize: "14px",
          }}
        />
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={config?.default === true}
            onChange={(e) => onChange({ ...config, default: e.target.checked })}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px", fontWeight: "500" }}>Checked by default</span>
        </label>
      </div>
    );
  }

  return null;
}

