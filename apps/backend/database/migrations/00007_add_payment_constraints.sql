-- Add payment constraints
-- Ensures data integrity for payment-related fields

ALTER TABLE properties ADD CONSTRAINT check_price_positive CHECK (price_per_night > 0);
ALTER TABLE bookings ADD CONSTRAINT check_total_price_positive CHECK (total_price > 0);
ALTER TABLE bookings ADD CONSTRAINT check_dates_valid CHECK (check_out > check_in);
