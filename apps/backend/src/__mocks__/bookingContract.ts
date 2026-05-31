/**
 * Jest manual mock for bookingContract module.
 */

export const checkAvailability = jest.fn().mockResolvedValue(true);
export const createBookingOnChain = jest.fn().mockResolvedValue(BigInt(1));
export const cancelBookingOnChain = jest.fn().mockResolvedValue(undefined);
export const updateBookingStatusOnChain = jest.fn().mockResolvedValue(undefined);
