import { Context, Next } from 'hono';
import { Agent } from '../types';
import { Errors, errorResponse } from '../utils/errors';

/**
 * Rate Limiting Middleware
 *
 * Implements per-agent rate limiting with escalating backoff.
 */

interface RateLimitState {
  request_count: number;
  transaction_count: number;
  amount_total: number;
  violations: number;
  cooldown_until?: string;
}

/**
 * Rate limit middleware
 */
export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const agent = c.get('agent') as Agent | undefined;

    if (!agent) {
      // No rate limiting for unauthenticated requests (they'll fail auth anyway)
      await next();
      return;
    }

    const db = c.env.DB;
    const kv = c.env.SESSIONS;

    // Get current window (minute)
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()).toISOString();

    // Get or create rate limit state
    const stateKey = `ratelimit:${agent.id}:${windowStart}`;
    let state: RateLimitState;

    try {
      const stored = await kv.get(stateKey, 'json') as RateLimitState | null;
      state = stored || {
        request_count: 0,
        transaction_count: 0,
        amount_total: 0,
        violations: 0,
      };
    } catch {
      state = {
        request_count: 0,
        transaction_count: 0,
        amount_total: 0,
        violations: 0,
      };
    }

    // Check if in cooldown
    if (state.cooldown_until) {
      const cooldownEnd = new Date(state.cooldown_until);
      if (now < cooldownEnd) {
        const retryAfter = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
        c.header('Retry-After', retryAfter.toString());
        c.header('X-RateLimit-Limit', agent.requests_per_minute.toString());
        c.header('X-RateLimit-Remaining', '0');
        return errorResponse(c, Errors.tooManyRequests(retryAfter));
      }
      // Cooldown expired, reset
      state.cooldown_until = undefined;
    }

    // Check request rate
    if (state.request_count >= agent.requests_per_minute) {
      state.violations++;
      const cooldownSeconds = getCooldownSeconds(state.violations);
      state.cooldown_until = new Date(now.getTime() + cooldownSeconds * 1000).toISOString();

      await kv.put(stateKey, JSON.stringify(state), { expirationTtl: 300 });

      c.header('Retry-After', cooldownSeconds.toString());
      c.header('X-RateLimit-Limit', agent.requests_per_minute.toString());
      c.header('X-RateLimit-Remaining', '0');
      return errorResponse(c, Errors.tooManyRequests(cooldownSeconds));
    }

    // Increment request count
    state.request_count++;

    // Store updated state
    await kv.put(stateKey, JSON.stringify(state), { expirationTtl: 120 });

    // Set rate limit headers
    c.header('X-RateLimit-Limit', agent.requests_per_minute.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, agent.requests_per_minute - state.request_count).toString());

    await next();
  };
}

/**
 * Transaction rate limit check (call from transaction endpoints)
 */
export async function checkTransactionRateLimit(
  c: Context,
  amount: number
): Promise<boolean> {
  const agent = c.get('agent') as Agent | undefined;

  if (!agent) {
    return true;
  }

  const kv = c.env.SESSIONS;

  // Get current window (minute)
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()).toISOString();

  const stateKey = `ratelimit:${agent.id}:${windowStart}`;
  let state: RateLimitState;

  try {
    const stored = await kv.get(stateKey, 'json') as RateLimitState | null;
    state = stored || {
      request_count: 0,
      transaction_count: 0,
      amount_total: 0,
      violations: 0,
    };
  } catch {
    return true;
  }

  // Check transaction rate
  if (state.transaction_count >= agent.transactions_per_minute) {
    return false;
  }

  // Check single transaction limit
  if (amount > agent.single_transaction_limit) {
    return false;
  }

  // Increment transaction count
  state.transaction_count++;
  state.amount_total += amount;

  await kv.put(stateKey, JSON.stringify(state), { expirationTtl: 120 });

  return true;
}

/**
 * Check daily amount limit
 */
export async function checkDailyAmountLimit(
  c: Context,
  amount: number
): Promise<boolean> {
  const agent = c.get('agent') as Agent | undefined;

  if (!agent) {
    return true;
  }

  const db = c.env.DB;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Query daily total from rate limit tracking
  const result = await db
    .prepare(
      `SELECT SUM(amount_total) as total FROM agent_rate_limits
       WHERE agent_id = ? AND window_start >= ? AND window_type = 'MINUTE'`
    )
    .bind(agent.id, dayStart)
    .first();

  const currentTotal = (result?.total as number) || 0;

  return (currentTotal + amount) <= agent.daily_amount_limit;
}

/**
 * Get cooldown duration based on violation count (escalating backoff)
 */
function getCooldownSeconds(violations: number): number {
  switch (violations) {
    case 1:
      return 60; // 1 minute
    case 2:
      return 300; // 5 minutes
    case 3:
      return 3600; // 1 hour
    default:
      return 86400; // 24 hours (manual review required)
  }
}
