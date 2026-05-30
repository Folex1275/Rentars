/**
 * Zod validators for authentication-related request bodies.
 */

import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

// ─── Register schema ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'password is required' })
    .min(8, 'password must be at least 8 characters')
    .max(128, 'password must be at most 128 characters'),

  name: z
    .string({ required_error: 'name is required' })
    .min(1, 'name must not be empty')
    .max(100, 'name must be at most 100 characters')
    .trim(),
});

// ─── Login schema ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'password is required' })
    .min(1, 'password is required'),
});

// ─── Middleware factory ───────────────────────────────────────────────────────

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
