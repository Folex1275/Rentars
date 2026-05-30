// Rentars — Review & Reputation Soroban Contract
// Built on Stellar blockchain
//
// Handles: on-chain reviews submitted after completed bookings,
// per-user reputation scoring (average rating 1–5).

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, panic_with_error, Env, String, Vec};

// ---------------------------------------------------------------------------
// Error enum
// ---------------------------------------------------------------------------

/// Errors returned by the Review Contract.
/// Uses `contracterror` so Soroban encodes them as u32 error codes on-chain.
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum ReviewError {
    /// Rating must be between 1 and 5 (inclusive)
    InvalidRating = 1,
    /// A review for this booking by this reviewer already exists
    DuplicateReview = 2,
    /// The caller is not authorised to submit this review
    UnauthorizedReviewer = 3,
    /// One or more input fields are invalid (e.g. empty DID, comment too long)
    InvalidInput = 4,
}

// ---------------------------------------------------------------------------
// Review struct
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct Review {
    /// Auto-incremented on-chain review ID
    pub id: u64,
    /// The booking this review is tied to
    pub booking_id: u64,
    /// DID of the account submitting the review
    pub reviewer_did: String,
    /// DID of the account being reviewed
    pub target_did: String,
    /// Star rating 1–5
    pub rating: u32,
    /// Free-text comment (max 500 chars)
    pub comment: String,
    /// Unix timestamp (seconds) when the review was submitted
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    /// Individual review by ID
    Review(u64),
    /// Total number of reviews ever submitted (used for ID generation)
    ReviewCount,
    /// List of review IDs for a given target DID
    UserReviews(String),
    /// Deduplication key: (booking_id, reviewer_did) → bool
    ReviewExists(u64, String),
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_COMMENT_LEN: u32 = 500;
const MIN_RATING: u32 = 1;
const MAX_RATING: u32 = 5;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct ReviewContract;

#[contractimpl]
impl ReviewContract {
    // -----------------------------------------------------------------------
    // Write functions
    // -----------------------------------------------------------------------

    /// Submit a review for a completed booking.
    ///
    /// # Arguments
    /// * `booking_id`    — ID of the booking being reviewed
    /// * `reviewer_did`  — DID of the reviewer (must be non-empty)
    /// * `target_did`    — DID of the account being reviewed (must be non-empty)
    /// * `rating`        — Star rating, must be 1–5 inclusive
    /// * `comment`       — Free-text comment, max 500 characters
    ///
    /// # Errors
    /// * `ReviewError::InvalidInput`        — empty DIDs or comment exceeds 500 chars
    /// * `ReviewError::InvalidRating`       — rating outside 1–5
    /// * `ReviewError::DuplicateReview`     — reviewer already reviewed this booking
    ///
    /// # Returns
    /// The new review's on-chain ID.
    pub fn submit_review(
        env: Env,
        booking_id: u64,
        reviewer_did: String,
        target_did: String,
        rating: u32,
        comment: String,
    ) -> u64 {
        // --- Input validation ---

        // DIDs must not be empty
        if reviewer_did.len() == 0 || target_did.len() == 0 {
            panic_with_error!(&env, ReviewError::InvalidInput);
        }

        // Comment length cap: 500 characters
        if comment.len() > MAX_COMMENT_LEN {
            panic_with_error!(&env, ReviewError::InvalidInput);
        }

        // Rating must be 1–5
        if rating < MIN_RATING || rating > MAX_RATING {
            panic_with_error!(&env, ReviewError::InvalidRating);
        }

        // Duplicate prevention: one review per (booking_id, reviewer_did)
        let dup_key = DataKey::ReviewExists(booking_id, reviewer_did.clone());
        if env.storage().instance().has(&dup_key) {
            panic_with_error!(&env, ReviewError::DuplicateReview);
        }

        // --- Persist the review ---

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ReviewCount)
            .unwrap_or(0);
        let id = count + 1;

        let review = Review {
            id,
            booking_id,
            reviewer_did: reviewer_did.clone(),
            target_did: target_did.clone(),
            rating,
            comment,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().instance().set(&DataKey::Review(id), &review);
        env.storage().instance().set(&DataKey::ReviewCount, &id);

        // Mark this (booking, reviewer) pair as reviewed to prevent duplicates
        env.storage().instance().set(&dup_key, &true);

        // Append review ID to the target user's review list
        let user_key = DataKey::UserReviews(target_did);
        let mut user_reviews: Vec<u64> = env
            .storage()
            .instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env));
        user_reviews.push_back(id);
        env.storage().instance().set(&user_key, &user_reviews);

        id
    }

    // -----------------------------------------------------------------------
    // Read functions
    // -----------------------------------------------------------------------

    /// Return all reviews written about a given target DID.
    ///
    /// Returns an empty Vec if the user has no reviews yet.
    pub fn get_reviews_for_user(env: Env, target_did: String) -> Vec<Review> {
        let user_key = DataKey::UserReviews(target_did);
        let review_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env));

        let mut reviews: Vec<Review> = Vec::new(&env);
        for id in review_ids.iter() {
            if let Some(review) = env.storage().instance().get(&DataKey::Review(id)) {
                reviews.push_back(review);
            }
        }
        reviews
    }

    /// Return the average rating (1–5) for a given target DID.
    ///
    /// Returns 0 if the user has no reviews yet.
    pub fn get_reputation(env: Env, target_did: String) -> u32 {
        let user_key = DataKey::UserReviews(target_did);
        let review_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env));

        let count = review_ids.len();
        if count == 0 {
            return 0;
        }

        let mut total: u64 = 0;
        for id in review_ids.iter() {
            if let Some(review) = env.storage().instance().get::<DataKey, Review>(&DataKey::Review(id)) {
                total += review.rating as u64;
            }
        }

        // Integer average, rounded down
        (total / count as u64) as u32
    }

    /// Get a single review by its on-chain ID.
    pub fn get_review(env: Env, review_id: u64) -> Review {
        env.storage()
            .instance()
            .get(&DataKey::Review(review_id))
            .expect("Review not found")
    }
}
