"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader";
import { apiRequest, getUser } from "@/lib/apiClient";
import { extractSpreadsheetIdFromUrl, validateGoogleSheetsVaultInput } from "@/lib/googleSheetsVault";
import { useBase } from "@/context/BaseContext";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Icons } from "@/components/ui/Icons";
import { CRMLogos } from "@/components/ui/CRMLogos";
import { GoogleSheetsBrandIcon, AirtableBrandIcon } from "@/app/leads/components/LeadSourceBrandIcons";
import {
  ConfigureModalShell,
  ConfigureLinkButton,
  ConnectFilledButton,
  IntegrationUniversalCard,
  RemoveIntegrationLink,
  VaultEncryptedNote,
} from "./integration-ui";

const cardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  padding: 20,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

/** Same channel colors as `app/campaigns/new/page.tsx` review / schedule rows. */
const WIZ_CHANNEL_LINKEDIN = "#0077B5";
const WIZ_CHANNEL_WHATSAPP = "#25D366";
const WIZ_CHANNEL_EMAIL = "#2563eb";

const integrationIconSlot: CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #EEECF8",
};

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        color: "#9CA3AF",
        textTransform: "uppercase",
        marginBottom: 12,
        marginTop: 0,
        paddingBottom: 8,
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      {children}
    </p>
  );
}

function UnipileSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(6px)",
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          borderRadius: 18,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.12)",
          padding: "28px 26px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 18px",
            borderRadius: 20,
            background: "linear-gradient(145deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 197, 94, 0.18) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icons.CheckCircle size={34} strokeWidth={1.5} style={{ color: "#16a34a" }} aria-hidden />
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text)" }}>
          You&apos;re connected
        </h3>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.55 }}>
          Unipile finished linking your account. Messaging integrations are refreshed below — use them in campaigns with this workspace selected.
        </p>
        <button type="button" className="btn-primary" onClick={onClose} style={{ width: "100%" }}>
          Continue
        </button>
      </div>
    </div>
  );
}

type VaultShape = {
  googleSheets?: { spreadsheetId?: string; sheetName?: string; apiKey?: string };
  hubspot?: { privateAppToken?: string };
};

type GoogleSheetsConfigureModalProps = {
  open: boolean;
  onClose: () => void;
  gsSpreadsheetId: string;
  setGsSpreadsheetId: (v: string) => void;
  gsSheetName: string;
  setGsSheetName: (v: string) => void;
  gsApiKey: string;
  setGsApiKey: (v: string) => void;
  vault: VaultShape;
  savingSheets: boolean;
  saveGoogleSheets: () => Promise<boolean>;
};

function GoogleSheetsConfigureModal({
  open,
  onClose,
  gsSpreadsheetId,
  setGsSpreadsheetId,
  gsSheetName,
  setGsSheetName,
  gsApiKey,
  setGsApiKey,
  vault,
  savingSheets,
  saveGoogleSheets,
}: GoogleSheetsConfigureModalProps) {
  const gsIcon = (
    <div style={{ width: 40, height: 40, borderRadius: 8, ...integrationIconSlot, border: "1px solid rgba(15, 157, 88, 0.22)" }}>
      <GoogleSheetsBrandIcon size={24} />
    </div>
  );

  return (
    <ConfigureModalShell
      open={open}
      onClose={onClose}
      icon={gsIcon}
      title="Google Sheets — Configure"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={savingSheets}
            onClick={async () => {
              const ok = await saveGoogleSheets();
              if (ok) onClose();
            }}
          >
            {savingSheets ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
        Spreadsheet ID or URL
      </label>
      <input
        className="input"
        placeholder="ID or paste full URL"
        value={gsSpreadsheetId}
        onChange={(e) => setGsSpreadsheetId(e.target.value)}
        onBlur={() => {
          const t = gsSpreadsheetId.trim();
          if (!t) return;
          const extracted = extractSpreadsheetIdFromUrl(t);
          if (extracted !== t) setGsSpreadsheetId(extracted);
        }}
        style={{ marginBottom: 8, width: "100%", boxSizing: "border-box" }}
      />
      <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>
        From the URL: <strong>…id between /d/ and /edit…</strong>
      </p>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
        Sheet (tab) name
      </label>
      <input
        className="input"
        placeholder='Exact tab label, e.g. "Leads"'
        value={gsSheetName}
        onChange={(e) => setGsSheetName(e.target.value)}
        style={{ marginBottom: 8, width: "100%", boxSizing: "border-box" }}
      />
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
        Google API key
      </label>
      <input
        className="input"
        type="password"
        autoComplete="off"
        placeholder={vault.googleSheets?.apiKey?.includes("***") ? "Key on file — enter new to replace" : "AIza… (Sheets API enabled)"}
        value={gsApiKey}
        onChange={(e) => setGsApiKey(e.target.value)}
        style={{ marginBottom: 0, width: "100%", boxSizing: "border-box" }}
      />
      <VaultEncryptedNote />
    </ConfigureModalShell>
  );
}

type AirtableConfigureModalProps = {
  open: boolean;
  onClose: () => void;
  airtablePat: string;
  setAirtablePat: (v: string) => void;
  saving: boolean;
  saveAirtable: () => Promise<boolean>;
};

function AirtableConfigureModal({ open, onClose, airtablePat, setAirtablePat, saving, saveAirtable }: AirtableConfigureModalProps) {
  const icon = (
    <div style={{ width: 40, height: 40, borderRadius: 8, ...integrationIconSlot }}>
      <AirtableBrandIcon size={24} />
    </div>
  );

  return (
    <ConfigureModalShell
      open={open}
      onClose={onClose}
      icon={icon}
      title="Airtable — Configure"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              const ok = await saveAirtable();
              if (ok) onClose();
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
        Personal access token
      </label>
      <input
        className="input"
        type="password"
        autoComplete="off"
        placeholder="pat…"
        value={airtablePat}
        onChange={(e) => setAirtablePat(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      <VaultEncryptedNote />
    </ConfigureModalShell>
  );
}

type HubspotConfigureModalProps = {
  open: boolean;
  onClose: () => void;
  hubspotToken: string;
  setHubspotToken: (v: string) => void;
  vault: VaultShape;
  saving: boolean;
  saveHubspot: () => Promise<boolean>;
};

function HubspotConfigureModal({ open, onClose, hubspotToken, setHubspotToken, vault, saving, saveHubspot }: HubspotConfigureModalProps) {
  const icon = (
    <div style={{ width: 40, height: 40, borderRadius: 8, ...integrationIconSlot }}>
      <CRMLogos.HubSpot size={24} />
    </div>
  );

  return (
    <ConfigureModalShell
      open={open}
      onClose={onClose}
      icon={icon}
      title="HubSpot — Configure"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              const ok = await saveHubspot();
              if (ok) onClose();
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
        Private app token
      </label>
      <input
        className="input"
        type="password"
        autoComplete="off"
        placeholder={vault.hubspot?.privateAppToken?.includes("***") ? "Token on file — enter new to replace" : "Private app token"}
        value={hubspotToken}
        onChange={(e) => setHubspotToken(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      <VaultEncryptedNote />
    </ConfigureModalShell>
  );
}

function WhatsAppConnectModal({ onClose, onContinue }: { onClose: () => void; onContinue: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-enhanced" style={{ ...cardStyle, maxWidth: 480, width: "100%" }} onMouseDown={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>Connect WhatsApp</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          You will be sent to Unipile&apos;s secure page to link your WhatsApp Business number. No API keys are entered here.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onContinue}>
            Continue to Unipile
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkedInTypeModal({
  onClose,
  onContinue,
}: {
  onClose: () => void;
  onContinue: (accountType: string) => void;
}) {
  const { showWarning } = useNotification();
  const [accountType, setAccountType] = useState("");
  const types = [
    { value: "free_basic", label: "Free / Basic" },
    { value: "premium", label: "Premium" },
    { value: "sales_navigator", label: "Sales Navigator" },
    { value: "recruiter", label: "Recruiter / Recruiter Lite" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-enhanced" style={{ ...cardStyle, maxWidth: 480, width: "100%" }} onMouseDown={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>LinkedIn account type</h3>
        <select className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)} style={{ width: "100%", marginBottom: 20 }}>
          <option value="">Select…</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!accountType) {
                showWarning("Required", "Pick your LinkedIn account type.");
                return;
              }
              onContinue(accountType);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsHub() {
  const { showError, showSuccess, showWarning } = useNotification();
  const confirm = useConfirm();
  const { activeBaseId } = useBase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const unipileReturnHandled = useRef(false);
  const [showUnipileSuccessModal, setShowUnipileSuccessModal] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [vault, setVault] = useState<VaultShape>({});
  const [loading, setLoading] = useState(true);
  const [savingSheets, setSavingSheets] = useState(false);
  const [savingHubspot, setSavingHubspot] = useState(false);
  const [airtablePat, setAirtablePat] = useState("");
  const [gsSpreadsheetId, setGsSpreadsheetId] = useState("");
  const [gsSheetName, setGsSheetName] = useState("");
  const [gsApiKey, setGsApiKey] = useState("");
  const [hubspotToken, setHubspotToken] = useState("");
  const [liModal, setLiModal] = useState(false);
  const [waModal, setWaModal] = useState(false);
  const [pendingLi, setPendingLi] = useState<"unipile_linkedin" | null>(null);
  const [unipileBusy, setUnipileBusy] = useState<"linkedin" | "whatsapp" | null>(null);
  const [gsConfigureOpen, setGsConfigureOpen] = useState(false);
  const [atConfigureOpen, setAtConfigureOpen] = useState(false);
  const [hsConfigureOpen, setHsConfigureOpen] = useState(false);
  const [savingAirtable, setSavingAirtable] = useState(false);
  const [usingWorkspaceOwnerCredentials, setUsingWorkspaceOwnerCredentials] = useState(false);
  const [teamMemberOnly, setTeamMemberOnly] = useState(false);

  useEffect(() => {
    const sync = () => setTeamMemberOnly(Boolean(getUser()?.team_member_only));
    sync();
    if (typeof window === "undefined") return;
    window.addEventListener("sparkai:user-changed", sync);
    return () => window.removeEventListener("sparkai:user-changed", sync);
  }, []);

  const integrationContextQs = useMemo(() => {
    const n = activeBaseId == null ? NaN : Number(activeBaseId);
    return Number.isFinite(n) && n > 0 ? `?base_id=${encodeURIComponent(String(n))}` : "";
  }, [activeBaseId]);

  const assertCanMutateWorkspaceIntegrations = useCallback((): boolean => {
    if (teamMemberOnly) {
      showWarning(
        "Workspace owner only",
        "Only your workspace owner can connect or change integrations.",
      );
      return false;
    }
    if (!usingWorkspaceOwnerCredentials) {
      return true;
    }
    showWarning(
      "Workspace owner only",
      "Only the workspace owner can connect, configure, or remove integrations for this workspace.",
    );
    return false;
  }, [teamMemberOnly, usingWorkspaceOwnerCredentials, showWarning]);

  const loadAll = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const qs = integrationContextQs;
      const [intRes, vaultRes] = await Promise.all([
        apiRequest(`/integrations${qs}`),
        apiRequest(`/me/connector-vault${qs}`),
      ]);
      setIntegrations(intRes?.integrations || []);
      setUsingWorkspaceOwnerCredentials(
        Boolean(intRes?.using_workspace_owner_credentials || vaultRes?.using_workspace_owner_credentials),
      );
      setVault(vaultRes?.vault || {});
      setAirtablePat("");
      const v = vaultRes?.vault || {};
      setGsSpreadsheetId(v.googleSheets?.spreadsheetId || "");
      setGsSheetName(v.googleSheets?.sheetName || "");
      setGsApiKey(v.googleSheets?.apiKey?.includes("***") ? "" : v.googleSheets?.apiKey || "");
      setHubspotToken(v.hubspot?.privateAppToken?.includes("***") ? "" : v.hubspot?.privateAppToken || "");
    } catch (e: any) {
      console.error(e);
      showError("Load failed", e?.message || "Could not load integrations.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showError, integrationContextQs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const c = searchParams?.get("connect");
    if (c === "airtable") {
      setAtConfigureOpen(true);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/settings?tab=integrations");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const ok = searchParams?.get("unipile_success");
    const err = searchParams?.get("unipile_error");
    if (!ok && !err) {
      unipileReturnHandled.current = false;
      return;
    }
    if (unipileReturnHandled.current) return;
    unipileReturnHandled.current = true;

    if (ok) {
      setShowUnipileSuccessModal(true);
      void loadAll({ silent: true });
    }
    if (err) {
      showError("Connection failed", "Unipile could not finish linking. Try again or pick another workspace.");
    }

    const p = new URLSearchParams(searchParams?.toString() || "");
    p.delete("unipile_success");
    p.delete("unipile_error");
    const qs = p.toString();
    router.replace(qs ? `/settings?${qs}` : "/settings");
  }, [searchParams, router, loadAll, showError]);

  const linkedin = integrations.find((i) => i.provider === "unipile_linkedin");
  const whatsapp = integrations.find((i) => i.provider === "unipile_whatsapp");
  const airtable = integrations.find((i) => i.provider === "airtable");
  const liUserConnected = Boolean(linkedin?.config?.account_id);
  const waUserConnected = Boolean(whatsapp?.config?.account_id);
  const atOk = Boolean(airtable?.config?.api_key);
  /** Badge is connected only when backend confirms masked key exactly and required fields exist. */
  const gsOk = Boolean(
    (vault.googleSheets?.spreadsheetId || "").trim() &&
      (vault.googleSheets?.sheetName || "").trim() &&
      (vault.googleSheets?.apiKey || "").trim() === "***configured***",
  );
  const hsOk = Boolean((vault.hubspot?.privateAppToken || "").includes("***"));

  const startUnipile = async (provider: "unipile_linkedin" | "unipile_whatsapp", linkedInAccountType?: string) => {
    if (!assertCanMutateWorkspaceIntegrations()) {
      return;
    }
    const baseIdNum = typeof activeBaseId === "number" ? activeBaseId : Number(activeBaseId);
    if (!activeBaseId || !Number.isFinite(baseIdNum) || baseIdNum < 1) {
      showWarning("Workspace", "Select a workspace first (top bar).");
      return;
    }
    setUnipileBusy(provider === "unipile_linkedin" ? "linkedin" : "whatsapp");
    try {
      const body: Record<string, unknown> = { base_id: baseIdNum, provider, type: "create" };
      if (provider === "unipile_linkedin" && linkedInAccountType) {
        body.linkedin_account_type = linkedInAccountType;
      }
      const res = await apiRequest("/integrations/unipile/auth-link", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const url = (res as { authUrl?: string }).authUrl;
      if (url) {
        window.location.href = url;
      } else {
        showError("Connect failed", "No auth URL returned.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unipile error";
      showError("Connect failed", msg);
    } finally {
      setUnipileBusy(null);
    }
  };

  const saveAirtable = async (): Promise<boolean> => {
    if (!assertCanMutateWorkspaceIntegrations()) {
      return false;
    }
    const pat = airtablePat.trim();
    if (!pat) {
      showWarning("Token required", "Paste your Airtable personal access token.");
      return false;
    }
    setSavingAirtable(true);
    try {
      await apiRequest("/integrations", {
        method: "POST",
        body: JSON.stringify({ provider: "airtable", config: { api_key: pat } }),
      });
      setAirtablePat("");
      showSuccess("Saved", "Airtable connected.");
      await loadAll({ silent: true });
      return true;
    } catch (e: any) {
      showError("Save failed", e?.message || "Airtable");
      return false;
    } finally {
      setSavingAirtable(false);
    }
  };

  const removeMessagingIntegration = async (integration: { id: number } | undefined, label: string) => {
    if (!integration?.id) return;
    if (!assertCanMutateWorkspaceIntegrations()) {
      return;
    }
    const ok = await confirm({
      title: `Remove ${label}?`,
      message: "This disconnects the integration for your account. You can add it again later.",
      confirmLabel: "Remove integration",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/integrations/${integration.id}`, { method: "DELETE" });
      showSuccess("Removed", `${label} disconnected.`);
      void loadAll({ silent: true });
    } catch (e: any) {
      showError("Failed", e?.message || "Could not remove integration.");
    }
  };

  const removeGoogleSheetsIntegration = async () => {
    if (!gsOk) return;
    if (!assertCanMutateWorkspaceIntegrations()) {
      return;
    }
    const ok = await confirm({
      title: "Remove Google Sheets?",
      message: "Clears spreadsheet, tab name, and API key from your encrypted vault.",
      confirmLabel: "Remove integration",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const response = await apiRequest(`/me/connector-vault${integrationContextQs}`, {
        method: "PUT",
        body: JSON.stringify({
          googleSheets: { spreadsheetId: "", sheetName: "", apiKey: "" },
        }),
      });
      setVault(response?.vault || {});
      setGsSpreadsheetId("");
      setGsSheetName("");
      setGsApiKey("");
      showSuccess("Removed", "Google Sheets disconnected.");
      void loadAll({ silent: true });
    } catch (e: any) {
      showError("Failed", e?.message || "Could not remove Google Sheets.");
    }
  };

  const removeHubspotIntegration = async () => {
    if (!hsOk) return;
    if (!assertCanMutateWorkspaceIntegrations()) {
      return;
    }
    const ok = await confirm({
      title: "Remove HubSpot?",
      message: "Clears your private app token from your encrypted vault.",
      confirmLabel: "Remove integration",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/me/connector-vault${integrationContextQs}`, {
        method: "PUT",
        body: JSON.stringify({ hubspot: { privateAppToken: "" } }),
      });
      setHubspotToken("");
      showSuccess("Removed", "HubSpot disconnected.");
      void loadAll({ silent: true });
    } catch (e: any) {
      showError("Failed", e?.message || "Could not remove HubSpot.");
    }
  };

  const disconnectAirtable = async () => {
    if (!airtable) return;
    if (!assertCanMutateWorkspaceIntegrations()) {
      return;
    }
    const ok = await confirm({
      title: "Remove Airtable?",
      message: "You can reconnect later with a new token.",
      confirmLabel: "Remove integration",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiRequest(`/integrations/${airtable.id}`, { method: "DELETE" });
      showSuccess("Disconnected", "Airtable removed.");
      void loadAll({ silent: true });
    } catch (e: any) {
      showError("Failed", e?.message);
    }
  };

  const saveGoogleSheets = async (): Promise<boolean> => {
    if (!assertCanMutateWorkspaceIntegrations()) {
      return false;
    }
    const apiKeyAlreadyStored = Boolean(vault.googleSheets?.apiKey?.includes("***"));
    const gsErr = validateGoogleSheetsVaultInput({
      spreadsheetId: gsSpreadsheetId,
      sheetName: gsSheetName,
      apiKey: gsApiKey,
      apiKeyAlreadyStored,
    });
    if (gsErr) {
      showWarning("Google Sheets", gsErr);
      return false;
    }
    const allGsEmpty = !gsSpreadsheetId.trim() && !gsSheetName.trim() && !gsApiKey.trim();
    const googleSheets: Record<string, string> = {
      spreadsheetId: gsSpreadsheetId.trim(),
      sheetName: gsSheetName.trim(),
    };
    if (gsApiKey.trim()) {
      googleSheets.apiKey = gsApiKey.trim();
    } else if (allGsEmpty) {
      googleSheets.apiKey = "";
    }
    setSavingSheets(true);
    try {
      const response = await apiRequest(`/me/connector-vault${integrationContextQs}`, {
        method: "PUT",
        body: JSON.stringify({ googleSheets }),
      });
      const nextVault = response?.vault || {};
      setVault(nextVault);
      setGsSpreadsheetId(nextVault.googleSheets?.spreadsheetId || "");
      setGsSheetName(nextVault.googleSheets?.sheetName || "");
      showSuccess("Saved", "Google Sheets settings stored securely.");
      void loadAll({ silent: true });
      return true;
    } catch (e: any) {
      showError("Save failed", e?.message || "Vault");
      return false;
    } finally {
      setSavingSheets(false);
    }
  };

  const saveHubspot = async (): Promise<boolean> => {
    if (!assertCanMutateWorkspaceIntegrations()) {
      return false;
    }
    const hasStored = Boolean(vault.hubspot?.privateAppToken?.includes("***"));
    const t = hubspotToken.trim();
    if (!t && !hasStored) {
      showWarning("Token required", "Paste your HubSpot private app token.");
      return false;
    }
    if (!t && hasStored) {
      showWarning("No changes", "Enter a new token to replace the one on file, or cancel.");
      return false;
    }
    setSavingHubspot(true);
    try {
      await apiRequest(`/me/connector-vault${integrationContextQs}`, {
        method: "PUT",
        body: JSON.stringify({ hubspot: { privateAppToken: t } }),
      });
      showSuccess("Saved", "HubSpot token stored securely.");
      setHubspotToken("");
      await loadAll({ silent: true });
      return true;
    } catch (e: any) {
      showError("Save failed", e?.message || "Vault");
      return false;
    } finally {
      setSavingHubspot(false);
    }
  };

  const ownerReadOnly = usingWorkspaceOwnerCredentials || teamMemberOnly;
  /** Shown in banner and disabled-control tooltips when viewer cannot edit integrations. */
  const integrationOwnerOnlyHint =
    "Only the workspace owner can connect or change integrations for this workspace.";

  if (loading) {
    return <GlobalPageLoader layout="embedded" minHeight={400} ariaLabel="Loading integrations" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {showUnipileSuccessModal ? <UnipileSuccessModal onClose={() => setShowUnipileSuccessModal(false)} /> : null}
      {liModal && (
        <LinkedInTypeModal
          onClose={() => {
            setLiModal(false);
            setPendingLi(null);
          }}
          onContinue={(t) => {
            setLiModal(false);
            if (pendingLi === "unipile_linkedin") void startUnipile("unipile_linkedin", t);
            setPendingLi(null);
          }}
        />
      )}
      {waModal && (
        <WhatsAppConnectModal
          onClose={() => setWaModal(false)}
          onContinue={() => {
            setWaModal(false);
            void startUnipile("unipile_whatsapp");
          }}
        />
      )}
      <GoogleSheetsConfigureModal
        open={gsConfigureOpen}
        onClose={() => setGsConfigureOpen(false)}
        gsSpreadsheetId={gsSpreadsheetId}
        setGsSpreadsheetId={setGsSpreadsheetId}
        gsSheetName={gsSheetName}
        setGsSheetName={setGsSheetName}
        gsApiKey={gsApiKey}
        setGsApiKey={setGsApiKey}
        vault={vault}
        savingSheets={savingSheets}
        saveGoogleSheets={saveGoogleSheets}
      />
      <AirtableConfigureModal
        open={atConfigureOpen}
        onClose={() => setAtConfigureOpen(false)}
        airtablePat={airtablePat}
        setAirtablePat={setAirtablePat}
        saving={savingAirtable}
        saveAirtable={saveAirtable}
      />
      <HubspotConfigureModal
        open={hsConfigureOpen}
        onClose={() => setHsConfigureOpen(false)}
        hubspotToken={hubspotToken}
        setHubspotToken={setHubspotToken}
        vault={vault}
        saving={savingHubspot}
        saveHubspot={saveHubspot}
      />

      <div style={{ marginBottom: 20, minWidth: 0 }}>
        <h2 className="m-0 text-lg font-medium tracking-tight text-gray-900">Integrations</h2>
        <p className="mt-1 text-[13px] text-gray-400">Connect messaging, outbound email, and CRM data sources for your workspace.</p>
        {ownerReadOnly ? (
          <p
            className="mt-3 mb-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-600"
            role="status"
          >
            {integrationOwnerOnlyHint}
          </p>
        ) : null}
      </div>

      {!activeBaseId ? (
        <div
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderColor: "rgba(234, 179, 8, 0.35)",
            background: "rgba(234, 179, 8, 0.06)",
          }}
        >
          <AlertCircle size={22} color="#ca8a04" />
          <span style={{ fontSize: 14 }}>Select a workspace to connect LinkedIn and WhatsApp via Unipile.</span>
        </div>
      ) : null}

      <div>
        <SectionHeader>Messaging (Unipile)</SectionHeader>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            alignItems: "start",
          }}
          className="integrations-messaging-grid"
        >
          <IntegrationUniversalCard
            icon={
              <div style={integrationIconSlot}>
                <Icons.Linkedin size={22} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_LINKEDIN }} aria-hidden />
              </div>
            }
            name="LinkedIn"
            subtitle={liUserConnected ? "Hosted messaging via Unipile" : "Secure hosted login"}
            status={liUserConnected ? "connected" : "not_connected"}
            actionRow={
              <>
                {!liUserConnected ? (
                  <ConnectFilledButton
                    disabled={unipileBusy === "linkedin" || ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => {
                      setPendingLi("unipile_linkedin");
                      setLiModal(true);
                    }}
                  >
                    {unipileBusy === "linkedin" ? "Opening…" : "Connect"}
                  </ConnectFilledButton>
                ) : (
                  <span aria-hidden className="inline-block min-w-0 shrink" />
                )}
                {liUserConnected ? (
                  <RemoveIntegrationLink
                    disabled={ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => void removeMessagingIntegration(linkedin, "LinkedIn")}
                  />
                ) : (
                  <span aria-hidden />
                )}
              </>
            }
          />
          <IntegrationUniversalCard
            icon={
              <div style={integrationIconSlot}>
                <Icons.WhatsApp size={22} style={{ color: WIZ_CHANNEL_WHATSAPP }} aria-hidden />
              </div>
            }
            name="WhatsApp"
            subtitle={waUserConnected ? "Hosted messaging via Unipile" : "Secure hosted login"}
            status={waUserConnected ? "connected" : "not_connected"}
            actionRow={
              <>
                {!waUserConnected ? (
                  <ConnectFilledButton
                    disabled={unipileBusy === "whatsapp" || ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => setWaModal(true)}
                  >
                    {unipileBusy === "whatsapp" ? "Opening…" : "Connect"}
                  </ConnectFilledButton>
                ) : (
                  <span aria-hidden className="inline-block min-w-0 shrink" />
                )}
                {waUserConnected ? (
                  <RemoveIntegrationLink
                    disabled={ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => void removeMessagingIntegration(whatsapp, "WhatsApp")}
                  />
                ) : (
                  <span aria-hidden />
                )}
              </>
            }
          />
        </div>
      </div>

      <div>
        <SectionHeader>Email</SectionHeader>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
            alignItems: "start",
          }}
          className="integrations-email-grid"
        >
          <IntegrationUniversalCard
            icon={
              <div style={integrationIconSlot}>
                <Icons.Mail size={22} strokeWidth={1.75} style={{ color: WIZ_CHANNEL_EMAIL }} aria-hidden />
              </div>
            }
            name="SendGrid"
            subtitle="API-based transactional email"
            status="coming_soon"
            comingSoon
          />
        </div>
      </div>

      <div>
        <SectionHeader>CRM &amp; data</SectionHeader>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, alignItems: "start" }}
          className="integrations-crm-grid"
        >
          <IntegrationUniversalCard
            icon={
              <div style={{ ...integrationIconSlot, border: "1px solid rgba(15, 157, 88, 0.22)" }}>
                <GoogleSheetsBrandIcon size={24} />
              </div>
            }
            name="Google Sheets"
            subtitle={gsOk ? "Spreadsheet and tab in vault" : "Spreadsheet ID, tab, and API key"}
            status={gsOk ? "connected" : "not_connected"}
            actionRow={
              <>
                <ConfigureLinkButton
                  onClick={() => setGsConfigureOpen(true)}
                  disabled={ownerReadOnly}
                  title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                />
                {gsOk ? (
                  <RemoveIntegrationLink
                    disabled={ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => void removeGoogleSheetsIntegration()}
                  />
                ) : (
                  <span aria-hidden />
                )}
              </>
            }
          />
          <IntegrationUniversalCard
            icon={
              <div style={integrationIconSlot}>
                <AirtableBrandIcon size={24} />
              </div>
            }
            name="Airtable"
            subtitle={atOk ? "Personal access token on file" : "Paste a PAT in Configure"}
            status={atOk ? "connected" : "not_connected"}
            actionRow={
              <>
                <ConfigureLinkButton
                  onClick={() => setAtConfigureOpen(true)}
                  disabled={ownerReadOnly}
                  title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                />
                {atOk ? (
                  <RemoveIntegrationLink
                    disabled={ownerReadOnly}
                    title={ownerReadOnly ? integrationOwnerOnlyHint : undefined}
                    onClick={() => void disconnectAirtable()}
                  />
                ) : (
                  <span aria-hidden />
                )}
              </>
            }
          />
          <IntegrationUniversalCard
            icon={
              <div style={integrationIconSlot}>
                <CRMLogos.HubSpot size={24} />
              </div>
            }
            name="HubSpot"
            subtitle="Coming soon"
            status="coming_soon"
            comingSoon
          />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 720px) {
  .integrations-messaging-grid { grid-template-columns: 1fr !important; }
  .integrations-email-grid { grid-template-columns: 1fr !important; }
  .integrations-crm-grid { grid-template-columns: 1fr !important; }
}
`,
        }}
      />
    </div>
  );
}
