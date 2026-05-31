-- Create profiles table
-- Stores user profile information including Stellar address

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stellar_address VARCHAR(56),
  display_name VARCHAR(255),
  avatar_url VARCHAR(255),
  bio TEXT,
  phone VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_stellar_address ON profiles(stellar_address);

-- Add stellar_address to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS stellar_address VARCHAR(56);
CREATE INDEX idx_users_stellar_address ON users(stellar_address);
