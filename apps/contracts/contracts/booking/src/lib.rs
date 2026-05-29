//! Booking Contract for Rentars
//!
//! Manages rental bookings with overlap prevention, status transitions,
//! escrow ID tracking, and per-property booking indexes.
//!
//! ## Cross-Contract Integration
//!
//! `create_booking` performs two cross-contract calls against the
//! `property-listing` contract (whose address is stored at initialization):
//!
//! 1. **Verify availability** — calls `get_listing(property_id)` and asserts
//!    the returned status is `ListingStatus::Active`. Bookings on inactive or
//!    already-rented properties are rejected.
//! 2. **Mark as rented** — after persisting the booking, calls `set_rented(id)`
//!    on the property-listing contract to atomically flip the property status to
//!    `Rented`, preventing double-bookings across contract boundaries.
//!
//! ## Storage TTL Strategy
//!
//! All persistent storage entries use TTL (time-to-live) extensions to prevent
//! ledger entry expiry on Stellar's state-expiration model:
//!
//! - **TTL_MIN** (100 ledgers): Minimum remaining TTL before an extension fires.
//! - **TTL_EXTEND_TO** (100 ledgers): Target TTL applied on every write.
//!
//! Every write to persistent storage is immediately followed by `extend_ttl`.
//! This applies to:
//!   - Individual `Booking(id)` entries (on create and every status change)
//!   - `BookingCount` counter (on every increment)
//!   - `PropertyBookings(property_id)` index (on every append)
//!
//! For production, TTL_EXTEND_TO should be tuned to the platform's activity
//! cadence (e.g., 17,280 ledgers ≈ 1 day at 5 s/ledger).

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, vec, Address, Env, String, Vec};

// Import the property-listing contract's client and types for cross-contract calls.
use property_listing::{ListingStatus, PropertyListingContractClient};

// ─── TTL Constants ────────────────────────────────────────────────────────────

/// Minimum TTL threshold before an extension is triggered (in ledgers).
const TTL_MIN: u32 = 100;
/// Target TTL to extend entries to on every write (in ledgers).
const TTL_EXTEND_TO: u32 = 100;

// ─── Data Types ──────────────────────────────────────────────────────────────

/// Lifecycle status of a booking.
#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum BookingStatus {
    Pending,
    Confirmed,
    Cancelled,
    Completed,
}

/// A rental booking stored on-chain.
#[contracttype]
#[derive(Clone)]
pub struct Booking {
    pub id: u64,
    pub property_id: u64,
    pub tenant: Address,
    pub check_in: u64,  // Unix timestamp (seconds)
    pub check_out: u64, // Unix timestamp (seconds)
    pub total_price: i128,
    pub status: BookingStatus,
    pub escrow_id: String, // off-chain escrow reference (empty until set)
}

/// Storage keys.
#[contracttype]
pub enum DataKey {
    /// Initialized flag
    Initialized,
    /// Admin address
    Admin,
    /// Address of the property-listing contract (set at initialization)
    PropertyListingContractId,
    /// Individual booking by ID
    Booking(u64),
    /// Total bookings ever created
    BookingCount,
    /// List of booking IDs for a given property
    PropertyBookings(u64),
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct BookingContract;

#[contractimpl]
impl BookingContract {
    // ── Lifecycle ────────────────────────────────────────────────────────────

    /// Initialize the contract with an admin address and the address of the
    /// deployed property-listing contract.
    ///
    /// Must be called exactly once. Panics if already initialized.
    pub fn initialize(env: Env, admin: Address, property_listing_contract_id: Address) {
        admin.require_auth();

        assert!(
            !env.storage()
                .instance()
                .has(&DataKey::Initialized),
            "Already initialized"
        );

        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PropertyListingContractId, &property_listing_contract_id);
    }

    // ── Bookings ─────────────────────────────────────────────────────────────

    /// Create a new booking for a property.
    ///
    /// Validates:
    /// - check_in < check_out
    /// - total_price > 0
    /// - Property exists in the property-listing contract and has `Active` status
    /// - No overlapping booking exists for the same property
    ///
    /// After persisting the booking, calls `set_rented` on the property-listing
    /// contract to mark the property as `Rented`.
    ///
    /// Returns the new booking ID.
    pub fn create_booking(
        env: Env,
        tenant: Address,
        property_id: u64,
        check_in: u64,
        check_out: u64,
        total_price: i128,
    ) -> u64 {
        tenant.require_auth();

        // ── Input validation ──────────────────────────────────────────────
        assert!(check_in < check_out, "check_in must be before check_out");
        assert!(total_price > 0, "total_price must be positive");

        // ── Cross-contract: verify property exists and is Active ──────────
        let listing_contract_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::PropertyListingContractId)
            .expect("Contract not initialized");

        let listing_client = PropertyListingContractClient::new(&env, &listing_contract_id);
        let listing = listing_client.get_listing(&property_id);

        assert!(
            listing.status == ListingStatus::Active,
            "Property is not available for booking"
        );

        // ── Overlap prevention ────────────────────────────────────────────
        let property_bookings: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PropertyBookings(property_id))
            .unwrap_or(vec![&env]);

        for i in 0..property_bookings.len() {
            let bid = property_bookings.get(i).unwrap();
            let existing: Booking = env
                .storage()
                .persistent()
                .get(&DataKey::Booking(bid))
                .unwrap();

            // Skip cancelled bookings — they free up the dates
            if existing.status == BookingStatus::Cancelled {
                continue;
            }

            // Overlap iff NOT (check_out <= existing.check_in OR check_in >= existing.check_out)
            let overlaps =
                !(check_out <= existing.check_in || check_in >= existing.check_out);
            assert!(!overlaps, "Booking dates overlap with an existing booking");
        }

        // ── Persist booking ───────────────────────────────────────────────
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::BookingCount)
            .unwrap_or(0);
        let id = count + 1;

        let booking = Booking {
            id,
            property_id,
            tenant,
            check_in,
            check_out,
            total_price,
            status: BookingStatus::Pending,
            escrow_id: String::from_str(&env, ""),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Booking(id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(id), TTL_MIN, TTL_EXTEND_TO);

        env.storage()
            .persistent()
            .set(&DataKey::BookingCount, &id);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::BookingCount, TTL_MIN, TTL_EXTEND_TO);

        // Append to property index
        let mut bookings = property_bookings;
        bookings.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::PropertyBookings(property_id), &bookings);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::PropertyBookings(property_id), TTL_MIN, TTL_EXTEND_TO);

        // ── Cross-contract: mark property as Rented ───────────────────────
        listing_client.set_rented(&property_id);

        id
    }

    /// Cancel a booking.
    ///
    /// Only the tenant who created the booking may cancel it.
    /// Panics if the booking is already cancelled or completed.
    pub fn cancel_booking(env: Env, caller: Address, booking_id: u64) {
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        assert!(booking.tenant == caller, "Unauthorized");
        assert!(
            booking.status != BookingStatus::Cancelled,
            "Booking already cancelled"
        );
        assert!(
            booking.status != BookingStatus::Completed,
            "Cannot cancel a completed booking"
        );

        booking.status = BookingStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Update the status of a booking.
    ///
    /// Enforces valid transitions:
    ///   Pending    → Confirmed | Cancelled
    ///   Confirmed  → Completed | Cancelled
    ///   Cancelled  → (terminal — no transitions)
    ///   Completed  → (terminal — no transitions)
    ///
    /// Only the admin may drive status transitions (except cancel, which is tenant-driven).
    pub fn update_status(
        env: Env,
        caller: Address,
        booking_id: u64,
        new_status: BookingStatus,
    ) {
        caller.require_auth();

        // Only admin may call update_status
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        assert!(caller == admin, "Unauthorized");

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        // Validate transition
        let valid = match (&booking.status, &new_status) {
            (BookingStatus::Pending, BookingStatus::Confirmed) => true,
            (BookingStatus::Pending, BookingStatus::Cancelled) => true,
            (BookingStatus::Confirmed, BookingStatus::Completed) => true,
            (BookingStatus::Confirmed, BookingStatus::Cancelled) => true,
            _ => false,
        };
        assert!(valid, "Invalid status transition");

        booking.status = new_status;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Attach an off-chain escrow reference to a booking.
    ///
    /// Only the admin may set the escrow ID.
    pub fn set_escrow_id(
        env: Env,
        caller: Address,
        booking_id: u64,
        escrow_id: String,
    ) {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        assert!(caller == admin, "Unauthorized");

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        booking.escrow_id = escrow_id;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Retrieve a booking by ID.
    pub fn get_booking(env: Env, id: u64) -> Booking {
        env.storage()
            .persistent()
            .get(&DataKey::Booking(id))
            .expect("Booking not found")
    }

    /// Return all booking IDs for a given property.
    pub fn get_property_bookings(env: Env, property_id: u64) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::PropertyBookings(property_id))
            .unwrap_or(vec![&env])
    }

    /// Check whether a date range is available for a property (no active overlap).
    pub fn check_availability(
        env: Env,
        property_id: u64,
        check_in: u64,
        check_out: u64,
    ) -> bool {
        let property_bookings: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PropertyBookings(property_id))
            .unwrap_or(vec![&env]);

        for i in 0..property_bookings.len() {
            let bid = property_bookings.get(i).unwrap();
            let existing: Booking = env
                .storage()
                .persistent()
                .get(&DataKey::Booking(bid))
                .unwrap();

            if existing.status == BookingStatus::Cancelled {
                continue;
            }

            let overlaps =
                !(check_out <= existing.check_in || check_in >= existing.check_out);
            if overlaps {
                return false;
            }
        }
        true
    }

    /// Return the total number of bookings ever created.
    pub fn booking_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::BookingCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
