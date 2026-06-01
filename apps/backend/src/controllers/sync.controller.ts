import type { Request, Response } from 'express';
import {
  syncAllBookings,
  syncAllProperties,
  syncBookingFromChain,
  syncPropertyFromChain,
} from '@/services/sync.service.js';

export async function syncPropertyHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await syncPropertyFromChain(id);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ message: `Property ${id} synced successfully` });
}

export async function syncBookingHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await syncBookingFromChain(id);

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ message: `Booking ${id} synced successfully` });
}

export async function syncAllPropertiesHandler(_req: Request, res: Response): Promise<void> {
  const result = await syncAllProperties();

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ message: 'All properties synced', ...result.data });
}

export async function syncAllBookingsHandler(_req: Request, res: Response): Promise<void> {
  const result = await syncAllBookings();

  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ message: 'All bookings synced', ...result.data });
}
