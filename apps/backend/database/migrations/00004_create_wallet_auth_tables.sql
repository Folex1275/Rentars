-- Create wallet authentication tables
-- Supports Stellar wallet (Freighter) authentication via challenge-response

CREATE TABLE IF NOT EXISTS wallet_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address VARCHAR(56) NOT NULL,
  challenge VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '10 minutes',
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_wallet_challenges_stellar_address ON wallet_challenges(stellar_address);
CREATE INDEX idx_wallet_challenges_challenge ON wallet_challenges(challenge);
