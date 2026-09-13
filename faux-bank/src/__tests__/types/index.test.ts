import { describe, it, expect } from 'vitest';
import {
  formatAmount,
  AccountTypeCode,
  SegmentCode,
  AccountStatus,
  CurrencyCode,
  AccountIdPattern,
  AccountId,
  Amount,
  TransactionType,
  TransactionStatus,
  AgentType,
  AgentStatus,
  type Amount as AmountType,
} from '../../types';

describe('formatAmount', () => {
  it('should format FXUSD amount correctly', () => {
    const amount: AmountType = { value: 100000, currency: 'FXUSD' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F$1,000.00');
    expect(formatted.value).toBe(100000);
    expect(formatted.currency).toBe('FXUSD');
  });

  it('should format FXEUR amount correctly', () => {
    const amount: AmountType = { value: 250000, currency: 'FXEUR' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F€2,500.00');
  });

  it('should format FXGBP amount correctly', () => {
    const amount: AmountType = { value: 150075, currency: 'FXGBP' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F£1,500.75');
  });

  it('should handle zero amount', () => {
    const amount: AmountType = { value: 0, currency: 'FXUSD' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F$0.00');
  });

  it('should handle small amounts (cents)', () => {
    const amount: AmountType = { value: 1, currency: 'FXUSD' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F$0.01');
  });

  it('should handle large amounts with comma separators', () => {
    const amount: AmountType = { value: 123456789, currency: 'FXUSD' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F$1,234,567.89');
  });

  it('should format amounts with proper decimal places', () => {
    const amount: AmountType = { value: 12345, currency: 'FXUSD' };
    const formatted = formatAmount(amount);
    expect(formatted.display).toBe('F$123.45');
  });
});

describe('Zod Schema Validation - AccountTypeCode', () => {
  it('should validate valid account type codes', () => {
    const validCodes = ['CH', 'SV', 'MM', 'CD', 'LN', 'MG', 'CC', 'LC', 'MC', 'TR', 'ES', 'OP'];
    validCodes.forEach(code => {
      const result = AccountTypeCode.safeParse(code);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid account type codes', () => {
    const invalidCodes = ['XX', 'ABC', '12', '', 'ch'];
    invalidCodes.forEach(code => {
      const result = AccountTypeCode.safeParse(code);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - SegmentCode', () => {
  it('should validate valid segment codes', () => {
    const validCodes = ['RETL', 'COMM', 'GOVT'];
    validCodes.forEach(code => {
      const result = SegmentCode.safeParse(code);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid segment codes', () => {
    const invalidCodes = ['INVALID', 'retl', 'Retl', '', '123'];
    invalidCodes.forEach(code => {
      const result = SegmentCode.safeParse(code);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - AccountStatus', () => {
  it('should validate valid account statuses', () => {
    const validStatuses = ['ACTIVE', 'FROZEN', 'CLOSED', 'PENDING'];
    validStatuses.forEach(status => {
      const result = AccountStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid account statuses', () => {
    const invalidStatuses = ['active', 'INVALID', '', '123'];
    invalidStatuses.forEach(status => {
      const result = AccountStatus.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - CurrencyCode', () => {
  it('should validate valid currency codes', () => {
    const validCodes = ['FXUSD', 'FXEUR', 'FXGBP'];
    validCodes.forEach(code => {
      const result = CurrencyCode.safeParse(code);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid currency codes', () => {
    const invalidCodes = ['USD', 'EUR', 'fxusd', 'INVALID', ''];
    invalidCodes.forEach(code => {
      const result = CurrencyCode.safeParse(code);
      expect(result.success).toBe(false);
    });
  });
});

describe('AccountIdPattern Regex', () => {
  it('should match valid account ID format', () => {
    const validIds = [
      'CH-RETL-ABCDEFGH-AB',
      'MC-COMM-ZZZZZZZZ-ZZ',
      'SV-RETL-TESTACCT-XY',
    ];
    validIds.forEach(id => {
      expect(AccountIdPattern.test(id)).toBe(true);
    });
  });

  it('should reject invalid account ID formats', () => {
    const invalidIds = [
      'CH-RETL-ABCDEFGH',          // Missing checksum
      'CH-retl-ABCDEFGH-AB',       // Lowercase
      'CH-RETL-ABC12345-AB',       // Numbers in unique ID
      'CH-RETL-ABCDEFG-AB',        // Too short unique ID
      'CH-RETL-ABCDEFGHI-AB',      // Too long unique ID
      'C-RETL-ABCDEFGH-AB',        // Too short type
      'CH-RET-ABCDEFGH-AB',        // Too short segment
      'CH-RETL-ABCDEFGH-A',        // Too short checksum
      'CH-RETL-ABCDEFGH-ABC',      // Too long checksum
      '',                          // Empty
      'INVALID',                   // Completely wrong
    ];
    invalidIds.forEach(id => {
      expect(AccountIdPattern.test(id)).toBe(false);
    });
  });
});

describe('Zod Schema Validation - AccountId', () => {
  it('should validate valid account IDs', () => {
    const validIds = [
      'CH-RETL-ABCDEFGH-AB',
      'MC-COMM-MERCHANT-XY',
    ];
    validIds.forEach(id => {
      const result = AccountId.safeParse(id);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid account IDs with descriptive error', () => {
    const result = AccountId.safeParse('INVALID-ID');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Invalid account ID format');
      expect(result.error.errors[0].message).toContain('XX-XXXX-XXXXXXXX-XX');
    }
  });
});

describe('Zod Schema Validation - Amount', () => {
  it('should validate valid amounts', () => {
    const validAmounts = [
      { value: 100, currency: 'FXUSD' },
      { value: 0, currency: 'FXEUR' },
      { value: 999999999, currency: 'FXGBP' },
    ];
    validAmounts.forEach(amount => {
      const result = Amount.safeParse(amount);
      expect(result.success).toBe(true);
    });
  });

  it('should default currency to FXUSD', () => {
    const result = Amount.safeParse({ value: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('FXUSD');
    }
  });

  it('should reject negative amounts', () => {
    const result = Amount.safeParse({ value: -100, currency: 'FXUSD' });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer amounts', () => {
    const result = Amount.safeParse({ value: 100.5, currency: 'FXUSD' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid currency', () => {
    const result = Amount.safeParse({ value: 100, currency: 'USD' });
    expect(result.success).toBe(false);
  });
});

describe('Zod Schema Validation - TransactionType', () => {
  it('should validate valid transaction types', () => {
    const validTypes = [
      'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT',
      'FEE', 'INTEREST', 'ADJUSTMENT', 'AUTHORIZATION',
      'CAPTURE', 'REFUND', 'CHARGEBACK', 'REVERSAL',
    ];
    validTypes.forEach(type => {
      const result = TransactionType.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid transaction types', () => {
    const invalidTypes = ['INVALID', 'transfer', '', '123', 'WIRE_IN', 'ACH_DEBIT'];
    invalidTypes.forEach(type => {
      const result = TransactionType.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - TransactionStatus', () => {
  it('should validate valid transaction statuses', () => {
    const validStatuses = ['PENDING', 'POSTED', 'FAILED', 'REVERSED'];
    validStatuses.forEach(status => {
      const result = TransactionStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid transaction statuses', () => {
    const invalidStatuses = ['pending', 'COMPLETED', 'INVALID', ''];
    invalidStatuses.forEach(status => {
      const result = TransactionStatus.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - AgentType', () => {
  it('should validate valid agent types', () => {
    const validTypes = [
      'ECOMMERCE_MERCHANT',
      'CUSTOMER_SERVICE',
      'TREASURY_MANAGEMENT',
      'ANALYTICS',
      'COMPLIANCE',
      'ADMIN',
    ];
    validTypes.forEach(type => {
      const result = AgentType.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid agent types', () => {
    const invalidTypes = ['INVALID', 'ecommerce_merchant', '', 'MERCHANT'];
    invalidTypes.forEach(type => {
      const result = AgentType.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe('Zod Schema Validation - AgentStatus', () => {
  it('should validate valid agent statuses', () => {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'REVOKED'];
    validStatuses.forEach(status => {
      const result = AgentStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid agent statuses', () => {
    const invalidStatuses = ['active', 'PENDING', 'INVALID', ''];
    invalidStatuses.forEach(status => {
      const result = AgentStatus.safeParse(status);
      expect(result.success).toBe(false);
    });
  });
});

describe('Currency Symbol Mapping', () => {
  it('should use correct symbols for each currency', () => {
    expect(formatAmount({ value: 100, currency: 'FXUSD' }).display).toContain('F$');
    expect(formatAmount({ value: 100, currency: 'FXEUR' }).display).toContain('F€');
    expect(formatAmount({ value: 100, currency: 'FXGBP' }).display).toContain('F£');
  });
});
