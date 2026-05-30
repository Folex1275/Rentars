import { Router } from 'express';
import {
  createPropertyHandler,
  deletePropertyHandler,
  getProperties,
  getProperty,
  updatePropertyHandler,
} from '../controllers/property.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/properties?city=&country=&min_price=&max_price=&amenities=&...
router.get('/', validateQuery(propertySearchSchema), getProperties);

// GET /api/properties/featured
router.get('/featured', getFeatured);

// GET /api/properties/:id
router.get('/:id', getProperty);
router.post('/', authenticate, createPropertyHandler);
router.put('/:id', authenticate, updatePropertyHandler);
router.delete('/:id', authenticate, deletePropertyHandler);

// PUT /api/properties/:id/availability  (owner sets blocked date ranges)
const availabilityRangeSchema = z.object({
  ranges: z.array(
    z.object({
      start_date: z.string().date('start_date must be a valid ISO date'),
      end_date: z.string().date('end_date must be a valid ISO date'),
    }),
  ),
});

router.put(
  '/:id/availability',
  authenticate,
  validateBody(availabilityRangeSchema),
  setAvailability,
);

export default router;
