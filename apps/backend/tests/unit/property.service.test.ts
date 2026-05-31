/**
 * Unit tests for property service.
 * Tests CRUD operations and error handling.
 */

import { supabase } from '../../src/config/supabase';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  type Property,
} from '../../src/services/property.service';
import { mockProperties } from '../mocks/supabase.mock.data';

jest.mock('../../src/config/supabase');

describe('Property Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getAllProperties ──────────────────────────────────────────────────────

  describe('getAllProperties', () => {
    it('should return a list of properties', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockProperties,
            error: null,
          }),
        }),
      } as any);

      const result = await getAllProperties();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProperties);
      expect(result.error).toBeUndefined();
    });

    it('should handle database error', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const dbError = { message: 'Database connection failed' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      } as any);

      const result = await getAllProperties();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.data).toBeUndefined();
    });
  });

  // ── getPropertyById ───────────────────────────────────────────────────────

  describe('getPropertyById', () => {
    it('should return a property when found', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const property = mockProperties[0];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: property,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await getPropertyById(property.id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(property);
    });

    it('should return error when property not found', async () => {
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

      const result = await getPropertyById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property not found');
    });

    it('should return error when ID is empty', async () => {
      const result = await getPropertyById('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property ID is required');
    });
  });

  // ── createProperty ────────────────────────────────────────────────────────

  describe('createProperty', () => {
    it('should create a property successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const newProperty: Partial<Property> = {
        title: 'New Property',
        price_per_night: 150,
        city: 'Paris',
      };
      const createdProperty = { id: 'new-id', ...newProperty };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createdProperty,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await createProperty(newProperty);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdProperty);
    });

    it('should return error when title is missing', async () => {
      const result = await createProperty({ price_per_night: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property title is required');
    });

    it('should handle database error during creation', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Unique constraint violation' },
            }),
          }),
        }),
      } as any);

      const result = await createProperty({ title: 'Duplicate' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unique constraint violation');
    });
  });

  // ── updateProperty ────────────────────────────────────────────────────────

  describe('updateProperty', () => {
    it('should update a property successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const propertyId = mockProperties[0].id;
      const updates = { price_per_night: 200 };
      const updatedProperty = { ...mockProperties[0], ...updates };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedProperty,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await updateProperty(propertyId, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProperty);
    });

    it('should return error when ID is missing', async () => {
      const result = await updateProperty('', { price_per_night: 200 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property ID is required');
    });

    it('should return error when no fields provided', async () => {
      const result = await updateProperty('some-id', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No fields provided for update');
    });

    it('should handle database error during update', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Row not found' },
              }),
            }),
          }),
        }),
      } as any);

      const result = await updateProperty('non-existent', { title: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Row not found');
    });
  });

  // ── deleteProperty ────────────────────────────────────────────────────────

  describe('deleteProperty', () => {
    it('should delete a property successfully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      } as any);

      const result = await deleteProperty('property-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should return error when ID is missing', async () => {
      const result = await deleteProperty('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Property ID is required');
    });

    it('should handle database error during deletion', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Row not found' },
          }),
        }),
      } as any);

      const result = await deleteProperty('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Row not found');
    });
  });

  // ── searchProperties ──────────────────────────────────────────────────────

  describe('searchProperties', () => {
    it('should search properties with city filter', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const filtered = mockProperties.filter((p) => p.city === 'New York');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: filtered,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await searchProperties({ city: 'New York' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(filtered);
    });

    it('should search properties with price range', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const filtered = mockProperties.filter(
        (p) => (p.price_per_night ?? 0) >= 100 && (p.price_per_night ?? 0) <= 200
      );

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: filtered,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await searchProperties({ min_price: 100, max_price: 200 });

      expect(result.success).toBe(true);
    });

    it('should handle search error', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Search failed' },
          }),
        }),
      } as any);

      const result = await searchProperties({ city: 'Unknown' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });
});
