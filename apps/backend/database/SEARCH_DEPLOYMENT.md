# Advanced Property Search - Deployment Guide

## Overview

This guide provides the authoritative deployment procedure for the advanced property search feature. The search feature depends on:

1. PostGIS extension for geospatial queries
2. Full-text search vectors with GIN indexes
3. Search analytics tracking table
4. PostgreSQL functions for nearby search and suggestions

## Prerequisites

- PostgreSQL 12+ with PostGIS extension available
- Superuser or `CREATE EXTENSION` privileges
- Database backup completed
- Staging environment for rehearsal

## Migration File

**Authoritative migration**: `apps/backend/database/migrations/00014_search_analytics_and_geolocation.sql`

This migration is idempotent and can be safely re-run. All operations use `IF NOT EXISTS` clauses.

## Deployment Procedure

### Step 1: Verify PostgreSQL Extension Support

```bash
# Check if PostGIS is available
psql -U postgres -d rentars -c "SELECT * FROM pg_available_extensions WHERE name = 'postgis';"

# Expected output should show postgis with an available version
```

If PostGIS is not available, install it:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-{version}-postgis-3

# macOS
brew install postgis

# Then restart PostgreSQL
```

### Step 2: Test Migration in Staging

```bash
# Create a production-sized snapshot for staging
pg_dump -U postgres -d rentars_prod -Fc -f backup.dump

# Restore to staging
pg_restore -U postgres -d rentars_staging backup.dump

# Apply migration with transaction safety
psql -U postgres -d rentars_staging -v ON_ERROR_STOP=1 -f apps/backend/database/migrations/00014_search_analytics_and_geolocation.sql

# Verify completion
psql -U postgres -d rentars_staging -c "
SELECT 
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'search_analytics') AS search_analytics_exists,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS postgis_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'latitude') AS geolocation_columns_exist,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_search_vector_gin') AS search_vector_index_exists,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_search_analytics_query') AS analytics_index_exists;
"
```

Expected output:
```
 search_analytics_exists | postgis_exists | geolocation_columns_exist | search_vector_index_exists | analytics_index_exists 
------------------------+----------------+---------------------------+---------------------------+-----------------------
 t                      | t              | t                         | t                         | t
```

### Step 3: Measure Index Build Time

```bash
# Time the index creation on staging
psql -U postgres -d rentars_staging -c "
\timing on
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search_vector_gin_test 
ON properties USING gin(search_vector);
DROP INDEX IF EXISTS idx_properties_search_vector_gin_test;
"
```

Record the timing. For reference:
- 10k properties: ~2-5 seconds
- 100k properties: ~20-60 seconds
- 1M properties: ~3-8 minutes

### Step 4: Verify Query Performance

```bash
# Test a full-text search query plan
psql -U postgres -d rentars_staging -c "
EXPLAIN ANALYZE
SELECT id, title, city, price_per_night
FROM properties
WHERE search_vector @@ to_tsquery('english', 'apartment:* & beach:*')
  AND status = 'available'
LIMIT 20;
"

# Verify the query uses the GIN index (look for "Bitmap Index Scan" on idx_properties_search_vector_gin)
```

### Step 5: Check Normal Property Reads

```bash
# Ensure adding columns doesn't break existing queries
psql -U postgres -d rentars_staging -c "
EXPLAIN ANALYZE
SELECT * FROM properties WHERE id = (SELECT id FROM properties LIMIT 1);
"

# Verify performance is unchanged (< 1ms for single-row lookup)
```

### Step 6: Apply to Production

**Production Migration Window:**

```bash
# Enable maintenance mode if available
# Start database backup
pg_dump -U postgres -d rentars -Fc -f rentars_backup_$(date +%Y%m%d_%H%M%S).dump

# Apply migration
psql -U postgres -d rentars -v ON_ERROR_STOP=1 -f apps/backend/database/migrations/00014_search_analytics_and_geolocation.sql

# Verify completion (same query as Step 2)
psql -U postgres -d rentars -c "
SELECT 
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'search_analytics') AS search_analytics_exists,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS postgis_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'latitude') AS geolocation_columns_exist,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_search_vector_gin') AS search_vector_index_exists,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_search_analytics_query') AS analytics_index_exists;
"

# All columns should return 't' (true)
```

### Step 7: Geolocation Backfill (Optional)

If you have existing properties without coordinates:

```bash
# Identify properties needing geocoding
psql -U postgres -d rentars -c "
SELECT COUNT(*) FROM properties WHERE latitude IS NULL OR longitude IS NULL;
"

# Option 1: Bulk geocoding script (not included - implement with your geocoding provider)
# Option 2: Handle gracefully in search queries (properties without coordinates are excluded from location-based searches)
```

The search service handles missing coordinates safely - properties without lat/long are simply excluded from distance-based searches.

### Step 8: Verify Backend Search Endpoints

```bash
# Test the advanced search endpoint
curl -X GET "http://localhost:3000/api/v1/properties/search/advanced?q=beach&city=Miami&min_price=100&max_price=500" \
  -H "Content-Type: application/json"

# Expected: JSON response with matching properties

# Test search suggestions
curl -X GET "http://localhost:3000/api/v1/properties/search/suggestions?q=apa" \
  -H "Content-Type: application/json"

# Expected: JSON array of suggestion strings

# Test trending searches
curl -X GET "http://localhost:3000/api/v1/properties/search/trending" \
  -H "Content-Type: application/json"

# Expected: JSON array of trending query strings
```

### Step 9: Monitor Production

```bash
# Watch for errors in application logs
tail -f /var/log/rentars/backend.log | grep -i "search\|postgis"

# Monitor search latency
psql -U postgres -d rentars -c "
SELECT 
  query,
  COUNT(*) as frequency,
  AVG(result_count) as avg_results
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY query
ORDER BY frequency DESC
LIMIT 10;
"

# Monitor database load
psql -U postgres -d rentars -c "
SELECT 
  schemaname,
  tablename,
  idx_scan as index_scans,
  seq_scan as sequential_scans
FROM pg_stat_user_tables
WHERE tablename IN ('properties', 'search_analytics')
ORDER BY idx_scan DESC;
"
```

### Step 10: Update Checklist

Mark the deployment complete in `IMPLEMENTATION_CHECKLIST.md`:

```markdown
### Database (✅ Deployed)
- [x] Migration `00014_search_analytics_and_geolocation.sql` applied
- [x] `search_analytics` table created
- [x] PostGIS extension enabled
- [x] Verified in production on [DATE]
```

## Rollback Procedure

If issues occur after deployment:

```bash
# Rollback script (WARNING: Destructive - loses search analytics data)
psql -U postgres -d rentars -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_properties_search_vector_gin;
DROP INDEX IF EXISTS idx_search_analytics_query;
DROP INDEX IF EXISTS idx_search_analytics_user_id;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trg_properties_location_update ON properties;
DROP FUNCTION IF EXISTS properties_location_update();
DROP FUNCTION IF EXISTS search_nearby_properties(DECIMAL, DECIMAL, INTEGER);
DROP FUNCTION IF EXISTS get_search_suggestions(TEXT, INTEGER);

-- Drop columns
ALTER TABLE properties DROP COLUMN IF EXISTS search_vector;
ALTER TABLE properties DROP COLUMN IF EXISTS location;
ALTER TABLE properties DROP COLUMN IF EXISTS latitude;
ALTER TABLE properties DROP COLUMN IF EXISTS longitude;

-- Drop table
DROP TABLE IF EXISTS search_analytics;

-- Drop extension (only if not used elsewhere)
-- DROP EXTENSION IF EXISTS postgis CASCADE;

COMMIT;
SQL
```

**Note**: This rollback is destructive. Search analytics data will be lost. Properties table remains intact except for the added columns.

## Forward-Fix Strategy (Preferred)

Instead of rolling back, most issues can be fixed forward:

### Issue: PostGIS Extension Permission Denied

```sql
-- Grant extension creation to your database role
GRANT postgres TO your_app_user;
-- Or have a superuser create the extension
```

### Issue: Index Build Takes Too Long

```sql
-- Use CONCURRENTLY to avoid blocking writes
CREATE INDEX CONCURRENTLY idx_properties_search_vector_gin 
ON properties USING gin(search_vector);
```

### Issue: Search Queries are Slow

```sql
-- Verify the index is being used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM properties WHERE search_vector @@ to_tsquery('test');

-- If not using index, run ANALYZE
ANALYZE properties;

-- Check index bloat
SELECT 
  schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%search%';
```

### Issue: Missing Coordinates Break Searches

The search service already handles this correctly - properties without coordinates are excluded from location-based queries. No fix needed.

## Operational Checks

### Daily

- Monitor search error rate in application logs
- Check search latency P95 metric (target: < 500ms)

### Weekly

- Review search analytics growth rate
- Check index health and bloat
- Review geocoding failures (if backfilling)

### Monthly

- Audit search query patterns for optimization opportunities
- Review and archive old search analytics (optional retention policy)

## Success Criteria

After deployment, verify:

- [x] Fresh database and upgraded staging both pass verification query
- [x] Advanced search returns results for full-text queries
- [x] Combined filters (price + amenities + dates) work correctly
- [x] Location-based searches return correct distances
- [x] Listings without coordinates don't crash searches
- [x] Autocomplete suggests relevant queries
- [x] Search latency P95 < 500ms
- [x] No errors in application logs
- [x] Existing property CRUD operations unchanged

## Sign-Off

- [ ] Backend Lead: _________________ Date: _______ 
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Database Admin: ______________ Date: _______

## References

- Migration File: `apps/backend/database/migrations/00014_search_analytics_and_geolocation.sql`
- Search Service: `apps/backend/src/services/propertySearch.service.ts`
- Search Controller: `apps/backend/src/controllers/property.controller.ts`
- Search Tests: `apps/backend/src/__tests__/search.test.ts`
- PostGIS Documentation: https://postgis.net/docs/
- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
