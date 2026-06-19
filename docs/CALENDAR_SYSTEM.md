# Comprehensive Booking Calendar System

This document describes the bulletproof scheduling architecture for the Rentars booking calendar system, designed to prevent double-bookings and handle complex pricing scenarios in a distributed, timezone-aware environment.

## Architecture Overview

### Core Components

1. **Calendar Engine** (`calendar.service.ts`) - Availability calculations with UTC normalization
2. **Pricing Engine** (`pricing.service.ts`) - Dynamic pricing with seasonal/special event rates
3. **Calendar API** (`calendar.controller.ts` + `calendar.routes.ts`) - RESTful endpoints
4. **Frontend Components**:
   - `AvailabilityCalendar.tsx` - Month view with date selection
   - `HostCalendarManagement.tsx` - Host dashboard for pricing/events
   - Updated `BookingForm.tsx` - Real-time pricing display

### Database Schema

**Dynamic Pricing Tables:**

```sql
-- Seasonal pricing rates
seasonal_pricing(
  id UUID,
  property_id UUID (FK),
  name VARCHAR,
  start_date DATE,
  end_date DATE,
  price_multiplier DECIMAL(3,2)
)

-- Special events (holidays, blocks)
special_events(
  id UUID,
  property_id UUID (FK),
  name VARCHAR,
  start_date DATE,
  end_date DATE,
  price_multiplier DECIMAL(3,2),
  is_blocked BOOLEAN
)

-- Pricing audit trail
pricing_history(
  id UUID,
  property_id UUID (FK),
  date DATE,
  price_per_night DECIMAL(10,2),
  reason VARCHAR,
  changed_by UUID (FK)
)
```

**UTC Normalization:**
- All date columns use `TIMESTAMPTZ` (timestamp with timezone)
- Backend normalizes all temporal operations to UTC before DB queries
- Frontend converts user timezone to UTC for API calls
- Responses include full ISO 8601 timestamps for client-side rendering

## Concurrency Control: Double-Booking Prevention

### Strategy: Pessimistic Locking + Atomic Transactions

**Problem:** Race condition when two users book overlapping dates simultaneously.

**Solution:** Database-level conflict detection in single transaction:

```typescript
// checkAvailabilityAtomic() in calendar.service.ts
export async function checkAvailabilityAtomic(
  propertyId: string,
  checkInStr: string,
  checkOutStr: string,
  minimumStay: number = 1,
): Promise<ServiceResponse<{ available: boolean; reason?: string }>> {
  // 1. Validate dates
  // 2. Check minimum stay
  // 3. SELECT FROM bookings WHERE overlapping (pessimistic lock)
  // 4. SELECT FROM availability_ranges WHERE blocked
  // 5. Return availability status
}
```

**Atomic Transaction in PostgreSQL:**

```sql
BEGIN TRANSACTION;
  SELECT * FROM bookings 
  WHERE property_id = $1 
    AND status != 'Cancelled'
    AND (check_in, check_out) OVERLAPS ($2, $3)
  FOR UPDATE;  -- Pessimistic lock
  
  -- If no conflicts, proceed with booking creation
  INSERT INTO bookings (...) VALUES (...);
COMMIT;
```

**Why this works:**
- `FOR UPDATE` locks rows, preventing concurrent modifications
- `OVERLAPS` operator correctly handles date range logic
- Serialization isolates concurrent booking attempts
- If booking succeeds, row is locked until commit
- If another transaction tries to book same dates, it waits for lock release

### Validation Layers

**1. Frontend (UX):**
- Live availability calendar blocks unavailable dates
- Check-in/check-out validation before submission
- Real-time pricing calculation

**2. API (First-line defense):**
- `checkAvailabilityAtomic()` - atomic check before booking
- Minimum stay validation
- Date format validation (ISO 8601)

**3. Database (Second-line defense):**
- `create_booking_atomic()` PL/pgSQL function
- `OVERLAPS` operator for range conflicts
- Indexed lookups for performance

**4. Blockchain (Final verification):**
- Soroban contract validates on-chain availability
- Escrow release gates on booking confirmation

## API Reference

### Get Calendar Month

```bash
GET /api/v1/calendar/:propertyId/month?year=2026&month=6
```

**Response:**
```json
{
  "year": 2026,
  "month": 6,
  "days": [
    {
      "date": "2026-06-01",
      "available": true,
      "minimum_stay_met": true
    },
    {
      "date": "2026-06-02",
      "available": false,
      "reason": "Booked"
    },
    {
      "date": "2026-06-03",
      "available": false,
      "reason": "Blocked"
    }
  ]
}
```

### Check Availability Atomically

```bash
GET /api/v1/calendar/:propertyId/check?checkIn=2026-06-20&checkOut=2026-06-25
```

**Response:**
```json
{
  "available": true
}
```

or

```json
{
  "available": false,
  "reason": "Date range overlaps with existing booking"
}
```

### Calculate Dynamic Pricing

```bash
GET /api/v1/calendar/:propertyId/price?checkIn=2026-06-20&checkOut=2026-06-25
```

**Response:**
```json
{
  "total": 450.50,
  "breakdown": [
    { "date": "2026-06-20", "price": 100.00, "is_available": true },
    { "date": "2026-06-21", "price": 100.00, "is_available": true },
    { "date": "2026-06-22", "price": 150.00, "is_available": true },
    { "date": "2026-06-23", "price": 100.50, "is_available": true }
  ]
}
```

### Manage Seasonal Pricing

```bash
# Create
POST /api/v1/calendar/:propertyId/seasons
{
  "name": "Summer Peak Season",
  "start_date": "2026-07-01",
  "end_date": "2026-08-31",
  "price_multiplier": 1.5
}

# Get all
GET /api/v1/calendar/:propertyId/seasons

# Delete
DELETE /api/v1/calendar/:propertyId/seasons/:pricingId
```

### Manage Special Events

```bash
# Create
POST /api/v1/calendar/:propertyId/events
{
  "name": "Christmas Holiday",
  "start_date": "2026-12-20",
  "end_date": "2026-12-27",
  "price_multiplier": 2.0,
  "is_blocked": false
}

# Create blocked dates
POST /api/v1/calendar/:propertyId/events
{
  "name": "Maintenance",
  "start_date": "2026-09-01",
  "end_date": "2026-09-05",
  "is_blocked": true
}

# Delete
DELETE /api/v1/calendar/:propertyId/events/:eventId
```

## Frontend Components

### AvailabilityCalendar

Interactive month view with date selection and real-time availability.

**Usage:**
```tsx
<AvailabilityCalendar
  propertyId="prop-123"
  onSelectRange={(checkIn, checkOut) => handleBooking(checkIn, checkOut)}
  onDateClick={(date) => console.log(date)}
/>
```

**Features:**
- Navigate months with prev/next buttons
- Click date to select check-in
- Click again to select check-out
- Visual feedback: available, selected, blocked dates
- Range display with booking info

### HostCalendarManagement

Dashboard for hosts to manage pricing and block dates.

**Usage:**
```tsx
<HostCalendarManagement propertyId="prop-123" />
```

**Features:**
- Add/remove seasonal pricing rates
- Create/remove special events (holidays, maintenance)
- Block dates with optional pricing override
- Real-time save/delete with error handling

### Updated BookingForm

Enhanced form with live pricing display.

**Usage:**
```tsx
<BookingForm
  propertyId="prop-123"
  onSubmit={(data) => handleBooking(data)}
/>
```

**Changes:**
- Removed hardcoded `pricePerNight`
- Integrated `calculateRangePrice()` API
- Shows per-night breakdown
- Validates availability before submission
- Real-time error display

## Timezone Handling

### UTC Normalization Strategy

All temporal operations happen in UTC to eliminate offset drifting:

**Backend:**
```typescript
// All dates converted to UTC before queries
const checkInDate = new Date(checkIn); // Parse ISO 8601 (UTC)
const checkInTs = checkInDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

// Database queries use date strings in UTC
await supabase
  .from('bookings')
  .select('*')
  .lte('check_in', checkOutStr) // Lexicographic comparison
  .gte('check_out', checkInStr);
```

**Frontend:**
```typescript
// Convert user input to UTC ISO 8601
const checkInStr = new Date(userCheckIn).toISOString(); // "2026-06-20T00:00:00.000Z"
const response = await fetch(`/api/v1/calendar/${id}/check?checkIn=${checkInStr}`);
```

**DST Handling:**
- All comparisons use date strings (YYYY-MM-DD), not timestamps
- DST transitions don't affect date-based logic
- Timezone offset is stripped before comparison
- Users see local times, server stores UTC

## Performance Optimizations

### Indexing Strategy

```sql
-- Date-range index for fast queries
CREATE INDEX idx_seasonal_pricing_property_id 
  ON seasonal_pricing(property_id, start_date, end_date);

CREATE INDEX idx_special_events_property_id 
  ON special_events(property_id, start_date, end_date);

-- Booking conflict detection
CREATE INDEX idx_bookings_property_dates 
  ON bookings(property_id, check_in, check_out) 
  WHERE status != 'Cancelled';

-- Availability ranges
CREATE INDEX idx_availability_ranges_dates 
  ON availability_ranges(property_id, start_date, end_date);
```

### Query Optimization

- Single query for month calendar (fetch bookings + ranges + events)
- Indexed date-range lookups avoid full table scans
- Pricing breakdown cached client-side during booking
- Seasonal rates pre-loaded when property is viewed

## Testing Strategy

### Unit Tests (`calendar.test.ts`)

- Minimum stay validation
- Date overlap detection
- Seasonal pricing application
- Special event blocking
- Month calendar generation

### Integration Tests

- Concurrent booking attempts (race condition simulation)
- Timezone conversion accuracy
- DST transition handling
- Pricing calculation with multiple overlapping rules

### E2E Tests

- Full booking flow with calendar selection
- Host management interface operations
- Real-time pricing updates
- Availability persistence after booking

## Deployment & Rollout

### Database Migrations

```bash
# Run migration to add dynamic pricing tables
cd apps/backend/database
psql $DATABASE_URL < migrations/00014_add_dynamic_pricing.sql
```

### API Deployment

1. Deploy new services: `calendar.service.ts`, `pricing.service.ts`
2. Deploy controller: `calendar.controller.ts`
3. Mount routes in main router
4. No breaking changes to existing booking endpoints

### Frontend Deployment

1. Add new components to web app
2. Update BookingForm to use new pricing API
3. Add calendar management page to host dashboard
4. Gradual rollout with feature flags if needed

## Future Enhancements

- WebSocket real-time availability updates
- Multi-property calendar view for hosts
- Advanced pricing rules (weekday/weekend, last-minute discounts)
- Occupancy analytics and recommendations
- Airbnb-style dynamic pricing suggestions
- iCal integration for syncing external calendars
