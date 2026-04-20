"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest, getUser, setUser } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import { Icons } from "@/components/ui/Icons";
import { ChangePasswordModal } from "./ChangePasswordModal";

const fieldShellClass =
  "w-full box-border rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-[3px] focus:ring-[rgba(var(--color-primary-rgb), 0.2)]";

const onboardingTimezones = [
  "UTC",
  "US/Eastern",
  "US/Pacific",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
];

export function ProfileSettingsPanel() {
  const { showSuccess, showError } = useNotification();
  const confirm = useConfirm();
  const user = getUser();
  const [name, setName] = useState(user?.name || "");
  const [company, setCompany] = useState(user?.company || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [saving, setSaving] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = { name, company, timezone };

      const res = await apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res?.user) {
        setUser(res.user);
      }
      showSuccess("Profile updated", "Your profile was saved.");
      window.location.reload();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update profile";
      console.error("Failed to update profile:", error);
      showError("Update failed", msg);
    } finally {
      setSaving(false);
    }
  }, [name, company, timezone, showSuccess, showError]);

  useEffect(() => {
    const onGlobalSave = () => {
      void handleSave();
    };
    window.addEventListener("app:settings-save", onGlobalSave as EventListener);
    return () => window.removeEventListener("app:settings-save", onGlobalSave as EventListener);
  }, [handleSave]);

  const displayName = user?.name?.trim() || "Your account";

  const handleRequestAccountClosure = async () => {
    const ok = await confirm({
      title: "Delete account?",
      message: (
        <span>
          You cannot delete your account directly here. This will send a closure request to administrators, and they will remove or deactivate your account.
        </span>
      ),
      confirmLabel: "Send request",
      variant: "danger",
    });
    if (!ok) return;
    setClosureSubmitting(true);
    try {
      const data = (await apiRequest("/auth/account/deletion-request", { method: "POST" })) as {
        message?: string;
      };
      showSuccess("Request sent to admins", data?.message || "Your account closure request was sent successfully. An administrator will review it soon.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not send request.";
      showError("Request failed", msg);
    } finally {
      setClosureSubmitting(false);
    }
  };

  return (
    <div className="max-w-[720px]">
      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <AdminUserAvatar avatarUrl={user?.avatar_url} name={user?.name} email={user?.email} size={48} />
          <div className="min-w-0">
            <div className="text-lg font-medium leading-tight text-[var(--color-text)]">{displayName}</div>
            {user?.email ? (
              <div className="mt-0.5 break-all text-[13px] text-[var(--color-text-muted)]">{user.email}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="btn-dashboard-outline"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="my-5 h-px w-full bg-[var(--color-border)]" role="separator" aria-hidden />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-muted)]" htmlFor="profile-full-name">
              Full name
            </label>
            <input
              id="profile-full-name"
              className={fieldShellClass}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-muted)]" htmlFor="profile-company">
              Company
            </label>
            <input
              id="profile-company"
              className={fieldShellClass}
              placeholder="Company or team"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-muted)]" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            className={`${fieldShellClass} cursor-not-allowed bg-[#e5e7eb] text-[#6b7280] border-[#d1d5db] opacity-100`}
            value={user?.email || ""}
            disabled
            readOnly
            aria-readonly="true"
            title="Email cannot be changed here"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-muted)]" htmlFor="profile-timezone">
            Time zone
          </label>
          <select
            id="profile-timezone"
            className={fieldShellClass}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {onboardingTimezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

      </div>

      <div className="my-5 h-px w-full bg-[var(--color-border)]" role="separator" aria-hidden />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <div className="mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Security</h3>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">Use a strong password and rotate it regularly.</p>
        </div>
        <button
          type="button"
          onClick={() => setPasswordModalOpen(true)}
          className="btn-dashboard-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-primary-rgb), 0.2)] focus-visible:ring-offset-0"
          style={{ paddingLeft: 20, paddingRight: 20 }}
        >
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:block" aria-hidden>
            <Icons.Lock size={16} strokeWidth={1.75} />
          </span>
          Change password
        </button>
      </div>

      <div className="my-5 h-px w-full bg-[var(--color-border)]" role="separator" aria-hidden />

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[var(--color-text)]">Delete Account</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              You cannot delete your own account here. Request closure to alert administrators; only they can remove or deactivate accounts.
            </p>
          </div>
          <button
            type="button"
            disabled={closureSubmitting}
            onClick={() => void handleRequestAccountClosure()}
            className="btn-dashboard-outline inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: "#ef4444",
              color: "#dc2626",
              background: "#fff5f5",
            }}
          >
            <Icons.Trash size={15} strokeWidth={2} />
            {closureSubmitting ? "Sending…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
