import type { NextFunction, Request, Response } from 'express';
import { isDomainError } from '../types/errors.js';
import type { DomainError } from '../types/errors.js';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

const ERROR_STATUS_MAP: Record<string, number> = {
  // Auth errors
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  USER_ALREADY_EXISTS: 409,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  UNAUTHORIZED: 403,

  // Booking errors
  PROPERTY_NOT_FOUND: 404,
  BOOKING_OVERLAP: 409,
  ESCROW_FAILED: 400,
  INVALID_DATES: 400,
  INSUFFICIENT_FUNDS: 402,
  BOOKING_NOT_FOUND: 404,
  INVALID_STATUS: 400,

  // Escrow errors
  ESCROW_CREATION_FAILED: 400,
  ESCROW_RELEASE_FAILED: 400,
  ESCROW_NOT_FOUND: 404,
  INVALID_ESCROW_STATE: 400,
  INSUFFICIENT_ESCROW_BALANCE: 402,

  // Property errors
  UNAUTHORIZED_OWNER: 403,
  INVALID_PROPERTY_DATA: 400,
};

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err.stack);

  if (isDomainError(err)) {
    const domainErr = err as DomainError;
    const statusCode = ERROR_STATUS_MAP[domainErr.code] || 400;

    const response: ErrorResponse = {
      error: {
        code: domainErr.code,
        message: domainErr.message,
      },
    };

    if (domainErr.details) {
      response.error.details = domainErr.details;
    }

    res.status(statusCode).json(response);
    return;
  }

  // Handle untyped errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    },
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
