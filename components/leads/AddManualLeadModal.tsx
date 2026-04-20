"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";
import { importModalOverlayStyle } from "@/components/leads/ImportModalChrome";

type AddManualLeadModalProps = {
  open: boolean;
  onClose: () => void;
  baseId: number;
  onCreated: (lead: unknown) => void;
};

type ManualLeadForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  company: string;
  role: string;
  region: string;
  industry: string;
};

const INITIAL_FORM: ManualLeadForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  company: "",
  role: "",
  region: "",
  industry: "",
};

function hasMeaningfulInput(form: ManualLeadForm): boolean {
  return Object.values(form).some((value) => value.trim().length > 0);
}

function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidLinkedInUrl(linkedinUrl: string): boolean {
  const value = linkedinUrl.trim();
  if (!value) return true;
  return /linkedin\.com\/in\//i.test(value);
}

export function AddManualLeadModal({ open, onClose, baseId, onCreated }: AddManualLeadModalProps) {
  const { showError, showSuccess } = useNotification();
  const [form, setForm] = useState<ManualLeadForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(INITIAL_FORM);
    setSaving(false);
  }, [open]);

  const canSave = useMemo(() => {
    if (saving) return false;
    if (!hasMeaningfulInput(form)) return false;
    return isValidEmail(form.email) && isValidLinkedInUrl(form.linkedin_url);
  }, [form, saving]);

  if (!open) return null;

  const setField = (key: keyof ManualLeadForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!hasMeaningfulInput(form)) {
      showError("Lead details required", "Enter at least one field before saving.");
      return;
    }
    if (!isValidEmail(form.email)) {
      showError("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (!isValidLinkedInUrl(form.linkedin_url)) {
      showError("Invalid LinkedIn URL", "Please use a full LinkedIn profile URL (linkedin.com/in/...).");
      return;
    }

    const normalized = Object.fromEntries(
      Object.entries(form)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v.length > 0),
    );
    const { linkedin_url, ...rest } = normalized as Record<string, string>;
    const payload: Record<string, unknown> = { ...rest };
    if (linkedin_url) {
      payload.enrichment = {
        source: "manual",
        linkedin_url,
      };
    }

    setSaving(true);
    try {
      const response = await api.createLead(baseId, payload);
      const createdLead = (response as { lead?: unknown })?.lead ?? response;
      showSuccess("Lead added", "Manual lead was added to this workspace.");
      onCreated(createdLead);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create lead.";
      showError("Add failed", message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid var(--elev-border, var(--color-border))",
    background: "var(--elev-bg, var(--color-surface-secondary))",
    color: "var(--color-text)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={importModalOverlayStyle} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-manual-lead-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          maxHeight: "min(90vh, 700px)",
          background: "var(--color-surface)",
          borderRadius: 16,
          border: "1px solid var(--elev-border, var(--color-border))",
          boxShadow: "var(--elev-shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--elev-border, var(--color-border))",
          }}
        >
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(var(--color-primary-rgb), 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icons.UserPlus size={22} strokeWidth={1.7} style={{ color: "var(--color-primary)" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="add-manual-lead-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                Add lead manually
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Type lead details and save instantly to this workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--elev-border, var(--color-border))",
              background: "var(--color-surface-secondary)",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: saving ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            <Icons.X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: "16px 22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              placeholder="First name"
              autoFocus
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              placeholder="Last name"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="Email"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Phone"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setField("linkedin_url", e.target.value)}
              placeholder="LinkedIn URL (https://www.linkedin.com/in/username)"
              disabled={saving}
              style={{ ...fieldStyle, gridColumn: "1 / -1" }}
            />
            <input
              type="text"
              value={form.company}
              onChange={(e) => setField("company", e.target.value)}
              placeholder="Company"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="text"
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
              placeholder="Role"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="text"
              value={form.region}
              onChange={(e) => setField("region", e.target.value)}
              placeholder="Region"
              disabled={saving}
              style={fieldStyle}
            />
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
              placeholder="Industry"
              disabled={saving}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>
            At least one field is required. Email and LinkedIn URL are optional, but must be valid if provided.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={saving}
              style={{ padding: "10px 18px", borderRadius: 10, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void submit()}
              disabled={!canSave}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              {saving ? (
                <>
                  <Icons.Loader size={16} className="animate-spin" strokeWidth={2} />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.Plus size={16} strokeWidth={1.8} />
                  Add lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
