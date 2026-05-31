import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import PropertyCard from '../PropertyCard';
import type { Property } from '@/types/property';

const mockProperty: Property = {
  id: '1',
  title: 'Beautiful Beach House',
  description: 'A lovely beach house',
  price_per_night: 100,
  location: 'Malibu, CA',
  images: ['https://example.com/image.jpg'],
  owner_id: 'owner-1',
  available: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockPropertyNoImage: Property = {
  ...mockProperty,
  images: [],
};

const mockPropertyUnavailable: Property = {
  ...mockProperty,
  available: false,
};

describe('PropertyCard', () => {
  it('renders property title', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Beautiful Beach House')).toBeInTheDocument();
  });

  it('renders property location', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Malibu, CA')).toBeInTheDocument();
  });

  it('renders property price per night', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(/100 USDC/)).toBeInTheDocument();
  });

  it('shows "Available" badge when property is available', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('shows "Booked" badge when property is unavailable', () => {
    render(<PropertyCard property={mockPropertyUnavailable} />);
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('handles missing image gracefully', () => {
    render(<PropertyCard property={mockPropertyNoImage} />);
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders image when available', () => {
    render(<PropertyCard property={mockProperty} />);
    const img = screen.getByAltText('Beautiful Beach House') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://example.com/image.jpg');
  });

  it('applies correct styling for available property', () => {
    const { container } = render(<PropertyCard property={mockProperty} />);
    const badge = screen.getByText('Available');
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('applies correct styling for unavailable property', () => {
    render(<PropertyCard property={mockPropertyUnavailable} />);
    const badge = screen.getByText('Booked');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-500');
  });
});
