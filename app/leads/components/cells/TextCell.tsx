"use client";
import { useState, useRef, useEffect } from "react";

interface TextCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  type?: "text" | "email" | "phone" | "url";
}

export function TextCell({ value, onUpdate, editable = true, type = "text" }: TextCellProps) {
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
    if (editValue !== String(value || "")) {
      onUpdate(editValue || null);
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
        {value || "—"}
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type === "email" ? "email" : type === "phone" ? "tel" : type === "url" ? "url" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
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
      {value || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Click to edit</span>}
    </div>
  );
}

