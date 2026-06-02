# Smart Contract Integration Guide

This guide explains how the Rentars backend and frontend interact with Soroban contracts on Stellar testnet. It covers contract deployment, contract IDs, backend TypeScript integration, frontend Freighter integration, property verification, escrow lifecycle, and a first-booking walkthrough using all three contracts.

## 1. Overview

Rentars uses three Soroban contracts:

- `property-listing` — stores canonical property hashes, owner addresses, and listing status.
- `booking` — manages booking lifecycle, cross-contract availability checks, booking status, and escrow references.
- `review-contract` — stores tenant reviews and reputation scores on-chain.

The backend currently reads and writes on-chain state via typed TypeScript wrappers in `apps/backend/src/blockchain/`.

## 2. Deploying Contracts to Testnet

### Prerequisites

Install the Stellar CLI and Rust toolchain:

```bash
cargo install --locked stellar-cli
rustup update stable
rustup target add wasm32-unknown-unknown
```

Ensure you are in the workspace root before running deploy commands.

### Build the WASM artifacts

```bash
cd apps/contracts
cargo build --target wasm32-unknown-unknown --release
```

The compiled WebAssembly files are produced under `target/wasm32-unknown-unknown/release/`.

### Deploy each contract

Use the Stellar CLI to deploy each contract to testnet:

```bash
cd apps/contracts
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/property-listing.wasm --source <ADMIN_IDENTITY> --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/booking.wasm --source <ADMIN_IDENTITY> --network testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/review-contract.wasm --source <ADMIN_IDENTITY> --network testnet
```

The last line of each command prints the deployed contract ID, for example:

```text
GA...XYZ
```

### Initialize the booking contract

The booking contract must be initialized with the property-listing contract ID:

```bash
ADMIN_ADDRESS=$(stellar keys address <ADMIN_IDENTITY>)
BOOKING_CONTRACT_ID=<booking_contract_id>
stellar contract invoke \
  --id "$BOOKING_CONTRACT_ID" \
  --source <ADMIN_IDENTITY> \
  --network testnet \
  -- initialize \
  --admin "$ADMIN_ADDRESS"
```

### Store contract IDs in environment variables

In `apps/backend/.env` or your deployment secrets, set:

```env
PROPERTY_LISTING_CONTRACT_ID=<property_listing_contract_id>
BOOKING_CONTRACT_ID=<booking_contract_id>
REVIEW_CONTRACT_ID=<review_contract_id>
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

The backend uses these values in `apps/backend/src/blockchain/config.ts`.

## 3. Getting Contract IDs

### From CLI deploy output

The simplest source of truth is the output of `stellar contract deploy`.

### From setup scripts

The project includes `apps/contracts/tests/cli/setup.sh`, which deploys contracts and saves IDs to `.test-state.env`.

If you need to inspect a deployed contract, use:

```bash
stellar contract inspect --id <contract_id> --network testnet
```

## 4. Backend Contract Calls (TypeScript)

### Backend contract idioms

The backend exposes high-level helpers in `apps/backend/src/blockchain/`.
Common functions include:

- `createPropertyListing(id, dataHash, ownerAddress)`
- `getPropertyListing(id)`
- `verifyPropertyIntegrity(id, localData)`
- `createBookingOnChain(propertyId, userId, startDate, endDate, totalPrice)`
- `cancelBookingOnChain(bookingId, callerAddress)`
- `updateBookingStatusOnChain(bookingId, newStatus, callerAddress)`

### Example: register a property listing on-chain

```ts
import { createHash } from 'crypto';
import {
  createPropertyListing,
  propertyToHashData,
  verifyPropertyIntegrity,
} from '@/blockchain/propertyListingContract';

const property = {
  id: '745',
  title: 'Downtown loft',
  description: 'Modern loft near the river',
  address: '123 River Ave',
  city: 'Test City',
  country: 'Testland',
  bedrooms: 2,
  bathrooms: 1,
  max_guests: 4,
  price_per_night: 15000,
};

function computeSha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

const dataHash = computeSha256(propertyToHashData(property));
await createPropertyListing(property.id, dataHash, ownerAddress);

const onChain = await getPropertyListing(property.id);
const isValid = await verifyPropertyIntegrity(property.id, property);
```

### Example: create a booking on-chain

```ts
import {
  createBookingOnChain,
  checkAvailability,
  updateBookingStatusOnChain,
} from '@/blockchain/bookingContract';

const propertyId = 745n;
const tenantAddress = 'GB...TENANT';
const startDate = 1711929600n; // unix seconds
const endDate = 1712198800n;
const totalPrice = 3000000n; // USDC stroops

const available = await checkAvailability(propertyId, startDate, endDate);
if (!available) {
  throw new Error('Property is not available for the requested dates');
}

const bookingId = await createBookingOnChain(
  propertyId,
  tenantAddress,
  startDate,
  endDate,
  totalPrice,
);

await updateBookingStatusOnChain(bookingId, 'Confirmed', adminAddress);
```

### Example: create a review contract call

```ts
import { ReviewClient } from '@/blockchain/reviewClient';
import { getNetworkConfig } from '@/lib/stellar';

const rpcUrl = process.env.STELLAR_RPC_URL!;
const reviewClient = new ReviewClient(process.env.REVIEW_CONTRACT_ID!, rpcUrl);

const review = await reviewClient.getReview(12n);
const reputation = await reviewClient.getReputation('GB...OWNER');
```

### Low-level contract call pattern

For custom contract operations not wrapped by backend helpers, use `@stellar/stellar-sdk`:

```ts
import { Contract, TransactionBuilder, nativeToScVal } from '@stellar/stellar-sdk';
import { getSorobanServer, submitAndWait } from '@/blockchain/soroban';
import { PROPERTY_LISTING_CONTRACT_ID, NETWORK_PASSPHRASE } from '@/blockchain/config';

const server = getSorobanServer();
const contract = new Contract(PROPERTY_LISTING_CONTRACT_ID);
const sourceAccount = await server.getAccount(process.env.STELLAR_SOURCE_ACCOUNT!);

const op = contract.call(
  'update_property_status',
  nativeToScVal(propertyId, { type: 'string' }),
  nativeToScVal(ownerAddress, { type: 'address' }),
  xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Inactive')]),
);

const tx = new TransactionBuilder(sourceAccount, {
  fee: '100',
  networkPassphrase: NETWORK_PASSPHRASE,
})
  .addOperation(op)
  .setTimeout(30)
  .build();

await submitAndWait(server, tx);
```

## 5. Frontend Contract Calls via Freighter

The frontend signs contract transactions using the Freighter wallet. There are two common approaches:

- The backend builds and returns a signed transaction XDR template for the frontend to sign.
- The frontend builds the transaction directly and asks Freighter to sign it.

### Package support

In the frontend, use either the window global or `@stellar/freighter-api`:

```ts
import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api';
```

### Connect Freighter and get the public key

```ts
async function connectFreighter(): Promise<string> {
  const result = await getAddress();
  if (result.error) {
    throw new Error(result.error.message || 'Freighter connection failed');
  }
  return result.address;
}
```

### Example: sign a transaction from the backend response

The frontend receives `property.xdr` from the backend and signs it with Freighter:

```ts
async function signAndSubmitBackendXdr(propertyXdr: string) {
  if (!window.freighter) {
    throw new Error('Freighter wallet not installed');
  }

  const signed = await window.freighter.signTransaction({
    xdr: propertyXdr,
    network: 'Test SDF Network ; September 2015',
  });

  // Submit the signed transaction to Horizon
  const tx = StellarSdk.TransactionBuilder.fromXDR(signed, 'Test SDF Network ; September 2015');
  const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  await server.submitTransaction(tx);
}
```

### Example: build, sign, and submit a contract call directly in the browser

```ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const rpcUrl = 'https://soroban-testnet.stellar.org';
const networkPassphrase = 'Test SDF Network ; September 2015';
const server = new StellarSdk.Horizon.Server(rpcUrl);

async function bookProperty(
  bookingContractId: string,
  propertyId: bigint,
  tenantAddress: string,
  startDate: bigint,
  endDate: bigint,
  totalPrice: bigint,
) {
  const contract = new StellarSdk.Contract(bookingContractId);
  const account = await server.getAccount(tenantAddress);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(
      'create_booking',
      StellarSdk.nativeToScVal(tenantAddress, { type: 'address' }),
      StellarSdk.nativeToScVal(propertyId, { type: 'u64' }),
      StellarSdk.nativeToScVal(startDate, { type: 'u64' }),
      StellarSdk.nativeToScVal(endDate, { type: 'u64' }),
      StellarSdk.nativeToScVal(totalPrice, { type: 'i128' }),
    ))
    .setTimeout(30)
    .build();

  const signed = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signed.error) {
    throw new Error(signed.error.message || 'Freighter signing failed');
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signed.signedTxXdr, networkPassphrase);
  await server.submitTransaction(signedTx);
}
```

### Handling Freighter user rejection

Wrap Freighter calls in a try/catch block:

```ts
try {
  const signed = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signed.error) {
    throw new Error(signed.error.message || 'Freighter signing failed');
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('Freighter request aborted:', error.message);
  }
  throw error;
}
```

## 6. Verifying a Property On-Chain

The backend helper `verifyPropertyIntegrity(id, localData)` compares local property data with the hash stored in `property-listing`.

### On-chain verification flow

1. Read the on-chain listing with `getPropertyListing(id)`.
2. Recompute the local hash with `propertyToHashData()` and `sha256`.
3. Compare the local hash to `onChain.data_hash`.

### Example

```ts
import {
  getPropertyListing,
  verifyPropertyIntegrity,
  propertyToHashData,
} from '@/blockchain/propertyListingContract';

const onChain = await getPropertyListing(propertyId);
const isConsistent = await verifyPropertyIntegrity(propertyId, propertyData);
if (!isConsistent) {
  throw new Error('Property data mismatch: on-chain record differs from local copy');
}
```

## 7. Escrow Lifecycle

Rentars uses a TrustlessWork escrow service from `apps/backend/src/blockchain/trustlessWork.ts`.

### Create an escrow

```ts
import { trustlessWorkClient } from '@/blockchain/trustlessWork';

const escrow = await trustlessWorkClient.createBookingEscrow({
  propertyId: String(propertyId),
  bookingId: String(bookingId),
  buyerAddress: tenantAddress,
  sellerAddress: ownerAddress,
  amountUsdc: '30.00',
  checkIn: '2026-07-01',
  checkOut: '2026-07-07',
});
```

The response contains:

- `escrowId`
- `contractId`
- `status`

### Fund an escrow

```ts
await trustlessWorkClient.fundEscrow(escrowId, '30.00', fundingTxHash);
```

### Release escrow funds

```ts
await trustlessWorkClient.releaseEscrow(escrowId, 'Guest completed stay');
```

### Cancel escrow

```ts
await trustlessWorkClient.cancelEscrow(escrowId);
```

### Check escrow status

```ts
const status = await trustlessWorkClient.getEscrowStatus(escrowId);
console.log(status);
```

## 8. First Booking Walkthrough

This walkthrough uses all three contracts:

1. `property-listing`
2. `booking`
3. `review-contract`

### Step 1: Deploy and initialize

- Deploy `property-listing`, `booking`, and `review-contract` using the Stellar CLI.
- Initialize the booking contract with the deployed property-listing contract ID.
- Save all three contract IDs in backend environment variables.

### Step 2: Owner creates a listing

- Compute the canonical property hash.
- Call `createPropertyListing(id, dataHash, ownerAddress)` on the backend.
- The backend submits a Soroban transaction to the `property-listing` contract.

### Step 3: Tenant verifies availability

- The tenant queries `booking.checkAvailability(propertyId, startDate, endDate)`.
- If it returns `false`, choose a different date range.

### Step 4: Tenant creates a booking on-chain

- Call `createBookingOnChain(propertyId, tenantAddress, startDate, endDate, totalPrice)`.
- This creates an on-chain booking record and returns a booking ID.

### Step 5: Create and fund escrow

- Create escrow using `trustlessWorkClient.createBookingEscrow(...)`.
- The escrow service returns an `escrowId` and a contract reference.
- The tenant funds the escrow via USDC on Stellar.
- After settlement, call `trustlessWorkClient.fundEscrow(escrowId, amount, txHash)`.

### Step 6: Link escrow to booking

- As admin, call `BookingClient.buildSetEscrowId(admin, bookingId, escrowId)` or backend helper.
- Submit the `set_escrow_id` operation to the booking contract.

### Step 7: Confirm the booking status

- As admin, update the booking status to `Confirmed` using `updateBookingStatusOnChain(bookingId, 'Confirmed', adminAddress)`.

### Step 8: After checkout, release escrow

- Once the rental is complete and owner approval is given, call `trustlessWorkClient.releaseEscrow(escrowId, 'Stay completed')`.

### Step 9: Post-stay review

- The tenant submits a review using `ReviewClient.buildSubmitReview(...)` or through backend routes.
- The review is stored on-chain in `review-contract`.
- Reputation is available via `reviewClient.getReputation(ownerAddress)`.

## 9. Error Codes and Handling

### Backend error classes

The backend exposes the following error classes:

| Error class | Code | Meaning |
| --- | --- | --- |
| `BlockchainError` | `BLOCKCHAIN_ERROR` | generic blockchain integration failure |
| `ContractError` | `CONTRACT_ERROR` | contract configuration or invocation failure |
| `TransactionError` | `TRANSACTION_ERROR` | transaction submission failure |
| `AvailabilityError` | `AVAILABILITY_ERROR` | booking or availability-specific validation failure |
| `EscrowError` | (HTTP status) | escrow service error response |

### Handling backend errors

```ts
import {
  BlockchainError,
  ContractError,
  TransactionError,
  AvailabilityError,
  EscrowError,
} from '@/blockchain/errors';

try {
  await createBookingOnChain(...);
} catch (error) {
  if (error instanceof AvailabilityError) {
    console.warn('Booking unavailable:', error.message);
  } else if (error instanceof ContractError) {
    console.error('Contract invocation failed:', error.contractMethod, error.message);
  } else if (error instanceof TransactionError) {
    console.error('Transaction failed:', error.txHash, error.message);
  } else if (error instanceof EscrowError) {
    console.error('Escrow service failed:', error.statusCode, error.message);
  } else if (error instanceof Error) {
    console.error('Unexpected blockchain error:', error.message);
  }
  throw error;
}
```

### Common failure cases

- `PROPERTY_LISTING_CONTRACT_ID is not configured` — missing contract ID in backend env.
- `create_booking returned no value` — contract returned an unexpected result shape.
- `Freighter wallet not installed` — frontend cannot sign transactions.
- `Freighter signing failed` — user denied signing or the payload is invalid.
- `HostError` in Soroban simulation — contract precondition failed.
- `TrustlessWork API error` — escrow endpoint rejected the request.

### Best practices

- Always validate inputs before building contract calls.
- Use `simulateReadOnly` for non-state reads so no gas is consumed.
- Catch and log both `error.message` and contract-specific metadata.
- Present user-friendly messages in the UI and keep raw host errors in developer logs.

## 10. Best Practices

- Keep contract IDs in secure environment variables.
- Use `verifyPropertyIntegrity()` after an update to ensure the on-chain hash matches local state.
- Build booking workflow in the backend when possible, and reserve frontend signing for final user-authenticated actions.
- Keep the `booking` contract initialized only once; repeated initialization is rejected.
- Always use the Soroban testnet URL for development: `https://soroban-testnet.stellar.org`.

## 11. References

- `apps/backend/src/blockchain/propertyListingContract.ts`
- `apps/backend/src/blockchain/bookingContract.ts`
- `apps/backend/src/blockchain/reviewClient.ts`
- `apps/backend/src/blockchain/trustlessWork.ts`
- `apps/web/src/lib/freighter-utils.ts`
- `apps/contracts/tests/cli/setup.sh`
