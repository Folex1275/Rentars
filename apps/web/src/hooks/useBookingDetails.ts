'use client';

import { useEffect, useState } from 'react';
import type { Booking } from '../types/booking';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useBookingDetails(bookingId: string) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBooking(data))
      .catch(() => setError('Failed to load booking'))
      .finally(() => setIsLoading(false));
  }, [bookingId]);

  return { booking, isLoading, error };
}
