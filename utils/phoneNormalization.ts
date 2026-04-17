/**
 * Phone number normalization and validation utilities
 */

export interface PhoneInfo {
  normalized: string;
  isValid: boolean;
  source?: 'apollo' | 'fullenrich' | 'unknown';
}

/**
 * Normalize phone number format
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate phone format (basic validation)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // Basic validation: at least 10 digits (with optional country code)
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Get phone information with normalization and source
 */
export function getPhoneInfo(
  phone: string | null | undefined,
  enrichment?: any
): PhoneInfo {
  if (!phone) {
    return {
      normalized: '',
      isValid: false,
      source: 'unknown'
    };
  }

  const normalized = normalizePhone(phone);
  const valid = isValidPhone(normalized);

  // Determine source from enrichment data
  let source: 'apollo' | 'fullenrich' | 'unknown' = 'unknown';

  if (enrichment) {
    // Check for FullEnrich data
    if (enrichment.fullenrich_data) {
      source = 'fullenrich';
    } else if (enrichment.apollo_data || enrichment.source?.includes('apollo')) {
      source = 'apollo';
    }
  }

  return {
    normalized: normalized || phone, // Keep original if normalization fails
    isValid: valid,
    source
  };
}

/**
 * Get phone source badge text - shows "verified" for phone from enrichment providers
 */
export function getPhoneSourceBadge(phoneInfo: PhoneInfo): string | null {
  if (!phoneInfo.isValid) {
    return null;
  }

  // Show "verified" for phone from trusted enrichment sources
  if (phoneInfo.source === 'fullenrich' || phoneInfo.source === 'apollo') {
    return 'verified';
  }

  return null;
}
