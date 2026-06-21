# Quick Start: Calendar Management for Hosts

## Overview

The new Rentars calendar system allows you to manage property availability, set dynamic pricing, and block dates for maintenance—all in one place.

## Features

### 1. View Property Calendar

Navigate to your property dashboard. You'll see a monthly calendar showing:
- **Blue dates:** Available for booking
- **Gray dates:** Already booked or blocked
- **Dark blue dates:** Your selection range

### 2. Set Seasonal Pricing

Increase prices during high-demand seasons (summer, holidays, events).

**How to:**
1. Go to your property dashboard → "Calendar Management"
2. Click **"Add Season"**
3. Enter:
   - Season name (e.g., "Summer Peak")
   - Start and end dates
   - Price multiplier (e.g., 1.5 = 50% increase)
4. Click **"Save Season"**

**Example:**
```
Base price: 100 USDC/night
Summer multiplier: 1.5x
Summer price: 150 USDC/night
```

### 3. Create Special Events

Mark holidays or special occasions with custom pricing (or block entirely for maintenance).

**How to:**
1. Go to your property dashboard → "Calendar Management"
2. Click **"Add Event"**
3. Enter:
   - Event name (e.g., "Christmas Holiday")
   - Start and end dates
   - Price multiplier (optional)
   - Check "Block dates" if unavailable
4. Click **"Save Event"**

**Examples:**

**Holiday Premium:**
- New Year's Eve: December 31, 2026
- Multiplier: 2.0x (double price)
- Status: Available (guests can book at premium)

**Maintenance Block:**
- Annual Maintenance: September 1-5, 2026
- Price multiplier: (none)
- Status: BLOCKED (no guests can book)

### 4. Block Dates for Personal Use

Need the property for yourself? Block specific dates.

**How to:**
1. Go to "Calendar Management"
2. Click **"Add Event"**
3. Enter dates
4. Check **"Block dates (unavailable)"**
5. Save

The property becomes unavailable during those dates.

## Pricing Rules

### How Prices Are Calculated

When a guest books your property, the price is calculated from:

1. **Base Price** (set in property settings)
   - Example: 100 USDC/night

2. **Seasonal Multiplier** (if date falls in a season)
   - Example: Summer (July 1-31): 1.5x
   - Result: 150 USDC/night

3. **Event Multiplier** (if date has a special event)
   - Example: July 4 (Holiday): 1.5x
   - Result: 150 × 1.5 = 225 USDC/night

### Multiplier Combinations

If overlapping rules apply, they multiply:

```
Base: 100 USDC
Summer (1.5x): 100 × 1.5 = 150 USDC
+ July 4 Holiday (1.5x): 150 × 1.5 = 225 USDC
```

## Minimum Stay Requirement

Set the minimum number of nights guests must book. Prevents short stays that don't cover cleaning costs.

**How to:**
1. Go to property settings
2. Set "Minimum Stay" (e.g., 2 nights)
3. Save

Guests cannot book less than the minimum, even if dates are available.

## Managing Bookings

### View Calendar

The calendar shows all bookings in real-time:
- **Booked dates** appear gray
- **Available dates** appear blue
- Click dates to see booking details

### Accept/Reject Bookings

Pending bookings appear in your notifications:
1. Review guest details
2. Click "Accept" or "Reject"
3. Rejected funds return to guest via escrow

### Cancel a Booking

If needed:
1. Open the booking
2. Click "Cancel"
3. Guest receives refund to their wallet

**Note:** Cancellations within 48 hours of check-in may incur fees.

## Best Practices

### Pricing Strategy

**Off-Season:** Base price (attracts volume)
```
January: No multiplier = 100 USDC/night
```

**Peak Season:** 1.3-1.8x multiplier
```
July-August: 1.5x = 150 USDC/night
```

**Holidays:** 1.5-2.5x multiplier
```
Christmas: 2.0x = 200 USDC/night
```

### Blocking Strategy

**Annual Maintenance:**
- Block 1 week every 6 months
- Use "Special Events" → "Block dates"

**Personal Use:**
- Block specific weeks you plan to visit

**Cleaning & Turnover:**
- Block 1-2 days between check-outs and next check-ins (auto-handled)

## Frequently Asked Questions

### Can I change prices daily?

Yes! Create special events for specific dates with custom multipliers.

### What if I forgot to block dates for maintenance?

Go to "Calendar Management" and add the dates retroactively. Existing bookings won't be affected.

### Do blocked dates still show on the calendar?

Yes, blocked dates appear gray, just like bookings. Guests can't select them.

### How far in the future can I set prices?

Set seasonal pricing up to 2 years in advance. Update as needed.

### Can I have multiple overlapping seasons?

Yes! If multipliers overlap, they stack multiplicatively:
```
Season 1 (1.2x) + Season 2 (1.3x) = 1.56x
```

### Why is my booking price different than expected?

Check:
1. Base price (property settings)
2. Seasonal pricing (date falls in season?)
3. Special events (holiday multiplier?)
4. Minimum stay (did guest meet minimum?)

## Support

For questions or issues:
- Email: support@rentars.io
- Chat: In-app support widget
- Docs: rentars.io/docs/calendar

---

**Happy hosting!** 🏡✨
