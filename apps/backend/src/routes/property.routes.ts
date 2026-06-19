import { Router } from 'express';
import {
  createPropertyHandler,
  deletePropertyHandler,
  getProperties,
  getProperty,
  updatePropertyHandler,
} from '@/controllers/property.controller.js';
import {
  uploadImage,
  listImages,
  deleteImage,
  reorderImages,
  setAsPrimary,
} from '@/controllers/propertyImage.controller.js';
import { searchPropertiesEndpoint } from '@/controllers/propertySearch.controller.js';
import {
  getAvailability,
  addAvailabilityBlock,
  removeAvailabilityBlock,
} from '@/controllers/availability.controller.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { upload } from '@/middleware/multer.js';

const router = Router();

// GET /api/v1/properties
router.get('/', getProperties);

// GET /api/v1/properties/search?q=...
router.get('/search', searchPropertiesEndpoint);

// GET /api/v1/properties/:id
router.get('/:id', getProperty);

// POST /api/v1/properties
router.post('/', authenticate, createPropertyHandler);

// PUT /api/v1/properties/:id
router.put('/:id', authenticate, updatePropertyHandler);

// DELETE /api/v1/properties/:id
router.delete('/:id', authenticate, deletePropertyHandler);

// ── Image management ───────────────────────────────────────────────────────────

// GET /api/v1/properties/:id/images
router.get('/:id/images', listImages);

// POST /api/v1/properties/:id/images
router.post('/:id/images', authenticate, upload.single('image'), uploadImage);

// DELETE /api/v1/properties/:id/images/:imageId
router.delete('/:id/images/:imageId', authenticate, deleteImage);

// PATCH /api/v1/properties/:id/images/:imageId/primary
router.patch('/:id/images/:imageId/primary', authenticate, setAsPrimary);

// PUT /api/v1/properties/:id/images/reorder
router.put('/:id/images/reorder', authenticate, reorderImages);

// ── Availability management ────────────────────────────────────────────────────

// GET /api/v1/properties/:id/availability
router.get('/:id/availability', getAvailability);

// POST /api/v1/properties/:id/availability
router.post('/:id/availability', authenticate, addAvailabilityBlock);

// DELETE /api/v1/properties/:id/availability/:rangeId
router.delete('/:id/availability/:rangeId', authenticate, removeAvailabilityBlock);

export default router;

