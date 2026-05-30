# Booking Contract — Overview

**Contract:** `booking`  
**Language:** Rust (Soroban SDK, `#![no_std]`)  
**Network:** Stellar (Testnet / Mainnet)  
**Version:** 0.1.0  
**Depends on:** `property-listing` contract (cross-contract calls)

---

## Purpose

The `booking` contract manages the full lifecycle of rental bookings on the Rentars platform. It enforces date-overlap prevention, drives status transitions through a defined state machine, tracks off-chain escrow references, and atomically marks properties as `Rented` via cross-contract calls to the `property-listing` contract.

Key responsibilities:
- Create bookings with validated date ranges and price
- Prevent double-bookings via per-property booking indexes and overlap checks
- Enforce a strict status state machine (`Pending → Confirmed → Completed`, with `Cancelled` as an exit from `Pending` or `Confirmed`)
- Allow tenants to cancel their own bookings
- Allow the admin to drive status transitions and attach escrow IDs
- Atomically flip property status to `Rented` on booking creation

---

## Data Structures

### `Booking` (struct)

The primary on-chain record for a rental booking.

| Field          | Type            | Description                                                          |
|----------------|-----------------|----------------------------------------------------------------------|
| `id`           | `u64`           | Auto-incremented booking identifier.                                 |
| `property_id`  | `u64`           | References a `PropertyListing` ID in the property-listing contract.  |
| `tenant`       | `Address`       | Stellar account that created the booking.                            |
| `check_in`     | `u64`           | Check-in date as Unix timestamp (seconds).                           |
| `check_out`    | `u64`           | Check-out date as Unix timestamp (seconds).                          |
| `total_price`  | `i128`          | Total booking price in USDC stroops (1 USDC = 10,000,000 stroops).  |
| `status`       | `BookingStatus` | Current lifecycle status.                                            |
| `escrow_id`    | `String`        | Off-chain escrow reference. Empty string until set by admin.         |

### `BookingStatus` (enum)

| Variant     | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `Pending`   | Booking created, awaiting admin confirmation.                               |
| `Confirmed` | Admin has confirmed the booking.                                            |
| `Cancelled` | Booking was cancelled by tenant or admin. Terminal state.                   |
| `Completed` | Stay has concluded. Terminal state.                                         |

**Valid transitions:**

```
Pending ──► Confirmed ──► Completed
   │              │
   └──► Cancelled ◄┘
```

Any other transition panics with `"Invalid status transition"`.

### `DataKey` (enum — storage keys)

| Variant                        | Storage Type | Description                                                    |
|--------------------------------|--------------|----------------------------------------------------------------|
| `Initialized`                  | Instance     | Boolean flag; prevents re-initialization.                      |
| `Admin`                        | Instance     | Admin `Address` set at initialization.                         |
| `PropertyListingContractId`    | Instance     | `Address` of the deployed property-listing contract.           |
| `Booking(u64)`                 | Persistent   | Individual booking record keyed by booking ID.                 |
| `BookingCount`                 | Persistent   | Running counter; also serves as the last-used ID.              |
| `PropertyBookings(u64)`        | Persistent   | `Vec<u64>` of booking IDs for a given property ID.             |

---

## Public Functions

### `initialize`

```rust
pub fn initialize(env: Env, admin: Address, property_listing_contract_id: Address)
```

One-time contract setup. Must be called immediately after deployment.

**Auth:** `admin.require_auth()`.

**Errors:** Panics with `"Already initialized"` if called more than once.

**Side effects:** Stores `Admin`, `PropertyListingContractId`, and `Initialized = true` in instance storage.

---

### `create_booking`

```rust
pub fn create_booking(
    env: Env,
    tenant: Address,
    property_id: u64,
    check_in: u64,
    check_out: u64,
    total_price: i128,
) -> u64
```

Creates a new booking for a property.

**Auth:** `tenant.require_auth()`.

**Validation (in order):**
1. `check_in < check_out` — panics with `"check_in must be before check_out"`
2. `total_price > 0` — panics with `"total_price must be positive"`
3. Cross-contract: `get_listing(property_id).status == Active` — panics with `"Property is not available for booking"`
4. No date overlap with any non-cancelled booking for the same property — panics with `"Booking dates overlap with an existing booking"`

**Returns:** The new booking's `u64` ID.

**Side effects:**
1. Persists `Booking(id)` with `status = Pending` and empty `escrow_id`
2. Increments `BookingCount`
3. Appends `id` to `PropertyBookings(property_id)`
4. Cross-contract call: `set_rented(property_id)` on the property-listing contract

**Overlap detection algorithm:**
```
overlaps = NOT (check_out <= existing.check_in OR check_in >= existing.check_out)
```
Cancelled bookings are skipped — they free up their date range.

---

### `cancel_booking`

```rust
pub fn cancel_booking(env: Env, caller: Address, booking_id: u64)
```

Cancels a booking. Tenant-only.

**Auth:** `caller.require_auth()` + `booking.tenant == caller`.

**Errors:**
- `"Booking not found"` — ID does not exist
- `"Unauthorized"` — caller is not the tenant
- `"Booking already cancelled"` — already in `Cancelled` state
- `"Cannot cancel a completed booking"` — already in `Completed` state

**Side effects:** Sets `status = Cancelled` and extends TTL on `Booking(booking_id)`.

---

### `update_status`

```rust
pub fn update_status(
    env: Env,
    caller: Address,
    booking_id: u64,
    new_status: BookingStatus,
)
```

Drives a booking through its status state machine. Admin-only.

**Auth:** `caller.require_auth()` + `caller == admin`.

**Valid transitions:**

| From        | To          |
|-------------|-------------|
| `Pending`   | `Confirmed` |
| `Pending`   | `Cancelled` |
| `Confirmed` | `Completed` |
| `Confirmed` | `Cancelled` |

All other transitions panic with `"Invalid status transition"`.

**Errors:** `"Booking not found"`, `"Unauthorized"`, `"Invalid status transition"`.

---

### `set_escrow_id`

```rust
pub fn set_escrow_id(
    env: Env,
    caller: Address,
    booking_id: u64,
    escrow_id: String,
)
```

Attaches an off-chain escrow reference to a booking. Admin-only.

**Auth:** `caller.require_auth()` + `caller == admin`.

**Errors:** `"Booking not found"`, `"Unauthorized"`.

**Side effects:** Updates `escrow_id` on `Booking(booking_id)` and extends TTL.

---

### `get_booking`

```rust
pub fn get_booking(env: Env, id: u64) -> Booking
```

Retrieves a booking by ID. Read-only; no auth required.

**Errors:** Panics with `"Booking not found"` if the ID does not exist.

---

### `get_property_bookings`

```rust
pub fn get_property_bookings(env: Env, property_id: u64) -> Vec<u64>
```

Returns all booking IDs ever created for a given property (including cancelled ones). Read-only; no auth required.

Returns an empty `Vec` if no bookings exist for the property.

---

### `check_availability`

```rust
pub fn check_availability(
    env: Env,
    property_id: u64,
    check_in: u64,
    check_out: u64,
) -> bool
```

Returns `true` if the requested date range has no overlap with any active (non-cancelled) booking for the property. Read-only; no auth required.

Useful for frontend availability calendars before initiating a booking transaction.

---

### `booking_count`

```rust
pub fn booking_count(env: Env) -> u64
```

Returns the total number of bookings ever created. Read-only; no auth required.

Returns `0` if no bookings have been created yet.

---

## Storage Layout

```
Instance Storage
├── Initialized                     → bool
├── Admin                           → Address
└── PropertyListingContractId       → Address

Persistent Storage
├── BookingCount                    → u64
├── Booking(1)                      → Booking
│   Booking(2)                      → Booking
│   Booking(n)                      → Booking
├── PropertyBookings(property_id_1) → Vec<u64>  (booking ID index)
└── PropertyBookings(property_id_n) → Vec<u64>
```

All persistent entries use `extend_ttl(key, TTL_MIN=100, TTL_EXTEND_TO=100)` after every write.

### TTL Strategy

| Constant        | Value       | Meaning                                                  |
|-----------------|-------------|----------------------------------------------------------|
| `TTL_MIN`       | 100 ledgers | Minimum remaining TTL before an extension is triggered.  |
| `TTL_EXTEND_TO` | 100 ledgers | Target TTL applied immediately after every write.        |

**Entries extended on write:**
- `Booking(id)` — on `create_booking`, `cancel_booking`, `update_status`, `set_escrow_id`
- `BookingCount` — on every `create_booking`
- `PropertyBookings(property_id)` — on every `create_booking`

> **Production note:** 100 ledgers ≈ 8 minutes at 5 s/ledger. Set `TTL_EXTEND_TO` to 17,280+ for production.

---

## Error Reference

| Panic message                                  | Trigger                                                          |
|------------------------------------------------|------------------------------------------------------------------|
| `"Already initialized"`                        | `initialize` called more than once                               |
| `"check_in must be before check_out"`          | `check_in >= check_out` in `create_booking`                      |
| `"total_price must be positive"`               | `total_price <= 0` in `create_booking`                           |
| `"Contract not initialized"`                   | `create_booking` called before `initialize`                      |
| `"Property is not available for booking"`      | Property status is not `Active` at booking time                  |
| `"Booking dates overlap with an existing booking"` | Date range conflicts with a non-cancelled booking            |
| `"Booking not found"`                          | `get_booking`, `cancel_booking`, `update_status`, `set_escrow_id` with unknown ID |
| `"Unauthorized"`                               | Tenant mismatch in `cancel_booking`; non-admin in `update_status`/`set_escrow_id` |
| `"Booking already cancelled"`                  | `cancel_booking` on an already-cancelled booking                 |
| `"Cannot cancel a completed booking"`          | `cancel_booking` on a completed booking                          |
| `"Invalid status transition"`                  | `update_status` with a disallowed transition                     |

---

## Cross-Contract Integration

### Dependency: `property-listing` contract

The booking contract imports `property_listing::PropertyListingContractClient` and calls two functions during `create_booking`:

```rust
// 1. Verify the property is available
let listing = listing_client.get_listing(&property_id);
assert!(listing.status == ListingStatus::Active, "Property is not available for booking");

// 2. Atomically mark it as Rented
listing_client.set_rented(&property_id);
```

Both calls happen within the same Soroban transaction, ensuring atomicity. If `set_rented` panics (e.g., the property was already rented by a concurrent transaction), the entire `create_booking` call rolls back.

The property-listing contract address is stored in instance storage under `PropertyListingContractId` and set during `initialize`.

---

## Integration Notes

### Backend Integration

The backend uses `BookingClient` (`apps/backend/src/blockchain/bookingClient.ts`) to interact with this contract.

**Read operations** (no signing required):
```typescript
const client = new BookingClient(contractId, rpcUrl);
const booking = await client.getBooking(BigInt(id));
const available = await client.checkAvailability(BigInt(propertyId), checkIn, checkOut);
const bookingIds = await client.getPropertyBookings(BigInt(propertyId));
```

**Write operations** return `xdr.Operation` objects. The caller wraps them in a transaction, signs, and submits:
```typescript
const op = client.buildCreateBooking({ tenant, property_id, check_in, check_out, total_price });
// wrap in TransactionBuilder, sign with tenant keypair, submit
```

**Booking service flow:**
1. Frontend calls `check_availability` to show available dates
2. User initiates booking — frontend (or backend) builds and submits `create_booking` transaction signed by the tenant
3. Backend listens for the transaction result and stores booking metadata in Supabase
4. Admin calls `update_status` to confirm the booking and `set_escrow_id` to attach the escrow reference
5. On checkout, admin calls `update_status` to mark as `Completed`

### Frontend Integration

The frontend uses `check_availability` for calendar UI before presenting the booking form. The `create_booking` transaction must be signed by the tenant's Stellar wallet (e.g., Freighter). Status transitions and escrow management are admin-only and handled by the backend.

### Supabase Sync

The `bookings` table in Supabase mirrors on-chain booking data for fast querying. The backend should sync Supabase records whenever on-chain state changes (booking created, status updated, escrow set).
