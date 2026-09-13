import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAgentService } from '../../services/agents';
import type { Agent, AgentCapability } from '../../types';

// Mock D1 Database
const createMockD1 = () => {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [] })),
        run: vi.fn(async () => ({ success: true, meta: {} })),
      })),
    })),
  } as any;
};

describe('Agent Service - checkCapability', () => {
  let service: ReturnType<typeof createAgentService>;
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    service = createAgentService(mockDb);
  });

  it('should return true when agent has the capability', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ECOMMERCE_MERCHANT',
      status: 'ACTIVE',
      capabilities: ['ACCOUNT_READ', 'BALANCE_READ', 'PAYMENT_INITIATE'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkCapability(agent, 'ACCOUNT_READ')).toBe(true);
    expect(service.checkCapability(agent, 'BALANCE_READ')).toBe(true);
    expect(service.checkCapability(agent, 'PAYMENT_INITIATE')).toBe(true);
  });

  it('should return false when agent lacks the capability', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'CUSTOMER_SERVICE',
      status: 'ACTIVE',
      capabilities: ['ACCOUNT_READ', 'BALANCE_READ'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkCapability(agent, 'PAYMENT_INITIATE')).toBe(false);
    expect(service.checkCapability(agent, 'ACCOUNT_WRITE')).toBe(false);
  });
});

describe('Agent Service - checkAccountAccess', () => {
  let service: ReturnType<typeof createAgentService>;
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    service = createAgentService(mockDb);
  });

  it('should return true when no account patterns specified', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ADMIN',
      status: 'ACTIVE',
      capabilities: ['ACCOUNT_READ'],
      account_patterns: undefined,
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkAccountAccess(agent, 'CH-RETL-TESTACCT-AB')).toBe(true);
  });

  it('should return true when account matches pattern', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ECOMMERCE_MERCHANT',
      status: 'ACTIVE',
      capabilities: ['ACCOUNT_READ'],
      account_patterns: ['CH-RETL-*'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkAccountAccess(agent, 'CH-RETL-TESTACCT-AB')).toBe(true);
  });

  it('should return false when account does not match pattern', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ECOMMERCE_MERCHANT',
      status: 'ACTIVE',
      capabilities: ['ACCOUNT_READ'],
      account_patterns: ['CH-RETL-*'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkAccountAccess(agent, 'MC-COMM-MERCHANT-XY')).toBe(false);
  });
});

describe('Agent Service - checkTransactionLimit', () => {
  let service: ReturnType<typeof createAgentService>;
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    service = createAgentService(mockDb);
  });

  it('should return true when amount is below limit', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ECOMMERCE_MERCHANT',
      status: 'ACTIVE',
      capabilities: ['PAYMENT_INITIATE'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkTransactionLimit(agent, 5000000)).toBe(true);
  });

  it('should return false when amount exceeds limit', () => {
    const agent: Agent = {
      id: 'test-agent',
      type: 'ECOMMERCE_MERCHANT',
      status: 'ACTIVE',
      capabilities: ['PAYMENT_INITIATE'],
      requests_per_minute: 100,
      transactions_per_minute: 50,
      daily_amount_limit: 100000000,
      single_transaction_limit: 10000000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(service.checkTransactionLimit(agent, 10000001)).toBe(false);
  });
});
