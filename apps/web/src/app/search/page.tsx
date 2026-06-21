'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/features/search/SearchBar';
import FilterSidebar, { type FilterState } from '@/components/search/FilterSidebar';
import SortOptions from '@/components/search/SortOptions';
import PropertyMap from '@/components/search/PropertyMap';
import PropertyGrid from '@/components/search/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';
import { usePropertySearch } from '@/hooks/usePropertySearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyProperties, geocodeAddress } from '@/hooks/useLocationSearch';
import type { LatLngBounds } from 'leaflet';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 1000,
    amenities: [],
    guests: 1,
    propertyType: '',
  });
  const [sortBy, setSortBy] = useState('recommended');
  const [showMap, setShowMap] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | undefined>();
  const [mapBounds, setMapBounds] = useState<{
    west: number; south: number; east: number; north: number;
  } | undefined>();

  const q = searchParams.get('q') || searchParams.get('location') || undefined;

  const { properties: searched, isLoading: isSearching, error: searchError } = usePropertySearch(q);
  const { properties: filtered, isLoading: isFiltering, error } = useProperties({
    location: searchParams.get('location') || undefined,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    amenities: filters.amenities,
    guests: filters.guests,
    propertyType: filters.propertyType,
    sortBy,
    bounds: mapBounds,
  });

  const { position: geoPosition, locate, loading: geoLoading } = useGeolocation();
  const [nearbyParams, setNearbyParams] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const { properties: nearbyProps, isLoading: nearbyLoading } = useNearbyProperties(nearbyParams);

  // When geolocation resolves, trigger nearby search
  useEffect(() => {
    if (geoPosition) {
      setNearbyParams({ lat: geoPosition.lat, lng: geoPosition.lng, radius: 10 });
    }
  }, [geoPosition]);

  const properties = nearbyParams
    ? nearbyProps
    : q
    ? searched
    : filtered;
  const isLoading = nearbyParams ? nearbyLoading : q ? isSearching : isFiltering;
  const apiError = q ? searchError : error;

  const handleSearch = useCallback(async (query: string) => {
    // Try geocoding the query first for location-based search
    const geo = await geocodeAddress(query);
    if (geo) {
      setNearbyParams({ lat: geo.lat, lng: geo.lng, radius: 15 });
    }
    const params = new URLSearchParams();
    params.set('q', query);
    window.history.pushState(null, '', `/search?${params.toString()}`);
  }, []);

  const handleBoundsChanged = useCallback((bounds: LatLngBounds) => {
    setMapBounds({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Search Properties</h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {isLoading ? 'Searching...' : `${properties.length} properties`}
            </span>
            <SortOptions onSortChange={setSortBy} currentSort={sortBy} />
          </div>

          <div className="flex items-center gap-2">
            {/* Near me button */}
            <button
              onClick={() => { locate(); setShowMap(true); }}
              disabled={geoLoading}
              className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" />
                <circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none" />
              </svg>
              Near me
            </button>

            <button
              onClick={() => setShowMap(false)}
              className={`px-4 py-2 border rounded-lg text-sm font-semibold transition ${
                !showMap ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setShowMap(true)}
              className={`px-4 py-2 border rounded-lg text-sm font-semibold transition ${
                showMap ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {showMap && (
          <div className="mb-8">
            <PropertyMap
              properties={properties}
              activePropertyId={activePropertyId}
              onPropertyClick={(id) => { window.location.href = `/property/${id}`; }}
              onBoundsChanged={handleBoundsChanged}
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-8">
          <div className="col-span-1">
            <FilterSidebar onFilterChange={setFilters} />
          </div>

          <div className="col-span-3">
            {isLoading && <p className="text-gray-400">Loading properties...</p>}
            {apiError && <p className="text-red-500">{apiError}</p>}

            {!isLoading && properties.length === 0 && (
              <p className="text-gray-500">No properties found. Try adjusting your filters.</p>
            )}
            {!isLoading && properties.length > 0 && (
              <div
                onMouseLeave={() => setActivePropertyId(undefined)}
              >
                <PropertyGrid
                  properties={properties}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
