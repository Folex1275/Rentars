// Example test cases for advanced property search

import { describe, it, expect, beforeAll } from 'bun:test';
import { advancedSearch, type AdvancedSearchFilters } from '@/services/property.service.js';
import { trackSearch, getSearchSuggestions, getTrendingSearches } from '@/services/searchAnalytics.service.js';

describe('Advanced Property Search', () => {
  const baseFilters: AdvancedSearchFilters = {
    query: '',
    page: 1,
    limit: 20,
  };

  describe('Full-text search', () => {
    it('should find properties by query', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        query: 'beach house',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return empty array for non-matching query', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        query: 'xyzabc123nonexistent',
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });
  });

  describe('Price filtering', () => {
    it('should filter by price range', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        min_price: 100,
        max_price: 300,
      });

      expect(result.success).toBe(true);
      result.data?.forEach((p) => {
        if (p.price_per_night) {
          expect(p.price_per_night).toBeGreaterThanOrEqual(100);
          expect(p.price_per_night).toBeLessThanOrEqual(300);
        }
      });
    });

    it('should handle only min_price filter', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        min_price: 200,
      });

      expect(result.success).toBe(true);
      result.data?.forEach((p) => {
        if (p.price_per_night) {
          expect(p.price_per_night).toBeGreaterThanOrEqual(200);
        }
      });
    });

    it('should handle only max_price filter', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        max_price: 150,
      });

      expect(result.success).toBe(true);
      result.data?.forEach((p) => {
        if (p.price_per_night) {
          expect(p.price_per_night).toBeLessThanOrEqual(150);
        }
      });
    });
  });

  describe('Location filtering', () => {
    it('should filter by city', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        city: 'New York',
      });

      expect(result.success).toBe(true);
    });

    it('should filter by country', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        country: 'USA',
      });

      expect(result.success).toBe(true);
    });

    it('should filter by city and country combined', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        city: 'New York',
        country: 'USA',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Capacity filtering', () => {
    it('should filter by guest count', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        guests: 4,
      });

      expect(result.success).toBe(true);
    });

    it('should filter by bedroom count', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        bedrooms: 2,
      });

      expect(result.success).toBe(true);
    });

    it('should filter by guests and bedrooms', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        guests: 6,
        bedrooms: 3,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Amenity filtering', () => {
    it('should filter by single amenity', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        amenities: ['WiFi'],
      });

      expect(result.success).toBe(true);
    });

    it('should filter by multiple amenities', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        amenities: ['WiFi', 'Kitchen', 'Parking'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Sorting', () => {
    it('should sort by price ascending', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        sortBy: 'price_asc',
      });

      expect(result.success).toBe(true);
      for (let i = 1; i < result.data!.length; i++) {
        const prev = result.data![i - 1].price_per_night ?? 0;
        const curr = result.data![i].price_per_night ?? 0;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should sort by newest', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        sortBy: 'newest',
      });

      expect(result.success).toBe(true);
    });

    it('should sort by distance if geolocation provided', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        latitude: 40.7128,
        longitude: -74.006,
        radius_km: 50,
        sortBy: 'distance',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Pagination', () => {
    it('should respect page parameter', async () => {
      const result1 = await advancedSearch({
        ...baseFilters,
        page: 1,
        limit: 10,
      });

      const result2 = await advancedSearch({
        ...baseFilters,
        page: 2,
        limit: 10,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should enforce maximum limit of 100', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        limit: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Complex filters', () => {
    it('should combine multiple filters', async () => {
      const result = await advancedSearch({
        ...baseFilters,
        query: 'apartment',
        city: 'New York',
        min_price: 150,
        max_price: 400,
        guests: 2,
        bedrooms: 1,
        amenities: ['WiFi', 'Kitchen'],
        sortBy: 'price_asc',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Search Analytics', () => {
    it('should track a search', async () => {
      const result = await trackSearch('beach house', 10, undefined, {});

      expect(result.success).toBe(true);
      expect(result.data?.query).toBe('beach house');
      expect(result.data?.result_count).toBe(10);
    });

    it('should get search suggestions', async () => {
      await trackSearch('new york apartment', 45);
      await trackSearch('new jersey house', 23);

      const result = await getSearchSuggestions('new', 5);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should require minimum 2 character prefix for suggestions', async () => {
      const result = await getSearchSuggestions('a', 5);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });

    it('should get trending searches', async () => {
      const result = await getTrendingSearches(10);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
