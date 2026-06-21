import type { Request, Response } from 'express';
import {
  createProperty,
  deleteProperty,
  getAllProperties,
  getPropertyById,
  searchProperties,
  updateProperty,
  advancedSearch,
  type AdvancedSearchFilters,
} from '@/services/property.service.js';
import { trackSearch, getSearchSuggestions, getTrendingSearches } from '@/services/searchAnalytics.service.js';

export async function getProperties(req: Request, res: Response): Promise<void> {
  // If any search filter query params are present, delegate to searchProperties
  const { city, country, min_price, max_price, bedrooms, status } = req.query;

  const hasFilters = city || country || min_price || max_price || bedrooms || status;

  if (hasFilters) {
    const result = await searchProperties({
      city: city as string | undefined,
      country: country as string | undefined,
      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      status: status as string | undefined,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
    return;
  }

  const result = await getAllProperties();

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

// ─── Featured ─────────────────────────────────────────────────────────────────

export async function getFeatured(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getFeaturedProperties();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// ─── Single property ──────────────────────────────────────────────────────────

export async function getProperty(req: Request, res: Response): Promise<void> {
  const result = await getPropertyById(req.params.id);

  if (!result.success) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function createPropertyHandler(req: Request, res: Response): Promise<void> {
  const result = await createProperty(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json(result.data);
}

export async function updatePropertyHandler(req: Request, res: Response): Promise<void> {
  const result = await updateProperty(req.params.id, req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function deletePropertyHandler(req: Request, res: Response): Promise<void> {
  const result = await deleteProperty(req.params.id);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(204).send();
}

// ─── Advanced Search ──────────────────────────────────────────────────────────

export async function advancedSearchHandler(req: Request, res: Response): Promise<void> {
  const filters: AdvancedSearchFilters = {
    query: req.query.q as string,
    city: req.query.city as string,
    country: req.query.country as string,
    min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
    max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
    bedrooms: req.query.bedrooms ? Number(req.query.bedrooms) : undefined,
    guests: req.query.guests ? Number(req.query.guests) : undefined,
    amenities: req.query.amenities ? (Array.isArray(req.query.amenities) ? (req.query.amenities as string[]) : [req.query.amenities as string]) : undefined,
    latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
    longitude: req.query.longitude ? Number(req.query.longitude) : undefined,
    radius_km: req.query.radius_km ? Number(req.query.radius_km) : undefined,
    checkIn: req.query.checkIn as string,
    checkOut: req.query.checkOut as string,
    sortBy: req.query.sortBy as any,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };

  const result = await advancedSearch(filters);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  // Track search analytics
  await trackSearch(filters.query || '', result.data.length, undefined, filters);

  res.json({
    data: result.data,
    count: result.data.length,
    page: filters.page,
  });
}

export async function searchSuggestionsHandler(req: Request, res: Response): Promise<void> {
  const prefix = req.query.q as string;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  const result = await getSearchSuggestions(prefix, limit);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function trendingSearchesHandler(_req: Request, res: Response): Promise<void> {
  const result = await getTrendingSearches(10);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(req: Request, res: Response): Promise<void> {
  try {
    const ranges = await getAvailabilityRanges(req.params.id);
    res.json(ranges);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function setAvailability(req: AuthRequest, res: Response): Promise<void> {
  try {
    const ranges = await setAvailabilityRanges(
      req.params.id,
      req.userId!,
      req.body.ranges,
    );
    res.json(ranges);
  } catch (err) {
    const message = (err as Error).message;
    if (message.startsWith('Forbidden') || message === 'Property not found') {
      res.status(message.startsWith('Forbidden') ? 403 : 404).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
}
