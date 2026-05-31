'use client';

import { useProperties } from '@/hooks/useProperties';
import PropertyGrid from '../components/search/PropertyGrid';

export default function Home() {
  const { properties, isLoading, error } = useProperties();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Find Your Next Rental</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Peer-to-peer rentals with instant USDC payments — no middlemen, no hidden fees.
        </p>

        {isLoading && <p className="text-gray-400">Loading properties...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!isLoading && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Showing {properties.length} properties
            </p>
            <PropertyGrid properties={properties} />
          </>
        )}
      </section>
    </main>
  );
}
