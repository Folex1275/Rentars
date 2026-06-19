import { supabase } from '@/config/supabase.js';
import { uploadImage, deleteImage as deleteStorageImage } from '@/config/supabase-storage.js';
import type { ServiceResponse } from './index.js';

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  is_primary: boolean;
  display_order: number;
  created_at?: string;
}

/**
 * Upload a new image for a property and store its record.
 *
 * @param propertyId - UUID of the property
 * @param ownerId - UUID of the requesting user (must be property owner)
 * @param file - Multer file object
 * @returns The created PropertyImage record
 */
export async function addPropertyImage(
  propertyId: string,
  ownerId: string,
  file: Express.Multer.File,
): Promise<ServiceResponse<PropertyImage>> {
  // Verify ownership
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .single();

  if (propError || !property) return { success: false, error: 'Property not found' };
  if ((property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden: you do not own this property' };
  }

  // Upload to storage
  const url = await uploadImage(propertyId, file);

  // Get current image count for ordering
  const { count } = await supabase
    .from('property_images')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);

  const displayOrder = (count ?? 0) + 1;
  const isPrimary = displayOrder === 1;

  const { data, error } = await supabase
    .from('property_images')
    .insert({ property_id: propertyId, url, is_primary: isPrimary, display_order: displayOrder })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PropertyImage };
}

/**
 * Get all images for a property, ordered by display_order.
 *
 * @param propertyId - UUID of the property
 */
export async function getPropertyImages(propertyId: string): Promise<ServiceResponse<PropertyImage[]>> {
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('display_order', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PropertyImage[] };
}

/**
 * Delete a property image from storage and the database.
 *
 * @param propertyId - UUID of the property
 * @param imageId - UUID of the image record
 * @param ownerId - UUID of the requesting user
 */
export async function removePropertyImage(
  propertyId: string,
  imageId: string,
  ownerId: string,
): Promise<ServiceResponse<void>> {
  // Verify ownership
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden: you do not own this property' };
  }

  const { data: image, error: imgError } = await supabase
    .from('property_images')
    .select('url, is_primary')
    .eq('id', imageId)
    .eq('property_id', propertyId)
    .single();

  if (imgError || !image) return { success: false, error: 'Image not found' };

  // Remove from storage
  await deleteStorageImage((image as PropertyImage).url);

  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) return { success: false, error: error.message };

  // If deleted image was primary, promote next one
  if ((image as PropertyImage).is_primary) {
    const { data: next } = await supabase
      .from('property_images')
      .select('id')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: true })
      .limit(1)
      .single();

    if (next) {
      await supabase.from('property_images').update({ is_primary: true }).eq('id', (next as { id: string }).id);
    }
  }

  return { success: true };
}

/**
 * Reorder images for a property by providing a full ordered list of image IDs.
 * Updates display_order for each image to match the given array index.
 *
 * @param propertyId - UUID of the property
 * @param ownerId - UUID of the requesting user
 * @param orderedIds - Image IDs in the new desired order
 */
export async function reorderPropertyImages(
  propertyId: string,
  ownerId: string,
  orderedIds: string[],
): Promise<ServiceResponse<PropertyImage[]>> {
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden: you do not own this property' };
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('property_images')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('property_id', propertyId),
  );

  await Promise.all(updates);

  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('display_order', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PropertyImage[] };
}

/**
 * Set an image as the primary image for a property.
 *
 * @param propertyId - UUID of the property
 * @param imageId - UUID of the image to promote
 * @param ownerId - UUID of the requesting user
 */
export async function setPrimaryImage(
  propertyId: string,
  imageId: string,
  ownerId: string,
): Promise<ServiceResponse<PropertyImage>> {
  const { data: property } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('id', propertyId)
    .single();

  if (!property || (property as { owner_id: string }).owner_id !== ownerId) {
    return { success: false, error: 'Forbidden: you do not own this property' };
  }

  // Clear existing primary
  await supabase
    .from('property_images')
    .update({ is_primary: false })
    .eq('property_id', propertyId);

  const { data, error } = await supabase
    .from('property_images')
    .update({ is_primary: true })
    .eq('id', imageId)
    .eq('property_id', propertyId)
    .select()
    .single();

  if (error) return { success: false, error: 'Image not found' };
  return { success: true, data: data as PropertyImage };
}
