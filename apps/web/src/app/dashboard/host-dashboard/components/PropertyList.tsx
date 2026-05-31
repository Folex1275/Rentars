'use client';

import { useState } from 'react';
import type { HostProperty } from '../types';
import { Edit2, Calendar, Star } from 'lucide-react';
import CalendarModal from './CalendarModal';

interface PropertyListProps {
  properties: HostProperty[];
  onEdit?: (property: HostProperty) => void;
}

export default function PropertyList({
  properties,
  onEdit,
}: PropertyListProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const handleCalendarClick = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setCalendarOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Your Properties</h3>
        </div>

        <div className="divide-y">
          {properties.map((property) => (
            <div
              key={property.id}
              className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{property.title}</h4>
                  <p className="text-sm text-gray-500">{property.location}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      {property.pricePerNight} USDC/night
                    </span>
                    <span className="text-gray-500">{property.bookings} bookings</span>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-600">{property.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCalendarClick(property.id)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition"
                  title="Manage availability"
                >
                  <Calendar size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => onEdit?.(property)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition"
                  title="Edit property"
                >
                  <Edit2 size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPropertyId && (
        <CalendarModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          propertyId={selectedPropertyId}
        />
      )}
    </>
  );
}
