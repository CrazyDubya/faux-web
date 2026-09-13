import { Context, Next } from 'hono';
import { Agent, AgentCapability } from '../types';
import { createAgentService } from '../services/agents';
import { Errors, errorResponse } from '../utils/errors';

/**
 * Authentication and Authorization Middleware
 */

// Extend Hono context to include agent
declare module 'hono' {
  interface ContextVariableMap {
    agent: Agent;
    agentId: string;
  }
}

/**
 * Authenticate agent via Bearer token
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(c, Errors.invalidCredentials());
    }

    const token = authHeader.substring(7);
    const agentService = createAgentService(c.env.DB);

    const agent = await agentService.getAgentByToken(token);

    if (!agent) {
      return errorResponse(c, Errors.invalidCredentials());
    }

    if (agent.status !== 'ACTIVE') {
      return errorResponse(c, Errors.invalidCredentials({ reason: `Agent is ${agent.status.toLowerCase()}` }));
    }

    // Record activity
    await agentService.recordActivity(agent.id);

    // Set agent in context
    c.set('agent', agent);
    c.set('agentId', agent.id);

    return next();
  };
}

/**
 * Require specific capability
 */
export function requireCapability(capability: AgentCapability) {
  return async (c: Context, next: Next) => {
    const agent = c.get('agent');

    if (!agent) {
      return errorResponse(c, Errors.invalidCredentials());
    }

    if (!agent.capabilities.includes(capability)) {
      return errorResponse(c, Errors.insufficientPermissions(capability));
    }

    return next();
  };
}

/**
 * Check account access for an agent (middleware version)
 * Use when accountId is in path params
 */
export function checkAccountAccess(accountId: string) {
  return async (c: Context, next: Next) => {
    const agent = c.get('agent');
    const agentService = createAgentService(c.env.DB);

    if (!agentService.checkAccountAccess(agent, accountId)) {
      return errorResponse(c, Errors.insufficientPermissions('Account access denied'));
    }

    return next();
  };
}

/**
 * SECURITY FIX: Middleware to check account access from path param
 * Extracts accountId from path and validates agent has access
 */
export function requireAccountAccess(paramName: string = 'accountId') {
  return async (c: Context, next: Next) => {
    const agent = c.get('agent');
    const accountId = c.req.param(paramName);

    if (!agent) {
      return errorResponse(c, Errors.invalidCredentials());
    }

    if (!accountId) {
      await next();
      return;
    }

    const agentService = createAgentService(c.env.DB);

    if (!agentService.checkAccountAccess(agent, accountId)) {
      return errorResponse(c, Errors.insufficientPermissions(`Access denied to account ${accountId}`));
    }

    return next();
  };
}

/**
 * SECURITY FIX: Check access to multiple accounts (for transactions)
 */
export async function validateTransactionAccess(
  c: Context,
  debitAccountId: string,
  creditAccountId: string
): Promise<boolean> {
  const agent = c.get('agent');
  if (!agent) return false;

  const agentService = createAgentService(c.env.DB);

  // Agent must have access to at least one of the accounts
  const hasDebitAccess = agentService.checkAccountAccess(agent, debitAccountId);
  const hasCreditAccess = agentService.checkAccountAccess(agent, creditAccountId);

  // For ADMIN agents, allow any transaction
  if (agent.type === 'ADMIN') {
    return true;
  }

  // For other agents, must have access to at least one account
  return hasDebitAccess || hasCreditAccess;
}

/**
 * Optional authentication - sets agent if token provided, but doesn't require it
 */
export function optionalAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const agentService = createAgentService(c.env.DB);

      const agent = await agentService.getAgentByToken(token);

      if (agent && agent.status === 'ACTIVE') {
        c.set('agent', agent);
        c.set('agentId', agent.id);
        await agentService.recordActivity(agent.id);
      }
    }

    await next();
  };
}
