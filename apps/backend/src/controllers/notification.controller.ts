import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notification.service.js';

export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await getNotifications(userId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function readNotification(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await markAsRead(req.params.id, userId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.status(204).send();
}

export async function readAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await markAllAsRead(userId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.status(204).send();
}
