import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().min(1, 'Address is required'),
});

export const searchSchema = z.object({
  lat: z.string().refine((val) => !isNaN(parseFloat(val)), 'Latitude must be a number'),
  lng: z.string().refine((val) => !isNaN(parseFloat(val)), 'Longitude must be a number'),
  radius: z.string().refine((val) => !isNaN(parseFloat(val)), 'Radius must be a number'),
});

export function validateQuery(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        res.status(400).json({ error: 'Invalid query parameters' });
      }
    }
  };
}
