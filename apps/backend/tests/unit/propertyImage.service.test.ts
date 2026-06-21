/**
 * Unit tests for propertyImage service.
 * Tests upload, retrieval, deletion, reordering, and primary image promotion.
 */

import { supabase } from '../../src/config/supabase';
import * as storage from '../../src/config/supabase-storage';
import {
  addPropertyImage,
  getPropertyImages,
  removePropertyImage,
  reorderPropertyImages,
  setPrimaryImage,
} from '../../src/services/propertyImage.service';

jest.mock('../../src/config/supabase');
jest.mock('../../src/config/supabase-storage');

const mockUploadImage = storage.uploadImage as jest.Mock;
const mockDeleteImage = storage.deleteImage as jest.Mock;

const PROPERTY_ID = 'prop-uuid-1';
const OWNER_ID = 'owner-uuid-1';
const IMAGE_ID = 'img-uuid-1';
const IMAGE_URL = 'https://cdn.example.com/storage/v1/object/public/property-images/prop-uuid-1/ts-photo.webp';

const mockFile = {
  buffer: Buffer.from('fake'),
  mimetype: 'image/jpeg',
  originalname: 'photo.jpg',
} as Express.Multer.File;

function buildSupabaseMock(overrides: Record<string, jest.Mock> = {}) {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  return mockSupabase;
}

describe('addPropertyImage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns error when property not found', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    } as any);

    const result = await addPropertyImage(PROPERTY_ID, OWNER_ID, mockFile);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Property not found');
  });

  it('returns error when user does not own property', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: PROPERTY_ID, owner_id: 'different-owner' },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await addPropertyImage(PROPERTY_ID, OWNER_ID, mockFile);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden/);
  });

  it('uploads image and inserts record on success', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockUploadImage.mockResolvedValue(IMAGE_URL);

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: PROPERTY_ID, owner_id: OWNER_ID },
              error: null,
            }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0 }),
        }),
      } as any)
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: IMAGE_ID,
                property_id: PROPERTY_ID,
                url: IMAGE_URL,
                is_primary: true,
                display_order: 1,
              },
              error: null,
            }),
          }),
        }),
      } as any);

    const result = await addPropertyImage(PROPERTY_ID, OWNER_ID, mockFile);

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe(IMAGE_URL);
    expect(result.data?.is_primary).toBe(true);
    expect(mockUploadImage).toHaveBeenCalledWith(PROPERTY_ID, mockFile);
  });

  it('returns error when db insert fails', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockUploadImage.mockResolvedValue(IMAGE_URL);

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: PROPERTY_ID, owner_id: OWNER_ID },
              error: null,
            }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2 }),
        }),
      } as any)
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB constraint violation' },
            }),
          }),
        }),
      } as any);

    const result = await addPropertyImage(PROPERTY_ID, OWNER_ID, mockFile);

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB constraint violation');
  });
});

describe('getPropertyImages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns ordered images on success', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const mockImages = [
      { id: IMAGE_ID, property_id: PROPERTY_ID, url: IMAGE_URL, is_primary: true, display_order: 1 },
    ];

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockImages, error: null }),
        }),
      }),
    } as any);

    const result = await getPropertyImages(PROPERTY_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockImages);
  });

  it('returns error on db failure', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'connection lost' } }),
        }),
      }),
    } as any);

    const result = await getPropertyImages(PROPERTY_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('connection lost');
  });
});

describe('removePropertyImage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns forbidden when user does not own property', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { owner_id: 'other-owner' },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await removePropertyImage(PROPERTY_ID, IMAGE_ID, OWNER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden/);
  });

  it('deletes image from storage and db', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    mockDeleteImage.mockResolvedValue(undefined);

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { url: IMAGE_URL, is_primary: false },
                error: null,
              }),
            }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

    const result = await removePropertyImage(PROPERTY_ID, IMAGE_ID, OWNER_ID);

    expect(result.success).toBe(true);
    expect(mockDeleteImage).toHaveBeenCalledWith(IMAGE_URL);
  });

  it('promotes next image to primary when primary is deleted', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const NEXT_ID = 'img-uuid-2';
    mockDeleteImage.mockResolvedValue(undefined);

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { url: IMAGE_URL, is_primary: true },
                error: null,
              }),
            }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: NEXT_ID }, error: null }),
              }),
            }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({ update: updateMock } as any);

    const result = await removePropertyImage(PROPERTY_ID, IMAGE_ID, OWNER_ID);

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ is_primary: true });
  });
});

describe('reorderPropertyImages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns forbidden when user does not own property', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { owner_id: 'other' }, error: null }),
        }),
      }),
    } as any);

    const result = await reorderPropertyImages(PROPERTY_ID, OWNER_ID, [IMAGE_ID]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden/);
  });

  it('updates display_order for each image and returns sorted list', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const ID_A = 'img-a';
    const ID_B = 'img-b';

    const updateChain = {
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    const updatedImages = [
      { id: ID_A, display_order: 1, is_primary: false },
      { id: ID_B, display_order: 2, is_primary: true },
    ];

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
          }),
        }),
      } as any)
      .mockReturnValue(updateChain as any);

    // The final select after updates
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
        }),
      }),
    } as any);

    // Override final call to return the ordered list
    const calls: any[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      calls.push(table);
      if (calls.length === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
            }),
          }),
        } as any;
      }
      if (calls.length > 1 && calls.length <= 3) {
        return updateChain as any;
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: updatedImages, error: null }),
          }),
        }),
      } as any;
    });

    const result = await reorderPropertyImages(PROPERTY_ID, OWNER_ID, [ID_A, ID_B]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(updatedImages);
  });
});

describe('setPrimaryImage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns forbidden when user does not own property', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { owner_id: 'other' }, error: null }),
        }),
      }),
    } as any);

    const result = await setPrimaryImage(PROPERTY_ID, IMAGE_ID, OWNER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Forbidden/);
  });

  it('clears existing primary and sets new one', async () => {
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;
    const updatedImage = {
      id: IMAGE_ID,
      property_id: PROPERTY_ID,
      url: IMAGE_URL,
      is_primary: true,
      display_order: 2,
    };

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { owner_id: OWNER_ID }, error: null }),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any)
      .mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: updatedImage, error: null }),
              }),
            }),
          }),
        }),
      } as any);

    const result = await setPrimaryImage(PROPERTY_ID, IMAGE_ID, OWNER_ID);

    expect(result.success).toBe(true);
    expect(result.data?.is_primary).toBe(true);
  });
});
