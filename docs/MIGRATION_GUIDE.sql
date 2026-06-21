-- Migration guide for updating existing properties with calendar pricing

-- Step 1: Update properties with base pricing (data migration)
-- For existing properties, migrate price_per_night → base_price_per_night
UPDATE properties
SET base_price_per_night = price_per_night
WHERE base_price_per_night = 0 OR base_price_per_night IS NULL;

-- Step 2: Set sensible defaults for new fields
UPDATE properties
SET minimum_stay_nights = COALESCE(minimum_stay_nights, 1)
WHERE minimum_stay_nights IS NULL OR minimum_stay_nights = 0;

-- Step 3: Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_bookings_status_dates
  ON bookings(property_id, status, check_in, check_out)
  WHERE status != 'Cancelled';

-- Step 4: Populate pricing_history from existing bookings (audit trail)
-- This captures historical pricing information
INSERT INTO pricing_history (property_id, date, price_per_night, reason, created_at)
SELECT
  p.id,
  DATE(b.created_at),
  p.base_price_per_night,
  'Historical import from bookings',
  NOW()
FROM properties p
LEFT JOIN bookings b ON p.id = b.property_id
WHERE b.created_at > NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM pricing_history ph
    WHERE ph.property_id = p.id
      AND DATE(ph.created_at) = DATE(b.created_at)
  )
ON CONFLICT DO NOTHING;

-- Step 5: Verify migration success
-- Count properties with proper base pricing
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN base_price_per_night > 0 THEN 1 END) as with_base_price,
  COUNT(CASE WHEN minimum_stay_nights >= 1 THEN 1 END) as with_min_stay
FROM properties;

-- Step 6: Archive old price_per_night if needed (optional)
-- ALTER TABLE properties DROP COLUMN price_per_night;
-- Only drop after confirming base_price_per_night is working

-- Step 7: Test that availability queries work correctly
EXPLAIN ANALYZE
SELECT d::date
FROM generate_series(
  (SELECT MIN(check_in) FROM bookings),
  (SELECT MAX(check_out) FROM bookings),
  '1 day'::interval
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.property_id = 'test-id'
    AND b.status != 'Cancelled'
    AND d::date >= b.check_in::date
    AND d::date < b.check_out::date
);

-- Step 8: Create maintenance record
INSERT INTO special_events (property_id, name, start_date, end_date, is_blocked, created_at)
SELECT 
  id,
  'Historical availability import',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 day',
  false,
  NOW()
FROM properties
WHERE created_at < NOW() - INTERVAL '30 days'
LIMIT 0; -- Don't actually create, just showing structure

-- Migration verification queries

-- Check for properties missing base pricing
SELECT id, title, base_price_per_night
FROM properties
WHERE base_price_per_night IS NULL OR base_price_per_night = 0
ORDER BY created_at DESC;

-- Check minimum stay constraints
SELECT id, title, minimum_stay_nights
FROM properties
WHERE minimum_stay_nights IS NULL OR minimum_stay_nights < 1
ORDER BY created_at DESC;

-- Count seasonal pricing by property
SELECT 
  p.id,
  p.title,
  COUNT(sp.id) as season_count,
  COUNT(se.id) as event_count
FROM properties p
LEFT JOIN seasonal_pricing sp ON p.id = sp.property_id
LEFT JOIN special_events se ON p.id = se.property_id
GROUP BY p.id, p.title
ORDER BY season_count DESC, event_count DESC;

-- Availability ranges summary
SELECT 
  p.id,
  p.title,
  COUNT(ar.id) as blocked_ranges,
  MIN(ar.start_date) as earliest_block,
  MAX(ar.end_date) as latest_block
FROM properties p
LEFT JOIN availability_ranges ar ON p.id = ar.property_id AND ar.is_available = false
GROUP BY p.id, p.title
HAVING COUNT(ar.id) > 0
ORDER BY blocked_ranges DESC;

-- Timeline of pricing changes
SELECT 
  property_id,
  date,
  price_per_night,
  reason,
  created_at
FROM pricing_history
ORDER BY property_id, date DESC
LIMIT 50;
