-- Create atomic functions for booking operations
-- Ensures data consistency during complex multi-step operations

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_property_id UUID,
  p_tenant_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_total_price DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Check for overlapping bookings
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE property_id = p_property_id
    AND status != 'cancelled'
    AND (
      (check_in, check_out) OVERLAPS (p_check_in, p_check_out)
    )
  ) THEN
    RAISE EXCEPTION 'Property has overlapping bookings';
  END IF;

  -- Create the booking
  INSERT INTO bookings (property_id, tenant_id, check_in, check_out, total_price, status)
  VALUES (p_property_id, p_tenant_id, p_check_in, p_check_out, p_total_price, 'pending')
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION confirm_booking_atomic(
  p_booking_id UUID,
  p_escrow_id VARCHAR,
  p_blockchain_booking_id VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bookings
  SET
    status = 'confirmed',
    escrow_id = p_escrow_id,
    blockchain_booking_id = p_blockchain_booking_id,
    blockchain_status = 'active'
  WHERE id = p_booking_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
