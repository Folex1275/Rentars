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

router.get('/', getProperties);
router.get('/:id', getProperty);
router.post('/', authenticate, createPropertyHandler);
router.put('/:id', authenticate, updatePropertyHandler);
router.delete('/:id', authenticate, deletePropertyHandler);

export default router;
