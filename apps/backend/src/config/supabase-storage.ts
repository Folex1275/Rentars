import { supabase } from './supabase.js';

export const STORAGE_BUCKET = 'property-images';

interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

type Sharp = typeof import('sharp');
let sharpLib: Sharp | null = null;

async function getSharp(): Promise<Sharp | null> {
  if (sharpLib !== null) return sharpLib;
  try {
    sharpLib = (await import('sharp')) as unknown as Sharp;
    return sharpLib;
  } catch {
    return null;
  }
}

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses and converts an image buffer to WebP.
 * Falls back to original buffer when sharp is unavailable.
 */
export async function optimizeImage(
  buffer: Buffer,
  mimetype: string,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; mimetype: string }> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 80 } = options;

  const sharp = await getSharp();
  if (!sharp) {
    return { buffer, mimetype };
  }

  const optimized = await (sharp as any)(buffer)
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  return { buffer: optimized, mimetype: 'image/webp' };
}

/**
 * Extracts the storage file path from a Supabase public URL.
 * URL format: .../object/public/<bucket>/<path>
 */
function extractStoragePath(imageUrl: string): string {
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) throw new Error(`Invalid image URL: cannot resolve storage path`);
  return imageUrl.slice(idx + marker.length);
}

export async function uploadImage(
  propertyId: string,
  file: MulterFile,
): Promise<string> {
  const { buffer: optimizedBuffer, mimetype: optimizedMime } = await optimizeImage(
    file.buffer,
    file.mimetype
  );

  const ext = optimizedMime === 'image/webp' ? 'webp' : file.originalname.split('.').pop() ?? 'jpg';
  const fileName = `${propertyId}/${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, optimizedBuffer, {
      contentType: optimizedMime,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  const filePath = extractStoragePath(imageUrl);

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}
