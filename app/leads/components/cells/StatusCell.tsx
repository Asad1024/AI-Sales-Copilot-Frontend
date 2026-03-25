"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

interface StatusCellProps {
  value: any;
  onUpdate: (value: any) => void | Promise<void>;
  editable?: boolean;
  options: Array<{ value: string; label: string; color: string }>;
}

export function StatusCell({ value, onUpdate, editable = true, options }: StatusCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = async (optionValue: string) => {
    setIsEditing(false);
    if (optionValue === value) return;
    setSaving(true);
    try {
      await Promise.resolve(onUpdate(optionValue));
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px",
          minHeight: 24,
          borderRadius: 6,
          background: "var(--color-surface-secondary)",
          border: "1px solid var(--color-border)",
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Icons.Loader size={14} strokeWidth={1.5} className="animate-spin" style={{ color: "var(--color-primary)" }} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>Updating status…</span>
      </div>
    );
  }

  if (!editable) {
    if (!selectedOption) {
      return <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>—</div>;
    }
    return (
      <span
        style={{
          background: `${selectedOption.color}20`,
          color: selectedOption.color,
          padding: "3px 10px",
          borderRadius: "6px",
          fontSize: "10px",
          fontWeight: "600",
          border: `1px solid ${selectedOption.color}40`,
        }}
      >
        {selectedOption.label}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div
        ref={dropdownRef}
        style={{ position: "relative" }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 1000,
            background: "var(--color-surface)",
            border: "1px solid var(--elev-border)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "4px",
            minWidth: "200px",
            marginTop: "4px",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(opt.value);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: value === opt.value ? `${opt.color}10` : "transparent",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${opt.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = value === opt.value ? `${opt.color}10` : "transparent";
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: opt.color,
                  border: `2px solid ${opt.color}80`,
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: value === opt.value ? "600" : "500" }}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Icons.Check size={12} style={{ marginLeft: "auto", color: opt.color }} />
              )}
            </div>
          ))}
        </div>
        {/* Click overlay to close */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 24,
      }}
    >
      {selectedOption ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsEditing(true);
          }}
          style={{
            background: `${selectedOption.color}20`,
            color: selectedOption.color,
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: "600",
            border: `1px solid ${selectedOption.color}40`,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          aria-label={`Status: ${selectedOption.label}. Change status`}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: selectedOption.color,
            }}
          />
          {selectedOption.label}
          <Icons.ChevronDown size={10} strokeWidth={2} style={{ opacity: 0.65 }} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsEditing(true);
          }}
          className="focus-ring"
          aria-label="Set lead status"
          title="Set status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            padding: 0,
            borderRadius: 5,
            border: "1px dashed var(--color-border)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            gap: 3,
          }}
        >
          <Icons.Tag size={10} strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}

