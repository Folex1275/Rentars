'use client';

import { useEffect, useState } from 'react';
import PropertyDetail from '@/components/features/properties/PropertyDetail';
import type { Property } from '@/types/property';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PropertyPage({ params }: { params: { id: string } }) {
  const [property, setProperty] = useState<(Property & { amenities?: string[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/properties/${params.id}`)
      .then((r) => r.json())
      .then((data) => setProperty(data))
      .catch(() => setError('Failed to load property'))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!property) return <div className="p-8 text-center">Property not found</div>;

  return <PropertyDetail property={property} />;
}
