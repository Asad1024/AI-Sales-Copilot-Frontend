"use client";
import { useState, useRef, useEffect } from "react";

interface TextCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  type?: "text" | "email" | "phone" | "url";
  /** Muted secondary text (e.g. Title column to align with Company). */
  muted?: boolean;
}

export function TextCell({ value, onUpdate, editable = true, type = "text", muted = false }: TextCellProps) {
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

  const displayClass = muted ? "text-[12px] text-slate-500 dark:text-slate-400" : "text-[12px] text-slate-900 dark:text-slate-100";

  if (!editable) {
    return (
      <div className={muted && !value ? "text-[12px] text-slate-400 dark:text-slate-500" : displayClass}>
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
          border: "1px solid #7C3AED",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "11px",
          outline: "none",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={muted ? "text-slate-500 dark:text-slate-400" : ""}
      style={{
        fontSize: "11px",
        color: muted ? undefined : "var(--color-text)",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        minHeight: "24px",
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(124, 58, 237, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {value || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Click to edit</span>}
    </div>
  );
}

