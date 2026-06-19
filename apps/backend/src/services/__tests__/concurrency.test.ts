/**
 * Double-Booking Race Condition Test
 * 
 * Simulates concurrent booking attempts to verify pessimistic locking
 * prevents double-bookings.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BookingService } from '@/services/booking.service.js';
import type { CreateBookingInput } from '@/services/booking.service.js';

describe('Double-Booking Prevention', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    bookingService = new BookingService();
  });

  it('should prevent concurrent bookings for same date range', async () => {
    /**
     * Test scenario:
     * 1. User A starts booking property X for Jun 20-25
     * 2. User B simultaneously starts booking same property X for Jun 22-27
     * 3. Both fire requests within same transaction window
     * 4. Database pessimistic lock should allow only one to succeed
     */

    const bookingData: CreateBookingInput = {
      property_id: 'prop-test-1',
      tenant_id: 'user-a',
      check_in: '2026-06-20',
      check_out: '2026-06-25',
      total_price: 500,
    };

    const overlappingBookingData: CreateBookingInput = {
      property_id: 'prop-test-1',
      tenant_id: 'user-b',
      check_in: '2026-06-22',
      check_out: '2026-06-27',
      total_price: 600,
    };

    // Simulate concurrent requests
    const [result1, result2] = await Promise.all([
      bookingService.createBooking(bookingData),
      bookingService.createBooking(overlappingBookingData),
    ]);

    // Exactly one should succeed, one should fail
    const successCount = [result1.success, result2.success].filter(Boolean).length;
    expect(successCount).toBe(1);

    // The failed one should have a conflict message
    const failedResult = result1.success ? result2 : result1;
    expect(failedResult.success).toBe(false);
    expect(failedResult.error).toMatch(/overlap|conflict|unavailable/i);
  });

  it('should allow non-overlapping bookings', async () => {
    const booking1: CreateBookingInput = {
      property_id: 'prop-test-2',
      tenant_id: 'user-c',
      check_in: '2026-06-20',
      check_out: '2026-06-22',
      total_price: 200,
    };

    const booking2: CreateBookingInput = {
      property_id: 'prop-test-2',
      tenant_id: 'user-d',
      check_in: '2026-06-22',
      check_out: '2026-06-25',
      total_price: 300,
    };

    // Back-to-back bookings should both succeed
    const result1 = await bookingService.createBooking(booking1);
    const result2 = await bookingService.createBooking(booking2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should respect availability ranges (blocked dates)', async () => {
    /**
     * If dates are blocked via availability_ranges, booking should fail
     */
    const bookingData: CreateBookingInput = {
      property_id: 'prop-test-3',
      tenant_id: 'user-e',
      check_in: '2026-09-01',
      check_out: '2026-09-05',
      total_price: 400,
    };

    // Assuming this date range is blocked for maintenance
    const result = await bookingService.createBooking(bookingData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unavailable|blocked/i);
  });

  it('should validate minimum stay requirement', async () => {
    /**
     * Property has minimum_stay_nights = 2
     * Attempting 1-night booking should fail
     */
    const bookingData: CreateBookingInput = {
      property_id: 'prop-test-4', // Assume minimum_stay = 2
      tenant_id: 'user-f',
      check_in: '2026-06-20',
      check_out: '2026-06-21', // Only 1 night
      total_price: 100,
    };

    const result = await bookingService.createBooking(bookingData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/minimum|stay/i);
  });
});

/**
 * Integration Test: Simulated DST Transition
 * 
 * Verifies that timezone handling doesn't break during DST changes.
 */
describe('DST & Timezone Handling', () => {
  it('should handle spring forward DST correctly', async () => {
    /**
     * US Eastern: March 10, 2024 at 2 AM → 3 AM (spring forward)
     * Booking that spans DST boundary should work correctly
     */
    const bookingService = new BookingService();

    const bookingData: CreateBookingInput = {
      property_id: 'prop-test-dst',
      tenant_id: 'user-dst',
      check_in: '2026-03-08',
      check_out: '2026-03-12',
      total_price: 400,
    };

    const result = await bookingService.createBooking(bookingData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.check_in).toBeDefined();
      expect(result.data.check_out).toBeDefined();
    }
  });

  it('should handle fall back DST correctly', async () => {
    /**
     * US Eastern: November 3, 2024 at 2 AM → 1 AM (fall back)
     * Booking spanning DST boundary should work
     */
    const bookingService = new BookingService();

    const bookingData: CreateBookingInput = {
      property_id: 'prop-test-dst-fall',
      tenant_id: 'user-dst-fall',
      check_in: '2026-11-01',
      check_out: '2026-11-05',
      total_price: 400,
    };

    const result = await bookingService.createBooking(bookingData);

    expect(result.success).toBe(true);
  });
});
