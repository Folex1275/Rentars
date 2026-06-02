'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Property } from '@/types/property';
import PropertyMapPopup from './PropertyMapPopup';

export interface PropertyMapPinProps {
  property: Property;
  onClick?: () => void;
}

const pinIcon = new L.DivIcon({
  className: 'rentars-pin',
  html: `
    <div style="position:relative;">
      <div style="width:26px;height:26px;border-radius:9999px;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.25);font-weight:800;">★</div>
    </div>
  `,
});

export default function PropertyMapPin({ property, onClick }: PropertyMapPinProps) {
  const lat = (property as any).lat as number | undefined;
  const lng = (property as any).lng as number | undefined;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return (
    <Marker position={[lat, lng]} icon={pinIcon}>
      {/* Click opens popup; also allow explicit callback */}
      <PropertyMapPopup property={property} onClick={onClick} />
    </Marker>
  );
}

