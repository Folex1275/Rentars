-- Add blockchain-related fields to bookings table
-- Tracks escrow and on-chain booking information

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS escrow_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS blockchain_booking_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50);

CREATE INDEX idx_bookings_escrow_id ON bookings(escrow_id);
CREATE INDEX idx_bookings_blockchain_booking_id ON bookings(blockchain_booking_id);
