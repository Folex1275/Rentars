import { Router } from 'express';
import {
  createBooking,
  deleteBooking,
  getBooking,
  updateBooking,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createBookingSchema,
  updateBookingSchema,
  validateBody,
} from '../validators/booking.validator.js';

const router = Router();

// All booking routes require authentication
router.get('/:id', authenticate, getBooking);
router.post('/', authenticate, validateBody(createBookingSchema), createBooking);
router.patch('/:id', authenticate, validateBody(updateBookingSchema), updateBooking);
router.delete('/:id', authenticate, deleteBooking);

export default router;
