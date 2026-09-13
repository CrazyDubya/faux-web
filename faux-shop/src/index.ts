// Nano Banana Print Shop - Main Entry Point
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { Logger } from './observability/logger';
import { ConversationRouter, type ConversationRequest } from './router/conversation-router';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors());

// Request logging middleware
app.use('*', async (c, next) => {
  const logger = new Logger();
  const start = Date.now();

  logger.requestStart(c.req.method, c.req.path);

  // Store logger in context for handlers
  c.set('logger' as never, logger as never);

  await next();

  const duration = Date.now() - start;
  logger.requestEnd(c.res.status, duration);
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'nano-banana-printshop',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Main conversation endpoint
app.post('/api/conversation', async (c) => {
  const logger = c.get('logger' as never) as Logger;

  try {
    const body = await c.req.json<ConversationRequest>();

    // Validate required fields
    if (!body.customerId) {
      return c.json({ error: 'customerId is required' }, 400);
    }

    if (!body.message) {
      return c.json({ error: 'message is required' }, 400);
    }

    // Process conversation
    const router = new ConversationRouter(c.env, logger);
    const response = await router.process(body);

    return c.json(response);
  } catch (error) {
    logger.error('Conversation processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: 'Internal server error',
        requestId: logger.getRequestId(),
      },
      500
    );
  }
});

// Get session info
app.get('/api/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first();

    if (!result) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json({
      id: result.id,
      customerId: result.customer_id,
      status: result.status,
      turnCount: result.turn_count,
      createdAt: result.created_at,
      lastActivity: result.last_activity,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// Get current pricing (read-only)
app.get('/api/pricing', async (c) => {
  try {
    const cached = await c.env.PRICING_CACHE.get('pricing:config:current', 'json');

    if (cached) {
      return c.json(cached);
    }

    // Return default pricing if no config set
    return c.json({
      products: {
        print_small: { name: '5x7 Print', price: 15 },
        print_medium: { name: '8x10 Print', price: 25 },
        print_large: { name: '11x14 Print', price: 45 },
        print_xlarge: { name: '16x20 Print', price: 75 },
        canvas: { name: 'Canvas Print', price: 120 },
        poster: { name: '18x24 Poster', price: 35 },
      },
      tiers: {
        standard: { discount: 0, freeShippingAt: 100 },
        silver: { discount: 5, freeShippingAt: 75 },
        gold: { discount: 10, freeShippingAt: 50 },
        platinum: { discount: 15, freeShippingAt: 0 },
      },
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch pricing' }, 500);
  }
});

// Get active promotions (read-only)
app.get('/api/promotions', async (c) => {
  try {
    const cached = await c.env.PRICING_CACHE.get('pricing:config:current', 'json') as {
      activePromotions?: Array<{
        id: string;
        name: string;
        description: string;
        validUntil: string;
        active: boolean;
      }>;
    } | null;

    if (cached?.activePromotions) {
      const now = new Date().toISOString();
      const active = cached.activePromotions.filter(
        (p) => p.active && p.validUntil > now
      );

      return c.json({
        promotions: active.map((p) => ({
          name: p.name,
          description: p.description,
          validUntil: p.validUntil,
        })),
      });
    }

    return c.json({ promotions: [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch promotions' }, 500);
  }
});

// Customer info endpoint
app.get('/api/customer/:customerId', async (c) => {
  const customerId = c.req.param('customerId');

  try {
    const result = await c.env.DB
      .prepare('SELECT * FROM customers WHERE id = ?')
      .bind(customerId)
      .first();

    if (!result) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    return c.json({
      id: result.id,
      tier: result.tier,
      standing: result.standing,
      totalOrders: result.total_orders,
      memberSince: result.created_at,
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
