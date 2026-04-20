"use client";
import { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { useColumnStore } from "@/stores/useColumnStore";
import { useNotification } from "@/context/NotificationContext";

interface StatusFieldHelperProps {
  baseId: number;
  onCreated: () => void;
}

const COMMON_STATUS_TEMPLATES = [
  {
    name: "Deal Status",
    options: [
      { value: "new", label: "New", color: "var(--color-primary)" },
      { value: "contacted", label: "Contacted", color: "#ffa726" },
      { value: "qualified", label: "Qualified", color: "#66bb6a" },
      { value: "proposal", label: "Proposal", color: "#ab47bc" },
      { value: "negotiation", label: "Negotiation", color: "#26c6da" },
      { value: "won", label: "Won", color: "#4caf50" },
      { value: "lost", label: "Lost", color: "#ef5350" },
    ],
  },
  {
    name: "Lead Status",
    options: [
      { value: "new", label: "New", color: "var(--color-primary)" },
      { value: "contacted", label: "Contacted", color: "#ffa726" },
      { value: "qualified", label: "Qualified", color: "#66bb6a" },
      { value: "nurturing", label: "Nurturing", color: "#ab47bc" },
      { value: "converted", label: "Converted", color: "#4caf50" },
      { value: "unqualified", label: "Unqualified", color: "#9e9e9e" },
    ],
  },
  {
    name: "Task Status",
    options: [
      { value: "todo", label: "To Do", color: "#9e9e9e" },
      { value: "in_progress", label: "In Progress", color: "#ffa726" },
      { value: "review", label: "Review", color: "#26c6da" },
      { value: "done", label: "Done", color: "#4caf50" },
      { value: "blocked", label: "Blocked", color: "#ef5350" },
    ],
  },
];

export function StatusFieldHelper({ baseId, onCreated }: StatusFieldHelperProps) {
  const { createColumn } = useColumnStore();
  const { showSuccess, showError } = useNotification();
  const [creating, setCreating] = useState(false);

  const handleCreateFromTemplate = async (template: typeof COMMON_STATUS_TEMPLATES[0]) => {
    setCreating(true);
    try {
      await createColumn({
        base_id: baseId,
        name: template.name,
        type: "status",
        config: {
          options: template.options,
          default: template.options[0]?.value,
        },
        visible: true,
      });
      showSuccess("Status Field Created", `Created "${template.name}" field with ${template.options.length} status options.`);
      onCreated();
    } catch (error: any) {
      showError("Failed to Create", error?.message || "Failed to create status field");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginTop: "24px", padding: "20px", background: "rgba(var(--color-primary-rgb), 0.2)", borderRadius: "12px", border: "1px solid rgba(var(--color-primary-rgb), 0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Icons.Lightbulb size={20} style={{ color: "var(--color-primary)" }} />
        <h4 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>Quick Create Status Field</h4>
      </div>
      <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
        Create a status field from a template with pre-configured options and colors.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
        {COMMON_STATUS_TEMPLATES.map((template) => (
          <button
            key={template.name}
            onClick={() => handleCreateFromTemplate(template)}
            disabled={creating}
            className="btn-ghost"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid var(--elev-border)",
              background: "var(--color-surface-secondary)",
              textAlign: "left",
              cursor: creating ? "not-allowed" : "pointer",
              opacity: creating ? 0.6 : 1,
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>{template.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {template.options.slice(0, 4).map((opt) => (
                <span
                  key={opt.value}
                  style={{
                    background: `${opt.color}20`,
                    color: opt.color,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "500",
                  }}
                >
                  {opt.label}
                </span>
              ))}
              {template.options.length > 4 && (
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                  +{template.options.length - 4} more
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

