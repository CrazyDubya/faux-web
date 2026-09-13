import { describe, it, expect } from 'vitest';
import {
  FauxBankAPIError,
  generateTraceId,
  Errors,
  handleError,
} from '../../utils/errors';
import { ERROR_CODES } from '../../types';

describe('FauxBankAPIError', () => {
  it('should create error with all properties', () => {
    const error = new FauxBankAPIError(
      'FB-TEST',
      'Test error message',
      400,
      { field: 'value' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('FauxBankAPIError');
    expect(error.code).toBe('FB-TEST');
    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'value' });
    expect(error.traceId).toMatch(/^trace-[a-z0-9]{12}$/);
  });

  it('should default to 400 status code', () => {
    const error = new FauxBankAPIError('FB-TEST', 'Test message');
    expect(error.statusCode).toBe(400);
  });

  it('should convert to JSON format', () => {
    const error = new FauxBankAPIError(
      'FB-TEST',
      'Test message',
      403,
      { key: 'value' }
    );

    const json = error.toJSON();

    expect(json).toEqual({
      code: 'FB-TEST',
      message: 'Test message',
      details: { key: 'value' },
      trace_id: error.traceId,
    });
  });

  it('should include trace ID in JSON', () => {
    const error = new FauxBankAPIError('FB-TEST', 'Test message');
    const json = error.toJSON();
    expect(json.trace_id).toBeDefined();
    expect(json.trace_id).toMatch(/^trace-/);
  });
});

describe('generateTraceId', () => {
  it('should generate trace ID with correct format', () => {
    const traceId = generateTraceId();
    expect(traceId).toMatch(/^trace-[a-z0-9]{12}$/);
  });

  it('should generate unique trace IDs', () => {
    const id1 = generateTraceId();
    const id2 = generateTraceId();
    expect(id1).not.toBe(id2);
  });
});

describe('Error Factory - Authentication Errors', () => {
  it('should create invalidCredentials error', () => {
    const error = Errors.invalidCredentials();
    expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('Invalid or missing authentication token');
  });

  it('should create invalidCredentials with details', () => {
    const error = Errors.invalidCredentials({ agent_id: 'test-agent' });
    expect(error.details).toEqual({ agent_id: 'test-agent' });
  });

  it('should create tokenExpired error', () => {
    const error = Errors.tokenExpired();
    expect(error.code).toBe(ERROR_CODES.TOKEN_EXPIRED);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain('expired');
  });

  it('should create insufficientPermissions error', () => {
    const error = Errors.insufficientPermissions('BALANCE_READ');
    expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('BALANCE_READ');
    expect(error.details).toEqual({ required_capability: 'BALANCE_READ' });
  });
});

describe('Error Factory - Account Errors', () => {
  it('should create accountNotFound error', () => {
    const error = Errors.accountNotFound('CH-RETL-TESTACCT-AB');
    expect(error.code).toBe(ERROR_CODES.ACCOUNT_NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('CH-RETL-TESTACCT-AB');
    expect(error.details).toEqual({ account_id: 'CH-RETL-TESTACCT-AB' });
  });

  it('should create accountFrozen error', () => {
    const error = Errors.accountFrozen('CH-RETL-TESTACCT-AB');
    expect(error.code).toBe(ERROR_CODES.ACCOUNT_FROZEN);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('frozen');
  });

  it('should create accountClosed error', () => {
    const error = Errors.accountClosed('CH-RETL-TESTACCT-AB');
    expect(error.code).toBe(ERROR_CODES.ACCOUNT_CLOSED);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('closed');
  });

  it('should create invalidAccountFormat error', () => {
    const error = Errors.invalidAccountFormat('INVALID-ID');
    expect(error.code).toBe(ERROR_CODES.INVALID_ACCOUNT_FORMAT);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('XX-XXXX-XXXXXXXX-XX');
    expect(error.details).toEqual({ provided: 'INVALID-ID' });
  });
});

describe('Error Factory - Transaction Errors', () => {
  it('should create insufficientFunds error', () => {
    const error = Errors.insufficientFunds('CH-RETL-TEST-AB', 5000, 10000);
    expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
    expect(error.statusCode).toBe(422);
    expect(error.message).toContain('Insufficient funds');
    expect(error.details).toEqual({
      account_id: 'CH-RETL-TEST-AB',
      available: 5000,
      requested: 10000,
    });
  });

  it('should create limitExceeded error', () => {
    const error = Errors.limitExceeded('daily_limit', 100000, 150000);
    expect(error.code).toBe(ERROR_CODES.LIMIT_EXCEEDED);
    expect(error.statusCode).toBe(422);
    expect(error.message).toContain('daily_limit');
    expect(error.details).toEqual({
      limit_type: 'daily_limit',
      limit: 100000,
      attempted: 150000,
    });
  });

  it('should create duplicateTransaction error', () => {
    const error = Errors.duplicateTransaction('idempotency-key-123');
    expect(error.code).toBe(ERROR_CODES.DUPLICATE_TRANSACTION);
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain('Duplicate');
    expect(error.details).toEqual({ idempotency_key: 'idempotency-key-123' });
  });

  it('should create invalidAmount error', () => {
    const error = Errors.invalidAmount('negative value');
    expect(error.code).toBe(ERROR_CODES.INVALID_AMOUNT);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('negative value');
  });

  it('should create currencyMismatch error', () => {
    const error = Errors.currencyMismatch('FXUSD', 'FXEUR');
    expect(error.code).toBe(ERROR_CODES.CURRENCY_MISMATCH);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ expected: 'FXUSD', provided: 'FXEUR' });
  });
});

describe('Error Factory - Compliance Errors', () => {
  it('should create kycRequired error', () => {
    const error = Errors.kycRequired('CUST-ABCD-EFGH-IJKL');
    expect(error.code).toBe(ERROR_CODES.KYC_REQUIRED);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('KYC verification required');
    expect(error.details).toEqual({ customer_id: 'CUST-ABCD-EFGH-IJKL' });
  });

  it('should create transactionBlocked error', () => {
    const error = Errors.transactionBlocked('Suspicious activity');
    expect(error.code).toBe(ERROR_CODES.TRANSACTION_BLOCKED);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('Suspicious activity');
  });

  it('should create reviewRequired error', () => {
    const error = Errors.reviewRequired('TXN-123');
    expect(error.code).toBe(ERROR_CODES.REVIEW_REQUIRED);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('manual review');
    expect(error.details).toEqual({ transaction_id: 'TXN-123' });
  });
});

describe('Error Factory - Rate Limiting Errors', () => {
  it('should create tooManyRequests error', () => {
    const error = Errors.tooManyRequests(60);
    expect(error.code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(error.statusCode).toBe(429);
    expect(error.message).toContain('60 seconds');
    expect(error.details).toEqual({ retry_after: 60 });
  });

  it('should create velocityExceeded error', () => {
    const error = Errors.velocityExceeded('transactions_per_hour');
    expect(error.code).toBe(ERROR_CODES.VELOCITY_EXCEEDED);
    expect(error.statusCode).toBe(429);
    expect(error.message).toContain('transactions_per_hour');
    expect(error.details).toEqual({ metric: 'transactions_per_hour' });
  });
});

describe('Error Factory - System Errors', () => {
  it('should create internalError with default message', () => {
    const error = Errors.internalError();
    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.message).toContain('internal error');
  });

  it('should create internalError with custom message', () => {
    const error = Errors.internalError('Database connection failed');
    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(error.message).toBe('Database connection failed');
  });

  it('should create serviceUnavailable with default message', () => {
    const error = Errors.serviceUnavailable();
    expect(error.code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('temporarily unavailable');
  });

  it('should create serviceUnavailable with service name', () => {
    const error = Errors.serviceUnavailable('Payment Processor');
    expect(error.message).toContain('Payment Processor');
  });
});

describe('Error Factory - Validation Errors', () => {
  it('should create validationError', () => {
    const errors = {
      email: ['Invalid email format'],
      amount: ['Must be positive', 'Must be less than 1000000'],
    };
    const error = Errors.validationError(errors);
    expect(error.code).toBe('FB-0001');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual({ validation_errors: errors });
  });
});

describe('handleError', () => {
  it('should return FauxBankAPIError as-is', () => {
    const originalError = new FauxBankAPIError('FB-TEST', 'Test error', 400);
    const handled = handleError(originalError);
    expect(handled).toBe(originalError);
  });

  it('should convert standard Error to FauxBankAPIError', () => {
    const originalError = new Error('Something went wrong');
    const handled = handleError(originalError);
    expect(handled).toBeInstanceOf(FauxBankAPIError);
    expect(handled.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(handled.message).toBe('Something went wrong');
    expect(handled.statusCode).toBe(500);
  });

  it('should convert unknown errors to FauxBankAPIError', () => {
    const handled = handleError('string error');
    expect(handled).toBeInstanceOf(FauxBankAPIError);
    expect(handled.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(handled.statusCode).toBe(500);
  });

  it('should convert null to FauxBankAPIError', () => {
    const handled = handleError(null);
    expect(handled).toBeInstanceOf(FauxBankAPIError);
    expect(handled.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});

describe('Error Codes Consistency', () => {
  it('should use consistent FB-XXXX format', () => {
    const errorFactories = [
      Errors.invalidCredentials(),
      Errors.tokenExpired(),
      Errors.insufficientPermissions('test'),
      Errors.accountNotFound('test'),
      Errors.accountFrozen('test'),
      Errors.accountClosed('test'),
      Errors.invalidAccountFormat('test'),
      Errors.insufficientFunds('test', 0, 0),
      Errors.limitExceeded('test', 0, 0),
      Errors.duplicateTransaction('test'),
      Errors.invalidAmount('test'),
      Errors.currencyMismatch('a', 'b'),
      Errors.kycRequired('test'),
      Errors.transactionBlocked('test'),
      Errors.reviewRequired('test'),
      Errors.tooManyRequests(0),
      Errors.velocityExceeded('test'),
      Errors.internalError(),
      Errors.serviceUnavailable(),
      Errors.validationError({}),
    ];

    errorFactories.forEach(error => {
      expect(error.code).toMatch(/^FB-\d{4}$/);
    });
  });

  it('should have unique error codes', () => {
    const codes = [
      Errors.invalidCredentials().code,
      Errors.tokenExpired().code,
      Errors.insufficientPermissions('test').code,
      Errors.accountNotFound('test').code,
      Errors.accountFrozen('test').code,
      Errors.accountClosed('test').code,
      Errors.invalidAccountFormat('test').code,
      Errors.insufficientFunds('test', 0, 0).code,
      Errors.limitExceeded('test', 0, 0).code,
      Errors.duplicateTransaction('test').code,
      Errors.kycRequired('test').code,
      Errors.transactionBlocked('test').code,
      Errors.reviewRequired('test').code,
      Errors.tooManyRequests(0).code,
      Errors.velocityExceeded('test').code,
      Errors.internalError().code,
      Errors.serviceUnavailable().code,
    ];

    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
