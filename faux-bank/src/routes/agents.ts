import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  AgentRegistrationRequest,
  AgentScopeRequest,
} from '../types';
import { createAgentService } from '../services/agents';
import { authMiddleware } from '../middleware/auth';
import { Errors, errorResponse, handleError } from '../utils/errors';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENVIRONMENT?: string;
  BOOTSTRAP_TOKEN?: string; // Required for initial agent registration
};

const agents = new Hono<{ Bindings: Env }>();

/**
 * POST /agents/register - Register new agent
 * SECURITY: Requires ADMIN auth OR bootstrap token in production
 * In development, allows unauthenticated registration for convenience
 */
agents.post(
  '/register',
  zValidator('json', AgentRegistrationRequest),
  async (c) => {
    try {
      const environment = c.env.ENVIRONMENT || 'development';
      const request = c.req.valid('json');

      // SECURITY: Validate authorization for agent creation
      if (environment === 'production') {
        const authHeader = c.req.header('Authorization');
        const bootstrapToken = c.req.header('X-Bootstrap-Token');

        let authorized = false;

        // Check bootstrap token (for initial setup)
        if (bootstrapToken) {
          const expectedToken = c.env.BOOTSTRAP_TOKEN;
          if (expectedToken && bootstrapToken === expectedToken) {
            authorized = true;
          }
        }

        // Check for ADMIN agent authorization
        if (!authorized && authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const agentService = createAgentService(c.env.DB);
          const agent = await agentService.getAgentByToken(token);

          if (agent && agent.type === 'ADMIN' && agent.status === 'ACTIVE') {
            authorized = true;
          }
        }

        if (!authorized) {
          return errorResponse(c, Errors.insufficientPermissions(
            'Agent registration requires ADMIN authorization or bootstrap token in production'
          ));
        }

        // Prevent self-registration of ADMIN agents without bootstrap token
        if (request.agent_type === 'ADMIN' && !bootstrapToken) {
          const authAgent = await createAgentService(c.env.DB).getAgentByToken(
            authHeader?.substring(7) || ''
          );
          if (!authAgent || authAgent.type !== 'ADMIN') {
            return errorResponse(c, Errors.insufficientPermissions(
              'Only ADMIN agents can create other ADMIN agents'
            ));
          }
        }
      }

      const agentService = createAgentService(c.env.DB);
      const result = await agentService.registerAgent(request);

      return c.json(result, 201);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /agents/:agentId - Get agent details
 * Requires authentication and ADMIN capability (or self)
 */
agents.get(
  '/:agentId',
  authMiddleware(),
  async (c) => {
    try {
      const agentId = c.req.param('agentId');
      const currentAgent = c.get('agent');

      // SECURITY FIX: Agents can only view themselves unless they're ADMIN type
      if (currentAgent.id !== agentId && currentAgent.type !== 'ADMIN') {
        return errorResponse(c, Errors.insufficientPermissions('Only ADMIN agents can view other agents'));
      }

      const agentService = createAgentService(c.env.DB);
      const agent = await agentService.getAgent(agentId);

      if (!agent) {
        return errorResponse(c, Errors.accountNotFound(agentId));
      }

      // Don't expose token hash
      const { ...safeAgent } = agent;

      return c.json(safeAgent);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /agents/:agentId/scope - Configure agent scope
 * SECURITY FIX: Requires ADMIN type (not just ACCOUNT_WRITE capability)
 */
agents.post(
  '/:agentId/scope',
  authMiddleware(),
  zValidator('json', AgentScopeRequest),
  async (c) => {
    try {
      const currentAgent = c.get('agent');

      // SECURITY FIX: Only ADMIN type agents can configure scope
      if (currentAgent.type !== 'ADMIN') {
        return errorResponse(c, Errors.insufficientPermissions('Only ADMIN agents can configure agent scope'));
      }

      const agentId = c.req.param('agentId');
      const request = c.req.valid('json');

      const agentService = createAgentService(c.env.DB);
      await agentService.configureScope(agentId, request);

      return c.json({ success: true });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /agents/:agentId/suspend - Suspend agent
 * SECURITY FIX: Requires ADMIN type (not just ACCOUNT_WRITE capability)
 */
agents.post(
  '/:agentId/suspend',
  authMiddleware(),
  async (c) => {
    try {
      const currentAgent = c.get('agent');

      // SECURITY FIX: Only ADMIN type agents can suspend other agents
      if (currentAgent.type !== 'ADMIN') {
        return errorResponse(c, Errors.insufficientPermissions('Only ADMIN agents can suspend agents'));
      }

      const agentId = c.req.param('agentId');

      // Prevent self-suspension
      if (currentAgent.id === agentId) {
        return errorResponse(c, Errors.validationError({
          agent_id: ['Cannot suspend yourself'],
        }));
      }

      const agentService = createAgentService(c.env.DB);
      await agentService.suspendAgent(agentId);

      return c.json({ success: true, status: 'SUSPENDED' });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /agents/:agentId/revoke - Revoke agent
 * SECURITY FIX: Requires ADMIN type (not just ACCOUNT_WRITE capability)
 */
agents.post(
  '/:agentId/revoke',
  authMiddleware(),
  async (c) => {
    try {
      const currentAgent = c.get('agent');

      // SECURITY FIX: Only ADMIN type agents can revoke other agents
      if (currentAgent.type !== 'ADMIN') {
        return errorResponse(c, Errors.insufficientPermissions('Only ADMIN agents can revoke agents'));
      }

      const agentId = c.req.param('agentId');

      // Prevent self-revocation
      if (currentAgent.id === agentId) {
        return errorResponse(c, Errors.validationError({
          agent_id: ['Cannot revoke yourself'],
        }));
      }

      const agentService = createAgentService(c.env.DB);
      await agentService.revokeAgent(agentId);

      return c.json({ success: true, status: 'REVOKED' });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

export { agents };
