import type { Request, Response } from 'express';
import { searchPropertiesByQuery } from '@/services/propertySearch.service.js';

export async function searchPropertiesEndpoint(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.status(422).json({ error: 'q is required' });
    return;
  }

  const result = await searchPropertiesByQuery(q);
  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

