/**
 * Email normalization and validation utilities
 */

export interface EmailInfo {
  normalized: string;
  isValid: boolean;
  isMasked: boolean;
  source?: 'apollo' | 'anymail_finder' | 'unknown';
  status?: 'found_valid' | 'found_unknown' | 'not_found' | 'failed';
}

/**
 * Check if email is masked/placeholder
 */
export function isMaskedEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const maskedPatterns = [
    'email_not_unlocked@domain.com',
    'email_not_available',
    'no_email',
    'placeholder@',
    'example.com'
  ];
  return maskedPatterns.some(pattern => email.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email information with normalization and source
 */
export function getEmailInfo(
  email: string | null | undefined,
  enrichment?: any
): EmailInfo {
  if (!email) {
    return {
      normalized: '',
      isValid: false,
      isMasked: true,
      source: 'unknown'
    };
  }

  const normalized = normalizeEmail(email);
  const masked = isMaskedEmail(normalized);
  const validFormat = isValidEmailFormat(normalized);

  // Determine source from enrichment data
  let source: 'apollo' | 'anymail_finder' | 'unknown' = 'unknown';
  let status: 'found_valid' | 'found_unknown' | 'not_found' | 'failed' | undefined;

  if (enrichment) {
    // Check for Anymail Finder data
    if (enrichment.anymail_finder_data) {
      source = 'anymail_finder';
      status = enrichment.anymail_finder_data.status;
    } else if (enrichment.apollo_data || enrichment.source?.includes('apollo')) {
      source = 'apollo';
    }
  }

  return {
    normalized: masked ? email : normalized, // Keep original if masked for display
    isValid: validFormat && !masked,
    isMasked: masked,
    source,
    status
  };
}

/**
 * Get email display text with visual indicators
 */
export function getEmailDisplayText(emailInfo: EmailInfo): string {
  if (!emailInfo.normalized) {
    return 'Email not available';
  }

  if (emailInfo.isMasked) {
    return 'Email not available';
  }

  return emailInfo.normalized;
}

/**
 * Get email source badge text - shows "verified" for any valid email found
 */
export function getEmailSourceBadge(emailInfo: EmailInfo): string | null {
  if (emailInfo.isMasked || !emailInfo.isValid) {
    return null;
  }

  // Show "verified" for any valid email from enrichment
  if (emailInfo.source === 'apollo' || emailInfo.source === 'anymail_finder') {
    return 'verified';
  }

  return null;
}

/**
 * Get email status badge text
 */
export function getEmailStatusBadge(emailInfo: EmailInfo): string | null {
  if (emailInfo.isMasked || !emailInfo.isValid) {
    return emailInfo.isMasked ? '🔒 Locked' : '⚠️ Invalid';
  }

  // Don't show "✓ Valid" badge - verified badge is enough
  if (emailInfo.status === 'found_unknown') {
    return '? Unknown';
  }

  return null;
}

