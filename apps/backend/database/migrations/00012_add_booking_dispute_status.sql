-- Add dispute workflow fields to bookings
-- dispute_status: none | raised | resolved

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(20) DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_bookings_dispute_status ON bookings(dispute_status);

