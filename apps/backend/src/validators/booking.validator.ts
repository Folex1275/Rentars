/**
 * Zod validators for booking-related request bodies.
 */

import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

// ─── Create booking schema ────────────────────────────────────────────────────

export const createBookingSchema = z
  .object({
    property_id: z
      .string({ required_error: 'property_id is required' })
      .uuid('property_id must be a valid UUID'),

    check_in: z
      .string({ required_error: 'check_in is required' })
      .date('check_in must be a valid ISO date (YYYY-MM-DD)'),

    check_out: z
      .string({ required_error: 'check_out is required' })
      .date('check_out must be a valid ISO date (YYYY-MM-DD)'),

    guests: z
      .number({ required_error: 'guests is required', invalid_type_error: 'guests must be a number' })
      .int('guests must be an integer')
      .positive('guests must be a positive integer'),

    total_price: z
      .number({ invalid_type_error: 'total_price must be a number' })
      .positive('total_price must be positive')
      .optional(),

    stellar_address: z
      .string()
      .regex(/^G[A-Z2-7]{55}$/, 'stellar_address must be a valid Stellar public key')
      .optional(),
  })
  .refine(
    (data) => new Date(data.check_out) > new Date(data.check_in),
    { message: 'check_out must be after check_in', path: ['check_out'] },
  )
  .refine(
    (data) => new Date(data.check_in) >= new Date(new Date().toISOString().split('T')[0]),
    { message: 'check_in must not be in the past', path: ['check_in'] },
  );

// ─── Update booking schema ────────────────────────────────────────────────────

export const updateBookingSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Cancelled', 'Completed'], {
    errorMap: () => ({
      message: 'status must be one of: Pending, Confirmed, Cancelled, Completed',
    }),
  }).optional(),
  escrow_id: z.string().max(255).optional(),
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
