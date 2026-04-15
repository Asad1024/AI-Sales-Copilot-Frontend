"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/components/ui/Icons";

type LandingAppearance = "light" | "dark";

type LandingThemeToggleProps = {
  appearance: LandingAppearance;
  onToggle: () => void;
};

export default function LandingThemeToggle({ appearance, onToggle }: LandingThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const btn = 38;
  const iconSz = 18;
  const isLight = appearance === "light";

  if (!mounted) {
    return <div style={{ width: btn, height: btn, flexShrink: 0 }} aria-hidden />;
  }

  return (
    <button
      type="button"
      className="landing-theme-toggle"
      onClick={onToggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark marketing theme" : "Light marketing theme"}
      style={{
        width: btn,
        height: btn,
        borderRadius: 10,
        border: isLight ? "1px solid rgba(15, 23, 42, 0.12)" : "1px solid rgba(255, 255, 255, 0.14)",
        background: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.06)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isLight ? "#475569" : "rgba(255, 255, 255, 0.78)",
        flexShrink: 0,
        transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
      }}
    >
      {isLight ? <Icons.Moon size={iconSz} strokeWidth={1.5} /> : <Icons.Sun size={iconSz} strokeWidth={1.5} />}
    </button>
  );
}
