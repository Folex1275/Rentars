/**
 * Booking service — business logic layer between the booking controller,
 * Supabase, and the on-chain BookingClient.
 *
 * Implemented as a class so the BlockchainServices dependency can be injected,
 * making the service testable without a live Stellar node.
 */

import { supabase } from '../config/supabase.js';
import type { ServiceResponse } from './index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Shape of a booking row as stored in Supabase.
 * Extend this interface as columns are added to the `bookings` table.
 */
export interface Booking {
  id: string;
  property_id?: string;
  tenant_id?: string;
  check_in?: string;
  check_out?: string;
  total_price?: number;
  status?: string;
  escrow_id?: string;
  on_chain_id?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Minimal interface for the blockchain services dependency.
 *
 * Keeping this as an interface (rather than importing BookingClient directly)
 * allows tests to inject a mock without touching the Stellar SDK.
 */
export interface BlockchainServices {
  /**
   * Check whether a date range is available for a property on-chain.
   *
   * @param propertyOnChainId - The on-chain u64 property ID.
   * @param checkIn - Unix timestamp (seconds).
   * @param checkOut - Unix timestamp (seconds).
   */
  checkAvailability(
    propertyOnChainId: bigint,
    checkIn: bigint,
    checkOut: bigint,
  ): Promise<boolean>;
}

// ─── Service class ────────────────────────────────────────────────────────────

export class BookingService {
  constructor(private readonly blockchainServices: BlockchainServices) {}

  /**
   * Retrieve a single booking by its Supabase row ID.
   *
   * @param id - UUID of the booking row.
   */
  async getBookingById(id: string): Promise<ServiceResponse<Booking>> {
    if (!id) {
      return { success: false, error: 'Booking ID is required' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: 'Booking not found' };
    }

    return { success: true, data: data as Booking };
  }

  /**
   * Create a new booking record in Supabase.
   *
   * If the booking payload includes an `on_chain_id` for the property, this
   * method also verifies availability on-chain before persisting. If the
   * blockchain check fails (e.g., node unreachable), the booking is still
   * created with a warning so the platform remains operational — the on-chain
   * contract itself is the authoritative guard against double-bookings.
   *
   * @param payload - Booking fields to insert.
   */
  async createBooking(payload: Partial<Booking>): Promise<ServiceResponse<Booking>> {
    if (!payload.property_id) {
      return { success: false, error: 'property_id is required' };
    }

    if (!payload.check_in || !payload.check_out) {
      return { success: false, error: 'check_in and check_out are required' };
    }

    if (!payload.total_price || payload.total_price <= 0) {
      return { success: false, error: 'total_price must be a positive number' };
    }

    const checkInDate = new Date(payload.check_in);
    const checkOutDate = new Date(payload.check_out);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return { success: false, error: 'check_in and check_out must be valid dates' };
    }

    if (checkInDate >= checkOutDate) {
      return { success: false, error: 'check_in must be before check_out' };
    }

    // Optional on-chain availability pre-check
    let warning: string | undefined;

    if (payload.on_chain_id !== undefined) {
      try {
        const checkInTs = BigInt(Math.floor(checkInDate.getTime() / 1000));
        const checkOutTs = BigInt(Math.floor(checkOutDate.getTime() / 1000));

        const available = await this.blockchainServices.checkAvailability(
          BigInt(payload.on_chain_id),
          checkInTs,
          checkOutTs,
        );

        if (!available) {
          return {
            success: false,
            error: 'Property is not available for the requested dates',
          };
        }
      } catch (err) {
        // Non-fatal: the on-chain contract enforces availability atomically.
        // Log and continue so the platform stays available if the RPC node is down.
        console.warn('[BookingService] On-chain availability check failed:', err);
        warning = 'On-chain availability check could not be completed; booking recorded pending confirmation';
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Booking, warning };
  }

  /**
   * Update an existing booking record.
   *
   * @param id - UUID of the booking row to update.
   * @param payload - Fields to update.
   */
  async updateBooking(
    id: string,
    payload: Partial<Booking>,
  ): Promise<ServiceResponse<Booking>> {
    if (!id) {
      return { success: false, error: 'Booking ID is required' };
    }

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No fields provided for update' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Booking };
  }

  /**
   * Delete a booking record.
   *
   * @param id - UUID of the booking row to delete.
   */
  async deleteBooking(id: string): Promise<ServiceResponse<void>> {
    if (!id) {
      return { success: false, error: 'Booking ID is required' };
    }

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
