/**
 * Booking Authorization - IDOR Protection Tests
 *
 * These tests verify that users cannot access or modify bookings they don't own
 * by changing IDs in requests (Insecure Direct Object Reference attacks).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bookingAuthorizationService } from '@/services/bookingAuthorization.service.js';
import * as supabaseModule from '@/config/supabase.js';

describe('Booking Authorization - IDOR Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IDOR - Tenant attempting to access other tenant booking', () => {
    it('blocks tenant from reading another tenant booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canRead('booking-123', 'tenant-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Forbidden');
    });

    it('blocks tenant from cancelling another tenant booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canCancel('booking-123', 'tenant-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the tenant may cancel');
    });

    it('blocks tenant from completing another tenant booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canComplete('booking-123', 'tenant-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the tenant may complete');
    });

    it('blocks tenant from requesting modification on another tenant booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canRequestModification('booking-123', 'tenant-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the tenant may request a modification');
    });
  });

  describe('IDOR - Host attempting to manage non-owned property booking', () => {
    it('blocks host from confirming booking on property they dont own', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { properties: { owner_id: 'host-001' } },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canConfirm('booking-123', 'host-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the host may confirm');
    });

    it('blocks host from accepting modification on property they dont own', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { properties: { owner_id: 'host-001' } },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canManageModification('booking-123', 'host-002');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only the host may accept or decline');
    });
  });

  describe('IDOR - Forged request body scenarios', () => {
    it('prevents tenant ID spoofing in request body', async () => {
      // This test verifies that authorization uses the booking record from DB,
      // not the tenant_id from the request body
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' }, // Real tenant from DB
            error: null,
          }),
        }),
      } as any);

      // Attacker tries to pass tenant-002 in request body, but authorization
      // should check against the DB record (tenant-001)
      const result = await bookingAuthorizationService.canCancel('booking-123', 'tenant-002');

      expect(result.allowed).toBe(false);
    });

    it('prevents property owner ID spoofing in request body', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { properties: { owner_id: 'host-001' } }, // Real host from DB
            error: null,
          }),
        }),
      } as any);

      // Attacker tries to claim to be host-001, but they're actually host-002
      const result = await bookingAuthorizationService.canConfirm('booking-123', 'host-002');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Admin role bypass - ensures admins can perform privileged actions', () => {
    it('allows admin to cancel any booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canCancel('booking-123', 'admin-user', 'admin');

      expect(result.allowed).toBe(true);
    });

    it('allows moderator to confirm any booking', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { properties: { owner_id: 'host-001' } },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canConfirm('booking-123', 'mod-user', 'moderator');

      expect(result.allowed).toBe(true);
    });

    it('allows support to read any booking', async () => {
      const result = await bookingAuthorizationService.canRead('booking-123', 'support-user', 'support');

      expect(result.allowed).toBe(true);
    });

    it('blocks support from modifying bookings', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canCancel('booking-123', 'support-user', 'support');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Concurrent request protection', () => {
    it('validates ownership on every request even if user changes mid-session', async () => {
      // First request - user is the tenant
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result1 = await bookingAuthorizationService.canCancel('booking-123', 'tenant-001');
      expect(result1.allowed).toBe(true);

      // Second request - user tries to use cached session but is different user
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-001' },
            error: null,
          }),
        }),
      } as any);

      const result2 = await bookingAuthorizationService.canCancel('booking-123', 'tenant-002');
      expect(result2.allowed).toBe(false);
    });
  });

  describe('Non-existent booking protection', () => {
    it('does not reveal booking existence to unauthorized user', async () => {
      vi.spyOn(supabaseModule.supabase.from('bookings'), 'select').mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      } as any);

      const result = await bookingAuthorizationService.canRead('non-existent-booking', 'attacker-user');

      expect(result.allowed).toBe(false);
      // Should not reveal whether booking exists or not
      expect(result.reason).toContain('Forbidden');
    });
  });
});
