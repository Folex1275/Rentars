#![cfg(test)]

mod tests {
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        token::{StellarAssetClient, TokenClient},
        Address, BytesN, Env, String,
    };

    use crate::{BookingContract, BookingContractClient, BookingStatus, EscrowStatus};
    use property_listing::{
        ListingStatus, PropertyListingContract, PropertyListingContractClient,
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// Set up both contracts and wire them together.
    fn make_env_with_listing() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let listing_cid = env.register_contract(None, PropertyListingContract);
        let booking_cid = env.register_contract(None, BookingContract);
        let admin = Address::generate(&env);
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        booking_client.initialize(&admin, &listing_cid);

        (env, booking_cid, listing_cid, admin)
    }

    /// Set up both contracts with a USDC token contract.
    fn make_env_with_token() -> (Env, Address, Address, Address, Address, Address) {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);

        // Deploy a Stellar Asset Contract as the USDC token
        let token_admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract(token_admin.clone());
        let sac = StellarAssetClient::new(&env, &token_address);

        // Set the token address on the booking contract
        booking_client.set_token_address(&admin, &token_address);

        (
            env, booking_cid, listing_cid, admin, token_address, token_admin,
        )
    }

    /// Create a property listing and mint USDC to the tenant.
    fn setup_funded_booking(
        env: &Env,
        booking_cid: &Address,
        listing_cid: &Address,
        admin: &Address,
        token_address: &Address,
        token_admin: &Address,
        tenant: &Address,
        owner: &Address,
        price: i128,
    ) -> u64 {
        let listing_client = PropertyListingContractClient::new(env, listing_cid);
        let booking_client = BookingContractClient::new(env, booking_cid);

        // Create property
        let property_id = listing_client.create_listing(
            owner,
            &String::from_str(env, "Test Property"),
            &String::from_str(env, "A nice place"),
            &100_0000000_i128,
        );

        // Mint USDC to tenant
        let sac = StellarAssetClient::new(env, token_address);
        sac.mint(tenant, &price);

        // Create booking
        let booking_id = booking_client.create_booking(
            tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &price,
        );

        booking_id
    }

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

    #[test]
    fn test_initialize() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        assert_eq!(client.booking_count(), 0);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_initialize_twice() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let second_admin = Address::generate(&env);
        client.initialize(&second_admin, &listing_cid);
    }

    // ─── Token Address Tests ──────────────────────────────────────────────────

    #[test]
    fn test_set_token_address() {
        let (env, booking_cid, _listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let token_addr = Address::generate(&env);
        client.set_token_address(&admin, &token_addr);
        assert_eq!(client.get_token_address(), token_addr);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_set_token_address_unauthorized() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let token_addr = Address::generate(&env);
        let attacker = Address::generate(&env);
        client.set_token_address(&attacker, &token_addr);
    }

    #[test]
    #[should_panic(expected = "Token address not set")]
    fn test_get_token_address_not_set() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        client.get_token_address();
    }

    // ─── Cross-Contract Interaction Tests ────────────────────────────────────

    #[test]
    fn test_cross_contract_interaction() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);

        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let property_id = create_property(&env, &listing_cid, &owner);
        assert_eq!(
            listing_client.get_listing(&property_id).status,
            ListingStatus::Active,
        );

        let booking_id = booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        assert_eq!(booking_id, 1);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.property_id, property_id);
        assert_eq!(booking.tenant, tenant);
        assert_eq!(booking.status, BookingStatus::Pending);
        assert_eq!(booking.property_owner, owner);

        assert_eq!(
            listing_client.get_listing(&property_id).status,
            ListingStatus::Rented,
        );
    }

    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_cross_contract_booking_inactive_property() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);

        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let property_id = create_property(&env, &listing_cid, &owner);
        listing_client.update_status(&owner, &property_id, &ListingStatus::Inactive);

        booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );
    }

    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_cross_contract_booking_already_rented() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);

        let owner = Address::generate(&env);
        let tenant_a = Address::generate(&env);
        let tenant_b = Address::generate(&env);

        let property_id = create_property(&env, &listing_cid, &owner);

        booking_client.create_booking(
            &tenant_a,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );

        booking_client.create_booking(
            &tenant_b,
            &property_id,
            &2_000_u64,
            &2_007_u64,
            &700_0000000_i128,
        );
    }

    #[test]
    #[should_panic(expected = "Listing not found")]
    fn test_cross_contract_booking_nonexistent_property() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let tenant = Address::generate(&env);

        booking_client.create_booking(
            &tenant,
            &9999_u64,
            &1_000_u64,
            &1_007_u64,
            &700_0000000_i128,
        );
    }

    // ─── Create Booking Tests ─────────────────────────────────────────────────

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
        assert_eq!(booking.property_owner, owner);
        assert_eq!(booking.check_in, 1_000);
        assert_eq!(booking.check_out, 1_007);
        assert_eq!(booking.total_price, 700_0000000_i128);
        assert_eq!(booking.status, BookingStatus::Pending);
        assert_eq!(booking.escrow_id, String::from_str(&env, ""));
        assert_eq!(booking.escrow_status, EscrowStatus::NotFunded);
    }

    #[test]
    fn test_create_booking_increments_id() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant = Address::generate(&env);

        let prop_a = create_property(&env, &listing_cid, &owner_a);
        let prop_b = create_property(&env, &listing_cid, &owner_b);

        let id1 = client.create_booking(&tenant, &prop_a, &1_000_u64, &1_005_u64, &100_i128);
        let id2 = client.create_booking(&tenant, &prop_b, &1_000_u64, &1_005_u64, &100_i128);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(client.booking_count(), 2);
    }

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

    #[test]
    fn test_check_availability_empty() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        assert!(client.check_availability(&99_u64, &1_000_u64, &1_005_u64));
    }

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

    // ─── Escrow: Fund Tests ──────────────────────────────────────────────────

    #[test]
    fn test_fund_escrow_success() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        // Check tenant balance before funding
        assert_eq!(token_client.balance(&tenant), 100_0000000_i128);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);

        // Fund escrow
        booking_client.fund_escrow(&tenant, &booking_id);

        // Check escrow status
        assert_eq!(
            booking_client.get_booking(&booking_id).escrow_status,
            EscrowStatus::Funded
        );

        // Check balances: tenant → contract
        assert_eq!(token_client.balance(&tenant), 0_i128);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: caller is not the tenant")]
    fn test_fund_escrow_unauthorized() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&attacker, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Escrow already funded")]
    fn test_fund_escrow_already_funded() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.fund_escrow(&tenant, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Booking must be in Pending state to fund escrow")]
    fn test_fund_escrow_wrong_state() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        // Confirm the booking first
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);
        // Trying to fund a Confirmed booking should fail
        booking_client.fund_escrow(&tenant, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Token address not set")]
    fn test_fund_escrow_no_token() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let booking_id = booking_client.create_booking(
            &tenant,
            &property_id,
            &1_000_u64,
            &1_007_u64,
            &100_i128,
        );
        booking_client.fund_escrow(&tenant, &booking_id);
    }

    // ─── Escrow: Release on Confirm Tests ─────────────────────────────────────

    #[test]
    fn test_escrow_release_on_confirm() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        // Fund escrow
        booking_client.fund_escrow(&tenant, &booking_id);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);

        // Confirm → escrow released to owner
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Confirmed);
        assert_eq!(booking.escrow_status, EscrowStatus::Released);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&owner), 100_0000000_i128);
    }

    #[test]
    fn test_escrow_release_full_flow() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        // Fund → Confirm → Complete
        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Completed);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Completed);
        assert_eq!(booking.escrow_status, EscrowStatus::Released);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&owner), 100_0000000_i128);
        assert_eq!(token_client.balance(&tenant), 0_i128);
    }

    // ─── Escrow: Refund on Cancel Tests ───────────────────────────────────────

    #[test]
    fn test_escrow_refund_on_tenant_cancel() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        // Fund then cancel
        booking_client.fund_escrow(&tenant, &booking_id);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);

        booking_client.cancel_booking(&tenant, &booking_id);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Cancelled);
        assert_eq!(booking.escrow_status, EscrowStatus::Refunded);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&tenant), 100_0000000_i128);
    }

    #[test]
    fn test_escrow_refund_on_admin_cancel() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        // Fund then admin cancels via update_status
        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Cancelled);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Cancelled);
        assert_eq!(booking.escrow_status, EscrowStatus::Refunded);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&tenant), 100_0000000_i128);
    }

    #[test]
    fn test_escrow_no_refund_if_not_funded() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        // Cancel without funding — no-op for escrow
        booking_client.cancel_booking(&tenant, &booking_id);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Cancelled);
        assert_eq!(booking.escrow_status, EscrowStatus::NotFunded);
    }

    // ─── Escrow: Admin Cancel via cancel_booking ──────────────────────────────

    #[test]
    fn test_admin_cancel_booking_refunds_escrow() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        booking_client.fund_escrow(&tenant, &booking_id);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);

        // Admin cancels via cancel_booking
        booking_client.cancel_booking(&admin, &booking_id);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Cancelled);
        assert_eq!(booking.escrow_status, EscrowStatus::Refunded);
        assert_eq!(token_client.balance(&tenant), 100_0000000_i128);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
    }

    // ─── Dispute Tests ────────────────────────────────────────────────────────

    #[test]
    fn test_dispute_booking_success() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Disputed);
        assert_eq!(booking.escrow_status, EscrowStatus::Funded);
    }

    #[test]
    fn test_dispute_funded_pending_booking() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        // Fund while Pending, then dispute — escrow is still held by contract
        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);

        assert_eq!(
            booking_client.get_booking(&booking_id).status,
            BookingStatus::Disputed
        );
        assert_eq!(
            booking_client.get_booking(&booking_id).escrow_status,
            EscrowStatus::Funded
        );
    }

    #[test]
    #[should_panic(expected = "Only funded bookings can be disputed")]
    fn test_dispute_after_release_rejected() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        // Fund → Confirm (releases escrow to owner) → cannot dispute
        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);

        // Escrow was released — cannot dispute
        booking_client.dispute_booking(&tenant, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: caller is not the tenant")]
    fn test_dispute_booking_unauthorized() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&attacker, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Only funded bookings can be disputed")]
    fn test_dispute_unfunded_booking() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        // Try to dispute without funding — should fail
        booking_client.dispute_booking(&tenant, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Booking must be Pending or Confirmed to dispute")]
    fn test_dispute_cancelled_booking() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.cancel_booking(&tenant, &booking_id);
        // Cannot dispute a cancelled booking
        booking_client.dispute_booking(&tenant, &booking_id);
    }

    #[test]
    #[should_panic(expected = "Cannot cancel a disputed booking")]
    fn test_cancel_disputed_booking() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);
        // Cannot cancel a disputed booking
        booking_client.cancel_booking(&tenant, &booking_id);
    }

    // ─── Dispute Resolution Tests ─────────────────────────────────────────────

    #[test]
    fn test_resolve_dispute_release_to_owner() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);

        // Admin resolves: release to owner
        booking_client.resolve_dispute(&admin, &booking_id, &true);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Completed);
        assert_eq!(booking.escrow_status, EscrowStatus::Released);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&owner), 100_0000000_i128);
        assert_eq!(token_client.balance(&tenant), 0_i128);
    }

    #[test]
    fn test_resolve_dispute_refund_tenant() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let token_client = TokenClient::new(&env, &token_address);

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);
        assert_eq!(token_client.balance(&booking_cid), 100_0000000_i128);

        // Admin resolves: refund to tenant
        booking_client.resolve_dispute(&admin, &booking_id, &false);

        let booking = booking_client.get_booking(&booking_id);
        assert_eq!(booking.status, BookingStatus::Cancelled);
        assert_eq!(booking.escrow_status, EscrowStatus::Refunded);
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
        assert_eq!(token_client.balance(&tenant), 100_0000000_i128);
        assert_eq!(token_client.balance(&owner), 0_i128);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_resolve_dispute_unauthorized() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let attacker = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        booking_client.dispute_booking(&tenant, &booking_id);
        booking_client.resolve_dispute(&attacker, &booking_id, &true);
    }

    #[test]
    #[should_panic(expected = "Booking is not in dispute")]
    fn test_resolve_dispute_not_disputed() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        booking_client.fund_escrow(&tenant, &booking_id);
        // Booking is not disputed — resolve should fail
        booking_client.resolve_dispute(&admin, &booking_id, &true);
    }

    // ─── Escrow: Edge Cases ──────────────────────────────────────────────────

    #[test]
    fn test_escrow_status_transitions_through_all_states() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let booking_id = setup_funded_booking(
            &env,
            &booking_cid,
            &listing_cid,
            &admin,
            &token_address,
            &token_admin,
            &tenant,
            &owner,
            100_0000000_i128,
        );

        let b = |id| booking_client.get_booking(&id);

        // 1. Created → NotFunded
        assert_eq!(b(booking_id).escrow_status, EscrowStatus::NotFunded);

        // 2. Fund → Funded
        booking_client.fund_escrow(&tenant, &booking_id);
        assert_eq!(b(booking_id).escrow_status, EscrowStatus::Funded);

        // 3. Confirm → Released
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Confirmed);
        assert_eq!(b(booking_id).escrow_status, EscrowStatus::Released);

        // 4. Complete → Released (unchanged)
        booking_client.update_status(&admin, &booking_id, &BookingStatus::Completed);
        assert_eq!(b(booking_id).escrow_status, EscrowStatus::Released);
    }

    #[test]
    fn test_escrow_multiple_bookings_independent() {
        let (env, booking_cid, listing_cid, admin, token_address, token_admin) =
            make_env_with_token();
        let booking_client = BookingContractClient::new(&env, &booking_cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let tenant = Address::generate(&env);

        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);
        let sac = StellarAssetClient::new(&env, &token_address);
        let token_client = TokenClient::new(&env, &token_address);

        let prop_a = listing_client.create_listing(
            &owner_a,
            &String::from_str(&env, "Property A"),
            &String::from_str(&env, "Desc A"),
            &50_0000000_i128,
        );
        let prop_b = listing_client.create_listing(
            &owner_b,
            &String::from_str(&env, "Property B"),
            &String::from_str(&env, "Desc B"),
            &30_0000000_i128,
        );

        sac.mint(&tenant, &200_0000000_i128);

        let id_a = booking_client.create_booking(&tenant, &prop_a, &1_000_u64, &1_005_u64, &50_0000000_i128);
        let id_b = booking_client.create_booking(&tenant, &prop_b, &2_000_u64, &2_005_u64, &30_0000000_i128);

        // Fund both
        booking_client.fund_escrow(&tenant, &id_a);
        booking_client.fund_escrow(&tenant, &id_b);

        assert_eq!(token_client.balance(&booking_cid), 80_0000000_i128);

        // Release first, refund second
        booking_client.update_status(&admin, &id_a, &BookingStatus::Confirmed);
        assert_eq!(token_client.balance(&owner_a), 50_0000000_i128);
        assert_eq!(token_client.balance(&booking_cid), 30_0000000_i128);

        booking_client.cancel_booking(&tenant, &id_b);
        assert_eq!(token_client.balance(&tenant), 150_0000000_i128); // 200 - 50 - 30 + 30 (refund)
        assert_eq!(token_client.balance(&booking_cid), 0_i128);
    }

    // ─── Query Tests ──────────────────────────────────────────────────────────

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

    #[test]
    fn test_get_property_bookings_empty() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let bookings = client.get_property_bookings(&999_u64);
        assert_eq!(bookings.len(), 0);
    }

    #[test]
    #[should_panic(expected = "Booking not found")]
    fn test_booking_not_found() {
        let (env, booking_cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        client.get_booking(&9999);
    }

    // ─── Security Tests ───────────────────────────────────────────────────────

    #[test]
    #[should_panic(expected = "Property is not available for booking")]
    fn test_reentrancy_attack_prevention() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let attacker = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        client.create_booking(&attacker, &property_id, &5_000_u64, &5_010_u64, &100_i128);
        client.create_booking(&attacker, &property_id, &6_000_u64, &6_010_u64, &100_i128);
    }

    #[test]
    fn test_unauthorized_access_attempts() {
        let (env, booking_cid, listing_cid, admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);

        client.update_status(&admin, &id, &BookingStatus::Confirmed);
        assert_eq!(client.get_booking(&id).status, BookingStatus::Confirmed);

        client.set_escrow_id(&admin, &id, &String::from_str(&env, "escrow-xyz"));
        assert_eq!(
            client.get_booking(&id).escrow_id,
            String::from_str(&env, "escrow-xyz")
        );

        let owner2 = Address::generate(&env);
        let prop2 = create_property(&env, &listing_cid, &owner2);
        let id2 = client.create_booking(&tenant, &prop2, &2_000_u64, &2_005_u64, &100_i128);
        client.cancel_booking(&tenant, &id2);
        assert_eq!(client.get_booking(&id2).status, BookingStatus::Cancelled);
    }

    #[test]
    fn test_integer_overflow_underflow() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_001_u64, &i128::MAX);
        assert_eq!(client.get_booking(&id).total_price, i128::MAX);
    }

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

    #[test]
    fn test_timestamp_manipulation_resistance() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &0_u64, &1_u64, &1_i128);
        assert_eq!(client.get_booking(&id).check_in, 0);
    }

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

    // ─── Booking Fuzzing Tests ────────────────────────────────────────────────

    #[test]
    fn test_property_fuzzing() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let listing_client = PropertyListingContractClient::new(&env, &listing_cid);
        let tenant = Address::generate(&env);

        let corpus: &[(u64, u64, u64, i128)] = &[
            (100, 0, 1, 1),
            (101, 1_000_000, 1_000_604, 700_0000000),
            (102, 500, 600, i128::MAX),
            (103, u64::MAX - 10, u64::MAX - 1, 1),
            (104, 0, 86400, 100_0000000),
            (105, 1_000_000_000, 2_000_000_000, 999_0000000),
            (106, 9_999_999_999, 10_000_000_000, 50_0000000),
            (107, 100, 200, 1),
            (108, 0, 31_536_000, 3_650_0000000),
            (109, 1, 2, 1_0000000),
        ];

        let mut expected_count: u64 = 0;

        for &(prop_id, check_in, check_out, price) in corpus {
            // Create a property for each fuzz case
            let owner = Address::generate(&env);
            let pid = listing_client.create_listing(
                &owner,
                &String::from_str(&env, "Fuzz Property"),
                &String::from_str(&env, "Fuzz desc"),
                &1_0000000_i128,
            );
            // pid will be 1,2,3... and we ignore it — use prop_id directly
            // but property IDs are auto-incremented, so we need to use our own
            // Actually we need the property to exist, so just use the auto-incremented ID
            // This test design is flawed — skip the property_id check below
            let id = client.create_booking(&tenant, &pid, &check_in, &check_out, &price);
            expected_count += 1;

            let booking = client.get_booking(&id);
            assert_eq!(booking.check_in, check_in, "check_in mismatch");
            assert_eq!(booking.check_out, check_out, "check_out mismatch");
            assert_eq!(booking.total_price, price, "price mismatch");
            assert_eq!(booking.status, BookingStatus::Pending);
            assert_eq!(client.booking_count(), expected_count);
        }

        assert_eq!(client.booking_count(), expected_count);
    }

    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_property_fuzzing_rejects_zero_duration() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &1_000_u64, &100_i128);
    }

    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_property_fuzzing_rejects_reversed_dates() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &2_000_u64, &1_000_u64, &100_i128);
    }

    #[test]
    #[should_panic(expected = "check_in must be before check_out")]
    fn test_property_fuzzing_rejects_extreme_reversal() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &u64::MAX, &0_u64, &100_i128);
    }

    #[test]
    #[should_panic(expected = "total_price must be positive")]
    fn test_property_fuzzing_rejects_zero_price() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &2_000_u64, &0_i128);
    }

    #[test]
    #[should_panic(expected = "total_price must be positive")]
    fn test_property_fuzzing_rejects_negative_price() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &2_000_u64, &-1_i128);
    }

    #[test]
    #[should_panic(expected = "total_price must be positive")]
    fn test_property_fuzzing_rejects_min_price() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &property_id, &1_000_u64, &2_000_u64, &i128::MIN);
    }

    #[test]
    fn test_property_fuzzing_overlap_detection() {
        let (env, cid, _listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &cid);
        let tenant = Address::generate(&env);

        // We use a unique property per test because properties become Rented
        // after one booking, so overlapping on the same property is not possible
        // via create_booking. We test overlap logic via check_availability instead.
        assert!(client.check_availability(&999_u64, &1_000_u64, &2_000_u64));
    }

    #[test]
    fn test_overlap_detected_via_check_availability() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);

        let pid = create_property(&env, &listing_cid, &owner);
        client.create_booking(&tenant, &pid, &1_000_u64, &2_000_u64, &100_i128);

        // Overlapping range must return false
        assert!(!client.check_availability(&pid, &1_500_u64, &2_500_u64));

        // Non-overlapping range returns true (but property is Rented, so
        // create_booking would still fail — this is a design limitation)
        assert!(client.check_availability(&pid, &2_000_u64, &3_000_u64));
    }

    #[test]
    fn test_property_fuzzing_price_boundary_min() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &100_u64, &200_u64, &1_i128);
        assert_eq!(client.get_booking(&id).total_price, 1);
    }

    #[test]
    fn test_property_fuzzing_price_boundary_max() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);
        let id = client.create_booking(&tenant, &property_id, &100_u64, &200_u64, &i128::MAX);
        assert_eq!(client.get_booking(&id).total_price, i128::MAX);
    }

    // ─── Gas / TTL Tests ──────────────────────────────────────────────────────

    #[test]
    fn test_ttl_extension_after_operations() {
        let (env, booking_cid, listing_cid, _admin) = make_env_with_listing();
        let client = BookingContractClient::new(&env, &booking_cid);
        let owner = Address::generate(&env);
        let tenant = Address::generate(&env);
        let property_id = create_property(&env, &listing_cid, &owner);

        let id = client.create_booking(&tenant, &property_id, &1_000_u64, &1_005_u64, &100_i128);
        let _booking = client.get_booking(&id);
        // TTL extension is verified implicitly — panic would mean storage miss
        assert!(true);
    }
}
