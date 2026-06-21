# Freighter Wallet Integration - Implementation Notes

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  React Components                    │
│  ┌───────────────────────────────────────────────┐  │
│  │    WalletConnectionModal (UI)                 │  │
│  │    BookingPage (Integration)                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  Custom Hooks                        │
│  ┌───────────────────────────────────────────────┐  │
│  │    useWallet() - State Management             │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  Services Layer                      │
│  ┌───────────────────────────────────────────────┐  │
│  │    wallet.service.ts - Transaction Signing   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  Utilities                           │
│  ┌───────────────────────────────────────────────┐  │
│  │    freighter-utils.ts - Low-level API        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Freighter Wallet (Browser)                │
│  ┌───────────────────────────────────────────────┐  │
│  │    @stellar/freighter-api                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Connection Flow
```
User Click "Connect"
    ↓
WalletConnectionModal.handleFreighterConnect()
    ↓
connectFreighterWallet()
    ↓
isFreighterInstalled() + getFreighterPublicKey()
    ↓
Freighter API Response
    ↓
Validate Address (isValidStellarAddress)
    ↓
Save to localStorage
    ↓
Update State → UI Update
```

### Transaction Signing Flow
```
User Submits Booking
    ↓
Check Wallet Connection
    ↓
Build Transaction (Stellar SDK)
    ↓
signWithFreighter(xdr, networkPassphrase)
    ↓
Freighter Modal (User Signs)
    ↓
Return Signed XDR
    ↓
Send to Backend
    ↓
Broadcast Transaction
```

## Key Design Decisions

### 1. Error Class Pattern
Created custom `FreighterError` class with specific error codes for better error handling:
```typescript
throw new FreighterError('User rejected', 'USER_REJECTED')
```
This allows UI to display context-specific messages without string matching.

### 2. Address Validation
Uses regex pattern for Stellar addresses:
- Starts with 'G' (public key indicator)
- 56 characters total
- Base32 encoding: `[A-Z2-7]`

```typescript
/^G[A-Z2-7]{55}$/
```

### 3. localStorage Strategy
Only stores public key (non-sensitive):
- Key: `walletAddress`
- Validates on retrieval: `isValidStellarAddress()`
- Clears on disconnect

### 4. Network Passphrase Management
Centralized in `getNetworkPassphrase()` function:
```typescript
const passphrase = getNetworkPassphrase('testnet')
// Returns: 'Test SDF Network ; September 2015'
```

### 5. State Management
Three levels of state handling:

1. **Component Level** (WalletConnectionModal):
   - Connection state, error, address
   - Simple, isolated state

2. **Hook Level** (useWallet):
   - Full wallet lifecycle
   - Reusable across components
   - localStorage integration

3. **Module Level** (freighter-utils):
   - Low-level Freighter API wrapper
   - No state, pure functions

## Testing Strategy

### Unit Tests
- Mock Freighter API responses
- Mock Stellar SDK operations
- Test all error paths
- Test state transitions

### Component Tests
- User interactions
- UI state changes
- Error message display
- Modal controls

### Integration Tests (Manual)
- Real Freighter wallet
- Real Stellar Testnet
- End-to-end flows

## Environment Configuration

### Testnet (Default)
```typescript
const network = 'testnet'
const passphrase = 'Test SDF Network ; September 2015'
const horizonUrl = 'https://horizon-testnet.stellar.org'
```

### Mainnet (Production)
```typescript
const network = 'mainnet'
const passphrase = 'Public Global Stellar Network ; September 2015'
const horizonUrl = 'https://horizon.stellar.org'
```

Switch at runtime:
```typescript
await signUSDCPaymentTransaction(
  sender,
  recipient,
  amount,
  process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet'
)
```

## Performance Considerations

1. **Lazy Loading**: Hook calls `getWalletStatus()` on mount
2. **Caching**: Address cached in localStorage
3. **Timeout**: Transactions have 30-second timeout
4. **Error Recovery**: Retry mechanism prevents user frustration

## Security Review

### ✅ What's Secure
1. Public key only in storage (not private key)
2. User controls signing via Freighter modal
3. Network passphrase validated
4. Address format validated
5. Errors don't expose sensitive info

### ⚠️ Considerations for Production
1. Add rate limiting on connection attempts
2. Monitor for failed signing attempts
3. Log successful transactions (not details)
4. Add CORS headers for API calls
5. Consider implementing wallet whitelist

## Common Issues & Solutions

### Issue: Wallet Not Detected
**Cause:** Freighter not installed
**Solution:** Check `isFreighterInstalled()` and show install link

### Issue: "Not Connected" Error
**Cause:** Freighter open but wallet not selected
**Solution:** User must open Freighter and select account

### Issue: Transaction Signing Rejected
**Cause:** User clicks "Reject" in Freighter modal
**Solution:** Show "You rejected" message, allow retry

### Issue: Invalid Address Stored
**Cause:** localStorage corruption
**Solution:** Validate with `isValidStellarAddress()` on retrieval

## Future Enhancements

1. **Multi-Wallet Support**
   - Add MetaMask/Stellar Lab support
   - Abstract wallet selection

2. **Transaction History**
   - Track signed transactions
   - Show confirmation status

3. **Batch Signing**
   - Sign multiple transactions
   - Transaction queue

4. **Wallet Switching**
   - Allow switching between Freighter accounts
   - Preserve session state

5. **Advanced Features**
   - Transaction simulation
   - Gas estimation
   - Custom network support

## Debugging Tips

### Enable Debug Logging
```typescript
// In freighter-utils.ts
console.log('Wallet status:', result)
```

### Test with Invalid Addresses
```typescript
isValidStellarAddress('INVALID')  // false
isValidStellarAddress('GTEST...')  // true
```

### Mock Freighter Responses
```typescript
vi.mocked(FreighterApi.isConnected).mockResolvedValue({
  isConnected: true
})
```

### Check localStorage
```typescript
console.log(localStorage.getItem('walletAddress'))
```

## Deployment Checklist

- [ ] Update environment variables
- [ ] Configure Stellar network (testnet/mainnet)
- [ ] Test with real Freighter wallet
- [ ] Review error messages for production
- [ ] Set up monitoring/logging
- [ ] Run security audit
- [ ] Load test with multiple users
- [ ] Update API endpoints
- [ ] Test on mobile devices
- [ ] Verify accessibility

## Support & Troubleshooting

### For Users
1. Install Freighter from https://www.freighter.app
2. Create or import Stellar account
3. Select account in Freighter
4. Click "Connect Wallet" button
5. Approve connection in Freighter modal

### For Developers
1. Check console for error messages
2. Review test files for examples
3. Check Stellar documentation
4. Verify network configuration
5. Test with Stellar Lab: https://stellar.expert/

## References

- **Freighter API Docs:** https://github.com/StellarCN/freighter-api
- **Stellar SDK Docs:** https://developers.stellar.org/docs/tools/js-stellar-sdk
- **Stellar DevNet:** https://developers.stellar.org/docs/learn/fundamentals
