import { supabase } from '@/config/supabase.js';

export interface BlockchainOperationLog {
  operation: string;
  userId?: string;
  bookingId?: string;
  propertyId?: string;
  txHash?: string;
  escrowId?: string;
  error?: string;
  [key: string]: unknown;
}

class LoggingService {
  /**
   * Persist a blockchain operation log to Supabase and emit a console message.
   *
   * Both successful operations and errors are recorded. On a DB failure the log
   * is still printed to the console so no diagnostic information is silently lost.
   *
   * @param operation - Name of the operation (e.g. 'createEscrow', 'cancelBookingOnChain')
   * @param input - Arbitrary key/value context associated with the operation
   * @param result - Optional result payload returned by the operation
   * @param error - Optional error message when the operation failed
   * @example
   * loggingService.logBlockchainOperation('createEscrow', { propertyId, userId }, { escrowId });
   * loggingService.logBlockchainOperation('cancelEscrow', { bookingId }, undefined, err.message);
   */
  async logBlockchainOperation(
    operation: string,
    input: Record<string, unknown>,
    result?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    try {
      const { error: dbError } = await supabase
        .from('blockchain_logs')
        .insert({
          operation,
          input_json: input,
          result_json: result || null,
          error_message: error || null,
        });

      if (dbError) {
        console.error(`Failed to log blockchain operation ${operation}:`, dbError);
      }
    } catch (err) {
      console.error(`Error logging blockchain operation ${operation}:`, err);
    }

    // Also log to console for immediate visibility
    const { error: errorMsg, ...rest } = { error, ...input };
    if (error) {
      console.error(`[Blockchain:${operation}] ERROR:`, errorMsg, rest);
    } else {
      console.log(`[Blockchain:${operation}]`, JSON.stringify(rest));
    }
  }
}

export const loggingService = new LoggingService();
