import type { Request, Response } from 'express';
import { LocationService } from '@/services/location.service.js';

const locationService = new LocationService();

export async function geocodeAddress(req: Request, res: Response): Promise<void> {
  const { address } = req.query;

  const result = await locationService.geocode(address as string);

  if (!result.success) {
    res.status(result.statusCode || 400).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function searchNearby(req: Request, res: Response): Promise<void> {
  const { lat, lng, radius } = req.query;

  const result = await locationService.searchNearby(
    parseFloat(lat as string),
    parseFloat(lng as string),
    parseFloat(radius as string),
  );

  if (!result.success) {
    res.status(result.statusCode || 400).json({ error: result.error });
    return;
  }

  res.json(result.data);
}
