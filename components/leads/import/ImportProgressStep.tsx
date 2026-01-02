"use client";
import { Icons } from "@/components/ui/Icons";

interface ImportProgressStepProps {
  progress: { current: number; total: number; isImporting: boolean };
  onCancel: () => void;
}

export function ImportProgressStep({ progress, onCancel }: ImportProgressStepProps) {
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <Icons.Loader
        size={48}
        className="animate-spin"
        style={{ marginBottom: "24px", color: "#4C67FF" }}
      />
      <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
        Importing Leads...
      </h3>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
        {progress.current} of {progress.total} leads imported
      </p>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "var(--elev-border)",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "linear-gradient(90deg, #4C67FF 0%, #A94CFF 100%)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
        {percentage}% complete
      </div>

      {progress.isImporting && (
        <button onClick={onCancel} className="btn-ghost" style={{ marginTop: "16px" }}>
          Cancel Import
        </button>
      )}
    </div>
  );
}

