import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import PropertyGrid from '../PropertyGrid';
import type { Property } from '@/types/property';

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Beach House',
    description: 'A lovely beach house',
    price_per_night: 100,
    location: 'Malibu, CA',
    images: ['https://example.com/image1.jpg'],
    owner_id: 'owner-1',
    available: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Mountain Cabin',
    description: 'A cozy mountain cabin',
    price_per_night: 80,
    location: 'Aspen, CO',
    images: ['https://example.com/image2.jpg'],
    owner_id: 'owner-2',
    available: true,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    title: 'City Apartment',
    description: 'A modern city apartment',
    price_per_night: 150,
    location: 'New York, NY',
    images: ['https://example.com/image3.jpg'],
    owner_id: 'owner-3',
    available: false,
    created_at: '2024-01-03T00:00:00Z',
  },
];

describe('PropertyGrid', () => {
  it('renders list of property cards', () => {
    render(<PropertyGrid properties={mockProperties} />);
    expect(screen.getByText('Beach House')).toBeInTheDocument();
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument();
    expect(screen.getByText('City Apartment')).toBeInTheDocument();
  });

  it('shows empty state when no properties', () => {
    render(<PropertyGrid properties={[]} />);
    expect(screen.getByText('No properties found. Be the first to list one!')).toBeInTheDocument();
  });

  it('renders correct number of cards', () => {
    const { container } = render(<PropertyGrid properties={mockProperties} />);
    const cards = container.querySelectorAll('.rounded-xl');
    expect(cards.length).toBe(3);
  });

  it('applies grid layout classes', () => {
    const { container } = render(<PropertyGrid properties={mockProperties} />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
  });

  it('renders all property information correctly', () => {
    render(<PropertyGrid properties={mockProperties} />);
    
    // Check first property
    expect(screen.getByText('Beach House')).toBeInTheDocument();
    expect(screen.getByText('Malibu, CA')).toBeInTheDocument();
    expect(screen.getByText(/100 USDC/)).toBeInTheDocument();
    
    // Check second property
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument();
    expect(screen.getByText('Aspen, CO')).toBeInTheDocument();
    expect(screen.getByText(/80 USDC/)).toBeInTheDocument();
    
    // Check third property
    expect(screen.getByText('City Apartment')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText(/150 USDC/)).toBeInTheDocument();
  });

  it('shows availability status for each property', () => {
    render(<PropertyGrid properties={mockProperties} />);
    const availableBadges = screen.getAllByText('Available');
    const bookedBadges = screen.getAllByText('Booked');
    
    expect(availableBadges).toHaveLength(2);
    expect(bookedBadges).toHaveLength(1);
  });

  it('handles single property', () => {
    render(<PropertyGrid properties={[mockProperties[0]]} />);
    expect(screen.getByText('Beach House')).toBeInTheDocument();
    expect(screen.queryByText('Mountain Cabin')).not.toBeInTheDocument();
  });
});
