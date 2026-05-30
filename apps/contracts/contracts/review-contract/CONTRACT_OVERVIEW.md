# Review Contract — CONTRACT_OVERVIEW

> Soroban smart contract for on-chain reviews and reputation scoring on the Stellar blockchain.

---

## Purpose

The Review Contract enables tenants and property owners to leave verifiable, tamper-proof reviews after a completed booking. Ratings are aggregated on-chain to produce a reputation score for each participant, removing the need to trust a centralised review platform.

---

## Data Structures

### `Review`

| Field          | Type     | Description                                              |
|----------------|----------|----------------------------------------------------------|
| `id`           | `u64`    | Auto-incremented on-chain review ID                      |
| `booking_id`   | `u64`    | The booking this review is tied to                       |
| `reviewer_did` | `String` | DID of the account submitting the review                 |
| `target_did`   | `String` | DID of the account being reviewed                        |
| `rating`       | `u32`    | Star rating — must be between **1** and **5** inclusive  |
| `comment`      | `String` | Free-text comment — maximum **500 characters**           |
| `timestamp`    | `u64`    | Unix timestamp (seconds) when the review was submitted   |

### `ReviewError`

| Variant               | Code | Triggered when                                                    |
|-----------------------|------|-------------------------------------------------------------------|
| `InvalidRating`       | 1    | `rating` is outside the range 1–5                                 |
| `DuplicateReview`     | 2    | The same reviewer has already reviewed the same booking           |
| `UnauthorizedReviewer`| 3    | Reserved for future caller-authentication checks                  |
| `InvalidInput`        | 4    | A DID is empty, or the comment exceeds 500 characters             |

---

## Storage Layout

| Key                              | Value          | Description                                              |
|----------------------------------|----------------|----------------------------------------------------------|
| `DataKey::Review(id)`            | `Review`       | Individual review record                                 |
| `DataKey::ReviewCount`           | `u64`          | Total reviews ever submitted (used for ID generation)    |
| `DataKey::UserReviews(did)`      | `Vec<u64>`     | Ordered list of review IDs targeting a given DID         |
| `DataKey::ReviewExists(bid, did)`| `bool`         | Deduplication flag: one review per (booking, reviewer)   |

---

## Contract Interface

### `submit_review`

```rust
pub fn submit_review(
    env: Env,
    booking_id: u64,
    reviewer_did: String,
    target_did: String,
    rating: u32,
    comment: String,
) -> u64
```

Submits a new review. Returns the new review's on-chain ID.

**Validation rules:**
- `reviewer_did` and `target_did` must be non-empty strings.
- `comment` must be ≤ 500 characters.
- `rating` must be in the range **1–5** (inclusive).
- Each `(booking_id, reviewer_did)` pair may only be reviewed **once** — subsequent calls panic with `DuplicateReview`.

**Side effects:**
- Stores the `Review` struct under `DataKey::Review(id)`.
- Appends the review ID to `DataKey::UserReviews(target_did)`.
- Sets `DataKey::ReviewExists(booking_id, reviewer_did)` to prevent duplicates.
- `timestamp` is set automatically from `env.ledger().timestamp()`.

---

### `get_reviews_for_user`

```rust
pub fn get_reviews_for_user(env: Env, target_did: String) -> Vec<Review>
```

Returns all `Review` records written about `target_did`, in submission order.  
Returns an empty `Vec` if the user has no reviews.

---

### `get_reputation`

```rust
pub fn get_reputation(env: Env, target_did: String) -> u32
```

Returns the **average rating** (integer, rounded down) across all reviews for `target_did`.  
Returns `0` if the user has no reviews yet.

---

### `get_review`

```rust
pub fn get_review(env: Env, review_id: u64) -> Review
```

Returns a single `Review` by its on-chain ID. Panics with `"Review not found"` if the ID does not exist.

---

## Usage Example

```rust
// Tenant reviews a property owner after a completed booking
let review_id = client.submit_review(
    &booking_id,          // u64 — the completed booking
    &reviewer_did,        // String — tenant's DID
    &owner_did,           // String — owner's DID
    &5_u32,               // rating: 5 stars
    &String::from_str(&env, "Fantastic property, exactly as described!"),
);

// Fetch all reviews for the owner
let reviews = client.get_reviews_for_user(&owner_did);

// Get the owner's reputation score
let score = client.get_reputation(&owner_did); // e.g. 4
```

---

## Integration Notes

- **Booking validation**: This contract does not verify that a booking is in `Completed` status — that check should be performed by the calling client or a future cross-contract call to the main `RentarsContract`.
- **DID format**: DIDs are stored as opaque `String` values. The recommended format is `did:stellar:<public_key>`, but any non-empty string is accepted.
- **Reputation score**: The score is a simple integer average. Future versions may introduce weighted scoring or decay over time.
- **No authentication on submit**: The contract currently does not call `require_auth()` on the reviewer. Caller authentication should be added when integrating with the Freighter wallet flow.

---

## Building

```bash
# From the review-contract directory
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM artifact will be at:
```
target/wasm32-unknown-unknown/release/review_contract.wasm
```
