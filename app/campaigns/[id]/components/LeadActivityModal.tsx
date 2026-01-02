import { Icons } from "@/components/ui/Icons";
import { EmailActivityTimeline } from "./EmailActivityTimeline";

interface LeadActivityModalProps {
  campaignId: number;
  leadId: number;
  leadEmail?: string;
  onClose: () => void;
}

export function LeadActivityModal({ campaignId, leadId, leadEmail, onClose }: LeadActivityModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="card-enhanced"
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>Email Activity</h2>
            {leadEmail && (
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                {leadEmail}
              </p>
            )}
          </div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "8px", borderRadius: "8px", minWidth: "36px", height: "36px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <EmailActivityTimeline
            campaignId={campaignId}
            leadId={leadId}
            leadEmail={leadEmail}
          />
        </div>
      </div>
    </div>
  );
}

