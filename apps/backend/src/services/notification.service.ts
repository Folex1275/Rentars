import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

export type NotificationType = 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'payment_received';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  created_at?: string;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, unknown>,
): Promise<ServiceResponse<Notification>> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, data })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: notification as Notification };
}

export async function getNotifications(userId: string): Promise<ServiceResponse<Notification[]>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Notification[] };
}

export async function markAsRead(notificationId: string, userId: string): Promise<ServiceResponse<void>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markAllAsRead(userId: string): Promise<ServiceResponse<void>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
