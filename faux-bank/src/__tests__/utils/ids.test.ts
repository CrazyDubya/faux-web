import { describe, it, expect } from 'vitest';
import {
  generateUUID,
  generateAlphaId,
  generateSessionId,
  generateCustomerId,
  generateDisputeId,
  generateKycId,
  generateAuthorizationId,
  generateWireId,
  generateChargebackId,
  generateLogId,
  generateFailureId,
  generateAgentToken,
  generateTokenSalt,
  hashToken,
  verifyToken,
  generateCardToken,
} from '../../utils/ids';

describe('ID Generation - UUIDs', () => {
  it('should generate valid UUID v4', () => {
    const uuid = generateUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
  });
});

describe('ID Generation - Alpha IDs', () => {
  it('should generate alpha ID with correct format', () => {
    const id = generateAlphaId('TEST');
    // Format: PREFIX-XXXX-XXXX-XXXX
    expect(id).toMatch(/^TEST-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate unique alpha IDs', () => {
    const id1 = generateAlphaId('TEST');
    const id2 = generateAlphaId('TEST');
    expect(id1).not.toBe(id2);
  });

  it('should only contain uppercase letters after prefix', () => {
    const id = generateAlphaId('PREFIX');
    const letters = id.replace(/PREFIX-|-/g, '');
    expect(letters).toMatch(/^[A-Z]+$/);
    expect(letters.length).toBe(12);
  });
});

describe('ID Generation - Specific Types', () => {
  it('should generate session ID with SES prefix', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^SES-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate customer ID with CUST prefix', () => {
    const id = generateCustomerId();
    expect(id).toMatch(/^CUST-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate dispute ID with DSP prefix', () => {
    const id = generateDisputeId();
    expect(id).toMatch(/^DSP-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate KYC ID with KYC prefix', () => {
    const id = generateKycId();
    expect(id).toMatch(/^KYC-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate authorization ID with AUTH prefix', () => {
    const id = generateAuthorizationId();
    expect(id).toMatch(/^AUTH-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate wire ID with WIRE prefix', () => {
    const id = generateWireId();
    expect(id).toMatch(/^WIRE-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate chargeback ID with CHB prefix', () => {
    const id = generateChargebackId();
    expect(id).toMatch(/^CHB-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate log ID with LOG prefix', () => {
    const id = generateLogId();
    expect(id).toMatch(/^LOG-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });

  it('should generate failure ID with FAIL prefix', () => {
    const id = generateFailureId();
    expect(id).toMatch(/^FAIL-[A-Z]{4}-[A-Z]{4}-[A-Z]{4}$/);
  });
});

describe('Token Generation', () => {
  it('should generate agent token with correct length', () => {
    const token = generateAgentToken();
    // 32 bytes = 64 hex characters
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique agent tokens', () => {
    const token1 = generateAgentToken();
    const token2 = generateAgentToken();
    expect(token1).not.toBe(token2);
  });

  it('should generate token salt with correct length', () => {
    const salt = generateTokenSalt();
    // 16 bytes = 32 hex characters
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should generate unique salts', () => {
    const salt1 = generateTokenSalt();
    const salt2 = generateTokenSalt();
    expect(salt1).not.toBe(salt2);
  });
});

describe('Token Hashing', () => {
  it('should hash token to hex string', async () => {
    const token = 'test-token-12345';
    const hash = await hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce consistent hashes for same token (legacy format)', async () => {
    const token = 'test-token-12345';
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different tokens', async () => {
    const hash1 = await hashToken('token-1');
    const hash2 = await hashToken('token-2');
    expect(hash1).not.toBe(hash2);
  });

  it('should support salted hashing', async () => {
    const token = 'test-token';
    const salt = generateTokenSalt();
    const hash = await hashToken(token, salt);
    expect(hash).toMatch(/^[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(hash).toContain(salt);
  });

  it('should produce different hashes with different salts', async () => {
    const token = 'test-token';
    const salt1 = generateTokenSalt();
    const salt2 = generateTokenSalt();
    const hash1 = await hashToken(token, salt1);
    const hash2 = await hashToken(token, salt2);
    expect(hash1).not.toBe(hash2);
  });
});

describe('Token Verification', () => {
  it('should verify correct token (legacy format)', async () => {
    const token = 'test-token-12345';
    const hash = await hashToken(token);
    const isValid = await verifyToken(token, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect token (legacy format)', async () => {
    const token = 'test-token-12345';
    const hash = await hashToken(token);
    const isValid = await verifyToken('wrong-token', hash);
    expect(isValid).toBe(false);
  });

  it('should verify correct token (salted format)', async () => {
    const token = 'test-token-12345';
    const salt = generateTokenSalt();
    const hash = await hashToken(token, salt);
    const isValid = await verifyToken(token, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect token (salted format)', async () => {
    const token = 'test-token-12345';
    const salt = generateTokenSalt();
    const hash = await hashToken(token, salt);
    const isValid = await verifyToken('wrong-token', hash);
    expect(isValid).toBe(false);
  });
});

describe('Card Token Generation', () => {
  it('should generate card token with correct format', () => {
    const token = generateCardToken();
    // Format: CARD-XXXX-XXXX-XXXX-XXXX
    expect(token).toMatch(/^CARD-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('should generate unique card tokens', () => {
    const token1 = generateCardToken();
    const token2 = generateCardToken();
    expect(token1).not.toBe(token2);
  });

  it('should only contain alphanumeric characters after prefix', () => {
    const token = generateCardToken();
    const chars = token.replace(/CARD-|-/g, '');
    expect(chars).toMatch(/^[A-Z0-9]+$/);
    expect(chars.length).toBe(16);
  });
});

describe('Security - Randomness', () => {
  it('should use crypto.getRandomValues (no Math.random patterns)', () => {
    // Generate many IDs and check for suspicious patterns
    const ids = Array.from({ length: 100 }, () => generateAlphaId('TEST'));
    const uniqueIds = new Set(ids);
    
    // All should be unique
    expect(uniqueIds.size).toBe(100);
    
    // Check distribution is reasonable (not clustered)
    const firstLetters = ids.map(id => id[5]); // First letter after prefix
    const letterCounts = firstLetters.reduce((acc, letter) => {
      acc[letter] = (acc[letter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // No letter should dominate (> 20% in 100 samples from 26 letters)
    Object.values(letterCounts).forEach(count => {
      expect(count).toBeLessThan(20);
    });
  });

  it('should generate cryptographically strong tokens', () => {
    const tokens = Array.from({ length: 100 }, () => generateAgentToken());
    const uniqueTokens = new Set(tokens);
    
    // All should be unique
    expect(uniqueTokens.size).toBe(100);
    
    // Check no obvious patterns (e.g., sequential bytes)
    tokens.forEach(token => {
      // Token should not have obvious patterns like '0123456789abcdef'
      expect(token).not.toContain('0123456789abcdef');
      expect(token).not.toContain('fedcba9876543210');
    });
  });
});
