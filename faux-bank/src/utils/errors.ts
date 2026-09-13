import { Context } from 'hono';
import { FauxBankError, ERROR_CODES } from '../types';

/**
 * Custom error class for FauxBank errors
 */
export class FauxBankAPIError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
  traceId?: string;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FauxBankAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.traceId = generateTraceId();
  }

  toJSON(): FauxBankError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      trace_id: this.traceId,
    };
  }
}

/**
 * Generate a trace ID for request tracking
 */
export function generateTraceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'trace-';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Pre-defined error factory functions
 */
export const Errors = {
  invalidCredentials: (details?: Record<string, unknown>) =>
    new FauxBankAPIError(
      ERROR_CODES.INVALID_CREDENTIALS,
      'Invalid or missing authentication token',
      401,
      details
    ),

  tokenExpired: () =>
    new FauxBankAPIError(
      ERROR_CODES.TOKEN_EXPIRED,
      'Authentication token has expired',
      401
    ),

  insufficientPermissions: (capability: string) =>
    new FauxBankAPIError(
      ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      `Agent lacks ${capability} capability`,
      403,
      { required_capability: capability }
    ),

  accountNotFound: (accountId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.ACCOUNT_NOT_FOUND,
      `Account ${accountId} not found`,
      404,
      { account_id: accountId }
    ),

  accountFrozen: (accountId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.ACCOUNT_FROZEN,
      `Account ${accountId} is frozen`,
      403,
      { account_id: accountId }
    ),

  accountClosed: (accountId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.ACCOUNT_CLOSED,
      `Account ${accountId} is closed`,
      403,
      { account_id: accountId }
    ),

  invalidAccountFormat: (accountId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.INVALID_ACCOUNT_FORMAT,
      'Invalid account format. Expected alpha-only ID: XX-XXXX-XXXXXXXX-XX',
      400,
      { provided: accountId }
    ),

  insufficientFunds: (accountId: string, available: number, requested: number) =>
    new FauxBankAPIError(
      ERROR_CODES.INSUFFICIENT_FUNDS,
      'Insufficient funds in debit account',
      422,
      { account_id: accountId, available, requested }
    ),

  limitExceeded: (limitType: string, limit: number, attempted: number) =>
    new FauxBankAPIError(
      ERROR_CODES.LIMIT_EXCEEDED,
      `${limitType} limit exceeded`,
      422,
      { limit_type: limitType, limit, attempted }
    ),

  duplicateTransaction: (idempotencyKey: string) =>
    new FauxBankAPIError(
      ERROR_CODES.DUPLICATE_TRANSACTION,
      'Duplicate transaction detected',
      409,
      { idempotency_key: idempotencyKey }
    ),

  invalidAmount: (reason: string) =>
    new FauxBankAPIError(
      ERROR_CODES.INVALID_AMOUNT,
      `Invalid amount: ${reason}`,
      400
    ),

  currencyMismatch: (expected: string, provided: string) =>
    new FauxBankAPIError(
      ERROR_CODES.CURRENCY_MISMATCH,
      'Currency mismatch between accounts',
      400,
      { expected, provided }
    ),

  kycRequired: (customerId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.KYC_REQUIRED,
      'KYC verification required',
      403,
      { customer_id: customerId }
    ),

  transactionBlocked: (reason: string) =>
    new FauxBankAPIError(
      ERROR_CODES.TRANSACTION_BLOCKED,
      `Transaction blocked: ${reason}`,
      403
    ),

  reviewRequired: (transactionId: string) =>
    new FauxBankAPIError(
      ERROR_CODES.REVIEW_REQUIRED,
      'Transaction requires manual review',
      403,
      { transaction_id: transactionId }
    ),

  tooManyRequests: (retryAfter: number) =>
    new FauxBankAPIError(
      ERROR_CODES.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      429,
      { retry_after: retryAfter }
    ),

  velocityExceeded: (metric: string) =>
    new FauxBankAPIError(
      ERROR_CODES.VELOCITY_EXCEEDED,
      `Velocity limit exceeded for ${metric}`,
      429,
      { metric }
    ),

  internalError: (message?: string) =>
    new FauxBankAPIError(
      ERROR_CODES.INTERNAL_ERROR,
      message || 'An internal error occurred',
      500
    ),

  serviceUnavailable: (service?: string) =>
    new FauxBankAPIError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      service ? `${service} is temporarily unavailable` : 'Service temporarily unavailable',
      503
    ),

  validationError: (errors: Record<string, string[]>) =>
    new FauxBankAPIError(
      'FB-0001',
      'Validation failed',
      400,
      { validation_errors: errors }
    ),
};

/**
 * Error response helper for Hono
 */
export function errorResponse(c: Context, error: FauxBankAPIError) {
  return c.json(error.toJSON(), error.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503);
}

/**
 * Handle unknown errors and convert to FauxBankAPIError
 */
export function handleError(error: unknown): FauxBankAPIError {
  if (error instanceof FauxBankAPIError) {
    return error;
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error);
    return Errors.internalError(error.message);
  }

  console.error('Unknown error:', error);
  return Errors.internalError();
}
