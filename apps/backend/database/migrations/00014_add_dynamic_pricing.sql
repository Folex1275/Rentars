-- Dynamic pricing and seasonal rates for calendar system

-- Add pricing fields to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS base_price_per_night DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_stay_nights INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USDC';

-- Create seasonal pricing table
CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_multiplier DECIMAL(3, 2) NOT NULL CHECK (price_multiplier > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create special events table (block dates + pricing)
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_multiplier DECIMAL(3, 2),
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing history for audit
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(100),
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_seasonal_pricing_property_id ON seasonal_pricing(property_id, start_date, end_date);
CREATE INDEX idx_special_events_property_id ON special_events(property_id, start_date, end_date);
CREATE INDEX idx_pricing_history_property_date ON pricing_history(property_id, date);

-- Add on_chain_id to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS on_chain_id BIGINT UNIQUE;

-- Enforce UTC timezone for all date columns
ALTER TABLE bookings ALTER COLUMN check_in SET DATA TYPE TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
ALTER TABLE bookings ALTER COLUMN check_out SET DATA TYPE TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
