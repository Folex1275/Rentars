import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface SeasonalPricing {
  id: string;
  property_id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier: number;
  created_at?: string;
}

export interface SpecialEvent {
  id: string;
  property_id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier?: number;
  is_blocked: boolean;
  created_at?: string;
}

export interface DayPricing {
  date: string;
  price: number;
  is_available: boolean;
  reason?: string;
}

/**
 * Calculate price for a date range considering seasonal pricing,
 * special events, and base price. All dates normalized to UTC.
 */
export async function calculateRangePrice(
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<ServiceResponse<{ total: number; breakdown: DayPricing[] }>> {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return { success: false, error: 'Invalid date format' };
  }

  // Fetch property base price
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('base_price_per_night')
    .eq('id', propertyId)
    .single();

  if (propError || !property) {
    return { success: false, error: 'Property not found' };
  }

  const basePrice = (property as { base_price_per_night: number }).base_price_per_night;

  // Fetch seasonal pricing
  const { data: seasonalRates } = await supabase
    .from('seasonal_pricing')
    .select('*')
    .eq('property_id', propertyId)
    .lte('start_date', checkOut)
    .gte('end_date', checkIn);

  // Fetch special events
  const { data: events } = await supabase
    .from('special_events')
    .select('*')
    .eq('property_id', propertyId)
    .lte('start_date', checkOut)
    .gte('end_date', checkIn);

  const breakdown: DayPricing[] = [];
  let total = 0;

  for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // Check if blocked by special event
    const blockedEvent = events?.find(
      (e) => e.is_blocked && dateStr >= e.start_date && dateStr < e.end_date,
    );

    if (blockedEvent) {
      breakdown.push({
        date: dateStr,
        price: 0,
        is_available: false,
        reason: `Blocked: ${blockedEvent.name}`,
      });
      continue;
    }

    // Calculate multiplier from seasonal pricing + special events
    let multiplier = 1;

    const seasonalRate = seasonalRates?.find(
      (r) => dateStr >= r.start_date && dateStr < r.end_date,
    );
    if (seasonalRate) {
      multiplier *= seasonalRate.price_multiplier;
    }

    const event = events?.find(
      (e) => !e.is_blocked && dateStr >= e.start_date && dateStr < e.end_date,
    );
    if (event?.price_multiplier) {
      multiplier *= event.price_multiplier;
    }

    const dayPrice = basePrice * multiplier;
    total += dayPrice;

    breakdown.push({
      date: dateStr,
      price: dayPrice,
      is_available: true,
    });
  }

  return { success: true, data: { total, breakdown } };
}

/**
 * Get all seasonal pricing for a property
 */
export async function getSeasonalPricing(
  propertyId: string,
): Promise<ServiceResponse<SeasonalPricing[]>> {
  const { data, error } = await supabase
    .from('seasonal_pricing')
    .select('*')
    .eq('property_id', propertyId)
    .order('start_date', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SeasonalPricing[] };
}

/**
 * Create seasonal pricing rule
 */
export async function createSeasonalPricing(
  propertyId: string,
  ownerId: string,
  input: Omit<SeasonalPricing, 'id' | 'property_id' | 'created_at'>,
): Promise<ServiceResponse<SeasonalPricing>> {
  // Verify ownership
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden' };
  }

  const { data, error } = await supabase
    .from('seasonal_pricing')
    .insert({ property_id: propertyId, ...input })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SeasonalPricing };
}

/**
 * Delete seasonal pricing rule
 */
export async function deleteSeasonalPricing(
  propertyId: string,
  pricingId: string,
  ownerId: string,
): Promise<ServiceResponse<void>> {
  // Verify ownership
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('seasonal_pricing')
    .delete()
    .eq('id', pricingId)
    .eq('property_id', propertyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Create special event (holiday pricing or block)
 */
export async function createSpecialEvent(
  propertyId: string,
  ownerId: string,
  input: Omit<SpecialEvent, 'id' | 'property_id' | 'created_at'>,
): Promise<ServiceResponse<SpecialEvent>> {
  // Verify ownership
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden' };
  }

  const { data, error } = await supabase
    .from('special_events')
    .insert({ property_id: propertyId, ...input })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SpecialEvent };
}

/**
 * Delete special event
 */
export async function deleteSpecialEvent(
  propertyId: string,
  eventId: string,
  ownerId: string,
): Promise<ServiceResponse<void>> {
  // Verify ownership
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('special_events')
    .delete()
    .eq('id', eventId)
    .eq('property_id', propertyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
