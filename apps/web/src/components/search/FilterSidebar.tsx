'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  priceMin: number;
  priceMax: number;
  amenities: string[];
  guests: number;
  checkIn?: string;
  checkOut?: string;
  propertyType: string;
  bedrooms?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'distance' | 'rating';
}

const AMENITIES = [
  'WiFi',
  'Kitchen',
  'Parking',
  'Pool',
  'Gym',
  'Washer',
  'Dryer',
  'AC',
  'Heating',
  'TV',
  'Balcony',
];
const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Condo', 'Studio'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
];

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 1000,
    amenities: [],
    guests: 1,
    propertyType: '',
    bedrooms: undefined,
    sortBy: 'newest',
  });

  const [expandedSections, setExpandedSections] = useState({
    sort: true,
    price: true,
    amenities: true,
    guests: true,
    bedrooms: false,
    type: true,
    dates: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePriceChange = (key: 'priceMin' | 'priceMax', value: number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    const newFilters = { ...filters, amenities: newAmenities };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleGuestsChange = (guests: number) => {
    const newFilters = { ...filters, guests };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleBedroomsChange = (bedrooms: number | undefined) => {
    const newFilters = { ...filters, bedrooms };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePropertyTypeChange = (type: string) => {
    const newFilters = { ...filters, propertyType: type };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    const newFilters = { ...filters, sortBy };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (key: 'checkIn' | 'checkOut', value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6 h-fit sticky top-8">
      {/* Sort */}
      <div>
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Sort By
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.sort ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.sort && (
          <div className="space-y-2">
            {SORT_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  checked={filters.sortBy === option.value}
                  onChange={() => handleSortChange(option.value as any)}
                  className="rounded-full"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Price Range
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.price ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.price && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Min: ${filters.priceMin}</label>
              <input
                type="range"
                min="0"
                max="1000"
                value={filters.priceMin}
                onChange={(e) => handlePriceChange('priceMin', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Max: ${filters.priceMax}</label>
              <input
                type="range"
                min="0"
                max="1000"
                value={filters.priceMax}
                onChange={(e) => handlePriceChange('priceMax', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bedrooms */}
      <div>
        <button
          onClick={() => toggleSection('bedrooms')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Bedrooms
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.bedrooms ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.bedrooms && (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => handleBedroomsChange(filters.bedrooms === num ? undefined : num)}
                className={`px-3 py-2 rounded border transition text-sm ${
                  filters.bedrooms === num
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amenities */}
      <div>
        <button
          onClick={() => toggleSection('amenities')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Amenities
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.amenities ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.amenities && (
          <div className="space-y-2">
            {AMENITIES.map((amenity) => (
              <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="rounded"
                />
                <span className="text-sm">{amenity}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Guests */}
      <div>
        <button
          onClick={() => toggleSection('guests')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Guests
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.guests ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.guests && (
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 4, 6, 8].map((num) => (
              <button
                key={num}
                onClick={() => handleGuestsChange(num)}
                className={`px-3 py-2 rounded border transition text-sm ${
                  filters.guests === num
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Property Type */}
      <div>
        <button
          onClick={() => toggleSection('type')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Property Type
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.type ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.type && (
          <div className="space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="propertyType"
                  checked={filters.propertyType === type}
                  onChange={() => handlePropertyTypeChange(type)}
                  className="rounded-full"
                />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Dates */}
      <div>
        <button
          onClick={() => toggleSection('dates')}
          className="flex items-center justify-between w-full font-semibold mb-4"
        >
          Dates
          <ChevronDown
            size={20}
            className={`transition ${expandedSections.dates ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.dates && (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Check In</label>
              <input
                type="date"
                value={filters.checkIn || ''}
                onChange={(e) => handleDateChange('checkIn', e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Check Out</label>
              <input
                type="date"
                value={filters.checkOut || ''}
                onChange={(e) => handleDateChange('checkOut', e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
