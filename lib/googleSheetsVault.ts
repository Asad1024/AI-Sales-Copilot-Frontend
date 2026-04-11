/** Keep in sync with AiSalesCopilot-Backend/src/utils/googleSheetsVaultValidators.ts */

export const GOOGLE_SHEETS_SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9_-]{20,128}$/;
export const GOOGLE_CLOUD_API_KEY_REGEX = /^AIza[0-9A-Za-z_-]{32,191}$/;

export function extractSpreadsheetIdFromUrl(input: string): string {
  const t = input.trim();
  const m = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : t;
}

export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateSpreadsheetId(raw: string): FieldResult<string> {
  const id = extractSpreadsheetIdFromUrl(raw);
  if (!id) {
    return { ok: false, message: "Spreadsheet ID is required (copy from the URL between /d/ and /edit)." };
  }
  if (!GOOGLE_SHEETS_SPREADSHEET_ID_REGEX.test(id)) {
    return {
      ok: false,
      message:
        "Spreadsheet ID should be 20–128 characters: letters, numbers, hyphen, or underscore only. Paste the full spreadsheet URL if unsure.",
    };
  }
  return { ok: true, value: id };
}

export function validateGoogleSheetsApiKey(raw: string): FieldResult<string> {
  const key = raw.trim();
  if (!key) {
    return { ok: false, message: "API key is required when Google Sheets is configured." };
  }
  if (!GOOGLE_CLOUD_API_KEY_REGEX.test(key)) {
    return {
      ok: false,
      message:
        "API key should start with AIza followed by letters, numbers, hyphen, or underscore (typical Google Cloud API key format).",
    };
  }
  return { ok: true, value: key };
}

export function validateSheetTabName(raw: string): FieldResult<string> {
  const name = raw.trim();
  if (!name) {
    return { ok: false, message: "Sheet (tab) name is required when Google Sheets is configured." };
  }
  if (name.length > 100) {
    return { ok: false, message: "Sheet name must be at most 100 characters." };
  }
  if (/[\u0000-\u001f\\/:?*[\]]/.test(name)) {
    return {
      ok: false,
      message: "Sheet name cannot contain \\ / : ? * [ ] or line breaks (use the exact tab name at the bottom of the spreadsheet).",
    };
  }
  return { ok: true, value: name };
}

/** Returns first error message, or null if GS block is empty or all valid. */
export function validateGoogleSheetsVaultInput(input: {
  spreadsheetId: string;
  sheetName: string;
  apiKey: string;
  apiKeyAlreadyStored: boolean;
}): string | null {
  const sid = input.spreadsheetId.trim();
  const sn = input.sheetName.trim();
  const ak = input.apiKey.trim();
  const any = Boolean(sid || sn || ak);
  if (!any) return null;
  const idRes = validateSpreadsheetId(sid);
  if (!idRes.ok) return idRes.message;
  const nameRes = validateSheetTabName(sn);
  if (!nameRes.ok) return nameRes.message;
  if (!ak && !input.apiKeyAlreadyStored) {
    const kRes = validateGoogleSheetsApiKey(ak);
    return kRes.ok ? null : kRes.message;
  }
  if (ak) {
    const kRes = validateGoogleSheetsApiKey(ak);
    if (!kRes.ok) return kRes.message;
  }
  return null;
}
