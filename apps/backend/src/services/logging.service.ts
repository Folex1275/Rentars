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
