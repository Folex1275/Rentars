// Rentars — Soroban Smart Contract scaffold
// Built on Stellar blockchain
// Handles: property listing, rental booking, USDC escrow

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct PropertyListing {
    pub id: u64,
    pub owner: Address,
    pub data_hash: String,
    pub price_per_night: i128, // in USDC stroops
    pub available: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Booking {
    pub id: u64,
    pub property_id: u64,
    pub tenant: Address,
    pub check_in: u64,
    pub check_out: u64,
    pub total_amount: i128,
    pub confirmed: bool,
}

#[contracttype]
pub enum DataKey {
    Property(u64),
    Booking(u64),
    BookingCount,
}

#[contract]
pub struct RentarsContract;

#[contractimpl]
impl RentarsContract {
    /// Create a new property listing on-chain.
    ///
    /// `data_hash` is the SHA-256 hash (hex-encoded) of the off-chain property
    /// JSON stored in Supabase. The hash is the only integrity anchor on-chain;
    /// titles, descriptions, photos, etc. live off-chain.
    pub fn create_listing(
        env: Env,
        id: u64,
        data_hash: String,
        owner: Address,
        price_per_night: i128,
    ) {
        owner.require_auth();

        assert!(
            !env.storage().instance().has(&DataKey::Property(id)),
            "Listing already exists"
        );

        let listing = PropertyListing {
            id,
            owner,
            data_hash,
            price_per_night,
            available: true,
        };

        env.storage().instance().set(&DataKey::Property(id), &listing);
    }

    /// Update the `data_hash` of an existing listing. Only the recorded `owner`
    /// can update; the supplied `owner` must match the on-chain owner and must
    /// authorise the transaction.
    pub fn update_listing(env: Env, id: u64, data_hash: String, owner: Address) {
        owner.require_auth();

        let mut listing: PropertyListing = env
            .storage()
            .instance()
            .get(&DataKey::Property(id))
            .expect("Listing not found");

        assert!(listing.owner == owner, "Unauthorized: caller is not the listing owner");

        listing.data_hash = data_hash;
        env.storage().instance().set(&DataKey::Property(id), &listing);
    }

    /// Return the full on-chain `PropertyListing` for `id`.
    pub fn get_listing(env: Env, id: u64) -> PropertyListing {
        env.storage()
            .instance()
            .get(&DataKey::Property(id))
            .expect("Listing not found")
    }

    /// Create a booking and lock USDC in escrow
    pub fn book_property(
        env: Env,
        tenant: Address,
        property_id: u64,
        check_in: u64,
        check_out: u64,
    ) -> u64 {
        tenant.require_auth();

        let mut listing: PropertyListing = env
            .storage()
            .instance()
            .get(&DataKey::Property(property_id))
            .expect("Listing not found");

        assert!(listing.available, "Property not available");

        let nights = check_out - check_in;
        let total_amount = listing.price_per_night * nights as i128;

        let count: u64 = env.storage().instance().get(&DataKey::BookingCount).unwrap_or(0);
        let id = count + 1;

        let booking = Booking {
            id,
            property_id,
            tenant,
            check_in,
            check_out,
            total_amount,
            confirmed: false,
        };

        listing.available = false;
        env.storage().instance().set(&DataKey::Property(property_id), &listing);
        env.storage().instance().set(&DataKey::Booking(id), &booking);
        env.storage().instance().set(&DataKey::BookingCount, &id);
        id
    }

    /// Confirm rental completion and release escrow to owner
    pub fn confirm_rental(env: Env, booking_id: u64, caller: Address) {
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .instance()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        assert!(!booking.confirmed, "Already confirmed");
        booking.confirmed = true;
        env.storage().instance().set(&DataKey::Booking(booking_id), &booking);
    }

    /// Get booking details
    pub fn get_booking(env: Env, id: u64) -> Booking {
        env.storage()
            .instance()
            .get(&DataKey::Booking(id))
            .expect("Booking not found")
    }
}
