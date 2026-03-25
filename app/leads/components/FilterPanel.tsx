"use client";
import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";
import { useLeadStore } from "@/stores/useLeadStore";

interface FilterPanelProps {
  onClose: () => void;
}

export function FilterPanel({ onClose }: FilterPanelProps) {
  const { filters, setFilters } = useLeadStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: "8px",
        background: "var(--color-surface)",
        border: "1px solid var(--elev-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "16px",
        minWidth: "300px",
        zIndex: 5000,
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Filters</div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Object.entries(filters.aiFilters || {}).map(([key, value]) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) =>
                setFilters({
                  aiFilters: { ...filters.aiFilters, [key]: e.target.checked },
                })
              }
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13px" }}>
              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
            </span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--elev-border)" }}>
        <button
          onClick={() => {
            setFilters({
              search: "",
              segment: "All",
              aiFilters: {
                highIntent: false,
                recentlyActive: false,
                needsFollowUp: false,
              },
            });
          }}
          className="btn-ghost"
          style={{ width: "100%", fontSize: "12px" }}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}

