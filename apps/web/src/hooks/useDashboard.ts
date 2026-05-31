'use client';

import { useEffect, useState } from 'react';
import type { Booking } from '@/types/booking';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBookings(data))
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setIsLoading(false));
  }, []);

  return { bookings, isLoading, error };
}
