import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { listNotifications, readNotification, readAllNotifications } from '../controllers/notification.controller.js';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, listNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, readNotification);

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, readAllNotifications);

export default router;
