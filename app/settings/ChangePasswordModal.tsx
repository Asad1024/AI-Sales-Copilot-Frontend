"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { Icons } from "@/components/ui/Icons";

type Props = { open: boolean; onClose: () => void };

export function ChangePasswordModal({ open, onClose }: Props) {
  const { showSuccess, showError } = useNotification();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      showError("Validation", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Validation", "New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      showSuccess("Password updated", "Use your new password the next time you sign in.");
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not change password.";
      showError("Change password failed", msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && !loading && handleClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="card-enhanced"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: "0 24px 48px var(--color-shadow)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div>
            <h2 id="change-password-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
              Change password
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
              For accounts that sign in with email and password. Google-only accounts can use “Forgot password” on the login page to set one.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
            style={{ padding: 8, borderRadius: 10, flexShrink: 0 }}
          >
            <Icons.X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="text-hint" style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Current password
            </label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
            />
          </div>
          <div>
            <label className="text-hint" style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              New password
            </label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
            />
          </div>
          <div>
            <label className="text-hint" style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Confirm new password
            </label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button type="button" className="btn-ghost" onClick={handleClose} disabled={loading} style={{ padding: "10px 16px", borderRadius: 10 }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSubmit()}
            disabled={loading || !currentPassword.trim() || !newPassword.trim()}
            style={{ padding: "10px 18px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {loading ? (
              <>
                <Icons.Loader size={16} style={{ opacity: 0.85 }} aria-hidden />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
