/**
 * Unit tests for booking service.
 * Tests the full escrow flow, error cases, and edge cases.
 */

import { supabase } from '../../src/config/supabase';
import {
  BookingService,
  type Booking,
  type BlockchainServices,
  type CreateBookingInput,
} from '../../src/services/booking.service';
import { mockBookings, mockProperties, mockUsers } from '../mocks/supabase.mock.data';

jest.mock('../../src/config/supabase');
jest.mock('../../src/blockchain/trustlessWork');

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockBlockchain: jest.Mocked<BlockchainServices>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBlockchain = {
      checkAvailability: jest.fn().mockResolvedValue(true),
      createBookingOnChain: jest.fn().mockResolvedValue(BigInt(1)),
      cancelBookingOnChain: jest.fn().mockResolvedValue(undefined),
      updateBookingStatusOnChain: jest.fn().mockResolvedValue(undefined),
    };

    bookingService = new BookingService(mockBlockchain);
  });

  // ── getBookingById ────────────────────────────────────────────────────────

  describe('getBookingById', () => {
    it('should return a booking when found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const booking = mockBookings[0];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: booking,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.getBookingById(booking.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(booking);
    });

    it('should return error when booking not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' },
            }),
          }),
        }),
      } as any);

      const result = await bookingService.getBookingById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });

    it('should return error when ID is empty', async () => {
      const result = await bookingService.getBookingById('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking ID is required');
    });
  });

  // ── createBooking ─────────────────────────────────────────────────────────

  describe('createBooking', () => {
    const validInput: CreateBookingInput = {
      property_id: mockProperties[0].id,
      tenant_id: mockUsers[1].id,
      check_in: '2026-06-10',
      check_out: '2026-06-15',
      total_price: 500,
      on_chain_property_id: BigInt(1),
    };

    it('should create a booking with escrow successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const createdBooking: Booking = {
        id: 'new-booking-id',
        ...validInput,
        status: 'Pending',
        escrow_id: 'escrow-123',
      };

      // Mock property fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperties[0],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock profile fetches for stellar addresses
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: mockUsers[0].stellar_address },
              error: null,
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: mockUsers[1].stellar_address },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock booking insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdBooking,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('Pending');
    });

    it('should return error when property not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      } as any);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property not found');
    });

    it('should return error when seller wallet not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      // Mock property fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperties[0],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock profile fetch - no stellar address
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: null },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Property owner does not have a valid Stellar address');
    });

    it('should return error when buyer wallet not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      // Mock property fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperties[0],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock owner profile fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: mockUsers[0].stellar_address },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock buyer profile fetch - no stellar address
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: null },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tenant does not have a valid Stellar address');
    });

    it('should return error for invalid Stellar address', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      // Mock property fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperties[0],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock owner profile fetch with invalid address
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: 'invalid-address' },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Property owner does not have a valid Stellar address');
    });

    it('should return error for availability conflict', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      // Mock property fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperties[0],
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock profile fetches
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: mockUsers[0].stellar_address },
              error: null,
            }),
          }),
        }),
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { stellar_address: mockUsers[1].stellar_address },
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock blockchain availability check - not available
      mockBlockchain.checkAvailability.mockResolvedValueOnce(false);

      const result = await bookingService.createBooking(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return error when missing required fields', async () => {
      const incompleteInput = { property_id: 'prop-1' } as CreateBookingInput;

      const result = await bookingService.createBooking(incompleteInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return error for invalid date range', async () => {
      const invalidInput: CreateBookingInput = {
        property_id: mockProperties[0].id,
        tenant_id: mockUsers[1].id,
        check_in: '2026-06-15',
        check_out: '2026-06-10', // check_out before check_in
        total_price: 500,
      };

      const result = await bookingService.createBooking(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('check_in must be before check_out');
    });
  });

  // ── cancelBooking ─────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('should cancel a booking successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const booking = mockBookings[0];

      // Mock booking fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: booking,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock booking update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...booking, status: 'Cancelled' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await bookingService.cancelBooking(booking.id, mockUsers[0].id);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('Cancelled');
    });

    it('should return error when booking not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      } as any);

      const result = await bookingService.cancelBooking('non-existent', mockUsers[0].id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });

    it('should return error when booking already cancelled', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const cancelledBooking = { ...mockBookings[0], status: 'Cancelled' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: cancelledBooking,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.cancelBooking(cancelledBooking.id, mockUsers[0].id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already cancelled');
    });
  });

  // ── confirmBooking ────────────────────────────────────────────────────────

  describe('confirmBooking', () => {
    it('should confirm a booking successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const booking = mockBookings[0];

      // Mock booking fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: booking,
              error: null,
            }),
          }),
        }),
      } as any);

      // Mock booking update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...booking, status: 'Confirmed' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await bookingService.confirmBooking(booking.id, mockUsers[0].id);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('Confirmed');
    });

    it('should return error when booking not found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      } as any);

      const result = await bookingService.confirmBooking('non-existent', mockUsers[0].id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });

    it('should return error when booking already confirmed', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const confirmedBooking = { ...mockBookings[0], status: 'Confirmed' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: confirmedBooking,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.confirmBooking(confirmedBooking.id, mockUsers[0].id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already confirmed');
    });

    it('should return error when trying to confirm cancelled booking', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const cancelledBooking = { ...mockBookings[0], status: 'Cancelled' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: cancelledBooking,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await bookingService.confirmBooking(cancelledBooking.id, mockUsers[0].id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot confirm a cancelled booking');
    });
  });
});
