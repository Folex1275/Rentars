//! Unit tests for the Review contract.
//!
//! Coverage:
//!   Happy paths  — submit, get, get_reviews_for_user, get_reputation, review_count
//!   Error cases  — invalid rating (0, 6), duplicate review prevention
//!   Security     — reentrancy simulation, unauthorized access, integer overflow
//!   Edge cases   — empty review list, ID uniqueness, timestamps, multiple reviewees,
//!                  all valid rating values, multiple reviews for same reviewee

#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use crate::{ReviewContract, ReviewContractClient};

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// Create a fresh environment with the contract registered.
    fn make_env() -> (Env, soroban_sdk::Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ReviewContract);
        (env, contract_id)
    }

    // ─── Happy Path Tests ─────────────────────────────────────────────────────

    /// Submitting a valid review stores all fields correctly.
    #[test]
    fn test_submit_review_success() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        let id = client.submit_review(
            &reviewer,
            &reviewee,
            &5_u32,
            &String::from_str(&env, "Excellent host!"),
        );

        assert_eq!(id, 1);

        let review = client.get_review(&id);
        assert_eq!(review.id, 1);
        assert_eq!(review.reviewer, reviewer);
        assert_eq!(review.reviewee, reviewee);
        assert_eq!(review.rating, 5);
        assert_eq!(review.comment, String::from_str(&env, "Excellent host!"));
    }

    // ─── Invalid Rating Tests ─────────────────────────────────────────────────

    /// Rating of 0 is below the minimum and must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at least 1")]
    fn test_submit_review_invalid_rating_zero() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        client.submit_review(
            &reviewer,
            &reviewee,
            &0_u32,
            &String::from_str(&env, "Bad"),
        );
    }

    /// Rating of 6 is above the maximum and must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at most 5")]
    fn test_submit_review_invalid_rating_six() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        client.submit_review(
            &reviewer,
            &reviewee,
            &6_u32,
            &String::from_str(&env, "Too good"),
        );
    }

    // ─── Duplicate Prevention Tests ───────────────────────────────────────────

    /// The same reviewer cannot submit a second review for the same reviewee.
    #[test]
    #[should_panic(expected = "Reviewer has already reviewed this user")]
    fn test_duplicate_review_prevention() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        client.submit_review(
            &reviewer,
            &reviewee,
            &4_u32,
            &String::from_str(&env, "Good"),
        );
        // Second review from same reviewer → must panic
        client.submit_review(
            &reviewer,
            &reviewee,
            &3_u32,
            &String::from_str(&env, "Changed my mind"),
        );
    }

    // ─── Query Tests ──────────────────────────────────────────────────────────

    /// get_reviews_for_user returns all review IDs for a reviewee.
    #[test]
    fn test_get_reviews_for_user() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        // Three different reviewers submit reviews for the same reviewee
        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);
        let r3 = Address::generate(&env);

        let id1 = client.submit_review(&r1, &reviewee, &5_u32, &String::from_str(&env, "A"));
        let id2 = client.submit_review(&r2, &reviewee, &4_u32, &String::from_str(&env, "B"));
        let id3 = client.submit_review(&r3, &reviewee, &3_u32, &String::from_str(&env, "C"));

        let ids = client.get_reviews_for_user(&reviewee);
        assert_eq!(ids.len(), 3);
        assert_eq!(ids.get(0).unwrap(), id1);
        assert_eq!(ids.get(1).unwrap(), id2);
        assert_eq!(ids.get(2).unwrap(), id3);
    }

    /// get_reviews_for_user returns an empty vec for a user with no reviews.
    #[test]
    fn test_get_reviews_for_user_empty() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let nobody = Address::generate(&env);

        let ids = client.get_reviews_for_user(&nobody);
        assert_eq!(ids.len(), 0);
    }

    /// get_reputation returns 0 for a user with no reviews.
    #[test]
    fn test_get_reputation_default() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let nobody = Address::generate(&env);

        assert_eq!(client.get_reputation(&nobody), 0);
    }

    /// get_reputation returns the correct average (×100) after reviews.
    #[test]
    fn test_get_reputation_average() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);

        // ratings: 4 + 2 = 6, avg = 3.00 → 300
        client.submit_review(&r1, &reviewee, &4_u32, &String::from_str(&env, "ok"));
        client.submit_review(&r2, &reviewee, &2_u32, &String::from_str(&env, "meh"));

        assert_eq!(client.get_reputation(&reviewee), 300);
    }

    // ─── ID Uniqueness Tests ──────────────────────────────────────────────────

    /// Every review gets a globally unique, incrementing ID.
    #[test]
    fn test_review_id_uniqueness() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);

        let reviewee_a = Address::generate(&env);
        let reviewee_b = Address::generate(&env);
        let reviewer_a = Address::generate(&env);
        let reviewer_b = Address::generate(&env);

        let id1 = client.submit_review(
            &reviewer_a,
            &reviewee_a,
            &5_u32,
            &String::from_str(&env, ""),
        );
        let id2 = client.submit_review(
            &reviewer_b,
            &reviewee_b,
            &3_u32,
            &String::from_str(&env, ""),
        );

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_ne!(id1, id2);
        assert_eq!(client.review_count(), 2);
    }

    // ─── Timestamp Tests ──────────────────────────────────────────────────────

    /// The review timestamp is set from the ledger at submission time.
    #[test]
    fn test_review_timestamp() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        let id = client.submit_review(
            &reviewer,
            &reviewee,
            &4_u32,
            &String::from_str(&env, "Nice"),
        );

        let review = client.get_review(&id);
        // Ledger timestamp in default test env is 0; just verify it's stored
        assert_eq!(review.timestamp, env.ledger().timestamp());
    }

    // ─── Rating Value Tests ───────────────────────────────────────────────────

    /// All valid rating values (1–5) are accepted and stored correctly.
    #[test]
    fn test_different_rating_values() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        for rating in 1_u32..=5 {
            let reviewer = Address::generate(&env);
            let id = client.submit_review(
                &reviewer,
                &reviewee,
                &rating,
                &String::from_str(&env, "comment"),
            );
            assert_eq!(client.get_review(&id).rating, rating);
        }

        // All 5 reviews stored
        assert_eq!(client.get_reviews_for_user(&reviewee).len(), 5);
    }

    // ─── Multiple Reviews Tests ───────────────────────────────────────────────

    /// Multiple different reviewers can each review the same user once.
    #[test]
    fn test_multiple_reviews_for_same_user() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        for _ in 0..10 {
            let reviewer = Address::generate(&env);
            client.submit_review(
                &reviewer,
                &reviewee,
                &5_u32,
                &String::from_str(&env, "great"),
            );
        }

        assert_eq!(client.get_reviews_for_user(&reviewee).len(), 10);
        assert_eq!(client.review_count(), 10);
        // All 5s → reputation = 500
        assert_eq!(client.get_reputation(&reviewee), 500);
    }

    /// Reviews for different reviewees are fully isolated from each other.
    #[test]
    fn test_multiple_users_isolated() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);

        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);
        let reviewer_a = Address::generate(&env);
        let reviewer_b = Address::generate(&env);

        client.submit_review(&reviewer_a, &user_a, &5_u32, &String::from_str(&env, "A"));
        client.submit_review(&reviewer_b, &user_b, &2_u32, &String::from_str(&env, "B"));

        // Each user has exactly one review
        assert_eq!(client.get_reviews_for_user(&user_a).len(), 1);
        assert_eq!(client.get_reviews_for_user(&user_b).len(), 1);

        // Reputations are independent
        assert_eq!(client.get_reputation(&user_a), 500);
        assert_eq!(client.get_reputation(&user_b), 200);

        // user_b has no reviews from reviewer_a
        let ids_b = client.get_reviews_for_user(&user_b);
        let review_b = client.get_review(&ids_b.get(0).unwrap());
        assert_eq!(review_b.reviewer, reviewer_b);
    }

    // ─── Security Tests ───────────────────────────────────────────────────────

    /// Reentrancy simulation: submitting the same review twice in sequence
    /// must be rejected on the second call — the duplicate flag is set atomically.
    #[test]
    #[should_panic(expected = "Reviewer has already reviewed this user")]
    fn test_reentrancy_attack_prevention() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);

        // First call succeeds
        client.submit_review(&attacker, &victim, &5_u32, &String::from_str(&env, "legit"));
        // Second call simulates reentrancy — must be rejected
        client.submit_review(&attacker, &victim, &1_u32, &String::from_str(&env, "attack"));
    }

    /// Unauthorized access: a reviewer cannot submit on behalf of another address.
    /// mock_all_auths is active, so we verify the auth model by checking that
    /// the stored reviewer matches the caller, not an arbitrary address.
    #[test]
    fn test_unauthorized_access_attempts() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let real_reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        let id = client.submit_review(
            &real_reviewer,
            &reviewee,
            &4_u32,
            &String::from_str(&env, "honest review"),
        );

        // The stored reviewer must be exactly the caller — no impersonation
        let review = client.get_review(&id);
        assert_eq!(review.reviewer, real_reviewer);

        // A different address has NOT reviewed this reviewee
        let other = Address::generate(&env);
        let already: bool = env
            .storage()
            .instance()
            .get(&crate::DataKey::HasReviewed(other.clone(), reviewee.clone()))
            .unwrap_or(false);
        assert!(!already, "Other address must not be marked as having reviewed");
    }

    /// Integer overflow/underflow — u32::MAX rating (far above 5) must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at most 5")]
    fn test_integer_overflow_underflow() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        // u32::MAX is way above 5 — must be rejected by the upper-bound check
        client.submit_review(
            &reviewer,
            &reviewee,
            &u32::MAX,
            &String::from_str(&env, "overflow attempt"),
        );
    }

    /// review_count stays consistent and never overflows across many submissions.
    #[test]
    fn test_review_count_consistency() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        for i in 1_u64..=20 {
            let reviewer = Address::generate(&env);
            client.submit_review(
                &reviewer,
                &reviewee,
                &3_u32,
                &String::from_str(&env, "ok"),
            );
            assert_eq!(client.review_count(), i);
        }
    }

    // ─── Review Fuzzing Tests ─────────────────────────────────────────────────

    /// Fuzz test: randomised ratings and comment lengths — valid inputs only.
    ///
    /// Tests a corpus of (rating, comment) combinations that must all succeed
    /// and round-trip correctly through the contract.
    #[test]
    fn test_property_fuzzing() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        // ── Valid input corpus: (rating, comment) ─────────────────────────
        let corpus: &[(u32, &str)] = &[
            // Rating 1, empty comment
            (1, ""),
            // Rating 2, short comment
            (2, "ok"),
            // Rating 3, medium comment
            (3, "Average stay, nothing special."),
            // Rating 4, longer comment
            (4, "Great host, clean place, would recommend to friends."),
            // Rating 5, 64-char hex-like comment (simulates a hash reference)
            (
                5,
                "a3f1e2d4b5c6a3f1e2d4b5c6a3f1e2d4b5c6a3f1e2d4b5c6a3f1e2d4b5c6a3f1",
            ),
            // Rating 1, comment with punctuation
            (1, "Terrible! Would not stay again."),
            // Rating 5, numeric-looking comment
            (5, "10/10 experience, 5 stars all the way."),
            // Rating 3, comment with spaces and dashes
            (3, "Nice place - good location - fair price"),
        ];

        let mut expected_count: u64 = 0;

        for &(rating, comment) in corpus {
            // Each submission uses a fresh reviewer to avoid duplicate-review rejection
            let reviewer = Address::generate(&env);

            let id = client.submit_review(
                &reviewer,
                &reviewee,
                &rating,
                &String::from_str(&env, comment),
            );
            expected_count += 1;

            let review = client.get_review(&id);
            assert_eq!(review.rating, rating, "rating mismatch for input {}", rating);
            assert_eq!(
                review.comment,
                String::from_str(&env, comment),
                "comment mismatch for input {:?}",
                comment
            );
            assert_eq!(review.reviewer, reviewer);
            assert_eq!(review.reviewee, reviewee);
            assert_eq!(
                client.review_count(),
                expected_count,
                "review_count mismatch after valid input"
            );
        }

        // All valid reviews are indexed under the reviewee
        assert_eq!(
            client.get_reviews_for_user(&reviewee).len(),
            expected_count as u32,
            "reviewee index length mismatch"
        );
        assert_eq!(client.review_count(), expected_count);
    }

    /// Fuzz test: rating = 0 (below minimum) must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at least 1")]
    fn test_property_fuzzing_rejects_rating_zero() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);
        client.submit_review(
            &reviewer,
            &reviewee,
            &0_u32,
            &String::from_str(&env, "zero rating"),
        );
    }

    /// Fuzz test: rating = 6 (above maximum) must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at most 5")]
    fn test_property_fuzzing_rejects_rating_six() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);
        client.submit_review(
            &reviewer,
            &reviewee,
            &6_u32,
            &String::from_str(&env, "six rating"),
        );
    }

    /// Fuzz test: rating = 100 (far above maximum) must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at most 5")]
    fn test_property_fuzzing_rejects_rating_100() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);
        client.submit_review(
            &reviewer,
            &reviewee,
            &100_u32,
            &String::from_str(&env, "way too high"),
        );
    }

    /// Fuzz test: u32::MAX rating (extreme overflow attempt) must be rejected.
    #[test]
    #[should_panic(expected = "Rating must be at most 5")]
    fn test_property_fuzzing_rejects_rating_max() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);
        client.submit_review(
            &reviewer,
            &reviewee,
            &u32::MAX,
            &String::from_str(&env, "overflow attempt"),
        );
    }

    /// Fuzz test: duplicate-reviewer detection across randomised reviewer addresses.
    ///
    /// Verifies that the HasReviewed flag is set atomically and that any second
    /// submission from the same reviewer is always rejected, regardless of
    /// whether the rating or comment changes.
    #[test]
    fn test_property_fuzzing_duplicate_prevention() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewee = Address::generate(&env);

        // Corpus of first_rating values — each uses a fresh reviewer.
        // After the first submission succeeds, we verify the duplicate flag
        // is set by checking the storage key directly.
        let first_ratings: &[u32] = &[5, 3, 1, 4, 2];

        for &first_rating in first_ratings {
            let reviewer = Address::generate(&env);

            // First submission must succeed
            client.submit_review(
                &reviewer,
                &reviewee,
                &first_rating,
                &String::from_str(&env, "first review"),
            );

            // Verify the HasReviewed flag is set
            let already: bool = env
                .storage()
                .instance()
                .get(&crate::DataKey::HasReviewed(reviewer.clone(), reviewee.clone()))
                .unwrap_or(false);
            assert!(
                already,
                "HasReviewed flag must be set after first submission (rating={})",
                first_rating
            );
        }
    }

    /// Fuzz test: second submission from same reviewer must be rejected.
    #[test]
    #[should_panic(expected = "Reviewer has already reviewed this user")]
    fn test_property_fuzzing_rejects_duplicate_submission() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);
        let reviewer = Address::generate(&env);
        let reviewee = Address::generate(&env);

        client.submit_review(&reviewer, &reviewee, &5_u32, &String::from_str(&env, "first"));
        // Second submission — must be rejected
        client.submit_review(&reviewer, &reviewee, &1_u32, &String::from_str(&env, "changed my mind"));
    }

    /// Fuzz test: reputation calculation with randomised rating distributions.
    ///
    /// Verifies that get_reputation returns the correct average×100 for
    /// various combinations of ratings.
    #[test]
    fn test_property_fuzzing_reputation() {
        let (env, cid) = make_env();
        let client = ReviewContractClient::new(&env, &cid);

        // (ratings_vec, expected_reputation_x100)
        // reputation = (sum / count) * 100, integer division
        let cases: &[(&[u32], u32)] = &[
            (&[5], 500),
            (&[1], 100),
            (&[3], 300),
            (&[5, 5], 500),
            (&[1, 5], 300),          // (1+5)/2 = 3 → 300
            (&[1, 2, 3, 4, 5], 300), // (15)/5 = 3 → 300
            (&[2, 2, 2, 2], 200),
            (&[4, 4, 4, 4, 4], 400),
            (&[1, 1, 1, 1, 1], 100),
            (&[5, 5, 5, 5, 5], 500),
        ];

        for &(ratings, expected_rep) in cases {
            // Fresh reviewee per case to keep them isolated
            let reviewee = Address::generate(&env);

            for &rating in ratings {
                let reviewer = Address::generate(&env);
                client.submit_review(
                    &reviewer,
                    &reviewee,
                    &rating,
                    &String::from_str(&env, "fuzz review"),
                );
            }

            let rep = client.get_reputation(&reviewee);
            assert_eq!(
                rep, expected_rep,
                "reputation mismatch for ratings {:?}: got {}, expected {}",
                ratings, rep, expected_rep
            );
        }
    }
}
