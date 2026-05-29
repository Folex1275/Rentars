/**
 * Shared TypeScript types derived from the Soroban contract ABIs.
 *
 * These types mirror the on-chain structs and enums defined in:
 *   - apps/contracts/booking_abi.json
 *   - apps/contracts/property_listing_abi.json
 *   - apps/contracts/review_abi.json
 *
 * Keep in sync with the ABI files whenever contracts are updated.
 */

// ─── Property Listing Types ───────────────────────────────────────────────────

/** Mirrors BookingStatus enum in booking_abi.json */
export type ListingStatus = 'Active' | 'Inactive' | 'Rented';

/** Mirrors PropertyListing struct in property_listing_abi.json */
export interface PropertyListing {
  id: bigint;
  owner: string; // Stellar address
  title: string;
  description: string;
  /** Nightly price in USDC stroops (1 USDC = 10_000_000 stroops) */
  price_per_night: bigint;
  status: ListingStatus;
}

// ─── Booking Types ────────────────────────────────────────────────────────────

/** Mirrors BookingStatus enum in booking_abi.json */
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

/** Mirrors Booking struct in booking_abi.json */
export interface Booking {
  id: bigint;
  property_id: bigint;
  tenant: string; // Stellar address
  /** Unix timestamp (seconds) */
  check_in: bigint;
  /** Unix timestamp (seconds) */
  check_out: bigint;
  /** Total price in USDC stroops */
  total_price: bigint;
  status: BookingStatus;
  /** Off-chain escrow reference. Empty string until set by admin. */
  escrow_id: string;
}

// ─── Review Types ─────────────────────────────────────────────────────────────

/** Mirrors Review struct in review_abi.json */
export interface Review {
  id: bigint;
  reviewee: string; // Stellar address
  reviewer: string; // Stellar address
  /** Rating value between 1 and 5 inclusive */
  rating: number;
  comment: string;
  /** Ledger timestamp at submission time (Unix seconds) */
  timestamp: bigint;
}

// ─── Input Parameter Types ────────────────────────────────────────────────────

/** Parameters for PropertyListingClient.createListing() */
export interface CreateListingParams {
  owner: string;
  title: string;
  description: string;
  price_per_night: bigint;
}

/** Parameters for PropertyListingClient.updateListing() */
export interface UpdateListingParams {
  caller: string;
  id: bigint;
  title: string;
  description: string;
  price_per_night: bigint;
}

/** Parameters for BookingClient.createBooking() */
export interface CreateBookingParams {
  tenant: string;
  property_id: bigint;
  check_in: bigint;
  check_out: bigint;
  total_price: bigint;
}

/** Parameters for ReviewClient.submitReview() */
export interface SubmitReviewParams {
  reviewer: string;
  reviewee: string;
  rating: number;
  comment: string;
}
