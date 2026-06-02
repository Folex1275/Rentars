/**
 * Service layer for the Booking Soroban contract.
 *
 * Unlike the low-level BookingClient (which only builds XDR operations),
 * these functions prepare, sign, and submit full transactions using the
 * server admin keypair, and poll for on-chain confirmation.
 */

import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import {
  BOOKING_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  STELLAR_SOURCE_ACCOUNT,
} from './config.js';
import {
  getSorobanServer,
  simulateReadOnly,
  submitAndWait,
} from './soroban.js';
import { buildPrepareAndSign, extractReturnValue } from './transactionUtils.js';
import { ContractError } from './errors.js';
import type { BookingStatus } from './types.js';

function requireContractId(): void {
  if (!BOOKING_CONTRACT_ID) {
    throw new ContractError(
      'BOOKING_CONTRACT_ID is not configured',
    );
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Check whether a property is available for the given date range.
 *
 * Dates are passed as Unix timestamps (seconds).
 *
 * @param propertyId - On-chain u64 property ID
 * @param startDate - Check-in as Unix timestamp (seconds)
 * @param endDate - Check-out as Unix timestamp (seconds)
 * @returns true if the property is available, false if already booked
 * @throws ContractError if BOOKING_CONTRACT_ID is not configured or the call fails
 */
export async function checkAvailability(
  propertyId: bigint,
  startDate: bigint,
  endDate: bigint,
): Promise<boolean> {
  requireContractId();

  const server = getSorobanServer();
  const contract = new Contract(BOOKING_CONTRACT_ID);

  const sourceAccount = await server.getAccount(STELLAR_SOURCE_ACCOUNT);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'check_availability',
        nativeToScVal(propertyId, { type: 'u64' }),
        nativeToScVal(startDate, { type: 'u64' }),
        nativeToScVal(endDate, { type: 'u64' }),
      ),
    )
    .setTimeout(30)
    .build();

  const retval = await simulateReadOnly(server, tx, 'check_availability');
  return scValToNative(retval) as boolean;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Create an on-chain booking record and return the assigned on-chain booking ID.
 *
 * @param propertyId - On-chain u64 property ID.
 * @param userId - Stellar address of the tenant.
 * @param startDate - Check-in as Unix timestamp (seconds).
 * @param endDate - Check-out as Unix timestamp (seconds).
 * @param totalPrice - Total price in USDC stroops (i128).
 */
export async function createBookingOnChain(
  propertyId: bigint,
  userId: string,
  startDate: bigint,
  endDate: bigint,
  totalPrice: bigint,
): Promise<bigint> {
  requireContractId();

  const server = getSorobanServer();
  const contract = new Contract(BOOKING_CONTRACT_ID);

  const op = contract.call(
    'create_booking',
    nativeToScVal(userId, { type: 'address' }),
    nativeToScVal(propertyId, { type: 'u64' }),
    nativeToScVal(startDate, { type: 'u64' }),
    nativeToScVal(endDate, { type: 'u64' }),
    nativeToScVal(totalPrice, { type: 'i128' }),
  );

  const tx = await buildPrepareAndSign(server, [op]);
  const response = await submitAndWait(server, tx);

  const returnedId = extractReturnValue(response);
  if (returnedId === undefined) {
    throw new ContractError(
      'create_booking returned no value',
      'create_booking',
    );
  }

  return BigInt(returnedId as number | string);
}

/**
 * Cancel an existing on-chain booking.
 *
 * @param bookingId - On-chain u64 booking ID.
 * @param callerAddress - Stellar address of the caller (tenant or admin).
 */
export async function cancelBookingOnChain(
  bookingId: bigint,
  callerAddress: string,
): Promise<void> {
  requireContractId();

  const server = getSorobanServer();
  const contract = new Contract(BOOKING_CONTRACT_ID);

  const op = contract.call(
    'cancel_booking',
    nativeToScVal(callerAddress, { type: 'address' }),
    nativeToScVal(bookingId, { type: 'u64' }),
  );

  const tx = await buildPrepareAndSign(server, [op]);
  await submitAndWait(server, tx);
}

/**
 * Update the status of an on-chain booking.
 *
 * @param bookingId - On-chain u64 booking ID.
 * @param newStatus - Target BookingStatus.
 * @param callerAddress - Stellar address of the caller (admin).
 */
export async function updateBookingStatusOnChain(
  bookingId: bigint,
  newStatus: BookingStatus,
  callerAddress: string,
): Promise<void> {
  requireContractId();

  const server = getSorobanServer();
  const contract = new Contract(BOOKING_CONTRACT_ID);

  const op = contract.call(
    'update_status',
    nativeToScVal(callerAddress, { type: 'address' }),
    nativeToScVal(bookingId, { type: 'u64' }),
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(newStatus)]),
  );

  const tx = await buildPrepareAndSign(server, [op]);
  await submitAndWait(server, tx);
}
