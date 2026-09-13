import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';

import { accounts } from './routes/accounts';
import { transactions } from './routes/transactions';
import { merchant } from './routes/merchant';
import { agents } from './routes/agents';
import { compliance } from './routes/compliance';
import { testing } from './routes/testing';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { AccountLedger } from './durable-objects/account-ledger';
import { handleError, errorResponse, generateTraceId } from './utils/errors';

// Re-export Durable Object
export { AccountLedger };

// Environment bindings
type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ACCOUNT_LEDGER: DurableObjectNamespace;
  ENVIRONMENT: string;
  TESTING_SECRET?: string; // Required for testing endpoints in production
};

// Create main application
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors({
  origin: (origin, c) => {
    // In production, restrict to known origins
    const allowedOrigins = ['https://fauxbank.test', 'https://api.fauxbank.test'];
    const env = c.env?.ENVIRONMENT || 'development';
    if (env === 'production') {
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    }
    // In development, allow all origins
    return origin || '*';
  },
  credentials: true,
}));
app.use('*', logger());
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
  },
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
app.use('*', prettyJSON());

// Add trace ID to all requests
app.use('*', async (c, next) => {
  const traceId = c.req.header('X-Trace-ID') || generateTraceId();
  c.header('X-Trace-ID', traceId);
  await next();
});

// Health check (no auth required)
app.get('/', (c) => {
  return c.json({
    name: 'FauxBank API',
    version: '0.1.0',
    status: 'operational',
    description: 'Autonomous Banking Simulation Platform',
    documentation: 'https://api.fauxbank.test/docs',
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// API version prefix
const v1 = new Hono<{ Bindings: Env }>();

// Apply rate limiting to all v1 routes
v1.use('*', rateLimitMiddleware());

// Agent registration (no auth required)
v1.route('/agents', agents);

// Protected routes (require authentication)
const protectedRoutes = new Hono<{ Bindings: Env }>();
protectedRoutes.use('*', authMiddleware());

// Mount protected routes
protectedRoutes.route('/accounts', accounts);
protectedRoutes.route('/transactions', transactions);
protectedRoutes.route('/commercial/merchant', merchant);
protectedRoutes.route('/compliance', compliance);

// Testing routes - SECURITY: Protected in production
const testingRouter = new Hono<{ Bindings: Env }>();
testingRouter.use('*', async (c, next) => {
  const environment = c.env.ENVIRONMENT || 'development';

  // In production, require authentication
  if (environment === 'production') {
    const testingSecret = c.req.header('X-Testing-Secret');
    const authHeader = c.req.header('Authorization');

    // Check for testing secret first
    if (testingSecret) {
      const expectedSecret = c.env.TESTING_SECRET;
      if (!expectedSecret || testingSecret !== expectedSecret) {
        return c.json({
          code: 'FB-1001',
          message: 'Invalid testing secret',
        }, 401);
      }
    } else if (authHeader?.startsWith('Bearer ')) {
      // Verify ADMIN authorization
      const token = authHeader.substring(7);
      const { createAgentService } = await import('./services/agents');
      const agentService = createAgentService(c.env.DB);
      const agent = await agentService.getAgentByToken(token);

      if (!agent || agent.type !== 'ADMIN') {
        return c.json({
          code: 'FB-1003',
          message: 'Only ADMIN agents can access testing endpoints in production',
        }, 403);
      }
    } else {
      return c.json({
        code: 'FB-1003',
        message: 'Testing endpoints require authentication in production',
      }, 403);
    }
  }

  return next();
});
testingRouter.route('/', testing);
v1.route('/testing', testingRouter);

// Mount protected routes to v1
v1.route('/', protectedRoutes);

// Also mount transaction history at the expected path
v1.get(
  '/accounts/:accountId/transactions',
  authMiddleware(),
  async (c) => {
    // Forward to transactions route
    const accountId = c.req.param('accountId');
    const url = new URL(c.req.url);
    const query = url.search;

    // Create a sub-request to the transactions endpoint
    const newUrl = `/v1/transactions/accounts/${accountId}/transactions${query}`;
    return c.redirect(newUrl, 307);
  }
);

// Mount v1 API
app.route('/v1', v1);

// 404 handler
app.notFound((c) => {
  return c.json({
    code: 'FB-0000',
    message: 'Endpoint not found',
    trace_id: c.res.headers.get('X-Trace-ID'),
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  const error = handleError(err);
  return errorResponse(c, error);
});

// Export for Cloudflare Workers
export default app;
