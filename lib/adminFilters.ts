/** Case-insensitive substring match across joined fields (admin list filtering). */
export function adminMatchesSearch(query: string, parts: Array<string | number | undefined | null>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = parts
    .filter((p) => p !== undefined && p !== null && `${p}`.length > 0)
    .map((p) => `${p}`)
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}
