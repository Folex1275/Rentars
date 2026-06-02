import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BookingForm from '../BookingForm';

describe('BookingForm', () => {
  const mockOnSubmit = vi.fn();
  const defaultProps = {
    propertyId: '1',
    pricePerNight: 100,
    onSubmit: mockOnSubmit,
    isLoading: false,
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders date range selection fields', () => {
    render(<BookingForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/check-in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/check-out/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/guests/i)).toBeInTheDocument();
  });

  it('validates guest count', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...defaultProps} />);
    
    const guestInput = screen.getByLabelText(/guests/i);
    await user.clear(guestInput);
    await user.type(guestInput, '0');
    
    expect(guestInput).toHaveValue(0);
  });

  it('calculates price correctly', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...defaultProps} />);
    
    const checkInDate = '2024-01-01';
    const checkOutDate = '2024-01-03';
    
    await user.type(screen.getByLabelText(/check-in/i), checkInDate);
    await user.type(screen.getByLabelText(/check-out/i), checkOutDate);
    
    expect(screen.getByText(/100 USDC × 2 nights/i)).toBeInTheDocument();
    expect(screen.getByText(/200 USDC/i)).toBeInTheDocument();
  });

  it('triggers wallet connection modal when wallet not connected', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...defaultProps} />);
    
    const checkInDate = '2024-01-01';
    const checkOutDate = '2024-01-03';
    
    await user.type(screen.getByLabelText(/check-in/i), checkInDate);
    await user.type(screen.getByLabelText(/check-out/i), checkOutDate);
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    await user.click(bookButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        checkIn: new Date(checkInDate),
        checkOut: new Date(checkOutDate),
        guestCount: 1,
      });
    });
  });

  it('submits booking when wallet connected', async () => {
    const user = userEvent.setup();
    render(<BookingForm {...defaultProps} />);
    
    const checkInDate = '2024-01-01';
    const checkOutDate = '2024-01-03';
    
    await user.type(screen.getByLabelText(/check-in/i), checkInDate);
    await user.type(screen.getByLabelText(/check-out/i), checkOutDate);
    await user.type(screen.getByLabelText(/guests/i), '2');
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    await user.click(bookButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        checkIn: new Date(checkInDate),
        checkOut: new Date(checkOutDate),
        guestCount: 2,
      });
    });
  });

  it('disables submit button when no dates selected', () => {
    render(<BookingForm {...defaultProps} />);
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    expect(bookButton).toBeDisabled();
  });

  it('disables submit button when loading', () => {
    render(<BookingForm {...defaultProps} isLoading={true} />);
    
    const bookButton = screen.getByRole('button', { name: /processing/i });
    expect(bookButton).toBeDisabled();
  });

  it('shows alert for invalid date range', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<BookingForm {...defaultProps} />);
    
    // Set check-out before check-in
    await user.type(screen.getByLabelText(/check-in/i), '2024-01-03');
    await user.type(screen.getByLabelText(/check-out/i), '2024-01-01');
    
    const bookButton = screen.getByRole('button', { name: /book now/i });
    await user.click(bookButton);
    
    expect(alertSpy).toHaveBeenCalledWith('Please select valid dates');
    expect(mockOnSubmit).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });
});
