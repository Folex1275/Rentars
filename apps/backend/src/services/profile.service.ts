import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface UserProfile {
  user_id: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  stellar_address?: string;
  preferences?: Record<string, unknown>;
  social_links?: Record<string, string>;
  verification_status?: 'unverified' | 'pending' | 'verified';
  last_active?: string;
}

export async function getProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
  if (!userId) return { success: false, error: 'User ID is required' };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return { success: false, error: 'Profile not found' };
  return { success: true, data: data as UserProfile };
}

export async function updateProfile(
  userId: string,
  profileData: Partial<Omit<UserProfile, 'user_id' | 'stellar_address'>>,
): Promise<ServiceResponse<UserProfile>> {
  if (!userId) return { success: false, error: 'User ID is required' };
  if (Object.keys(profileData).length === 0) {
    return { success: false, error: 'No fields provided for update' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...profileData, user_id: userId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as UserProfile };
}

export async function updateStellarAddress(
  userId: string,
  stellarAddress: string,
): Promise<ServiceResponse<UserProfile>> {
  if (!userId) return { success: false, error: 'User ID is required' };
  if (!stellarAddress) return { success: false, error: 'Stellar address is required' };

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, stellar_address: stellarAddress })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as UserProfile };
}

export async function getPublicProfile(
  userId: string,
): Promise<ServiceResponse<Partial<UserProfile>>> {
  if (!userId) return { success: false, error: 'User ID is required' };

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, name, avatar_url, stellar_address, verification_status, last_active')
    .eq('user_id', userId)
    .single();

  if (error) return { success: false, error: 'Profile not found' };
  return { success: true, data: data as Partial<UserProfile> };
}
