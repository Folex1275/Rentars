/**
 * Blockchain client module for Rentars.
 *
 * Exports typed clients for each Soroban contract, backed by their ABI files:
 *   - PropertyListingClient  ← apps/contracts/property_listing_abi.json
 *   - BookingClient          ← apps/contracts/booking_abi.json
 *   - ReviewClient           ← apps/contracts/review_abi.json
 *
 * Usage:
 *   import { BookingClient, PropertyListingClient, ReviewClient } from './blockchain/index.js';
 *
 *   const bookingClient = new BookingClient(
 *     process.env.BOOKING_CONTRACT_ID!,
 *     process.env.STELLAR_RPC_URL!,
 *   );
 *
 *   const booking = await bookingClient.getBooking(1n);
 */

export { BookingClient } from './bookingClient.js';
export { PropertyListingClient } from './propertyListingClient.js';
export { ReviewClient } from './reviewClient.js';
export type {
  Booking,
  BookingStatus,
  CreateBookingParams,
  CreateListingParams,
  ListingStatus,
  PropertyListing,
  Review,
  SubmitReviewParams,
  UpdateListingParams,
} from './types.js';
