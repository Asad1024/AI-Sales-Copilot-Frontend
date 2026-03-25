/** System “Lead status” lives in `lead.custom_fields` under this key. */
export const LEAD_STATUS_STORAGE_KEY = "Lead status";

export const DEFAULT_LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New", color: "#64748b" },
  { value: "contacted", label: "Contacted", color: "#3b82f6" },
  { value: "qualified", label: "Qualified", color: "#8b5cf6" },
  { value: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { value: "won", label: "Won", color: "#22c55e" },
  { value: "lost", label: "Lost", color: "#ef4444" },
] as const;
