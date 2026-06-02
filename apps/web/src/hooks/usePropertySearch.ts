'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Property } from '@/types/property';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function usePropertySearch(q?: string) {
  const query = useMemo(() => q?.trim() ?? '', [q]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!query) {
        setProperties([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = `${API_URL}/api/properties/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!cancelled) setProperties((json ?? []) as Property[]);
      } catch {
        if (!cancelled) setError('Failed to search properties');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { properties, isLoading, error };
}


