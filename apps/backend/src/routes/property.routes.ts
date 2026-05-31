import { Router } from 'express';
import {
  createPropertyHandler,
  deletePropertyHandler,
  getProperties,
  getProperty,
  updatePropertyHandler,
} from '../controllers/property.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.js';
import { uploadPropertyImage } from '../middleware/upload.middleware.js';

const router = Router();

// GET /api/v1/properties
router.get('/', getProperties);

// GET /api/v1/properties/:id
router.get('/:id', getProperty);

// POST /api/v1/properties
router.post('/', authenticate, createPropertyHandler);

// PUT /api/v1/properties/:id
router.put('/:id', authenticate, updatePropertyHandler);

// DELETE /api/v1/properties/:id
router.delete('/:id', authenticate, deletePropertyHandler);

export default router;
