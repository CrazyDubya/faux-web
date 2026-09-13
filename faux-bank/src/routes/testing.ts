import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  FailureInjectionRequest,
  TimeAdvanceRequest,
  ResetEnvironmentRequest,
} from '../types';
import { generateFailureId } from '../utils/ids';
import { Errors, errorResponse, handleError } from '../utils/errors';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const testing = new Hono<{ Bindings: Env }>();

/**
 * POST /testing/network/inject-failure - Inject network failure
 */
testing.post(
  '/network/inject-failure',
  zValidator('json', FailureInjectionRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const db = c.env.DB;

      const failureId = generateFailureId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + request.duration_seconds * 1000);

      await db
        .prepare(
          `INSERT INTO failure_injections (
            id, network, failure_type, probability, active, filters, created_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          failureId,
          request.network,
          request.failure_type,
          request.probability,
          1,
          request.filter ? JSON.stringify(request.filter) : null,
          now.toISOString(),
          expiresAt.toISOString()
        )
        .run();

      return c.json({
        failure_id: failureId,
        network: request.network,
        failure_type: request.failure_type,
        probability: request.probability,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * DELETE /testing/network/inject-failure/:failureId - Remove failure injection
 */
testing.delete(
  '/network/inject-failure/:failureId',
  async (c) => {
    try {
      const failureId = c.req.param('failureId');
      const db = c.env.DB;

      await db
        .prepare(`UPDATE failure_injections SET active = 0 WHERE id = ?`)
        .bind(failureId)
        .run();

      return c.json({ success: true });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /testing/network/failures - List active failure injections
 */
testing.get(
  '/network/failures',
  async (c) => {
    try {
      const db = c.env.DB;

      const results = await db
        .prepare(
          `SELECT * FROM failure_injections
           WHERE active = 1 AND expires_at > datetime('now')
           ORDER BY created_at DESC`
        )
        .all();

      return c.json({
        failures: (results.results || []).map(row => ({
          id: row.id,
          network: row.network,
          failure_type: row.failure_type,
          probability: row.probability,
          filters: row.filters ? JSON.parse(row.filters as string) : null,
          created_at: row.created_at,
          expires_at: row.expires_at,
        })),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /testing/time/advance - Advance simulated time
 */
testing.post(
  '/time/advance',
  zValidator('json', TimeAdvanceRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const db = c.env.DB;

      // Get current simulated time
      const current = await db
        .prepare(`SELECT current_time, time_offset_seconds FROM simulated_time WHERE id = 1`)
        .first();

      const previousTime = current?.current_time as string || new Date().toISOString();
      const previousOffset = (current?.time_offset_seconds as number) || 0;

      let newTime: Date;
      let additionalOffset: number;

      if (request.advance_to) {
        newTime = new Date(request.advance_to);
        additionalOffset = Math.floor((newTime.getTime() - new Date(previousTime).getTime()) / 1000);
      } else if (request.advance_by) {
        // Parse ISO 8601 duration (simplified)
        additionalOffset = parseDuration(request.advance_by);
        newTime = new Date(new Date(previousTime).getTime() + additionalOffset * 1000);
      } else {
        throw Errors.validationError({
          advance_by: ['Either advance_by or advance_to must be provided'],
        });
      }

      // Update simulated time
      await db
        .prepare(
          `UPDATE simulated_time SET current_time = ?, time_offset_seconds = ? WHERE id = 1`
        )
        .bind(newTime.toISOString(), previousOffset + additionalOffset)
        .run();

      // Trigger time-dependent events (in a real system, this would be more sophisticated)
      const events: string[] = [];

      // Expire old authorizations
      const expiredAuths = await db
        .prepare(
          `UPDATE authorizations SET status = 'EXPIRED'
           WHERE status = 'APPROVED' AND expires_at < ?`
        )
        .bind(newTime.toISOString())
        .run();
      if (expiredAuths.meta.changes > 0) {
        events.push(`Expired ${expiredAuths.meta.changes} authorization(s)`);
      }

      // Expire KYC verifications
      const expiredKyc = await db
        .prepare(
          `UPDATE kyc_verifications SET status = 'EXPIRED'
           WHERE status = 'APPROVED' AND expires_at < ?`
        )
        .bind(newTime.toISOString())
        .run();
      if (expiredKyc.meta.changes > 0) {
        events.push(`Expired ${expiredKyc.meta.changes} KYC verification(s)`);
      }

      // Deactivate expired failure injections
      await db
        .prepare(
          `UPDATE failure_injections SET active = 0 WHERE expires_at < ?`
        )
        .bind(newTime.toISOString())
        .run();

      return c.json({
        previous_time: previousTime,
        current_time: newTime.toISOString(),
        events_triggered: events,
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /testing/time - Get current simulated time
 */
testing.get(
  '/time',
  async (c) => {
    try {
      const db = c.env.DB;

      const result = await db
        .prepare(`SELECT current_time, time_offset_seconds FROM simulated_time WHERE id = 1`)
        .first();

      return c.json({
        current_time: result?.current_time || new Date().toISOString(),
        time_offset_seconds: result?.time_offset_seconds || 0,
        real_time: new Date().toISOString(),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /testing/reset - Reset test environment
 */
testing.post(
  '/reset',
  zValidator('json', ResetEnvironmentRequest.optional()),
  async (c) => {
    try {
      const request = c.req.valid('json') || {};
      const db = c.env.DB;

      const preserveAccounts = request.preserve_accounts || [];
      const preserveAgents = request.preserve_agents ?? true;

      // Build list of accounts to preserve (including system accounts)
      const systemAccounts = [
        'CH-COMM-SEEDBANK-AA',
        'CH-COMM-FEEINCOM-BB',
        'CH-COMM-INTEREST-CC',
        'CH-COMM-EXTERNAL-DD',
      ];
      const allPreserved = [...systemAccounts, ...preserveAccounts];

      // Clear tables in order (respecting foreign keys)
      const statements = [
        // Clear audit logs
        db.prepare(`DELETE FROM audit_logs`),

        // Clear rate limits
        db.prepare(`DELETE FROM agent_rate_limits`),

        // Clear disputes
        db.prepare(`DELETE FROM disputes`),

        // Clear KYC verifications
        db.prepare(`DELETE FROM kyc_verifications`),

        // Clear authorizations
        db.prepare(`DELETE FROM authorizations`),

        // Clear transactions (except those involving preserved accounts)
        db.prepare(
          `DELETE FROM transactions WHERE
           debit_account_id NOT IN (${allPreserved.map(() => '?').join(',')}) AND
           credit_account_id NOT IN (${allPreserved.map(() => '?').join(',')})`
        ).bind(...allPreserved, ...allPreserved),

        // Clear failure injections
        db.prepare(`DELETE FROM failure_injections`),

        // Reset simulated time
        db.prepare(`UPDATE simulated_time SET current_time = datetime('now'), time_offset_seconds = 0`),
      ];

      // Clear accounts if not preserving
      if (allPreserved.length > 0) {
        statements.push(
          db.prepare(
            `DELETE FROM accounts WHERE id NOT IN (${allPreserved.map(() => '?').join(',')})`
          ).bind(...allPreserved)
        );
      }

      // Clear agents if not preserving
      if (!preserveAgents) {
        statements.push(db.prepare(`DELETE FROM agents`));
      }

      // Clear non-system customers
      statements.push(
        db.prepare(`DELETE FROM customers WHERE type NOT IN ('SYSTEM')`)
      );

      await db.batch(statements);

      // Reset system account balances
      await db
        .prepare(
          `UPDATE accounts SET
           balance_available = 100000000000,
           balance_ledger = 100000000000,
           balance_pending = 0,
           balance_held = 0
           WHERE id = 'CH-COMM-SEEDBANK-AA'`
        )
        .run();

      // Seed scenario if requested
      if (request.seed_scenario) {
        await seedScenario(db, request.seed_scenario);
      }

      return c.json({
        success: true,
        preserved_accounts: allPreserved,
        preserved_agents: preserveAgents,
        seed_scenario: request.seed_scenario || 'MINIMAL',
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * Parse an ISO 8601 duration string (simplified)
 * Supports: P1D, P7D, P30D, PT1H, PT30M, etc.
 */
function parseDuration(duration: string): number {
  const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
  const match = duration.match(regex);

  if (!match) {
    throw Errors.validationError({
      advance_by: ['Invalid duration format. Use ISO 8601 duration (e.g., P1D, PT1H, P7D)'],
    });
  }

  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  const seconds = parseInt(match[4] || '0', 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Seed test scenarios
 */
async function seedScenario(db: D1Database, scenario: string): Promise<void> {
  const now = new Date().toISOString();

  if (scenario === 'RETAIL_DEMO' || scenario === 'FULL') {
    // Create demo retail customer
    await db
      .prepare(
        `INSERT OR IGNORE INTO customers (id, type, name, status, kyc_status, created_at, updated_at)
         VALUES ('CUST-DEMO-RETAIL', 'INDIVIDUAL', 'Demo Retail Customer', 'ACTIVE', 'VERIFIED', ?, ?)`
      )
      .bind(now, now)
      .run();

    // Create demo retail accounts
    await db.batch([
      db.prepare(
        `INSERT OR IGNORE INTO accounts (
          id, type, segment, owner_id, name, status, currency,
          balance_available, balance_ledger, overdraft_limit,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'CH-RETL-DEMOUSER-AB',
        'CH',
        'RETL',
        'CUST-DEMO-RETAIL',
        'Demo Checking',
        'ACTIVE',
        'FXUSD',
        500000, // F$5,000
        500000,
        50000, // F$500 overdraft
        now,
        now
      ),
      db.prepare(
        `INSERT OR IGNORE INTO accounts (
          id, type, segment, owner_id, name, status, currency,
          balance_available, balance_ledger,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'SV-RETL-DEMOUSER-CD',
        'SV',
        'RETL',
        'CUST-DEMO-RETAIL',
        'Demo Savings',
        'ACTIVE',
        'FXUSD',
        1000000, // F$10,000
        1000000,
        now,
        now
      ),
    ]);
  }

  if (scenario === 'COMMERCIAL_DEMO' || scenario === 'FULL') {
    // Create demo merchant
    await db
      .prepare(
        `INSERT OR IGNORE INTO customers (id, type, name, status, kyc_status, created_at, updated_at)
         VALUES ('CUST-DEMO-MERCHANT', 'BUSINESS', 'Demo Merchant', 'ACTIVE', 'VERIFIED', ?, ?)`
      )
      .bind(now, now)
      .run();

    // Create demo merchant accounts
    await db.batch([
      db.prepare(
        `INSERT OR IGNORE INTO accounts (
          id, type, segment, owner_id, name, status, currency,
          balance_available, balance_ledger,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'MC-COMM-DEMOMERC-EF',
        'MC',
        'COMM',
        'CUST-DEMO-MERCHANT',
        'Demo Merchant Account',
        'ACTIVE',
        'FXUSD',
        100000, // F$1,000
        100000,
        now,
        now
      ),
      db.prepare(
        `INSERT OR IGNORE INTO accounts (
          id, type, segment, owner_id, name, status, currency,
          balance_available, balance_ledger,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'CH-COMM-DEMOMERC-GH',
        'CH',
        'COMM',
        'CUST-DEMO-MERCHANT',
        'Demo Operating Account',
        'ACTIVE',
        'FXUSD',
        5000000, // F$50,000
        5000000,
        now,
        now
      ),
    ]);
  }
}

export { testing };
