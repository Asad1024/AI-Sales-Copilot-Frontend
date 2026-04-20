"use client";
import { useState, useRef, useEffect } from "react";

interface SelectCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  options: Array<{ id?: number; value?: string; label: string; color?: string } | string>;
}

export function SelectCell({ value, onUpdate, editable = true, options }: SelectCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const normalizeOptions = () => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt, color: "var(--color-primary)" };
      }
      const value = opt.id !== undefined ? String(opt.id) : (opt.value || opt.label);
      return { ...opt, value };
    });
  };

  const normalizedOptions = normalizeOptions();
  const selectedOption = normalizedOptions.find(
    (opt) => opt.value === String(value) || opt.label === String(value)
  );

  const handleSave = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null;
    if (newValue !== value) {
      onUpdate(newValue);
    }
    setIsEditing(false);
  };

  if (!editable) {
    if (!selectedOption) {
      return <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>—</div>;
    }
    return (
      <span
        style={{
          background: selectedOption.color ? `${selectedOption.color}20` : "rgba(var(--color-primary-rgb), 0.2)",
          color: selectedOption.color || "var(--color-primary)",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "500",
        }}
      >
        {selectedOption.label}
      </span>
    );
  }

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        value={value ? String(value) : ""}
        onChange={handleSave}
        onBlur={() => setIsEditing(false)}
        style={{
          width: "100%",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "1px solid var(--color-primary)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "13px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">—</option>
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
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
      {selectedOption ? (
        <span
          style={{
            background: selectedOption.color ? `${selectedOption.color}20` : "rgba(var(--color-primary-rgb), 0.2)",
            color: selectedOption.color || "var(--color-primary)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          {selectedOption.label}
        </span>
      ) : (
        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "13px" }}>Click to select</span>
      )}
    </div>
  );
}

