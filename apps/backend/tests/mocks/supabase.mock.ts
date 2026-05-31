/**
 * Supabase mock — chainable mock that simulates .from().select().eq() etc.
 */

export interface MockSupabaseQuery {
  select: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  ilike: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
}

export function createMockSupabaseQuery(): MockSupabaseQuery {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  };

  return query;
}

export function createMockSupabase() {
  return {
    from: jest.fn((table: string) => createMockSupabaseQuery()),
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  };
}
