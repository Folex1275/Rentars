# Rentars Contract Overview

Soroban smart contract for the Rentars platform. The contract anchors property
listings on Stellar while keeping bulky listing content (titles, descriptions,
images, amenities) off-chain in Supabase. Integrity between the two layers is
guaranteed by a SHA-256 `data_hash` stored on-chain.

## On-chain types

### `PropertyListing`

| Field             | Type      | Notes                                                   |
| ----------------- | --------- | ------------------------------------------------------- |
| `id`              | `u64`     | Caller-supplied listing identifier (unique).            |
| `owner`           | `Address` | Stellar account permitted to mutate the listing.        |
| `data_hash`       | `String`  | Hex-encoded SHA-256 of the canonical off-chain payload. |
| `price_per_night` | `i128`    | USDC stroops; used by the booking flow on-chain.        |
| `available`       | `bool`    | Toggled by the booking flow.                            |

The full title, description, photos, and other rich fields are **not** stored
on-chain — they live in Supabase. Only `data_hash` represents them on-chain.

## Listing entry points

- `create_listing(env, id, data_hash, owner, price_per_night)` — creates a new
  listing. Requires `owner.require_auth()`. Fails if `id` already exists.
- `update_listing(env, id, data_hash, owner)` — replaces the `data_hash` for an
  existing listing. Requires `owner.require_auth()` and verifies that the
  supplied `owner` matches the on-chain owner recorded at creation time.
- `get_listing(env, id) -> PropertyListing` — returns the full on-chain
  listing record.

## Hash generation algorithm

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
     "amenities": ["<string>", ...],   // sorted alphabetically
     "images":    ["<url>", ...],      // preserved in display order
     "price_per_night": "<i128 as string>",
     "owner": "<Stellar address>"
   }
   ```

2. Serialise the object as **canonical JSON**:
   - UTF-8 encoded.
   - Object keys sorted lexicographically.
   - No insignificant whitespace (no spaces after `:` or `,`, no trailing
     newline).
   - Numeric values emitted without redundant precision; `i128` price values
     emitted as decimal strings to avoid floating-point loss.
   - Arrays preserve the ordering rules above (amenities sorted, images in
     display order).

3. Compute `SHA-256` over the canonical JSON byte string.

4. Encode the 32-byte digest as **lowercase hexadecimal** (64 ASCII chars) and
   pass it as the `data_hash` argument to the contract.

### Reference (Node.js / TypeScript)

```ts
import { createHash } from "node:crypto";

export function hashProperty(property: CanonicalProperty): string {
  const canonical = JSON.stringify(property, Object.keys(property).sort());
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
```

The backend recomputes the hash on every read of the Supabase row and compares
it against `get_listing(id).data_hash`; a mismatch indicates tampering with
the off-chain record and the listing is rejected from API responses.

## Ownership & authorisation

`update_listing` enforces two checks:

1. `owner.require_auth()` — the caller must have signed for `owner`.
2. `listing.owner == owner` — the on-chain record's owner must equal the
   supplied address.

Both checks must pass; otherwise the call aborts and no state is written.

## Storage layout

All listing and booking records live in **instance storage** keyed by the
`DataKey` enum:

- `DataKey::Property(u64)` → `PropertyListing`
- `DataKey::Booking(u64)`  → `Booking`
- `DataKey::BookingCount`  → `u64` (monotonic booking id counter)

Listing ids are caller-supplied and not counted on-chain; the backend is the
source of truth for id allocation (typically the Supabase row id).
