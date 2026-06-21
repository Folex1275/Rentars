import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}

export interface PropertyWithDistance {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  distance_km?: number;
}

export interface PriceComparison {
  property_id: string;
  title: string;
  price_per_night: number;
  distance_km: number;
  price_rank: number;
  avg_area_price: number;
  price_diff_pct: number;
}

export class LocationService {
  async geocode(address: string): Promise<ServiceResponse<GeocodeResult>> {
    if (!address || address.trim() === '') {
      return { success: false, error: 'Address is required', statusCode: 400 };
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Rentars/1.0 (rentals platform)' },
      });

      if (!response.ok) {
        return { success: false, error: 'Geocoding service unavailable', statusCode: 502 };
      }

      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!results.length) {
        return { success: false, error: 'Address not found', statusCode: 404 };
      }

      const [hit] = results;
      return {
        success: true,
        data: {
          latitude: parseFloat(hit.lat),
          longitude: parseFloat(hit.lon),
          address: hit.display_name,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Geocoding failed';
      return { success: false, error: message, statusCode: 500 };
    }
  }

  async searchNearby(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<ServiceResponse<PropertyWithDistance[]>> {
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return { success: false, error: 'Invalid latitude, longitude, or radius', statusCode: 400 };
    }

    if (radius <= 0) {
      return { success: false, error: 'Radius must be positive', statusCode: 400 };
    }

    try {
      const { data, error } = await supabase.rpc('search_nearby_properties', {
        lat,
        lng,
        radius_km: radius,
      });

      if (error) {
        // Fallback: filter in JS when PostGIS RPC is not available
        const fallback = await this.nearbyFallback(lat, lng, radius);
        return fallback;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      return { success: false, error: message, statusCode: 500 };
    }
  }

  async getPriceComparison(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<ServiceResponse<PriceComparison[]>> {
    const nearbyResult = await this.searchNearby(lat, lng, radius);
    if (!nearbyResult.success || !nearbyResult.data?.length) {
      return { success: true, data: [] };
    }

    const properties = nearbyResult.data;
    const prices = properties.map((p) => p.price_per_night);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const sorted = [...properties].sort((a, b) => a.price_per_night - b.price_per_night);
    const comparisons: PriceComparison[] = sorted.map((p, i) => ({
      property_id: p.id,
      title: p.title,
      price_per_night: p.price_per_night,
      distance_km: p.distance_km ?? 0,
      price_rank: i + 1,
      avg_area_price: Math.round(avgPrice * 100) / 100,
      price_diff_pct: Math.round(((p.price_per_night - avgPrice) / avgPrice) * 100 * 10) / 10,
    }));

    return { success: true, data: comparisons };
  }

  /** JS-side haversine fallback when PostGIS is not configured */
  private async nearbyFallback(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<ServiceResponse<PropertyWithDistance[]>> {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, latitude, longitude, price_per_night')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) return { success: false, error: error.message, statusCode: 500 };

    const R = 6371;
    const nearby = (data as PropertyWithDistance[])
      .map((p) => {
        const dLat = ((p.latitude - lat) * Math.PI) / 180;
        const dLng = ((p.longitude - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((p.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...p, distance_km: Math.round(distance_km * 100) / 100 };
      })
      .filter((p) => p.distance_km <= radius)
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

    return { success: true, data: nearby };
  }
}
