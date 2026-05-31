'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface RealtimeOptions {
  userId?: string;
  onBookingStatusChange?: (booking: any) => void;
  onNewBookingNotification?: (booking: any) => void;
  onEscrowStatusChange?: (escrow: any) => void;
}

export function useRealTimeUpdates(options: RealtimeOptions = {}) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  const cleanup = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => {
      if (sub?.unsubscribe) {
        sub.unsubscribe();
      }
    });
    subscriptionsRef.current = [];
  }, []);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured');
      return;
    }

    try {
      supabaseRef.current = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Subscribe to booking status changes
      const bookingSubscription = supabaseRef.current
        .channel('bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: options.userId ? `tenant_id=eq.${options.userId}` : undefined,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              options.onBookingStatusChange?.(payload.new);
              toast.success('Booking status updated');
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(bookingSubscription);

      // Subscribe to new booking notifications for hosts
      if (options.userId) {
        const hostNotificationSubscription = supabaseRef.current
          .channel('host-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'bookings',
              filter: `owner_id=eq.${options.userId}`,
            },
            (payload) => {
              options.onNewBookingNotification?.(payload.new);
              toast.success('New booking received!');
            }
          )
          .subscribe();

        subscriptionsRef.current.push(hostNotificationSubscription);
      }

      // Subscribe to escrow status updates
      const escrowSubscription = supabaseRef.current
        .channel('escrow-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'escrow_transactions',
          },
          (payload) => {
            options.onEscrowStatusChange?.(payload.new);
            if (payload.eventType === 'UPDATE') {
              const status = payload.new?.status;
              if (status === 'released') {
                toast.success('Escrow released!');
              } else if (status === 'locked') {
                toast.info('Escrow locked');
              }
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(escrowSubscription);

      // Handle reconnection
      const handleReconnect = () => {
        console.log('Reconnecting to Supabase Realtime...');
        subscriptionsRef.current.forEach((sub) => {
          if (sub?.subscribe) {
            sub.subscribe();
          }
        });
      };

      // Listen for connection state changes
      supabaseRef.current.realtime.onOpen(() => {
        console.log('Supabase Realtime connected');
      });

      supabaseRef.current.realtime.onClose(() => {
        console.log('Supabase Realtime disconnected');
      });
    } catch (error) {
      console.error('Failed to set up real-time subscriptions:', error);
    }

    return cleanup;
  }, [options, cleanup]);

  return {
    isConnected: supabaseRef.current?.realtime?.isConnected?.() ?? false,
  };
}
