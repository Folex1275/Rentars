/**
 * Shared service types used across all service modules.
 */

/**
 * Standard response envelope returned by every service function.
 *
 * @template T - The shape of the `data` payload on success.
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
  statusCode?: number;
}
