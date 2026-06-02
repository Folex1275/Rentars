export interface Property {
  id: string;
  title: string;
  description: string;
  price_per_night: number;
  location: string;
  images: string[];
  owner_id: string;
  available: boolean;
  created_at: string;

  // Map search support
  lat?: number;
  lng?: number;
}

