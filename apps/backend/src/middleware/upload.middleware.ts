import type { Request, Response, NextFunction } from 'express';
import { uploadImage } from '../config/supabase-storage.js';

export async function uploadPropertyImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const propertyId = req.params.id;
    const publicUrl = await uploadImage(propertyId, req.file);

    res.json({ url: publicUrl });
  } catch (error) {
    next(error);
  }
}
