const SNAPSHOT_KEY = "sparkai:active_base_snapshot";

export type ActiveBaseSnapshot = { id: number; name: string };

export const readActiveBaseSnapshot = (): ActiveBaseSnapshot | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    const id = Number(rec.id);
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!Number.isFinite(id) || id <= 0 || !name) return null;
    return { id, name };
  } catch {
    return null;
  }
};

export const writeActiveBaseSnapshot = (id: number, name: string): void => {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!Number.isFinite(id) || id <= 0 || !trimmed) return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ id, name: trimmed }));
  } catch {
    /* quota / private mode */
  }
};

export const clearActiveBaseSnapshot = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
};
