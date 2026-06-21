import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface SearchAnalytic {
  id?: string;
  query: string;
  filters?: Record<string, unknown>;
  result_count: number;
  user_id?: string;
  created_at?: string;
}

export interface SearchSuggestion {
  query: string;
  frequency: number;
  result_count?: number;
}

/**
 * Track a search query for analytics and suggestions.
 */
export async function trackSearch(
  query: string,
  resultCount: number,
  userId?: string,
  filters?: Record<string, unknown>,
): Promise<ServiceResponse<SearchAnalytic>> {
  const { data, error } = await supabase
    .from('search_analytics')
    .insert({
      query: query.toLowerCase(),
      filters,
      result_count: resultCount,
      user_id: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as SearchAnalytic };
}

/**
 * Get search suggestions based on frequency and recency.
 */
export async function getSearchSuggestions(
  prefix: string,
  limit = 10,
): Promise<ServiceResponse<SearchSuggestion[]>> {
  if (!prefix || prefix.length < 2) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase.rpc('get_search_suggestions', {
    search_prefix: `${prefix.toLowerCase()}%`,
    limit,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as SearchSuggestion[] };
}

/**
 * Get trending searches for the past 7 days.
 */
export async function getTrendingSearches(limit = 10): Promise<ServiceResponse<SearchSuggestion[]>> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('search_analytics')
    .select('query')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  // Group by query and count
  const grouped = (data ?? []).reduce(
    (acc, item) => {
      const existing = acc.find((s: SearchSuggestion) => s.query === item.query);
      if (existing) {
        existing.frequency++;
      } else {
        acc.push({ query: item.query, frequency: 1 });
      }
      return acc;
    },
    [] as SearchSuggestion[],
  );

  const trending = grouped.sort((a, b) => b.frequency - a.frequency).slice(0, limit);

  return { success: true, data: trending };
}
