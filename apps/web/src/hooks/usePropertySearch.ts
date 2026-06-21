import { useState, useCallback, useEffect } from 'react';
import type { FilterState } from '@/components/search/FilterSidebar';

export interface SearchResult {
  id: string;
  title: string;
  price_per_night?: number;
  city?: string;
  country?: string;
  bedrooms?: number;
  amenities?: string[];
  distance_km?: number;
  rating?: number;
  created_at?: string;
}

interface UseSearchOptions {
  debounceMs?: number;
}

export function usePropertySearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const search = useCallback(
    async (query: string, filters: Partial<FilterState> = {}, pageNum = 1) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (filters.priceMin !== undefined) params.append('min_price', String(filters.priceMin));
        if (filters.priceMax !== undefined) params.append('max_price', String(filters.priceMax));
        if (filters.guests !== undefined) params.append('guests', String(filters.guests));
        if (filters.bedrooms !== undefined) params.append('bedrooms', String(filters.bedrooms));
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.amenities && filters.amenities.length > 0) {
          filters.amenities.forEach((a) => params.append('amenities', a));
        }
        if (filters.checkIn) params.append('checkIn', filters.checkIn);
        if (filters.checkOut) params.append('checkOut', filters.checkOut);
        params.append('page', String(pageNum));
        params.append('limit', '20');

        const response = await fetch(`/api/v1/properties/search/advanced?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.data || []);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search error');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/properties/search/suggestions?q=${encodeURIComponent(prefix)}&limit=5`,
      );

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      setSuggestions(data.map((item: any) => item.query));
    } catch (err) {
      setSuggestions([]);
    }
  }, []);

  const getTrending = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/properties/search/trending');

      if (!response.ok) throw new Error('Failed to fetch trending');

      const data = await response.json();
      setSuggestions(data.map((item: any) => item.query));
    } catch (err) {
      setSuggestions([]);
    }
  }, []);

  return {
    results,
    loading,
    error,
    suggestions,
    page,
    search,
    getSuggestions,
    getTrending,
  };
}
