/**
 * Fixture data for properties, bookings, and users.
 */

export const mockProperties = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    owner_id: 'user-1',
    title: 'Cozy Apartment in Downtown',
    description: 'A beautiful apartment with a view',
    price_per_night: 100,
    status: 'active',
    city: 'New York',
    country: 'USA',
    address: '123 Main St',
    bedrooms: 2,
    bathrooms: 1,
    max_guests: 4,
    amenities: ['wifi', 'kitchen', 'parking'],
    images: ['image1.jpg'],
    on_chain_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    owner_id: 'user-2',
    title: 'Beach House',
    description: 'Beachfront property',
    price_per_night: 250,
    status: 'active',
    city: 'Miami',
    country: 'USA',
    address: '456 Beach Ave',
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    amenities: ['pool', 'beach_access'],
    images: ['beach1.jpg'],
    on_chain_id: 2,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

export const mockBookings = [
  {
    id: '660e8400-e29b-41d4-a716-446655440000',
    property_id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: 'user-3',
    check_in: '2026-06-01',
    check_out: '2026-06-05',
    total_price: 400,
    status: 'Confirmed',
    escrow_id: 'escrow-1',
    on_chain_id: 1,
    created_at: '2026-05-20T00:00:00Z',
    updated_at: '2026-05-20T00:00:00Z',
  },
];

export const mockUsers = [
  {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'John Owner',
    stellar_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4CGQOFSNHERX3LRJCX5FWCL46664F3',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'tenant@example.com',
    name: 'Jane Tenant',
    stellar_address: 'GBBD47UZQ2EOPZMQAAMAEWBVHQWWPGVIOTQOI5DQWUB3DJWQX5DVXCA',
    created_at: '2026-01-02T00:00:00Z',
  },
];
