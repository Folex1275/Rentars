import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Property {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
}

export class LocationService {
  async geocode(address: string): Promise<ServiceResponse<GeocodeResult>> {
    if (!address || address.trim() === '') {
      return { success: false, error: 'Address is required', statusCode: 400 };
    }

    try {
      // In production, integrate with a real geocoding service (Google Maps, Mapbox, etc.)
      // For now, return mock data
      const result = await this.mockGeocode(address);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Geocoding failed';
      return { success: false, error: message, statusCode: 400 };
    }
  }

  async searchNearby(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<ServiceResponse<Property[]>> {
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return {
        success: false,
        error: 'Invalid latitude, longitude, or radius',
        statusCode: 400,
      };
    }

    if (radius < 0) {
      return { success: false, error: 'Radius must be positive', statusCode: 400 };
    }

    try {
      // Query properties within radius using PostGIS
      const { data, error } = await supabase.rpc('search_nearby_properties', {
        lat,
        lng,
        radius_km: radius,
      });

      if (error) {
        return { success: false, error: error.message, statusCode: 500 };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      return { success: false, error: message, statusCode: 500 };
    }
  }

  private async mockGeocode(address: string): Promise<GeocodeResult> {
    // Mock geocoding for testing
    if (address === 'invalid-address') {
      throw new Error('Address not found');
    }

    return {
      latitude: 40.7128,
      longitude: -74.006,
      address,
    };
  }
}
