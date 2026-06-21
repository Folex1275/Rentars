import { Router } from 'express';
import {
  geocodeAddress,
  searchNearby,
  getPriceComparison,
} from '@/controllers/location.controller.js';
import { validateQuery, geocodeSchema, searchSchema } from '@/validators/location.validator.js';

const router = Router();

// GET /api/v1/locations/geocode?address=...
router.get('/geocode', validateQuery(geocodeSchema), geocodeAddress);

// GET /api/v1/locations/search?lat=...&lng=...&radius=...
router.get('/search', validateQuery(searchSchema), searchNearby);

// GET /api/v1/locations/price-comparison?lat=...&lng=...&radius=...
router.get('/price-comparison', validateQuery(searchSchema), getPriceComparison);

export default router;
