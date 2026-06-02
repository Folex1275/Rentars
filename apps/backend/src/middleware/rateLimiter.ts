import type { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redisClient } from '@/config/redis.js';
import { loggingService } from '@/services/logging.service.js';

interface AuthRequest extends Request {
  userId?: string;
}

// Rate limiter instances
let generalLimiter: RateLimiterRedis | RateLimiterMemory;
let authLimiter: RateLimiterRedis | RateLimiterMemory;
let bookingLimiter: RateLimiterRedis | RateLimiterMemory;
let blockchainLimiter: RateLimiterRedis | RateLimiterMemory;

const useRedis = !!process.env.REDIS_URL;

// Initialize limiters
if (useRedis) {
  generalLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:general',
    points: 100,
    duration: 60,
  });

  authLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:auth',
    points: 10,
    duration: 60,
  });

  bookingLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:booking',
    points: 5,
    duration: 60,
  });

  blockchainLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:blockchain',
    points: 20,
    duration: 60,
  });
} else {
  generalLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
  authLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
  bookingLimiter = new RateLimiterMemory({ points: 5, duration: 60 });
  blockchainLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
}

function setRateLimitHeaders(res: Response, limiterRes: any): void {
  res.setHeader('X-RateLimit-Limit', limiterRes.consumedPoints);
  res.setHeader('X-RateLimit-Remaining', limiterRes.remainingPoints);
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + limiterRes.msBeforeNext).toISOString());
}

export function generalRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';

  generalLimiter
    .consume(key)
    .then((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      next();
    })
    .catch((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      res.setHeader('Retry-After', Math.ceil(limiterRes.msBeforeNext / 1000));
      loggingService.logBlockchainOperation('rate_limit_exceeded', { ip: key, endpoint: req.path }, undefined, 'General rate limit exceeded');
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    });
}

export function authRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';

  authLimiter
    .consume(key)
    .then((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      next();
    })
    .catch((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      res.setHeader('Retry-After', Math.ceil(limiterRes.msBeforeNext / 1000));
      loggingService.logBlockchainOperation('rate_limit_exceeded', { ip: key, endpoint: req.path }, undefined, 'Auth rate limit exceeded');
      res.status(429).json({ error: 'Too many authentication requests, please try again later.' });
    });
}

export function bookingRateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const key = req.userId || req.ip || 'unknown';

  bookingLimiter
    .consume(key)
    .then((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      next();
    })
    .catch((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      res.setHeader('Retry-After', Math.ceil(limiterRes.msBeforeNext / 1000));
      loggingService.logBlockchainOperation('rate_limit_exceeded', { userId: req.userId, ip: req.ip, endpoint: req.path }, undefined, 'Booking rate limit exceeded');
      res.status(429).json({ error: 'Too many booking requests, please try again later.' });
    });
}

export function blockchainRateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const key = req.userId || req.ip || 'unknown';

  blockchainLimiter
    .consume(key)
    .then((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      next();
    })
    .catch((limiterRes) => {
      setRateLimitHeaders(res, limiterRes);
      res.setHeader('Retry-After', Math.ceil(limiterRes.msBeforeNext / 1000));
      loggingService.logBlockchainOperation('rate_limit_exceeded', { userId: req.userId, ip: req.ip, endpoint: req.path }, undefined, 'Blockchain operation rate limit exceeded');
      res.status(429).json({ error: 'Too many blockchain operations, please try again later.' });
    });
}

// Backward compatibility export
export const rateLimiter = generalRateLimiter;
