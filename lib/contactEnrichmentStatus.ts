const hasMeaningfulTimestamp = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

/**
 * FullEnrich async contact flow persists either:
 * - `enrichment.fullenrich_data.enriched_at` (main FullEnrich webhook), or
 * - `enrichment.fullenrich_contacts_data.enriched_at` (contacts-only reverse-email webhook).
 * Webhooks may also set `enrichment_completed_at` / `enrichment_status` when no scalar fields changed.
 * UI loaders must treat any of these as “done”.
 */
export const leadHasAsyncContactEnrichResult = (enrichment: unknown): boolean => {
  if (enrichment == null) return false;
  let e: Record<string, unknown>;
  if (typeof enrichment === "string") {
    try {
      e = JSON.parse(enrichment) as Record<string, unknown>;
    } catch {
      return false;
    }
  } else if (typeof enrichment === "object") {
    e = enrichment as Record<string, unknown>;
  } else {
    return false;
  }
  const fd = e.fullenrich_data as { enriched_at?: unknown } | undefined;
  const fc = e.fullenrich_contacts_data as { enriched_at?: unknown } | undefined;
  if (hasMeaningfulTimestamp(fd?.enriched_at) || hasMeaningfulTimestamp(fc?.enriched_at)) {
    return true;
  }
  if (hasMeaningfulTimestamp(e.enrichment_completed_at)) {
    return true;
  }
  if (e.enrichment_status === "completed" && (e.fullenrich_enrichment_id != null || fd != null || fc != null)) {
    return true;
  }
  return false;
};
