# Review Contract — Overview

**Contract:** `review-contract`  
**Language:** Rust (Soroban SDK, `#![no_std]`)  
**Network:** Stellar (Testnet / Mainnet)  
**Version:** 0.1.0

---

## Purpose

The `review-contract` enables tenants to submit immutable, on-chain reviews for property owners (or any Stellar address). It enforces a 1–5 star rating scale, prevents duplicate reviews from the same reviewer for the same subject, and provides a reputation score derived from the average of all submitted ratings.

Key responsibilities:
- Accept and persist on-chain reviews with rating and optional comment
- Enforce rating bounds (1–5 inclusive)
- Prevent a reviewer from submitting more than one review per reviewee
- Maintain a per-reviewee index of review IDs for efficient lookup
- Compute an integer reputation score (average rating × 100) without floating-point arithmetic

---

## Data Structures

### `Review` (struct)

The primary on-chain record for a single review.

| Field       | Type      | Description                                                              |
|-------------|-----------|--------------------------------------------------------------------------|
| `id`        | `u64`     | Auto-incremented global review identifier.                               |
| `reviewee`  | `Address` | The Stellar address being reviewed (typically a property owner).         |
| `reviewer`  | `Address` | The Stellar address submitting the review (typically a tenant).          |
| `rating`    | `u32`     | Star rating, 1–5 inclusive.                                              |
| `comment`   | `String`  | Optional free-text comment. May be an empty string.                      |
| `timestamp` | `u64`     | Ledger timestamp (Unix seconds) at the time of submission.               |

### `DataKey` (enum — storage keys)

| Variant                        | Storage Type | Description                                                          |
|--------------------------------|--------------|----------------------------------------------------------------------|
| `Review(u64)`                  | Persistent   | Individual review record keyed by global review ID.                  |
| `ReviewCount`                  | Persistent   | Running counter; also serves as the last-used ID.                    |
| `UserReviews(Address)`         | Persistent   | `Vec<u64>` of review IDs submitted for a given reviewee address.     |
| `HasReviewed(Address, Address)`| Persistent   | Boolean flag: `(reviewer, reviewee) → bool`. Duplicate prevention.  |

---

## Public Functions

### `submit_review`

```rust
pub fn submit_review(
    env: Env,
    reviewer: Address,
    reviewee: Address,
    rating: u32,
    comment: String,
) -> u64
```

Submits a new review for `reviewee`.

**Auth:** `reviewer.require_auth()` — the reviewer must have signed the transaction.

**Validation (in order):**
1. `rating >= 1` — panics with `"Rating must be at least 1"`
2. `rating <= 5` — panics with `"Rating must be at most 5"`
3. `HasReviewed(reviewer, reviewee) == false` — panics with `"Reviewer has already reviewed this user"`

**Returns:** The new review's `u64` ID.

**Side effects:**
1. Persists `Review(id)` with `timestamp = env.ledger().timestamp()`
2. Increments `ReviewCount`
3. Sets `HasReviewed(reviewer, reviewee) = true`
4. Appends `id` to `UserReviews(reviewee)`
5. Extends TTL on all four entries

---

### `get_review`

```rust
pub fn get_review(env: Env, id: u64) -> Review
```

Retrieves a review by its global ID. Read-only; no auth required.

**Errors:** Panics with `"Review not found"` if the ID does not exist.

---

### `get_reviews_for_user`

```rust
pub fn get_reviews_for_user(env: Env, reviewee: Address) -> Vec<u64>
```

Returns all review IDs submitted for a given reviewee address. Read-only; no auth required.

Returns an empty `Vec` if no reviews exist for the address.

Use the returned IDs with `get_review` to fetch full review details.

---

### `get_reputation`

```rust
pub fn get_reputation(env: Env, reviewee: Address) -> u32
```

Returns the average rating for a reviewee, scaled by 100 to avoid floating-point arithmetic. Read-only; no auth required.

**Examples:**
- 3 reviews with ratings 4, 5, 4 → average 4.33 → returns `433`
- 1 review with rating 5 → returns `500`
- No reviews → returns `0`

**Usage in frontend/backend:**
```typescript
const reputation = await reviewClient.getReputation(ownerAddress);
const stars = reputation / 100; // e.g. 433 → 4.33
```

---

### `review_count`

```rust
pub fn review_count(env: Env) -> u64
```

Returns the total number of reviews ever submitted across all reviewees. Read-only; no auth required.

Returns `0` if no reviews have been submitted yet.

---

## Storage Layout

```
Persistent Storage
├── ReviewCount                         → u64
├── Review(1)                           → Review
│   Review(2)                           → Review
│   Review(n)                           → Review
├── UserReviews(address_1)              → Vec<u64>  (review ID index per reviewee)
│   UserReviews(address_n)              → Vec<u64>
├── HasReviewed(reviewer_1, reviewee_1) → bool      (duplicate prevention)
└── HasReviewed(reviewer_n, reviewee_n) → bool
```

All entries use persistent storage. Every write is immediately followed by `extend_ttl(key, TTL_MIN=100, TTL_EXTEND_TO=100)`.

### TTL Strategy

| Constant        | Value       | Meaning                                                  |
|-----------------|-------------|----------------------------------------------------------|
| `TTL_MIN`       | 100 ledgers | Minimum remaining TTL before an extension is triggered.  |
| `TTL_EXTEND_TO` | 100 ledgers | Target TTL applied immediately after every write.        |

**Entries extended on `submit_review`:**
- `Review(id)`
- `ReviewCount`
- `HasReviewed(reviewer, reviewee)`
- `UserReviews(reviewee)`

> **Production note:** 100 ledgers ≈ 8 minutes at 5 s/ledger. Set `TTL_EXTEND_TO` to 17,280+ for production.

---

## Error Reference

| Panic message                              | Trigger                                                          |
|--------------------------------------------|------------------------------------------------------------------|
| `"Rating must be at least 1"`              | `rating < 1` in `submit_review`                                  |
| `"Rating must be at most 5"`               | `rating > 5` in `submit_review`                                  |
| `"Reviewer has already reviewed this user"`| `HasReviewed(reviewer, reviewee)` is already `true`              |
| `"Review not found"`                       | `get_review` called with an unknown ID                           |

---

## Integration Notes

### Backend Integration

The backend uses `ReviewClient` (`apps/backend/src/blockchain/reviewClient.ts`) to interact with this contract.

**Read operations** (no signing required):
```typescript
const client = new ReviewClient(contractId, rpcUrl);

// Fetch all review IDs for an owner
const reviewIds = await client.getReviewsForUser(ownerAddress);

// Fetch a specific review
const review = await client.getReview(BigInt(reviewId));

// Get reputation score
const reputation = await client.getReputation(ownerAddress);
const stars = reputation / 100; // convert to decimal
```

**Write operations** return `xdr.Operation` objects. The reviewer's wallet must sign and submit:
```typescript
const op = client.buildSubmitReview({ reviewer, reviewee, rating, comment });
// wrap in TransactionBuilder, sign with reviewer keypair, submit
```

The `ReviewClient.buildSubmitReview` also performs client-side rating validation (throws `RangeError` if rating is not 1–5) before building the operation, providing an early error before hitting the network.

### Frontend Integration

The frontend displays reputation scores on property and owner profile pages by calling `get_reputation`. Review submission requires the tenant's Stellar wallet (e.g., Freighter) to sign the transaction. The frontend should enforce the one-review-per-reviewee rule by checking `HasReviewed` (via a simulated call) before presenting the review form.

**Reputation display example:**
```typescript
// reputation = 433 → display as "4.3 ★" or a 4.33/5 progress bar
const displayRating = (reputation / 100).toFixed(1);
```

### Review Eligibility

The contract does not enforce that a reviewer must have completed a booking with the reviewee — it only prevents duplicate reviews. If the platform requires booking-gated reviews, this check must be implemented in the backend service layer before building the `submit_review` transaction.

### Immutability

Reviews are immutable once submitted. There is no `update_review` or `delete_review` function. This is by design — on-chain reviews serve as a tamper-evident reputation record.
