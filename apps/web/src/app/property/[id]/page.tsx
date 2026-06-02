import type { Metadata } from 'next';
import PropertyDetail from '@/components/features/properties/PropertyDetail';
import type { Property } from '@/types/property';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

async function getPropertyById(id: string) {
  const res = await fetch(`${API_URL}/api/properties/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) return null;

  return (await res.json()) as Property & {
    amenities?: string[];
    description_full?: string;
    host_name?: string;
    host_image?: string;
    reviews?: Array<{ id: string; author: string; rating: number; comment: string; date: string }>;
    average_rating?: number;
    blocked_dates?: string[];
    latitude?: number;
    longitude?: number;
  };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const property = await getPropertyById(params.id);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/property/${params.id}`;

  const title = property?.title
    ? `${property.title} — Rentars`
    : 'Property — Rentars';

  const description =
    property?.description_full || property?.description || 'Book your stay on Rentars.';

  const ogImage = property?.images?.[0] ? property.images[0] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: 'en_US',
      type: 'website',
    },
  };
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const property = await getPropertyById(params.id);

  if (!property) {
    return <div className="p-8 text-center">Property not found</div>;
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/property/${params.id}`;

  const ldJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: property.title,
    description:
      property.description_full || property.description || 'Accommodation on Rentars',
    image: property.images?.[0],
    url: canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location,
    },
    ...(typeof property.latitude === 'number' && typeof property.longitude === 'number'
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonLd) }}
      />
      <PropertyDetail property={property} />
    </>
  );
}

