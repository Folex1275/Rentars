# Rentars Architecture

This document provides a comprehensive overview of the Rentars system design, data flow, and technology decisions.

---

## System Overview

Rentars is a decentralized peer-to-peer rental platform built on the Stellar blockchain. The system connects property owners and tenants through a modern web interface, REST API, and Soroban smart contracts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Rentars Architecture                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │    User Browser     │
                              │  (Next.js Frontend) │
                              └──────────┬──────────┘
                                         │
                                         │ HTTPS
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend API Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │  Property   │  │  Booking    │  │   Wallet    │        │
│  │ Controller  │  │  Controller │  │  Controller │  │  Controller │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                        Service Layer                            │        │
│  │  AuthService | PropertyService | BookingService | WalletService │        │
│  └──────────────────────────────┬──────────────────────────────────┘        │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐             │
│  │  Supabase   │        │    Redis    │        │   Stellar   │             │
│  │  (Postgres) │        │   (Cache)   │        │  (Soroban)  │             │
│  └─────────────┘        └─────────────┘        └─────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 15 | React 18, App Router, Server Components |
| Styling | Tailwind CSS | Rapid UI development, consistency |
| Backend | Node.js + Bun | Fast runtime, native TypeScript support |
| API | Express.js | Simple, well-documented, middleware ecosystem |
| Database | Supabase (PostgreSQL) | Managed Postgres, Auth, Row Level Security |
| Cache | Redis | Sub-millisecond latency for frequent queries |
| Smart Contracts | Rust + Soroban | Memory-safe, WASM compilation |
| Blockchain | Stellar | Fast (~5s), low fees, built-in USDC support |
| Wallet | Freighter | Stellar's official browser wallet |

---

## Data Flow

### Booking Creation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Tenant  │     │ Frontend │     │ Backend  │     │ Contract │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Select dates│                │                │
     │───────────────>│                │                │
     │                │                │                │
     │ 2. Create booking API          │                │
     │                │──────────────>│                │
     │                │                │                │
     │                │ 3. Store in DB │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │ 4. Return booking
     │                │<───────────────│                │
     │                │                │                │
     │ 5. Sign with Freighter         │                │
     │────────────────────────────────│                │
     │                │                │                │
     │ 6. Submit booking transaction  │                │
     │───────────────────────────────────────────────>│
     │                │                │                │
     │                │ 7. Book property (USDC escrow) │
     │                │<────────────────────────────────│
     │                │                │                │
     │ 8. Booking confirmed           │                │
     │<───────────────│                │                │
     │                │                │                │
```

### Escrow Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Escrow State Machine                       │
└─────────────────────────��────────────────────────────────────────┘

   ┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────┐
   │ CREATED │─────>│  LOCKED │─────>│ CONFIRMED│─────>│RELEASED │
   └─────────┘      └─────────┘      └──────────┘      └─────────┘
       │                 │                 │                 │
       │                 │                 │                 │
       │    Tenant       │    Tenant       │    Owner        │   Funds
       │    pays         │    pays         │   confirms      │   released
       │    USDC         │    USDC         │   completion    │   to owner
       │                 │                 │                 │
       │                 ▼                 │                 │
       │          ┌─────────────┐          │                 │
       └─────────>│   CANCELLED │<─────────┘                 │
                  └─────────────┘                            │
                        │                                    │
                        │    Full refund                     │
                        │    to tenant                       │
                        └────────────────────────────────────┘
```

---

## Smart Contract Architecture

Rentars uses three interconnected Soroban smart contracts:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Contract Architecture                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Booking Contract  │  │  Property Contract  │  │   Review Contract   │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ - book_property()   │  │ - list_property()   │  │ - submit_review()   │
│ - confirm_rental()  │  │ - update_property() │  │ - get_reviews()     │
│ - cancel_booking()  │  │ - get_property()    │  │ - calculate_rating()│
│ - get_booking()     │  │ - search_properties │  │                     │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       TrustlessWork           │
                    │    (Escrow Guardian)          │
                    ├───────────────────────────────┤
                    │ - Holds USDC until completion │
                    │ - Releases on confirmation    │
                    │ - Refunds on cancellation     │
                    └───────────────────────────────┘
```

### Property Contract

Manages property listings on-chain.

```rust
// Core functions
fn list_property(owner: Address, title: String, description: String, 
                 price_per_night: i128, location: String) -> u64

fn update_property(property_id: u64, owner: Address, 
                   title: Option<String>, price_per_night: Option<i128>) -> bool

fn get_property(id: u64) -> Property

fn search_properties(location: String, min_price: i128, 
                     max_price: i128) -> Vec<Property>
```

### Booking Contract

Handles booking lifecycle and escrow.

```rust
// Core functions
fn book_property(tenant: Address, property_id: u64, 
                 check_in: u64, check_out: u64) -> u64

fn confirm_rental(booking_id: u64, caller: Address) -> bool

fn cancel_booking(booking_id: u64, caller: Address) -> bool

fn get_booking(id: u64) -> Booking

fn get_tenant_bookings(tenant: Address) -> Vec<Booking>

fn get_owner_bookings(owner: Address) -> Vec<Booking>
```

### Review Contract

Manages property reviews and ratings.

```rust
// Core functions
fn submit_review(reviewer: Address, property_id: u64, 
                 rating: u32, comment: String) -> u64

fn get_property_reviews(property_id: u64) -> Vec<Review>

fn calculate_average_rating(property_id: u64) -> f64
```

---

## Database Schema

### ER Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   properties    │       │    bookings     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (UUID)       │──┐    │ id (UUID)       │──┐    │ id (UUID)       │
│ email (UNIQUE)  │  │    │ owner_id (FK)   │<─┘    │ property_id(FK) │<──┐
│ password_hash   │  │    │ title           │       │ tenant_id (FK)  │  │
│ wallet_address  │  │    │ description     │       │ check_in        │  │
│ role (ENUM)     │  │    │ price_per_night │       │ check_out       │  │
│ created_at      │  │    │ location        │       │ total_price     │  │
│ updated_at      │  │    │ images (JSON)   │       │ status (ENUM)   │  │
└────────┬────────┘  │    │ amenities (JSON)│       │ escrow_tx_hash  │  │
         │           │    │ created_at      │       │ created_at      │  │
         │           │    │ updated_at      │       │ updated_at      │──┘
         │           │    └─────────────────┘       └────────┬────────┘
         │           │                                        │
         │           │       ┌─────────────────┐              │
         └──────────>│       │ property_images │              │
                     │       ├─────────────────┤              │
                     │       │ id (UUID)       │              │
                     │       │ property_id(FK) │──────────────┘
                     │       │ url             │
                     │       │ order           │
                     │       └─────────────────┘
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with email/password and wallet auth |
| `properties` | Property listings with metadata |
| `bookings` | Booking records with status tracking |
| `property_images` | Property image attachments |
| `wallet_connections` | Linked wallet addresses |
| `sync_log` | Blockchain sync timestamps |

---

## Caching Strategy

### What's Cached

| Data | TTL | Invalidation |
|------|-----|--------------|
| Property list | 5 min | On property create/update/delete |
| Property detail | 10 min | On property update |
| User session | 1 hour | On logout |
| Booking status | 30 sec | On booking state change |
| Property search results | 2 min | On property create/update |

### Cache Structure

```typescript
// Redis key patterns
'property:list:{filters}'      // Cached property listings
'property:detail:{id}'         // Single property details
'booking:{id}'                 // Booking with escrow status
'user:{id}:session'            // User session data
'escrow:{bookingId}'           // On-chain escrow status
```

### Invalidation Events

```typescript
// When property is updated
await redis.del(`property:detail:${propertyId}`);
await redis.deletePattern('property:list:*');

// When booking status changes
await redis.del(`booking:${bookingId}`);
await redis.del(`escrow:${bookingId}`);
```

---

## Authentication Flow

### Email/Password Authentication

```
┌──────────────────────────────────────────────────────────────┐
│              Email/Password Authentication Flow              │
└──────────────────────────────────────────────────────────────┘

   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  Tenant  │     │ Frontend │     │  Backend │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        │ 1. Enter email/password         │
        │────────────────>│                │
        │                │                │
        │ 2. POST /auth/login             │
        │                │───────────────>│
        │                │                │
        │                │ 3. Verify credentials
        │                │<───────────────│
        │                │                │
        │                │ 4. Return JWT  │
        │                │<───────────────│
        │                │                │
        │ 5. Store token locally          │
        │<────────────────│               │
        │                │                │
        │ 6. Authenticated requests       │
        │───────────────────────────────>│
        │                │                │
```

### Wallet Authentication

```
┌──────────────────────────────────────────────────────────────┐
│              Wallet Authentication Flow                       │
└──────────────────────────────────────────────────────────────┘

   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  Tenant  │     │ Frontend │     │  Backend │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        │ 1. Connect Wallet (Freighter)  │
        │────────────────>│               │
        │                │                │
        │ 2. Get public key               │
        │<────────────────│               │
        │                │                │
        │ 3. Sign challenge message       │
        │────────────────────────────────>│
        │                │                │
        │ 4. Verify signature             │
        │<────────────────────────────────│
        │                │                │
        │ 5. Return JWT                   │
        │<────────────────────────────────│
        │                │                │
```

---

## Blockchain Sync Strategy

### Sync Components

```
┌──────────────────────────────────────────────────────────────┐
│                   Blockchain Sync Service                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Soroban     │───>│  Sync        │───>│  Supabase    │
│  RPC Node    │    │  Service     │    │  Database    │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Redis     │
                    │    Cache     │
                    └──────────────┘
```

### Sync Operations

| Operation | Trigger | Behavior |
|-----------|---------|----------|
| Full Sync | Service start, manual | Scan all events, reconcile state |
| Incremental Sync | Every 30 seconds | Fetch new ledger events |
| Property Sync | Property create/update | Immediate on-chain update |
| Booking Sync | Booking state change | Immediate confirmation |

### Event Processing

```typescript
// Sync service pseudo-code
async function processLedger(ledger: number) {
  const events = await rpc.getEvents(ledger);
  
  for (const event of events) {
    switch (event.type) {
      case 'property_listed':
        await syncProperty(event);
        break;
      case 'booking_created':
        await syncBooking(event);
        break;
      case 'rental_confirmed':
        await confirmEscrowRelease(event);
        break;
    }
  }
  
  await db.syncLog.update({ lastLedger: ledger });
}
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Escrow** | A financial arrangement where a third party holds funds until conditions are met |
| **Listing** | A property posted for rent on the platform |
| **Booking** | A reservation made by a tenant for a specific property and dates |
| **Soroban** | Stellar's smart contract platform |
| **Freighter** | Stellar's browser wallet extension |
| **USDC** | Stablecoin (Circle) issued on Stellar network |
| **DID** | Decentralized Identifier - self-sovereign identity standard |
| **WASM** | WebAssembly - compiled code format for smart contracts |
| **RLS** | Row Level Security - Supabase's database access control |
| **RPC** | Remote Procedure Call - network communication protocol |

---

## Related Documentation

- [Frontend README](apps/web/README.md)
- [Backend README](apps/backend/README.md)
- [Contract Overview](apps/contracts/CONTRACT_OVERVIEW.md)
- [Contributing Guide](CONTRIBUTING.md)