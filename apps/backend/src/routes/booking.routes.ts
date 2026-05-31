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

// GET /api/v1/bookings/:id
router.get('/:id', authenticate, getBooking);

// POST /api/v1/bookings
router.post('/', authenticate, validateBody(createBookingSchema), createBooking);

// PATCH /api/v1/bookings/:id
router.patch('/:id', authenticate, validateBody(updateBookingSchema), updateBooking);

// DELETE /api/v1/bookings/:id
router.delete('/:id', authenticate, deleteBooking);

export default router;
