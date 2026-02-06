# Subscription Service - Phase 1 Implementation

## Overview
Phase 1 of the RevenueCat integration is complete. This provides the foundational SDK setup and subscription state management layer for Plannr Pro.

## What's Implemented

### 1. **SubscriptionService** (`src/services/subscription/SubscriptionService.js`)
Singleton service that wraps RevenueCat SDK operations:
- ✅ SDK initialization with Clerk user ID mapping
- ✅ Offerings fetching
- ✅ Package purchasing with error handling
- ✅ Purchase restoration
- ✅ Customer info refresh
- ✅ Customer info listener management
- ✅ iOS-only enforcement
- ✅ User-friendly error normalization

### 2. **SubscriptionContext** (`src/context/SubscriptionContext.js`)
React Context provider for app-wide subscription state:
- ✅ Automatic initialization on user authentication
- ✅ Real-time customer info updates via listener
- ✅ Entitlement-based state derivation (`plannr_pro`)
- ✅ Loading and error states
- ✅ Exposed actions: refresh, purchase, restore, fetchOfferings

### 3. **useSubscription Hook** (`src/hooks/useSubscription.js`)
Convenience hook export for accessing subscription context.

### 4. **App.js Integration**
- ✅ `SubscriptionProvider` added to provider tree
- ✅ Positioned after `ClerkProvider` and `AppUpdateProvider`
- ✅ Wraps `AppStateProvider` to ensure auth is ready

### 5. **Environment Configuration**
- ✅ Frontend: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (add to `.env`)
- ✅ Backend: `REVENUECAT_WEBHOOK_SECRET` added to `env.js`

### 6. **Dependencies**
- ✅ `react-native-purchases@^8.2.3` installed

## Required Environment Variables

### Frontend `.env`
```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_api_key_here
```

### Backend `.env`
```bash
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

## Usage Example

```javascript
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
    const { 
        isPro, 
        isReady, 
        isLoading,
        activeEntitlements,
        purchasePackage,
        restorePurchases,
        fetchOfferings,
    } = useSubscription();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (isPro) {
        return <ProFeature />;
    }

    return <UpgradePrompt />;
}
```

## Key Design Decisions

### 1. **Entitlement-Based Gating**
- Features check `isPro` derived from `entitlements.active['plannr_pro']`
- Never gate on product IDs directly (they can change)

### 2. **Clerk User ID as App User ID**
- Ensures consistent customer mapping across devices
- Prevents anonymous purchase fragmentation
- Initialized via `Purchases.logIn(clerkUserId)` after auth

### 3. **iOS-Only for Phase 1**
- All subscription logic checks `Platform.OS === 'ios'`
- Gracefully skips on Android (no-op)

### 4. **Singleton Service Pattern**
- `SubscriptionService` is a singleton to prevent multiple SDK initializations
- Context layer manages React lifecycle and state updates

### 5. **Error Handling Philosophy**
- User cancellation is not an error (soft exit)
- Purchase errors normalized to user-friendly messages
- App never blocks if subscription service fails to initialize

## State Shape

The `useSubscription` hook provides:

```typescript
{
    // Subscription status
    isPro: boolean,
    activeEntitlements: string[],
    activeProductIds: string[],
    managementURL: string | null,
    expirationAt: string | null,
    productId: string | null,
    
    // Customer info
    customerInfo: CustomerInfo | null,
    
    // Loading states
    isLoading: boolean,
    isReady: boolean,
    error: string | null,
    
    // Actions
    refreshSubscription: () => Promise<CustomerInfo>,
    purchasePackage: (pkg) => Promise<{customerInfo, productIdentifier}>,
    restorePurchases: () => Promise<CustomerInfo>,
    fetchOfferings: () => Promise<Offerings>,
    getManagementURL: () => Promise<string | null>,
}
```

## Next Steps (Phase 2)

Before testing, you'll need to:
1. Add `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` to your frontend `.env` file
2. Run `npx expo prebuild` to regenerate native code (if needed)
3. Phase 2 will add the `ProPaywallScreen` UI
4. Phase 3 will add feature gating components

## Testing Checklist

Once environment variables are configured:

- [ ] App initializes without errors on iOS
- [ ] RevenueCat SDK logs show successful initialization
- [ ] `useSubscription` hook provides correct initial state
- [ ] No crashes on Android (should gracefully skip)
- [ ] Console shows proper logging at each step

## Troubleshooting

### "SubscriptionService not initialized"
- Ensure user is signed in with Clerk before accessing subscription features
- Check that `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` is set

### "Module 'react-native-purchases' not found"
- Run `npm install` in frontend directory
- Run `npx expo prebuild` if using custom dev client
- Clean and rebuild native apps

### Customer info not updating
- Verify listener is properly registered
- Check RevenueCat dashboard for subscription status
- Try manual refresh via `refreshSubscription()`

## Architecture Notes

```
App.js
  └─ ClerkProvider (auth)
      └─ AppUpdateProvider (version check)
          └─ SubscriptionProvider ← NEW
              └─ AppStateProvider (app state)
                  └─ ...rest of app
```

The `SubscriptionProvider` sits between auth and app state to ensure:
1. User is authenticated before SDK init
2. Subscription state is available to all downstream components
3. Consistent with existing provider pattern
