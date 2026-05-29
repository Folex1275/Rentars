//! Review Contract for Rentars
//!
//! Allows tenants to submit on-chain reviews for users (owners/properties).
//! Enforces: rating 1–5, one review per reviewer per subject, unique IDs,
//! and per-subject review indexes.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, vec, Address, Env, String, Vec};

// ─── Data Types ──────────────────────────────────────────────────────────────

/// A single on-chain review.
#[contracttype]
#[derive(Clone)]
pub struct Review {
    pub id: u64,
    /// The address being reviewed (owner or property representative).
    pub reviewee: Address,
    /// The address submitting the review.
    pub reviewer: Address,
    /// Rating 1–5 (inclusive).
    pub rating: u32,
    /// Optional free-text comment.
    pub comment: String,
    /// Ledger timestamp at submission time.
    pub timestamp: u64,
}

/// Storage keys.
#[contracttype]
pub enum DataKey {
    /// Individual review by global ID.
    Review(u64),
    /// Total reviews ever submitted.
    ReviewCount,
    /// List of review IDs for a given reviewee.
    UserReviews(Address),
    /// Duplicate-prevention flag: (reviewer, reviewee) → bool.
    HasReviewed(Address, Address),
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct ReviewContract;

#[contractimpl]
impl ReviewContract {
    /// Submit a review for `reviewee`.
    ///
    /// Validates:
    /// - rating is 1–5 (inclusive)
    /// - reviewer has not already reviewed this reviewee
    ///
    /// Returns the new review ID.
    pub fn submit_review(
        env: Env,
        reviewer: Address,
        reviewee: Address,
        rating: u32,
        comment: String,
    ) -> u64 {
        reviewer.require_auth();

        // ── Validate rating ───────────────────────────────────────────────
        assert!(rating >= 1, "Rating must be at least 1");
        assert!(rating <= 5, "Rating must be at most 5");

        // ── Duplicate prevention ──────────────────────────────────────────
        let already_reviewed: bool = env
            .storage()
            .instance()
            .get(&DataKey::HasReviewed(reviewer.clone(), reviewee.clone()))
            .unwrap_or(false);
        assert!(!already_reviewed, "Reviewer has already reviewed this user");

        // ── Persist ───────────────────────────────────────────────────────
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ReviewCount)
            .unwrap_or(0);
        let id = count + 1;

        let review = Review {
            id,
            reviewee: reviewee.clone(),
            reviewer: reviewer.clone(),
            rating,
            comment,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&DataKey::Review(id), &review);
        env.storage()
            .instance()
            .set(&DataKey::ReviewCount, &id);

        // Mark duplicate-prevention flag
        env.storage()
            .instance()
            .set(&DataKey::HasReviewed(reviewer, reviewee.clone()), &true);

        // Append to per-reviewee index
        let mut user_reviews: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::UserReviews(reviewee.clone()))
            .unwrap_or(vec![&env]);
        user_reviews.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::UserReviews(reviewee), &user_reviews);

        id
    }

    /// Retrieve a review by its global ID.
    pub fn get_review(env: Env, id: u64) -> Review {
        env.storage()
            .instance()
            .get(&DataKey::Review(id))
            .expect("Review not found")
    }

    /// Return all review IDs submitted for a given reviewee.
    pub fn get_reviews_for_user(env: Env, reviewee: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::UserReviews(reviewee))
            .unwrap_or(vec![&env])
    }

    /// Return the average rating for a reviewee (scaled ×100 to avoid floats).
    /// Returns 0 if no reviews exist.
    pub fn get_reputation(env: Env, reviewee: Address) -> u32 {
        let ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::UserReviews(reviewee.clone()))
            .unwrap_or(vec![&env]);

        if ids.len() == 0 {
            return 0;
        }

        let mut total: u32 = 0;
        for i in 0..ids.len() {
            let rid = ids.get(i).unwrap();
            let review: Review = env
                .storage()
                .instance()
                .get(&DataKey::Review(rid))
                .unwrap();
            total += review.rating;
        }

        // Average × 100 (e.g. 4.5 → 450)
        (total * 100) / ids.len()
    }

    /// Return the total number of reviews ever submitted.
    pub fn review_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ReviewCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
