'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import type { LatLngBounds } from 'leaflet';
import type { Property } from '@/types/property';
import PropertyMapPin from './PropertyMapPin';

// Leaflet must be loaded client-side in Next.js.
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false },
);

export interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (id: string) => void;
  onBoundsChanged?: (bounds: LatLngBounds) => void;
}

export default function PropertyMap({
  properties,
  onPropertyClick,
  onBoundsChanged,
}: PropertyMapProps) {
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.006]);
  const [mapKey, setMapKey] = useState(0);

  const initialBounds = useMemo(() => {
    const withCoords = properties.filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
    ) as Array<Property & { lat: number; lng: number }>;

    if (withCoords.length === 0) return null;

    const bounds = L.latLngBounds(
      withCoords.map((p) => [p.lat, p.lng] as [number, number]),
    );

    return bounds;
  }, [properties]);

  useEffect(() => {
    if (!initialBounds) return;
    const c = initialBounds.getCenter();
    setCenter([c.lat, c.lng]);
    setMapKey((k) => k + 1);
  }, [initialBounds]);

  // Small debounce to avoid spamming refetch on every drag event.
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);
  const reportBoundsDebounced = (b: LatLngBounds) => {
    if (!onBoundsChanged) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    const t = window.setTimeout(() => onBoundsChanged(b), 350);
    setDebounceTimer(t);
  };

  return (
    <div className="w-full h-[380px] rounded-lg overflow-hidden bg-gray-200">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={properties.length > 0 ? 11 : 3}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Hook into Leaflet events */}
        {onBoundsChanged && (
          <BoundsListener
            onBoundsChanged={(b) => reportBoundsDebounced(b)}
          />
        )}

        {properties
          .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
          .map((property) => (
            <PropertyMapPin
              key={property.id}
              property={property}
              onClick={() => onPropertyClick?.(property.id)}
            />
          ))}
      </MapContainer>
    </div>
  );
}

function BoundsListener({
  onBoundsChanged,
}: {
  onBoundsChanged: (bounds: LatLngBounds) => void;
}) {
  // Loaded only on client.
  const useMapEvents = (require('react-leaflet') as typeof import('react-leaflet'))
    .useMapEvents;

  const mapEvents = useMapEvents({
    moveend: (e) => {
      const b = (e.target as any).getBounds() as LatLngBounds;
      onBoundsChanged(b);
    },
  });

  // silence unused var
  void mapEvents;
  return null;
}

