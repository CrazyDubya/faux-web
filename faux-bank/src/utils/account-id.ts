import { AccountTypeCode, SegmentCode, AccountIdPattern } from '../types';

/**
 * FauxBank Account ID Utilities
 *
 * Account ID Format: [TYPE]-[SEGMENT]-[UNIQUE]-[CHECK]
 * - TYPE: 2 letters (account type code)
 * - SEGMENT: 4 letters (market segment)
 * - UNIQUE: 8 letters (unique identifier)
 * - CHECK: 2 letters (checksum)
 *
 * All characters are uppercase A-Z only.
 */

// Valid account type to segment mappings
const VALID_SEGMENTS: Record<AccountTypeCode, SegmentCode[]> = {
  CH: ['RETL', 'COMM', 'GOVT'],
  SV: ['RETL', 'COMM'],
  MM: ['RETL', 'COMM'],
  CD: ['RETL', 'COMM'],
  LN: ['RETL', 'COMM'],
  MG: ['RETL'],
  CC: ['RETL', 'COMM'],
  LC: ['RETL', 'COMM'],
  MC: ['COMM'],
  TR: ['RETL'],
  ES: ['COMM'],
  OP: ['COMM'],
};

/**
 * Convert a letter A-Z to a numeric value 0-25
 */
function letterToValue(letter: string): number {
  return letter.charCodeAt(0) - 65; // 'A' = 0, 'Z' = 25
}

/**
 * Convert a numeric value 0-25 to a letter A-Z
 */
function valueToLetter(value: number): string {
  return String.fromCharCode((value % 26) + 65);
}

/**
 * Calculate a Luhn-like checksum for alpha characters
 * Returns a 2-letter checksum
 */
export function calculateChecksum(type: string, segment: string, unique: string): string {
  const input = type + segment + unique;

  // Calculate checksum using a modified Luhn algorithm for letters
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    let value = letterToValue(input[i]);

    // Double every second digit (from right)
    if ((input.length - i) % 2 === 0) {
      value = value * 2;
      if (value > 25) {
        value = Math.floor(value / 26) + (value % 26);
      }
    }

    sum += value;
  }

  // Calculate check digits
  const checkValue1 = (26 - (sum % 26)) % 26;
  const checkValue2 = ((sum * 7) + checkValue1) % 26;

  return valueToLetter(checkValue1) + valueToLetter(checkValue2);
}

/**
 * Validate the checksum of an account ID
 */
export function validateChecksum(accountId: string): boolean {
  const parts = parseAccountId(accountId);
  if (!parts) return false;

  const expectedChecksum = calculateChecksum(parts.type, parts.segment, parts.unique);
  return parts.checksum === expectedChecksum;
}

/**
 * Parse an account ID into its components
 */
export function parseAccountId(accountId: string): {
  type: string;
  segment: string;
  unique: string;
  checksum: string;
} | null {
  if (!AccountIdPattern.test(accountId)) {
    return null;
  }

  const parts = accountId.split('-');
  return {
    type: parts[0],
    segment: parts[1],
    unique: parts[2],
    checksum: parts[3],
  };
}

/**
 * Validate that an account ID is well-formed and has a valid checksum
 */
export function isValidAccountId(accountId: string): boolean {
  if (!AccountIdPattern.test(accountId)) {
    return false;
  }

  return validateChecksum(accountId);
}

/**
 * Validate that a type/segment combination is allowed
 */
export function isValidTypeSegmentCombination(type: AccountTypeCode, segment: SegmentCode): boolean {
  return VALID_SEGMENTS[type]?.includes(segment) ?? false;
}

/**
 * Generate a random 8-letter unique identifier
 */
export function generateUniqueId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += letters[Math.floor(Math.random() * 26)];
  }
  return result;
}

/**
 * Generate a complete account ID
 */
export function generateAccountId(type: AccountTypeCode, segment: SegmentCode): string {
  if (!isValidTypeSegmentCombination(type, segment)) {
    throw new Error(`Invalid type/segment combination: ${type}/${segment}`);
  }

  const unique = generateUniqueId();
  const checksum = calculateChecksum(type, segment, unique);

  return `${type}-${segment}-${unique}-${checksum}`;
}

/**
 * Generate a deterministic account ID from a seed (for testing)
 */
export function generateDeterministicAccountId(
  type: AccountTypeCode,
  segment: SegmentCode,
  seed: string
): string {
  if (!isValidTypeSegmentCombination(type, segment)) {
    throw new Error(`Invalid type/segment combination: ${type}/${segment}`);
  }

  // Use first 8 letters of seed (uppercase), pad with 'A' if needed
  let unique = seed
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 8)
    .padEnd(8, 'A');

  const checksum = calculateChecksum(type, segment, unique);

  return `${type}-${segment}-${unique}-${checksum}`;
}

/**
 * Match an account ID against a glob pattern
 * Supports * as wildcard
 */
export function matchAccountPattern(accountId: string, pattern: string): boolean {
  // Escape regex special characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(accountId);
}

/**
 * Check if an account ID matches any of the given patterns
 */
export function matchAnyAccountPattern(accountId: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchAccountPattern(accountId, pattern));
}
