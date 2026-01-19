"use client";

import { useState, useEffect } from "react";
import { X, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Email Verification Banner
 * Shows a banner to unverified users prompting them to verify their email
 */
export function EmailVerificationBanner() {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset sent state after 5 seconds
  useEffect(() => {
    if (sent) {
      const timer = setTimeout(() => setSent(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [sent]);

  // Don't show if user is verified or banner is dismissed
  if (!user || user.email_verified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/verify-email/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send verification email");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send verification email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Email verification required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Please verify your email address to access all features. Check your inbox for the verification link.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {sent ? (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span>Email sent!</span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4" />
                {sending ? "Sending..." : "Resend email"}
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
