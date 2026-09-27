# Booking Authorization - Role-Based Access Control

## Overview

The booking system implements comprehensive role-based authorization to prevent unauthorized access and modifications. All booking operations are protected by the `BookingAuthorizationService` which enforces the principle of least privilege.

## Authorization Model

### Roles

1. **Tenant** - User who created the booking
   - Can read their own bookings
   - Can cancel their own bookings
   - Can complete their own bookings  
   - Can dispute their own bookings
   - Can request modifications on their bookings

2. **Host** - Property owner
   - Can read bookings on their properties
   - Can confirm bookings on their properties
   - Can accept/decline modifications on their properties
   - Can dispute bookings on their properties

3. **Admin** - Platform administrator
   - Can perform all tenant and host actions
   - Can resolve disputes
   - Full access to all bookings

4. **Moderator** - Content moderator
   - Same permissions as Admin
   - Can resolve disputes
   - Full access to all bookings

5. **Support** - Customer support
   - Can read all bookings (read-only)
   - Cannot modify any bookings

6. **Finance** - Financial team
   - Can read all bookings (read-only)
   - Cannot modify any bookings

## Permission Matrix

| Operation | Tenant | Host | Admin | Moderator | Support | Finance |
|-----------|--------|------|-------|-----------|---------|---------|
| Read booking | Own only | Properties only | All | All | All | All |
| Cancel booking | Own only | ❌ | All | All | ❌ | ❌ |
| Confirm booking | ❌ | Properties only | All | All | ❌ | ❌ |
| Complete booking | Own only | ❌ | All | All | ❌ | ❌ |
| Dispute booking | Own only | Properties only | All | All | ❌ | ❌ |
| Request modification | Own only | ❌ | All | All | ❌ | ❌ |
| Accept/Decline modification | ❌ | Properties only | All | All | ❌ | ❌ |
| Resolve dispute | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |

## Implementation

### Service Layer Authorization

The `BookingAuthorizationService` provides centralized authorization checks:

```typescript
import { bookingAuthorizationService } from '@/services/bookingAuthorization.service.js';

// Check if user can cancel a booking
const authCheck = await bookingAuthorizationService.canCancel(
  bookingId, 
  userId, 
  userRole
);

if (!authCheck.allowed) {
  return { 
    success: false, 
    error: authCheck.reason,
    statusCode: 403 
  };
}
```

### Controller Layer Authorization

Controllers integrate authorization checks before service calls:

```typescript
export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const authUser = req.user;
  
  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Authorization check with audit logging
  const authCheck = await bookingAuthorizationService.canCancel(
    req.params.id, 
    authUser.id, 
    authUser.role
  );
  
  if (!authCheck.allowed) {
    loggingService.logSecurityEvent('booking_cancel_denied', {
      bookingId: req.params.id,
      userId: authUser.id,
      reason: authCheck.reason,
    });
    res.status(403).json({ error: authCheck.reason });
    return;
  }

  // Proceed with service call
  const result = await bookingService.cancelBooking(req.params.id, authUser.id);
  // ...
}
```

### Database Layer (RLS)

Row-Level Security (RLS) policies provide defense-in-depth:

```sql
-- Bookings can only be read by tenant, host, or privileged roles
CREATE POLICY booking_read_policy ON bookings
FOR SELECT
USING (
  tenant_id = auth.uid()
  OR property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator', 'support', 'finance')
  )
);
```

## Security Features

### 1. IDOR Protection

Authorization checks use the booking record from the database, not request parameters:

```typescript
// ❌ VULNERABLE: Uses untrusted input
if (req.body.tenant_id === userId) { /* allow */ }

// ✅ SECURE: Fetches from database
const booking = await fetchBooking(bookingId);
if (booking.tenant_id === userId) { /* allow */ }
```

### 2. Consistent Error Responses

Unauthorized requests return consistent 403 responses that don't reveal whether the resource exists:

```typescript
// Both scenarios return the same error
// - Booking doesn't exist
// - Booking exists but user lacks access
res.status(403).json({ error: 'Forbidden: You do not have access to this booking' });
```

### 3. Audit Logging

All authorization denials are logged for security monitoring:

```typescript
loggingService.logSecurityEvent('booking_access_denied', {
  bookingId,
  userId,
  attemptedAction: 'cancel',
  reason: authCheck.reason,
});
```

### 4. No Role Spoofing

User roles come from the authenticated session, not request parameters:

```typescript
// ❌ VULNERABLE: Role from request
const userRole = req.body.role;

// ✅ SECURE: Role from authenticated session
const userRole = req.user.role;
```

## Testing

### Unit Tests

Authorization logic is tested in `apps/backend/src/__tests__/booking-authorization-idor.test.ts`:

```bash
bun test booking-authorization-idor.test.ts
```

Tests cover:
- Tenant access to other tenant's bookings (blocked)
- Host access to non-owned properties (blocked)
- Admin privilege escalation (allowed)
- Request body spoofing (blocked)
- Non-existent booking enumeration (prevented)

### Integration Tests

End-to-end authorization tests in `apps/backend/src/__tests__/booking-authorization-e2e.test.ts`:

```bash
bun test booking-authorization-e2e.test.ts
```

## Common Attacks & Mitigations

### Attack: Booking ID Enumeration

**Attack**: Attacker iterates through booking IDs to find valid bookings
```
GET /api/v1/bookings/00000001
GET /api/v1/bookings/00000002
...
```

**Mitigation**: Use UUIDs instead of sequential IDs, return consistent 403 for both non-existent and unauthorized bookings

### Attack: Parameter Tampering

**Attack**: Attacker changes IDs in request to access other users' data
```json
POST /api/v1/bookings/victim-booking-id/cancel
{
  "tenant_id": "attacker-id"  // Spoofed
}
```

**Mitigation**: Authorization uses database records, ignores request body identifiers

### Attack: Privilege Escalation

**Attack**: Attacker tries to impersonate admin role
```json
POST /api/v1/bookings/some-booking/cancel
Authorization: Bearer <token>
{
  "role": "admin"  // Spoofed
}
```

**Mitigation**: Role comes from JWT token claims, verified by authentication middleware

### Attack: Session Riding

**Attack**: Attacker reuses valid session token from different user
```
Cookie: session=<valid-but-stolen-token>
GET /api/v1/bookings/victim-booking-id
```

**Mitigation**: Authorization checks user ID from token on every request, no caching

## Monitoring & Alerts

### Security Events to Monitor

1. **High volume of 403 responses** from single user/IP
   - Potential enumeration attack
   - Alert threshold: >10 denials in 5 minutes

2. **Authorization checks failing for admin users**
   - Potential compromised admin account
   - Alert immediately

3. **Mismatched user ID in authorization logs**
   - Token/session anomaly
   - Alert threshold: >3 mismatches in 1 hour

### Metrics

Track authorization metrics:

```typescript
// Prometheus metrics
authorization_checks_total{operation, result}
authorization_denied_total{operation, reason}
authorization_latency_seconds{operation}
```

## Rollout Checklist

- [x] `BookingAuthorizationService` implemented
- [x] Controller authorization checks added
- [x] RLS policies deployed
- [x] Audit logging integrated
- [x] Unit tests passing
- [x] Integration tests passing
- [x] IDOR tests passing
- [x] Documentation complete
- [ ] Security review completed
- [ ] Monitoring alerts configured
- [ ] Deployed to production

## References

- Authorization Service: `apps/backend/src/services/bookingAuthorization.service.ts`
- Booking Controller: `apps/backend/src/controllers/booking.controller.ts`
- Booking Service: `apps/backend/src/services/booking.service.ts`
- IDOR Tests: `apps/backend/src/__tests__/booking-authorization-idor.test.ts`
- OWASP IDOR Guide: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References

## Support

For authorization-related issues:
1. Check security event logs: `loggingService.logSecurityEvent`
2. Review authorization denial metrics
3. Verify user role in JWT token
4. Confirm RLS policies are enabled
5. Contact security team if suspected attack
