'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/features/search/SearchBar';
import FilterSidebar, { type FilterState } from '@/components/search/FilterSidebar';
import SortOptions from '@/components/search/SortOptions';
import PropertyMap from '@/components/search/PropertyMap';

import PropertyGrid from '@/components/search/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';

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

  const { properties, isLoading, error } = useProperties({
    location: searchParams.get('location') || undefined,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    amenities: filters.amenities,
    guests: filters.guests,
    propertyType: filters.propertyType,
    sortBy,
  });

  useEffect(() => {
    const location = searchParams.get('location');
    if (location) {
      // Location is already in URL params
    }
  }, [searchParams]);

  const handleSearch = (location: string) => {
    const params = new URLSearchParams();
    params.set('location', location);
    window.history.pushState(null, '', `/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Search Properties</h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Map Toggle */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Showing {properties.length} properties
            </span>
            <SortOptions onSortChange={setSortBy} currentSort={sortBy} />
          </div>
          <div className="flex items-center gap-2">
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

        {/* Map View */}
        {showMap && (
          <div className="mb-8">
            <PropertyMap
              properties={properties}

              onPropertyClick={(id) => {
                window.location.href = `/property/${id}`;
              }}
              onBoundsChanged={() => {}}

            />
          </div>
        )}


        {/* Filters and Results */}
        <div className="grid grid-cols-4 gap-8">
          <div className="col-span-1">
            <FilterSidebar onFilterChange={setFilters} />
          </div>

          <div className="col-span-3">
            {isLoading && <p className="text-gray-400">Loading properties...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && properties.length === 0 && (
              <p className="text-gray-500">No properties found. Try adjusting your filters.</p>
            )}
            {!isLoading && properties.length > 0 && (
              <PropertyGrid properties={properties} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
