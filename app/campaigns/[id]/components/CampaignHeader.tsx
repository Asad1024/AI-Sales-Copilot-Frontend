import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";

interface Campaign {
  id: number;
  name: string;
  channel: "email" | "linkedin" | "whatsapp" | "call";
  status: "running" | "paused" | "draft" | "completed";
  base_id: number;
  updated_at?: string;
  tier_filter?: string;
  channels?: string[];
}

interface CampaignHeaderProps {
  campaign: Campaign;
  baseName: string;
  updating: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
}

export function CampaignHeader({ campaign, baseName, updating, onToggleStatus, onEdit }: CampaignHeaderProps) {
  const router = useRouter();

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return Icons.Mail;
      case "linkedin":
        return Icons.Linkedin;
      case "whatsapp":
        return Icons.MessageCircle;
      case "call":
        return Icons.Phone;
      default:
        return Icons.Send;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "running":
        return {
          bg: "rgba(37, 99, 235, 0.12)",
          color: "var(--color-primary)",
          border: "1px solid rgba(37, 99, 235, 0.28)",
        };
      case "paused":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          color: "#d97706",
          border: "1px solid rgba(245, 158, 11, 0.35)",
        };
      case "draft":
        return {
          bg: "var(--color-surface-secondary)",
          color: "var(--color-text-muted)",
          border: "1px solid var(--color-border)",
        };
      case "completed":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          color: "#059669",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        };
      default:
        return {
          bg: "var(--color-surface-secondary)",
          color: "var(--color-text-muted)",
          border: "1px solid var(--color-border)",
        };
    }
  };

  const statusStyle = getStatusStyle(campaign.status);
  const ChannelIcon = getChannelIcon(campaign.channel);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        boxShadow: "0 4px 24px var(--color-shadow)",
        padding: "22px 24px",
        overflow: "visible",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize",
                ...statusStyle,
              }}
            >
              {campaign.status === "completed" && <Icons.CheckCircle size={13} strokeWidth={1.75} />}
              {campaign.status === "running" && <Icons.Circle size={10} style={{ fill: "currentColor" }} />}
              {campaign.status === "paused" && <Icons.Pause size={13} strokeWidth={1.75} />}
              {campaign.status === "draft" && <Icons.FileText size={13} strokeWidth={1.75} />}
              {campaign.status}
            </span>
          </div>

          <h1
            style={{
              margin: "0 0 12px 0",
              fontSize: "clamp(20px, 2.2vw, 26px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              color: "var(--color-text)",
            }}
          >
            {campaign.name}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ChannelIcon size={15} strokeWidth={1.5} style={{ color: "var(--color-primary)", opacity: 0.9 }} />
              <span style={{ textTransform: "capitalize" }}>{campaign.channel}</span>
            </span>
            {campaign.channels && campaign.channels.length > 1 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 8,
                  background: "rgba(37, 99, 235, 0.08)",
                  color: "var(--color-primary)",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                }}
              >
                +{campaign.channels.length - 1} more
              </span>
            )}
            <span aria-hidden>·</span>
            <span>{baseName}</span>
            {campaign.tier_filter && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    campaign.tier_filter === "Hot"
                      ? "rgba(239, 68, 68, 0.08)"
                      : campaign.tier_filter === "Warm"
                        ? "rgba(245, 158, 11, 0.1)"
                        : "var(--color-surface-secondary)",
                  color:
                    campaign.tier_filter === "Hot"
                      ? "#dc2626"
                      : campaign.tier_filter === "Warm"
                        ? "#d97706"
                        : "var(--color-text-muted)",
                  border: "1px solid var(--color-border-light)",
                }}
              >
                {campaign.tier_filter === "Hot" ? <Icons.Flame size={13} /> : null}
                {campaign.tier_filter === "Warm" ? <Icons.Thermometer size={13} /> : null}
                {campaign.tier_filter !== "Hot" && campaign.tier_filter !== "Warm" ? <Icons.Snowflake size={13} /> : null}
                {campaign.tier_filter}
              </span>
            )}
          </div>
          {campaign.updated_at && (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 10 }}>
              Last updated {new Date(campaign.updated_at).toLocaleString()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes campaign-header-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}} />
          <button
            type="button"
            className="btn-dashboard-outline focus-ring inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-medium"
            onClick={() => router.push("/campaigns")}
          >
            <Icons.ChevronLeft size={16} strokeWidth={1.5} />
            Back
          </button>
          <button
            type="button"
            className="btn-primary focus-ring inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
            onClick={onToggleStatus}
            disabled={updating || campaign.status === "completed"}
          >
            {updating ? (
              <>
                <Icons.Loader size={16} strokeWidth={1.5} style={{ animation: "campaign-header-spin 0.9s linear infinite" }} />
                Updating…
              </>
            ) : campaign.status === "running" ? (
              <>
                <Icons.Pause size={16} strokeWidth={1.5} />
                Pause
              </>
            ) : campaign.status === "paused" ? (
              <>
                <Icons.Play size={16} strokeWidth={1.5} />
                Resume
              </>
            ) : campaign.status === "draft" ? (
              <>
                <Icons.Send size={18} strokeWidth={2} aria-hidden />
                Launch
              </>
            ) : (
              <>
                <Icons.CheckCircle size={16} strokeWidth={1.5} />
                Completed
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-dashboard-outline focus-ring inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-medium"
            onClick={onEdit}
          >
            <Icons.FileEdit size={16} strokeWidth={1.5} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
