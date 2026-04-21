import { Icons } from "@/components/ui/Icons";

interface CampaignTabsProps {
  tab: "overview" | "sequence" | "analytics" | "leads" | "transcripts";
  setTab: (tab: "overview" | "sequence" | "analytics" | "leads" | "transcripts") => void;
}

export function CampaignTabs({ tab, setTab }: CampaignTabsProps) {
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Icons.Dashboard },
    { id: "leads" as const, label: "Leads", icon: Icons.Users },
    { id: "sequence" as const, label: "Sequence", icon: Icons.Send },
    { id: "analytics" as const, label: "Analytics", icon: Icons.Chart },
    { id: "transcripts" as const, label: "Call transcripts", icon: Icons.Phone },
  ];

  return (
    <div
      role="tablist"
      aria-label="Campaign sections"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 20,
        padding: 4,
        borderRadius: 12,
        background: "var(--color-surface-secondary)",
        border: "1px solid var(--color-border-light)",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((t) => {
        const IconComponent = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              border: active ? "1px solid var(--color-primary)" : "1px solid transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              fontFamily: "inherit",
              color: active ? "#ffffff" : "var(--color-text-muted)",
              background: active ? "var(--color-primary)" : "transparent",
              boxShadow: active ? "0 6px 14px rgba(var(--color-primary-rgb), 0.24)" : "none",
              transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <IconComponent size={16} strokeWidth={1.5} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
