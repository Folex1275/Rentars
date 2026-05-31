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
}

const AMENITIES = ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Gym', 'Washer', 'Dryer', 'AC'];
const PROPERTY_TYPES = ['Apartment', 'House', 'Villa', 'Condo', 'Studio'];

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 1000,
    amenities: [],
    guests: 1,
    propertyType: '',
  });

  const [expandedSections, setExpandedSections] = useState({
    price: true,
    amenities: true,
    guests: true,
    type: true,
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

  const handlePropertyTypeChange = (type: string) => {
    const newFilters = { ...filters, propertyType: type };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6 h-fit sticky top-8">
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
          <div className="flex gap-2">
            {[1, 2, 4, 6, 8].map((num) => (
              <button
                key={num}
                onClick={() => handleGuestsChange(num)}
                className={`px-3 py-2 rounded border transition ${
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
    </div>
  );
}
