export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  stellar_wallet?: string;
  wallet_verified: boolean;
  role: 'tenant' | 'host' | 'both';
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  stellar_wallet?: string;
}
