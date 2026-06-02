import { EscrowError } from './errors.js';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BookingEscrowParams {
  propertyId: string;
  bookingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amountUsdc: string;
  checkIn: string;
  checkOut: string;
}

export interface CreateEscrowRequest {
  buyer: string;
  seller: string;
  amount: string;
  token: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEscrowResponse {
  escrowId: string;
  contractId: string;
  status: string;
}

export interface FundEscrowRequest {
  escrowId: string;
  amount: string;
  txHash: string;
}

export interface ReleaseEscrowRequest {
  escrowId: string;
  reason: string;
}

export interface EscrowStatus {
  escrowId: string;
  status: 'created' | 'funded' | 'released' | 'cancelled' | 'disputed';
  amount: string;
  token: string;
  buyer: string;
  seller: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class TrustlessWorkClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let message = `TrustlessWork API error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody.message) {
          message = errorBody.message;
        }
      } catch {
        // ignore JSON parse errors on error responses
      }
      throw new EscrowError(message, response.status);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new USDC escrow for a booking.
   *
   * @param params - Escrow creation parameters
   * @returns CreateEscrowResponse containing escrowId, contractId, and status
   * @throws EscrowError on non-2xx API responses
   */
  async createEscrow(params: CreateEscrowRequest): Promise<CreateEscrowResponse> {
    return this.request<CreateEscrowResponse>('POST', '/escrows', params);
  }

  /**
   * Fund an existing escrow after the buyer has sent USDC on-chain.
   *
   * @param escrowId - ID of the escrow to fund
   * @param amount - USDC amount string
   * @param txHash - On-chain transaction hash of the funding transfer
   * @throws EscrowError on non-2xx API responses
   */
  async fundEscrow(escrowId: string, amount: string, txHash: string): Promise<void> {
    const body: FundEscrowRequest = { escrowId, amount, txHash };
    await this.request<void>('POST', `/escrows/${escrowId}/fund`, body);
  }

  /**
   * Release escrowed funds to the seller (property owner).
   *
   * @param escrowId - ID of the escrow to release
   * @param reason - Human-readable reason for the release
   * @throws EscrowError on non-2xx API responses
   */
  async releaseEscrow(escrowId: string, reason: string): Promise<void> {
    const body: ReleaseEscrowRequest = { escrowId, reason };
    await this.request<void>('POST', `/escrows/${escrowId}/release`, body);
  }

  /**
   * Cancel the escrow and return funds to the buyer (tenant).
   *
   * @param escrowId - ID of the escrow to cancel
   * @throws EscrowError on non-2xx API responses
   */
  async cancelEscrow(escrowId: string): Promise<void> {
    await this.request<void>('POST', `/escrows/${escrowId}/cancel`);
  }

  /**
   * Retrieve the current status of an escrow.
   *
   * @param escrowId - ID of the escrow to query
   * @returns EscrowStatus with amounts, participants, and current state
   * @throws EscrowError on non-2xx API responses
   */
  async getEscrowStatus(escrowId: string): Promise<EscrowStatus> {
    return this.request<EscrowStatus>('GET', `/escrows/${escrowId}`);
  }

  /**
   * Create an escrow from structured booking parameters, setting a
   * human-readable title and relevant metadata automatically.
   *
   * @param params - Booking-specific parameters (propertyId, bookingId, buyer/seller addresses, amount, dates)
   * @returns CreateEscrowResponse containing escrowId, contractId, and status
   * @throws EscrowError on non-2xx API responses
   * @example
   * const resp = await trustlessWorkClient.createBookingEscrow({
   *   propertyId: 'prop-1', bookingId: 'book-1',
   *   buyerAddress: 'G...', sellerAddress: 'G...',
   *   amountUsdc: '100', checkIn: '2025-07-01', checkOut: '2025-07-07',
   * });
   */
  async createBookingEscrow(params: BookingEscrowParams): Promise<CreateEscrowResponse> {
    return this.createEscrow({
      buyer: params.buyerAddress,
      seller: params.sellerAddress,
      amount: params.amountUsdc,
      token: 'USDC',
      title: `Booking ${params.bookingId} — Property ${params.propertyId}`,
      description: `Rental escrow for check-in ${params.checkIn} to check-out ${params.checkOut}`,
      metadata: {
        bookingId: params.bookingId,
        propertyId: params.propertyId,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      },
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const trustlessWorkClient = new TrustlessWorkClient(
  process.env.TRUSTLESS_WORK_API_URL ?? 'https://api.trustlesswork.com',
  process.env.TRUSTLESS_WORK_API_KEY ?? '',
);
