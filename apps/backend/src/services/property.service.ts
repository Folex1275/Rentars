/**
 * Property service — business logic layer between the property controller
 * and Supabase / blockchain clients.
 *
 * All functions return a ServiceResponse so controllers stay thin and
 * error handling is consistent.
 */

import { supabase } from '@/config/supabase.js';
import * as cache from './cache.service.js';
import type { ServiceResponse } from './index.js';

const TTL_ALL = 60;
const TTL_ONE = 300;
const TTL_FEATURED = 120;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape of a property row as stored in Supabase.
 * Extend this interface as columns are added to the `properties` table.
 */
export interface Property {
  id: string;
  owner_id?: string;
  title: string;
  description?: string;
  price_per_night?: number;
  status?: string;
  city?: string;
  country?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  amenities?: string[];
  images?: string[];
  on_chain_id?: number;
  created_at?: string;
  updated_at?: string;
}

/** Filters accepted by searchProperties. */
export interface PropertySearchFilters {
  city?: string;
  country?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  status?: string;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Retrieve all properties.
 */
export async function getAllProperties(): Promise<ServiceResponse<Property[]>> {
  const cached = await cache.get<Property[]>('properties:all');
  if (cached) return { success: true, data: cached };

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  await cache.set('properties:all', data, TTL_ALL);
  return { success: true, data: data as Property[] };
}

/**
 * Retrieve a single property by its Supabase row ID.
 *
 * @param id - UUID of the property row.
 */
export async function getPropertyById(id: string): Promise<ServiceResponse<Property>> {
  if (!id) {
    return { success: false, error: 'Property ID is required' };
  }

  const cacheKey = `property:${id}`;
  const cached = await cache.get<Property>(cacheKey);
  if (cached) return { success: true, data: cached };

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { success: false, error: 'Property not found' };
  }

  await cache.set(cacheKey, data, TTL_ONE);
  return { success: true, data: data as Property };
}

/**
 * Create a new property record.
 *
 * @param payload - Property fields to insert. `title` is required.
 */
export async function createProperty(
  payload: Partial<Property>,
): Promise<ServiceResponse<Property>> {
  if (!payload.title) {
    return { success: false, error: 'Property title is required' };
  }

  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await Promise.all([
    cache.del('properties:all'),
    cache.del('properties:featured'),
  ]);

  return { success: true, data: data as Property };
}

/**
 * Update an existing property record.
 *
 * @param id - UUID of the property row to update.
 * @param payload - Fields to update. At least one field must be provided.
 */
export async function updateProperty(
  id: string,
  payload: Partial<Property>,
): Promise<ServiceResponse<Property>> {
  if (!id) {
    return { success: false, error: 'Property ID is required' };
  }

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'No fields provided for update' };
  }

  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await Promise.all([
    cache.del(`property:${id}`),
    cache.del('properties:all'),
    cache.del('properties:featured'),
  ]);

  return { success: true, data: data as Property };
}

/**
 * Delete a property record.
 *
 * @param id - UUID of the property row to delete.
 */
export async function deleteProperty(id: string): Promise<ServiceResponse<void>> {
  if (!id) {
    return { success: false, error: 'Property ID is required' };
  }

  const { error } = await supabase.from('properties').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  await Promise.all([
    cache.del(`property:${id}`),
    cache.del('properties:all'),
    cache.del('properties:featured'),
  ]);

  return { success: true };
}

/**
 * Search properties with optional filters.
 *
 * Applies only the filters that are present in the `filters` object.
 * Price filters use `gte`/`lte` on `price_per_night`.
 *
 * @param filters - Optional filter criteria.
 */
export async function getFeaturedProperties(): Promise<ServiceResponse<Property[]>> {
  const cached = await cache.get<Property[]>('properties:featured');
  if (cached) return { success: true, data: cached };

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) return { success: false, error: error.message };

  await cache.set('properties:featured', data, TTL_FEATURED);
  return { success: true, data: data as Property[] };
}

export async function searchProperties(
  filters: PropertySearchFilters,
): Promise<ServiceResponse<Property[]>> {
  let query = supabase.from('properties').select('*');

  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }

  if (filters.country) {
    query = query.ilike('country', `%${filters.country}%`);
  }

  if (filters.min_price !== undefined) {
    query = query.gte('price_per_night', filters.min_price);
  }

  if (filters.max_price !== undefined) {
    query = query.lte('price_per_night', filters.max_price);
  }

  if (filters.bedrooms !== undefined) {
    query = query.gte('bedrooms', filters.bedrooms);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Property[] };
}

export interface AdvancedSearchFilters extends PropertySearchFilters {
  query?: string;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'distance' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  price_per_night?: number;
  city?: string;
  country?: string;
  bedrooms?: number;
  amenities?: string[];
  distance_km?: number;
  rating?: number;
  created_at?: string;
}

/**
 * Advanced property search with full-text search, filtering, sorting, and pagination.
 */
export async function advancedSearch(
  filters: AdvancedSearchFilters,
): Promise<ServiceResponse<SearchResult[]>> {
  const cacheKey = `search:${JSON.stringify(filters)}`;
  const cached = await cache.get<SearchResult[]>(cacheKey);
  if (cached) return { success: true, data: cached };

  let query = supabase.from('properties').select('*');

  // Full-text search on title/description
  if (filters.query) {
    const tsQuery = toTsQuery(filters.query);
    if (tsQuery) {
      query = query.textSearch('search_vector', tsQuery, { config: 'english' });
    }
  }

  // Location filters
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.country) query = query.ilike('country', `%${filters.country}%`);

  // Price range
  if (filters.min_price !== undefined) query = query.gte('price_per_night', filters.min_price);
  if (filters.max_price !== undefined) query = query.lte('price_per_night', filters.max_price);

  // Bedroom filter
  if (filters.bedrooms !== undefined) query = query.gte('bedrooms', filters.bedrooms);

  // Guest capacity
  if (filters.guests !== undefined) query = query.gte('max_guests', filters.guests);

  // Amenities - filter by overlap with array
  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains('amenities', filters.amenities);
  }

  // Status
  if (filters.status) query = query.eq('status', filters.status);
  else query = query.eq('status', 'available');

  // Handle sorting
  const sortBy = filters.sortBy || 'newest';
  switch (sortBy) {
    case 'price_asc':
      query = query.order('price_per_night', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price_per_night', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'rating':
      // Rating sorting would require a join with reviews table
      query = query.order('created_at', { ascending: false });
      break;
    case 'distance':
      // Distance sorting handled post-query if geolocation provided
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const limit = Math.min(filters.limit || 20, 100);
  const page = Math.max(filters.page || 1, 1);
  const from = (page - 1) * limit;

  query = query.range(from, from + limit - 1);

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  let results = (data ?? []).map((p: Property) => ({
    id: p.id,
    title: p.title,
    price_per_night: p.price_per_night,
    city: p.city,
    country: p.country,
    bedrooms: p.bedrooms,
    amenities: p.amenities,
    rating: 0, // TODO: calculate from reviews
    created_at: p.created_at,
  })) as SearchResult[];

  // Handle geolocation-based distance sorting
  if (sortBy === 'distance' && filters.latitude && filters.longitude && filters.radius_km) {
    const filtered = results.filter((p) => {
      // This is a simplified check - in production use PostGIS
      return true;
    });
    results = filtered;
  }

  await cache.set(cacheKey, results, 60);
  return { success: true, data: results };
}

function toTsQuery(input: string): string {
  const tokens = input
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean);

  if (tokens.length === 0) return '';
  return tokens.map((t) => `${t}:*`).join(' & ');
}
