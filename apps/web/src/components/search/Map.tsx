'use client';

import { MapPin } from 'lucide-react';
import type { Property } from '@/types/property';

interface SearchMapProps {
  properties: Property[];
  onPropertyClick: (id: string) => void;
}

export default function SearchMap({ properties, onPropertyClick }: SearchMapProps) {
  const avgLat = properties.length > 0 ? 40.7128 : 0;
  const avgLng = properties.length > 0 ? -74.006 : 0;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${avgLng - 0.1},${avgLat - 0.1},${avgLng + 0.1},${avgLat + 0.1}&layer=mapnik`;

  return (
    <div className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        src={mapUrl}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Property pins overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {properties.slice(0, 10).map((property, idx) => (
          <button
            key={property.id}
            onClick={() => onPropertyClick(property.id)}
            className="absolute pointer-events-auto bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-semibold hover:bg-blue-700 shadow-lg"
            style={{
              left: `${20 + (idx % 5) * 15}%`,
              top: `${30 + Math.floor(idx / 5) * 20}%`,
            }}
            title={property.title}
          >
            <MapPin size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
