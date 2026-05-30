/**
 * Backend client for the PropertyListing Soroban contract.
 *
 * ABI reference: apps/contracts/property_listing_abi.json
 *
 * This module wraps the @stellar/stellar-sdk contract invocation API and
 * provides typed methods that mirror every function in the ABI. All i128/u64
 * values are represented as bigint in TypeScript.
 */

import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import type {
  CreateListingParams,
  ListingStatus,
  PropertyListing,
  UpdateListingParams,
} from './types.js';

// ─── ABI metadata (sourced from property_listing_abi.json) ───────────────────
const ABI_VERSION = '0.1.0';
const CONTRACT_NAME = 'property-listing';

// ─── Client ──────────────────────────────────────────────────────────────────

export class PropertyListingClient {
  private readonly contract: Contract;
  private readonly server: SorobanRpc.Server;
  private readonly networkPassphrase: string;

  constructor(
    contractId: string,
    rpcUrl: string,
    networkPassphrase: string = Networks.TESTNET,
  ) {
    this.contract = new Contract(contractId);
    this.server = new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith('http://') });
    this.networkPassphrase = networkPassphrase;
  }

  // ── Read-only queries ─────────────────────────────────────────────────────

  /**
   * Retrieve a listing by ID.
   *
   * ABI: get_listing(id: u64) -> PropertyListing
   */
  async getListing(id: bigint): Promise<PropertyListing> {
    const result = await this.simulateReadOnly('get_listing', [
      nativeToScVal(id, { type: 'u64' }),
    ]);
    return scValToNative(result) as PropertyListing;
  }

  /**
   * Return the total number of listings ever created.
   *
   * ABI: listing_count() -> u64
   */
  async listingCount(): Promise<bigint> {
    const result = await this.simulateReadOnly('listing_count', []);
    return BigInt(scValToNative(result) as number | string);
  }

  // ── State-changing operations ─────────────────────────────────────────────

  /**
   * Build the XDR operation for create_listing.
   *
   * ABI: create_listing(owner, title, description, price_per_night) -> u64
   *
   * Returns the raw contract operation XDR. The caller is responsible for
   * wrapping it in a transaction, signing with the owner's keypair, and
   * submitting via the Stellar network.
   */
  buildCreateListing(params: CreateListingParams): xdr.Operation {
    return this.contract.call(
      'create_listing',
      nativeToScVal(params.owner, { type: 'address' }),
      nativeToScVal(params.title, { type: 'string' }),
      nativeToScVal(params.description, { type: 'string' }),
      nativeToScVal(params.price_per_night, { type: 'i128' }),
    );
  }

  /**
   * Build the XDR operation for update_listing.
   *
   * ABI: update_listing(caller, id, title, description, price_per_night)
   */
  buildUpdateListing(params: UpdateListingParams): xdr.Operation {
    return this.contract.call(
      'update_listing',
      nativeToScVal(params.caller, { type: 'address' }),
      nativeToScVal(params.id, { type: 'u64' }),
      nativeToScVal(params.title, { type: 'string' }),
      nativeToScVal(params.description, { type: 'string' }),
      nativeToScVal(params.price_per_night, { type: 'i128' }),
    );
  }

  /**
   * Build the XDR operation for update_status.
   *
   * ABI: update_status(caller, id, status)
   */
  buildUpdateStatus(
    caller: string,
    id: bigint,
    status: ListingStatus,
  ): xdr.Operation {
    return this.contract.call(
      'update_status',
      nativeToScVal(caller, { type: 'address' }),
      nativeToScVal(id, { type: 'u64' }),
      // Enum variants are passed as symbol ScVals in Soroban
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(status)]),
    );
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Simulate a read-only contract call and return the result ScVal.
   * Uses a throwaway source account since no auth is required for reads.
   */
  private async simulateReadOnly(
    method: string,
    args: xdr.ScVal[],
  ): Promise<xdr.ScVal> {
    // Use a well-known testnet account for simulation (no signing needed)
    const sourceAccount = await this.server.getAccount(
      process.env.STELLAR_SOURCE_ACCOUNT ||
        'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(
        `Contract simulation failed [${CONTRACT_NAME}@${ABI_VERSION}::${method}]: ${simResult.error}`,
      );
    }

    const successResult = simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse;
    if (!successResult.result?.retval) {
      throw new Error(`No return value from ${method}`);
    }

    return successResult.result.retval;
  }
}
