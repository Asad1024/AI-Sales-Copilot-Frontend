"use client";
import { useState } from "react";
import { Icons } from "@/components/ui/Icons";

interface RatingCellProps {
  value: any;
  onUpdate: (value: any) => void;
  editable?: boolean;
  max?: number;
}

export function RatingCell({ value, onUpdate, editable = true, max = 5 }: RatingCellProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rating = value !== null && value !== undefined ? Math.min(Math.max(0, Math.round(value)), max) : 0;

  const handleClick = (index: number) => {
    if (editable) {
      onUpdate(index + 1);
    }
  };

  if (!editable) {
    return (
      <div style={{ display: "flex", gap: "2px" }}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{ color: i < rating ? "#ffa726" : "var(--color-text-muted)", fontSize: "14px" }}>
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < rating || (hoveredIndex !== null && i <= hoveredIndex);
        return (
          <span
            key={i}
            onClick={() => handleClick(i)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              color: isFilled ? "#ffa726" : "var(--color-text-muted)",
              fontSize: "16px",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

