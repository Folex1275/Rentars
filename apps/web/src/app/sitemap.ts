import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

type SitemapEntry = { url: string; lastModified?: string };

async function getAllPropertyIds(): Promise<string[]> {
  // We currently only have GET /api/v1/properties/:id and GET /api/v1/properties
n  // in the backend. The frontend uses /api/properties/:id.
  // We'll call the same API base used by the frontend (NEXT_PUBLIC_API_URL).

  // 1) Try fetching all properties.
  const res = await fetch(`${API_URL}/api/properties`, {
    cache: 'no-store',
  });

  if (!res.ok) return [];

  const data = (await res.json()) as Array<{ id?: string; property_id?: string; slug?: string }> | any;

  if (!Array.isArray(data)) return [];

  const ids = data
    .map((p) => (p?.id ? String(p.id) : p?.property_id ? String(p.property_id) : null))
    .filter((x): x is string => Boolean(x));

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const baseUrls: SitemapEntry[] = [
    { url: `${siteUrl}/` },
    { url: `${siteUrl}/search` },
    { url: `${siteUrl}/list` },
    { url: `${siteUrl}/login` },
    { url: `${siteUrl}/register` },
  ];

  const propertyIds = await getAllPropertyIds();
  const propertyUrls: SitemapEntry[] = propertyIds.map((id) => ({
    url: `${siteUrl}/property/${id}`,
  }));

  return [...baseUrls, ...propertyUrls];
}

