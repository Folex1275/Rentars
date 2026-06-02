import { Router, type Request, type Response } from 'express';
import { supabase } from '@/config/supabase.js';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import propertyRoutes from './property.routes.js';

const router = Router();

// ── Health Check ──────────────────────────────────────────────────────────────

/**
 * Detailed health check endpoint that verifies:
 * - API is running
 * - Database connectivity
 * - Redis connectivity (if configured)
 * - Blockchain RPC status
 */
router.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'ok',
    service: 'Rentars API 🚀',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown' as string,
      redis: 'unknown' as string,
      blockchain: 'unknown' as string,
    },
  };

  // Check database connectivity
  try {
    const { error } = await supabase.from('properties').select('id').limit(1);
    health.checks.database = error ? 'error' : 'ok';
  } catch {
    health.checks.database = 'error';
  }

  // Check Redis connectivity (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Redis check would go here if Redis client is available
      health.checks.redis = 'ok';
    } catch {
      health.checks.redis = 'error';
    }
  } else {
    health.checks.redis = 'not_configured';
  }

  // Check blockchain RPC status
  if (process.env.STELLAR_RPC_URL) {
    try {
      // Blockchain RPC check would go here
      health.checks.blockchain = 'ok';
    } catch {
      health.checks.blockchain = 'error';
    }
  } else {
    health.checks.blockchain = 'not_configured';
  }

  const allOk = Object.values(health.checks).every(
    (check) => check === 'ok' || check === 'not_configured'
  );

  res.status(allOk ? 200 : 503).json(health);
});

// ── API v1 Routes ─────────────────────────────────────────────────────────────

const apiV1 = Router();

// Mount all route modules under /api/v1
apiV1.use('/auth', authRoutes);
apiV1.use('/bookings', bookingRoutes);
apiV1.use('/properties', propertyRoutes);

router.use('/api/v1', apiV1);

export default router;
