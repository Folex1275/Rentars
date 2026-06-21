-- Create search_analytics table for tracking searches
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  filters JSONB DEFAULT NULL,
  result_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for query suggestions
CREATE INDEX IF NOT EXISTS idx_search_analytics_query
ON search_analytics (query ASC, created_at DESC)
WHERE query IS NOT NULL;

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
ON search_analytics (user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Add geolocation support to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create PostGIS extension if not exists (for production PostGIS support)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create geometry column for PostGIS distance queries
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Trigger to sync latitude/longitude to geography
CREATE OR REPLACE FUNCTION properties_location_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_GeomFromText('POINT(' || NEW.longitude || ' ' || NEW.latitude || ')', 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_location_update ON properties;
CREATE TRIGGER trg_properties_location_update
BEFORE INSERT OR UPDATE OF latitude, longitude
ON properties
FOR EACH ROW
EXECUTE FUNCTION properties_location_update();

-- Function to search nearby properties by distance
CREATE OR REPLACE FUNCTION search_nearby_properties(
  lat DECIMAL,
  lng DECIMAL,
  radius_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price_per_night DECIMAL,
  city TEXT,
  country TEXT,
  bedrooms INTEGER,
  amenities TEXT[],
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.price_per_night,
    p.city,
    p.country,
    p.bedrooms,
    p.amenities,
    ROUND(ST_DistanceSphere(
      ST_Point(lng, lat)::geography,
      p.location
    ) / 1000)::DECIMAL AS distance_km
  FROM properties p
  WHERE p.status = 'available'
    AND p.location IS NOT NULL
    AND ST_DWithin(p.location, ST_Point(lng, lat)::geography, radius_km * 1000)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_prefix TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  query TEXT,
  frequency BIGINT,
  result_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.query,
    COUNT(*)::BIGINT AS frequency,
    AVG(sa.result_count)::INTEGER AS result_count
  FROM search_analytics sa
  WHERE sa.query LIKE search_prefix
  GROUP BY sa.query
  ORDER BY frequency DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
