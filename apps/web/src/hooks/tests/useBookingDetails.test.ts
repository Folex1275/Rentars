import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useBookingDetails } from '../useBookingDetails';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useBookingDetails', () => {
  const mockBooking = {
    id: '1',
    propertyId: '1',
    checkIn: '2024-01-01',
    checkOut: '2024-01-03',
    guestCount: 2,
    totalPrice: 200,
    status: 'confirmed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  it('fetches booking data successfully', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBooking),
    });

    const { result } = renderHook(() => useBookingDetails('1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.booking).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.booking).toEqual(mockBooking);
      expect(result.current.error).toBeNull();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/bookings/1',
      {
        headers: { Authorization: 'Bearer mock-token' },
      }
    );
  });

  it('handles fetch error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBookingDetails('1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.booking).toBeNull();
      expect(result.current.error).toBe('Failed to load booking');
    });
  });

  it('handles API error response', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useBookingDetails('1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.booking).toBeNull();
      expect(result.current.error).toBe('Failed to load booking');
    });
  });

  it('does not fetch when bookingId is empty', () => {
    const { result } = renderHook(() => useBookingDetails(''));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.booking).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refetches when bookingId changes', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBooking),
    });

    const { result, rerender } = renderHook(
      ({ bookingId }) => useBookingDetails(bookingId),
      { initialProps: { bookingId: '1' } }
    );

    await waitFor(() => {
      expect(result.current.booking).toEqual(mockBooking);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Change bookingId
    rerender({ bookingId: '2' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:3000/api/bookings/2',
        {
          headers: { Authorization: 'Bearer mock-token' },
        }
      );
    });
  });

  it('uses correct API URL from environment', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockBooking),
    });

    renderHook(() => useBookingDetails('1'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/bookings/1',
        expect.any(Object)
      );
    });
  });
});
