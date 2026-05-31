import { Router } from 'express';
import {
  syncAllBookingsHandler,
  syncAllPropertiesHandler,
  syncBookingHandler,
  syncPropertyHandler,
} from '../controllers/sync.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All sync endpoints require admin authentication
router.post('/property/:id', authenticate, syncPropertyHandler);
router.post('/booking/:id', authenticate, syncBookingHandler);
router.post('/properties', authenticate, syncAllPropertiesHandler);
router.post('/bookings', authenticate, syncAllBookingsHandler);

export default router;
