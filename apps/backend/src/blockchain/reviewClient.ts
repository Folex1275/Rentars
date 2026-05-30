/**
 * Backend client for the Review Soroban contract.
 *
 * ABI reference: apps/contracts/review_abi.json
 *
 * This module wraps the @stellar/stellar-sdk contract invocation API and
 * provides typed methods that mirror every function in the ABI.
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
import type { Review, SubmitReviewParams } from './types.js';

// ─── ABI metadata (sourced from review_abi.json) ─────────────────────────────
const ABI_VERSION = '0.1.0';
const CONTRACT_NAME = 'review-contract';

// ─── Client ──────────────────────────────────────────────────────────────────

export class ReviewClient {
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
   * Retrieve a review by its global ID.
   *
   * ABI: get_review(id: u64) -> Review
   */
  async getReview(id: bigint): Promise<Review> {
    const result = await this.simulateReadOnly('get_review', [
      nativeToScVal(id, { type: 'u64' }),
    ]);
    return scValToNative(result) as Review;
  }

  /**
   * Return all review IDs submitted for a given reviewee.
   *
   * ABI: get_reviews_for_user(reviewee: Address) -> Vec<u64>
   */
  async getReviewsForUser(reviewee: string): Promise<bigint[]> {
    const result = await this.simulateReadOnly('get_reviews_for_user', [
      nativeToScVal(reviewee, { type: 'address' }),
    ]);
    const native = scValToNative(result) as (number | string)[];
    return native.map((v) => BigInt(v));
  }

  /**
   * Return the average rating for a reviewee scaled by 100.
   *
   * ABI: get_reputation(reviewee: Address) -> u32
   *
   * Returns 0 if no reviews exist. Divide by 100 to get the decimal average
   * (e.g. 450 → 4.50 stars).
   */
  async getReputation(reviewee: string): Promise<number> {
    const result = await this.simulateReadOnly('get_reputation', [
      nativeToScVal(reviewee, { type: 'address' }),
    ]);
    return scValToNative(result) as number;
  }

  /**
   * Return the total number of reviews ever submitted.
   *
   * ABI: review_count() -> u64
   */
  async reviewCount(): Promise<bigint> {
    const result = await this.simulateReadOnly('review_count', []);
    return BigInt(scValToNative(result) as number | string);
  }

  // ── State-changing operations ─────────────────────────────────────────────

  /**
   * Build the XDR operation for submit_review.
   *
   * ABI: submit_review(reviewer, reviewee, rating, comment) -> u64
   *
   * The caller is responsible for wrapping in a transaction, signing with
   * the reviewer's keypair, and submitting via the Stellar network.
   *
   * Constraints enforced on-chain:
   *   - rating must be 1–5 inclusive
   *   - reviewer may only review each reviewee once
   */
  buildSubmitReview(params: SubmitReviewParams): xdr.Operation {
    if (params.rating < 1 || params.rating > 5) {
      throw new RangeError(
        `Rating must be between 1 and 5 inclusive, got ${params.rating}`,
      );
    }

    return this.contract.call(
      'submit_review',
      nativeToScVal(params.reviewer, { type: 'address' }),
      nativeToScVal(params.reviewee, { type: 'address' }),
      nativeToScVal(params.rating, { type: 'u32' }),
      nativeToScVal(params.comment, { type: 'string' }),
    );
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Simulate a read-only contract call and return the result ScVal.
   */
  private async simulateReadOnly(
    method: string,
    args: xdr.ScVal[],
  ): Promise<xdr.ScVal> {
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
