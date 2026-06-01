'use client';

import { useEffect, useState } from 'react';
import type { Property } from '@/types/property';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PropertyFilters {
  location?: string;
  priceMin?: number;
  priceMax?: number;
  amenities?: string[];
  guests?: number;
  propertyType?: string;
  sortBy?: string;
}

export function useProperties(filters?: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters?.location) params.append('location', filters.location);
    if (filters?.priceMin) params.append('priceMin', filters.priceMin.toString());
    if (filters?.priceMax) params.append('priceMax', filters.priceMax.toString());
    if (filters?.amenities?.length) params.append('amenities', filters.amenities.join(','));
    if (filters?.guests) params.append('guests', filters.guests.toString());
    if (filters?.propertyType) params.append('type', filters.propertyType);
    if (filters?.sortBy) params.append('sort', filters.sortBy);

    const url = `${API_URL}/api/properties${params.toString() ? `?${params.toString()}` : ''}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => setProperties(data))
      .catch(() => setError('Failed to load properties'))
      .finally(() => setIsLoading(false));
  }, [filters]);

  return { properties, isLoading, error };
}
