"use client";
import { useState, useRef, useEffect } from "react";

interface DateCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
}

export function DateCell({ value, onUpdate, editable = true }: DateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const displayDate = (dateValue: any) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  const handleSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value ? new Date(e.target.value).toISOString() : null;
    if (newValue !== value) {
      onUpdate(newValue);
    }
    setIsEditing(false);
  };

  if (!editable) {
    return (
      <div style={{ fontSize: "13px", color: "var(--color-text)" }}>
        {displayDate(value)}
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={formatDate(value)}
        onBlur={handleSave}
        onChange={handleSave}
        style={{
          width: "100%",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "1px solid var(--color-primary)",
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
        e.currentTarget.style.background = "rgba(var(--color-primary-rgb), 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {displayDate(value)}
    </div>
  );
}

