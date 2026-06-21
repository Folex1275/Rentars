#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token::TokenClient, vec, Address, Env, MuxedAddress,
    String, Vec,
};

use property_listing::{ListingStatus, PropertyListingContractClient};

// ─── TTL Constants ────────────────────────────────────────────────────────────

const TTL_MIN: u32 = 100;
const TTL_EXTEND_TO: u32 = 100;

// ─── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum BookingStatus {
    Pending,
    Confirmed,
    Cancelled,
    Completed,
    Disputed,
}

#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum EscrowStatus {
    NotFunded,
    Funded,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Booking {
    pub id: u64,
    pub property_id: u64,
    pub tenant: Address,
    pub property_owner: Address,
    pub check_in: u64,
    pub check_out: u64,
    pub total_price: i128,
    pub status: BookingStatus,
    pub escrow_id: String,
    pub escrow_status: EscrowStatus,
}

#[contracttype]
pub enum DataKey {
    Initialized,
    Admin,
    PropertyListingContractId,
    TokenAddress,
    Booking(u64),
    BookingCount,
    PropertyBookings(u64),
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct BookingContract;

#[contractimpl]
impl BookingContract {
    // ── Lifecycle ────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address, property_listing_contract_id: Address) {
        admin.require_auth();

        assert!(
            !env.storage().instance().has(&DataKey::Initialized),
            "Already initialized"
        );

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PropertyListingContractId, &property_listing_contract_id);
    }

    /// Set the USDC token contract address for on-chain escrow.
    /// Only the admin may call this.
    pub fn set_token_address(env: Env, caller: Address, token_address: Address) {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        assert!(caller == admin, "Unauthorized");

        env.storage()
            .instance()
            .set(&DataKey::TokenAddress, &token_address);
    }

    /// Return the configured USDC token contract address.
    pub fn get_token_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("Token address not set")
    }

    // ── Bookings ─────────────────────────────────────────────────────────────

    pub fn create_booking(
        env: Env,
        tenant: Address,
        property_id: u64,
        check_in: u64,
        check_out: u64,
        total_price: i128,
    ) -> u64 {
        tenant.require_auth();

        assert!(check_in < check_out, "check_in must be before check_out");
        assert!(total_price > 0, "total_price must be positive");

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
            assert!(!overlaps, "Booking dates overlap with an existing booking");
        }

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
            property_owner: listing.owner,
            check_in,
            check_out,
            total_price,
            status: BookingStatus::Pending,
            escrow_id: String::from_str(&env, ""),
            escrow_status: EscrowStatus::NotFunded,
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

        let mut bookings = property_bookings;
        bookings.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::PropertyBookings(property_id), &bookings);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::PropertyBookings(property_id), TTL_MIN, TTL_EXTEND_TO);

        listing_client.set_rented(&property_id);

        id
    }

    pub fn cancel_booking(env: Env, caller: Address, booking_id: u64) {
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");

        assert!(
            caller == booking.tenant || caller == admin,
            "Unauthorized"
        );
        assert!(
            booking.status != BookingStatus::Cancelled,
            "Booking already cancelled"
        );
        assert!(
            booking.status != BookingStatus::Completed,
            "Cannot cancel a completed booking"
        );
        assert!(
            booking.status != BookingStatus::Disputed,
            "Cannot cancel a disputed booking"
        );

        if booking.escrow_status == EscrowStatus::Funded {
            let token_address: Address = env
                .storage()
                .instance()
                .get(&DataKey::TokenAddress)
                .expect("Token address not set");
            let token_client = TokenClient::new(&env, &token_address);
            let to_muxed: MuxedAddress = booking.tenant.clone().into();
            token_client.transfer(&env.current_contract_address(), &to_muxed, &booking.total_price);
            booking.escrow_status = EscrowStatus::Refunded;
        }

        booking.status = BookingStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    pub fn update_status(
        env: Env,
        caller: Address,
        booking_id: u64,
        new_status: BookingStatus,
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

        let valid = match (&booking.status, &new_status) {
            (BookingStatus::Pending, BookingStatus::Confirmed) => true,
            (BookingStatus::Pending, BookingStatus::Cancelled) => true,
            (BookingStatus::Confirmed, BookingStatus::Completed) => true,
            (BookingStatus::Confirmed, BookingStatus::Cancelled) => true,
            (BookingStatus::Disputed, BookingStatus::Completed) => true,
            (BookingStatus::Disputed, BookingStatus::Cancelled) => true,
            _ => false,
        };
        assert!(valid, "Invalid status transition");

        let token_address: Option<Address> = env.storage().instance().get(&DataKey::TokenAddress);

        if let Some(ref addr) = token_address {
            let token_client = TokenClient::new(&env, addr);

            match (&new_status, &booking.escrow_status) {
                (BookingStatus::Confirmed, EscrowStatus::Funded) => {
                    let to_muxed: MuxedAddress = booking.property_owner.clone().into();
                    token_client.transfer(
                        &env.current_contract_address(),
                        &to_muxed,
                        &booking.total_price,
                    );
                    booking.escrow_status = EscrowStatus::Released;
                }
                (BookingStatus::Cancelled, EscrowStatus::Funded) => {
                    let to_muxed: MuxedAddress = booking.tenant.clone().into();
                    token_client.transfer(
                        &env.current_contract_address(),
                        &to_muxed,
                        &booking.total_price,
                    );
                    booking.escrow_status = EscrowStatus::Refunded;
                }
                _ => {}
            }
        }

        booking.status = new_status;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

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

    // ── Escrow Functions ─────────────────────────────────────────────────────

    /// Fund the escrow for a booking by transferring USDC from the tenant to
    /// the contract. The tenant must have sufficient USDC balance and must
    /// authorize the transaction.
    pub fn fund_escrow(env: Env, tenant: Address, booking_id: u64) {
        tenant.require_auth();

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        assert!(
            booking.tenant == tenant,
            "Unauthorized: caller is not the tenant"
        );
        assert!(
            booking.status == BookingStatus::Pending,
            "Booking must be in Pending state to fund escrow"
        );
        assert!(
            booking.escrow_status == EscrowStatus::NotFunded,
            "Escrow already funded"
        );

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("Token address not set");

        let token_client = TokenClient::new(&env, &token_address);
        let to_muxed: MuxedAddress = env.current_contract_address().into();
        token_client.transfer(&tenant, &to_muxed, &booking.total_price);

        booking.escrow_status = EscrowStatus::Funded;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Dispute a funded booking. Only the tenant may start a dispute.
    pub fn dispute_booking(env: Env, tenant: Address, booking_id: u64) {
        tenant.require_auth();

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .expect("Booking not found");

        assert!(
            booking.tenant == tenant,
            "Unauthorized: caller is not the tenant"
        );
        assert!(
            booking.status == BookingStatus::Pending
                || booking.status == BookingStatus::Confirmed,
            "Booking must be Pending or Confirmed to dispute"
        );
        assert!(
            booking.escrow_status == EscrowStatus::Funded,
            "Only funded bookings can be disputed"
        );

        booking.status = BookingStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    /// Resolve a disputed booking. Admin decides whether to release escrowed
    /// funds to the property owner (true) or refund the tenant (false).
    pub fn resolve_dispute(
        env: Env,
        caller: Address,
        booking_id: u64,
        release_to_owner: bool,
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

        assert!(
            booking.status == BookingStatus::Disputed,
            "Booking is not in dispute"
        );
        assert!(
            booking.escrow_status == EscrowStatus::Funded,
            "Escrow must be funded to resolve"
        );

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .expect("Token address not set");

        let token_client = TokenClient::new(&env, &token_address);
        let to_muxed: MuxedAddress = if release_to_owner {
            booking.property_owner.clone().into()
        } else {
            booking.tenant.clone().into()
        };

        token_client.transfer(
            &env.current_contract_address(),
            &to_muxed,
            &booking.total_price,
        );

        if release_to_owner {
            booking.escrow_status = EscrowStatus::Released;
            booking.status = BookingStatus::Completed;
        } else {
            booking.escrow_status = EscrowStatus::Refunded;
            booking.status = BookingStatus::Cancelled;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id), &booking);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Booking(booking_id), TTL_MIN, TTL_EXTEND_TO);
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    pub fn get_booking(env: Env, id: u64) -> Booking {
        env.storage()
            .persistent()
            .get(&DataKey::Booking(id))
            .expect("Booking not found")
    }

    pub fn get_property_bookings(env: Env, property_id: u64) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::PropertyBookings(property_id))
            .unwrap_or(vec![&env])
    }

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

    pub fn booking_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::BookingCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
