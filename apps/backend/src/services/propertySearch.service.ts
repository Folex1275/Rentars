import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';
import type { Property } from './property.service.js';

function toTsQuery(input: string) {
  // Convert spaces to prefix tsquery tokens and sanitize basic characters.
  // Example: "new york" -> "new:* & york:*"
  const tokens = input
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean);

  if (tokens.length === 0) return '';
  return tokens.map((t) => `${t}:*`).join(' & ');
}

export async function searchPropertiesByQuery(query: string): Promise<ServiceResponse<Property[]>> {
  const q = query.trim();
  if (!q) return { success: true, data: [] };

  const tsQuery = toTsQuery(q);
  if (!tsQuery) return { success: true, data: [] };

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    // Uses generated column search_vector + GIN index
    .textSearch('search_vector', tsQuery, { config: 'english' })
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Property[] };
}

