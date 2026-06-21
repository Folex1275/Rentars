'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});

interface POI {
  name: string;
  lat: number;
  lng: number;
  type: string;
  distance?: number; // km
}

interface PropertyMapProps {
  location: string;
  latitude?: number;
  longitude?: number;
  /** Show nearby POIs (requires lat/lng) */
  showPOIs?: boolean;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchPOIs(lat: number, lng: number): Promise<POI[]> {
  const delta = 0.02;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const query = `[out:json][timeout:10];(
    node["amenity"~"restaurant|cafe|supermarket|hospital|pharmacy|bus_stop|subway_entrance"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
  );out 15;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements ?? []).slice(0, 15).map((el: any) => ({
      name: el.tags?.name || el.tags?.amenity || 'Point of interest',
      lat: el.lat,
      lng: el.lon,
      type: el.tags?.amenity || 'poi',
      distance: haversineKm(lat, lng, el.lat, el.lon),
    }));
  } catch {
    return [];
  }
}

const POI_COLORS: Record<string, string> = {
  restaurant: '#f97316',
  cafe: '#a16207',
  supermarket: '#16a34a',
  hospital: '#dc2626',
  pharmacy: '#9333ea',
  bus_stop: '#0284c7',
  subway_entrance: '#0284c7',
};

export default function PropertyMap({
  location,
  latitude,
  longitude,
  showPOIs = true,
}: PropertyMapProps) {
  const [pois, setPOIs] = useState<POI[]>([]);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
  const center: [number, number] = hasCoords ? [latitude!, longitude!] : [40.7128, -74.006];

  useEffect(() => {
    if (!hasCoords || !showPOIs) return;
    fetchPOIs(latitude!, longitude!).then(setPOIs);
  }, [latitude, longitude, hasCoords, showPOIs]);

  if (!hasCoords) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
        Location: {location} (coordinates not available)
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden shadow-sm">
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Property pin */}
        <CircleMarker
          center={center}
          radius={12}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <strong>Property location</strong>
            <br />
            {location}
          </Popup>
        </CircleMarker>

        {/* POI pins */}
        {pois.map((poi, i) => (
          <CircleMarker
            key={i}
            center={[poi.lat, poi.lng]}
            radius={7}
            pathOptions={{
              color: POI_COLORS[poi.type] || '#6b7280',
              fillColor: POI_COLORS[poi.type] || '#6b7280',
              fillOpacity: 0.8,
              weight: 1,
            }}
          >
            <Popup>
              <strong>{poi.name}</strong>
              <br />
              <span className="capitalize text-xs text-gray-500">{poi.type}</span>
              {poi.distance !== undefined && (
                <>
                  <br />
                  <span className="text-xs">{poi.distance.toFixed(2)} km away</span>
                </>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* POI legend */}
      {pois.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
          {Object.entries(POI_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: color }}
              />
              {type.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
