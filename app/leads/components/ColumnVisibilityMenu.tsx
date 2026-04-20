"use client";
import { useState, useEffect, useRef } from "react";
import { Icons } from "@/components/ui/Icons";
import { useColumnStore } from "@/stores/useColumnStore";
import { useBaseStore } from "@/stores/useBaseStore";
import { useNotification } from "@/context/NotificationContext";

interface ColumnVisibilityMenuProps {
  onClose: () => void;
}

export function ColumnVisibilityMenu({ onClose }: ColumnVisibilityMenuProps) {
  const { activeBaseId } = useBaseStore();
  const { columns, fetchColumns, updateColumn } = useColumnStore();
  const { showSuccess } = useNotification();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeBaseId) {
      fetchColumns(activeBaseId);
    }
  }, [activeBaseId, fetchColumns]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleToggleVisibility = async (columnId: number, currentVisible: boolean) => {
    try {
      await updateColumn(columnId, { visible: !currentVisible });
      showSuccess("Column Updated", `Column ${currentVisible ? "hidden" : "shown"}`);
    } catch (error: any) {
      console.error("Failed to update column visibility:", error);
    }
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: "8px",
        background: "var(--color-surface)",
        border: "1px solid var(--elev-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "8px",
        minWidth: "250px",
        maxHeight: "400px",
        overflowY: "auto",
        zIndex: 5000,
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: "600", padding: "8px", marginBottom: "4px" }}>
        Column Visibility
      </div>
      {columns.map((column) => (
        <label
          key={column.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(var(--color-primary-rgb), 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <input
            type="checkbox"
            checked={column.visible}
            onChange={() => handleToggleVisibility(column.id, column.visible)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <span style={{ fontSize: "13px", flex: 1 }}>{column.name}</span>
          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{column.type}</span>
        </label>
      ))}
      {columns.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)" }}>
          No custom columns
        </div>
      )}
    </div>
  );
}

