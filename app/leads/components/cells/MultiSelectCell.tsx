"use client";
import { useState, useRef, useEffect } from "react";

interface MultiSelectCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  options: Array<{ id?: number; value?: string; label: string; color?: string } | string>;
}

export function MultiSelectCell({ value, onUpdate, editable = true, options }: MultiSelectCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown when editing starts
  useEffect(() => {
    if (isEditing && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Use actual dropdown dimensions if available, otherwise estimates
      const dropdownHeight = dropdownRef.current?.offsetHeight || 250;
      const dropdownWidth = Math.min(rect.width * 1.5, 300); // Scale based on cell width, max 300px

      // Position directly below the cell with minimal gap
      let top = rect.bottom + scrollY + 2;
      let left = rect.left + scrollX;

      // If dropdown would go below viewport, position above
      if (rect.bottom + dropdownHeight > viewportHeight) {
        top = rect.top + scrollY - dropdownHeight - 2;
      }

      // If dropdown would go off right edge, align to right edge of cell
      if (rect.left + dropdownWidth > viewportWidth) {
        left = rect.right + scrollX - dropdownWidth;
      }

      // Ensure dropdown doesn't go off left edge
      if (left < scrollX + 10) {
        left = scrollX + 10;
      }

      // Ensure dropdown doesn't go off right edge of viewport
      if (left + dropdownWidth > viewportWidth + scrollX) {
        left = viewportWidth + scrollX - dropdownWidth - 10;
      }

      setDropdownStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
      });
    }
  }, [isEditing]);

  // Recalculate position after dropdown renders to use actual dimensions
  useEffect(() => {
    if (isEditing && containerRef.current && dropdownRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      const dropdownHeight = dropdownRect.height;
      const dropdownWidth = dropdownRect.width;

      // Position directly below the cell with minimal gap
      let top = rect.bottom + scrollY + 2;
      let left = rect.left + scrollX;

      // If dropdown would go below viewport, position above
      if (rect.bottom + dropdownHeight > viewportHeight) {
        top = rect.top + scrollY - dropdownHeight - 2;
      }

      // If dropdown would go off right edge, align to right edge of cell
      if (rect.left + dropdownWidth > viewportWidth) {
        left = rect.right + scrollX - dropdownWidth;
      }

      // Ensure dropdown doesn't go off left edge
      if (left < scrollX + 10) {
        left = scrollX + 10;
      }

      // Ensure dropdown doesn't go off right edge of viewport
      if (left + dropdownWidth > viewportWidth + scrollX) {
        left = viewportWidth + scrollX - dropdownWidth - 10;
      }

      setDropdownStyle({
        top: `${top}px`,
        left: `${left}px`,
      });
    }
  }, [isEditing]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        containerRef.current &&
        dropdownRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const normalizeOptions = () => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt, color: "#4C67FF" };
      }
      const value = opt.id !== undefined ? String(opt.id) : (opt.value || opt.label);
      return { ...opt, value };
    });
  };

  const normalizedOptions = normalizeOptions();
  const selectedValues = Array.isArray(value)
    ? value.map((v) => String(v))
    : value
      ? [String(value)]
      : [];
  const selectedOptions = normalizedOptions.filter(
    (opt) => selectedValues.includes(opt.value) || selectedValues.includes(String(opt.label))
  );

  const handleToggle = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    onUpdate(newValues.length > 0 ? newValues : null);
  };

  if (!editable) {
    if (selectedOptions.length === 0) {
      return <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>—</div>;
    }
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            style={{
              background: opt.color ? `${opt.color}20` : "rgba(76, 103, 255, 0.1)",
              color: opt.color || "#4C67FF",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "500",
            }}
          >
            {opt.label}
          </span>
        ))}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {/* Dropdown positioned absolutely */}
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            zIndex: 1000,
            background: "var(--color-surface)",
            border: "1px solid #4C67FF",
            borderRadius: "6px",
            minWidth: "180px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            padding: "8px",
            ...dropdownStyle,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
            {normalizedOptions.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "13px" }}>{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setIsEditing(false)}
            style={{
              marginTop: "8px",
              padding: "4px 12px",
              fontSize: "12px",
              background: "#4C67FF",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Done
          </button>
        </div>
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
        flexWrap: "wrap",
        gap: "4px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(76, 103, 255, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {selectedOptions.length > 0 ? (
        selectedOptions.map((opt) => (
          <span
            key={opt.value}
            style={{
              background: opt.color ? `${opt.color}20` : "rgba(76, 103, 255, 0.1)",
              color: opt.color || "#4C67FF",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "500",
            }}
          >
            {opt.label}
          </span>
        ))
      ) : (
        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "13px" }}>Click to select</span>
      )}
    </div>
  );
}

