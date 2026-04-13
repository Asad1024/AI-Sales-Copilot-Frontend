"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, LogOut } from "lucide-react";
import { apiRequest, getUser, clearAuth, setUser } from "@/lib/apiClient";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import { Icons } from "@/components/ui/Icons";
import { ChangePasswordModal } from "./ChangePasswordModal";

const fieldShellClass =
  "w-full box-border rounded-lg border border-[#E5E3F0] bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-shadow focus:border-[var(--color-primary)] focus:ring-[3px] focus:ring-[rgba(124, 58, 237,0.15)]";

const closureNotes = [
  "Platform administrators are notified in-app when you submit a request.",
  "Only an admin can remove or deactivate your account (Admin → Users).",
  "You can keep using the app until an administrator completes the change.",
];

export function ProfileSettingsPanel() {
  const { showSuccess, showError } = useNotification();
  const confirm = useConfirm();
  const user = getUser();
  const [name, setName] = useState(user?.name || "");
  const [company, setCompany] = useState(user?.company || "");
  const initialDobSnapshot = (user?.dob && String(user.dob).slice(0, 10)) || "";
  const initialDobRef = useRef(initialDobSnapshot);
  const [dob, setDob] = useState(initialDobSnapshot);
  const [saving, setSaving] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body: { name: string; company: string; dob?: string | null } = { name, company };
      const trimmed = dob.trim();
      if (trimmed) {
        body.dob = trimmed;
      } else if (initialDobRef.current.trim()) {
        body.dob = null;
      }

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
  }, [name, company, dob, showSuccess, showError]);

  useEffect(() => {
    const onGlobalSave = () => {
      void handleSave();
    };
    window.addEventListener("app:settings-save", onGlobalSave as EventListener);
    return () => window.removeEventListener("app:settings-save", onGlobalSave as EventListener);
  }, [handleSave]);

  const displayName = user?.name?.trim() || "Your account";
  const isAdmin = user?.role === "admin";

  const handleRequestAccountClosure = async () => {
    const ok = await confirm({
      title: "Request account closure?",
      message: (
        <span>
          This sends a notification to platform administrators. They will remove or deactivate your account when they process the request — you cannot delete the account yourself.
        </span>
      ),
      confirmLabel: "Notify administrators",
      variant: "danger",
    });
    if (!ok) return;
    setClosureSubmitting(true);
    try {
      const data = (await apiRequest("/auth/account/deletion-request", { method: "POST" })) as {
        message?: string;
      };
      showSuccess("Request sent", data?.message || "Administrators have been notified.");
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
            <div className="text-lg font-medium leading-tight text-gray-900">{displayName}</div>
            {user?.email ? (
              <div className="mt-0.5 break-all text-[13px] text-gray-400">{user.email}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            clearAuth();
            window.location.href = "/auth/login";
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-[22px] border-0 bg-rose-500 px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_4px_14px_-4px_rgba(225,29,72,0.45)] outline-none transition-all duration-200 ease-out hover:-translate-y-px hover:bg-rose-600 hover:shadow-[0_6px_18px_-4px_rgba(225,29,72,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/90 focus-visible:ring-offset-0 active:translate-y-0 active:shadow-[0_2px_10px_-4px_rgba(225,29,72,0.4)]"
        >
          <LogOut className="h-[17px] w-[17px] shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
          Log out
        </button>
      </div>

      <div className="my-5 h-px w-full bg-[#F3F4F6]" role="separator" aria-hidden />

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-500" htmlFor="profile-full-name">
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
          <label className="mb-1.5 block text-[13px] font-medium text-gray-500" htmlFor="profile-company">
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

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-500" htmlFor="profile-dob">
            Date of birth <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="profile-dob"
            type="date"
            className={fieldShellClass}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="my-5 h-px w-full bg-[#F3F4F6]" role="separator" aria-hidden />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setPasswordModalOpen(true)}
          className="btn-dashboard-outline rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(124,58,237,0.45)] focus-visible:ring-offset-0"
          style={{ paddingLeft: 20, paddingRight: 20 }}
        >
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:block" aria-hidden>
            <Icons.Lock size={16} strokeWidth={1.75} />
          </span>
          Change password
        </button>
      </div>

      <div className="my-5 h-px w-full bg-[#F3F4F6]" role="separator" aria-hidden />

      <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 px-4 py-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          Account closure
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
          You cannot delete your own account here. Request closure to alert administrators; only they can remove or deactivate accounts.
        </p>
        <ul className="mt-3 list-none space-y-2 p-0">
          {closureNotes.map((text) => (
            <li key={text} className="flex gap-2 text-[12px] leading-snug text-gray-500">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <p className="mt-3 text-[12px] text-gray-500">
            As an admin, you can manage users in{" "}
            <Link href="/admin/users" className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline">
              Admin → Users
            </Link>
            .
          </p>
        ) : null}
        <button
          type="button"
          disabled={closureSubmitting}
          onClick={() => void handleRequestAccountClosure()}
          className="mt-4 rounded-[10px] border border-rose-300 bg-white px-[18px] py-2.5 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {closureSubmitting ? "Sending…" : "Request account closure"}
        </button>
      </div>
    </div>
  );
}
