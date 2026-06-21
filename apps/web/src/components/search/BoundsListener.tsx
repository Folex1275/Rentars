'use client';

import { useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';

interface BoundsListenerProps {
  onBoundsChanged: (bounds: LatLngBounds) => void;
}

export default function BoundsListener({ onBoundsChanged }: BoundsListenerProps) {
  useMapEvents({
    moveend: (e) => onBoundsChanged(e.target.getBounds()),
    zoomend: (e) => onBoundsChanged(e.target.getBounds()),
  });
  return null;
}
