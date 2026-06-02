import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/utils/test-utils';
import FilterSidebar, { type FilterState } from '../FilterSidebar';

describe('FilterSidebar', () => {
  it('renders all filter options', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Price Range')).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByText('Guests')).toBeInTheDocument();
    expect(screen.getByText('Property Type')).toBeInTheDocument();
  });

  it('price range slider updates correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const minSliders = screen.getAllByRole('slider');
    fireEvent.change(minSliders[0], { target: { value: '200' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priceMin: 200,
      })
    );
  });

  it('amenity checkboxes toggle correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const wifiCheckbox = screen.getByRole('checkbox', { name: /WiFi/i });
    fireEvent.click(wifiCheckbox);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        amenities: ['WiFi'],
      })
    );

    fireEvent.click(wifiCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        amenities: [],
      })
    );
  });

  it('multiple amenities can be selected', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const wifiCheckbox = screen.getByRole('checkbox', { name: /WiFi/i });
    const kitchenCheckbox = screen.getByRole('checkbox', { name: /Kitchen/i });

    fireEvent.click(wifiCheckbox);
    fireEvent.click(kitchenCheckbox);

    expect(mockOnFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        amenities: expect.arrayContaining(['WiFi', 'Kitchen']),
      })
    );
  });

  it('guests selection updates correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const guestButtons = screen.getAllByRole('button');
    const guestButton4 = guestButtons.find((btn) => btn.textContent === '4');

    fireEvent.click(guestButton4!);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        guests: 4,
      })
    );
  });

  it('property type radio buttons work correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const apartmentRadio = screen.getByRole('radio', { name: /Apartment/i });
    fireEvent.click(apartmentRadio);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyType: 'Apartment',
      })
    );
  });

  it('sections can be collapsed and expanded', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const priceButton = screen.getByRole('button', { name: /Price Range/i });
    
    // Initially price section is expanded, so we should see 2 sliders
    let sliders = screen.queryAllByRole('slider');
    expect(sliders.length).toBe(2);

    // Collapse price section
    fireEvent.click(priceButton);
    sliders = screen.queryAllByRole('slider');
    expect(sliders.length).toBe(0);

    // Expand price section again
    fireEvent.click(priceButton);
    sliders = screen.queryAllByRole('slider');
    expect(sliders.length).toBe(2);
  });

  it('initial state has correct default values', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText(/Min: \$0/)).toBeInTheDocument();
    expect(screen.getByText(/Max: \$1000/)).toBeInTheDocument();
  });

  it('max price slider updates correctly', () => {
    const mockOnFilterChange = vi.fn();
    render(<FilterSidebar onFilterChange={mockOnFilterChange} />);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[1], { target: { value: '500' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priceMax: 500,
      })
    );
  });
});
