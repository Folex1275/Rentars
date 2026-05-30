import type { Request, Response } from 'express';
import { BookingClient } from '../blockchain/bookingClient.js';
import { BookingService } from '../services/booking.service.js';

// ─── Service instantiation ────────────────────────────────────────────────────
//
// The BookingClient satisfies the BlockchainServices interface required by
// BookingService. Both contract ID and RPC URL are read from environment
// variables so they can be swapped per environment without code changes.
//
// If the env vars are absent the client is still constructed — read calls will
// fail at runtime, but the service degrades gracefully (warning path).

const bookingClient = new BookingClient(
  process.env.BOOKING_CONTRACT_ID || '',
  process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
);

const bookingService = new BookingService(bookingClient);

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function getBooking(req: Request, res: Response): Promise<void> {
  const result = await bookingService.getBookingById(req.params.id);

  if (!result.success) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const result = await bookingService.createBooking(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const response: Record<string, unknown> = { ...result.data };
  if (result.warning) {
    response.warning = result.warning;
  }

  res.status(201).json(response);
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const result = await bookingService.updateBooking(req.params.id, req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function deleteBooking(req: Request, res: Response): Promise<void> {
  const result = await bookingService.deleteBooking(req.params.id);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(204).send();
}
