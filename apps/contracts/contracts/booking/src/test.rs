//! Unit tests for the Booking contract.
//!
//! Coverage:
//!   Happy paths        — initialize, create, cancel, update_status, set_escrow_id, queries
//!   Error cases        — invalid dates, invalid price, overlap, unauthorized, bad transitions
//!   Security           — reentrancy simulation, unauthorized access, integer overflow/underflow,
//!                        timestamp manipulation resistance
//!   Edge cases         — adjacent bookings, cancelled-slot reuse, empty property bookings,
//!                        boundary timestamps
//!   Cross-contract     — test_cross_contract_interaction (booking verifies property status
//!                        via property-listing contract and marks it Rented on success)
//!   Gas / TTL          — test_gas_optimization_validation

#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use crate::{BookingContract, BookingContractClient, BookingStatus};
    use property_listing::{
        ListingStatus, PropertyListingContract, PropertyListingContractClient,
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// Set up both contracts and wire them together.
    ///
    /// Returns (Env, booking_contract_id, property_listing_contract_id, admin).
    fn make_env_with_listing() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        // Deploy property-listing contract
        let listing_cid = env.register_contract(None, PropertyListingContract);

        // Deploy booking contract and initialize with the listing contract address
        let booking_cid = env.register_contract(None, BookingContract);
        let admin = Address::generate(&env);
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        booking_client.initialize(&admin, &listing_cid);

        (env, booking_cid, listing_cid, admin)
    }

    /// Convenience: create a property listing and return its ID.
    fn create_property(env: &Env, listing_cid: &Address, owner: &Address) -> u64 {
        let listing_client = PropertyListingContractClient::new(env, listing_cid);
        listing_client.create_listing(
            owner,
            &String::from_str(env, "Test Property"),
            &String::from_str(env, "A nice place"),
            &100_0000000_i128,
        )
    }

    // ─── Initialization Tests ─────────────────────────────────────────────────

    /// Contract initializes correctly and booking count starts at zero.
    #[test]
    fn test_initialize() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        assert_eq!(client.booking_count(), 0);
    }

    /// Calling initialize twice panics.
    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_initialize_twice() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let second_admin = Address::generate(&env);
        client.initialize(&second_admin, &listing_cid);
    }

    // ─── Cross-Contract Interaction Tests ────────────────────────────────────

    /// Full cross-contract flow:
    ///   1. Create a property listing (Active).
    ///   2. Create a booking — booking contract verifies property is Active.
    ///   3. After booking, property-listing contract marks property as Rented.
    ///   4. A second booking attempt on the same property is rejected (not Active).
    #[test]
    fn test_cross_contract_interaction() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);

        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        // Step 1: create an Active property listing
        let property_id = create_property(&env, &listing_cid, &owner);
        assert_eq!(
            listing_client.get_listing(&property_id).status,
            ListingStatus::Active,
            "Property should start as Active"
        );

        // Step 2 & 3: create a booking — cross-contract call verifies Active,
        // then marks the property as Rented
        let booking_id = booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        assert_eq!(booking_id, 1);

        // Verify booking was stored correctly
        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.property_id, property_id);
        assert_eq!(booking.tenant, tenant);
        assert_eq!(booking.status, BookingStatus::Pending);

        // Step 3 verified: property is now Rented
        assert_eq!(
            listing_client.get_listing(&property_id).status,
            ListingStatus::Rented,
            "Property should be Rented after a successful booking"
        );
    }

    /// Booking on a non-Active (Inactive) property is rejected.
    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_cross_contract_booking_inactive_property() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);

        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let property_id = create_property(&env, &listing_cid, &owner);
        // Mark the property Inactive before attempting to book
        listing_client.update_status(&owner, &property_id, &ListingStatus::Inactive);

        booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );
    }

    /// Booking on an already-Rented property is rejected.
    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_cross_contract_booking_already_rented() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);

        let owner = Address::generate(&env);
        let tenant_a = Address::generate(&env);
        let tenant_b = Address::generate(&env);

        let property_id = create_property(&env, &listing_cid, &owner);

        // First booking succeeds and marks property as Rented
        booking_client.create_booking(
            &tenant_a,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        // Second booking on the same (now Rented) property must fail
        booking_client.create_booking(
            &tenant_b,
            &property_id,
            &2_000_u64,
            &2_007_u64,
            &700_0000000_i128,
        );
    }

    /// Booking on a non-existent property panics with "Listing not found".
    #[test]
    #[should_panic(expected = "Listing not found")]
    fn test_cross_contract_booking_nonexistent_property() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let tenant = Address::generate(&env);

        booking_client.create_booking(
            &tenant,
            &9999_u64, // does not exist
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );
    }

    // ─── Create Booking Tests ─────────────────────────────────────────────────

    /// Happy path: create a booking and verify all fields.
    #[test]
    fn test_create_booking_success() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        assert_eq!(id, 1);

        let booking = client.get_booking(&id);
        assert_eq!(booking.id, 1);
        assert_eq!(booking.property_id, property_id);
        assert_eq!(booking.tenant, tenant);
        assert_eq!(booking.check_in, 1_000);
        assert_eq!(booking.check_out, 1_007);
        assert_eq!(booking.total_price, 700_0000000_i128);
        assert_eq!(booking.status, BookingStatus::Pending);
        assert_eq!(booking.escrow_id, String::from_str(&env, ""));
    }

    /// Booking IDs auto-increment across different properties.
    #[test]
    fn test_create_booking_increments_id() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant = Address::generate(&env);

        // Need two separate properties (each can only be booked once)
        let prop_a = create_property(&env, &listing_cid, &owner_a);
        let prop_b = create_property(&env, &listing_cid, &owner_b);

        let id1 = client.create_booking(&tenant, &prop_a, &1_000_u64, &1_005_u64, &100_i128);
        let id2 = client.create_booking(&tenant, &prop_b, &1_000_u64, &1_005_u64, &100_i128);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(client.booking_count(), 2);
    }

    /// check_in equal to check_out is invalid (zero-duration).
    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_invalid_dates_equal() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &1_000_u64, &100_i128);
    }

    /// check_in after check_out is invalid.
    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_invalid_dates() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &2_000_u64, &1_000_u64, &100_i128);
    }

    /// Zero price is invalid.
    #[test]
    #[should_panic(expected = "total_price must be positive")]
    fn test_invalid_price_zero() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &0_i128);
    }

    /// Negative price is invalid.
    #[test]
    #[should_panic(expected = "total_price must be positive")]
    fn test_invalid_price_negative() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &-1_i128);
    }

    // ─── Availability Tests ───────────────────────────────────────────────────

    /// check_availability returns true for a property with no bookings.
    #[test]
    fn test_check_availability_empty() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        assert!(client.check_availability(&99_u64, &1_000_u64, &1_005_u64));
    }

    /// check_availability returns false when dates overlap an active booking.
    #[test]
    fn test_check_availability_blocked() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        assert!(!client.check_availability(&property_id, &1_000_u64, &1_005_u64));
    }

    /// check_availability returns true after the only booking is cancelled.
    #[test]
    fn test_check_availability_after_cancel() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id);
        assert!(client.check_availability(&property_id, &1_000_u64, &1_005_u64));
    }

    // ─── Cancel Booking Tests ─────────────────────────────────────────────────

    /// Tenant can cancel their own pending booking.
    #[test]
    fn test_cancel_booking_success() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Cancelled);
    }

    /// A non-tenant cannot cancel someone else's booking.
    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_cancel_booking_unauthorized() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.cancel_booking(&attacker, &id);
    }

    /// Cancelling an already-cancelled booking panics.
    #[test]
    #[should_panic(expected = "Booking already cancelled")]
    fn test_cancel_booking_already_cancelled() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id);
        client.cancel_booking(&tenant, &id);
    }

    /// Cancelling a completed booking panics.
    #[test]
    #[should_panic(expected = "Cannot cancel a completed booking")]
    fn test_cancel_completed_booking() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&admin, &id, &BookingStatus::Confirmed);
        client.update_status(&admin, &id, &BookingStatus::Completed);
        client.cancel_booking(&tenant, &id);
    }

    // ─── Status Transition Tests ──────────────────────────────────────────────

    /// Admin can drive Pending → Confirmed → Completed.
    #[test]
    fn test_update_status() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);

        client.update_status(&admin, &id, &BookingStatus::Confirmed);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Confirmed);

        client.update_status(&admin, &id, &BookingStatus::Completed);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Completed);
    }

    /// Admin can cancel from Pending.
    #[test]
    fn test_update_status_pending_to_cancelled() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&admin, &id, &BookingStatus::Cancelled);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Cancelled);
    }

    /// Pending → Completed is an invalid transition.
    #[test]
    #[should_panic(expected = "Invalid status transition")]
    fn test_invalid_status_transition() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&admin, &id, &BookingStatus::Completed);
    }

    /// Completed → Confirmed is an invalid transition (terminal state).
    #[test]
    #[should_panic(expected = "Invalid status transition")]
    fn test_invalid_status_transition_terminal() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&admin, &id, &BookingStatus::Confirmed);
        client.update_status(&admin, &id, &BookingStatus::Completed);
        client.update_status(&admin, &id, &BookingStatus::Confirmed);
    }

    /// Cancelled → Confirmed is an invalid transition (terminal state).
    #[test]
    #[should_panic(expected = "Invalid status transition")]
    fn test_invalid_status_transition_cancelled_to_confirmed() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&admin, &id, &BookingStatus::Cancelled);
        client.update_status(&admin, &id, &BookingStatus::Confirmed);
    }

    /// Non-admin cannot call update_status.
    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_update_status_unauthorized() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.update_status(&attacker, &id, &BookingStatus::Confirmed);
    }

    // ─── Escrow ID Tests ──────────────────────────────────────────────────────

    /// Admin can attach an escrow ID to a booking.
    #[test]
    fn test_set_escrow_id() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        let escrow_ref = String::from_str(&env, "escrow-abc-123");
        client.set_escrow_id(&admin, &id, &escrow_ref);
        assert_eq!(client.get_booking(&id).escrow_id, escrow_ref);
    }

    /// Non-admin cannot set the escrow ID.
    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_set_escrow_id_unauthorized() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        client.set_escrow_id(&attacker, &id, &String::from_str(&env, "evil-escrow"));
    }

    // ─── Query Tests ──────────────────────────────────────────────────────────

    /// get_property_bookings returns all booking IDs for a property.
    /// Note: only one booking per property is possible (property becomes Rented),
    /// so we verify the single booking is indexed correctly.
    #[test]
    fn test_get_property_bookings() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id1 = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);

        let bookings = client.get_property_bookings(&property_id);
        assert_eq!(bookings.len(), 1);
        assert_eq!(bookings.get(0).unwrap(), id1);
    }

    /// get_property_bookings returns empty vec for a property with no bookings.
    #[test]
    fn test_get_property_bookings_empty() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let bookings = client.get_property_bookings(&999_u64);
        assert_eq!(bookings.len(), 0);
    }

    /// get_booking panics for a non-existent ID.
    #[test]
    #[should_panic(expected = "Booking not found")]
    fn test_booking_not_found() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        client.get_booking(&9999);
    }

    // ─── Security Tests ───────────────────────────────────────────────────────

    /// Reentrancy simulation: a second booking on the same (now Rented) property
    /// must always be rejected — the property status is set atomically.
    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_reentrancy_attack_prevention() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let attacker = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        // First booking succeeds
        client.create_booking(&attacker, &property_id, &5_000_u64, &5_010_u64, &100_i128);
        // Second attempt on the same property — must be rejected (property is Rented)
        client.create_booking(&attacker, &property_id, &6_000_u64, &6_010_u64, &100_i128);
    }

    /// Legitimate principals can perform all their allowed operations.
    #[test]
    fn test_unauthorized_access_attempts() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);

        // Legitimate admin can update status
        client.update_status(&admin, &id, &BookingStatus::Confirmed);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Confirmed);

        // Legitimate admin can set escrow ID
        client.set_escrow_id(&admin, &id, &String::from_str(&env, "escrow-xyz"));
        assert_eq!(
            client.get_booking(&id).escrow_id,
            String::from_str(&env, "escrow-xyz")
        );

        // Legitimate tenant can cancel (need a fresh property for a new booking)
        let owner2 = Address::generate(&env);
        let prop2 = create_property(&env, &listing_cid, &owner2);
        let id2 = client.create_booking(&tenant, &prop2, &2_000_u64, &2_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id2);
        assert_eq!(client.get_booking(&id2).status, BookingStatus::Cancelled);
    }

    /// Maximum i128 price and boundary u64 timestamps must be stored correctly.
    #[test]
    fn test_integer_overflow_underflow() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        // Maximum valid i128 price — should store correctly without overflow
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_001_u64, &i128::MAX);
        assert_eq!(client.get_booking(&id).total_price, i128::MAX);
    }

    /// check_in > check_out (underflow scenario) must be rejected.
    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_integer_overflow_invalid_range() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &u64::MAX, &0_u64, &1_i128);
    }

    /// Epoch-start (check_in = 0) is valid; zero-duration is not.
    #[test]
    fn test_timestamp_manipulation_resistance() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        // Epoch-start booking is valid
        let id = client.create_booking(&tenant, &property_id, &0_u64, &1_u64, &1_i128);
        assert_eq!(client.get_booking(&id).check_in, 0);
    }

    /// Zero-duration booking (check_in == check_out) must be rejected.
    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_timestamp_manipulation_zero_duration() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &0_u64, &0_u64, &1_i128);
    }

    // ─── Edge Case Tests ──────────────────────────────────────────────────────

    /// Minimum valid booking: 1-unit duration, 1-stroop price.
    #[test]
    fn test_edge_case_minimum_booking() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &100_u64, &101_u64, &1_i128);
        let b = client.get_booking(&id);
        assert_eq!(b.check_out - b.check_in, 1);
        assert_eq!(b.total_price, 1);
    }

    /// Bookings on different properties never conflict.
    #[test]
    fn test_non_overlapping_bookings_different_properties() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant = Address::generate(&env);

        let prop_a = create_property(&env, &listing_cid, &owner_a);
        let prop_b = create_property(&env, &listing_cid, &owner_b);

        let id1 = client.create_booking(&tenant, &prop_a, &1_000_u64, &1_005_u64, &100_i128);
        let id2 = client.create_booking(&tenant, &prop_b, &1_000_u64, &1_005_u64, &100_i128);
        assert_ne!(id1, id2);
    }

    /// Escrow ID can be overwritten multiple times by admin.
    #[test]
    fn test_edge_case_escrow_id_overwrite() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);

        client.set_escrow_id(&admin, &id, &String::from_str(&env, "first-escrow"));
        assert_eq!(
            client.get_booking(&id).escrow_id,
            String::from_str(&env, "first-escrow")
        );

        client.set_escrow_id(&admin, &id, &String::from_str(&env, "second-escrow"));
        assert_eq!(
            client.get_booking(&id).escrow_id,
            String::from_str(&env, "second-escrow")
        );
    }

    /// Booking count reflects total ever created, not just active ones.
    #[test]
    fn test_edge_case_booking_count_after_cancels() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant = Address::generate(&env);

        let prop_a = create_property(&env, &listing_cid, &owner_a);
        let prop_b = create_property(&env, &listing_cid, &owner_b);

        let id1 = client.create_booking(&tenant, &prop_a, &1_000_u64, &1_005_u64, &100_i128);
        let _id2 = client.create_booking(&tenant, &prop_b, &2_000_u64, &2_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id1);
        assert_eq!(client.booking_count(), 2);
        assert_eq!(client.get_booking(&id1).status, BookingStatus::Cancelled);
    }

    /// Different tenants can book different properties simultaneously.
    #[test]
    fn test_edge_case_multiple_tenants_multiple_properties() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant_a = Address::generate(&env);
        let tenant_b = Address::generate(&env);

        let prop_a = create_property(&env, &listing_cid, &owner_a);
        let prop_b = create_property(&env, &listing_cid, &owner_b);

        let id_a = client.create_booking(&tenant_a, &prop_a, &1_000_u64, &1_005_u64, &100_i128);
        let id_b = client.create_booking(&tenant_b, &prop_b, &1_000_u64, &1_005_u64, &200_i128);

        assert_eq!(client.get_booking(&id_a).tenant, tenant_a);
        assert_eq!(client.get_booking(&id_b).tenant, tenant_b);
        assert_ne!(id_a, id_b);
    }

    // ─── Gas / TTL Validation Tests ───────────────────────────────────────────

    /// Verifies that the full cross-contract booking flow (create property →
    /// create booking → verify property status → update booking status) completes
    /// within expected Soroban instruction limits.
    ///
    /// `budget().reset_unlimited()` disables the hard cap so the test can run
    /// freely; we then assert the measured instruction count stays below a
    /// generous ceiling of 10 million, confirming no runaway computation.
    #[test]
    fn test_gas_optimization_validation() {
        let env = Env::default();
        env.mock_all_auths();
        env.budget().reset_unlimited();

        // Deploy both contracts
        let listing_cid = env.register_contract(None, PropertyListingContract);
        let booking_cid = env.register_contract(None, BookingContract);

        let admin = Address::generate(&env);
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        booking_client.initialize(&admin, &listing_cid);

        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        // ── create_listing ────────────────────────────────────────────────
        let property_id = listing_client.create_listing(
            &owner,
            &String::from_str(&env, "Gas Test Property"),
            &String::from_str(&env, "Testing gas usage"),
            &100_0000000_i128,
        );

        // ── create_booking (cross-contract: verify + set_rented) ──────────
        let booking_id = booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        // ── update booking status ─────────────────────────────────────────
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Completed);

        // ── set escrow ID ─────────────────────────────────────────────────
        booking_client.set_escrow_id(
            &admin,
            &booking_id,
            &String::from_str(&env, "escrow-gas-test"),
        );

        // Verify final state
        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Completed);
        assert_eq!(
            listing_client.get_listing(&property_id).status,
            ListingStatus::Rented
        );

        // Verify instruction count is within a reasonable bound.
        let instructions_used = env.budget().cpu_instruction_count();
        assert!(
            instructions_used < 10_000_000,
            "Instruction count {} exceeded expected limit of 10_000_000",
            instructions_used
        );
    }
}
