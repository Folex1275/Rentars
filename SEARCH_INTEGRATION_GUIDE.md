# Search Enhancement Integration Guide

## Quick Start

### For Backend Developers

#### 1. Database Setup
```bash
# Apply database migrations
psql -U postgres -d rentars < apps/backend/database/migrations/00014_search_analytics_and_geolocation.sql

# Verify PostGIS extension
psql -U postgres -d rentars -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Check indexes were created
psql -U postgres -d rentars -c "\d+ properties"
```

#### 2. Verify Service Functions
```bash
cd apps/backend

# The following services are now available:
# - advancedSearch() - Main search function
# - trackSearch() - Analytics tracking
# - getSearchSuggestions() - Autocomplete
# - getTrendingSearches() - Trending queries
# - searchNearby() - Geolocation queries (via LocationService)
```

#### 3. Test Search Endpoints
```bash
# Basic search
curl "http://localhost:3000/api/v1/properties/search/advanced?q=beach"

# Filtered search
curl "http://localhost:3000/api/v1/properties/search/advanced?city=Miami&min_price=100&max_price=500&bedrooms=2"

# With sorting
curl "http://localhost:3000/api/v1/properties/search/advanced?sortBy=price_asc"

# With geolocation
curl "http://localhost:3000/api/v1/properties/search/advanced?latitude=25.76&longitude=-80.19&radius_km=50&sortBy=distance"

# Suggestions
curl "http://localhost:3000/api/v1/properties/search/suggestions?q=bea"

# Trending
curl "http://localhost:3000/api/v1/properties/search/trending"
```

### For Frontend Developers

#### 1. Component Replacement
```bash
# Replace old FilterSidebar
cp apps/web/src/components/search/FilterSidebar.tsx \
   apps/web/src/components/search/FilterSidebar.tsx.backup

# New FilterSidebar is already in place with full functionality
```

#### 2. Add SearchAutocomplete to Your Page
```tsx
import SearchAutocomplete from '@/components/search/SearchAutocomplete';

export default function SearchPage() {
  const handleSearch = (query: string) => {
    // Trigger search
    console.log('Searching for:', query);
  };

  return <SearchAutocomplete onSearch={handleSearch} />;
}
```

#### 3. Use usePropertySearch Hook
```tsx
import { usePropertySearch } from '@/hooks/usePropertySearch';
import FilterSidebar, { type FilterState } from '@/components/search/FilterSidebar';

export default function SearchPage() {
  const { results, loading, search, getSuggestions } = usePropertySearch();

  const handleSearch = async (query: string, filters: FilterState) => {
    await search(query, filters, 1);
  };

  const handleFilterChange = (filters: FilterState) => {
    handleSearch('', filters);
  };

  return (
    <div>
      <FilterSidebar onFilterChange={handleFilterChange} />
      {loading && <p>Loading...</p>}
      {results.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

#### 4. Full Search Page Example
```tsx
'use client';

import { useState } from 'react';
import SearchAutocomplete from '@/components/search/SearchAutocomplete';
import FilterSidebar, { type FilterState } from '@/components/search/FilterSidebar';
import { usePropertySearch } from '@/hooks/usePropertySearch';
import PropertyGrid from '@/components/search/PropertyGrid';

export default function SearchResultsPage() {
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 1000,
    amenities: [],
    guests: 1,
    propertyType: '',
  });

  const { results, loading, error, page, search } = usePropertySearch();

  const handleSearch = async (query: string) => {
    await search(query, filters, 1);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    handleSearch('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search Properties</h1>
        <SearchAutocomplete onSearch={handleSearch} />
      </div>

      <div className="grid grid-cols-4 gap-8">
        <FilterSidebar onFilterChange={handleFilterChange} />
        
        <div className="col-span-3">
          {loading && <p className="text-center">Loading properties...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          <PropertyGrid properties={results} />
        </div>
      </div>
    </div>
  );
}
```

## API Reference

### GET /api/v1/properties/search/advanced

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Full-text search query | `beach house` |
| `city` | string | City name | `Miami` |
| `country` | string | Country name | `USA` |
| `min_price` | number | Minimum price per night | `100` |
| `max_price` | number | Maximum price per night | `500` |
| `bedrooms` | number | Minimum bedrooms | `2` |
| `guests` | number | Minimum guest capacity | `4` |
| `amenities` | string[] | Array of amenities | `WiFi,Pool,Parking` |
| `checkIn` | string | Check-in date (ISO 8601) | `2025-07-01` |
| `checkOut` | string | Check-out date (ISO 8601) | `2025-07-08` |
| `sortBy` | string | Sort option | `price_asc` |
| `latitude` | number | Latitude for location search | `25.7617` |
| `longitude` | number | Longitude for location search | `-80.1918` |
| `radius_km` | number | Radius in kilometers | `50` |
| `page` | number | Page number (1-indexed) | `1` |
| `limit` | number | Results per page (max 100) | `20` |

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Beautiful Beach House",
      "price_per_night": 250,
      "city": "Miami",
      "country": "USA",
      "bedrooms": 3,
      "amenities": ["WiFi", "Pool", "Parking"],
      "distance_km": 2.5,
      "rating": 4.8,
      "created_at": "2025-06-19T20:00:00Z"
    }
  ],
  "count": 1,
  "page": 1
}
```

### GET /api/v1/properties/search/suggestions

**Query Parameters:**
- `q` - Search prefix (≥ 2 characters)
- `limit` - Max suggestions (default: 10)

**Response:**
```json
[
  {
    "query": "beach house miami",
    "frequency": 45,
    "result_count": 120
  },
  {
    "query": "beach apartment",
    "frequency": 32,
    "result_count": 87
  }
]
```

### GET /api/v1/properties/search/trending

**Response:**
```json
[
  { "query": "beach house", "frequency": 150 },
  { "query": "mountain cabin", "frequency": 98 },
  { "query": "city apartment", "frequency": 76 }
]
```

## Filtering Examples

### Example 1: Budget-Friendly Family Vacation
```
GET /api/v1/properties/search/advanced
  ?city=Orlando
  &min_price=50
  &max_price=200
  &bedrooms=3
  &guests=6
  &amenities=Kitchen&amenities=Washer
  &sortBy=price_asc
```

### Example 2: Luxury Beach Getaway
```
GET /api/v1/properties/search/advanced
  ?q=beach
  &min_price=400
  &max_price=1000
  &amenities=Pool&amenities=WiFi&amenities=AC
  &sortBy=rating
```

### Example 3: Nearest Properties to Me
```
GET /api/v1/properties/search/advanced
  ?latitude=40.7128
  &longitude=-74.0060
  &radius_km=15
  &sortBy=distance
  &limit=10
```

### Example 4: Professional Temporary Housing
```
GET /api/v1/properties/search/advanced
  ?city=San Francisco
  &checkIn=2025-07-01
  &checkOut=2025-09-30
  &amenities=WiFi&amenities=Desk
  &bedrooms=1
  &sortBy=price_asc
```

## Frontend State Management

### Using with React Query (Recommended)
```tsx
import { useQuery } from '@tanstack/react-query';

function SearchResults() {
  const [filters, setFilters] = useState<FilterState>({});
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Add filter params...
      const res = await fetch(`/api/v1/properties/search/advanced?${params}`);
      return res.json();
    },
  });

  return (
    // Render results
  );
}
```

### Using with Zustand (Alternative)
```tsx
import { create } from 'zustand';

interface SearchStore {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  results: SearchResult[];
  setResults: (results: SearchResult[]) => void;
  search: (query: string) => Promise<void>;
}

const useSearchStore = create<SearchStore>((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
  results: [],
  setResults: (results) => set({ results }),
  search: async (query: string) => {
    // Implement search
  },
}));
```

## Performance Optimization Tips

### 1. Debounce Filter Changes
```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((filters) => {
  search('', filters);
}, 500);

const handleFilterChange = (filters: FilterState) => {
  setFilters(filters);
  debouncedSearch(filters);
};
```

### 2. Lazy Load More Results
```tsx
const handleLoadMore = async () => {
  const nextPage = page + 1;
  const moreResults = await search(query, filters, nextPage);
  setResults([...results, ...moreResults]);
  setPage(nextPage);
};
```

### 3. Cache Frequently Searched Queries
```tsx
const cache = new Map<string, SearchResult[]>();

const searchWithCache = async (query: string) => {
  if (cache.has(query)) {
    return cache.get(query);
  }
  const results = await search(query);
  cache.set(query, results);
  return results;
};
```

## Debugging

### Check Backend Logs
```bash
cd apps/backend
bun run dev 2>&1 | grep -i search
```

### Test Database Indexes
```sql
-- Check if indexes exist
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'properties' OR tablename = 'search_analytics';

-- Monitor index usage
SELECT schemaname, tablename, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Monitor Search Performance
```sql
-- Slow searches
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%search%'
ORDER BY mean_exec_time DESC;
```

### Frontend Debugging
```tsx
// Add to SearchAutocomplete or search pages
useEffect(() => {
  console.log('Search results:', results);
  console.log('Loading:', loading);
  console.log('Error:', error);
}, [results, loading, error]);
```

## Troubleshooting Checklist

- [ ] Database migrations applied successfully
- [ ] PostGIS extension enabled: `CREATE EXTENSION postgis;`
- [ ] All indexes created: `\d+ properties`
- [ ] Backend endpoints respond to curl requests
- [ ] Frontend components render without errors
- [ ] FilterSidebar emits filter changes correctly
- [ ] SearchAutocomplete suggestions appear
- [ ] Results display in PropertyGrid
- [ ] Pagination works correctly
- [ ] Caching is functioning (check Redis)

## Next Steps

1. **Integrate with existing search page** - Replace current search UI with new components
2. **Add result display** - Use PropertyGrid/PropertyCard components
3. **Implement bookmarking** - Save favorite properties
4. **Add reviews** - Show ratings and reviews in results
5. **Track analytics** - Monitor search trends and user behavior
6. **Optimize for mobile** - Ensure responsive design on small screens

## Support

For issues or questions:
1. Check SEARCH_IMPLEMENTATION.md for detailed docs
2. Review test files for usage examples: `tests/search.test.ts`
3. Check error logs in both backend and frontend
4. Verify database schema matches migrations
5. Test endpoints directly with curl first
