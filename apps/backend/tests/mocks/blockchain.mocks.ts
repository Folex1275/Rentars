/**
 * Blockchain service mocks — mocking all blockchain service functions.
 */

export const mockBlockchainServices = {
  checkAvailability: jest.fn().mockResolvedValue(true),
  createBookingOnChain: jest.fn().mockResolvedValue(BigInt(1)),
  cancelBookingOnChain: jest.fn().mockResolvedValue(undefined),
  updateBookingStatusOnChain: jest.fn().mockResolvedValue(undefined),
  listPropertyOnChain: jest.fn().mockResolvedValue(BigInt(1)),
  getPropertyOnChain: jest.fn().mockResolvedValue({
    id: BigInt(1),
    owner: 'GBRPYHIL2CI3WHZDTOOQFC6EB4CGQOFSNHERX3LRJCX5FWCL46664F3',
    title: 'Test Property',
    pricePerNight: BigInt(100),
  }),
};

export function resetBlockchainMocks() {
  Object.values(mockBlockchainServices).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
}
