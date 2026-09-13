import { describe, it, expect } from 'vitest';
import {
  calculateChecksum,
  validateChecksum,
  parseAccountId,
  isValidAccountId,
  isValidTypeSegmentCombination,
  generateUniqueId,
  generateAccountId,
  generateDeterministicAccountId,
  matchAccountPattern,
  matchAnyAccountPattern,
} from '../../utils/account-id';
import type { AccountTypeCode, SegmentCode } from '../../types';

describe('Checksum Calculation', () => {
  it('should calculate 2-letter checksum', () => {
    const checksum = calculateChecksum('CH', 'RETL', 'ABCDEFGH');
    expect(checksum).toMatch(/^[A-Z]{2}$/);
    expect(checksum.length).toBe(2);
  });

  it('should produce consistent checksums for same input', () => {
    const checksum1 = calculateChecksum('CH', 'RETL', 'ABCDEFGH');
    const checksum2 = calculateChecksum('CH', 'RETL', 'ABCDEFGH');
    expect(checksum1).toBe(checksum2);
  });

  it('should produce different checksums for different inputs', () => {
    const checksum1 = calculateChecksum('CH', 'RETL', 'ABCDEFGH');
    const checksum2 = calculateChecksum('CH', 'RETL', 'ABCDEFGI');
    expect(checksum1).not.toBe(checksum2);
  });

  it('should detect single character changes', () => {
    const checksum1 = calculateChecksum('CH', 'RETL', 'TESTACCT');
    const checksum2 = calculateChecksum('CH', 'RETL', 'TESTACCC'); // Changed last T to C
    expect(checksum1).not.toBe(checksum2);
  });
});

describe('Checksum Validation', () => {
  it('should validate correct account ID', () => {
    const accountId = generateAccountId('CH', 'RETL');
    expect(validateChecksum(accountId)).toBe(true);
  });

  it('should reject invalid checksum', () => {
    const accountId = 'CH-RETL-TESTACCT-ZZ'; // Incorrect checksum
    expect(validateChecksum(accountId)).toBe(false);
  });

  it('should reject malformed account ID', () => {
    expect(validateChecksum('INVALID')).toBe(false);
    expect(validateChecksum('CH-RETL-TEST')).toBe(false);
    expect(validateChecksum('CH-RETL-TESTACCT')).toBe(false);
  });
});

describe('Account ID Parsing', () => {
  it('should parse valid account ID', () => {
    const parsed = parseAccountId('CH-RETL-TESTACCT-AB');
    expect(parsed).toEqual({
      type: 'CH',
      segment: 'RETL',
      unique: 'TESTACCT',
      checksum: 'AB',
    });
  });

  it('should return null for invalid format', () => {
    expect(parseAccountId('INVALID')).toBeNull();
    expect(parseAccountId('CH-RETL-TEST')).toBeNull();
    expect(parseAccountId('CH-retl-TESTACCT-AB')).toBeNull(); // lowercase
    expect(parseAccountId('CH-RETL-TEST123-AB')).toBeNull(); // numbers
  });

  it('should handle all valid type codes', () => {
    const validPairs: [AccountTypeCode, SegmentCode][] = [
      ['CH', 'RETL'], ['SV', 'RETL'], ['MM', 'RETL'], ['CD', 'RETL'], 
      ['LN', 'RETL'], ['MG', 'RETL'], ['CC', 'RETL'], ['LC', 'RETL'], ['TR', 'RETL'],
      ['CH', 'COMM'], ['MC', 'COMM'], ['ES', 'COMM'], ['OP', 'COMM']
    ];
    validPairs.forEach(([type, segment]) => {
      const accountId = generateAccountId(type, segment);
      const parsed = parseAccountId(accountId);
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe(type);
      expect(parsed?.segment).toBe(segment);
    });
  });
});

describe('Account ID Validation', () => {
  it('should validate correctly formed account ID', () => {
    const accountId = generateAccountId('CH', 'RETL');
    expect(isValidAccountId(accountId)).toBe(true);
  });

  it('should reject account ID with invalid checksum', () => {
    expect(isValidAccountId('CH-RETL-TESTACCT-ZZ')).toBe(false);
  });

  it('should reject malformed account ID', () => {
    expect(isValidAccountId('INVALID')).toBe(false);
    expect(isValidAccountId('CH-RETL-TEST')).toBe(false);
    expect(isValidAccountId('ch-retl-testacct-ab')).toBe(false);
  });

  it('should reject account ID with numbers', () => {
    expect(isValidAccountId('CH-RETL-TEST1234-AB')).toBe(false);
  });

  it('should reject account ID with wrong length unique ID', () => {
    expect(isValidAccountId('CH-RETL-SHORT-AB')).toBe(false);
    expect(isValidAccountId('CH-RETL-TOOLONGID-AB')).toBe(false);
  });
});

describe('Type/Segment Validation', () => {
  it('should accept valid type/segment combinations', () => {
    expect(isValidTypeSegmentCombination('CH', 'RETL')).toBe(true);
    expect(isValidTypeSegmentCombination('CH', 'COMM')).toBe(true);
    expect(isValidTypeSegmentCombination('CH', 'GOVT')).toBe(true);
    expect(isValidTypeSegmentCombination('MC', 'COMM')).toBe(true);
    expect(isValidTypeSegmentCombination('MG', 'RETL')).toBe(true);
  });

  it('should reject invalid type/segment combinations', () => {
    expect(isValidTypeSegmentCombination('MC', 'RETL')).toBe(false); // Merchant only COMM
    expect(isValidTypeSegmentCombination('MG', 'COMM')).toBe(false); // Mortgage only RETL
    expect(isValidTypeSegmentCombination('TR', 'COMM')).toBe(false); // Trust only RETL
    expect(isValidTypeSegmentCombination('CH', 'INVALID' as SegmentCode)).toBe(false);
  });
});

describe('Unique ID Generation', () => {
  it('should generate 8-letter unique ID', () => {
    const uniqueId = generateUniqueId();
    expect(uniqueId).toMatch(/^[A-Z]{8}$/);
  });

  it('should generate different IDs', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    // High probability they're different
    expect(id1).not.toBe(id2);
  });
});

describe('Account ID Generation', () => {
  it('should generate valid account ID', () => {
    const accountId = generateAccountId('CH', 'RETL');
    expect(isValidAccountId(accountId)).toBe(true);
    expect(accountId).toMatch(/^CH-RETL-[A-Z]{8}-[A-Z]{2}$/);
  });

  it('should generate different account IDs', () => {
    const id1 = generateAccountId('CH', 'RETL');
    const id2 = generateAccountId('CH', 'RETL');
    expect(id1).not.toBe(id2);
  });

  it('should throw error for invalid type/segment combination', () => {
    expect(() => generateAccountId('MC', 'RETL')).toThrow('Invalid type/segment combination');
    expect(() => generateAccountId('MG', 'COMM')).toThrow('Invalid type/segment combination');
  });

  it('should generate valid IDs for all valid type/segment pairs', () => {
    const validPairs: [AccountTypeCode, SegmentCode][] = [
      ['CH', 'RETL'], ['CH', 'COMM'], ['CH', 'GOVT'],
      ['SV', 'RETL'], ['SV', 'COMM'],
      ['MM', 'RETL'], ['MM', 'COMM'],
      ['CD', 'RETL'], ['CD', 'COMM'],
      ['LN', 'RETL'], ['LN', 'COMM'],
      ['MG', 'RETL'],
      ['CC', 'RETL'], ['CC', 'COMM'],
      ['LC', 'RETL'], ['LC', 'COMM'],
      ['MC', 'COMM'],
      ['TR', 'RETL'],
      ['ES', 'COMM'],
      ['OP', 'COMM'],
    ];

    validPairs.forEach(([type, segment]) => {
      const accountId = generateAccountId(type, segment);
      expect(isValidAccountId(accountId)).toBe(true);
      expect(accountId.startsWith(`${type}-${segment}-`)).toBe(true);
    });
  });
});

describe('Deterministic Account ID Generation', () => {
  it('should generate deterministic account ID from seed', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'customer123');
    expect(isValidAccountId(accountId)).toBe(true);
    expect(accountId).toMatch(/^CH-RETL-[A-Z]{8}-[A-Z]{2}$/);
  });

  it('should generate same ID for same seed', () => {
    const id1 = generateDeterministicAccountId('CH', 'RETL', 'customer123');
    const id2 = generateDeterministicAccountId('CH', 'RETL', 'customer123');
    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different seeds', () => {
    const id1 = generateDeterministicAccountId('CH', 'RETL', 'alice');
    const id2 = generateDeterministicAccountId('CH', 'RETL', 'bobsmith');
    expect(id1).not.toBe(id2);
  });

  it('should extract letters from seed', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'abcdefgh123');
    expect(accountId).toContain('ABCDEFGH');
  });

  it('should pad with A if seed is too short', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'abc');
    expect(accountId).toContain('ABCAAAAA');
  });

  it('should truncate if seed is too long', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'abcdefghijklmnop');
    const parsed = parseAccountId(accountId);
    expect(parsed?.unique.length).toBe(8);
  });
});

describe('Account Pattern Matching', () => {
  it('should match exact account ID', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    expect(matchAccountPattern(accountId, 'CH-RETL-TESTACCT-AB')).toBe(true);
  });

  it('should match wildcard patterns', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    expect(matchAccountPattern(accountId, 'CH-*')).toBe(true);
    expect(matchAccountPattern(accountId, 'CH-RETL-*')).toBe(true);
    expect(matchAccountPattern(accountId, '*-RETL-*')).toBe(true);
    expect(matchAccountPattern(accountId, '*')).toBe(true);
  });

  it('should not match non-matching patterns', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    expect(matchAccountPattern(accountId, 'SV-*')).toBe(false);
    expect(matchAccountPattern(accountId, 'CH-COMM-*')).toBe(false);
    expect(matchAccountPattern(accountId, 'CH-RETL-OTHER-*')).toBe(false);
  });

  it('should handle multiple wildcards', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    expect(matchAccountPattern(accountId, '*-*-TESTACCT-*')).toBe(true);
    expect(matchAccountPattern(accountId, '*-*-*-AB')).toBe(true);
  });
});

describe('Multiple Pattern Matching', () => {
  it('should match any of the given patterns', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    const patterns = ['SV-*', 'CH-RETL-*', 'MM-*'];
    expect(matchAnyAccountPattern(accountId, patterns)).toBe(true);
  });

  it('should return false if no patterns match', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    const patterns = ['SV-*', 'MM-*', 'CD-*'];
    expect(matchAnyAccountPattern(accountId, patterns)).toBe(false);
  });

  it('should handle empty pattern list', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    expect(matchAnyAccountPattern(accountId, [])).toBe(false);
  });

  it('should match with exact pattern in list', () => {
    const accountId = 'CH-RETL-TESTACCT-AB';
    const patterns = ['SV-*', accountId, 'MM-*'];
    expect(matchAnyAccountPattern(accountId, patterns)).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle minimum and maximum letter values', () => {
    const checksum1 = calculateChecksum('AA', 'AAAA', 'AAAAAAAA');
    const checksum2 = calculateChecksum('ZZ', 'ZZZZ', 'ZZZZZZZZ');
    expect(checksum1).toMatch(/^[A-Z]{2}$/);
    expect(checksum2).toMatch(/^[A-Z]{2}$/);
  });

  it('should validate account IDs with all As', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'aaaaaaaa');
    expect(isValidAccountId(accountId)).toBe(true);
  });

  it('should validate account IDs with all Zs', () => {
    const accountId = generateDeterministicAccountId('CH', 'RETL', 'zzzzzzzz');
    expect(isValidAccountId(accountId)).toBe(true);
  });
});
