import { supabase } from './supabase.js';

export const STORAGE_BUCKET = 'property-images';

export async function uploadImage(
  propertyId: string,
  file: Express.Multer.File,
): Promise<string> {
  const fileName = `${propertyId}/${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  const fileName = imageUrl.split('/').pop();
  if (!fileName) throw new Error('Invalid image URL');

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}
