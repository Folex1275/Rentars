# Rentars

![Backend CI](https://github.com/Rentars/Rentars/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI](https://github.com/Rentars/Rentars/actions/workflows/frontend-ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/Rentars/Rentars/graph/badge.svg)](https://codecov.io/gh/Rentars/Rentars)

> Decentralized peer-to-peer rental platform built on the [Stellar](https://stellar.org) blockchain.

Rentars is a fork/evolution of [StellarRent](https://github.com/Stellar-Rent/stellar-rent), rebranded and scaffolded as **Rentars**. It inherits the same mission: eliminate rental intermediaries (Airbnb, agencies) by leveraging Stellar's fast transactions (~3–5s), near-zero fees (~$0.000001), and Soroban smart contracts for trustless escrow.

---

## Why Rentars?

Traditional rental platforms charge 7–20% in fees, take 1–7 days to process payments, and exclude small property owners in emerging markets. Rentars solves this by:

- **Minimal fees** — Stellar's near-zero transaction costs passed directly to users
- **Instant USDC payments** — Payments settle in seconds, not days
- **Trustless escrow** — Soroban smart contracts hold funds until rental conditions are met
- **Full transparency** — Every transaction recorded on Stellar's public ledger
- **No middlemen** — Direct owner-to-tenant relationships

---

## Built on Stellar

Rentars is proudly built on the **Stellar blockchain**, leveraging:

- **Soroban** — Stellar's smart contract platform for escrow and rental logic
- **USDC** — Stablecoin payments for predictable pricing
- **Freighter Wallet** — Browser wallet integration for seamless UX
- **Stellar Testnet** — Safe development and testing environment

---

## Monorepo Structure

```
rentars/
├── apps/
│   ├── web/                  # Next.js 15 frontend (TypeScript + Tailwind CSS)
│   │   ├── src/
│   │   │   ├── app/          # Next.js App Router pages
│   │   │   ├── components/   # UI components (PropertyCard, PropertyGrid, etc.)
│   │   │   ├── hooks/        # React hooks (useProperties, useBooking, etc.)
│   │   │   └── types/        # Shared TypeScript types
│   │   └── package.json
│   │
│   ├── backend/              # Node.js/Express API (Bun runtime)
│   │   ├── src/
│   │   │   ├── controllers/  # Request handlers (auth, property, booking)
│   │   │   ├── middleware/   # Auth, rate limiting, error handling
│   │   │   ├── routes/       # Express route definitions
│   │   │   ├── services/     # Business logic layer
│   │   │   ├── config/       # Supabase, Redis configuration
│   │   │   └── types/        # TypeScript type definitions
│   │   └── package.json
│   │
│   └── contracts/            # Soroban smart contracts (Rust)
│       ├── src/
│       │   └── lib.rs        # Rental contract (list, book, confirm, escrow)
│       └── Cargo.toml
│
├── package.json              # Monorepo root (Yarn workspaces)
├── biome.json                # Linting & formatting config
├── tsconfig.json             # Root TypeScript config
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, Tailwind CSS, TypeScript |
| Backend | Node.js/Express, Bun runtime, TypeScript |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Cache | Redis |
| Smart Contracts | Rust, Soroban SDK |
| Blockchain | Stellar (Testnet → Mainnet) |
| Payments | USDC via Stellar |
| Wallet | Freighter API |
| Linting | Biome |

---

## Core Architecture

```
[Tenant/Owner Browser]
        │
        ▼
[Next.js Frontend] ──── Freighter Wallet ──── Stellar Network
        │                                           │
        ▼                                           ▼
[Express Backend] ──── Supabase DB        [Soroban Contracts]
        │                                    - list_property
        └──── Redis Cache                    - book_property
                                             - confirm_rental (escrow release)
```

**Core flow:**
1. Owner lists a property → stored in Supabase + registered on-chain via Soroban
2. Tenant books → USDC locked in escrow contract
3. Rental confirmed → escrow releases USDC to owner

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 20
- [Rust](https://rustup.rs) + `wasm32-unknown-unknown` target (for contracts)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/your-org/rentars.git
cd rentars
yarn install
```

### 2. Configure Environment

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET

# Frontend
cp apps/web/.env.example apps/web/.env.local
# Fill in: NEXT_PUBLIC_API_URL
```

### 3. Run Development Servers

```bash
# Backend (port 3000)
cd apps/backend && bun run dev

# Frontend (port 3001)
cd apps/web && yarn dev
```

### 4. Build Contracts

```bash
cd apps/contracts
cargo build --target wasm32-unknown-unknown --release
```

### 5. Full-Stack Docker (Optional)

Run the entire stack (frontend, API, Redis) with Docker Compose:

```bash
# Copy env files first
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# Start all services (uses docker-compose.override.yml for dev volumes)
yarn dev:docker
```

| Service | URL | Port |
|---|---|---|
| Frontend (web) | http://localhost:3001 | 3001 |
| Backend (api) | http://localhost:3000 | 3000 |
| Redis | redis://localhost:6379 | 6379 |

Each service includes a health check. The override file mounts source code for hot-reload during development.

Production-style startup (without dev overrides):

```bash
docker compose -f docker-compose.yml up --build
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |

### Properties
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/properties` | List all properties |
| GET | `/api/properties/:id` | Get a single property |
| POST | `/api/properties` | Create a property (auth required) |
| PUT | `/api/properties/:id` | Update a property (auth required) |
| DELETE | `/api/properties/:id` | Delete a property (auth required) |

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bookings/:id` | Get a booking (auth required) |
| POST | `/api/bookings` | Create a booking (auth required) |
| PATCH | `/api/bookings/:id` | Update a booking (auth required) |
| DELETE | `/api/bookings/:id` | Cancel a booking (auth required) |

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API health check |

---

## Smart Contract Interface

The Soroban contract (`apps/contracts/src/lib.rs`) exposes:

```rust
// List a property on-chain
fn list_property(env, owner: Address, title: String, price_per_night: i128) -> u64

// Book a property (locks USDC in escrow)
fn book_property(env, tenant: Address, property_id: u64, check_in: u64, check_out: u64) -> u64

// Confirm rental completion (releases escrow)
fn confirm_rental(env, booking_id: u64, caller: Address)

// Read operations
fn get_property(env, id: u64) -> Property
fn get_booking(env, id: u64) -> Booking
```

---

## Development Status

This is a **10% scaffold** of the full Rentars platform. The following is implemented:

- [x] Monorepo structure (web, backend, contracts)
- [x] Express API with auth, property, and booking routes
- [x] Supabase integration (auth + database)
- [x] JWT authentication middleware
- [x] Rate limiting
- [x] Next.js frontend shell with property listing
- [x] Soroban contract scaffold (list, book, confirm)
- [ ] Full Freighter wallet integration
- [ ] USDC escrow flow (end-to-end)
- [ ] Property image uploads (Supabase Storage)
- [ ] Map-based property search
- [ ] Booking calendar UI
- [ ] Blockchain sync service
- [x] Docker setup
- [x] CI/CD pipeline

---

## Contributing

Contributions are welcome! This project is inspired by and derived from [StellarRent](https://github.com/Stellar-Rent/stellar-rent), an open-source project built with the [OnlyDust](https://app.onlydust.com) community.

### CI/CD

| Workflow | Trigger | Purpose |
|---|---|---|
| `backend-ci.yml` | Push/PR to `main` | Biome, TypeScript, Bun tests |
| `frontend-ci.yml` | Push/PR to `main` | Biome, TypeScript, Vitest, Next.js build |
| `coverage.yml` | Push/PR to `main` | Coverage reports uploaded to [Codecov](https://codecov.io) |

Repository maintainers must add `CODECOV_TOKEN` as a GitHub Actions secret for coverage uploads.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using conventional commits: `git commit -m "feat: add property search"`
4. Open a pull request

---

## License

Apache-2.0 — see [LICENSE](./LICENSE)

---

## Acknowledgements

- [StellarRent](https://github.com/Stellar-Rent/stellar-rent) — the original open-source project this is based on
- [Stellar Development Foundation](https://stellar.org) — for Soroban and the Stellar network
- [OnlyDust](https://app.onlydust.com) — open-source contributor community
- [Supabase](https://supabase.com) — backend-as-a-service
