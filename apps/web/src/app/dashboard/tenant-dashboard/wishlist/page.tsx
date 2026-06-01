'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PropertyCard from '@/components/search/PropertyCard';
import type { Property } from '@/types/property';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WishlistPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }

    fetch(`${API_URL}/api/wishlists`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: { properties: Property }[]) => {
        setProperties(data.map((item) => item.properties).filter(Boolean));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Saved Properties</h1>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {!isLoading && properties.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">You haven't saved any properties yet.</p>
          <Link href="/search" className="text-blue-600 hover:underline font-medium">
            Browse properties
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Link key={property.id} href={`/property/${property.id}`}>
            <PropertyCard property={property} />
          </Link>
        ))}
      </div>
    </main>
  );
}
