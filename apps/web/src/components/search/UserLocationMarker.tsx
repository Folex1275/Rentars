'use client';

import { CircleMarker, Popup } from 'react-leaflet';
import type { GeoPosition } from '@/hooks/useGeolocation';

interface UserLocationMarkerProps {
  position: GeoPosition;
}

export default function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={10}
      pathOptions={{ color: '#2563eb', fillColor: '#93c5fd', fillOpacity: 0.8, weight: 2 }}
    >
      <Popup>Your location</Popup>
    </CircleMarker>
  );
}
