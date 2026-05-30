# Property Listing Contract — Overview

**Contract:** `property-listing`  
**Language:** Rust (Soroban SDK, `#![no_std]`)  
**Network:** Stellar (Testnet / Mainnet)  
**Version:** 0.1.0

---

## Purpose

The `property-listing` contract is the source of truth for property ownership and availability on the Rentars platform. It stores a minimal, tamper-evident record for each property on-chain — owner address, title, description, nightly price, and lifecycle status — while bulky metadata (images, amenities, address details) lives off-chain in Supabase.

Key responsibilities:
- Mint new property listings with auto-incremented IDs
- Enforce owner-only mutations (update fields, change status)
- Expose a `set_rented` entry point for atomic cross-contract calls from the booking contract
- Prevent double-bookings by tracking `Active / Inactive / Rented` status on-chain

---

## Data Structures

### `PropertyListing` (struct)

The primary on-chain record for a property.

| Field             | Type            | Description                                                        |
|-------------------|-----------------|--------------------------------------------------------------------|
| `id`              | `u64`           | Auto-incremented identifier. Assigned by `create_listing`.         |
| `owner`           | `Address`       | Stellar account that owns and may mutate this listing.             |
| `title`           | `String`        | Human-readable property title.                                     |
| `description`     | `String`        | Property description.                                              |
| `price_per_night` | `i128`          | Nightly price in USDC stroops (1 USDC = 10,000,000 stroops).      |
| `status`          | `ListingStatus` | Current lifecycle status of the listing.                           |

### `ListingStatus` (enum)

| Variant    | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| `Active`   | Listing is published and available for booking.                             |
| `Inactive` | Owner has taken the listing offline. Not bookable.                          |
| `Rented`   | A confirmed booking exists. Set atomically by the booking contract.         |

### `DataKey` (enum — storage keys)

| Variant          | Storage Type | Description                                      |
|------------------|--------------|--------------------------------------------------|
| `Listing(u64)`   | Persistent   | Individual listing record keyed by listing ID.   |
| `ListingCount`   | Persistent   | Running counter; also serves as the last-used ID.|

### `Error` (enum — error codes)

| Variant         | Code | Trigger                                                  |
|-----------------|------|----------------------------------------------------------|
| `NotFound`      | 1    | Requested listing ID does not exist.                     |
| `Unauthorized`  | 2    | Caller is not the listing owner.                         |
| `AlreadyExists` | 3    | Reserved for future duplicate-prevention logic.          |
| `InvalidInput`  | 4    | Price ≤ 0 or title is empty.                             |

> **Note:** The contract currently uses `assert!` panics rather than returning `Error` variants. The enum is defined for future structured error handling.

---

## Public Functions

### `create_listing`

```rust
pub fn create_listing(
    env: Env,
    owner: Address,
    title: String,
    description: String,
    price_per_night: i128,
) -> u64
```

Creates a new property listing.

**Auth:** `owner.require_auth()` — the owner must have signed the transaction.

**Validation:**
- `price_per_night > 0` — panics with `"price_per_night must be positive"`
- `title.len() > 0` — panics with `"title must not be empty"`

**Returns:** The new listing's `u64` ID.

**Side effects:**
- Increments `ListingCount`
- Writes `Listing(id)` with `status = Active`
- Extends TTL on both `Listing(id)` and `ListingCount`

---

### `get_listing`

```rust
pub fn get_listing(env: Env, id: u64) -> PropertyListing
```

Retrieves a listing by ID. Read-only; no auth required.

**Errors:** Panics with `"Listing not found"` if the ID does not exist.

---

### `update_listing`

```rust
pub fn update_listing(
    env: Env,
    caller: Address,
    id: u64,
    title: String,
    description: String,
    price_per_night: i128,
)
```

Updates the mutable fields of an existing listing.

**Auth:** `caller.require_auth()` + `listing.owner == caller`.

**Validation:** Same as `create_listing` (price > 0, title non-empty).

**Errors:**
- `"Listing not found"` — ID does not exist
- `"Unauthorized"` — caller is not the owner
- `"price_per_night must be positive"` / `"title must not be empty"` — invalid input

**Side effects:** Overwrites `Listing(id)` and extends its TTL.

---

### `update_status`

```rust
pub fn update_status(env: Env, caller: Address, id: u64, status: ListingStatus)
```

Changes the status of a listing. Owner-only.

**Auth:** `caller.require_auth()` + `listing.owner == caller`.

**Errors:** `"Listing not found"`, `"Unauthorized"`.

**Side effects:** Overwrites `Listing(id)` with the new status and extends TTL.

---

### `set_rented`

```rust
pub fn set_rented(env: Env, id: u64)
```

Marks a listing as `Rented`. **No owner auth required.**

This entry point is exclusively for cross-contract calls from the booking contract. When the booking contract calls `set_rented`, Soroban's cross-contract invocation model satisfies authorization automatically.

**Errors:**
- `"Listing not found"` — ID does not exist
- `"Property is not available for booking"` — listing is not currently `Active`

**Side effects:** Sets `status = Rented` and extends TTL on `Listing(id)`.

---

### `listing_count`

```rust
pub fn listing_count(env: Env) -> u64
```

Returns the total number of listings ever created. Read-only; no auth required.

Returns `0` if no listings have been created yet.

---

## Storage Layout

```
Persistent Storage
├── ListingCount                    → u64   (auto-increment counter)
└── Listing(1)                      → PropertyListing
    Listing(2)                      → PropertyListing
    Listing(n)                      → PropertyListing
```

All entries use persistent storage. Every write is immediately followed by `extend_ttl(key, TTL_MIN=100, TTL_EXTEND_TO=100)`.

### TTL Strategy

| Constant        | Value       | Meaning                                                  |
|-----------------|-------------|----------------------------------------------------------|
| `TTL_MIN`       | 100 ledgers | Minimum remaining TTL before an extension is triggered.  |
| `TTL_EXTEND_TO` | 100 ledgers | Target TTL applied immediately after every write.        |

> **Production note:** At 5 s/ledger, 100 ledgers ≈ 8 minutes. For production, `TTL_EXTEND_TO` should be set to at least 17,280 (≈ 1 day) or higher depending on expected activity cadence.

---

## Error Reference

| Panic message                            | Trigger                                                    |
|------------------------------------------|------------------------------------------------------------|
| `"price_per_night must be positive"`     | `price_per_night <= 0` in `create_listing`/`update_listing`|
| `"title must not be empty"`              | `title.len() == 0` in `create_listing`/`update_listing`    |
| `"Listing not found"`                    | `get_listing`, `update_listing`, `update_status`, `set_rented` with unknown ID |
| `"Unauthorized"`                         | `update_listing` or `update_status` called by non-owner    |
| `"Property is not available for booking"`| `set_rented` called on a non-`Active` listing              |

---

## Integration Notes

### Backend Integration

The backend uses `PropertyListingClient` (`apps/backend/src/blockchain/propertyListingClient.ts`) to interact with this contract.

**Read operations** (no signing required):
```typescript
const client = new PropertyListingClient(contractId, rpcUrl);
const listing = await client.getListing(BigInt(id));
const count = await client.listingCount();
```

**Write operations** return `xdr.Operation` objects. The backend (or frontend) must wrap them in a transaction, sign with the owner's keypair, and submit:
```typescript
const op = client.buildCreateListing({ owner, title, description, price_per_night });
// wrap in TransactionBuilder, sign, submit via SorobanRpc.Server
```

**Property service flow:**
1. Frontend collects property metadata
2. Backend validates and stores metadata in Supabase (`properties` table)
3. Backend (or frontend) calls `create_listing` on-chain with owner address and price
4. The returned on-chain `id` is stored in Supabase alongside the off-chain metadata

### Frontend Integration

The frontend reads listing data primarily from Supabase for performance. On-chain reads via `get_listing` are used to verify ownership and status before booking flows. The `price_per_night` on-chain value is the authoritative price used in booking calculations.

### Cross-Contract Integration (Booking Contract)

The booking contract calls `set_rented(property_id)` as part of `create_booking`. This is an atomic operation within the same Soroban transaction:

```
create_booking (booking contract)
  └─► get_listing(property_id)   → verify Active status
  └─► [persist booking]
  └─► set_rented(property_id)    → flip status to Rented
```

The `set_rented` function intentionally skips owner auth — the booking contract has already verified the tenant's authorization before invoking it.
