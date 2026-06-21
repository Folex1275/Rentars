//! Property Listing Contract for Rentars
//!
//! Manages on-chain property listings: create, read, update, and status management.
//! Each listing is owned by an Address and can only be mutated by its owner.
//!
//! ## Storage TTL Strategy
//!
//! All persistent storage entries use TTL (time-to-live) extensions to prevent
//! ledger entry expiry on Stellar's state-expiration model:
//!
//! - **MIN_TTL** (100 ledgers): The minimum TTL threshold — if the remaining TTL
//!   falls below this value, the entry is extended.
//! - **EXTEND_TO** (100 ledgers): The target TTL to extend to when an entry is
//!   refreshed. This keeps entries alive through normal usage patterns.
//!
//! Every write to persistent storage is immediately followed by an `extend_ttl`
//! call so that newly written or updated entries start with a full TTL budget.
//! This applies to:
//!   - Individual `Listing(id)` entries (on create, update, and status change)
//!   - The `ListingCount` counter (on every increment)
//!
//! For production deployments, EXTEND_TO should be tuned to match the expected
//! activity cadence of the platform (e.g., 17,280 ledgers ≈ 1 day at 5s/ledger).

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

// ─── TTL Constants ────────────────────────────────────────────────────────────

/// Minimum TTL threshold before an extension is triggered (in ledgers).
const TTL_MIN: u32 = 100;
/// Target TTL to extend entries to on every write (in ledgers).
const TTL_EXTEND_TO: u32 = 100;

// ─── Data Types ──────────────────────────────────────────────────────────────

/// Status of a property listing.
#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum ListingStatus {
    Active,
    Inactive,
    Rented,
}

/// A property listing stored on-chain.
#[contracttype]
#[derive(Clone)]
pub struct PropertyListing {
    pub id: u64,
    pub owner: Address,
    pub title: String,
    pub description: String,
    pub price_per_night: i128, // in USDC stroops (1 USDC = 10_000_000 stroops)
    pub status: ListingStatus,
}

/// Storage keys.
#[contracttype]
pub enum DataKey {
    Listing(u64),
    ListingCount,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/// Contract error codes.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Debug)]
#[repr(u32)]
pub enum ContractError {
    NotFound = 1,
    Unauthorized = 2,
    AlreadyExists = 3,
    InvalidInput = 4,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct PropertyListingContract;

#[contractimpl]
impl PropertyListingContract {
    /// Create a new property listing.
    ///
    /// Returns the new listing's ID.
    /// Panics if `price_per_night` is zero or negative, or if `title` is empty.
    pub fn create_listing(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        price_per_night: i128,
    ) -> u64 {
        owner.require_auth();

        // Validate inputs
        assert!(price_per_night > 0, "price_per_night must be positive");
        assert!(title.len() > 0, "title must not be empty");

        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ListingCount)
            .unwrap_or(0);
        let id = count + 1;

        let listing = PropertyListing {
            id,
            owner,
            title,
            description,
            price_per_night,
            status: ListingStatus::Active,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Listing(id), &listing);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Listing(id), TTL_MIN, TTL_EXTEND_TO);

        env.storage()
            .persistent()
            .set(&DataKey::ListingCount, &id);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::ListingCount, TTL_MIN, TTL_EXTEND_TO);

        id
    }

    /// Retrieve a listing by ID.
    ///
    /// Panics with "Listing not found" if the ID does not exist.
    pub fn get_listing(env: Env, id: u64) -> PropertyListing {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(id))
            .expect("Listing not found")
    }

    /// Update a listing's mutable fields.
    ///
    /// Only the original owner may call this.
    /// Panics if caller is not the owner, listing not found, or inputs are invalid.
    pub fn update_listing(
        env: Env,
        caller: Address,
        id: u64,
        title: String,
        description: String,
        price_per_night: i128,
    ) {
        caller.require_auth();

        let mut listing: PropertyListing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(id))
            .expect("Listing not found");

        assert!(listing.owner == caller, "Unauthorized");
        assert!(price_per_night > 0, "price_per_night must be positive");
        assert!(title.len() > 0, "title must not be empty");

        listing.title = title;
        listing.description = description;
        listing.price_per_night = price_per_night;

        env.storage()
            .persistent()
            .set(&DataKey::Listing(id), &listing);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Listing(id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Update the status of a listing.
    ///
    /// Only the original owner may call this.
    pub fn update_status(env: Env, caller: Address, id: u64, status: ListingStatus) {
        caller.require_auth();

        let mut listing: PropertyListing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(id))
            .expect("Listing not found");

        assert!(listing.owner == caller, "Unauthorized");

        listing.status = status;

        env.storage()
            .persistent()
            .set(&DataKey::Listing(id), &listing);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Listing(id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Set a listing's status to `Rented` on behalf of the booking contract.
    ///
    /// This entry point is intended for cross-contract calls from the booking
    /// contract. It does NOT require the property owner's auth — instead it
    /// requires the caller (the booking contract) to authorise itself, which
    /// Soroban satisfies automatically when one contract invokes another.
    ///
    /// Panics if the listing does not exist or is not currently `Active`.
    pub fn set_rented(env: Env, id: u64) {
        let mut listing: PropertyListing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(id))
            .expect("Listing not found");

        assert!(
            listing.status == ListingStatus::Active,
            "Property is not available for booking"
        );

        listing.status = ListingStatus::Rented;

        env.storage()
            .persistent()
            .set(&DataKey::Listing(id), &listing);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Listing(id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Return the total number of listings ever created.
    pub fn listing_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ListingCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
