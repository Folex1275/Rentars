//! Unit tests for the PropertyListing contract.
//!
//! Coverage:
//!   Happy paths  — create, get, update, update_status
//!   Error cases  — unauthorized, not-found, duplicate-id logic, invalid inputs
//!   Edge cases   — empty strings, boundary values, max price, single-char title

#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use crate::{ListingStatus, PropertyListingContract, PropertyListingContractClient};

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// Create a fresh environment with the contract registered.
    /// Returns (Env, contract_id) — callers create the client themselves so the
    /// borrow of `env` stays in the same scope.
    fn make_env() -> (Env, soroban_sdk::Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PropertyListingContract);
        (env, contract_id)
    }

    // ─── Happy Path Tests ────────────────────────────────────────────────────

    /// Creating a listing returns ID 1 and stores the correct data.
    #[test]
    fn test_create_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Mountain Cabin"),
            &String::from_str(&env, "Peaceful retreat in the Alps"),
            &50_0000000_i128,
        );

        assert_eq!(id, 1, "First listing should have ID 1");

        let listing = client.get_listing(&id);
        assert_eq!(listing.id, 1);
        assert_eq!(listing.owner, owner);
        assert_eq!(listing.title, String::from_str(&env, "Mountain Cabin"));
        assert_eq!(
            listing.description,
            String::from_str(&env, "Peaceful retreat in the Alps")
        );
        assert_eq!(listing.price_per_night, 50_0000000_i128);
        assert_eq!(listing.status, ListingStatus::Active);
    }

    /// IDs auto-increment: second listing gets ID 2.
    #[test]
    fn test_create_listing_increments_id() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id1 = client.create_listing(
            &owner,
            &String::from_str(&env, "House A"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );
        let id2 = client.create_listing(
            &owner,
            &String::from_str(&env, "House B"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(client.listing_count(), 2);
    }

    /// get_listing returns the correct listing for a valid ID.
    #[test]
    fn test_get_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "City Apartment"),
            &String::from_str(&env, "Modern flat in downtown"),
            &200_0000000_i128,
        );

        let listing = client.get_listing(&id);
        assert_eq!(listing.id, id);
        assert_eq!(listing.price_per_night, 200_0000000_i128);
        assert_eq!(listing.status, ListingStatus::Active);
    }

    /// Owner can update title, description, and price.
    #[test]
    fn test_update_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "A lovely place by the sea"),
            &100_0000000_i128,
        );

        client.update_listing(
            &owner,
            &id,
            &String::from_str(&env, "Updated Beach House"),
            &String::from_str(&env, "Renovated with ocean view"),
            &150_0000000_i128,
        );

        let listing = client.get_listing(&id);
        assert_eq!(listing.title, String::from_str(&env, "Updated Beach House"));
        assert_eq!(
            listing.description,
            String::from_str(&env, "Renovated with ocean view")
        );
        assert_eq!(listing.price_per_night, 150_0000000_i128);
        // Status should be unchanged
        assert_eq!(listing.status, ListingStatus::Active);
    }

    /// Owner can change listing status to Inactive.
    #[test]
    fn test_update_status() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_status(&owner, &id, &ListingStatus::Inactive);

        let listing = client.get_listing(&id);
        assert_eq!(listing.status, ListingStatus::Inactive);
    }

    /// Owner can cycle through all status variants.
    #[test]
    fn test_update_status_all_variants() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Property"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_status(&owner, &id, &ListingStatus::Rented);
        assert_eq!(client.get_listing(&id).status, ListingStatus::Rented);

        client.update_status(&owner, &id, &ListingStatus::Active);
        assert_eq!(client.get_listing(&id).status, ListingStatus::Active);

        client.update_status(&owner, &id, &ListingStatus::Inactive);
        assert_eq!(client.get_listing(&id).status, ListingStatus::Inactive);
    }

    /// Multiple owners can each have their own listings independently.
    #[test]
    fn test_multiple_owners_independent_listings() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);

        let id_a = client.create_listing(
            &owner_a,
            &String::from_str(&env, "Owner A Property"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );
        let id_b = client.create_listing(
            &owner_b,
            &String::from_str(&env, "Owner B Property"),
            &String::from_str(&env, "desc"),
            &200_0000000_i128,
        );

        assert_ne!(id_a, id_b);
        assert_eq!(client.get_listing(&id_a).owner, owner_a);
        assert_eq!(client.get_listing(&id_b).owner, owner_b);
    }

    // ─── Error / Negative Tests ───────────────────────────────────────────────

    /// A non-owner cannot update a listing.
    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_update_listing_unauthorized() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);
        let attacker = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        // attacker tries to update owner's listing
        client.update_listing(
            &attacker,
            &id,
            &String::from_str(&env, "Hacked Title"),
            &String::from_str(&env, "Hacked desc"),
            &1_i128,
        );
    }

    /// A non-owner cannot change the status of a listing.
    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_update_status_unauthorized() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);
        let attacker = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_status(&attacker, &id, &ListingStatus::Inactive);
    }

    /// Getting a listing that does not exist panics.
    #[test]
    #[should_panic(expected = "Listing not found")]
    fn test_get_nonexistent_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        client.get_listing(&9999);
    }

    /// Updating a listing that does not exist panics.
    #[test]
    #[should_panic(expected = "Listing not found")]
    fn test_update_nonexistent_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let caller = Address::generate(&env);

        client.update_listing(
            &caller,
            &9999,
            &String::from_str(&env, "Title"),
            &String::from_str(&env, "Desc"),
            &100_i128,
        );
    }

    /// Creating a listing with zero price panics.
    #[test]
    #[should_panic(expected = "price_per_night must be positive")]
    fn test_create_listing_zero_price() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        client.create_listing(
            &owner,
            &String::from_str(&env, "Free House"),
            &String::from_str(&env, "desc"),
            &0_i128,
        );
    }

    /// Creating a listing with a negative price panics.
    #[test]
    #[should_panic(expected = "price_per_night must be positive")]
    fn test_create_listing_negative_price() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        client.create_listing(
            &owner,
            &String::from_str(&env, "Negative House"),
            &String::from_str(&env, "desc"),
            &-1_i128,
        );
    }

    /// Creating a listing with an empty title panics.
    #[test]
    #[should_panic(expected = "title must not be empty")]
    fn test_create_listing_empty_title() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        client.create_listing(
            &owner,
            &String::from_str(&env, ""),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );
    }

    /// Simulates "duplicate listing" — same owner creates two listings with identical data.
    /// The contract assigns distinct IDs (no deduplication by content).
    #[test]
    fn test_create_duplicate_listing() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id1 = client.create_listing(
            &owner,
            &String::from_str(&env, "Same Title"),
            &String::from_str(&env, "Same desc"),
            &100_0000000_i128,
        );
        let id2 = client.create_listing(
            &owner,
            &String::from_str(&env, "Same Title"),
            &String::from_str(&env, "Same desc"),
            &100_0000000_i128,
        );

        // Both are stored independently with unique IDs
        assert_ne!(id1, id2, "Duplicate content should still produce unique IDs");
        assert_eq!(client.listing_count(), 2);
    }

    // ─── Edge Case Tests ──────────────────────────────────────────────────────

    /// Edge cases: boundary values and unusual but valid inputs.
    #[test]
    fn test_edge_cases() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        // Minimum valid price: 1 stroop
        let id_min_price = client.create_listing(
            &owner,
            &String::from_str(&env, "A"),
            &String::from_str(&env, ""),
            &1_i128,
        );
        let listing = client.get_listing(&id_min_price);
        assert_eq!(listing.price_per_night, 1_i128);

        // Single-character title is valid
        assert_eq!(listing.title, String::from_str(&env, "A"));

        // Empty description is valid
        assert_eq!(listing.description, String::from_str(&env, ""));

        // Maximum i128 price (boundary)
        let id_max_price = client.create_listing(
            &owner,
            &String::from_str(&env, "Max Price Property"),
            &String::from_str(&env, "desc"),
            &i128::MAX,
        );
        let listing_max = client.get_listing(&id_max_price);
        assert_eq!(listing_max.price_per_night, i128::MAX);

        // Listing count reflects both
        assert_eq!(client.listing_count(), 2);
    }

    /// Updating with the minimum valid price (1 stroop) succeeds.
    #[test]
    fn test_update_listing_minimum_price() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_listing(
            &owner,
            &id,
            &String::from_str(&env, "Cheap Stay"),
            &String::from_str(&env, "Budget option"),
            &1_i128,
        );

        assert_eq!(client.get_listing(&id).price_per_night, 1_i128);
    }

    /// Updating with zero price panics.
    #[test]
    #[should_panic(expected = "price_per_night must be positive")]
    fn test_update_listing_zero_price() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_listing(
            &owner,
            &id,
            &String::from_str(&env, "Title"),
            &String::from_str(&env, "desc"),
            &0_i128,
        );
    }

    /// Updating with an empty title panics.
    #[test]
    #[should_panic(expected = "title must not be empty")]
    fn test_update_listing_empty_title() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_listing(
            &owner,
            &id,
            &String::from_str(&env, ""),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );
    }

    /// listing_count returns 0 on a fresh contract.
    #[test]
    fn test_listing_count_starts_at_zero() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        assert_eq!(client.listing_count(), 0);
    }

    /// Listing count increments correctly across many listings.
    #[test]
    fn test_listing_count_many() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        for i in 1_u64..=10 {
            client.create_listing(
                &owner,
                &String::from_str(&env, "House"),
                &String::from_str(&env, "desc"),
                &100_0000000_i128,
            );
            assert_eq!(client.listing_count(), i);
        }
    }

    /// A listing's owner field is immutable through update_listing.
    #[test]
    fn test_update_does_not_change_owner() {
        let (env, cid) = make_env();
        let client = PropertyListingContractClient::new(&env, &cid);
        let owner = Address::generate(&env);

        let id = client.create_listing(
            &owner,
            &String::from_str(&env, "Cozy Beach House"),
            &String::from_str(&env, "desc"),
            &100_0000000_i128,
        );

        client.update_listing(
            &owner,
            &id,
            &String::from_str(&env, "New Title"),
            &String::from_str(&env, "New desc"),
            &999_0000000_i128,
        );

        assert_eq!(client.get_listing(&id).owner, owner);
    }
}
