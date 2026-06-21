import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware.js';
import * as calendarController from '@/controllers/calendar.controller.js';

const router = Router();

// Public endpoints
router.get('/:propertyId/month', calendarController.getCalendarMonth);
router.get('/:propertyId/check', calendarController.checkAvailability);
router.get('/:propertyId/price', calendarController.getRangePrice);
router.get('/:propertyId/availability', calendarController.getAvailability);

// Host-only endpoints
router.get('/:propertyId/seasons', calendarController.getSeasonalRates);
router.post('/:propertyId/seasons', authenticate, calendarController.createSeasonalRate);
router.delete('/:propertyId/seasons/:pricingId', authenticate, calendarController.deleteSeasonalRate);

router.post('/:propertyId/events', authenticate, calendarController.createEvent);
router.delete('/:propertyId/events/:eventId', authenticate, calendarController.deleteEvent);

export default router;
