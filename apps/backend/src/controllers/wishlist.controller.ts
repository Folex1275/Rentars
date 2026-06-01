import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { addToWishlist, removeFromWishlist, getWishlist } from '../services/wishlist.service.js';

export async function listWishlist(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await getWishlist(userId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.json(result.data);
}

export async function addWishlist(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await addToWishlist(userId, req.params.propertyId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.status(201).json({ message: 'Added to wishlist' });
}

export async function removeWishlist(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const result = await removeFromWishlist(userId, req.params.propertyId);
  if (!result.success) { res.status(400).json({ error: result.error }); return; }
  res.status(204).send();
}
