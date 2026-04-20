"use client";

import type { CSSProperties, ReactNode } from "react";
import { Icons } from "@/components/ui/Icons";
import {
  AirtableBrandIcon,
  GenerateLeadAIIcon,
  GoogleSheetsBrandIcon,
  MicrosoftExcelBrandIcon,
} from "@/app/leads/components/LeadSourceBrandIcons";

type LeadsImportEmptyGridProps = {
  canCreateLeads: boolean;
  sheetsConnected: boolean;
  airtableConnected: boolean;
  onGenerateAI: () => void;
  onImportCSV: () => void;
  onImportSheets?: () => void;
  onImportAirtable?: () => void;
};

const wrap: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  padding: "28px 22px 32px",
  borderRadius: 20,
  border: "1px solid var(--color-border)",
  background: "linear-gradient(165deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%)",
  boxShadow: "0 8px 32px var(--color-shadow)",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
  gap: 14,
  marginTop: 22,
};

const cardBase: CSSProperties = {
  borderRadius: 16,
  padding: "16px 14px 14px",
  textAlign: "center" as const,
  border: "1px solid var(--color-border)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0,
  minHeight: 158,
  justifyContent: "flex-start",
};

const iconSlot: CSSProperties = {
  width: 52,
  height: 52,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
  flexShrink: 0,
};

const cardTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--color-text)",
  minHeight: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1.2,
  marginBottom: 6,
};

const cardHint: CSSProperties = {
  fontSize: 12,
  color: "var(--color-text-muted)",
  lineHeight: 1.35,
  minHeight: 32,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
};

function tileIcon(borderColor: string, child: ReactNode) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${borderColor}`,
      }}
    >
      {child}
    </div>
  );
}

export function LeadsImportEmptyGrid({
  canCreateLeads,
  sheetsConnected,
  airtableConnected,
  onGenerateAI,
  onImportCSV,
  onImportSheets,
  onImportAirtable,
}: LeadsImportEmptyGridProps) {
  const items = [
    {
      key: "ai",
      title: "Generate with AI",
      hint: "Describe your ICP",
      enabled: canCreateLeads,
      icon: tileIcon("rgba(var(--color-primary-rgb), 0.28)", <GenerateLeadAIIcon size={30} sparklesSize={22} />),
      onClick: () => canCreateLeads && onGenerateAI(),
      cardBg: "var(--color-surface)",
    },
    {
      key: "csv",
      title: "Import CSV",
      hint: "Upload a file",
      enabled: canCreateLeads,
      icon: tileIcon("rgba(33, 115, 70, 0.22)", <MicrosoftExcelBrandIcon size={30} />),
      onClick: () => canCreateLeads && onImportCSV(),
      cardBg: "var(--color-surface)",
    },
    {
      key: "sheets",
      title: "Google Sheets",
      hint: sheetsConnected ? "Import from tab" : "Connect in Settings",
      enabled: canCreateLeads && sheetsConnected && Boolean(onImportSheets),
      icon: tileIcon("rgba(15, 157, 88, 0.28)", <GoogleSheetsBrandIcon size={32} />),
      onClick: () => sheetsConnected && onImportSheets?.(),
      cardBg: sheetsConnected ? "var(--color-surface)" : "var(--color-surface-secondary)",
    },
    {
      key: "airtable",
      title: "Airtable",
      hint: airtableConnected ? "Import a table" : "Connect in Settings",
      enabled: canCreateLeads && airtableConnected && Boolean(onImportAirtable),
      icon: tileIcon("rgba(24, 191, 255, 0.28)", <AirtableBrandIcon size={30} />),
      onClick: () => airtableConnected && onImportAirtable?.(),
      cardBg: airtableConnected ? "var(--color-surface)" : "var(--color-surface-secondary)",
    },
  ];

  return (
    <div style={wrap}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 14px",
            borderRadius: 16,
            background: "rgba(var(--color-primary-rgb), 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icons.Users size={26} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          No leads in this table yet
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
          Choose how to add your first contacts. Connect <strong>Google Sheets</strong> or <strong>Airtable</strong> under{" "}
          <strong>Settings → Connectors</strong> to unlock those tiles.
        </p>
      </div>

      <div style={grid}>
        {items.map((item) => {
          const interactive = item.enabled;
          return (
            <button
              key={item.key}
              type="button"
              disabled={!interactive}
              onClick={item.onClick}
              style={{
                ...cardBase,
                background: item.cardBg,
                cursor: interactive ? "pointer" : "not-allowed",
                opacity: interactive ? 1 : 0.55,
                boxShadow: interactive ? "0 2px 8px rgba(15, 23, 42, 0.06)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!interactive) return;
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.1)";
                e.currentTarget.style.borderColor = "rgba(var(--color-primary-rgb), 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = interactive ? "0 2px 8px rgba(15, 23, 42, 0.06)" : "none";
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            >
              <div style={iconSlot}>{item.icon}</div>
              <div style={cardTitle}>{item.title}</div>
              <div style={cardHint}>{item.hint}</div>
            </button>
          );
        })}
      </div>

      {!canCreateLeads ? (
        <p style={{ marginTop: 18, marginBottom: 0, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
          You have view-only access. Ask a workspace admin to add leads.
        </p>
      ) : null}
    </div>
  );
}
