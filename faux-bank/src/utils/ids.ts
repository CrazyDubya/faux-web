/**
 * ID Generation Utilities for FauxBank
 *
 * Various ID formats used throughout the system.
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * SECURITY: Generate cryptographically secure random bytes
 */
function secureRandomInt(max: number): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

/**
 * Generate an alpha-only ID with a prefix
 * Format: PREFIX-XXXX-XXXX-XXXX (where X is A-Z)
 * SECURITY FIX: Uses crypto.getRandomValues instead of Math.random
 */
export function generateAlphaId(prefix: string): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = prefix + '-';

  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-';
    }
    result += letters[secureRandomInt(26)];
  }

  return result;
}

/**
 * Generate a session ID
 * Format: SES-XXXX-XXXX-XXXX
 */
export function generateSessionId(): string {
  return generateAlphaId('SES');
}

/**
 * Generate a customer ID
 * Format: CUST-XXXX-XXXX-XXXX
 */
export function generateCustomerId(): string {
  return generateAlphaId('CUST');
}

/**
 * Generate a dispute ID
 * Format: DSP-XXXX-XXXX-XXXX
 */
export function generateDisputeId(): string {
  return generateAlphaId('DSP');
}

/**
 * Generate a KYC verification ID
 * Format: KYC-XXXX-XXXX-XXXX
 */
export function generateKycId(): string {
  return generateAlphaId('KYC');
}

/**
 * Generate an authorization ID
 * Format: AUTH-XXXX-XXXX-XXXX
 */
export function generateAuthorizationId(): string {
  return generateAlphaId('AUTH');
}

/**
 * Generate a wire transfer ID
 * Format: WIRE-XXXX-XXXX-XXXX
 */
export function generateWireId(): string {
  return generateAlphaId('WIRE');
}

/**
 * Generate a chargeback ID
 * Format: CHB-XXXX-XXXX-XXXX
 */
export function generateChargebackId(): string {
  return generateAlphaId('CHB');
}

/**
 * Generate an audit log ID
 * Format: LOG-XXXX-XXXX-XXXX
 */
export function generateLogId(): string {
  return generateAlphaId('LOG');
}

/**
 * Generate a failure injection ID
 * Format: FAIL-XXXX-XXXX-XXXX
 */
export function generateFailureId(): string {
  return generateAlphaId('FAIL');
}

/**
 * Generate an agent token
 * Returns a secure random token for API authentication
 */
export function generateAgentToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SECURITY: Fixed salt for token hashing (in production, use per-token salt stored with hash)
 * This provides baseline rainbow table protection
 */
const TOKEN_SALT = 'FauxBank-v1-TokenSalt-2024';

/**
 * Generate a random salt for token hashing
 */
export function generateTokenSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash an agent token for storage
 * SECURITY FIX: Uses salted hash to prevent rainbow table attacks
 * Format: salt$hash (salt is 32 hex chars, hash is 64 hex chars)
 */
export async function hashToken(token: string, salt?: string): Promise<string> {
  const actualSalt = salt || TOKEN_SALT;
  const encoder = new TextEncoder();
  // Combine salt + token for hashing
  const data = encoder.encode(actualSalt + token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // If using random salt, include it in output
  if (salt) {
    return `${salt}$${hash}`;
  }
  return hash;
}

/**
 * Verify a token against a stored hash
 * Supports both legacy (unsalted) and new (salted) format
 */
export async function verifyToken(token: string, storedHash: string): Promise<boolean> {
  if (storedHash.includes('$')) {
    // New format: salt$hash
    const [salt, _] = storedHash.split('$');
    const computed = await hashToken(token, salt);
    return computed === storedHash;
  } else {
    // Legacy format: just hash (with fixed salt)
    const computed = await hashToken(token);
    return computed === storedHash;
  }
}

/**
 * Generate a card token (for simulated cards)
 * Format: CARD-XXXX-XXXX-XXXX-XXXX
 * SECURITY FIX: Uses crypto.getRandomValues instead of Math.random
 */
export function generateCardToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CARD-';

  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-';
    }
    result += chars[secureRandomInt(chars.length)];
  }

  return result;
}
