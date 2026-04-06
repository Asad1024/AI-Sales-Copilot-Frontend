"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

type AppIcon = typeof Icons.Circle;

/** Icons aligned with pipeline stages (values match DEFAULT_LEAD_STATUS_OPTIONS). */
const LEAD_STATUS_ICONS: Record<string, AppIcon> = {
  new: Icons.Circle,
  contacted: Icons.Mail,
  qualified: Icons.Target,
  negotiation: Icons.Handshake,
  won: Icons.CheckCircle,
  lost: Icons.TrendingDown,
};

function LeadStatusIcon({
  statusValue,
  color,
  size = 12,
}: {
  statusValue: string;
  color: string;
  size?: number;
}) {
  const Ic = LEAD_STATUS_ICONS[statusValue] ?? Icons.Tag;
  return <Ic size={size} strokeWidth={2} style={{ color, flexShrink: 0 }} aria-hidden />;
}

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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${selectedOption.color}18`,
          color: selectedOption.color,
          padding: "4px 10px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: 600,
          border: `1px solid ${selectedOption.color}35`,
        }}
      >
        <LeadStatusIcon statusValue={selectedOption.value} color={selectedOption.color} size={13} />
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
                gap: 10,
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
              <LeadStatusIcon statusValue={opt.value} color={opt.color} size={14} />
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
            background: `${selectedOption.color}18`,
            color: selectedOption.color,
            padding: "4px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 600,
            border: `1px solid ${selectedOption.color}38`,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          aria-label={`Status: ${selectedOption.label}. Change status`}
        >
          <LeadStatusIcon statusValue={selectedOption.value} color={selectedOption.color} size={13} />
          {selectedOption.label}
          <Icons.ChevronDown size={12} strokeWidth={2} style={{ opacity: 0.65 }} aria-hidden />
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
            gap: 6,
            minHeight: 30,
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-secondary)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          <Icons.Circle size={14} strokeWidth={1.75} style={{ opacity: 0.7 }} aria-hidden />
          <span>Set status</span>
        </button>
      )}
    </div>
  );
}

