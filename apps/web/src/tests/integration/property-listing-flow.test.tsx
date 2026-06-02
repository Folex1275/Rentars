import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ListingForm from '@/components/properties/ListingForm';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Freighter on window
const mockSignTransaction = vi.fn().mockResolvedValue({ signedXDR: 'signed' });
Object.defineProperty(window, 'freighter', {
  value: { signTransaction: mockSignTransaction },
  writable: true,
});

// Mock window.location
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('publicKey', 'GTEST123');
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'prop-1', xdr: 'test-xdr' }),
  });
});

const fillInput = (label: RegExp | string, value: string) => {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
};

const clickNext = () => fireEvent.click(screen.getByText('Next'));
const clickPrev = () => fireEvent.click(screen.getByText('Previous'));

describe('Property listing flow integration', () => {
  it('completes full multi-step form and submits with correct payload', async () => {
    render(<ListingForm />);

    // Step 1: Basic Info
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    fillInput(/title/i, 'Beach House');
    fillInput(/description/i, 'A lovely beach house');
    clickNext();

    // Step 2: Location
    await waitFor(() => expect(screen.getByText('Location')).toBeInTheDocument());
    fillInput(/address/i, '123 Ocean Ave');
    fillInput(/city/i, 'Miami');
    fillInput(/country/i, 'USA');
    clickNext();

    // Step 3: Amenities
    await waitFor(() => expect(screen.getByText('Amenities')).toBeInTheDocument());
    clickNext();

    // Step 4: Photos (mocked — no real file upload)
    await waitFor(() => expect(screen.getByText('Photos')).toBeInTheDocument());
    clickNext();

    // Step 5: Pricing
    await waitFor(() => expect(screen.getByText('Pricing')).toBeInTheDocument());
    fillInput(/price per night/i, '150');
    clickNext();

    // Step 6: Review & Submit
    await waitFor(() => expect(screen.getByText('Review')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Submit Listing'));

    // Verify API call
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/properties'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    ));

    // Verify Freighter signing triggered
    await waitFor(() => expect(mockSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ xdr: 'test-xdr' })
    ));

    // Verify redirect to dashboard
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
  });

  it('shows error message when API call fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    render(<ListingForm />);

    // Navigate to review step
    for (let i = 0; i < 5; i++) clickNext();

    await waitFor(() => screen.getByText('Submit Listing'));
    fireEvent.click(screen.getByText('Submit Listing'));

    await waitFor(() => expect(screen.getByText('Failed to create listing')).toBeInTheDocument());
  });
});
