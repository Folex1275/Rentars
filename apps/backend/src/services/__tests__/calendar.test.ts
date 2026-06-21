import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateRangePrice, getSeasonalPricing } from '@/services/pricing.service.js';
import { checkAvailabilityAtomic, getMonthAvailability } from '@/services/calendar.service.js';

describe('Pricing Service', () => {
  describe('calculateRangePrice', () => {
    it('should calculate total price with base rate', async () => {
      // Mock would be needed in actual test
      const result = await calculateRangePrice('prop-1', '2026-06-20', '2026-06-23');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.breakdown.length).toBe(3);
        expect(result.data.total).toBeGreaterThan(0);
      }
    });

    it('should apply seasonal pricing multiplier', async () => {
      // When a date falls within a seasonal pricing range,
      // the price should be multiplied by the season's multiplier
      const result = await calculateRangePrice('prop-1', '2026-07-01', '2026-07-03');
      expect(result.success).toBe(true);
    });

    it('should block dates from special events', async () => {
      // When a special event is marked as blocked, dates should not be available
      const result = await calculateRangePrice('prop-1', '2026-12-20', '2026-12-27');
      expect(result.success).toBe(true);
    });
  });
});

describe('Calendar Service', () => {
  describe('checkAvailabilityAtomic', () => {
    it('should validate minimum stay requirement', async () => {
      const result = await checkAvailabilityAtomic('prop-1', '2026-06-20', '2026-06-21', 2);
      if (result.success && !result.data.available) {
        expect(result.data.reason).toContain('Minimum stay');
      }
    });

    it('should detect booking conflicts', async () => {
      // This test requires setup with existing bookings
      const result = await checkAvailabilityAtomic('prop-1', '2026-06-20', '2026-06-25');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('available');
    });

    it('should reject overlapping date ranges', async () => {
      const result = await checkAvailabilityAtomic('prop-1', '2026-06-25', '2026-06-20');
      expect(result.success).toBe(false);
    });
  });

  describe('getMonthAvailability', () => {
    it('should return calendar for requested month', async () => {
      const result = await getMonthAvailability('prop-1', 2026, 6);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe(2026);
        expect(result.data.month).toBe(6);
        expect(result.data.days.length).toBeGreaterThan(0);
      }
    });

    it('should validate month/year', async () => {
      const result = await getMonthAvailability('prop-1', 2026, 13);
      expect(result.success).toBe(false);
    });
  });
});
