"use client";
import { useState, useRef, useEffect } from "react";

interface NumberCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  min?: number;
  max?: number;
}

export function NumberCell({ value, onUpdate, editable = true, min, max }: NumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value || ""));
  }, [value]);

  const handleSave = () => {
    const numValue = editValue === "" ? null : parseFloat(editValue);
    if (numValue !== null && !isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        alert(`Value must be at least ${min}`);
        return;
      }
      if (max !== undefined && numValue > max) {
        alert(`Value must be at most ${max}`);
        return;
      }
      if (numValue !== value) {
        onUpdate(numValue);
      }
    } else if (editValue === "") {
      onUpdate(null);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(String(value || ""));
      setIsEditing(false);
    }
  };

  if (!editable) {
    return (
      <div style={{ fontSize: "13px", color: "var(--color-text)" }}>
        {value !== null && value !== undefined ? value : "—"}
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        style={{
          width: "100%",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "1px solid #4C67FF",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "13px",
          outline: "none",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
        fontSize: "13px",
        color: "var(--color-text)",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        minHeight: "24px",
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {value !== null && value !== undefined ? value : <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Click to edit</span>}
    </div>
  );
}

