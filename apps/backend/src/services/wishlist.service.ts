import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

export async function addToWishlist(userId: string, propertyId: string): Promise<ServiceResponse<void>> {
  const { error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, property_id: propertyId });

  if (error) {
    // Unique constraint violation = already in wishlist
    if (error.code === '23505') return { success: true };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function removeFromWishlist(userId: string, propertyId: string): Promise<ServiceResponse<void>> {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getWishlist(userId: string): Promise<ServiceResponse<unknown[]>> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('property_id, created_at, properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as unknown[] };
}
