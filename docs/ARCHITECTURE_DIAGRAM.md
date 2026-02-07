# RevenueCat Integration Architecture

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Plannr App                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    App.js                             │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │            ClerkProvider                        │ │  │
│  │  │  (Authentication)                               │ │  │
│  │  │                                                 │ │  │
│  │  │  ┌───────────────────────────────────────────┐ │ │  │
│  │  │  │       AppUpdateProvider                   │ │ │  │
│  │  │  │  (Version Checking)                       │ │ │  │
│  │  │  │                                           │ │ │  │
│  │  │  │  ┌─────────────────────────────────────┐ │ │ │  │
│  │  │  │  │    SubscriptionProvider ⭐          │ │ │ │  │
│  │  │  │  │  (Phase 1 Implementation)           │ │ │ │  │
│  │  │  │  │                                     │ │ │ │  │
│  │  │  │  │  ┌───────────────────────────────┐ │ │ │ │  │
│  │  │  │  │  │     AppStateProvider         │ │ │ │ │  │
│  │  │  │  │  │  (App State)                 │ │ │ │ │  │
│  │  │  │  │  │                              │ │ │ │ │  │
│  │  │  │  │  │  [Rest of App]               │ │ │ │ │  │
│  │  │  │  │  └───────────────────────────────┘ │ │ │ │  │
│  │  │  │  └─────────────────────────────────────┘ │ │ │  │
│  │  │  └───────────────────────────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

```
┌──────────────────┐
│  User Sign In    │
│  (Clerk)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  SubscriptionProvider Initialization                     │
│  • Checks Platform.OS === 'ios'                          │
│  • Gets user ID from Clerk                               │
│  • Passes to SubscriptionService.init()                  │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  SubscriptionService.init()                              │
│  • Configures RevenueCat SDK                             │
│  • Calls Purchases.logIn(clerkUserId)                    │
│  • Fetches initial CustomerInfo                          │
│  • Sets up listener for updates                          │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  State Derivation (deriveSubscriptionState)              │
│  • Checks customerInfo.entitlements.active['plannr_pro'] │
│  • Sets isPro: boolean                                   │
│  • Extracts activeEntitlements, productIds, etc.         │
└────────┬─────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Context State Available to App                          │
│  • Components use useSubscription() hook                 │
│  • Access isPro, activeEntitlements, etc.                │
│  • Call actions: purchase, restore, refresh              │
└──────────────────────────────────────────────────────────┘
```

## 🛍️ Purchase Flow

```
User taps "Subscribe"
         │
         ▼
Component calls purchasePackage(package)
         │
         ▼
SubscriptionService.purchasePackage()
         │
         ▼
RevenueCat SDK: Purchases.purchasePackage()
         │
         ├─ User cancels ──────────► Return { userCancelled: true }
         │                           (No error thrown)
         │
         ├─ Purchase fails ────────► Normalize error message
         │                           Throw user-friendly error
         │
         └─ Purchase succeeds ─────► Get updated CustomerInfo
                                     │
                                     ▼
                          Listener fires automatically
                                     │
                                     ▼
                          SubscriptionContext updates
                                     │
                                     ▼
                          isPro becomes true
                                     │
                                     ▼
                          UI re-renders with Pro access
```

## 🔐 Entitlement Check Flow

```
┌────────────────────────┐
│  Component renders     │
│  Calls useSubscription │
└───────────┬────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│  Hook returns context value              │
│  { isPro, activeEntitlements, ... }      │
└───────────┬──────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│  Component checks isPro                  │
│                                          │
│  if (isPro) {                            │
│    return <ProFeature />                 │
│  } else {                                │
│    return <UpgradePrompt />              │
│  }                                       │
└──────────────────────────────────────────┘

Where isPro comes from:
┌──────────────────────────────────────────┐
│  deriveSubscriptionState(customerInfo)   │
│                                          │
│  const proEntitlement =                  │
│    customerInfo                          │
│      .entitlements                       │
│      .active['plannr_pro']               │
│                                          │
│  return { isPro: !!proEntitlement }      │
└──────────────────────────────────────────┘
```

## 📱 iOS-Only Platform Gating

```
┌────────────────────────────┐
│  Any subscription call     │
└────────────┬───────────────┘
             │
             ▼
      Platform.OS === 'ios'?
             │
      ┌──────┴──────┐
      │             │
    Yes            No
      │             │
      ▼             ▼
   Execute     Skip/Return
   normally    gracefully
      │             │
      ▼             ▼
   [iOS           [Android/Web
    logic]         no-op]
```

## 🔊 Real-Time Update Flow

```
RevenueCat Server (Purchase/Renewal/Cancellation)
         │
         ▼
RevenueCat SDK receives update
         │
         ▼
Purchases.addCustomerInfoUpdateListener fires
         │
         ▼
SubscriptionService listener callback
         │
         ▼
SubscriptionProvider updates state
         │
         ▼
React Context propagates to all consumers
         │
         ▼
Components using useSubscription() re-render
         │
         ▼
UI reflects new subscription status
```

## 🗂️ File Structure

```
frontend/
├── App.js ⭐ (SubscriptionProvider added)
└── src/
    ├── services/
    │   └── subscription/
    │       ├── SubscriptionService.js ⭐ (New - SDK wrapper)
    │       └── README.md ⭐ (New - Documentation)
    ├── context/
    │   └── SubscriptionContext.js ⭐ (New - React Context)
    └── hooks/
        └── useSubscription.js ⭐ (New - Convenience hook)

backend/
└── src/
    └── config/
        └── env.js ⭐ (Modified - Added webhook secret)
```

## 🧩 Component Relationship

```
┌─────────────────────────────────────────┐
│      SubscriptionService                │
│  (Singleton - SDK Operations)           │
│  • init()                               │
│  • fetchOfferings()                     │
│  • purchasePackage()                    │
│  • restorePurchases()                   │
│  • refreshCustomerInfo()                │
│  • addCustomerInfoListener()            │
└──────────────┬──────────────────────────┘
               │ Used by
               ▼
┌─────────────────────────────────────────┐
│      SubscriptionContext                │
│  (React Context Provider)               │
│  • Manages state                        │
│  • Handles lifecycle                    │
│  • Exposes hook                         │
└──────────────┬──────────────────────────┘
               │ Provides to
               ▼
┌─────────────────────────────────────────┐
│      useSubscription Hook               │
│  (Consumer API)                         │
│  • isPro                                │
│  • activeEntitlements                   │
│  • purchasePackage()                    │
│  • restorePurchases()                   │
│  • ...                                  │
└──────────────┬──────────────────────────┘
               │ Used by
               ▼
┌─────────────────────────────────────────┐
│      App Components                     │
│  (Screens, Features, etc.)              │
│  • Check subscription status            │
│  • Trigger purchases                    │
│  • Show appropriate UI                  │
└─────────────────────────────────────────┘
```

## 🎯 State Shape

```javascript
SubscriptionContext provides:
{
    // Derived from entitlements.active['plannr_pro']
    isPro: boolean,                    // 🎯 Main feature gate
    
    // Additional subscription info
    activeEntitlements: string[],      // e.g., ['plannr_pro']
    activeProductIds: string[],        // e.g., ['monthly_sub_id']
    managementURL: string | null,      // Apple subscription management
    expirationAt: string | null,       // ISO date string
    productId: string | null,          // Current product identifier
    
    // Raw customer info
    customerInfo: CustomerInfo | null, // Full RevenueCat object
    
    // Loading states
    isLoading: boolean,                // Initial load
    isReady: boolean,                  // SDK initialized
    error: string | null,              // Error message
    
    // Actions
    refreshSubscription: () => Promise<CustomerInfo>,
    purchasePackage: (pkg) => Promise<{customerInfo, productIdentifier}>,
    restorePurchases: () => Promise<CustomerInfo>,
    fetchOfferings: () => Promise<Offerings>,
    getManagementURL: () => Promise<string | null>,
}
```

## 🔄 Lifecycle Events

```
App Launch (iOS, User Signed In)
    │
    ├─► SubscriptionProvider mounts
    │      │
    │      ├─► Check Platform.OS
    │      ├─► Check user authentication
    │      ├─► Call SubscriptionService.init()
    │      │      │
    │      │      ├─► Configure RevenueCat SDK
    │      │      ├─► Login with Clerk user ID
    │      │      └─► Fetch initial CustomerInfo
    │      │
    │      ├─► Derive state from CustomerInfo
    │      ├─► Register listener
    │      └─► Set isReady = true
    │
    └─► App renders with subscription context

User Signs Out
    │
    ├─► SubscriptionProvider cleanup
    │      │
    │      └─► Remove customer info listener
    │
    └─► (Optional: Call SubscriptionService.logout())

User Makes Purchase
    │
    ├─► purchasePackage() called
    │      │
    │      ├─► RevenueCat SDK processes
    │      ├─► Purchase completes
    │      └─► Listener fires with new CustomerInfo
    │
    └─► State updates automatically
           │
           └─► isPro becomes true
```

## 🎨 Visual Summary

```
┌────────────────────────────────────────────────────────────┐
│                     PHASE 1 COMPLETE                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✅ SDK Installed & Configured                            │
│  ✅ Service Layer (SubscriptionService)                   │
│  ✅ State Management (SubscriptionContext)                │
│  ✅ Hook Interface (useSubscription)                      │
│  ✅ App Integration (Provider tree)                       │
│  ✅ iOS-Only Platform Gating                              │
│  ✅ Clerk User ID Integration                             │
│  ✅ Entitlement-Based Logic                               │
│  ✅ Real-Time Updates via Listener                        │
│  ✅ Error Handling & Normalization                        │
│                                                            │
│  NEXT: Phase 3 - Paywall UI                               │
│        • ProPaywallScreen component                        │
│        • Monthly/Annual options                            │
│        • Purchase flow with loading states                 │
│        • Restore button                                    │
│        • Terms/Privacy/Manage links                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```
