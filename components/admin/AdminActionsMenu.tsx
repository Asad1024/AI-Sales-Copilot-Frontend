"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export type AdminMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

const menuItemBase: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  textAlign: "left",
  color: "var(--color-text)",
  fontFamily: "Inter, sans-serif",
};

export default function AdminActionsMenu({
  items,
  ariaLabel = "Actions",
}: {
  items: AdminMenuItem[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="icon-btn header-utility-btn"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "var(--color-surface-secondary)",
          color: "var(--color-text-muted)",
          cursor: "pointer",
        }}
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 80,
            minWidth: 168,
            padding: 4,
            borderRadius: 12,
            border: "none",
            background: "var(--color-surface)",
            boxShadow: "0 10px 40px rgba(15, 23, 42, 0.12)",
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              style={{
                ...menuItemBase,
                color: item.danger ? "#dc2626" : menuItemBase.color,
              }}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
