/**
 * Property service — business logic layer between the property controller
 * and Supabase / blockchain clients.
 *
 * All functions return a ServiceResponse so controllers stay thin and
 * error handling is consistent.
 */

import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

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
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

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

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { success: false, error: 'Property not found' };
  }

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
