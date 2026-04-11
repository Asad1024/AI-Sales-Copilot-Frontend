"use client";
import { useState } from "react";
import { BaseColumn } from "@/stores/useColumnStore";
import { Icons } from "@/components/ui/Icons";
import { useColumnStore } from "@/stores/useColumnStore";
import { useNotification } from "@/context/NotificationContext";
import EmptyStateBanner from "@/components/ui/EmptyStateBanner";
import { useConfirm } from "@/context/ConfirmContext";

interface ColumnListProps {
  columns: BaseColumn[];
  baseId: number;
  onEdit: (column: BaseColumn) => void;
  onDelete?: () => void;
  onAddColumn?: () => void;
}

const columnTypeLabels: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  email: "Email",
  phone: "Phone",
  url: "URL",
  select: "Select",
  status: "Status",
  multiselect: "Multi-select",
  checkbox: "Checkbox",
  rating: "Rating",
  formula: "Formula",
};

export function ColumnList({ columns, baseId, onEdit, onDelete, onAddColumn }: ColumnListProps) {
  const { deleteColumn, updateColumn } = useColumnStore();
  const { showSuccess, showError } = useNotification();
  const confirmDialog = useConfirm();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (column: BaseColumn) => {
    const ok = await confirmDialog({
      title: "Delete column?",
      message: `Delete "${column.name}"? This removes the column from all leads. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingId(column.id);
    try {
      await deleteColumn(column.id);
      showSuccess("Column Deleted", `Column "${column.name}" has been deleted.`);
      onDelete?.();
    } catch (error: any) {
      showError("Delete Failed", error?.message || "Failed to delete column.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (column: BaseColumn) => {
    try {
      await updateColumn(column.id, { visible: !column.visible });
      showSuccess("Column Updated", `Column "${column.name}" visibility updated.`);
    } catch (error: any) {
      showError("Update Failed", error?.message || "Failed to update column.");
    }
  };

  if (columns.length === 0) {
    return (
      <EmptyStateBanner
        icon={<Icons.Columns size={18} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />}
        title="No columns yet"
        description="Create your first column to start organizing your leads. You can also add a status field above."
        actions={
          onAddColumn ? (
            <button type="button" onClick={onAddColumn} className="btn-primary" style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icons.Plus size={16} strokeWidth={1.5} />
              Add column
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="card-enhanced" style={{ borderRadius: 16, padding: 24, overflow: "hidden" }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Columns ({columns.length})</h3>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          Drag to reorder • Click to edit • Toggle visibility
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--elev-border)" }}>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", width: "40px" }}>
                Order
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Name
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Type
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Configuration
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Visibility
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", width: "120px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column, index) => (
              <tr
                key={column.id}
                style={{
                  borderBottom: "1px solid var(--elev-border)",
                  background: index % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                }}
              >
                <td style={{ padding: "16px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icons.GripVertical size={16} style={{ opacity: 0.5, cursor: "grab" }} />
                    <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                      {column.display_order}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "16px 12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>{column.name}</div>
                </td>
                <td style={{ padding: "16px 12px" }}>
                  <span
                    style={{
                      background: "rgba(124, 58, 237, 0.1)",
                      color: "#7C3AED",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {columnTypeLabels[column.type] || column.type}
                  </span>
                </td>
                <td style={{ padding: "16px 12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {column.type === "select" || column.type === "multiselect" ? (
                      <span>
                        {Array.isArray(column.config?.options) ? `${column.config.options.length} options` : "No options"}
                      </span>
                    ) : column.type === "number" ? (
                      <span>
                        {column.config?.min !== undefined || column.config?.max !== undefined
                          ? `${column.config.min || "∞"} - ${column.config.max || "∞"}`
                          : "No limits"}
                      </span>
                    ) : column.type === "formula" ? (
                      <span>{column.config?.formula ? "Has formula" : "No formula"}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px 12px" }}>
                  <button
                    onClick={() => handleToggleVisibility(column)}
                    className="btn-ghost"
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    title={column.visible ? "Hide column" : "Show column"}
                  >
                    {column.visible ? (
                      <>
                        <Icons.Eye size={14} />
                        Visible
                      </>
                    ) : (
                      <>
                        <Icons.EyeOff size={14} />
                        Hidden
                      </>
                    )}
                  </button>
                </td>
                <td style={{ padding: "16px 12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => onEdit(column)}
                      className="icon-btn"
                      title="Edit column"
                      style={{ width: "32px", height: "32px", padding: 0 }}
                    >
                      <Icons.FileEdit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(column)}
                      disabled={deletingId === column.id}
                      className="icon-btn"
                      title="Delete column"
                      style={{
                        width: "32px",
                        height: "32px",
                        padding: 0,
                        opacity: deletingId === column.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === column.id ? (
                        <Icons.Loader size={16} className="animate-spin" />
                      ) : (
                        <Icons.Trash size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

