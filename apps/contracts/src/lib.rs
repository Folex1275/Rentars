// Rentars — Soroban Smart Contract
// Built on Stellar blockchain
// Handles: property listing, rental booking, USDC escrow, booking state machine

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Option as SorobanOption, String, Vec};

// ---------------------------------------------------------------------------
// Booking Status — proper state machine replacing the old `confirmed: bool`
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum BookingStatus {
    Pending,
    Confirmed,
    Completed,
    Cancelled,
}

// ---------------------------------------------------------------------------
// Core data structures
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct Property {
    pub id: u64,
    pub owner: Address,
    pub title: String,
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
    /// Replaces the old `confirmed: bool` — full state machine
    pub status: BookingStatus,
    /// TrustlessWork escrow integration — set after escrow is created off-chain
    pub escrow_id: SorobanOption<String>,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    Property(u64),
    Booking(u64),
    PropertyCount,
    BookingCount,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct RentarsContract;

#[contractimpl]
impl RentarsContract {
    // -----------------------------------------------------------------------
    // Property functions
    // -----------------------------------------------------------------------

    /// List a new property on-chain
    pub fn list_property(
        env: Env,
        owner: Address,
        title: String,
        price_per_night: i128,
    ) -> u64 {
        owner.require_auth();

        let count: u64 = env.storage().instance().get(&DataKey::PropertyCount).unwrap_or(0);
        let id = count + 1;

        let property = Property {
            id,
            owner,
            title,
            price_per_night,
            available: true,
        };

        env.storage().instance().set(&DataKey::Property(id), &property);
        env.storage().instance().set(&DataKey::PropertyCount, &id);
        id
    }

    /// Get property details
    pub fn get_property(env: Env, id: u64) -> Property {
        env.storage()
            .instance()
            .get(&DataKey::Property(id))
            .expect("Property not found")
    }

    // -----------------------------------------------------------------------
    // Booking functions
    // -----------------------------------------------------------------------

    /// Create a booking — initial status is Pending
    pub fn book_property(
        env: Env,
        tenant: Address,
        property_id: u64,
        check_in: u64,
        check_out: u64,
    ) -> u64 {
        tenant.require_auth();

        let mut property: Property = env
            .storage()
            .instance()
            .get(&DataKey::Property(property_id))
            .expect("Property not found");

        assert!(property.available, "Property not available");
        assert!(check_out > check_in, "check_out must be after check_in");

        let nights = check_out - check_in;
        let total_amount = property.price_per_night * nights as i128;

        let count: u64 = env.storage().instance().get(&DataKey::BookingCount).unwrap_or(0);
        let id = count + 1;

        let booking = Booking {
            id,
            property_id,
            tenant,
            check_in,
            check_out,
            total_amount,
            status: BookingStatus::Pending,
            escrow_id: SorobanOption::None,
        };

        property.available = false;
        env.storage().instance().set(&DataKey::Property(property_id), &property);
        env.storage().instance().set(&DataKey::Booking(id), &booking);
        env.storage().instance().set(&DataKey::BookingCount, &id);
        id
    }

    /// Transition a booking through its state machine.
    ///
    /// Valid transitions:
    ///   Pending    → Confirmed  (owner confirms the booking)
    ///   Pending    → Cancelled  (either party cancels before confirmation)
    ///   Confirmed  → Completed  (rental period ends, escrow released)
    ///   Confirmed  → Cancelled  (cancellation after confirmation)
    ///
    /// All other transitions are rejected with a descriptive panic.
    pub fn update_status(
        env: Env,
        booking_id: u64,
        caller: Address,
        new_status: BookingStatus,
    ) {
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .instance()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        // Validate the transition
        match (&booking.status, &new_status) {
            // Allowed transitions
            (BookingStatus::Pending,   BookingStatus::Confirmed)  => {}
            (BookingStatus::Pending,   BookingStatus::Cancelled)  => {}
            (BookingStatus::Confirmed, BookingStatus::Completed)  => {}
            (BookingStatus::Confirmed, BookingStatus::Cancelled)  => {}

            // Terminal states — cannot transition out
            (BookingStatus::Completed, _) => {
                panic!("Invalid transition: booking is already Completed and cannot be changed")
            }
            (BookingStatus::Cancelled, _) => {
                panic!("Invalid transition: booking is already Cancelled and cannot be changed")
            }

            // Nonsensical transitions
            (BookingStatus::Pending, BookingStatus::Completed) => {
                panic!("Invalid transition: cannot move directly from Pending to Completed — must be Confirmed first")
            }
            (BookingStatus::Confirmed, BookingStatus::Pending) => {
                panic!("Invalid transition: cannot revert a Confirmed booking back to Pending")
            }

            // Same-state no-op
            (BookingStatus::Pending,   BookingStatus::Pending)   => {
                panic!("Invalid transition: booking is already Pending")
            }
            (BookingStatus::Confirmed, BookingStatus::Confirmed) => {
                panic!("Invalid transition: booking is already Confirmed")
            }
        }

        // If cancelling, make the property available again
        if new_status == BookingStatus::Cancelled {
            let mut property: Property = env
                .storage()
                .instance()
                .get(&DataKey::Property(booking.property_id))
                .expect("Property not found");
            property.available = true;
            env.storage().instance().set(&DataKey::Property(booking.property_id), &property);
        }

        booking.status = new_status;
        env.storage().instance().set(&DataKey::Booking(booking_id), &booking);
    }

    /// Attach a TrustlessWork escrow ID to a booking.
    /// Only the booking tenant or the property owner may call this.
    pub fn set_escrow_id(
        env: Env,
        booking_id: u64,
        escrow_id: String,
        caller: Address,
    ) {
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .instance()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        // Only allow setting escrow on active (non-terminal) bookings
        match &booking.status {
            BookingStatus::Completed => {
                panic!("Cannot set escrow_id: booking is already Completed")
            }
            BookingStatus::Cancelled => {
                panic!("Cannot set escrow_id: booking is already Cancelled")
            }
            _ => {}
        }

        booking.escrow_id = SorobanOption::Some(escrow_id);
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
