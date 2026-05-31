// Domain-specific error types

export enum EscrowErrorCode {
  ESCROW_CREATION_FAILED = 'ESCROW_CREATION_FAILED',
  ESCROW_RELEASE_FAILED = 'ESCROW_RELEASE_FAILED',
  ESCROW_NOT_FOUND = 'ESCROW_NOT_FOUND',
  INVALID_ESCROW_STATE = 'INVALID_ESCROW_STATE',
  INSUFFICIENT_ESCROW_BALANCE = 'INSUFFICIENT_ESCROW_BALANCE',
}

export class EscrowError extends Error {
  constructor(
    public code: EscrowErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EscrowError';
    Object.setPrototypeOf(this, EscrowError.prototype);
  }
}

export enum PropertyErrorCode {
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  UNAUTHORIZED_OWNER = 'UNAUTHORIZED_OWNER',
  INVALID_PROPERTY_DATA = 'INVALID_PROPERTY_DATA',
}

export class PropertyError extends Error {
  constructor(
    public code: PropertyErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PropertyError';
    Object.setPrototypeOf(this, PropertyError.prototype);
  }
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export type DomainError = BookingError | EscrowError | PropertyError | AuthError;

export function isDomainError(error: unknown): error is DomainError {
  return (
    error instanceof BookingError ||
    error instanceof EscrowError ||
    error instanceof PropertyError ||
    error instanceof AuthError
  );
}
