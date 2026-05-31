import { vi } from 'vitest';

// Mock API service module
export const mockApiService = {
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
  bookings: {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
  properties: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock the API service module
vi.mock('@/services/api', () => mockApiService);
