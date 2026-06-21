'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Property } from '@/types/property';
import PropertyMapPopup from './PropertyMapPopup';

interface PriceMarkerProps {
  property: Property & { lat: number; lng: number };
  active?: boolean;
  onClick?: () => void;
}

function makeIcon(price: number, active: boolean) {
  const bg = active ? '#1d4ed8' : '#2563eb';
  const label = price >= 1000 ? `$${Math.round(price / 1000)}k` : `$${price}`;
  return new L.DivIcon({
    className: '',
    iconSize: undefined,
    html: `<div style="
      background:${bg};
      color:white;
      font-size:12px;
      font-weight:700;
      padding:4px 8px;
      border-radius:20px;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid ${active ? '#93c5fd' : 'transparent'};
      transform: ${active ? 'scale(1.15)' : 'scale(1)'};
      transition: transform 0.15s;
    ">${label}</div>`,
  });
}

export default function PriceMarker({ property, active = false, onClick }: PriceMarkerProps) {
  return (
    <Marker
      position={[property.lat, property.lng]}
      icon={makeIcon(property.price_per_night, active)}
    >
      <PropertyMapPopup property={property} onClick={onClick} />
    </Marker>
  );
}
