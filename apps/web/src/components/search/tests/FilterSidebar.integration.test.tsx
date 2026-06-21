import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterSidebar, { type FilterState } from '../FilterSidebar';

describe('FilterSidebar Integration Tests', () => {
  it('should render all filter sections', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Sort By')).toBeInTheDocument();
    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByText('Guests')).toBeInTheDocument();
    expect(screen.getByText('Property Type')).toBeInTheDocument();
    expect(screen.getByText('Dates')).toBeInTheDocument();
  });

  it('should toggle filter sections', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const priceButton = screen.getByText('Price Range').closest('button')!;
    fireEvent.click(priceButton);

    // Section should collapse
    const inputs = screen.queryAllByRole('slider');
    expect(inputs.length).toBe(0);
  });

  it('should handle price range changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '100' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priceMin: 100,
      }),
    );
  });

  it('should handle sort option changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const priceAscButton = screen.getByLabelText('Price: Low to High').closest('label')!;
    fireEvent.click(priceAscButton.querySelector('input')!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'price_asc',
      }),
    );
  });

  it('should handle amenity selection', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const wifiCheckbox = screen.getByLabelText('WiFi').closest('label')!.querySelector('input')!;
    fireEvent.click(wifiCheckbox);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        amenities: ['WiFi'],
      }),
    );
  });

  it('should handle multiple amenity selection', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const wifiCheckbox = screen.getByLabelText('WiFi').closest('label')!.querySelector('input')!;
    const kitchenCheckbox = screen.getByLabelText('Kitchen').closest('label')!.querySelector('input')!;

    fireEvent.click(wifiCheckbox);
    fireEvent.click(kitchenCheckbox);

    expect(mockOnFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        amenities: ['WiFi', 'Kitchen'],
      }),
    );
  });

  it('should handle guest count changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const guestButton = screen.getByText('4', { selector: 'button' });
    fireEvent.click(guestButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        guests: 4,
      }),
    );
  });

  it('should handle bedroom count changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const bedroomButton = screen.getByText('Bedrooms').closest('button')!;
    fireEvent.click(bedroomButton);

    const bedroomOption = screen.getAllByText('2', { selector: 'button' })[0];
    fireEvent.click(bedroomOption);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        bedrooms: 2,
      }),
    );
  });

  it('should handle property type selection', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const apartmentRadio = screen.getByLabelText('Apartment').closest('label')!.querySelector('input')!;
    fireEvent.click(apartmentRadio);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyType: 'Apartment',
      }),
    );
  });

  it('should handle date range changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const datesButton = screen.getByText('Dates').closest('button')!;
    fireEvent.click(datesButton);

    const dateInputs = screen.getAllByRole('textbox');
    const checkInInput = dateInputs[0];
    fireEvent.change(checkInInput, { target: { value: '2025-07-01' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        checkIn: '2025-07-01',
      }),
    );
  });

  it('should combine multiple filters correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    // Change multiple filters
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '100' } });

    const guestButton = screen.getByText('4', { selector: 'button' });
    fireEvent.click(guestButton);

    const wifiCheckbox = screen.getByLabelText('WiFi').closest('label')!.querySelector('input')!;
    fireEvent.click(wifiCheckbox);

    // Verify final state combines all changes
    expect(mockOnFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        priceMin: 100,
        guests: 4,
        amenities: ['WiFi'],
      }),
    );
  });

  it('should allow clearing selections', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const wifiCheckbox = screen.getByLabelText('WiFi').closest('label')!.querySelector('input')!;
    fireEvent.click(wifiCheckbox);
    fireEvent.click(wifiCheckbox); // Click again to deselect

    expect(mockOnFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        amenities: [],
      }),
    );
  });
});
