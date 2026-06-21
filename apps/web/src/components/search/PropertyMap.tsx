'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngBounds, Map as LeafletMap } from 'leaflet';
import type { Property } from '@/types/property';
import { useGeolocation } from '@/hooks/useGeolocation';

// ── Dynamic imports (no SSR) ──────────────────────────────────────────────────
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false });
const PriceMarker = dynamic(() => import('./PriceMarker'), { ssr: false });
const BoundsListener = dynamic(() => import('./BoundsListener'), { ssr: false });
const UserLocationMarker = dynamic(() => import('./UserLocationMarker'), { ssr: false });

export interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (id: string) => void;
  onBoundsChanged?: (bounds: LatLngBounds) => void;
  /** Highlighted property id (e.g. hovered card) */
  activePropertyId?: string;
}

export default function PropertyMap({
  properties,
  onPropertyClick,
  onBoundsChanged,
  activePropertyId,
}: PropertyMapProps) {
  const { position, loading: geoLoading, locate } = useGeolocation();
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.006]);
  const [mapKey, setMapKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validProperties = useMemo(
    () =>
      properties.filter(
        (p): p is Property & { lat: number; lng: number } =>
          typeof (p as any).lat === 'number' && typeof (p as any).lng === 'number',
      ),
    [properties],
  );

  // Fit map to property bounds when list changes
  useEffect(() => {
    if (validProperties.length === 0) return;
    const lats = validProperties.map((p) => p.lat);
    const lngs = validProperties.map((p) => p.lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    setCenter([midLat, midLng]);
    setMapKey((k) => k + 1);
  }, [validProperties]);

  // Pan to user location when obtained
  useEffect(() => {
    if (position) {
      setCenter([position.lat, position.lng]);
      setMapKey((k) => k + 1);
    }
  }, [position]);

  const handleBoundsChanged = (bounds: LatLngBounds) => {
    if (!onBoundsChanged) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onBoundsChanged(bounds), 350);
  };

  return (
    <div className="relative w-full h-[450px] rounded-xl overflow-hidden shadow-md bg-gray-200">
      {/* Geolocation button */}
      <button
        onClick={locate}
        disabled={geoLoading}
        title="Use my location"
        className="absolute top-3 right-3 z-[1000] bg-white border border-gray-300 rounded-lg p-2 shadow hover:bg-gray-50 disabled:opacity-50 transition"
        aria-label="Find properties near me"
      >
        {geoLoading ? (
          <svg className="w-5 h-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" />
            <circle cx="12" cy="9" r="2.5" fill="currentColor" />
          </svg>
        )}
      </button>

      <MapContainer
        key={mapKey}
        center={center}
        zoom={validProperties.length > 0 ? 11 : 3}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onBoundsChanged && <BoundsListener onBoundsChanged={handleBoundsChanged} />}

        {position && <UserLocationMarker position={position} />}

        <MarkerClusterGroup chunkedLoading>
          {validProperties.map((property) => (
            <PriceMarker
              key={property.id}
              property={property}
              active={property.id === activePropertyId}
              onClick={() => onPropertyClick?.(property.id)}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {validProperties.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-gray-500 text-sm pointer-events-none">
          No properties with location data
        </div>
      )}
    </div>
  );
}
