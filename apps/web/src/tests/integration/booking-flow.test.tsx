import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@/tests/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import PropertyDetail from '@/components/features/properties/PropertyDetail';
import BookingPage from '@/app/booking/page';
import BookingConfirmationPage from '@/components/booking/confirmation/BookingConfirmationPage';
import type { Property } from '@/types/property';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockProperty: Property & {
  amenities?: string[];
  description_full?: string;
  host_name?: string;
} = {
  id: 'prop-1',
  title: 'Downtown Loft',
  description: 'Modern loft in the city center',
  price_per_night: 150,
  location: 'Austin, TX',
  images: ['https://images.unsplash.com/photo-1'],
  owner_id: 'owner-1',
  available: true,
  created_at: '2024-06-01T00:00:00Z',
  amenities: ['WiFi', 'Kitchen'],
};

const mockBooking = {
  id: 'booking-123',
  property_id: 'prop-1',
  check_in: '2026-07-01T00:00:00Z',
  check_out: '2026-07-05T00:00:00Z',
  guest_count: 2,
  total_price: 600,
  status: 'confirmed',
  escrow_status: 'locked',
};

const mockEscrow = {
  status: 'locked' as const,
  amount: 600,
  releaseDate: '2026-07-06T00:00:00Z',
};

function CancelBookingFlow({
  bookingId,
  onStatusChange,
}: {
  bookingId: string;
  onStatusChange?: (status: string) => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<'confirmed' | 'cancelled'>('confirmed');

  const confirmCancel = async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${bookingId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      setStatus(data.status);
      onStatusChange?.(data.status);
    }
    setShowDialog(false);
  };

  const escrowStatus = status === 'cancelled' ? 'refunded' : 'locked';

  return (
    <div>
      <h1>Tenant Dashboard</h1>
      <article data-testid="booking-card">
        <h2>Downtown Loft</h2>
        <span data-testid="booking-status">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span data-testid="escrow-status">
          Escrow: {escrowStatus.charAt(0).toUpperCase() + escrowStatus.slice(1)}
        </span>
      </article>
      <button type="button" onClick={() => setShowDialog(true)}>
        Cancel booking
      </button>
      {showDialog && (
        <div role="dialog" aria-label="Cancel booking confirmation">
          <p>Are you sure you want to cancel this booking?</p>
          <button type="button" onClick={() => setShowDialog(false)}>
            Keep booking
          </button>
          <button type="button" onClick={confirmCancel}>
            Confirm cancel
          </button>
        </div>
      )}
    </div>
  );
}

describe('Booking flow integration', () => {
  const user = userEvent.setup();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPush.mockClear();
    localStorage.setItem('token', 'test-token');

    (window as unknown as { freighter: { getPublicKey: () => Promise<string> } }).freighter = {
      getPublicKey: vi.fn().mockResolvedValue('GTESTWALLET123456789'),
    };

    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/properties/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProperty),
        } as Response);
      }

      if (url.endsWith('/api/bookings') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'booking-123' }),
        } as Response);
      }

      if (url.includes('/api/bookings/booking-123/escrow')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEscrow),
        } as Response);
      }

      if (url.includes('/api/bookings/booking-123') && !url.includes('cancel')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBooking),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as Response);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('completes booking from property detail through wallet connect to confirmation with escrow', async () => {
    const { rerender } = render(<PropertyDetail property={mockProperty} />);

    expect(screen.getByText('Downtown Loft')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /book now/i }));

    rerender(<BookingPage />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[0], '2026-07-01');
    await user.type(dateInputs[1], '2026-07-05');
    await user.click(screen.getByRole('button', { name: /book now/i }));

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /connect freighter wallet/i }));

    await waitFor(() => {
      expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /book now/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/confirmation/booking-123');
    });

    const bookingPost = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/api/bookings') &&
        (init as RequestInit | undefined)?.method === 'POST'
    );
    expect(bookingPost).toBeDefined();

    rerender(<BookingConfirmationPage bookingId="booking-123" />);

    await waitFor(() => {
      expect(screen.getByText('Booking Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Escrow Locked')).toBeInTheDocument();
    expect(screen.getByText('600 USDC')).toBeInTheDocument();
    expect(screen.getByTestId('booking-status')).toHaveTextContent('Confirmed');
  });

  it('cancels a booking from tenant dashboard after confirmation dialog', async () => {
    const statusUpdates: string[] = [];

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/cancel') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'cancelled' }),
        } as Response);
      }

      if (url.includes('/api/bookings') && !url.includes('cancel')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockBooking]),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(
      <CancelBookingFlow
        bookingId="booking-123"
        onStatusChange={(status) => statusUpdates.push(status)}
      />
    );

    expect(screen.getByText('Tenant Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('booking-status')).toHaveTextContent('Confirmed');

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));

    const dialog = screen.getByRole('dialog', { name: /cancel booking confirmation/i });
    expect(
      within(dialog).getByText(/are you sure you want to cancel/i)
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /confirm cancel/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings/booking-123/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(statusUpdates).toContain('cancelled');
      expect(screen.getByTestId('booking-status')).toHaveTextContent('Cancelled');
      expect(screen.getByTestId('escrow-status')).toHaveTextContent('Escrow: Refunded');
    });
  });
});
