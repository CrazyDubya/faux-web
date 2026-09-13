import { D1Database } from '@cloudflare/workers-types';
import {
  Agent,
  AgentType,
  AgentStatus,
  AgentCapability,
  AgentRegistrationRequest,
  AgentScopeRequest,
} from '../types';
import { generateAgentToken, hashToken } from '../utils/ids';
import { Errors } from '../utils/errors';
import { matchAnyAccountPattern } from '../utils/account-id';

/**
 * Agent Service
 *
 * Handles agent registration, authentication, and authorization.
 */

export interface AgentService {
  registerAgent(request: AgentRegistrationRequest): Promise<{
    agent_id: string;
    token: string;
    capabilities_granted: AgentCapability[];
    rate_limits: {
      requests_per_minute: number;
      transactions_per_minute: number;
      amount_per_day: number;
    };
    expires_at: string;
  }>;

  getAgent(agentId: string): Promise<Agent | null>;
  getAgentByToken(token: string): Promise<Agent | null>;
  configureScope(agentId: string, request: AgentScopeRequest): Promise<void>;
  suspendAgent(agentId: string): Promise<void>;
  revokeAgent(agentId: string): Promise<void>;
  checkCapability(agent: Agent, capability: AgentCapability): boolean;
  checkAccountAccess(agent: Agent, accountId: string): boolean;
  checkTransactionLimit(agent: Agent, amount: number): boolean;
  recordActivity(agentId: string): Promise<void>;
}

export function createAgentService(db: D1Database): AgentService {
  return {
    async registerAgent(request: AgentRegistrationRequest) {
      // Check if agent already exists
      const existing = await db
        .prepare(`SELECT id FROM agents WHERE id = ?`)
        .bind(request.agent_id)
        .first();

      if (existing) {
        throw Errors.validationError({
          agent_id: ['Agent ID already registered'],
        });
      }

      // Generate token
      const token = generateAgentToken();
      const tokenHash = await hashToken(token);

      // Determine granted capabilities based on agent type
      const grantedCapabilities = getDefaultCapabilities(request.agent_type);
      const requestedCapabilities = request.capabilities_requested.filter(
        cap => grantedCapabilities.includes(cap)
      );

      // Use requested or default rate limits
      const rateLimits = {
        requests_per_minute: request.rate_limits?.requests_per_minute || 100,
        transactions_per_minute: request.rate_limits?.transactions_per_minute || 50,
        amount_per_day: request.rate_limits?.amount_per_day || 100000000, // F$1M
      };

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      await db
        .prepare(
          `INSERT INTO agents (
            id, type, status, token_hash, capabilities,
            requests_per_minute, transactions_per_minute, daily_amount_limit,
            webhook_url, created_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          request.agent_id,
          request.agent_type,
          'ACTIVE',
          tokenHash,
          JSON.stringify(requestedCapabilities),
          rateLimits.requests_per_minute,
          rateLimits.transactions_per_minute,
          rateLimits.amount_per_day,
          request.webhook_url || null,
          now.toISOString(),
          expiresAt.toISOString()
        )
        .run();

      return {
        agent_id: request.agent_id,
        token,
        capabilities_granted: requestedCapabilities,
        rate_limits: rateLimits,
        expires_at: expiresAt.toISOString(),
      };
    },

    async getAgent(agentId: string): Promise<Agent | null> {
      const result = await db
        .prepare(`SELECT * FROM agents WHERE id = ?`)
        .bind(agentId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToAgent(result);
    },

    async getAgentByToken(token: string): Promise<Agent | null> {
      const tokenHash = await hashToken(token);

      const result = await db
        .prepare(`SELECT * FROM agents WHERE token_hash = ? AND status = 'ACTIVE'`)
        .bind(tokenHash)
        .first();

      if (!result) {
        return null;
      }

      // Check expiration
      const agent = mapRowToAgent(result);
      if (agent.expires_at && new Date(agent.expires_at) < new Date()) {
        return null;
      }

      return agent;
    },

    async configureScope(agentId: string, request: AgentScopeRequest): Promise<void> {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw Errors.accountNotFound(agentId);
      }

      const updates: string[] = [];
      const params: unknown[] = [];

      if (request.account_patterns) {
        updates.push('account_patterns = ?');
        params.push(JSON.stringify(request.account_patterns));
      }

      if (request.transaction_types) {
        updates.push('transaction_types = ?');
        params.push(JSON.stringify(request.transaction_types));
      }

      if (request.amount_limits) {
        if (request.amount_limits.single_transaction !== undefined) {
          updates.push('single_transaction_limit = ?');
          params.push(request.amount_limits.single_transaction);
        }
        if (request.amount_limits.daily_aggregate !== undefined) {
          updates.push('daily_amount_limit = ?');
          params.push(request.amount_limits.daily_aggregate);
        }
      }

      if (updates.length === 0) {
        return;
      }

      params.push(agentId);

      await db
        .prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
    },

    async suspendAgent(agentId: string): Promise<void> {
      await db
        .prepare(`UPDATE agents SET status = 'SUSPENDED' WHERE id = ?`)
        .bind(agentId)
        .run();
    },

    async revokeAgent(agentId: string): Promise<void> {
      await db
        .prepare(`UPDATE agents SET status = 'REVOKED' WHERE id = ?`)
        .bind(agentId)
        .run();
    },

    checkCapability(agent: Agent, capability: AgentCapability): boolean {
      return agent.capabilities.includes(capability);
    },

    checkAccountAccess(agent: Agent, accountId: string): boolean {
      // If no patterns specified, agent has access to all accounts
      // (within their capability level)
      if (!agent.account_patterns || agent.account_patterns.length === 0) {
        return true;
      }

      return matchAnyAccountPattern(accountId, agent.account_patterns);
    },

    checkTransactionLimit(agent: Agent, amount: number): boolean {
      return amount <= agent.single_transaction_limit;
    },

    async recordActivity(agentId: string): Promise<void> {
      await db
        .prepare(`UPDATE agents SET last_active_at = ? WHERE id = ?`)
        .bind(new Date().toISOString(), agentId)
        .run();
    },
  };
}

/**
 * Get default capabilities for an agent type
 */
function getDefaultCapabilities(type: AgentType): AgentCapability[] {
  const capabilities: Record<AgentType, AgentCapability[]> = {
    ECOMMERCE_MERCHANT: [
      'ACCOUNT_READ',
      'BALANCE_READ',
      'TRANSACTION_READ',
      'PAYMENT_INITIATE',
      'MERCHANT_PROCESSING',
    ],
    CUSTOMER_SERVICE: [
      'ACCOUNT_READ',
      'BALANCE_READ',
      'TRANSACTION_READ',
    ],
    TREASURY_MANAGEMENT: [
      'ACCOUNT_READ',
      'ACCOUNT_WRITE',
      'BALANCE_READ',
      'TRANSACTION_READ',
      'PAYMENT_INITIATE',
      'WIRE_ORIGINATE',
    ],
    ANALYTICS: [
      'ACCOUNT_READ',
      'BALANCE_READ',
      'TRANSACTION_READ',
    ],
    COMPLIANCE: [
      'ACCOUNT_READ',
      'BALANCE_READ',
      'TRANSACTION_READ',
      'COMPLIANCE_READ',
      'COMPLIANCE_WRITE',
    ],
    ADMIN: [
      'ACCOUNT_READ',
      'ACCOUNT_WRITE',
      'BALANCE_READ',
      'TRANSACTION_READ',
      'PAYMENT_INITIATE',
      'MERCHANT_PROCESSING',
      'WIRE_ORIGINATE',
      'COMPLIANCE_READ',
      'COMPLIANCE_WRITE',
    ],
  };

  return capabilities[type];
}

/**
 * Map a database row to an Agent object
 */
function mapRowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    type: row.type as AgentType,
    status: row.status as AgentStatus,
    capabilities: JSON.parse(row.capabilities as string),
    account_patterns: row.account_patterns
      ? JSON.parse(row.account_patterns as string)
      : undefined,
    transaction_types: row.transaction_types
      ? JSON.parse(row.transaction_types as string)
      : undefined,
    requests_per_minute: row.requests_per_minute as number,
    transactions_per_minute: row.transactions_per_minute as number,
    daily_amount_limit: row.daily_amount_limit as number,
    single_transaction_limit: row.single_transaction_limit as number,
    webhook_url: row.webhook_url as string | undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    expires_at: row.expires_at as string | undefined,
    last_active_at: row.last_active_at as string | undefined,
  };
}
