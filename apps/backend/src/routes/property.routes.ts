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

// GET /api/properties?city=&country=&min_price=&max_price=&...
router.get('/', getProperties);

// GET /api/properties/:id
router.get('/:id', getProperty);

// POST /api/properties
router.post('/', authenticate, createPropertyHandler);

// PUT /api/properties/:id
router.put('/:id', authenticate, updatePropertyHandler);

// DELETE /api/properties/:id
router.delete('/:id', authenticate, deletePropertyHandler);

// POST /api/properties/:id/images - Upload property image
router.post('/:id/images', authenticate, upload.single('image'), uploadPropertyImage);

// DELETE /api/properties/:id/images/:imageId - Delete property image
router.delete('/:id/images/:imageId', authenticate, async (req, res) => {
  try {
    const { deleteImage } = await import('../config/supabase-storage.js');
    await deleteImage(req.params.imageId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
