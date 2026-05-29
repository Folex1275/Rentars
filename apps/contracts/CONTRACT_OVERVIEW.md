# Rentars Contract Overview

Soroban smart contract for the Rentars platform. The contract anchors property
listings on Stellar while keeping bulky listing content (titles, descriptions,
images, amenities) off-chain in Supabase. Integrity between the two layers is
guaranteed by a SHA-256 `data_hash` stored on-chain.

---

## Contracts

### 1. `property-listing`

Manages on-chain property listings. Each listing is owned by an `Address` and
can only be mutated by its owner.

#### On-chain types

##### `PropertyListing`

| Field             | Type            | Notes                                                   |
| ----------------- | --------------- | ------------------------------------------------------- |
| `id`              | `u64`           | Auto-incremented listing identifier.                    |
| `owner`           | `Address`       | Stellar account permitted to mutate the listing.        |
| `title`           | `String`        | Human-readable property title.                          |
| `description`     | `String`        | Property description.                                   |
| `price_per_night` | `i128`          | USDC stroops; used by the booking flow on-chain.        |
| `status`          | `ListingStatus` | `Active` \| `Inactive` \| `Rented`                     |

#### Entry points

- `create_listing(env, owner, title, description, price_per_night) -> u64` —
  creates a new listing. Requires `owner.require_auth()`.
- `update_listing(env, caller, id, title, description, price_per_night)` —
  updates mutable fields. Requires `caller == listing.owner`.
- `update_status(env, caller, id, status)` — owner-only status change.
- `set_rented(env, id)` — marks a listing as `Rented` without owner auth.
  Intended for cross-contract calls from the booking contract. Panics if the
  listing is not currently `Active`.
- `get_listing(env, id) -> PropertyListing` — read-only query.
- `listing_count(env) -> u64` — total listings ever created.

---

### 2. `booking`

Manages rental bookings with overlap prevention, status transitions, escrow ID
tracking, and per-property booking indexes.

#### Cross-Contract Integration

`create_booking` performs two cross-contract calls against the
`property-listing` contract (whose address is stored at initialization):

1. **Verify availability** — calls `get_listing(property_id)` and asserts the
   returned status is `ListingStatus::Active`. Bookings on inactive or
   already-rented properties are rejected.
2. **Mark as rented** — after persisting the booking, calls `set_rented(id)` on
   the property-listing contract to atomically flip the property status to
   `Rented`, preventing double-bookings across contract boundaries.

#### On-chain types

##### `Booking`

| Field          | Type            | Notes                                          |
| -------------- | --------------- | ---------------------------------------------- |
| `id`           | `u64`           | Auto-incremented booking identifier.           |
| `property_id`  | `u64`           | References a `PropertyListing` id.             |
| `tenant`       | `Address`       | Account that created the booking.              |
| `check_in`     | `u64`           | Unix timestamp (seconds).                      |
| `check_out`    | `u64`           | Unix timestamp (seconds).                      |
| `total_price`  | `i128`          | USDC stroops.                                  |
| `status`       | `BookingStatus` | `Pending` → `Confirmed` → `Completed`          |
| `escrow_id`    | `String`        | Off-chain escrow reference (empty until set).  |

#### Entry points

- `initialize(env, admin, property_listing_contract_id)` — one-time setup.
  Stores the admin address and the address of the deployed property-listing
  contract for cross-contract calls.
- `create_booking(env, tenant, property_id, check_in, check_out, total_price) -> u64`
- `cancel_booking(env, caller, booking_id)` — tenant-only.
- `update_status(env, caller, booking_id, new_status)` — admin-only.
- `set_escrow_id(env, caller, booking_id, escrow_id)` — admin-only.
- `get_booking(env, id) -> Booking`
- `get_property_bookings(env, property_id) -> Vec<u64>`
- `check_availability(env, property_id, check_in, check_out) -> bool`
- `booking_count(env) -> u64`

---

### 3. `review-contract`

Allows tenants to submit on-chain reviews for users (owners/properties).
Enforces: rating 1–5, one review per reviewer per subject, unique IDs, and
per-subject review indexes.

#### Entry points

- `submit_review(env, reviewer, reviewee, rating, comment) -> u64`
- `get_review(env, id) -> Review`
- `get_reviews_for_user(env, reviewee) -> Vec<u64>`
- `get_reputation(env, reviewee) -> u32` — average rating × 100.
- `review_count(env) -> u64`

---

## Storage TTL Strategy

Stellar's ledger uses a **state-expiration** model: persistent storage entries
that are not accessed or extended within their TTL window are archived and
become inaccessible until restored. To prevent silent data loss, every contract
in this workspace applies TTL extensions on every persistent write.

### Constants (all contracts)

| Constant        | Value       | Meaning                                                  |
| --------------- | ----------- | -------------------------------------------------------- |
| `TTL_MIN`       | 100 ledgers | Minimum remaining TTL before an extension is triggered.  |
| `TTL_EXTEND_TO` | 100 ledgers | Target TTL applied immediately after every write.        |

### Pattern

```rust
env.storage().persistent().set(&key, &value);
env.storage().persistent().extend_ttl(&key, TTL_MIN, TTL_EXTEND_TO);
```

This ensures every newly written or updated entry starts with a full TTL budget
and is not at risk of expiry between writes.

### Entries covered per contract

#### `property-listing`
- `Listing(id)` — on `create_listing`, `update_listing`, `update_status`, `set_rented`
- `ListingCount` — on every `create_listing`

#### `booking`
- `Booking(id)` — on `create_booking`, `cancel_booking`, `update_status`, `set_escrow_id`
- `BookingCount` — on every `create_booking`
- `PropertyBookings(property_id)` — on every `create_booking`

#### `review-contract`
- `Review(id)` — on `submit_review`
- `ReviewCount` — on every `submit_review`
- `UserReviews(reviewee)` — on every `submit_review`
- `HasReviewed(reviewer, reviewee)` — on every `submit_review`

### Production Tuning

The current values (100 ledgers ≈ 8 minutes at 5 s/ledger) are suitable for
development and testing. For production deployments, `TTL_EXTEND_TO` should be
increased to match the platform's expected activity cadence:

| Cadence          | Recommended `TTL_EXTEND_TO` |
| ---------------- | --------------------------- |
| Active (daily)   | 17,280 ledgers (≈ 1 day)    |
| Normal (weekly)  | 120,960 ledgers (≈ 1 week)  |
| Archive (monthly)| 535,680 ledgers (≈ 1 month) |

---

## Hash generation algorithm (property-listing)

Clients (backend / web) compute `data_hash` as follows before calling
`create_listing` or `update_listing`:

1. Build a **canonical** JSON object containing the off-chain property fields
   that must be tamper-evident. The canonical field set is:

   ```json
   {
     "id": "<listing id, as string>",
     "title": "<string>",
     "description": "<string>",
     "address": "<string>",
     "city": "<string>",
     "country": "<string>",
     "latitude": <number>,
     "longitude": <number>,
     "bedrooms": <integer>,
     "bathrooms": <integer>,
     "max_guests": <integer>,
     "amenities": ["<string>", ...],
     "images":    ["<url>", ...],
     "price_per_night": "<i128 as string>",
     "owner": "<Stellar address>"
   }
   ```

2. Serialise as **canonical JSON** (UTF-8, keys sorted lexicographically, no
   insignificant whitespace).

3. Compute `SHA-256` over the canonical JSON byte string.

4. Encode as **lowercase hexadecimal** (64 ASCII chars).

### Reference (Node.js / TypeScript)

```ts
import { createHash } from "node:crypto";

export function hashProperty(property: CanonicalProperty): string {
  const canonical = JSON.stringify(property, Object.keys(property).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
```

---

## Ownership & authorisation

`update_listing` enforces two checks:

1. `caller.require_auth()` — the caller must have signed for `caller`.
2. `listing.owner == caller` — the on-chain record's owner must equal the
   supplied address.

`set_rented` is intentionally owner-free — it is designed to be called by the
booking contract as part of an atomic booking flow. The booking contract itself
has already verified the tenant's auth before invoking `set_rented`.
