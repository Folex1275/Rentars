/**
 * Helper functions for booking tests.
 */

import type { Booking, CreateBookingInput } from '../../src/services/booking.service';

export function createMockBookingInput(overrides?: Partial<CreateBookingInput>): CreateBookingInput {
  return {
    property_id: 'prop-123',
    tenant_id: 'user-456',
    check_in: '2026-06-10',
    check_out: '2026-06-15',
    total_price: 500,
    ...overrides,
  };
}

export function createMockBooking(overrides?: Partial<Booking>): Booking {
  return {
    id: 'booking-123',
    property_id: 'prop-123',
    tenant_id: 'user-456',
    check_in: '2026-06-10',
    check_out: '2026-06-15',
    total_price: 500,
    status: 'Pending',
    escrow_id: 'escrow-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function assertBookingSuccess(result: any): asserts result is { success: true; data: Booking } {
  if (!result.success) {
    throw new Error(`Expected booking operation to succeed, but got error: ${result.error}`);
  }
}

export function assertBookingError(result: any): asserts result is { success: false; error: string } {
  if (result.success) {
    throw new Error('Expected booking operation to fail, but it succeeded');
  }
}
