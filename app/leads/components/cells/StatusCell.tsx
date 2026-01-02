"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

interface StatusCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  options: Array<{ value: string; label: string; color: string }>;
}

export function StatusCell({ value, onUpdate, editable = true, options }: StatusCellProps) {
  const [isEditing, setIsEditing] = useState(false);
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

  const handleSelect = (optionValue: string) => {
    if (optionValue !== value) {
      onUpdate(optionValue);
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
          background: `${selectedOption.color}20`,
          color: selectedOption.color,
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
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
      <div ref={dropdownRef} style={{ position: "relative" }}>
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
              onClick={() => handleSelect(opt.value)}
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
              <span style={{ fontSize: "13px", fontWeight: value === opt.value ? "600" : "500" }}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Icons.Check size={14} style={{ marginLeft: "auto", color: opt.color }} />
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
          onClick={() => setIsEditing(false)}
        />
      </div>
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
        e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {selectedOption ? (
        <span
          style={{
            background: `${selectedOption.color}20`,
            color: selectedOption.color,
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            border: `1px solid ${selectedOption.color}40`,
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
              background: selectedOption.color,
            }}
          />
          {selectedOption.label}
        </span>
      ) : (
        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "13px" }}>
          Click to select status
        </span>
      )}
    </div>
  );
}

