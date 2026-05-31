# Rentars Database Schema Documentation

## Overview

The Rentars database is built on PostgreSQL and manages all core entities for the peer-to-peer rental platform on Stellar blockchain.

## Tables

### users
Core user authentication and identity table.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | | Hashed password (bcrypt) |
| stellar_address | VARCHAR(56) | | Stellar wallet address for blockchain operations |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### profiles
Extended user profile information.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique profile identifier |
| user_id | UUID | UNIQUE, FK users(id) | Reference to user |
| stellar_address | VARCHAR(56) | | Stellar address (denormalized) |
| display_name | VARCHAR(255) | | User's display name |
| avatar_url | VARCHAR(255) | | Profile picture URL |
| bio | TEXT | | User biography |
| phone | VARCHAR(20) | | Contact phone number |
| verified | BOOLEAN | DEFAULT FALSE | KYC verification status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Profile creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### properties
Rental property listings.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique property identifier |
| owner_id | UUID | FK users(id) | Property owner |
| title | VARCHAR(255) | NOT NULL | Property name |
| description | TEXT | | Detailed description |
| location | VARCHAR(255) | | Property location |
| price_per_night | DECIMAL(10,2) | NOT NULL, > 0 | Nightly rental rate in USDC |
| max_guests | INT | DEFAULT 1 | Maximum occupancy |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Listing creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### bookings
Rental booking records with blockchain integration.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique booking identifier |
| property_id | UUID | FK properties(id) | Booked property |
| tenant_id | UUID | FK users(id) | Booking tenant |
| check_in | DATE | NOT NULL | Check-in date |
| check_out | DATE | NOT NULL, > check_in | Check-out date |
| total_price | DECIMAL(10,2) | NOT NULL, > 0 | Total booking cost in USDC |
| status | VARCHAR(50) | DEFAULT 'pending' | Booking status (pending, confirmed, completed, cancelled) |
| escrow_id | VARCHAR(255) | | Soroban escrow contract ID |
| blockchain_booking_id | VARCHAR(255) | | On-chain booking identifier |
| blockchain_status | VARCHAR(50) | | On-chain status (active, released, disputed) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Booking creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### availability_ranges
Property availability calendar.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique range identifier |
| property_id | UUID | FK properties(id) | Associated property |
| start_date | DATE | NOT NULL | Range start date |
| end_date | DATE | NOT NULL | Range end date |
| is_available | BOOLEAN | DEFAULT TRUE | Availability flag |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### wallet_challenges
Stellar wallet authentication challenges.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique challenge identifier |
| stellar_address | VARCHAR(56) | NOT NULL | Stellar address being authenticated |
| challenge | VARCHAR(255) | UNIQUE, NOT NULL | Random challenge string |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Challenge creation time |
| expires_at | TIMESTAMP | DEFAULT +10 minutes | Challenge expiration time |
| used | BOOLEAN | DEFAULT FALSE | Whether challenge was used |

### blockchain_logs
Audit trail for all blockchain operations.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique log entry identifier |
| operation | VARCHAR(100) | NOT NULL | Operation type (e.g., 'create_escrow', 'release_escrow') |
| input_json | JSONB | | Operation input parameters |
| result_json | JSONB | | Operation result/response |
| error_message | TEXT | | Error details if operation failed |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Log entry creation time |

## Indexes

Performance indexes are created on frequently queried columns:

- `idx_properties_owner_id` - Query properties by owner
- `idx_bookings_property_id` - Query bookings by property
- `idx_bookings_tenant_id` - Query bookings by tenant
- `idx_bookings_escrow_id` - Query bookings by escrow
- `idx_bookings_blockchain_booking_id` - Query bookings by blockchain ID
- `idx_availability_ranges_property_id` - Query availability by property
- `idx_wallet_challenges_stellar_address` - Query challenges by address
- `idx_wallet_challenges_challenge` - Query challenges by challenge string
- `idx_profiles_user_id` - Query profile by user
- `idx_profiles_stellar_address` - Query profile by Stellar address
- `idx_users_stellar_address` - Query user by Stellar address
- `idx_blockchain_logs_operation` - Query logs by operation type
- `idx_blockchain_logs_created_at` - Query logs by timestamp

## Functions

### update_updated_at_column()
Automatically updates the `updated_at` timestamp on row modifications. Triggered on all main tables.

### create_booking_atomic(property_id, tenant_id, check_in, check_out, total_price)
Atomically creates a booking with overlap detection. Returns booking UUID.

**Validations:**
- Checks for overlapping bookings on the same property
- Raises exception if overlap detected

### confirm_booking_atomic(booking_id, escrow_id, blockchain_booking_id)
Atomically confirms a booking and links blockchain data. Returns boolean.

**Updates:**
- Sets status to 'confirmed'
- Links escrow and blockchain IDs
- Sets blockchain_status to 'active'

## Constraints

- `check_price_positive` - Property price_per_night > 0
- `check_total_price_positive` - Booking total_price > 0
- `check_dates_valid` - Booking check_out > check_in

## Migration Order

Migrations are applied in sequence:

1. `00001_initial_schema.sql` - Core tables
2. `00002_add_booking_blockchain_fields.sql` - Blockchain fields
3. `00003_triggers.sql` - Auto-update triggers
4. `00004_create_wallet_auth_tables.sql` - Wallet authentication
5. `00005_create_profile_table.sql` - User profiles
6. `00006_add_atomic_functions.sql` - Atomic operations
7. `00007_add_payment_constraints.sql` - Payment validation
8. `00008_create_blockchain_logs.sql` - Audit logging

## Running Migrations

To initialize the database:

```bash
psql -U postgres -d rentars -f apps/backend/database/setup.sql
```

Or run individual migrations:

```bash
psql -U postgres -d rentars -f apps/backend/database/migrations/00001_initial_schema.sql
```
