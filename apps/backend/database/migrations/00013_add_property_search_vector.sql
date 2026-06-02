-- Add full-text search vector for property search
-- Uses title + description + city

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Backfill existing rows
UPDATE properties
SET search_vector =
  to_tsvector('english',
    coalesce(title,'') || ' ' ||
    coalesce(description,'') || ' ' ||
    coalesce(city,'')
  )
WHERE search_vector IS NULL;

-- Create trigger to keep search_vector in sync (simple approach)
CREATE OR REPLACE FUNCTION properties_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector =
    to_tsvector('english',
      coalesce(NEW.title,'') || ' ' ||
      coalesce(NEW.description,'') || ' ' ||
      coalesce(NEW.city,'')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_search_vector_update ON properties;
CREATE TRIGGER trg_properties_search_vector_update
BEFORE INSERT OR UPDATE OF title, description, city
ON properties
FOR EACH ROW
EXECUTE FUNCTION properties_search_vector_update();

-- GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_properties_search_vector_gin
ON properties
USING GIN (search_vector);

