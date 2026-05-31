import { Router } from 'express';
import { geocodeAddress, searchNearby } from '../controllers/location.controller.js';
import { validateQuery } from '../validators/location.validator.js';
import { geocodeSchema, searchSchema } from '../validators/location.validator.js';

const router = Router();

// GET /api/locations/geocode?address=...
router.get('/geocode', validateQuery(geocodeSchema), geocodeAddress);

// GET /api/locations/search?lat=...&lng=...&radius=...
router.get('/search', validateQuery(searchSchema), searchNearby);

export default router;
