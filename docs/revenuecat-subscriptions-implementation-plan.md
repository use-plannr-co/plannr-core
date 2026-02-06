# Plannr Pro (RevenueCat + iOS) Implementation Plan

## 0) Repository architecture summary (current state)

### Frontend app composition
- Expo React Native app with `App.js` as root, layered providers (`ClerkProvider` → `AppUpdateProvider` → `AppStateProvider`) and React Navigation container in `RootNavigator`. Subscription state should be inserted as an additional provider in this tree rather than introducing a new app architecture.
- Navigation is split into `RootNavigator` (auth/onboarding/app switching), `AppStack` (main tabs + schedule screens), and nested `UserProfileStack`.
- State management is currently Context-based (`AppStateContext`, `AppUpdateContext`) with side effects in provider hooks and a custom API hook (`useAuthenticatedAPI`).
- API usage pattern: frontend uses `useAuthenticatedAPI` methods that all call `makeAuthenticatedRequest` and always include Clerk auth token + `x-clerk-user-id` header.

### Backend composition
- Express app mounted under `/api`, with route index that composes domain modules by directory (`modules/<domain>/{routes,controllers,repo,validators}`).
- Existing module style favors thin route files, controller orchestration, repository DB access via Drizzle.
- Existing user identity source in backend is `clerk_user_id`, and user lookup is done from request header in controllers.

### Data model baseline
- `users` table already stores identity/profile fields and is the natural place for convenience subscription flags (`is_pro`) if denormalized state is desired.
- Separate subscription table is still preferable for canonical subscription metadata and auditing, while optional `users.is_pro` can be updated transactionally for fast feature checks.

---

## 1) Key implementation decisions required before coding

1. **RevenueCat App User ID strategy (critical)**
   - Decision: use stable Clerk user id as RevenueCat appUserID (`clerkUserId`) via `Purchases.logIn(clerkUserId)` after auth is ready.
   - Why: prevents anonymous purchase ownership fragmentation and ensures restore/login maps to the same customer.

2. **Where subscription state lives in frontend**
   - Decision: add `SubscriptionProvider` and `useSubscription` hook adjacent to existing context pattern.
   - Why: aligns with current provider architecture and avoids introducing Redux/Zustand churn.

3. **Feature gate enforcement strategy**
   - Decision: implement both:
     - `ProGate` UI wrapper for components/screens.
     - `requirePro` navigation helper to intercept route entry for premium screens.
   - Why: allows gradual rollout with minimal refactor.

4. **Backend sync authority**
   - Preferred: RevenueCat webhooks to backend as source of truth.
   - Fallback (if webhook deployment not in this change): app-driven sync endpoint (`POST /api/subscriptions/sync`) called on app start, purchase/restore completion, and periodic refresh.

5. **Schema shape**
   - Decision: add `subscriptions` table keyed by `user_id` (or unique active row per user) with requested fields:
     - `user_id`, `rc_app_user_id`, `is_pro`, `entitlement_active`, `expiration_at`, `product_id`, `store`, `last_synced_at`.
   - Optional convenience mirror in `users.is_pro` for rapid checks.

6. **Paywall placement**
   - Decision: add dedicated `ProPaywallScreen` in profile/account stack plus modal entry points from locked flows.

7. **Management URL behavior**
   - Decision: if RevenueCat provides `managementURL` from `CustomerInfo`, open it; otherwise fallback to Apple subscriptions manage URL.

---

## 2) Phased plan with checklists

## Phase 0 — Repo audit + final decisions
- [ ] Confirm iOS-only gating (`Platform.OS === 'ios'`) for purchase UI to avoid accidental Android exposure.
- [ ] Confirm all current Pro candidates (initially `ProductivityAnalyticsScreen` and any future advanced/AI screens) and create a gate rollout matrix.
- [ ] Confirm App User ID mapping to Clerk user id and logout behavior (`Purchases.logOut()` only when intended; avoid orphaning if not needed).
- [ ] Decide webhook-first vs app-sync-first for this PR based on backend deployment readiness.

## Phase 1 — SDK installation & config (Expo + iOS)
- [x] Add dependency: `react-native-purchases`.
- [x] Ensure Expo prebuild compatibility (already uses custom dev client/native folders, so native module integration is expected).
- [x] Add public SDK key env var: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
- [x] Add backend env vars for webhook verification (if webhook path included): `REVENUECAT_WEBHOOK_SECRET`.
- [x] Initialize RevenueCat once after auth/bootstrap:
  - configure with iOS API key
  - set log level in dev
  - log in with Clerk user id
  - fetch initial `CustomerInfo`

## Phase 2 — Subscription state layer
- [x] Create `SubscriptionService` (frontend `src/services/subscription/`) with methods:
  - `init(appUserId)`
  - `fetchOfferings()`
  - `purchasePackage(pkg)`
  - `restorePurchases()`
  - `refreshCustomerInfo()`
- [x] Implement `SubscriptionProvider` with:
  - cached `customerInfo`, `isPro`, `activeEntitlements`, `activeProductIds`, `managementURL`
  - loading/error state
  - listener registration via RevenueCat customer info update listener
- [x] Implement derived entitlement check only on `entitlements.active['plannr_pro']`.
- [x] Wire provider into `App.js` provider tree (near `AppStateProvider`).

## Phase 3 — Paywall + purchase flows
- [x] Add `ProPaywallScreen` under `src/screens/`.
- [x] Fetch offering `default`; map packages `$rc_monthly` and `$rc_annual`.
- [x] UI:
  - monthly + annual options
  - annual highlighted as “Best value”
  - purchase CTA, restore CTA
  - legal/terms copy + manage subscription link
- [x] Purchase flow:
  - call `purchasePackage`
  - handle user-cancel distinctly (no scary error)
  - on success, refresh customer info and dismiss paywall if `isPro=true`
- [x] Restore flow:
  - call `restorePurchases`
  - show success/failure messages

## Phase 4 — Feature gating rollout
- [ ] Add `ProGate` component and `requirePro` helper.
- [ ] Gate at least:
  - `ProductivityAnalyticsScreen` entry (currently effectively placeholder/coming-soon target)
  - any advanced strategy/AI/integration features designated as Pro
- [ ] UX for locked features:
  - show upsell state with “Unlock Pro” button
  - route to paywall screen/modal with context payload (`source`, `featureKey`)
- [ ] Keep non-Pro flows functional and navigation-safe.

## Phase 5 — Backend/DB sync and webhooks

### Option A (preferred): webhook-authoritative
- [ ] Add backend module: `modules/subscriptions/` (`routes`, `controllers`, `repo`, optional validators).
- [ ] Add unauthenticated webhook endpoint with secret verification.
- [ ] Process RevenueCat events (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `TRANSFER`).
- [ ] Upsert subscription row by user/app user id; update convenience flags (`is_pro`, `entitlement_active`, expiry, product, store, sync time).
- [ ] (Optional) update `users.is_pro` denormalized field for quick checks.

### Option B (fallback): app-driven sync
- [ ] Add authenticated endpoint `POST /api/subscriptions/sync`.
- [ ] Payload from app: minimal customerInfo summary only (no receipts):
  - `rc_app_user_id`, `entitlement_active`, `expiration_at`, `product_id`, `store`, `raw_event_time` (optional), `management_url` (optional).
- [ ] Trigger sync from app:
  - after init/startup refresh
  - after purchase/restore
  - periodic foreground refresh

## Phase 6 — QA / release test plan
- [ ] Sandbox test user end-to-end:
  - new purchase monthly
  - new purchase annual
  - restore on fresh install
  - entitlement revoked/expired scenario
- [ ] Offline behavior:
  - app starts without network using cached customer info
  - purchase attempts fail gracefully
- [ ] Auth identity checks:
  - sign out/in with same Clerk user -> retains entitlement
  - ensure no anonymous customer leakage
- [ ] Backend sync checks:
  - verify DB rows update correctly
  - verify webhook signature rejection for invalid secret
- [ ] App Store review readiness:
  - paywall includes terms/manage/restore
  - no hard-blocking of non-subscriber core features unless intentionally required

---

## 3) File-level change list (planned)

### Frontend (add)
- `frontend/src/services/subscription/SubscriptionService.js`
- `frontend/src/context/SubscriptionContext.js`
- `frontend/src/hooks/useSubscription.js` (or export from context)
- `frontend/src/components/ProGate.jsx`
- `frontend/src/screens/ProPaywallScreen.jsx`
- `frontend/src/utils/requirePro.js`

### Frontend (modify)
- `frontend/package.json` (add `react-native-purchases`)
- `frontend/App.js` (insert `SubscriptionProvider` in provider tree)
- `frontend/src/navigation/UserProfileStack.jsx` (register paywall route)
- `frontend/src/screens/UserProfileScreen.jsx` (add “Plannr Pro” entry, wire lock states)
- `frontend/src/screens/ManageAccountScreen.jsx` (add “Manage Subscription” entry)
- Feature screens chosen for gating (e.g., `ProductivityAnalyticsScreen.jsx`)

### Backend (add)
- `backend/src/modules/subscriptions/subscriptions.routes.js`
- `backend/src/modules/subscriptions/subscriptions.controllers.js`
- `backend/src/modules/subscriptions/subscriptions.repo.js`
- `backend/src/modules/subscriptions/subscriptions.validators.js` (if using validation layer)
- `backend/src/db/migrations/<new>_subscriptions.sql`

### Backend (modify)
- `backend/src/db/schema.js` (new table and optional `users.is_pro`)
- `backend/src/routes/index.js` (mount subscriptions module)
- `backend/src/config/env.js` (webhook secret env)

---

## 4) Pseudocode snippets for key parts

### A. SDK init + identity
```js
// SubscriptionProvider bootstrap
useEffect(() => {
  if (!isSignedIn || !userId) return;

  await SubscriptionService.init({
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    appUserId: userId, // Clerk id
  });

  const info = await SubscriptionService.refreshCustomerInfo();
  setState(deriveState(info));

  const unsubscribe = SubscriptionService.addCustomerInfoListener((info) => {
    setState(deriveState(info));
    maybeSyncBackend(info);
  });

  return unsubscribe;
}, [isSignedIn, userId]);
```

### B. Entitlement derivation
```js
function deriveState(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  const proEntitlement = active['plannr_pro'];

  return {
    latestCustomerInfo: customerInfo,
    activeEntitlements: Object.keys(active),
    activeProductIds: customerInfo?.activeSubscriptions || [],
    managementURL: customerInfo?.managementURL ?? null,
    isPro: !!proEntitlement,
    expirationAt: proEntitlement?.expiresDate ?? null,
    productId: proEntitlement?.productIdentifier ?? null,
  };
}
```

### C. Purchase + restore
```js
async function onPurchase(pkg) {
  try {
    setPurchasing(true);
    const { customerInfo } = await SubscriptionService.purchasePackage(pkg);
    const next = deriveState(customerInfo);
    setState(next);
    await syncSubscription(next);
    if (next.isPro) navigation.goBack();
  } catch (e) {
    if (e.userCancelled) return; // soft exit
    showError(normalizePurchaseError(e));
  } finally {
    setPurchasing(false);
  }
}

async function onRestore() {
  const info = await SubscriptionService.restorePurchases();
  const next = deriveState(info);
  setState(next);
  await syncSubscription(next);
}
```

### D. Gate component
```jsx
function ProGate({ children, fallback, featureKey }) {
  const { isPro, ready } = useSubscription();

  if (!ready) return null; // or skeleton
  if (isPro) return children;

  return fallback ?? (
    <LockedCard
      title="Plannr Pro feature"
      cta="Unlock Pro"
      onPress={() => navigation.navigate('ProPaywall', { featureKey })}
    />
  );
}
```

### E. Backend sync payload
```js
POST /api/subscriptions/sync
{
  rc_app_user_id: userId,
  is_pro: isPro,
  entitlement_active: isPro,
  expiration_at: expirationAt,
  product_id: productId,
  store: 'app_store',
  last_synced_at: new Date().toISOString()
}
```

---

## 5) Known pitfalls / edge cases

1. **App User ID mismatch**
   - If SDK is configured anonymously before Clerk identity login, purchases can attach to anonymous users. Must log in to RevenueCat with Clerk ID as early as possible after auth initialization.

2. **Checking product IDs instead of entitlement**
   - App logic must use `entitlements.active.plannr_pro`; product IDs can change and should not gate features directly.

3. **Restore semantics confusion**
   - “Restore” is for recovering transactions; it does not grant entitlement if account/store mismatch exists.

4. **Listener lifecycle leaks**
   - Must remove customer info listener on unmount/sign-out to avoid duplicate updates.

5. **Offline cache expectations**
   - Customer info can be stale offline; UX should display last-known Pro state but trigger refresh on foreground.

6. **Billing issues / cancellations**
   - Entitlement may remain active until expiration; UI should respect entitlement active status, not cancellation flags alone.

7. **Sandbox timing quirks**
   - Renewal cadence is accelerated in sandbox; test scripts must account for fast renew/expire cycles.

8. **StoreKit behavior changes**
   - In modern iOS environments (StoreKit2-backed flows), transaction update timing can differ; rely on RevenueCat `CustomerInfo` updates instead of hand-rolled receipt checks.

---

## 6) Acceptance criteria (must pass before merge)

1. **SDK + identity**
- [ ] RevenueCat initializes once per app session on iOS.
- [ ] Logged-in Clerk user maps consistently to RevenueCat app user id.

2. **Offerings + paywall**
- [ ] Paywall loads `default` offering and renders monthly/annual options.
- [ ] Annual package visually emphasized.
- [ ] Restore button works and returns proper feedback.

3. **Entitlement-based gating**
- [ ] At least one designated Pro feature is blocked for non-Pro users.
- [ ] Unlocking subscription flips gated feature access reactively without app restart.

4. **State correctness**
- [ ] `useSubscription` exposes `isPro`, entitlements, customer info, and refresh/purchase/restore actions.
- [ ] Customer info listener updates state on purchase/renewal changes.

5. **Backend sync**
- [ ] Subscription metadata persists in backend table with required fields.
- [ ] Either webhook flow or app sync updates records after purchase/restore.

6. **Resilience**
- [ ] Offline startup doesn’t crash; purchase failures surface actionable errors.
- [ ] User-cancel purchase path is handled as non-error UX.

7. **Compliance UX**
- [ ] Paywall includes restore, terms text, and manage subscription link.
